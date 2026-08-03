import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  PackageCheck,
  Printer,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";

const initialNotifications = [
  { id: 1, title: "რეგისტრაცია რიგშია", detail: "QuickShipper • 1 ახალი job" },
  { id: 2, title: "მიწოდების შეფერხება", detail: "ZMG-DEMO-0127 • რუსთავი" },
  { id: 3, title: "სინქრონიზაცია დასრულდა", detail: "Zoommer.ge • რამდენიმე წუთის წინ" },
];

export const navigation = [
  { route: "today", label: "დღის ორდერები", icon: LayoutDashboard },
  { route: "orders", label: "შეკვეთები", icon: ClipboardList },
  { route: "registrations", label: "რეგისტრაციები", icon: PackageCheck },
  { route: "printing", label: "ბეჭდვა", icon: Printer },
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
  onAction,
  mode,
  user,
  onLogout,
  children,
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = String(user?.fullName || user?.email || "Z")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("ka-GE");
  const roleLabel = user?.role === "admin" ? "ადმინისტრატორი" : user?.role === "courier" ? "კურიერი" : "ოპერატორი";

  function navigate(target) {
    setNotificationsOpen(false);
    setProfileOpen(false);
    onNavigate(target);
  }

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
              onClick={() => navigate(target)}
              aria-label={label}
              title={label}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div>
            <strong>{user?.fullName || user?.email}</strong>
            <span>{roleLabel}</span>
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

          <div className="topbar-action">
            <button
              className={`icon-button notification-button ${notificationsOpen ? "active" : ""}`}
              aria-label="შეტყობინებები"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((current) => !current);
                setProfileOpen(false);
              }}
              data-testid="notifications-button"
            >
              <Bell />
              {notifications.length ? <i>{notifications.length}</i> : null}
            </button>
            {notificationsOpen ? (
              <section className="topbar-popover notifications-popover" data-testid="notifications-popover">
                <div className="popover-heading">
                  <strong>შეტყობინებები</strong>
                  <span>{notifications.length} ახალი</span>
                </div>
                {notifications.length ? (
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          setNotifications((current) =>
                            current.filter((item) => item.id !== notification.id),
                          );
                          onAction?.(`${notification.title}: გახსნილია`);
                        }}
                      >
                        <i />
                        <span>
                          <strong>{notification.title}</strong>
                          <small>{notification.detail}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="popover-empty">ახალი შეტყობინება არ არის.</p>
                )}
                {notifications.length ? (
                  <button
                    className="popover-footer"
                    onClick={() => {
                      setNotifications([]);
                      onAction?.("ყველა შეტყობინება მონიშნულია წაკითხულად");
                    }}
                  >
                    ყველას წაკითხვად მონიშვნა
                  </button>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="profile-wrap">
            <button
              className={`profile ${profileOpen ? "active" : ""}`}
              onClick={() => {
                setProfileOpen((current) => !current);
                setNotificationsOpen(false);
              }}
              aria-expanded={profileOpen}
              data-testid="profile-button"
            >
              <div className="avatar">{initials}</div>
              <div>
                <strong>{user?.fullName || user?.email}</strong>
                <span>{roleLabel}</span>
              </div>
              <ChevronDown />
            </button>
            {profileOpen ? (
              <section className="topbar-popover profile-popover" data-testid="profile-popover">
                <div className="profile-summary">
                  <span className="avatar">{initials}</span>
                  <div><strong>{user?.fullName || user?.email}</strong><small>{roleLabel} • აქტიური სესია</small></div>
                </div>
                <button onClick={() => navigate("settings")}>
                  <Settings />
                  პროფილი და პარამეტრები
                </button>
                <button className="profile-logout" onClick={() => {
                  setProfileOpen(false);
                  onLogout?.();
                }} data-testid="logout-button">
                  <LogOut />
                  სისტემიდან გასვლა
                </button>
              </section>
            ) : null}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
