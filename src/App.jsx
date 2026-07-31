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

  const register = useCallback(
    async (order, service, partnerTeam) => {
      const previousOrders = orders;
      const nextOrders = orders.map((item) =>
        item.id === order.id ? { ...item, service, status: "assigned" } : item,
      );
      setOrders(nextOrders);
      setSummary(calculateSummary(nextOrders));

      if (mode !== "neon") {
        showToast(`${order.id} დემო რეჟიმში დარეგისტრირდა`);
        return;
      }

      try {
        const response = await fetch("/api/orders", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": `${order.id}:${service}`,
            "X-Demo-Role": "operator",
          },
          body: JSON.stringify({
            orderId: order.id,
            service,
            partnerTeam,
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
            carrierName: partnerTeam,
            service,
            trackingCode: null,
            status: payload.shipment.status,
            labelStatus: "pending",
            createdAt: new Date().toISOString(),
          },
          ...current.filter((item) => item.orderId !== order.id),
        ]);
        setOutbox((current) => ({ ...current, pending: current.pending + 1 }));
        showToast(`${order.id} რეგისტრაციის რიგში დაემატა`);
      } catch {
        setOrders(previousOrders);
        setSummary(calculateSummary(previousOrders));
        showToast("რეგისტრაცია ვერ შესრულდა — სცადეთ ხელახლა");
      }
    },
    [mode, orders, showToast],
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
          onRefresh={() => setRefreshKey((value) => value + 1)}
        />
      );
    }
    if (route === "registrations") {
      return <RegistrationsPage shipments={shipments} outbox={outbox} />;
    }
    if (route === "couriers") {
      return <CouriersPage couriers={couriers} onAction={showToast} />;
    }
    if (route === "partners") {
      return <PartnersPage carriers={carriers} onAction={showToast} />;
    }
    if (route === "map") {
      return <MapPage couriers={couriers} orders={orders} />;
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
        <ExceptionsPage orders={orders} outbox={outbox} onAction={showToast} />
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
    orders,
    outbox,
    query,
    register,
    route,
    shipments,
    showToast,
    summary,
    theme,
  ]);

  function navigate(target) {
    window.location.hash = `/${target}`;
    setRoute(target);
    setSidebarOpen(false);
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
