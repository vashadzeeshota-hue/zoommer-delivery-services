import { useMemo, useState } from "react";
import {
  Barcode,
  FileCode2,
  PackageCheck,
  Printer,
  Search,
} from "lucide-react";
import { ShippingLabelModal } from "../components/ShippingLabelModal";
import { normalizeTrackingCode } from "../lib/shipping-label";

const providerNames = {
  georgian_post: "საქართველოს ფოსტა",
  tnt: "TNT Express",
  quickshipper: "QuickShipper",
  internal: "Zoommer შიდა კურიერი",
};

function printableShipment(order, shipment) {
  const trackingCode = shipment?.trackingCode || normalizeTrackingCode(order.id);
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
  };
}

export function PrintCenterPage({ orders, shipments, onAction }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    const shipmentsByOrder = new Map(
      shipments.map((shipment) => [shipment.orderId, shipment]),
    );
    return orders.map((order) => ({
      order,
      shipment: printableShipment(order, shipmentsByOrder.get(order.id)),
    }));
  }, [orders, shipments]);

  const carrierTrackingCount = rows.filter(({ shipment }) => shipment.usesCarrierTracking).length;
  const filteredRows = rows.filter(({ order, shipment }) => {
    if (filter === "carrier" && !shipment.usesCarrierTracking) return false;
    if (filter === "reference" && shipment.usesCarrierTracking) return false;
    const needle = query.trim().toLocaleLowerCase("ka-GE");
    if (!needle) return true;
    return [order.id, order.customer, order.phone, shipment.trackingCode]
      .some((value) => String(value || "").toLocaleLowerCase("ka-GE").includes(needle));
  });

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
        <PrintMetric label="Carrier tracking" value={carrierTrackingCount} icon={Barcode} tone="green" />
        <PrintMetric label="ორდერის reference" value={rows.length - carrierTrackingCount} icon={FileCode2} tone="orange" />
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
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="ეტიკეტის კოდის ტიპი" data-testid="print-filter">
              <option value="all">ყველა კოდი</option>
              <option value="carrier">Carrier tracking</option>
              <option value="reference">ორდერის reference</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table print-table">
            <thead>
              <tr>
                <th>შეკვეთა</th>
                <th>მიმღები</th>
                <th>გადამზიდავი</th>
                <th>ბარკოდის მნიშვნელობა</th>
                <th>კოდის წყარო</th>
                <th>მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ order, shipment }) => (
                <tr key={order.id}>
                  <td><strong className="order-id">{order.id}</strong><small>{order.service}</small></td>
                  <td><strong>{order.customer}</strong><small>{order.phone}</small></td>
                  <td>{shipment.carrierName}</td>
                  <td><code className="tracking-code">{shipment.trackingCode}</code></td>
                  <td>
                    <span className={`status-label ${shipment.usesCarrierTracking ? "green" : "orange"}`}>
                      <i />{shipment.usesCarrierTracking ? "Carrier tracking" : "ორდერის reference"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="primary-button compact-button"
                      onClick={() => setSelected({ order, shipment })}
                      data-testid="open-print-label"
                    >
                      <Printer />Preview / ბეჭდვა
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
          onClose={() => setSelected(null)}
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
