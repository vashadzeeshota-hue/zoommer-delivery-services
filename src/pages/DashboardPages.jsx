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
} from "lucide-react";
import { statusMeta } from "../app-data";

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

export function RegistrationsPage({ shipments, outbox }) {
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
          <button className="secondary-button">
            <RefreshCw />
            განახლება
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
                      <button className="text-button" disabled={!shipment.trackingCode}>
                        <Download />
                        {shipment.labelStatus === "ready" ? "A5 PDF" : "მოლოდინში"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}

export function CouriersPage({ couriers, onAction }) {
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
                onClick={() => onAction(`${courier.name}: მარშრუტი გახსნილია`)}
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
                onClick={() =>
                  onAction(
                    carrier.status === "connected"
                      ? `${carrier.name}: კავშირი აქტიურია`
                      : `${carrier.name}: credentials ჯერ არ არის დამატებული`,
                  )
                }
              >
                <Settings2 />
                მართვა
              </button>
            </article>
          );
        })}
      </section>
    </Page>
  );
}

export function MapPage({ couriers, orders }) {
  const cities = Object.entries(
    orders.reduce((result, order) => {
      result[order.city] = (result[order.city] || 0) + 1;
      return result;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  return (
    <Page title="ქალაქების რუკა" subtitle="კურიერებისა და მიწოდებების ოპერაციული ხედი">
      <section className="map-layout">
        <div className="map-canvas" aria-label="კურიერების დემო რუკა">
          <div className="map-grid" />
          <span className="map-city-label tbilisi">თბილისი</span>
          <span className="map-city-label batumi">ბათუმი</span>
          <span className="map-city-label kutaisi">ქუთაისი</span>
          {couriers.map((courier, index) => (
            <button
              className={`map-marker marker-${index + 1}`}
              title={`${courier.name} — ${courier.city}`}
              key={courier.id}
            >
              <Truck />
              <span>{courier.activeAssignments}</span>
            </button>
          ))}
          <div className="map-note">
            <CloudCog />
            <span>
              Phase 1 preview
              <small>Google Maps/Mapbox key-ის გარეშე</small>
            </span>
          </div>
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
              onClick={() => onAction("ანგარიშის ექსპორტი Phase 2-ში დაემატება")}
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

export function ExceptionsPage({ orders, outbox, onAction }) {
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
                onClick={() => onAction(`${order.id}: ოპერატორის სამუშაო სივრცე გაიხსნა`)}
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
