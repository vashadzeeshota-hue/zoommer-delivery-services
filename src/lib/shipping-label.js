const A5_DOTS = {
  203: { width: 1184, height: 1680, scale: 1 },
  300: { width: 1776, height: 2520, scale: 1.5 },
};

function zplField(value) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  let encoded = "";

  for (const character of text) {
    const uriEncoded = encodeURIComponent(character);
    const bytes = uriEncoded.includes("%")
      ? uriEncoded.split("%").filter(Boolean).map((hex) => Number.parseInt(hex, 16))
      : [character.charCodeAt(0)];

    for (const byte of bytes) {
      if (byte >= 32 && byte <= 126 && byte !== 92 && byte !== 94 && byte !== 126) {
        encoded += String.fromCharCode(byte);
      } else {
        encoded += `\\${byte.toString(16).padStart(2, "0").toUpperCase()}`;
      }
    }
  }

  return encoded || "-";
}

export function normalizeTrackingCode(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .slice(0, 48) || "NO-TRACKING";
}

export function buildZplLabel({ shipment, order, dpi = 203 }) {
  const profile = A5_DOTS[Number(dpi)] || A5_DOTS[203];
  const at = (value) => Math.round(value * profile.scale);
  const tracking = normalizeTrackingCode(shipment?.trackingCode);
  const recipient = order?.customer || "Recipient";
  const phone = order?.phone || "-";
  const address = order ? `${order.city || ""}, ${order.address || ""}` : shipment?.orderId || "-";
  const carrier = shipment?.carrierName || "Zoommer Delivery";
  const packageInfo = order
    ? `${order.size || "-"} | ${order.payment || "-"} | ${order.orderPrice || "-"}`
    : shipment?.service || "-";

  return [
    "^XA",
    "^CI28",
    `^PW${profile.width}`,
    `^LL${profile.height}`,
    "^LH0,0",
    `^FO${at(42)},${at(42)}^GB${at(1100)},${at(1596)},${at(4)}^FS`,
    `^FO${at(82)},${at(82)}^A0N,${at(44)},${at(44)}^FDZOOMMER DELIVERY^FS`,
    `^FO${at(82)},${at(142)}^A0N,${at(24)},${at(24)}^FH\\^FD${zplField(carrier)}^FS`,
    `^FO${at(82)},${at(198)}^GB${at(1020)},${at(2)},${at(2)}^FS`,
    `^FO${at(82)},${at(240)}^A0N,${at(26)},${at(26)}^FDRECIPIENT^FS`,
    `^FO${at(82)},${at(286)}^A0N,${at(38)},${at(38)}^FH\\^FD${zplField(recipient)}^FS`,
    `^FO${at(82)},${at(344)}^A0N,${at(30)},${at(30)}^FH\\^FDPHONE: ${zplField(phone)}^FS`,
    `^FO${at(82)},${at(398)}^A0N,${at(30)},${at(30)}^FB${at(960)},3,${at(8)},L,0^FH\\^FD${zplField(address)}^FS`,
    `^FO${at(82)},${at(540)}^GB${at(1020)},${at(2)},${at(2)}^FS`,
    `^FO${at(82)},${at(580)}^A0N,${at(25)},${at(25)}^FDPACKAGE^FS`,
    `^FO${at(82)},${at(626)}^A0N,${at(28)},${at(28)}^FB${at(960)},2,${at(6)},L,0^FH\\^FD${zplField(packageInfo)}^FS`,
    `^FO${at(82)},${at(714)}^A0N,${at(25)},${at(25)}^FH\\^FDORDER: ${zplField(shipment?.orderId)}^FS`,
    `^FO${at(82)},${at(780)}^GB${at(1020)},${at(2)},${at(2)}^FS`,
    `^FO${at(104)},${at(840)}^BY${at(3)},2,${at(190)}^BCN,${at(190)},Y,N,N,A^FD${tracking}^FS`,
    `^FO${at(82)},${at(1130)}^A0N,${at(25)},${at(25)}^FDQR / TRACKING^FS`,
    `^FO${at(82)},${at(1180)}^BQN,2,${Number(dpi) === 300 ? 12 : 8}^FDLA,${tracking}^FS`,
    `^FO${at(410)},${at(1210)}^A0N,${at(32)},${at(32)}^FDTRACKING CODE^FS`,
    `^FO${at(410)},${at(1265)}^A0N,${at(40)},${at(40)}^FD${tracking}^FS`,
    `^FO${at(410)},${at(1340)}^A0N,${at(25)},${at(25)}^FH\\^FDCARRIER: ${zplField(carrier)}^FS`,
    `^FO${at(82)},${at(1540)}^A0N,${at(22)},${at(22)}^FD${zplField(shipment?.orderId)} | A5 | ${Number(dpi) === 300 ? 300 : 203} DPI^FS`,
    "^XZ",
  ].join("\n");
}

export function downloadZplLabel(zpl, trackingCode) {
  const blob = new Blob([zpl], { type: "application/x-zpl;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${normalizeTrackingCode(trackingCode)}-A5.zpl`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function sendZplWithBrowserPrint(zpl) {
  const browserPrint = globalThis.BrowserPrint;

  if (browserPrint?.getDefaultDevice) {
    return new Promise((resolve, reject) => {
      browserPrint.getDefaultDevice(
        "printer",
        (printer) => {
          if (!printer?.send) {
            reject(new Error("Zebra-ს ნაგულისხმევი პრინტერი არჩეული არ არის."));
            return;
          }
          printer.send(zpl, () => resolve(printer.name || "Zebra"), (error) => reject(new Error(error || "ბეჭდვა ვერ შესრულდა.")));
        },
        (error) => reject(new Error(error || "Zebra Browser Print-სთან კავშირი ვერ დამყარდა.")),
      );
    });
  }

  return sendToLocalBrowserPrint(zpl);
}

async function browserPrintRequest(url, options) {
  const controller = new globalThis.AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 1800);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function sendToLocalBrowserPrint(zpl) {
  const bases = globalThis.location?.protocol === "https:"
    ? ["https://localhost:9101/"]
    : ["http://127.0.0.1:9100/", "https://localhost:9101/"];

  for (const base of bases) {
    try {
      const defaultResponse = await browserPrintRequest(`${base}default?type=printer`);
      if (!defaultResponse.ok) continue;
      const rawDevice = await defaultResponse.text();
      if (!rawDevice) throw new Error("Zebra-ს ნაგულისხმევი პრინტერი არჩეული არ არის.");
      const device = JSON.parse(rawDevice);
      const writeResponse = await browserPrintRequest(`${base}write`, {
        method: "POST",
        body: JSON.stringify({
          device: { ...device, version: device.version || 2 },
          data: zpl,
        }),
      });
      if (!writeResponse.ok) throw new Error(await writeResponse.text());
      return device.name || "Zebra";
    } catch (error) {
      if (error.message.includes("ნაგულისხმევი")) throw error;
    }
  }

  throw new Error("Zebra Browser Print-ის კლიენტი ამ კომპიუტერზე ვერ მოიძებნა.");
}
