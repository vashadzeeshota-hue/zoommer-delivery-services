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
  Store,
  Sun,
  Truck,
  Users,
  X,
} from "lucide-react";

const initialNotifications = [
  { id: 1, title: "რეგისტრაცია რიგშია", detail: "QuickShipper • 1 ახალი job" },
  { id: 2, title: "მიწოდების შეფერხება", detail: "ZMG-DEMO-0127 • რუსთავი" },
  { id: 3, title: "სინქრონიზაცია დასრულდა", detail: "Zoommer.ge • რამდენიმე წუთის წინ" },
];

export const navigationGroups = [
  {
    id: "ecommerce-deliveries",
    label: "იქომერს მიწოდებები",
    items: [
      { route: "today", label: "დღის ორდერები", icon: LayoutDashboard },
      { route: "orders", label: "შეკვეთები", icon: ClipboardList },
      { route: "registrations", label: "რეგისტრაციები", icon: PackageCheck },
      { route: "printing", label: "ბეჭდვა", icon: Printer },
      { route: "couriers", label: "კურიერები", icon: Users },
      { route: "partners", label: "პარტნიორები", icon: Handshake },
      { route: "map", label: "რუკა", icon: Map },
      { route: "reports", label: "ანგარიშები", icon: BarChart3 },
      { route: "exceptions", label: "გამონაკლისები", icon: AlertTriangle },
    ],
  },
  {
    id: "branch-deliveries",
    label: "ფილიალის მიწოდებები",
    branchOnly: true,
    items: [
      { route: "branch-deliveries", label: "მიწოდებების სია", icon: Truck, branchOnly: true },
    ],
  },
  {
    id: "branch-pickups",
    label: "გაცემები ფილიალებიდან",
    branchOnly: true,
    items: [
      { route: "branch-pickups", label: "გაცემების სია", icon: Store, branchOnly: true },
    ],
  },
];

const utilityNavigation = [
  { route: "settings", label: "პარამეტრები", icon: Settings },
];

export const navigation = [
  ...navigationGroups.flatMap((group) => group.items),
  ...utilityNavigation,
];

function NavigationItem({ item, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <button
      className={active ? "active" : ""}
      onClick={() => onNavigate(item.route)}
      aria-label={item.label}
      title={item.label}
    >
      <Icon />
      <span>{item.label}</span>
    </button>
  );
}

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
          {navigationGroups
            .filter((group) => !group.branchOnly || user?.branchAccess)
            .map((group) => {
              const items = group.items.filter((item) => !item.branchOnly || user?.branchAccess);
              if (!items.length) return null;
              return (
                <section className="nav-group" aria-labelledby={`nav-group-${group.id}`} key={group.id}>
                  <span className="nav-group-label" id={`nav-group-${group.id}`}>{group.label}</span>
                  {items.map((item) => (
                    <NavigationItem
                      key={item.route}
                      item={item}
                      active={route === item.route}
                      onNavigate={navigate}
                    />
                  ))}
                </section>
              );
            })}
          <div className="nav-utility">
            {utilityNavigation.map((item) => (
              <NavigationItem
                key={item.route}
                item={item}
                active={route === item.route}
                onNavigate={navigate}
              />
            ))}
          </div>
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
