import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Box,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  PackageCheck,
  RefreshCw,
  SlidersHorizontal,
  Truck,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { serviceMeta, statusMeta } from "../app-data";

const serviceIcons = {
  postal: Mail,
  express: Zap,
  internal: Bike,
};

const teamOptions = {
  postal: "საქართველოს ფოსტა • თბილისი",
  express: "QuickShipper • ექსპრესი",
  internal: "Zoommer შიდა გუნდი • თბილისი",
};

export function OrdersWorkspace({
  orders,
  summary,
  query,
  onRegister,
  onRefresh,
  compact = false,
}) {
  const [selectedId, setSelectedId] = useState(orders[0]?.id);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [activeService, setActiveService] = useState(orders[0]?.service || "postal");
  const [team, setTeam] = useState(teamOptions.express);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  useEffect(() => {
    const mobileInspector = window.matchMedia("(max-width: 1024px)");
    const closeInspectorOnSmallScreen = (event) => {
      if (event.matches) {
        setInspectorOpen(false);
      }
    };

    closeInspectorOnSmallScreen(mobileInspector);
    mobileInspector.addEventListener("change", closeInspectorOnSmallScreen);
    return () =>
      mobileInspector.removeEventListener("change", closeInspectorOnSmallScreen);
  }, []);

  const selected = orders.find((order) => order.id === selectedId) || orders[0];
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ka-GE");

    return orders.filter((order) => {
      const matchesQuery =
        !normalizedQuery ||
        `${order.id} ${order.customer} ${order.phone} ${order.city}`
          .toLocaleLowerCase("ka-GE")
          .includes(normalizedQuery);

      return (
        matchesQuery &&
        (statusFilter === "all" || order.status === statusFilter) &&
        (serviceFilter === "all" || order.service === serviceFilter)
      );
    });
  }, [orders, query, serviceFilter, statusFilter]);

  function selectOrder(order) {
    setSelectedId(order.id);
    setActiveService(order.service);
    setTeam(teamOptions[order.service]);
    setInspectorOpen(true);
  }

  if (!selected) {
    return <div className="empty-state">შეკვეთები ჯერ არ არის მიღებული.</div>;
  }

  return (
    <section className={`operations-workspace ${compact ? "compact" : ""}`}>
      <div className="operations-content">
        {!compact ? (
          <section className="summary-strip" aria-label="დღის შეჯამება">
            <Summary icon={Box} label="ახალი ორდერი" value={summary.new} tone="orange" />
            <Summary
              icon={UserRound}
              label="რეგისტრირებული"
              value={summary.assigned}
              tone="blue"
            />
            <Summary icon={Truck} label="კურიერი გზაშია" value={summary.transit} tone="blue" />
            <Summary
              icon={CheckCircle2}
              label="მიწოდებულია"
              value={summary.completed}
              tone="green"
            />
            <Summary
              icon={AlertTriangle}
              label="შეფერხება"
              value={summary.exception}
              tone="red"
            />
          </section>
        ) : null}

        <section className="queue-panel">
          <div className="queue-heading">
            <div>
              <h1>{compact ? "ყველა შეკვეთა" : "დღის ორდერები"}</h1>
              <span>Zoommer.ge-დან მიღებული მიწოდებები</span>
            </div>
            <button className="secondary-button" onClick={onRefresh}>
              <RefreshCw />
              სინქრონიზაცია
            </button>
          </div>

          <div className="filters-row">
            <div className="segmented-control">
              {[
                ["all", "ყველა"],
                ["new", "ახალი"],
                ["assigned", "რეგისტრირებული"],
                ["exception", "შეფერხება"],
              ].map(([value, label]) => (
                <button
                  className={statusFilter === value ? "on" : ""}
                  onClick={() => setStatusFilter(value)}
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="select-control">
              <SlidersHorizontal />
              <select
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value)}
              >
                <option value="all">ყველა სერვისი</option>
                <option value="postal">საფოსტო</option>
                <option value="express">ექსპრესი</option>
                <option value="internal">შიდა კურიერი</option>
              </select>
            </label>
            <span className="result-count">{filtered.length} ორდერი</span>
          </div>

          <div className="table-scroll">
            <table className="orders-table">
              <thead>
                <tr>
                  <th aria-label="არჩევა" />
                  <th>შეკვეთის ნომერი</th>
                  <th>მიმღები</th>
                  <th>დანიშნულება</th>
                  <th>სერვისი</th>
                  <th>წყარო</th>
                  <th>სტატუსი</th>
                  <th>დრო</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const Icon = serviceIcons[order.service];
                  const status = statusMeta[order.status] || [order.status, "blue"];

                  return (
                    <tr
                      className={selected.id === order.id ? "selected" : ""}
                      onClick={() => selectOrder(order)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          selectOrder(order);
                        }
                      }}
                      tabIndex={0}
                      key={order.id}
                    >
                      <td>
                        <span className="row-checkbox">
                          {selected.id === order.id ? <Check /> : null}
                        </span>
                      </td>
                      <td>
                        <strong className="order-id">{order.id}</strong>
                      </td>
                      <td>
                        <strong>{order.customer}</strong>
                        <small>{order.phone}</small>
                      </td>
                      <td>
                        <strong>{order.city}</strong>
                        <small>{order.address}</small>
                      </td>
                      <td>
                        <span className="service-label">
                          <Icon />
                          {serviceMeta[order.service].label}
                        </span>
                      </td>
                      <td>
                        <span className="source-label">zoommer.ge</span>
                      </td>
                      <td>
                        <span className={`status-label ${status[1]}`}>
                          <i />
                          {status[0]}
                        </span>
                      </td>
                      <td>{order.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              ნაჩვენებია 1–{filtered.length} / {orders.length}
            </span>
            <div>
              <button disabled>‹</button>
              <button className="current">1</button>
              <button disabled>›</button>
            </div>
          </div>
        </section>
      </div>

      <aside className={`order-inspector ${inspectorOpen ? "open" : ""}`}>
        <div className="inspector-heading">
          <div>
            <span>შეკვეთა:</span>
            <strong>{selected.id}</strong>
          </div>
          <button
            className="icon-button"
            onClick={() => setInspectorOpen(false)}
            aria-label="დეტალების დახურვა"
          >
            <X />
          </button>
        </div>

        <div className="inspector-tabs">
          <button className="active">დეტალები</button>
          <button>ისტორია</button>
        </div>

        <Info icon={UserRound} title="მიმღები">
          <strong>{selected.customer}</strong>
          <span>{selected.phone}</span>
        </Info>
        <Info icon={MapPin} title="მისამართი">
          <strong>{selected.city}</strong>
          <span>{selected.address}</span>
        </Info>
        <Info icon={Box} title="პაკეტის ინფორმაცია">
          <div className="package-grid">
            <span>
              წონა <b>{selected.weight}</b>
            </span>
            <span>
              ზომები <b>{selected.size}</b>
            </span>
            <span>
              გადახდა <b>{selected.payment}</b>
            </span>
            <span>
              COD <b>{selected.cod}</b>
            </span>
          </div>
        </Info>

        <section className="service-choice">
          <h3>სერვისის არჩევა</h3>
          <div className="service-cards">
            {Object.entries(serviceMeta).map(([key, service]) => {
              const Icon = serviceIcons[key];
              return (
                <button
                  className={activeService === key ? "active" : ""}
                  onClick={() => {
                    setActiveService(key);
                    setTeam(teamOptions[key]);
                  }}
                  key={key}
                >
                  {activeService === key ? (
                    <i>
                      <Check />
                    </i>
                  ) : null}
                  <Icon />
                  <strong>{service.label}</strong>
                  <span>{service.eta}</span>
                  <b>{service.price}</b>
                </button>
              );
            })}
          </div>
        </section>

        <section className="assignment-block">
          <label htmlFor="team-select">კურიერი / გუნდი</label>
          <div className="select-control wide">
            <Users />
            <select
              id="team-select"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
            >
              {Object.values(teamOptions).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="sla-block">
          <div>
            <Clock3 />
            <span>ფასი და SLA</span>
          </div>
          <p>
            <span>
              მიწოდების ვადა <b>{serviceMeta[activeService].eta}</b>
            </span>
            <span>
              ჯამური ფასი <b>{serviceMeta[activeService].price}</b>
            </span>
          </p>
        </section>

        <button
          className="primary-button register-button"
          onClick={() => onRegister(selected, activeService, team)}
        >
          <PackageCheck />
          პაკეტის რეგისტრაცია / მინიჭება
        </button>

        <section className="activity-block">
          <h3>ბოლო აქტივობები</h3>
          <div className="timeline">
            <p>
              <i />
              <time>{selected.time}</time>
              <span>
                შეკვეთა მიღებულია
                <small>zoommer.ge</small>
              </span>
            </p>
            <p>
              <i />
              <time>ახლა</time>
              <span>
                მონაცემები გადამოწმებულია
                <small>ოპერატორი</small>
              </span>
            </p>
          </div>
        </section>
      </aside>
    </section>
  );
}

function Summary({ icon: Icon, label, value, tone }) {
  return (
    <div className="summary-item">
      <span className={`summary-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Info({ icon: Icon, title, children }) {
  return (
    <section className="info-block">
      <Icon />
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </section>
  );
}
