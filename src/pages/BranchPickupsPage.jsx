import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Store,
  UserRound,
  X,
} from "lucide-react";

const statusLabels = {
  ready: "მზადაა",
  issued: "გაცემულია",
  in_transit: "გზაშია",
  delivered: "მიწოდებულია",
};

const serviceConfigs = {
  pickup: {
    title: "ფილიალიდან გაცემა",
    subtitle: "ფილიალში გასაცემი შეკვეთების მართვა",
    tableTitle: "გაცემების ცხრილი",
    branchLabel: "გამცემი ფილიალი",
    dateLabel: "გაცემის თარიღი",
    dateFilterLabel: "გაცემის დღე",
    emptyTitle: "გაცემის ჩანაწერები ჯერ არ არის",
    emptyDescription: "დაამატეთ პირველი ფილიალიდან გაცემის ჩანაწერი",
    drawerEditTitle: "გაცემის რედაქტირება",
    drawerSubtitle: "ფილიალში გასაცემი შეკვეთის ინფორმაცია",
    productLegend: "პროდუქტი და გაცემა",
    statusLabel: "გაცემის სტატუსი",
    statuses: ["ready", "issued"],
    completeStatus: "issued",
    metricLabels: ["მზადაა", "გაცემულია", "დღეს გაიცა"],
  },
  delivery: {
    title: "ფილიალიდან მიწოდება",
    subtitle: "ფილიალიდან მომხმარებლამდე გასაგზავნი შეკვეთების მართვა",
    tableTitle: "ფილიალიდან მიწოდებების ცხრილი",
    branchLabel: "გამგზავნი ფილიალი",
    dateLabel: "მიწოდების თარიღი",
    dateFilterLabel: "მიწოდების დღე",
    emptyTitle: "მიწოდების ჩანაწერები ჯერ არ არის",
    emptyDescription: "დაამატეთ პირველი ფილიალიდან მიწოდების ჩანაწერი",
    drawerEditTitle: "მიწოდების რედაქტირება",
    drawerSubtitle: "ფილიალიდან გასაგზავნი შეკვეთის ინფორმაცია",
    productLegend: "პროდუქტი და მიწოდება",
    statusLabel: "მიწოდების სტატუსი",
    statuses: ["ready", "in_transit", "delivered"],
    completeStatus: "delivered",
    metricLabels: ["მზადაა", "გზაშია", "დღეს მიეწოდა"],
  },
};

const paymentLabels = {
  card: "ბარათი",
  cash: "ნაღდი",
  bank_transfer: "საბანკო გადარიცხვა",
  installment: "განვადება",
  prepaid: "წინასწარ გადახდილი",
};

const emptyForm = {
  orderNumber: "",
  employeeExternalId: "",
  employeeName: "",
  paymentMethod: "card",
  customerName: "",
  customerPersonalNumber: "",
  alternateRecipientName: "",
  alternateRecipientPersonalNumber: "",
  destinationPhone: "",
  destinationAddress: "",
  branchId: "",
  productName: "",
  quantity: 1,
  serialNumber: "",
  issuedAt: "",
  status: "ready",
  comment: "",
  price: "",
  source: "manual",
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

function formatDateTime(value, operationType = "pickup") {
  if (!value) return operationType === "delivery" ? "ჯერ არ მიწოდებულა" : "ჯერ არ გაცემულა";
  return new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function datetimeLocal(value) {
  if (!value) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function maskPersonalNumber(value) {
  const personalNumber = String(value || "");
  if (personalNumber.length !== 11) return "—";
  return `${personalNumber.slice(0, 4)}••••${personalNumber.slice(-3)}`;
}

function formatPrice(value) {
  return new Intl.NumberFormat("ka-GE", {
    style: "currency",
    currency: "GEL",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function pickupToForm(pickup, employeeName, operationType) {
  if (!pickup) return { ...emptyForm, employeeName, operationType };
  return {
    ...emptyForm,
    ...pickup,
    alternateRecipientName: pickup.alternateRecipientName || "",
    alternateRecipientPersonalNumber: pickup.alternateRecipientPersonalNumber || "",
    destinationPhone: pickup.destinationPhone || "",
    destinationAddress: pickup.destinationAddress || "",
    employeeExternalId: pickup.employeeExternalId || "",
    serialNumber: pickup.serialNumber || "",
    issuedAt: datetimeLocal(pickup.issuedAt),
    comment: pickup.comment || "",
    price: String(pickup.price),
  };
}

function PickupDrawer({ branches, pickup, user, operationType, onClose, onSaved }) {
  const config = serviceConfigs[operationType];
  const [form, setForm] = useState(() => pickupToForm(pickup, user?.fullName || user?.email || "", operationType));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(pickupToForm(pickup, user?.fullName || user?.email || "", operationType));
    setError("");
  }, [operationType, pickup, user]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        id: pickup?.id,
        quantity: Number(form.quantity),
        price: Number(form.price),
        issuedAt: form.status === config.completeStatus ? (form.issuedAt || new Date().toISOString()) : null,
      };
      const response = await fetch("/api/branch-pickups", {
        method: pickup ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.pickup) {
        throw new Error(
          payload?.error?.fieldErrors?.[0]?.message ||
          payload?.error?.message ||
          "ჩანაწერის შენახვა ვერ შესრულდა",
        );
      }
      onSaved(payload.pickup);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="branch-drawer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className="branch-pickup-drawer" role="dialog" aria-modal="true" aria-labelledby="branch-drawer-title" data-testid="branch-pickup-drawer">
        <div className="modal-heading">
          <div>
            <span className="modal-icon"><Store /></span>
            <span>
              <h2 id="branch-drawer-title">{pickup ? config.drawerEditTitle : "ჩანაწერის დამატება"}</h2>
              <p>{config.drawerSubtitle}</p>
            </span>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="დახურვა"><X /></button>
        </div>

        <form className="manual-order-form branch-pickup-form" onSubmit={submit}>
          <fieldset>
            <legend>ძირითადი ინფორმაცია</legend>
            <div className="form-grid two-columns">
              <label>
                თანამშრომელი
                <input value={form.employeeName} readOnly className="readonly-input" />
                <small>Zoommer.ge API / მიმდინარე მომხმარებელი</small>
              </label>
              <label>
                ორდერის ნომერი *
                <input required value={form.orderNumber} onChange={(event) => change("orderNumber", event.target.value)} placeholder="ORD-2026-000001" />
              </label>
              <label>
                გადახდის მეთოდი *
                <select value={form.paymentMethod} onChange={(event) => change("paymentMethod", event.target.value)}>
                  {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                {config.branchLabel} *
                <select required value={form.branchId} onChange={(event) => change("branchId", event.target.value)}>
                  <option value="">აირჩიეთ ფილიალი</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.city} — {branch.name}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>მომხმარებელი და მიმღები</legend>
            <div className="form-grid two-columns">
              <label>
                მომხმარებლის სახელი და გვარი *
                <input required value={form.customerName} onChange={(event) => change("customerName", event.target.value)} />
              </label>
              <label>
                პირადი ნომერი *
                <input required inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={form.customerPersonalNumber} onChange={(event) => change("customerPersonalNumber", event.target.value.replace(/\D/g, ""))} placeholder="11 ციფრი" />
              </label>
              <label>
                სხვა გაიტანს — სახელი და გვარი
                <input value={form.alternateRecipientName} onChange={(event) => change("alternateRecipientName", event.target.value)} />
              </label>
              <label>
                სხვა გამტანის პირადი ნომერი
                <input inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={form.alternateRecipientPersonalNumber} onChange={(event) => change("alternateRecipientPersonalNumber", event.target.value.replace(/\D/g, ""))} placeholder="11 ციფრი" />
              </label>
              {operationType === "delivery" ? (
                <>
                  <label>
                    მიმღების ტელეფონი *
                    <input required value={form.destinationPhone} onChange={(event) => change("destinationPhone", event.target.value)} placeholder="+995 5XX XX XX XX" />
                  </label>
                  <label>
                    მიწოდების მისამართი *
                    <input required value={form.destinationAddress} onChange={(event) => change("destinationAddress", event.target.value)} placeholder="ქალაქი, ქუჩა, ნომერი" />
                  </label>
                </>
              ) : null}
            </div>
          </fieldset>

          <fieldset>
            <legend>{config.productLegend}</legend>
            <div className="form-grid two-columns">
              <label className="branch-field-wide">
                პროდუქტი *
                <input required value={form.productName} onChange={(event) => change("productName", event.target.value)} />
              </label>
              <label>
                რაოდენობა *
                <input required type="number" min="1" max="1000" value={form.quantity} onChange={(event) => change("quantity", event.target.value)} />
              </label>
              <label>
                სერიული ნომერი
                <input value={form.serialNumber} onChange={(event) => change("serialNumber", event.target.value)} />
              </label>
              <label>
                {config.statusLabel} *
                <select value={form.status} onChange={(event) => change("status", event.target.value)}>
                  {config.statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                </select>
              </label>
              <label className={form.status !== config.completeStatus ? "field-disabled" : ""}>
                {config.dateLabel}
                <input type="datetime-local" disabled={form.status !== config.completeStatus} value={form.issuedAt} onChange={(event) => change("issuedAt", event.target.value)} />
              </label>
              <label>
                ფასი (₾) *
                <input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => change("price", event.target.value)} />
              </label>
              <label className="branch-field-wide">
                კომენტარი
                <textarea value={form.comment} onChange={(event) => change("comment", event.target.value)} rows="3" />
              </label>
            </div>
          </fieldset>

          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>გაუქმება</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "ინახება..." : "შენახვა"}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export function BranchPickupsPage({ user, onAction, operationType = "pickup" }) {
  const config = serviceConfigs[operationType];
  const apiUrl = `/api/branch-pickups?service=${operationType}`;
  const [pickups, setPickups] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("");
  const [drawerPickup, setDrawerPickup] = useState(undefined);
  const [savingStatusId, setSavingStatusId] = useState("");

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl, { credentials: "same-origin", signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "მონაცემების ჩატვირთვა ვერ შესრულდა");
      setPickups(payload.pickups || []);
      setBranches(payload.branches || []);
    } catch (loadError) {
      if (loadError.name !== "AbortError") setError(loadError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ka-GE");
    return pickups.filter((pickup) => {
      if (branchFilter !== "all" && pickup.branchId !== branchFilter) return false;
      if (statusFilter !== "all" && pickup.status !== statusFilter) return false;
      if (dayFilter && dateKey(pickup.issuedAt || pickup.createdAt) !== dayFilter) return false;
      if (!needle) return true;
      return [
        pickup.orderNumber,
        pickup.employeeName,
        pickup.customerName,
        pickup.customerPersonalNumber,
        pickup.alternateRecipientName,
        pickup.destinationPhone,
        pickup.destinationAddress,
        pickup.branchName,
        pickup.productName,
        pickup.serialNumber,
      ].some((value) => String(value || "").toLocaleLowerCase("ka-GE").includes(needle));
    });
  }, [branchFilter, dayFilter, pickups, query, statusFilter]);

  const secondaryStatus = operationType === "delivery" ? "in_transit" : "issued";
  const metrics = useMemo(() => ({
    ready: pickups.filter((pickup) => pickup.status === "ready").length,
    secondary: pickups.filter((pickup) => pickup.status === secondaryStatus).length,
    today: pickups.filter((pickup) => pickup.status === config.completeStatus && dateKey(pickup.issuedAt) === dateKey(new Date())).length,
  }), [config.completeStatus, pickups, secondaryStatus]);

  function upsert(pickup) {
    setPickups((current) => {
      const exists = current.some((item) => item.id === pickup.id);
      return exists ? current.map((item) => item.id === pickup.id ? pickup : item) : [pickup, ...current];
    });
    setDrawerPickup(undefined);
    onAction?.(`${pickup.orderNumber}: ჩანაწერი შენახულია`);
  }

  async function updateStatus(pickup, status) {
    if (pickup.status === status) return;
    setSavingStatusId(pickup.id);
    const previous = pickup.status;
    const completedAt = status === config.completeStatus ? new Date().toISOString() : null;
    setPickups((current) => current.map((item) => item.id === pickup.id ? { ...item, status, issuedAt: completedAt } : item));
    try {
      const response = await fetch("/api/branch-pickups", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pickup.id, status, issuedAt: completedAt }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.pickup) throw new Error(payload?.error?.message || "სტატუსი ვერ შეიცვალა");
      setPickups((current) => current.map((item) => item.id === pickup.id ? payload.pickup : item));
      onAction?.(`${pickup.orderNumber}: სტატუსი — ${statusLabels[status]}`);
    } catch (statusError) {
      setPickups((current) => current.map((item) => item.id === pickup.id ? { ...item, status: previous, issuedAt: pickup.issuedAt } : item));
      onAction?.(statusError.message);
    } finally {
      setSavingStatusId("");
    }
  }

  const filtersActive = query || branchFilter !== "all" || statusFilter !== "all" || dayFilter;

  return (
    <div className="page branch-pickups-page" data-testid={`branch-${operationType}-page`}>
      <div className="page-heading branch-page-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setDrawerPickup(null)} data-testid={`add-branch-${operationType}`}><Plus />ჩანაწერის დამატება</button>
      </div>

      <section className="metric-grid branch-metric-grid">
        <article className="metric-card"><span className="metric-icon orange"><Clock3 /></span><div><span>{config.metricLabels[0]}</span><strong>{metrics.ready}</strong></div></article>
        <article className="metric-card"><span className="metric-icon green"><CheckCircle2 /></span><div><span>{config.metricLabels[1]}</span><strong>{metrics.secondary}</strong></div></article>
        <article className="metric-card"><span className="metric-icon blue"><CalendarDays /></span><div><span>{config.metricLabels[2]}</span><strong>{metrics.today}</strong></div></article>
      </section>

      <section className="surface data-surface branch-pickup-surface">
        <div className="surface-heading branch-toolbar">
          <div className="branch-toolbar-title">
            <div><h2>{config.tableTitle}</h2><p>პირადი ნომრები უსაფრთხოების მიზნით ნიღბულად ჩანს</p></div>
            <button type="button" className="secondary-button compact-button" onClick={() => load()} disabled={loading}><RefreshCw />განახლება</button>
          </div>
          <div className="print-toolbar-controls">
            <label className="print-search branch-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ორდერი, მომხმარებელი, სერიული..." data-testid={`branch-${operationType}-search`} /></label>
            <label className="print-filter-control"><span><Store />ფილიალი</span><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">ყველა ფილიალი</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.city} — {branch.name}</option>)}</select></label>
            <label className="print-filter-control"><span>სტატუსი</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ყველა სტატუსი</option>{config.statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
            <label className="print-filter-control"><span><CalendarDays />{config.dateFilterLabel}</span><input type="date" value={dayFilter} onChange={(event) => setDayFilter(event.target.value)} /></label>
          </div>
          <div className="print-filter-summary"><span>ნაპოვნია <strong>{filtered.length}</strong> ჩანაწერი</span>{filtersActive ? <button type="button" className="text-button" onClick={() => { setQuery(""); setBranchFilter("all"); setStatusFilter("all"); setDayFilter(""); }}>ფილტრების გასუფთავება</button> : null}</div>
        </div>

        {error ? <div className="branch-page-error"><strong>მონაცემები ვერ ჩაიტვირთა</strong><span>{error}</span><button type="button" className="secondary-button" onClick={() => load()}>ხელახლა ცდა</button></div> : (
          <div className="table-scroll branch-table-scroll">
            <table className={`data-table branch-pickups-table ${operationType === "delivery" ? "branch-deliveries-table" : ""}`}>
              <thead><tr><th>ორდერი / გადახდა</th><th>თანამშრომელი</th><th>მომხმარებელი</th><th>სხვა გაიტანს</th>{operationType === "delivery" ? <th>დანიშნულება</th> : null}<th>{config.branchLabel}</th><th>პროდუქტი</th><th>რაოდ.</th><th>სერიული ნომერი</th><th>{config.dateLabel}</th><th>სტატუსი</th><th>კომენტარი</th><th>ფასი</th><th aria-label="რედაქტირება" /></tr></thead>
              <tbody>
                {filtered.map((pickup) => (
                  <tr key={pickup.id}>
                    <td><strong className="order-id">{pickup.orderNumber}</strong><small>{paymentLabels[pickup.paymentMethod] || pickup.paymentMethod}</small></td>
                    <td><span className="branch-person"><UserRound />{pickup.employeeName}</span><small>{pickup.source === "zoommer.ge" ? "Zoommer.ge API" : "ხელით დამატებული"}</small></td>
                    <td><strong>{pickup.customerName}</strong><small>{maskPersonalNumber(pickup.customerPersonalNumber)}</small></td>
                    <td>{pickup.alternateRecipientName ? <><strong>{pickup.alternateRecipientName}</strong><small>{maskPersonalNumber(pickup.alternateRecipientPersonalNumber)}</small></> : <span className="muted-cell">—</span>}</td>
                    {operationType === "delivery" ? <td><strong>{pickup.destinationAddress}</strong><small>{pickup.destinationPhone}</small></td> : null}
                    <td><strong>{pickup.branchName}</strong><small>{pickup.branchCity}</small></td>
                    <td><strong>{pickup.productName}</strong></td>
                    <td>{pickup.quantity}</td>
                    <td><code className="serial-code">{pickup.serialNumber || "—"}</code></td>
                    <td><span className="branch-date">{formatDateTime(pickup.issuedAt, operationType)}</span></td>
                    <td><select className={`inline-status-select ${pickup.status}`} value={pickup.status} disabled={savingStatusId === pickup.id} onChange={(event) => updateStatus(pickup, event.target.value)} aria-label={`${pickup.orderNumber} სტატუსი`}>{config.statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td>
                    <td><span className="branch-comment" title={pickup.comment || ""}>{pickup.comment || "—"}</span></td>
                    <td><strong className="branch-price">{formatPrice(pickup.price)}</strong></td>
                    <td><button type="button" className="icon-button table-edit-button" onClick={() => setDrawerPickup(pickup)} aria-label={`${pickup.orderNumber} რედაქტირება`}><PencilLine /></button></td>
                  </tr>
                ))}
                {!loading && !filtered.length ? <tr><td colSpan={operationType === "delivery" ? 14 : 13}><div className="empty-state branch-empty-state"><Store /><strong>{filtersActive ? "შესაბამისი ჩანაწერი ვერ მოიძებნა" : config.emptyTitle}</strong><span>{filtersActive ? "შეცვალეთ ან გაასუფთავეთ ფილტრები" : config.emptyDescription}</span></div></td></tr> : null}
                {loading ? <tr><td colSpan={operationType === "delivery" ? 14 : 13}><div className="branch-table-loading"><i />მონაცემები იტვირთება...</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {drawerPickup !== undefined ? <PickupDrawer branches={branches} pickup={drawerPickup} user={user} operationType={operationType} onClose={() => setDrawerPickup(undefined)} onSaved={upsert} /> : null}
    </div>
  );
}
