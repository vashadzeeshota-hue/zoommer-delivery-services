import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Map,
  Menu,
  Moon,
  PackageCheck,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";

export const navigation = [
  { route: "today", label: "დღის ორდერები", icon: LayoutDashboard },
  { route: "orders", label: "შეკვეთები", icon: ClipboardList },
  { route: "registrations", label: "რეგისტრაციები", icon: PackageCheck },
  { route: "couriers", label: "კურიერები", icon: Users },
  { route: "partners", label: "პარტნიორები", icon: Handshake },
  { route: "map", label: "რუკა", icon: Map },
  { route: "reports", label: "ანგარიშები", icon: BarChart3 },
  { route: "exceptions", label: "გამონაკლისები", icon: AlertTriangle },
  { route: "settings", label: "პარამეტრები", icon: Settings },
];

export function AppShell({
  route,
  onNavigate,
  query,
  onQueryChange,
  theme,
  onToggleTheme,
  sidebarOpen,
  onToggleSidebar,
  mode,
  children,
}) {
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand-row">
          <div className="brand">
            <strong>ZOOMMER</strong>
            <span>DELIVERY</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={onToggleSidebar}
            aria-label="მენიუს დახურვა"
          >
            <X />
          </button>
        </div>

        <nav aria-label="მთავარი ნავიგაცია">
          {navigation.map(({ route: target, label, icon: Icon }) => (
            <button
              className={route === target ? "active" : ""}
              key={target}
              onClick={() => onNavigate(target)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">ნ</div>
          <div>
            <strong>ნინო ქავთარაძე</strong>
            <span>ოპერატორი</span>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          className="sidebar-scrim"
          onClick={onToggleSidebar}
          aria-label="მენიუს დახურვა"
        />
      ) : null}

      <main className="app-main">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={onToggleSidebar}
            aria-label="მენიუს გახსნა"
          >
            <Menu />
          </button>

          <label className="global-search">
            <Search />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="ძებნა შეკვეთის ნომრით, მიმღებით, ტელეფონით..."
            />
          </label>

          <span className={`environment-badge ${mode}`}>
            {mode === "neon" ? "Neon live" : "დემო მონაცემები"}
          </span>

          <button
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "ღია რეჟიმი" : "მუქი რეჟიმი"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>

          <button className="icon-button notification-button" aria-label="შეტყობინებები">
            <Bell />
            <i>5</i>
          </button>

          <div className="profile">
            <div className="avatar">ნ</div>
            <div>
              <strong>ნინო ქავთარაძე</strong>
              <span>ოპერატორი</span>
            </div>
            <ChevronDown />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
