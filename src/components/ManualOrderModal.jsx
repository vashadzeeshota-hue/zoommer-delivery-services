import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  Mail,
  MapPin,
  PackagePlus,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { serviceMeta } from "../app-data";
import { AddressPinPicker } from "./AddressPinPicker";

const serviceIcons = {
  fast: Zap,
  standard: Mail,
  scheduled: CalendarClock,
};

function localDate(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDate(date);
}

function currentTbilisiTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function initialForm() {
  return {
    recipientName: "",
    recipientPhone: "",
    city: "თბილისი",
    address: "",
    postalCode: "",
    latitude: null,
    longitude: null,
    weightKg: "",
    packageSize: "medium",
    orderPrice: "",
    service: "fast",
    providerCode: "quickshipper",
    scheduledDate: tomorrow(),
    windowStart: "12:00",
    windowEnd: "15:00",
    idempotencyKey:
      globalThis.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random()}`,
  };
}

export function ManualOrderModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function chooseService(service) {
    setForm((current) => ({
      ...current,
      service,
      providerCode:
        service === "fast"
          ? "quickshipper"
          : service === "scheduled"
            ? "internal"
            : ["georgian_post", "fedex_tnt"].includes(current.providerCode)
              ? current.providerCode
              : "georgian_post",
    }));
    setError("");
  }

  function updateLocation(location) {
    setForm((current) => ({
      ...current,
      city: location.city || current.city,
      address: location.address || current.address,
      postalCode: location.postalCode || "",
      latitude: Number.isFinite(location.lat) ? location.lat : current.latitude,
      longitude: Number.isFinite(location.lng) ? location.lng : current.longitude,
    }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (
      form.service === "scheduled" &&
      (form.scheduledDate < localDate() || form.windowStart >= form.windowEnd)
    ) {
      setError("მიუთითეთ სწორი მომავალი თარიღი და დროის მონაკვეთი.");
      return;
    }

    if (!Number.isFinite(Number(form.orderPrice)) || Number(form.orderPrice) < 0) {
      setError("მიუთითეთ ორდერის სწორი ფასი.");
      return;
    }

    setSubmitting(true);
    const created = await onSubmit({
      ...form,
      weightKg: Number(form.weightKg),
      orderPrice: Number(form.orderPrice),
      paymentMethod: "prepaid",
      codAmount: 0,
    });
    setSubmitting(false);

    if (created) {
      setForm(initialForm());
      setError("");
      onClose();
    }
  }

  const fastIsSameDay = currentTbilisiTime() < "15:00";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="manual-order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-order-title"
        data-testid="manual-order-modal"
      >
        <header className="modal-heading">
          <div>
            <span className="modal-icon"><PackagePlus /></span>
            <div>
              <h2 id="manual-order-title">ორდერის ხელით დამატება</h2>
              <p>შეავსეთ მიმღების, ამანათისა და მიწოდების მონაცემები</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="ფორმის დახურვა">
            <X />
          </button>
        </header>

        <form onSubmit={submit} className="manual-order-form">
          <fieldset>
            <legend>მიმღები და მისამართი</legend>
            <div className="form-grid two-columns">
              <label>
                სახელი და გვარი
                <input required minLength="2" value={form.recipientName} onInput={(event) => update("recipientName", event.currentTarget.value)} placeholder="მაგ. გიორგი მაისურაძე" data-testid="manual-name" />
              </label>
              <label>
                ტელეფონი
                <input required minLength="5" value={form.recipientPhone} onInput={(event) => update("recipientPhone", event.currentTarget.value)} placeholder="555 12 34 56" data-testid="manual-phone" />
              </label>
              <label>
                ქალაქი
                <select value={form.city} onChange={(event) => update("city", event.target.value)} data-testid="manual-city">
                  <option>თბილისი</option>
                  <option>ბათუმი</option>
                  <option>ქუთაისი</option>
                  <option>რუსთავი</option>
                  <option>გორი</option>
                  <option>ზუგდიდი</option>
                </select>
              </label>
              <div className="address-field-control">
                <label>
                  სრული მისამართი
                  <input required minLength="3" value={form.address} onInput={(event) => update("address", event.currentTarget.value)} placeholder="ქუჩა, ნომერი, ბინა" data-testid="manual-address" />
                </label>
                <button type="button" className="secondary-button" onClick={() => setMapOpen((current) => !current)} data-testid="toggle-address-map">
                  <MapPin />{mapOpen ? "რუკის დახურვა" : "რუკაზე მონიშვნა"}
                </button>
              </div>
            </div>
            {mapOpen ? (
              <AddressPinPicker
                city={form.city}
                address={form.address}
                value={{ lat: form.latitude, lng: form.longitude, postalCode: form.postalCode }}
                onChange={updateLocation}
              />
            ) : null}
          </fieldset>

          <fieldset>
            <legend>პაკეტის ინფორმაცია</legend>
            <div className="form-grid package-fields">
              <label>
                წონა, კგ
                <input required type="number" min="0.01" max="1000" step="0.01" value={form.weightKg} onInput={(event) => update("weightKg", event.currentTarget.value)} placeholder="1.20" data-testid="manual-weight" />
              </label>
              <label>
                ზომა
                <select value={form.packageSize} onChange={(event) => update("packageSize", event.target.value)} data-testid="manual-size">
                  <option value="small">პატარა</option>
                  <option value="medium">საშუალო</option>
                  <option value="large">დიდი</option>
                </select>
              </label>
              <label>
                გადახდა
                <input value="მიწოდება გადახდილია" readOnly aria-readonly="true" data-testid="manual-payment" />
              </label>
              <label>
                ორდერის ფასი, ₾
                <input required type="number" min="0" step="0.01" value={form.orderPrice} onInput={(event) => update("orderPrice", event.currentTarget.value)} placeholder="0.00" data-testid="manual-order-price" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>მიწოდების სერვისი</legend>
            <div className="manual-service-options">
              {Object.entries(serviceMeta).map(([key, service]) => {
                const Icon = serviceIcons[key];
                return (
                  <button type="button" className={form.service === key ? "active" : ""} onClick={() => chooseService(key)} key={key} data-testid={`manual-service-${key}`}>
                    <Icon />
                    <span><strong>{service.label}</strong><small>{service.eta}</small></span>
                    <i>{form.service === key ? <Check /> : null}</i>
                  </button>
                );
              })}
            </div>

            {form.service === "fast" ? (
              <div className="manual-service-detail">
                <Zap />
                <span>ახლა დამატებული ორდერი</span>
                <strong>{fastIsSameDay ? "იმავე დღეს მიეწოდება" : "მეორე დღეს მიეწოდება"}</strong>
                <small>QuickShipper • 15:00 cutoff</small>
              </div>
            ) : null}

            {form.service === "standard" ? (
              <div className="form-grid two-columns service-fields">
                <label>
                  პროვაიდერი
                  <select value={form.providerCode} onChange={(event) => update("providerCode", event.target.value)} data-testid="manual-provider">
                    <option value="georgian_post">საქართველოს ფოსტა</option>
                    <option value="fedex_tnt">TNT Express</option>
                  </select>
                </label>
                <div className="service-note"><Truck /><span>ჩაბარების ვადა<strong>2–5 სამუშაო დღე</strong></span></div>
              </div>
            ) : null}

            {form.service === "scheduled" ? (
              <div className="form-grid schedule-order-fields">
                <label>თარიღი<input required type="date" min={localDate()} value={form.scheduledDate} onInput={(event) => update("scheduledDate", event.currentTarget.value)} data-testid="manual-date" /></label>
                <label>დაწყება<input required type="time" value={form.windowStart} onInput={(event) => update("windowStart", event.currentTarget.value)} data-testid="manual-window-start" /></label>
                <label>დასრულება<input required type="time" value={form.windowEnd} onInput={(event) => update("windowEnd", event.currentTarget.value)} data-testid="manual-window-end" /></label>
              </div>
            ) : null}
          </fieldset>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <footer className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>გაუქმება</button>
            <button type="submit" className="primary-button" disabled={submitting} data-testid="manual-submit">
              <PackagePlus />
              {submitting ? "ინახება..." : "ორდერის დამატება"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
