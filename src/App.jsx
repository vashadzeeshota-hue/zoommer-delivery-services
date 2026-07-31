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
import { OrdersWorkspace } from "./pages/OrdersWorkspace";
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

export default function App() {
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("zoommer-theme", theme);
  }, [theme]);

  useEffect(() => {
    function syncRoute() {
      setRoute(readRoute());
      setSidebarOpen(false);
    }

    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/dashboard", { signal: controller.signal })
      .then((response) => {
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
        if (error.name !== "AbortError") {
          setMode("demo");
        }
      });

    return () => controller.abort();
  }, [refreshKey]);

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

  const content = useMemo(() => {
    if (route === "today" || route === "orders") {
      return (
        <OrdersWorkspace
          orders={orders}
          summary={summary}
          query={query}
          compact={route === "orders"}
          onRegister={register}
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
    couriers,
    createManualOrder,
    focusedCourier,
    openCourier,
    orders,
    outbox,
    query,
    refreshDashboard,
    register,
    route,
    shipments,
    showToast,
    processException,
    summary,
    syncOrders,
    theme,
  ]);

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
