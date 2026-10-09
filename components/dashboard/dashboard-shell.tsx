"use client";
import { apiFetch, publicPath } from "@/lib/public-path";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/components/i18n/language-provider";

import {
  BarChart3,
  AlertTriangle,
  Bell,
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
  X,
  ChevronRight,
} from "lucide-react";
import Link from "@/components/ui/AppLink";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import Image from "@/components/ui/AppImage";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";
import { GlobalSearch } from "@/components/dashboard/global-search";

interface DashboardUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleSlug: string;
  initials: string;
  lastLoginAt: string | null;
  hasAvatar: boolean;
}

function UserAvatar({
  user,
  className,
}: {
  user: DashboardUser;
  className: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white ${className}`}
    >
      <Image
        src={
          user.hasAvatar
            ? "/api/auth/profile/avatar"
            : "/images/default-profile.png"
        }
        alt=""
        fill
        sizes="40px"
        unoptimized={user.hasAvatar}
        className="object-cover"
      />
    </div>
  );
}

interface DashboardShellProps {
  children: ReactNode;
  user: DashboardUser;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    name: "WeTransform",
    href: "/dashboard/marketplaces",
    icon: Store,
    adminOnly: true,
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingBag,
    adminOnly: true,
    children: [
      {
        name: "Order list",
        href: "/dashboard/orders",
      },
      {
        name: "Returns",
        href: "/dashboard/orders/returns",
      },
    ],
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    adminOnly: true,
    children: [
      {
        name: "Inventory table",
        href: "/dashboard/inventory",
      },
      {
        name: "Add an item",
        href: "/dashboard/inventory/add",
      },
      {
        name: "Shipping profiles",
        href: "/dashboard/inventory/shipping-profiles",
      },
      {
        name: "Merchant addresses",
        href: "/dashboard/inventory/merchant-addresses",
      },
      {
        name: "Importing your inventory",
        href: "/dashboard/inventory/import",
      },
      {
        name: "Diagnosing errors in your offers",
        href: "/dashboard/inventory/diagnostics",
      },
    ],
  },
  {
    name: "Synchronization issues",
    href: "/dashboard/synchronization-issues",
    icon: AlertTriangle,
    adminOnly: true,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    adminOnly: true,
    children: [
      {
        name: "Overview",
        href: "/dashboard/analytics",
      },
      {
        name: "WeReprice",
        href: "/dashboard/analytics/repricing",
      },
      {
        name: "Your strategies",
        href: "/dashboard/analytics/repricing/strategies",
      },
      {
        name: "Schedule your repricings",
        href: "/dashboard/analytics/repricing/schedule",
      },
    ],
  },
];

function CellexaLogo() {
  const { t } = useI18n();
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-950/30">
        <span className="text-lg font-black tracking-tight text-white">
          {t("CX")}
        </span>
        <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full bg-cyan-300/30" />
      </div>

      <div>
        <p className="text-lg font-bold tracking-tight text-white">
          {t("CelleXa")}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("Marketplace Hub")}
        </p>
      </div>
    </Link>
  );
}

type NavigationItem = (typeof navigation)[number];

function Navigation({
  pathname,
  onNavigate,
  roleSlug,
}: {
  pathname: string;
  onNavigate?: () => void;
  roleSlug: string;
}) {
  const { t } = useI18n();
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navigation
      .filter(
        (item) =>
          item.children &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`)),
      )
      .map((item) => item.href),
  );

  function toggleItem(href: string) {
    setExpandedItems((current) =>
      current.includes(href)
        ? current.filter((item) => item !== href)
        : [...current, href],
    );
  }

  function getActiveChild(item: NavigationItem) {
    if (!item.children) {
      return undefined;
    }

    return item.children
      .filter(
        (child) =>
          pathname === child.href || pathname.startsWith(`${child.href}/`),
      )
      .sort((first, second) => second.href.length - first.href.length)[0];
  }

  return (
    <nav aria-label={t("Dashboard navigation")} className="space-y-1.5">
      <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        {t("Workspace")}
      </p>

      {navigation
        .filter(
          (item) =>
            !("adminOnly" in item && item.adminOnly) ||
            roleSlug === "admin" ||
            roleSlug === "super_admin",
        )
        .map((item) => {
          const Icon = item.icon;
          const hasChildren = Boolean(item.children?.length);

          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const isExpanded = expandedItems.includes(item.href);

          const activeChild = getActiveChild(item);

          if (hasChildren) {
            const submenuId = `submenu-${item.name
              .toLowerCase()
              .replace(/\s+/g, "-")}`;

            return (
              <div key={item.href}>
                <div
                  className={`group flex w-full items-center rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-white" />
                    <span className="flex-1">{t(item.name)}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={t(item.name)}
                    aria-expanded={isExpanded}
                    aria-controls={submenuId}
                    onClick={() => toggleItem(item.href)}
                    className="rounded-xl p-3 hover:bg-white/10"
                  >
                    <ChevronRight
                      className={`h-4 w-4 text-white transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                </div>

                <div
                  id={submenuId}
                  className={`grid transition-all duration-200 ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="relative ml-5 mt-1 space-y-1 border-l border-slate-800 pb-1 pl-5">
                      {item.children?.map((child) => {
                        const isChildActive = activeChild?.href === child.href;

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={isChildActive ? "page" : undefined}
                            className={`relative flex items-center rounded-lg px-3 py-2 text-sm transition ${
                              isChildActive
                                ? "bg-blue-600 font-semibold text-white"
                                : "text-white hover:bg-white/[0.08]"
                            }`}
                          >
                            <span
                              className={`absolute -left-[23px] h-2 w-2 rounded-full ring-4 ring-slate-950 ${
                                isChildActive ? "bg-blue-500" : "bg-white"
                              }`}
                            />

                            {t(child.name)}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-white hover:bg-white/[0.08]"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-white" : "text-white"}`}
              />

              <span>{t(item.name)}</span>
            </Link>
          );
        })}
    </nav>
  );
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const { t } = useI18n();
  const pathname = usePathname().replace(/\/$/, "");

  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function signOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSigningOut) return;
    setIsSigningOut(true);
    setLogoutError("");
    try {
      const response = await apiFetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error("Unable to sign out. Please try again.");
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
      setIsSigningOut(false);
    }
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closePopups(event: PointerEvent) {
      const target = event.target as Node;
      if (!notificationRef.current?.contains(target))
        setIsNotificationsOpen(false);
      if (!profileRef.current?.contains(target)) setIsProfileOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("pointerdown", closePopups);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closePopups);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isSigningOut && <FullScreenTransition />}
      {}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-slate-950 lg:flex">
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <CellexaLogo />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Navigation pathname={pathname} roleSlug={user.roleSlug} />
        </div>

        <div className="border-t border-white/10 p-4">
          {(user.roleSlug === "admin" || user.roleSlug === "super_admin") && (
            <Link
              href="/dashboard/settings"
              className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] ${pathname.startsWith("/dashboard/settings") ? "bg-blue-600" : ""}`}
            >
              <Settings className="h-5 w-5 text-white" />
              {t("Settings")}
            </Link>
          )}

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
          >
            <UserAvatar
              user={user}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user.name}
              </p>

              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </Link>
        </div>
      </aside>

      {}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("Close navigation")}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="relative flex h-full w-[280px] flex-col bg-slate-950 shadow-2xl">
            <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
              <CellexaLogo />

              <button
                type="button"
                aria-label={t("Close menu")}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
              <Navigation
                pathname={pathname}
                roleSlug={user.roleSlug}
                onNavigate={() => setIsMobileMenuOpen(false)}
              />
            </div>

            <div className="border-t border-white/10 p-4">
              {(user.roleSlug === "admin" ||
                user.roleSlug === "super_admin") && (
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white ${pathname.startsWith("/dashboard/settings") ? "bg-blue-600" : "hover:bg-white/[0.08]"}`}
                >
                  <Settings className="h-5 w-5 text-white" />
                  {t("Settings")}
                </Link>
              )}
              <Link
                href="/dashboard/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-3"
              >
                <UserAvatar
                  user={user}
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
              </Link>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label={t("Open navigation")}
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden max-w-md flex-1 md:block">
              {(user.roleSlug === "admin" ||
                user.roleSlug === "super_admin") && <GlobalSearch />}
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              {}
              <div ref={notificationRef} className="relative">
                <button
                  type="button"
                  aria-label={t("Notifications")}
                  aria-expanded={isNotificationsOpen}
                  onClick={() => {
                    setIsNotificationsOpen((current) => !current);
                    setIsProfileOpen(false);
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Bell className="h-5 w-5" />

                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>

                <div
                  aria-hidden={!isNotificationsOpen}
                  className={`absolute right-0 top-12 w-80 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-all duration-200 ease-out ${isNotificationsOpen ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-2 scale-95 opacity-0"}`}
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {t("Notifications")}
                    </p>
                  </div>

                  <div className="p-5 text-center">
                    <Bell className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {t("You’re all caught up")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("New notifications will appear here.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden h-8 w-px bg-slate-200 sm:block" />

              {}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  aria-label={t("Open profile menu")}
                  aria-expanded={isProfileOpen}
                  onClick={() => {
                    setIsProfileOpen((current) => !current);
                    setIsNotificationsOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-50"
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-slate-800">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500">{user.role}</p>
                  </div>

                  <UserAvatar
                    user={user}
                    className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
                  />

                  <ChevronDown
                    className={`hidden h-4 w-4 text-slate-400 transition sm:block ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  aria-hidden={!isProfileOpen}
                  className={`absolute right-0 top-14 w-64 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-all duration-200 ease-out ${isProfileOpen ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-2 scale-95 opacity-0"}`}
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <CircleUserRound className="h-4.5 w-4.5 text-slate-400" />
                      {t("My profile")}
                    </Link>

                    {(user.roleSlug === "admin" ||
                      user.roleSlug === "super_admin") && (
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <Settings className="h-4.5 w-4.5 text-slate-400" />
                        {t("Settings")}
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <form
                      action={publicPath("/api/auth/logout")}
                      method="POST"
                      onSubmit={signOut}
                    >
                      {logoutError && (
                        <p role="alert" className="p-2 text-xs text-red-600">
                          {logoutError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={isSigningOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-4.5 w-4.5" />
                        {t(isSigningOut ? "Signing out..." : "Sign out")}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)]">{children}</main>
      </div>
    </div>
  );
}
