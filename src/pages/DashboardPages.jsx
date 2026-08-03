import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  Boxes,
  Car,
  CheckCircle2,
  Clock3,
  CloudCog,
  Download,
  MapPin,
  PackageCheck,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { statusMeta } from "../app-data";
import { ShippingLabelModal } from "../components/ShippingLabelModal";
import { LeafletCanvas } from "../components/LeafletCanvas";

const vehicleIcons = {
  car: Car,
  bike: Bike,
  scooter: Bike,
  foot: UserRound,
};

const courierStatus = {
  available: ["თავისუფალი", "green"],
  busy: ["დაკავებული", "orange"],
  break: ["შესვენება", "blue"],
  offline: ["ოფლაინი", "gray"],
};

const carrierStatus = {
  connected: ["დაკავშირებულია", "green"],
  setup_required: ["საჭიროა კონფიგურაცია", "orange"],
  degraded: ["შეფერხება", "red"],
  offline: ["ოფლაინი", "gray"],
};

function downloadOrdersCsv(orders, onAction) {
  const columns = ["order_id", "recipient", "phone", "city", "address", "package_size", "order_price", "payment", "service", "status", "source"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = orders.map((order) =>
    [order.id, order.customer, order.phone, order.city, order.address, order.size, order.orderPrice, order.payment, order.service, order.status, order.source || "zoommer.ge"]
      .map(escape)
      .join(","),
  );
  const blob = new Blob([`\uFEFF${columns.join(",")}\n${rows.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zoommer-delivery-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  onAction(`ანგარიში ექსპორტირებულია • ${orders.length} ორდერი`);
}

export function RegistrationsPage({ shipments, outbox, orders, onRefresh, onAction }) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);

  function refresh() {
    setRefreshing(true);
    onRefresh();
    window.setTimeout(() => {
      setRefreshing(false);
      onAction("რეგისტრაციების სია განახლებულია");
    }, 350);
  }

  return (
    <Page title="რეგისტრაციები" subtitle="Carrier queue, tracking და ეტიკეტის მდგომარეობა">
      <section className="metric-grid">
        <Metric label="რიგში" value={outbox.pending} icon={Clock3} tone="orange" />
        <Metric
          label="რეგისტრირებული"
          value={shipments.filter((item) => item.status === "registered").length}
          icon={PackageCheck}
          tone="blue"
        />
        <Metric label="წარმატებული job" value={outbox.succeeded} icon={CheckCircle2} tone="green" />
        <Metric label="ჩარევა სჭირდება" value={outbox.failed} icon={AlertCircle} tone="red" />
      </section>

      <section className="surface data-surface">
        <div className="surface-heading">
          <div>
            <h2>გზავნილების ჟურნალი</h2>
            <p>ბოლო carrier რეგისტრაციები</p>
          </div>
          <button className="secondary-button" onClick={refresh} disabled={refreshing} data-testid="registrations-refresh">
            <RefreshCw className={refreshing ? "spinning" : ""} />
            {refreshing ? "ახლდება..." : "განახლება"}
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>შეკვეთა</th>
                <th>გადამზიდავი</th>
                <th>Tracking</th>
                <th>სტატუსი</th>
                <th>ეტიკეტი</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => {
                const status = statusMeta[shipment.status] || [shipment.status, "blue"];
                return (
                  <tr key={shipment.id}>
                    <td>
                      <strong className="order-id">{shipment.orderId}</strong>
                    </td>
                    <td>{shipment.carrierName}</td>
                    <td>{shipment.trackingCode || "მოლოდინში"}</td>
                    <td>
                      <span className={`status-label ${status[1]}`}>
                        <i />
                        {status[0]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={!shipment.trackingCode}
                        onClick={() => setSelectedLabel(shipment)}
                        data-testid={shipment.trackingCode ? "label-preview" : undefined}
                      >
                        <Download />
                        {shipment.trackingCode ? "A5 ეტიკეტი" : "მოლოდინში"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {selectedLabel ? (
        <ShippingLabelModal
          shipment={selectedLabel}
          order={orders.find((order) => order.id === selectedLabel.orderId)}
          onClose={() => setSelectedLabel(null)}
          onAction={onAction}
        />
      ) : null}
    </Page>
  );
}

export function CouriersPage({ couriers, onOpenCourier }) {
  return (
    <Page title="კურიერები" subtitle="გუნდების დატვირთვა და მიმდინარე ხელმისაწვდომობა">
      <section className="courier-grid">
        {couriers.map((courier) => {
          const Icon = vehicleIcons[courier.vehicle] || Car;
          const status = courierStatus[courier.status] || courierStatus.offline;
          return (
            <article className="courier-card" key={courier.id}>
              <div className="courier-card-top">
                <span className="courier-avatar">
                  <Icon />
                </span>
                <span className={`status-label ${status[1]}`}>
                  <i />
                  {status[0]}
                </span>
              </div>
              <h2>{courier.name}</h2>
              <p>
                {courier.employeeCode} · {courier.city}
              </p>
              <dl>
                <div>
                  <dt>აქტიური</dt>
                  <dd>{courier.activeAssignments}</dd>
                </div>
                <div>
                  <dt>დღეს ჩაბარდა</dt>
                  <dd>{courier.deliveredToday}</dd>
                </div>
              </dl>
              <button
                className="secondary-button full"
                onClick={() => onOpenCourier(courier)}
              >
                <MapPin />
                მარშრუტის ნახვა
              </button>
            </article>
          );
        })}
      </section>
    </Page>
  );
}

export function PartnersPage({ carriers, onAction }) {
  const [selectedCarrier, setSelectedCarrier] = useState(null);

  return (
    <Page title="პარტნიორები" subtitle="Carrier Adapter-ების კავშირი და შესაძლებლობები">
      <section className="partner-list">
        {carriers.map((carrier) => {
          const status = carrierStatus[carrier.status] || carrierStatus.offline;
          return (
            <article className="partner-row" key={carrier.code}>
              <span className="partner-icon">
                {carrier.category === "postal" ? <Boxes /> : <Truck />}
              </span>
              <div>
                <h2>{carrier.name}</h2>
                <p>{carrier.code}</p>
              </div>
              <span className={`status-label ${status[1]}`}>
                <i />
                {status[0]}
              </span>
              <button
                className="secondary-button"
                onClick={() => setSelectedCarrier(carrier)}
              >
                <Settings2 />
                მართვა
              </button>
            </article>
          );
        })}
      </section>
      {selectedCarrier ? (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedCarrier(null)}>
          <section className="integration-modal" role="dialog" aria-modal="true" aria-labelledby="integration-title" data-testid="integration-modal">
            <div className="modal-heading">
              <div>
                <span className="modal-icon"><CloudCog /></span>
                <div>
                  <h2 id="integration-title">{selectedCarrier.name}</h2>
                  <p>Adapter-ის კავშირი და production მზადყოფნა</p>
                </div>
              </div>
              <button className="icon-button" onClick={() => setSelectedCarrier(null)} aria-label="დახურვა"><X /></button>
            </div>
            <div className="integration-modal-body">
              <span className={`status-label ${carrierStatus[selectedCarrier.status]?.[1] || "gray"}`}><i />{carrierStatus[selectedCarrier.status]?.[0] || selectedCarrier.status}</span>
              {selectedCarrier.status === "connected" ? (
                <p>შიდა adapter აქტიურია და მზადაა გზავნილების მისაღებად.</p>
              ) : (
                <>
                  <p>რეალური კავშირის ჩასართავად საჭიროა პროვაიდერისგან მიღებული მონაცემები:</p>
                  <ul><li>API base URL</li><li>Account/Client ID</li><li>API key ან OAuth credentials</li><li>Webhook signing secret</li></ul>
                  <p className="security-note"><ShieldCheck />საიდუმლო მონაცემები მხოლოდ Vercel Environment Variables-ში შეინახება.</p>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setSelectedCarrier(null)}>დახურვა</button>
              <button
                className="primary-button"
                onClick={() => onAction(selectedCarrier.status === "connected" ? `${selectedCarrier.name}: კავშირის ტესტი წარმატებულია` : `${selectedCarrier.name}: მოგვაწოდეთ API credentials`)}
              >
                {selectedCarrier.status === "connected" ? "კავშირის ტესტი" : "საჭირო მონაცემების ნახვა"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </Page>
  );
}

export function MapPage({ couriers, orders, focusedCourier, onAction }) {
  const [selectedCourier, setSelectedCourier] = useState(focusedCourier || null);

  useEffect(() => {
    if (focusedCourier) setSelectedCourier(focusedCourier);
  }, [focusedCourier]);

  const cities = Object.entries(
    orders.reduce((result, order) => {
      result[order.city] = (result[order.city] || 0) + 1;
      return result;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  const mapMarkers = useMemo(() => [
    ...couriers.map((courier) => ({
      id: courier.id,
      kind: "courier",
      lat: courier.lat == null ? Number.NaN : Number(courier.lat),
      lng: courier.lng == null ? Number.NaN : Number(courier.lng),
      title: courier.name,
      detail: `${courier.city} • ${courier.activeAssignments} აქტიური დავალება`,
      courier,
    })),
    ...orders.map((order) => ({
      id: order.id,
      kind: "order",
      lat: order.latitude == null ? Number.NaN : Number(order.latitude),
      lng: order.longitude == null ? Number.NaN : Number(order.longitude),
      title: order.id,
      detail: `${order.customer} • ${order.city}, ${order.address}`,
    })),
  ], [couriers, orders]);

  return (
    <Page title="ქალაქების რუკა" subtitle="კურიერებისა და მიწოდებების ოპერაციული ხედი">
      <section className="map-layout">
        <div className="map-canvas" aria-label="კურიერებისა და ორდერების ინტერაქტიული რუკა">
          <LeafletCanvas
            markers={mapMarkers}
            fitMarkers
            onMarkerSelect={(marker) => {
              if (marker.kind === "courier") setSelectedCourier(marker.courier);
              onAction(`${marker.title}: ლოკაცია არჩეულია`);
            }}
            className="operations-map"
            testId="operations-map"
          />
          <div className="map-legend" aria-label="რუკის აღნიშვნები">
            <span><i className="courier" />კურიერი</span>
            <span><i className="order" />ორდერი</span>
            <span><i className="cluster" />ჯგუფი</span>
          </div>
          {selectedCourier ? (
            <article className="map-courier-card" data-testid="map-courier-card">
              <button className="icon-button" onClick={() => setSelectedCourier(null)} aria-label="კურიერის ბარათის დახურვა"><X /></button>
              <span className="courier-avatar"><Truck /></span>
              <div><strong>{selectedCourier.name}</strong><small>{selectedCourier.city} • {selectedCourier.phone}</small></div>
              <p><span>აქტიური დავალება <b>{selectedCourier.activeAssignments}</b></span><span>დღეს ჩაბარდა <b>{selectedCourier.deliveredToday}</b></span></p>
            </article>
          ) : null}
        </div>
        <aside className="city-list surface">
          <h2>ქალაქების დატვირთვა</h2>
          {cities.map(([city, count]) => (
            <div className="city-row" key={city}>
              <span>
                <MapPin />
                {city}
              </span>
              <strong>{count}</strong>
            </div>
          ))}
        </aside>
      </section>
    </Page>
  );
}

export function ReportsPage({ summary, orders, onAction }) {
  const maximum = Math.max(1, ...Object.values(summary));
  const rows = [
    ["ახალი", summary.new, "orange"],
    ["რეგისტრირებული", summary.assigned, "blue"],
    ["გზაში", summary.transit, "violet"],
    ["ჩაბარებული", summary.completed, "green"],
    ["შეფერხება", summary.exception, "red"],
  ];
  const deliveredRate = orders.length
    ? Math.round((summary.completed / orders.length) * 100)
    : 0;

  return (
    <Page title="ანგარიშები" subtitle="დღის ოპერაციული მაჩვენებლები">
      <section className="report-layout">
        <article className="surface chart-surface">
          <div className="surface-heading">
            <div>
              <h2>სტატუსების განაწილება</h2>
              <p>დღევანდელი შეკვეთები</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => downloadOrdersCsv(orders, onAction)}
              data-testid="export-report"
            >
              <Download />
              ექსპორტი
            </button>
          </div>
          <div className="bar-chart">
            {rows.map(([label, value, tone]) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div>
                  <i
                    className={tone}
                    style={{ width: `${Math.max(4, (value / maximum) * 100)}%` }}
                  />
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
        <aside className="surface score-surface">
          <span>ჩაბარების მაჩვენებელი</span>
          <strong>{deliveredRate}%</strong>
          <p>დემო მონაცემებზე დაყრდნობით</p>
          <div className="score-ring" style={{ "--score": `${deliveredRate * 3.6}deg` }} />
        </aside>
      </section>
    </Page>
  );
}

export function ExceptionsPage({ orders, outbox, onProcess }) {
  const exceptions = orders.filter((order) => order.status === "exception");
  return (
    <Page title="გამონაკლისები" subtitle="შეფერხებული მიწოდებები და integration errors">
      <section className="alert-banner">
        <AlertCircle />
        <div>
          <strong>{exceptions.length + outbox.failed} შემთხვევა საჭიროებს ყურადღებას</strong>
          <span>შეამოწმეთ მისამართი, carrier პასუხი ან retry queue.</span>
        </div>
      </section>
      <section className="surface exception-list">
        {exceptions.length ? (
          exceptions.map((order) => (
            <article key={order.id}>
              <span className="exception-icon">
                <AlertCircle />
              </span>
              <div>
                <h2>{order.id}</h2>
                <p>
                  {order.city} · {order.address}
                </p>
              </div>
              <span className="status-label red">
                <i />
                მიწოდების შეფერხება
              </span>
              <button
                className="secondary-button"
                onClick={() => onProcess(order)}
              >
                დამუშავება
              </button>
            </article>
          ))
        ) : (
          <div className="empty-state">აქტიური გამონაკლისი არ არის.</div>
        )}
      </section>
    </Page>
  );
}

export function SettingsPage({ theme, onToggleTheme, carriers }) {
  return (
    <Page title="პარამეტრები" subtitle="როლები, ინტეგრაციები და სამუშაო გარემო">
      <section className="settings-grid">
        <article className="surface settings-card">
          <ShieldCheck />
          <div>
            <h2>წვდომის როლები</h2>
            <p>Admin, Operator და Courier permission model მზადაა.</p>
          </div>
          <ul>
            <li>
              <strong>Admin</strong>
              <span>სრული მართვა</span>
            </li>
            <li>
              <strong>Operator</strong>
              <span>შეკვეთები და რეგისტრაცია</span>
            </li>
            <li>
              <strong>Courier</strong>
              <span>მხოლოდ საკუთარი დავალებები</span>
            </li>
          </ul>
        </article>

        <article className="surface settings-card">
          <Settings2 />
          <div>
            <h2>გარეგნობა</h2>
            <p>ინტერფეისი მხარს უჭერს light და dark რეჟიმებს.</p>
          </div>
          <button className="secondary-button full" onClick={onToggleTheme}>
            რეჟიმის შეცვლა · {theme === "dark" ? "მუქი" : "ღია"}
          </button>
        </article>

        <article className="surface settings-card wide-card">
          <CloudCog />
          <div>
            <h2>ინტეგრაციების მზადყოფნა</h2>
            <p>
              {carriers.filter((carrier) => carrier.status === "connected").length}/
              {carriers.length} adapter აქტიურია
            </p>
          </div>
          <div className="integration-progress">
            {carriers.map((carrier) => (
              <span key={carrier.code}>
                <i className={carrier.status === "connected" ? "ready" : ""} />
                {carrier.name}
              </span>
            ))}
          </div>
        </article>
      </section>
    </Page>
  );
}

function Page({ title, subtitle, children }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
