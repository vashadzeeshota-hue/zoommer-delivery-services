const TBILISI_TIME_ZONE = "Asia/Tbilisi";
const FAST_CUTOFF_MINUTES = 15 * 60;

export const DELIVERY_SERVICES = new Set(["fast", "standard", "scheduled"]);
export const STANDARD_PROVIDERS = new Set(["georgian_post", "fedex_tnt"]);

const PROVIDER_NAMES = {
  quickshipper: "QuickShipper",
  georgian_post: "საქართველოს ფოსტა",
  fedex_tnt: "TNT Express",
  internal: "Zoommer შიდა კურიერი",
};

function tbilisiDateParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TBILISI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateFromParts(parts) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(dateText, numberOfDays) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + numberOfDays);
  return date.toISOString().slice(0, 10);
}

function addBusinessDays(dateText, numberOfDays) {
  let result = dateText;
  let added = 0;

  while (added < numberOfDays) {
    result = addDays(result, 1);
    const weekday = new Date(`${result}T12:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }

  return result;
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function buildDeliveryPromise({
  service,
  providerCode,
  receivedAt,
  scheduledDate,
  windowStart,
  windowEnd,
}) {
  if (!DELIVERY_SERVICES.has(service)) {
    throw new Error("INVALID_DELIVERY_SERVICE");
  }

  const received = tbilisiDateParts(receivedAt || new Date());
  const receivedDate = localDateFromParts(received);

  if (service === "fast") {
    const receivedMinutes = Number(received.hour) * 60 + Number(received.minute);
    const sameDay = receivedMinutes < FAST_CUTOFF_MINUTES;
    const deliveryDate = sameDay ? receivedDate : addDays(receivedDate, 1);

    return {
      service,
      variant: sameDay ? "same_day" : "next_day",
      providerCode: "quickshipper",
      providerName: PROVIDER_NAMES.quickshipper,
      deliveryDateFrom: deliveryDate,
      deliveryDateTo: deliveryDate,
      scheduledDate: null,
      windowStart: null,
      windowEnd: null,
      label: sameDay ? "იმავე დღეს" : "მეორე დღეს",
    };
  }

  if (service === "standard") {
    if (!STANDARD_PROVIDERS.has(providerCode)) {
      throw new Error("INVALID_STANDARD_PROVIDER");
    }

    return {
      service,
      variant: "standard",
      providerCode,
      providerName: PROVIDER_NAMES[providerCode],
      deliveryDateFrom: addBusinessDays(receivedDate, 2),
      deliveryDateTo: addBusinessDays(receivedDate, 5),
      scheduledDate: null,
      windowStart: null,
      windowEnd: null,
      label: "2–5 სამუშაო დღე",
    };
  }

  if (
    !isDate(scheduledDate) ||
    scheduledDate < receivedDate ||
    !isTime(windowStart) ||
    !isTime(windowEnd) ||
    windowStart >= windowEnd
  ) {
    throw new Error("INVALID_SCHEDULE_WINDOW");
  }

  return {
    service,
    variant: "scheduled",
    providerCode: "internal",
    providerName: PROVIDER_NAMES.internal,
    deliveryDateFrom: scheduledDate,
    deliveryDateTo: scheduledDate,
    scheduledDate,
    windowStart,
    windowEnd,
    label: `${scheduledDate} • ${windowStart}–${windowEnd}`,
  };
}

export function normalizeDeliveryService(value) {
  if (value === "express") return "fast";
  if (value === "postal") return "standard";
  if (value === "internal") return "scheduled";
  return DELIVERY_SERVICES.has(value) ? value : "standard";
}

