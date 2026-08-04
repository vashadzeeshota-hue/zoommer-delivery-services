import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  emptySummary,
  seedCarriers,
  seedCouriers,
  seedOrders,
  seedShipments,
} from "./app-data";
import { AppShell } from "./components/AppShell";
import { AuthLoading, AuthScreen } from "./components/AuthScreen";
import { OrdersWorkspace } from "./pages/OrdersWorkspace";
import { PrintCenterPage } from "./pages/PrintCenterPage";
import { BranchPickupsPage } from "./pages/BranchPickupsPage";
import {
  CouriersPage,
  ExceptionsPage,
  MapPage,
  PartnersPage,
  RegistrationsPage,
  ReportsPage,
  SettingsPage,
} from "./pages/DashboardPages";

const knownRoutes = new Set([
  "today",
  "orders",
  "registrations",
  "printing",
  "branch-pickups",
  "couriers",
  "partners",
  "map",
  "reports",
  "exceptions",
  "settings",
]);

function readRoute() {
  const candidate = window.location.hash.replace(/^#\/?/, "");
  return knownRoutes.has(candidate) ? candidate : "today";
}

function calculateSummary(orders) {
  return orders.reduce(
    (summary, order) => {
      if (Object.hasOwn(summary, order.status)) {
        summary[order.status] += 1;
      }
      return summary;
    },
    { ...emptySummary },
  );
}

function currentTbilisiTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

const packageSizeLabels = {
  small: "პატარა",
  medium: "საშუალო",
  large: "დიდი",
};

const printRecordsStorageKey = "zoommer-print-records-v1";

function readPrintRecords() {
  try {
    return JSON.parse(window.localStorage.getItem(printRecordsStorageKey) || "{}") || {};
  } catch {
    return {};
  }
}

export default function App() {
  const [authStatus, setAuthStatus] = useState("loading");
  const [authUser, setAuthUser] = useState(null);
  const [route, setRoute] = useState(readRoute);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("zoommer-theme") || "light",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState(seedOrders);
  const [carriers, setCarriers] = useState(seedCarriers);
  const [couriers, setCouriers] = useState(seedCouriers);
  const [shipments, setShipments] = useState(seedShipments);
  const [outbox, setOutbox] = useState({ pending: 1, failed: 0, succeeded: 1 });
  const [summary, setSummary] = useState(() => calculateSummary(seedOrders));
  const [mode, setMode] = useState("demo");
  const [toast, setToast] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusedCourier, setFocusedCourier] = useState(null);
  const [printRecords, setPrintRecords] = useState(readPrintRecords);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Session check failed");
        return response.json();
      })
      .then((payload) => {
        if (!payload?.user) {
          setAuthUser(null);
          setAuthStatus("unauthenticated");
          return;
        }
        setAuthUser(payload.user);
        setAuthStatus("authenticated");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setAuthUser(null);
          setAuthStatus("unauthenticated");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("zoommer-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(printRecordsStorageKey, JSON.stringify(printRecords));
  }, [printRecords]);

  useEffect(() => {
    function syncRoute() {
      setRoute(readRoute());
      setSidebarOpen(false);
    }

    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || authUser?.mustChangePassword) return undefined;
    const controller = new AbortController();

    fetch("/api/v1/dashboard", { signal: controller.signal })
      .then((response) => {
        if (response.status === 401) {
          setAuthUser(null);
          setAuthStatus("unauthenticated");
          const error = new Error("Authentication required");
          error.name = "AuthenticationError";
          throw error;
        }
        if (!response.ok) {
          throw new Error("Dashboard API unavailable");
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.orders) && data.orders.length) {
          setOrders(data.orders);
          setSummary(data.summary || calculateSummary(data.orders));
        }
        if (Array.isArray(data.carriers)) setCarriers(data.carriers);
        if (Array.isArray(data.couriers)) setCouriers(data.couriers);
        if (Array.isArray(data.shipments)) setShipments(data.shipments);
        if (data.outbox) setOutbox(data.outbox);
        setMode("neon");
      })
      .catch((error) => {
        if (error.name !== "AbortError" && error.name !== "AuthenticationError") {
          setMode("demo");
        }
      });

    return () => controller.abort();
  }, [authStatus, authUser?.mustChangePassword, refreshKey]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const navigate = useCallback((target) => {
    window.location.hash = `/${target}`;
    setRoute(target);
    setSidebarOpen(false);
  }, []);

  const refreshDashboard = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const syncOrders = useCallback(() => {
    refreshDashboard();
    showToast("Zoommer.ge შეკვეთების სინქრონიზაცია დაიწყო");
  }, [refreshDashboard, showToast]);

  const openCourier = useCallback(
    (courier) => {
      setFocusedCourier(courier);
      navigate("map");
      showToast(`${courier.name}: მარშრუტი გახსნილია`);
    },
    [navigate, showToast],
  );

  const processException = useCallback(
    (order) => {
      setQuery(order.id);
      navigate("orders");
      showToast(`${order.id}: ოპერატორის სამუშაო სივრცე გახსნილია`);
    },
    [navigate, showToast],
  );

  const register = useCallback(
    async (order, delivery) => {
      const previousOrders = orders;
      const nextOrders = orders.map((item) =>
        item.id === order.id
          ? {
              ...item,
              service: delivery.service,
              serviceVariant: delivery.serviceVariant,
              providerCode: delivery.providerCode,
              scheduledDate: delivery.scheduledDate,
              windowStart: delivery.windowStart,
              windowEnd: delivery.windowEnd,
              partnerTeam: delivery.partnerTeam,
              status: "assigned",
            }
          : item,
      );
      setOrders(nextOrders);
      setSummary(calculateSummary(nextOrders));

      if (mode !== "neon") {
        showToast(`${order.id} • ${delivery.promiseLabel} • ${delivery.partnerTeam}`);
        return;
      }

      try {
        const response = await fetch("/api/orders", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": [
              order.id,
              delivery.service,
              delivery.providerCode,
              delivery.scheduledDate || "auto",
              delivery.windowStart || "none",
              delivery.windowEnd || "none",
            ].join(":"),
            "X-Demo-Role": "operator",
          },
          body: JSON.stringify({
            orderId: order.id,
            service: delivery.service,
            providerCode: delivery.providerCode,
            scheduledDate: delivery.scheduledDate,
            windowStart: delivery.windowStart,
            windowEnd: delivery.windowEnd,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          if (response.status === 401) {
            showToast(`${order.id} განახლდა მხოლოდ ეკრანზე — production write დაცულია`);
            return;
          }
          throw new Error(payload?.error?.message || "Registration failed");
        }

        const payload = await response.json();
        setShipments((current) => [
          {
            id: payload.shipment.id,
            orderId: order.id,
            carrierCode: payload.shipment.carrierCode,
            carrierName: delivery.partnerTeam,
            service: delivery.service,
            trackingCode: null,
            status: payload.shipment.status,
            labelStatus: "pending",
            createdAt: new Date().toISOString(),
          },
          ...current.filter((item) => item.orderId !== order.id),
        ]);
        setOutbox((current) => ({ ...current, pending: current.pending + 1 }));
        showToast(
          `${order.id} • ${payload.deliveryPromise.label} • რეგისტრაციის რიგშია`,
        );
      } catch {
        setOrders(previousOrders);
        setSummary(calculateSummary(previousOrders));
        showToast("რეგისტრაცია ვერ შესრულდა — სცადეთ ხელახლა");
      }
    },
    [mode, orders, showToast],
  );

  const updateOrder = useCallback(
    async (orderId, changes) => {
      const previousOrder = orders.find((order) => order.id === orderId);
      if (!previousOrder) return false;

      const optimisticOrder = { ...previousOrder, ...changes };
      setOrders((current) => {
        const next = current.map((order) => order.id === orderId ? optimisticOrder : order);
        setSummary(calculateSummary(next));
        return next;
      });

      if (mode !== "neon") {
        showToast(`${orderId} • ცვლილებები შენახულია დემო რეჟიმში`);
        return true;
      }

      try {
        const response = await fetch("/api/orders", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_fields",
            orderId,
            city: changes.city,
            address: changes.address,
            service: changes.service,
            status: changes.status,
            providerCode: previousOrder.providerCode,
            scheduledDate: previousOrder.scheduledDate,
            windowStart: previousOrder.windowStart,
            windowEnd: previousOrder.windowEnd,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.order) {
          throw new Error(payload?.error?.message || "Order update failed");
        }

        setOrders((current) => {
          const next = current.map((order) => order.id === orderId ? payload.order : order);
          setSummary(calculateSummary(next));
          return next;
        });
        showToast(`${orderId} • ცვლილებები შენახულია`);
        return true;
      } catch {
        setOrders((current) => {
          const next = current.map((order) => order.id === orderId ? previousOrder : order);
          setSummary(calculateSummary(next));
          return next;
        });
        showToast(`${orderId} • ცვლილებების შენახვა ვერ შესრულდა`);
        return false;
      }
    },
    [mode, orders, showToast],
  );

  const createManualOrder = useCallback(
    async (input) => {
      const now = new Date();
      const time = currentTbilisiTime(now);
      const temporaryId = `MAN-LOCAL-${Date.now().toString().slice(-8)}`;
      const optimisticOrder = {
        id: temporaryId,
        source: "manual",
        customer: input.recipientName,
        phone: input.recipientPhone,
        city: input.city,
        address: input.address,
        postalCode: input.postalCode || null,
        latitude: Number.isFinite(input.latitude) ? input.latitude : null,
        longitude: Number.isFinite(input.longitude) ? input.longitude : null,
        service: input.service,
        serviceVariant:
          input.service === "fast"
            ? time < "15:00"
              ? "same_day"
              : "next_day"
            : input.service,
        providerCode: input.providerCode,
        scheduledDate:
          input.service === "scheduled" ? input.scheduledDate : null,
        windowStart: input.service === "scheduled" ? input.windowStart : null,
        windowEnd: input.service === "scheduled" ? input.windowEnd : null,
        status: "new",
        time,
        weight: `${Number(input.weightKg).toFixed(2)} კგ`,
        sizeCode: input.packageSize,
        size: packageSizeLabels[input.packageSize],
        payment: "მიწოდება გადახდილია",
        orderPrice: `${Number(input.orderPrice).toFixed(2)} ₾`,
        partnerTeam: null,
      };

      setOrders((current) => {
        const next = [optimisticOrder, ...current];
        setSummary(calculateSummary(next));
        return next;
      });

      if (mode !== "neon") {
        showToast(`${temporaryId} • თანამშრომლის ორდერი დაემატა დემო რეჟიმში`);
        return true;
      }

      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": input.idempotencyKey,
            "X-Demo-Role": "operator",
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          if (response.status === 401) {
            showToast("ორდერი დაემატა მხოლოდ ეკრანზე — production write დაცულია");
            return true;
          }
          throw new Error(payload?.error?.message || "Order creation failed");
        }

        const payload = await response.json();
        setOrders((current) => {
          const next = current.map((order) =>
            order.id === temporaryId ? payload.order : order,
          );
          setSummary(calculateSummary(next));
          return next;
        });
        showToast(`${payload.order.id} • თანამშრომლის ორდერი შენახულია`);
        return true;
      } catch {
        setOrders((current) => {
          const next = current.filter((order) => order.id !== temporaryId);
          setSummary(calculateSummary(next));
          return next;
        });
        showToast("ორდერი ვერ შეინახა — გადაამოწმეთ მონაცემები და სცადეთ ხელახლა");
        return false;
      }
    },
    [mode, showToast],
  );

  const markLabelPrinted = useCallback(
    async ({ orderId, channel }) => {
      const printedAt = new Date().toISOString();
      const record = { status: "printed", printedAt, channel };
      setPrintRecords((current) => ({ ...current, [orderId]: record }));
      setOrders((current) => current.map((order) => (
        order.id === orderId
          ? { ...order, labelStatus: "printed", labelPrintedAt: printedAt }
          : order
      )));
      setShipments((current) => current.map((shipment) => (
        shipment.orderId === orderId
          ? { ...shipment, labelStatus: "printed", updatedAt: printedAt }
          : shipment
      )));

      if (mode !== "neon") return;

      try {
        const response = await fetch("/api/labels", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Demo-Role": "operator",
          },
          body: JSON.stringify({ orderId, channel }),
        });
        if (!response.ok) {
          if (response.status === 401) {
            showToast(`${orderId}: დაბეჭდვის სტატუსი შენახულია ამ ბრაუზერში`);
            return;
          }
          throw new Error("Print status update failed");
        }
        const payload = await response.json();
        const savedRecord = {
          status: "printed",
          printedAt: payload.printedAt || printedAt,
          channel: payload.channel || channel,
        };
        setPrintRecords((current) => ({ ...current, [orderId]: savedRecord }));
      } catch {
        showToast(`${orderId}: დაბეჭდვის სტატუსი დროებით მხოლოდ ამ ბრაუზერშია შენახული`);
      }
    },
    [mode, showToast],
  );

  const login = useCallback(async ({ email, password }) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.user) {
        return { ok: false, error: payload?.error?.message || "შესვლა ვერ შესრულდა" };
      }
      setAuthUser(payload.user);
      setAuthStatus("authenticated");
      return { ok: true };
    } catch {
      return { ok: false, error: "ავტორიზაციის სერვისი დროებით მიუწვდომელია" };
    }
  }, []);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.user) {
        return { ok: false, error: payload?.error?.message || "პაროლის შეცვლა ვერ შესრულდა" };
      }
      setAuthUser(payload.user);
      refreshDashboard();
      return { ok: true };
    } catch {
      return { ok: false, error: "პაროლის შეცვლის სერვისი დროებით მიუწვდომელია" };
    }
  }, [refreshDashboard]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      setAuthUser(null);
      setAuthStatus("unauthenticated");
      setMode("demo");
    }
  }, []);

  const content = useMemo(() => {
    if (route === "today" || route === "orders") {
      return (
        <OrdersWorkspace
          orders={orders}
          summary={summary}
          query={query}
          compact={route === "orders"}
          onRegister={register}
          onUpdateOrder={updateOrder}
          onCreateOrder={createManualOrder}
          onRefresh={syncOrders}
        />
      );
    }
    if (route === "registrations") {
      return (
        <RegistrationsPage
          shipments={shipments}
          outbox={outbox}
          orders={orders}
          onRefresh={refreshDashboard}
          onAction={showToast}
        />
      );
    }
    if (route === "printing") {
      return (
        <PrintCenterPage
          orders={orders}
          shipments={shipments}
          printRecords={printRecords}
          onMarkPrinted={markLabelPrinted}
          onAction={showToast}
        />
      );
    }
    if (route === "branch-pickups") {
      if (!authUser?.branchAccess) {
        return (
          <div className="page branch-access-denied">
            <h1>წვდომა შეზღუდულია</h1>
            <p>ფილიალიდან გაცემის მოდული ხელმისაწვდომია მხოლოდ უფლებამოსილი ფილიალის თანამშრომლებისთვის.</p>
          </div>
        );
      }
      return <BranchPickupsPage user={authUser} onAction={showToast} />;
    }
    if (route === "couriers") {
      return (
        <CouriersPage
          couriers={couriers}
          onOpenCourier={openCourier}
        />
      );
    }
    if (route === "partners") {
      return <PartnersPage carriers={carriers} onAction={showToast} />;
    }
    if (route === "map") {
      return (
        <MapPage
          couriers={couriers}
          orders={orders}
          focusedCourier={focusedCourier}
          onAction={showToast}
        />
      );
    }
    if (route === "reports") {
      return (
        <ReportsPage
          summary={summary}
          orders={orders}
          onAction={showToast}
        />
      );
    }
    if (route === "exceptions") {
      return (
        <ExceptionsPage
          orders={orders}
          outbox={outbox}
          onProcess={processException}
        />
      );
    }
    return (
      <SettingsPage
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        carriers={carriers}
      />
    );
  }, [
    carriers,
    authUser,
    couriers,
    createManualOrder,
    focusedCourier,
    openCourier,
    orders,
    outbox,
    query,
    refreshDashboard,
    register,
    updateOrder,
    route,
    shipments,
    showToast,
    processException,
    printRecords,
    summary,
    syncOrders,
    theme,
    markLabelPrinted,
  ]);

  if (authStatus === "loading") return <AuthLoading />;
  if (authStatus !== "authenticated" || !authUser) {
    return <AuthScreen key="login" onLogin={login} />;
  }
  if (authUser.mustChangePassword) {
    return <AuthScreen key="password-change" mode="change" user={authUser} onChangePassword={changePassword} onLogout={logout} />;
  }

  return (
    <AppShell
      route={route}
      onNavigate={navigate}
      query={query}
      onQueryChange={setQuery}
      theme={theme}
      onToggleTheme={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((current) => !current)}
      onAction={showToast}
      mode={mode}
      user={authUser}
      onLogout={logout}
    >
      {content}
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 />
          {toast}
        </div>
      ) : null}
    </AppShell>
  );
}
