import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  Navigation,
  PackageCheck,
  PackageOpen,
  PlusCircle,
  Printer,
  Search,
  Settings,
  ShoppingBag,
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
    label: "Zoommer.ge",
    icon: ShoppingBag,
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
    icon: Truck,
    branchOnly: true,
    items: [
      { route: "branch-deliveries", label: "მიწოდებების სია", icon: Truck, branchOnly: true },
      { route: "branch-deliveries-new", label: "ახალი მიწოდება", icon: PlusCircle, branchOnly: true },
      { route: "branch-deliveries-ready", label: "მზადაა გასაგზავნად", icon: PackageCheck, branchOnly: true },
      { route: "branch-deliveries-in-transit", label: "გზაშია", icon: Navigation, branchOnly: true },
      { route: "branch-deliveries-delivered", label: "მიწოდებულია", icon: CheckCircle2, branchOnly: true },
    ],
  },
  {
    id: "branch-pickups",
    label: "გაცემები ფილიალებიდან",
    icon: Store,
    branchOnly: true,
    items: [
      { route: "branch-pickups", label: "გაცემების სია", icon: Store, branchOnly: true },
      { route: "branch-pickups-new", label: "ახალი გაცემა", icon: PlusCircle, branchOnly: true },
      { route: "branch-pickups-ready", label: "მზადაა გასაცემად", icon: PackageOpen, branchOnly: true },
      { route: "branch-pickups-issued", label: "გაცემულია", icon: CheckCircle2, branchOnly: true },
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

function NavigationItem({ item, active, onNavigate, subitem = false }) {
  const Icon = item.icon;
  return (
    <button
      className={`${active ? "active" : ""} ${subitem ? "nav-subitem" : ""}`.trim()}
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
  const activeGroupId = navigationGroups.find((group) =>
    group.items.some((item) => item.route === route),
  )?.id;
  const [expandedGroups, setExpandedGroups] = useState(() =>
    new Set(activeGroupId ? [activeGroupId] : []),
  );

  useEffect(() => {
    if (!activeGroupId) return;
    setExpandedGroups((current) => {
      if (current.has(activeGroupId)) return current;
      const next = new Set(current);
      next.add(activeGroupId);
      return next;
    });
  }, [activeGroupId]);
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

  function toggleGroup(groupId) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
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
              const GroupIcon = group.icon;
              const expanded = expandedGroups.has(group.id);
              const containsActive = items.some((item) => item.route === route);
              return (
                <section className="nav-group" aria-label={group.label} key={group.id}>
                  <button
                    type="button"
                    className={`nav-group-toggle ${expanded ? "expanded" : ""} ${containsActive ? "group-active" : ""}`.trim()}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={expanded}
                    aria-controls={`nav-group-items-${group.id}`}
                    title={group.label}
                  >
                    <GroupIcon />
                    <span>{group.label}</span>
                    <ChevronDown className="nav-group-chevron" />
                  </button>
                  {expanded ? (
                    <div className="nav-group-items" id={`nav-group-items-${group.id}`}>
                      {items.map((item) => (
                        <NavigationItem
                          key={item.route}
                          item={item}
                          active={route === item.route}
                          onNavigate={navigate}
                          subitem
                        />
                      ))}
                    </div>
                  ) : null}
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
