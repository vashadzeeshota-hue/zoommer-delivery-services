import { useEffect, useRef, useState } from "react";
import { Download, FileCode2, PackageCheck, Printer, QrCode, X } from "lucide-react";
import { buildZplLabel, downloadZplLabel, sendZplWithBrowserPrint } from "../lib/shipping-label";

function waitForPrintImages(printDocument) {
  const images = [...printDocument.images];
  return Promise.all(images.map((image) => (
    image.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })
  )));
}

export function ShippingLabelModal({ shipment, order, onClose, onAction }) {
  const barcodeRef = useRef(null);
  const labelRef = useRef(null);
  const [qrCode, setQrCode] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [dpi, setDpi] = useState(203);
  const [printing, setPrinting] = useState(false);
  const trackingCode = shipment.trackingCode;

  useEffect(() => {
    let active = true;

    Promise.all([import("jsbarcode"), import("qrcode")])
      .then(([barcodeModule, qrModule]) => {
        if (!active || !barcodeRef.current) return undefined;
        barcodeModule.default(barcodeRef.current, trackingCode, {
          format: "CODE128",
          width: 2,
          height: 76,
          margin: 0,
          displayValue: false,
          background: "#ffffff",
          lineColor: "#111111",
        });
        return qrModule.default.toDataURL(trackingCode, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 190,
          color: { dark: "#111111", light: "#ffffff" },
        });
      })
      .then((dataUrl) => {
        if (active && dataUrl) setQrCode(dataUrl);
      })
      .catch(() => {
        if (active) setBarcodeError("ბარკოდის გენერაცია ვერ შესრულდა. სცადეთ თავიდან.");
      });

    return () => {
      active = false;
    };
  }, [trackingCode]);

  function getZpl() {
    return buildZplLabel({ shipment, order, dpi });
  }

  function printA5() {
    const printWindow = window.open("", "_blank", "width=760,height=900");
    if (!printWindow || !labelRef.current) {
      onAction("ბეჭდვის ფანჯარა დაიბლოკა — დაუშვით pop-up და სცადეთ ხელახლა");
      return;
    }

    printWindow.opener = null;
    const printDocument = printWindow.document;
    printDocument.title = `${shipment.orderId} • A5 label`;
    const style = printDocument.createElement("style");
    style.textContent = `
      @page { size: A5 portrait; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; background: #fff; font-family: Arial, "Noto Sans Georgian", sans-serif; }
      .shipping-label-preview { width: 148mm; min-height: 210mm; padding: 9mm; border: 0; background: #fff; color: #111; }
      .shipping-label-preview header { display: flex; align-items: center; justify-content: space-between; gap: 5mm; padding-bottom: 5mm; border-bottom: .6mm solid #111; }
      .shipping-label-preview header strong { font-size: 17pt; }
      .shipping-label-preview header span { font-size: 10pt; text-align: right; }
      .shipping-label-preview section { padding: 6mm 0; border-bottom: .3mm solid #777; }
      .shipping-label-preview section strong { font-size: 15pt; }
      .shipping-label-preview p { margin: 2mm 0 0; font-size: 10pt; line-height: 1.45; }
      .label-codes { display: grid; grid-template-columns: 1fr 34mm; align-items: end; gap: 6mm; padding-top: 9mm; }
      .label-code128 svg { display: block; width: 100%; height: 28mm; }
      .label-qr img { display: block; width: 32mm; height: 32mm; }
      .label-tracking { margin-top: 3mm; font: 700 16pt ui-monospace, monospace; letter-spacing: 1.4pt; text-align: center; }
      .label-code-caption { margin-top: 2mm; color: #333; font-size: 7.5pt; text-align: center; }
      .label-footer { margin-top: 7mm; padding-top: 4mm; border-top: .3mm solid #777; font-size: 8pt; text-align: center; }
      .label-loading, .label-generation-error { display: none; }
    `;
    printDocument.head.append(style);
    printDocument.body.append(labelRef.current.cloneNode(true));

    waitForPrintImages(printDocument).then(() => {
      printWindow.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 120);
    });
    onAction(`${shipment.orderId}: A5 ეტიკეტი მზადაა — აირჩიეთ პრინტერი ან Save as PDF`);
  }

  function saveZpl() {
    downloadZplLabel(getZpl(), trackingCode);
    onAction(`${trackingCode}: ${dpi} DPI ZPL ფაილი ჩამოიტვირთა`);
  }

  async function printOnZebra() {
    setPrinting(true);
    try {
      const printerName = await sendZplWithBrowserPrint(getZpl());
      onAction(`${trackingCode}: გაიგზავნა პრინტერზე — ${printerName}`);
    } catch (error) {
      onAction(`${error.message} დააყენეთ Zebra Browser Print და აირჩიეთ default printer.`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="label-preview-modal" role="dialog" aria-modal="true" aria-labelledby="label-title" data-testid="label-preview-modal">
        <div className="modal-heading">
          <div>
            <span className="modal-icon"><PackageCheck /></span>
            <div><h2 id="label-title">A5 ეტიკეტის Preview</h2><p>{shipment.orderId} • {shipment.carrierName}</p></div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="ეტიკეტის დახურვა"><X /></button>
        </div>

        <div className="label-preview-scroll">
          <div className="shipping-label-preview" ref={labelRef} data-testid="shipping-label">
            <header><strong>ZOOMMER DELIVERY</strong><span>{shipment.carrierName}</span></header>
            <section>
              <strong>{order?.customer || "მიმღები"}</strong>
              <p>{order ? `${order.phone} • ${order.city}, ${order.address}` : shipment.orderId}</p>
            </section>
            <section>
              <p>{order ? `${order.size} • ${order.payment} • ორდერის ფასი ${order.orderPrice}` : `სერვისი: ${shipment.service}`}</p>
            </section>
            <div className="label-codes">
              <div className="label-code128">
                <svg ref={barcodeRef} role="img" aria-label={`Code 128: ${trackingCode}`} data-testid="code128-barcode" />
                <div className="label-tracking">{trackingCode}</div>
                <div className="label-code-caption">CODE 128 • TRACKING CODE</div>
              </div>
              <div className="label-qr">
                {qrCode ? <img src={qrCode} alt={`QR: ${trackingCode}`} data-testid="qr-code" /> : <QrCode className="label-loading" />}
                <div className="label-code-caption">QR</div>
              </div>
            </div>
            <div className="label-footer">{shipment.orderId} • A5 SHIPPING LABEL</div>
            {barcodeError ? <p className="label-generation-error" role="alert">{barcodeError}</p> : null}
          </div>
        </div>

        <div className="label-print-settings">
          <label htmlFor="zebra-dpi">Zebra გარჩევადობა</label>
          <select id="zebra-dpi" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} data-testid="zebra-dpi">
            <option value={203}>203 DPI</option>
            <option value={300}>300 DPI</option>
          </select>
          <span>A5 • 148 × 210 მმ</span>
        </div>

        <div className="modal-actions label-modal-actions">
          <button className="secondary-button" onClick={onClose}>დახურვა</button>
          <button className="secondary-button" onClick={saveZpl} data-testid="zpl-download"><FileCode2 />ZPL</button>
          <button className="secondary-button" onClick={printOnZebra} disabled={printing} data-testid="zebra-print"><Printer />{printing ? "იგზავნება..." : "Zebra Print"}</button>
          <button className="primary-button" onClick={printA5} data-testid="a5-print"><Download />ბეჭდვა / PDF</button>
        </div>
      </section>
    </div>
  );
}
