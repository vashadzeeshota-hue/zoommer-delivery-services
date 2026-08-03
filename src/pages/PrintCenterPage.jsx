import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  FileCode2,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
} from "lucide-react";
import { ShippingLabelModal } from "../components/ShippingLabelModal";
import { normalizeTrackingCode } from "../lib/shipping-label";

const providerNames = {
  georgian_post: "საქართველოს ფოსტა",
  tnt: "TNT Express",
  fedex_tnt: "TNT Express",
  quickshipper: "QuickShipper",
  internal: "Zoommer შიდა კურიერი",
};

const serviceNames = {
  fast: "სწრაფი",
  standard: "სტანდარტული",
  scheduled: "დაგეგმილი",
};

function dateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function printableShipment(order, shipment, printRecord) {
  const trackingCode = shipment?.trackingCode || normalizeTrackingCode(order.id);
  const isPrinted = printRecord?.status === "printed" ||
    shipment?.labelStatus === "printed" ||
    order.labelStatus === "printed";
  return {
    id: shipment?.id || `print-${order.id}`,
    orderId: order.id,
    carrierCode: shipment?.carrierCode || order.providerCode || "internal",
    carrierName:
      shipment?.carrierName ||
      order.partnerTeam ||
      providerNames[order.providerCode] ||
      "Zoommer Delivery",
    service: shipment?.service || order.service,
    trackingCode,
    status: shipment?.status || "order_reference",
    usesCarrierTracking: Boolean(shipment?.trackingCode),
    labelStatus: isPrinted ? "printed" : "pending",
    labelPrintedAt:
      printRecord?.printedAt ||
      order.labelPrintedAt ||
      (shipment?.labelStatus === "printed" ? shipment.updatedAt : null),
  };
}

export function PrintCenterPage({ orders, shipments, printRecords, onMarkPrinted, onAction }) {
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [printFilter, setPrintFilter] = useState("all");
  const [codeFilter, setCodeFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const rows = useMemo(() => {
    const shipmentsByOrder = new Map(
      shipments.map((shipment) => [shipment.orderId, shipment]),
    );
    return orders.map((order) => ({
      order,
      shipment: printableShipment(
        order,
        shipmentsByOrder.get(order.id),
        printRecords[order.id],
      ),
    }));
  }, [orders, printRecords, shipments]);

  const printedCount = rows.filter(({ shipment }) => shipment.labelStatus === "printed").length;
  const filteredRows = rows.filter(({ order, shipment }) => {
    if (dayFilter && dateKey(order.receivedAt || order.createdAt) !== dayFilter) return false;
    if (serviceFilter !== "all" && order.service !== serviceFilter) return false;
    if (printFilter !== "all" && shipment.labelStatus !== printFilter) return false;
    if (codeFilter === "carrier" && !shipment.usesCarrierTracking) return false;
    if (codeFilter === "reference" && shipment.usesCarrierTracking) return false;
    const needle = query.trim().toLocaleLowerCase("ka-GE");
    if (!needle) return true;
    return [order.id, order.customer, order.phone, shipment.trackingCode]
      .some((value) => String(value || "").toLocaleLowerCase("ka-GE").includes(needle));
  });
  const selected = rows.find(({ order }) => order.id === selectedOrderId) || null;

  return (
    <div className="page">
      <div className="page-heading print-page-heading">
        <div>
          <h1>ბეჭდვის ცენტრი</h1>
          <p>A5 ეტიკეტები, PDF, Code 128 / QR და Zebra ZPL</p>
        </div>
        <span className="print-format-badge"><Printer />A5 · 148 × 210 მმ</span>
      </div>

      <section className="metric-grid">
        <PrintMetric label="ბეჭდვადი ორდერი" value={rows.length} icon={PackageCheck} tone="blue" />
        <PrintMetric label="დაბეჭდილია" value={printedCount} icon={CheckCircle2} tone="green" />
        <PrintMetric label="დასაბეჭდი" value={rows.length - printedCount} icon={FileCode2} tone="orange" />
        <PrintMetric label="Zebra ფორმატი" value="203/300" icon={Printer} tone="violet" />
      </section>

      <section className="surface data-surface print-queue" data-testid="print-center">
        <div className="surface-heading print-toolbar">
          <div>
            <h2>ეტიკეტების რიგი</h2>
            <p>აირჩიეთ ორდერი და გახსენით ბეჭდვის preview</p>
          </div>
          <div className="print-toolbar-controls">
            <label className="print-search">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ორდერი, მიმღები ან tracking..."
                data-testid="print-search"
              />
            </label>
            <label className="print-filter-control">
              <span><CalendarDays />დღე</span>
              <input type="date" value={dayFilter} onChange={(event) => setDayFilter(event.target.value)} data-testid="print-day-filter" />
            </label>
            <label className="print-filter-control">
              <span>მიწოდების მეთოდი</span>
              <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} data-testid="print-service-filter">
                <option value="all">ყველა მეთოდი</option>
                <option value="fast">სწრაფი</option>
                <option value="standard">სტანდარტული</option>
                <option value="scheduled">დაგეგმილი</option>
              </select>
            </label>
            <label className="print-filter-control">
              <span>ბეჭდვის სტატუსი</span>
              <select value={printFilter} onChange={(event) => setPrintFilter(event.target.value)} data-testid="print-status-filter">
                <option value="all">ყველა სტატუსი</option>
                <option value="pending">დასაბეჭდი</option>
                <option value="printed">დაბეჭდილია</option>
              </select>
            </label>
            <label className="print-filter-control">
              <span>კოდის წყარო</span>
              <select value={codeFilter} onChange={(event) => setCodeFilter(event.target.value)} data-testid="print-code-filter">
                <option value="all">ყველა კოდი</option>
                <option value="carrier">Carrier tracking</option>
                <option value="reference">ორდერის reference</option>
              </select>
            </label>
          </div>
          <div className="print-filter-summary">
            <span>ნაპოვნია <strong>{filteredRows.length}</strong></span>
            {dayFilter || serviceFilter !== "all" || printFilter !== "all" || codeFilter !== "all" || query ? (
              <button type="button" className="text-button" onClick={() => {
                setQuery("");
                setDayFilter("");
                setServiceFilter("all");
                setPrintFilter("all");
                setCodeFilter("all");
              }} data-testid="clear-print-filters"><RotateCcw />ფილტრების გასუფთავება</button>
            ) : null}
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table print-table">
            <thead>
              <tr>
                <th>შეკვეთა</th>
                <th>მიმღები</th>
                <th>მიწოდება</th>
                <th>გადამზიდავი</th>
                <th>ბარკოდის მნიშვნელობა</th>
                <th>ბეჭდვის სტატუსი</th>
                <th>მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ order, shipment }) => (
                <tr key={order.id} className={shipment.labelStatus === "printed" ? "printed-row" : ""}>
                  <td><strong className="order-id">{order.id}</strong><small>{dateKey(order.receivedAt || order.createdAt) || "თარიღი უცნობია"}</small></td>
                  <td><strong>{order.customer}</strong><small>{order.phone}</small></td>
                  <td><span className="service-label compact-service">{serviceNames[order.service] || order.service}</span></td>
                  <td>{shipment.carrierName}</td>
                  <td><code className="tracking-code">{shipment.trackingCode}</code><small>{shipment.usesCarrierTracking ? "Carrier tracking" : "ორდერის reference"}</small></td>
                  <td>
                    <span className={`status-label ${shipment.labelStatus === "printed" ? "green" : "orange"}`}>
                      <i />{shipment.labelStatus === "printed" ? "დაბეჭდილია" : "დასაბეჭდი"}
                    </span>
                    {shipment.labelPrintedAt ? <small>{formatDateTime(shipment.labelPrintedAt)}</small> : null}
                  </td>
                  <td>
                    <button
                      className={`${shipment.labelStatus === "printed" ? "secondary-button" : "primary-button"} compact-button`}
                      onClick={() => setSelectedOrderId(order.id)}
                      data-testid="open-print-label"
                    >
                      {shipment.labelStatus === "printed" ? <RotateCcw /> : <Printer />}
                      {shipment.labelStatus === "printed" ? "ხელახალი ბეჭდვა" : "Preview / ბეჭდვა"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRows.length ? <div className="empty-state">შესაბამისი ეტიკეტი ვერ მოიძებნა.</div> : null}
        </div>
      </section>

      {selected ? (
        <ShippingLabelModal
          shipment={selected.shipment}
          order={selected.order}
          onClose={() => setSelectedOrderId(null)}
          onPrinted={({ channel }) => onMarkPrinted({ orderId: selected.order.id, channel })}
          onAction={onAction}
        />
      ) : null}
    </div>
  );
}

function PrintMetric({ label, value, icon: Icon, tone }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}><Icon /></span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </article>
  );
}
