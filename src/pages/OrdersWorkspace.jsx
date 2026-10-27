import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Box,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  PackageCheck,
  PackagePlus,
  Pencil,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Truck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { serviceMeta, statusMeta } from "../app-data";
import { ManualOrderModal } from "../components/ManualOrderModal";

const serviceIcons = {
  fast: Zap,
  standard: Mail,
  scheduled: CalendarClock,
};

const providerNames = {
  quickshipper: "QuickShipper",
  georgian_post: "საქართველოს ფოსტა",
  fedex_tnt: "TNT Express",
  internal: "Zoommer შიდა კურიერი",
};

const standardProviders = [
  {
    code: "georgian_post",
    name: "საქართველოს ფოსტა",
    note: "ეროვნული საფოსტო ქსელი",
    icon: Mail,
  },
  {
    code: "fedex_tnt",
    name: "TNT Express",
    note: "TNT / FedEx ქსელი",
    icon: Truck,
  },
];

const editableStatusOptions = ["new", "assigned", "transit", "completed", "exception"];

function toLocalDateInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalDateInput(date);
}

function fastVariantFor(order) {
  if (order.serviceVariant === "same_day" || order.serviceVariant === "next_day") {
    return order.serviceVariant;
  }

  return (order.time || "00:00") < "15:00" ? "same_day" : "next_day";
}

function deliveryLabel(service, order, scheduledDate, windowStart, windowEnd) {
  if (service === "fast") {
    return fastVariantFor(order) === "same_day" ? "იმავე დღეს" : "მეორე დღეს";
  }
  if (service === "standard") return "2–5 სამუშაო დღე";
  if (scheduledDate && windowStart && windowEnd) {
    return `${scheduledDate} • ${windowStart}–${windowEnd}`;
  }
  return "აირჩიეთ დროის ფანჯარა";
}

export function OrdersWorkspace({
  orders,
  summary,
  query,
  onRegister,
  onUpdateOrder,
  onCreateOrder,
  onRefresh,
  compact = false,
}) {
  const firstOrder = orders[0];
  const [selectedId, setSelectedId] = useState(firstOrder?.id);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [activeService, setActiveService] = useState(firstOrder?.service || "fast");
  const [providerCode, setProviderCode] = useState(
    firstOrder?.providerCode || "georgian_post",
  );
  const [scheduledDate, setScheduledDate] = useState(
    firstOrder?.scheduledDate || tomorrowDate(),
  );
  const [windowStart, setWindowStart] = useState(firstOrder?.windowStart || "12:00");
  const [windowEnd, setWindowEnd] = useState(firstOrder?.windowEnd || "15:00");
  const [expandedId, setExpandedId] = useState(null);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectorTab, setInspectorTab] = useState("details");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [editError, setEditError] = useState("");

  const selected = orders.find((order) => order.id === selectedId) || firstOrder;
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
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const visibleOrders = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, serviceFilter, statusFilter]);

  function selectOrder(order, { toggle = true } = {}) {
    const shouldExpand = !toggle || expandedId !== order.id;
    setSelectedId(order.id);
    if (toggle) setExpandedId(shouldExpand ? order.id : null);
    setActiveService(order.service);
    setProviderCode(
      order.service === "fast"
        ? "quickshipper"
        : order.service === "scheduled"
          ? "internal"
          : ["georgian_post", "fedex_tnt"].includes(order.providerCode)
            ? order.providerCode
            : "georgian_post",
    );
    setScheduledDate(order.scheduledDate || tomorrowDate());
    setWindowStart(order.windowStart || "12:00");
    setWindowEnd(order.windowEnd || "15:00");
    setInspectorTab("details");
  }

  function chooseService(service) {
    setActiveService(service);
    if (service === "fast") setProviderCode("quickshipper");
    if (service === "standard" && !["georgian_post", "fedex_tnt"].includes(providerCode)) {
      setProviderCode("georgian_post");
    }
    if (service === "scheduled") setProviderCode("internal");
  }

  function startEditing(order, event) {
    event.stopPropagation();
    setSelectedId(order.id);
    setEditingId(order.id);
    setEditDraft({
      city: order.city,
      address: order.address,
      service: order.service,
      status: order.status,
    });
    setEditError("");
  }

  function cancelEditing(event) {
    event.stopPropagation();
    setEditingId(null);
    setEditDraft(null);
    setEditError("");
  }

  async function saveEditing(order, event) {
    event.stopPropagation();
    const normalizedDraft = {
      city: editDraft.city.trim(),
      address: editDraft.address.trim(),
      service: editDraft.service,
      status: editDraft.status,
    };
    if (normalizedDraft.city.length < 2 || normalizedDraft.address.length < 3) {
      setEditError("შეავსეთ ქალაქი და სრული მისამართი");
      return;
    }

    setSavingId(order.id);
    setEditError("");
    const saved = await onUpdateOrder(order.id, normalizedDraft);
    setSavingId(null);
    if (saved) {
      selectOrder({ ...order, ...normalizedDraft }, { toggle: false });
      setEditingId(null);
      setEditDraft(null);
    } else {
      setEditError("შენახვა ვერ შესრულდა — სცადეთ ხელახლა");
    }
  }

  if (!selected) {
    return (
      <div className="empty-state">
        <PackagePlus />
        <strong>შეკვეთები ჯერ არ არის მიღებული</strong>
        <span>პირველი ორდერი თანამშრომელმა შეიძლება ხელით დაამატოს.</span>
        <button className="primary-button" onClick={() => setManualOrderOpen(true)}>
          <PackagePlus />
          ორდერის დამატება
        </button>
        <ManualOrderModal
          open={manualOrderOpen}
          onClose={() => setManualOrderOpen(false)}
          onSubmit={onCreateOrder}
        />
      </div>
    );
  }

  const isScheduleValid =
    activeService !== "scheduled" ||
    (scheduledDate >= toLocalDateInput() && windowStart < windowEnd);
  const fastVariant = fastVariantFor(selected);
  const activeProvider =
    activeService === "fast"
      ? "quickshipper"
      : activeService === "scheduled"
        ? "internal"
        : providerCode;
  const promiseLabel = deliveryLabel(
    activeService,
    selected,
    scheduledDate,
    windowStart,
    windowEnd,
  );

  return (
    <section className={`operations-workspace ${compact ? "compact" : ""}`.trim()}>
      <div className="operations-content">
        {!compact ? (
          <section className="summary-strip" aria-label="დღის შეჯამება">
            <Summary icon={Box} label="ახალი ორდერი" value={summary.new} tone="orange" />
            <Summary icon={UserRound} label="რეგისტრირებული" value={summary.assigned} tone="blue" />
            <Summary icon={Truck} label="კურიერი გზაშია" value={summary.transit} tone="blue" />
            <Summary icon={CheckCircle2} label="მიწოდებულია" value={summary.completed} tone="green" />
            <Summary icon={AlertTriangle} label="შეფერხება" value={summary.exception} tone="red" />
          </section>
        ) : null}

        <section className="queue-panel">
          <div className="queue-heading">
            <div>
              <h1>{compact ? "ყველა შეკვეთა" : "დღის ორდერები"}</h1>
              <span>Zoommer.ge-დან და თანამშრომლების მიერ დამატებული მიწოდებები</span>
            </div>
            <div className="queue-actions">
              <button
                className="primary-button add-order-button"
                onClick={() => setManualOrderOpen(true)}
                data-testid="add-order"
              >
                <PackagePlus />
                ორდერის დამატება
              </button>
              <button className="secondary-button" onClick={onRefresh}>
                <RefreshCw />
                სინქრონიზაცია
              </button>
            </div>
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
              <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                <option value="all">ყველა სერვისი</option>
                <option value="fast">სწრაფი</option>
                <option value="standard">სტანდარტული</option>
                <option value="scheduled">დაგეგმილი</option>
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
                  <th aria-label="მოქმედებები" />
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const Icon = serviceIcons[order.service] || Truck;
                  const status = statusMeta[order.status] || [order.status, "blue"];
                  const isEditing = editingId === order.id;
                  const isExpanded = expandedId === order.id;

                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={`${isExpanded ? "selected" : ""} ${isEditing ? "editing" : ""}`}
                        onClick={() => { if (!isEditing) selectOrder(order); }}
                        onKeyDown={(event) => {
                          if (!isEditing && (event.key === "Enter" || event.key === " ")) selectOrder(order);
                        }}
                        tabIndex={isEditing ? -1 : 0}
                        aria-expanded={isExpanded}
                        data-testid={`order-row-${order.id}`}
                      >
                      <td><span className={`row-expander ${isExpanded ? "open" : ""}`}><ChevronDown /></span></td>
                      <td><strong className="order-id">{order.id}</strong></td>
                      <td><strong>{order.customer}</strong><small>{order.phone}</small></td>
                      <td className={isEditing ? "inline-edit-cell destination-edit" : ""} onClick={isEditing ? (event) => event.stopPropagation() : undefined}>
                        {isEditing ? (
                          <div className="destination-fields">
                            <input aria-label="ქალაქი" value={editDraft.city} onChange={(event) => setEditDraft((current) => ({ ...current, city: event.target.value }))} data-testid={`edit-city-${order.id}`} />
                            <input aria-label="მისამართი" value={editDraft.address} onChange={(event) => setEditDraft((current) => ({ ...current, address: event.target.value }))} data-testid={`edit-address-${order.id}`} />
                            {editError ? <span className="inline-edit-error" role="alert">{editError}</span> : null}
                          </div>
                        ) : <><strong>{order.city}</strong><small>{order.address}</small></>}
                      </td>
                      <td className={isEditing ? "inline-edit-cell" : ""} onClick={isEditing ? (event) => event.stopPropagation() : undefined}>
                        {isEditing ? (
                          <select aria-label="მიწოდების სერვისი" value={editDraft.service} onChange={(event) => setEditDraft((current) => ({ ...current, service: event.target.value }))} data-testid={`edit-service-${order.id}`}>
                            {Object.entries(serviceMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}
                          </select>
                        ) : (
                          <span className="service-label">
                            <Icon />
                            {serviceMeta[order.service]?.label || order.service}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`source-label ${order.source === "manual" ? "manual" : ""}`}>
                          {order.source === "manual" ? "თანამშრომელი" : "zoommer.ge"}
                        </span>
                      </td>
                      <td className={isEditing ? "inline-edit-cell" : ""} onClick={isEditing ? (event) => event.stopPropagation() : undefined}>
                        {isEditing ? (
                          <select aria-label="ორდერის სტატუსი" value={editDraft.status} onChange={(event) => setEditDraft((current) => ({ ...current, status: event.target.value }))} data-testid={`edit-status-${order.id}`}>
                            {editableStatusOptions.map((value) => <option value={value} key={value}>{statusMeta[value][0]}</option>)}
                          </select>
                        ) : <span className={`status-label ${status[1]}`}><i />{status[0]}</span>}
                      </td>
                      <td>{order.time}</td>
                      <td className="row-actions" onClick={(event) => event.stopPropagation()}>
                        {isEditing ? (
                          <div>
                            <button className="row-action save" onClick={(event) => saveEditing(order, event)} disabled={savingId === order.id} aria-label="ცვლილებების შენახვა" data-testid={`save-order-${order.id}`}><Save /></button>
                            <button className="row-action" onClick={cancelEditing} disabled={savingId === order.id} aria-label="რედაქტირების გაუქმება"><X /></button>
                          </div>
                        ) : (
                          <button className="row-action" onClick={(event) => startEditing(order, event)} aria-label={`${order.id} რედაქტირება`} data-testid={`edit-order-${order.id}`}><Pencil /></button>
                        )}
                      </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="order-details-row" data-testid={`order-details-${order.id}`}>
                          <td colSpan={9}>
                            <OrderDetailsPanel
                              selected={selected}
                              inspectorTab={inspectorTab}
                              setInspectorTab={setInspectorTab}
                              onClose={() => setExpandedId(null)}
                              activeService={activeService}
                              chooseService={chooseService}
                              providerCode={providerCode}
                              setProviderCode={setProviderCode}
                              scheduledDate={scheduledDate}
                              setScheduledDate={setScheduledDate}
                              windowStart={windowStart}
                              setWindowStart={setWindowStart}
                              windowEnd={windowEnd}
                              setWindowEnd={setWindowEnd}
                              isScheduleValid={isScheduleValid}
                              fastVariant={fastVariant}
                              promiseLabel={promiseLabel}
                              activeProvider={activeProvider}
                              onRegister={onRegister}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              ნაჩვენებია {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} / {filtered.length}
            </span>
            <div>
              <button disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} aria-label="წინა გვერდი">‹</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button className={safePage === page ? "current" : ""} onClick={() => setCurrentPage(page)} key={page}>{page}</button>
              ))}
              <button disabled={safePage === pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} aria-label="შემდეგი გვერდი">›</button>
            </div>
          </div>
        </section>
      </div>

      <ManualOrderModal
        open={manualOrderOpen}
        onClose={() => setManualOrderOpen(false)}
        onSubmit={onCreateOrder}
      />
    </section>
  );
}

function OrderDetailsPanel({
  selected,
  inspectorTab,
  setInspectorTab,
  onClose,
  activeService,
  chooseService,
  providerCode,
  setProviderCode,
  scheduledDate,
  setScheduledDate,
  windowStart,
  setWindowStart,
  windowEnd,
  setWindowEnd,
  isScheduleValid,
  fastVariant,
  promiseLabel,
  activeProvider,
  onRegister,
}) {
  return (
    <div className="inline-order-details">
      <div className="inspector-heading">
        <div><span>შეკვეთა:</span><strong>{selected.id}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="დეტალების დახურვა"><X /></button>
      </div>

      <div className="inspector-tabs">
        <button className={inspectorTab === "details" ? "active" : ""} onClick={() => setInspectorTab("details")}>დეტალები და დამუშავება</button>
        <button className={inspectorTab === "history" ? "active" : ""} onClick={() => setInspectorTab("history")} data-testid="history-tab">ისტორია</button>
      </div>

      {inspectorTab === "details" ? (
        <div className="inline-details-grid">
          <div className="inline-order-overview">
            <Info icon={UserRound} title="მიმღები"><strong>{selected.customer}</strong><span>{selected.phone}</span></Info>
            <Info icon={MapPin} title="მისამართი"><strong>{selected.city}</strong><span>{selected.address}</span></Info>
            <Info icon={Box} title="პაკეტის ინფორმაცია">
              <div className="package-grid">
                <span>წონა <b>{selected.weight}</b></span>
                <span>ზომა <b>{selected.size}</b></span>
                <span>გადახდა <b>{selected.payment}</b></span>
                <span>ორდერის ფასი <b>{selected.orderPrice}</b></span>
              </div>
            </Info>
          </div>

          <div className="inline-order-processing">
            <section className="service-choice">
              <h3>სერვისის არჩევა</h3>
              <div className="service-cards">
                {Object.entries(serviceMeta).map(([key, service]) => {
                  const Icon = serviceIcons[key];
                  return (
                    <button
                      className={activeService === key ? "active" : ""}
                      onClick={() => chooseService(key)}
                      key={key}
                      data-testid={`service-${key}`}
                    >
                      {activeService === key ? <i><Check /></i> : null}
                      <Icon />
                      <strong>{service.label}</strong>
                      <span>{service.eta}</span>
                      <b>{service.price}</b>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="inline-processing-config">
              <section className="delivery-config" data-testid="delivery-config">
                {activeService === "fast" ? (
                  <>
                    <div className="config-heading"><Zap /><div><strong>15:00 cutoff</strong><span>ორდერი შემოვიდა {selected.time}-ზე</span></div></div>
                    <div className="cutoff-options">
                      <div className={fastVariant === "same_day" ? "active" : ""}><span>15:00-მდე</span><strong>იმავე დღეს</strong></div>
                      <div className={fastVariant === "next_day" ? "active" : ""}><span>15:00-დან</span><strong>მეორე დღეს</strong></div>
                    </div>
                    <ProviderSummary code="quickshipper" />
                  </>
                ) : null}

                {activeService === "standard" ? (
                  <>
                    <div className="config-heading"><Truck /><div><strong>აირჩიეთ პროვაიდერი</strong><span>ჩაბარების ვადა ორივე შემთხვევაში 2–5 სამუშაო დღეა</span></div></div>
                    <div className="provider-options">
                      {standardProviders.map((provider) => {
                        const Icon = provider.icon;
                        return (
                          <button
                            className={providerCode === provider.code ? "active" : ""}
                            onClick={() => setProviderCode(provider.code)}
                            key={provider.code}
                            data-testid={`provider-${provider.code}`}
                          >
                            <Icon />
                            <span><strong>{provider.name}</strong><small>{provider.note}</small></span>
                            <i>{providerCode === provider.code ? <Check /> : null}</i>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {activeService === "scheduled" ? (
                  <>
                    <div className="config-heading"><CalendarClock /><div><strong>მიწოდების დრო</strong><span>მომხმარებლის მიერ არჩეული თარიღი და მონაკვეთი</span></div></div>
                    <div className="schedule-fields">
                      <label>თარიღი<input type="date" min={toLocalDateInput()} value={scheduledDate} onInput={(event) => setScheduledDate(event.currentTarget.value)} data-testid="scheduled-date" /></label>
                      <label>დაწყება<input type="time" value={windowStart} onInput={(event) => setWindowStart(event.currentTarget.value)} data-testid="window-start" /></label>
                      <label>დასრულება<input type="time" value={windowEnd} onInput={(event) => setWindowEnd(event.currentTarget.value)} data-testid="window-end" /></label>
                    </div>
                    {!isScheduleValid ? <p className="field-error">დასრულების დრო დასაწყისზე გვიან უნდა იყოს.</p> : null}
                    <ProviderSummary code="internal" />
                  </>
                ) : null}
              </section>

              <section className="sla-block">
                <div><Clock3 /><span>ფასი და SLA</span></div>
                <p>
                  <span>მიწოდების ვადა <b data-testid="promise-label">{promiseLabel}</b></span>
                  <span>ჯამური ფასი <b>{serviceMeta[activeService].price}</b></span>
                </p>
              </section>

              <button
                className="primary-button register-button"
                disabled={!isScheduleValid}
                onClick={() =>
                  onRegister(selected, {
                    service: activeService,
                    providerCode: activeProvider,
                    partnerTeam: providerNames[activeProvider],
                    scheduledDate: activeService === "scheduled" ? scheduledDate : null,
                    windowStart: activeService === "scheduled" ? windowStart : null,
                    windowEnd: activeService === "scheduled" ? windowEnd : null,
                    serviceVariant: activeService === "fast" ? fastVariant : activeService,
                    promiseLabel,
                  })
                }
              >
                <PackageCheck />
                პაკეტის რეგისტრაცია / მინიჭება
              </button>
            </div>
          </div>
        </div>
      ) : (
        <section className="activity-block history-view" data-testid="order-history">
          <h3>ორდერის ისტორია</h3>
          <div className="timeline">
            <p><i /><time>{selected.time}</time><span>შეკვეთა მიღებულია<small>{selected.source === "manual" ? "თანამშრომელი" : "zoommer.ge"}</small></span></p>
            <p><i /><time>ახლა</time><span>მონაცემები გადამოწმებულია<small>ოპერატორი</small></span></p>
            {selected.status !== "new" ? <p><i /><time>ახლა</time><span>სერვისი მინიჭებულია<small>{providerNames[selected.providerCode] || selected.partnerTeam || "ოპერაციები"}</small></span></p> : null}
          </div>
        </section>
      )}
    </div>
  );
}

function ProviderSummary({ code }) {
  return (
    <div className="provider-summary">
      <span>შემსრულებელი</span>
      <strong>{providerNames[code]}</strong>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone }) {
  return <div className="summary-item"><span className={`summary-icon ${tone}`}><Icon /></span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Info({ icon: Icon, title, children }) {
  return <section className="info-block"><Icon /><div><h3>{title}</h3>{children}</div></section>;
}
