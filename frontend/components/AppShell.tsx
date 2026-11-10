"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar, { NAV_ITEMS, useActiveNav } from "@/components/Sidebar";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import { Menu, ChevronRight, LogIn } from "lucide-react";
import { getMe, User } from "@/lib/api";
import { formatDisplayName, initials, PROFILE_UPDATED_EVENT } from "@/lib/userDisplay";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AppShellProps {
  children: React.ReactNode;
  activeFolderId?: number;
  activeDecisionId?: number;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onRefresh?: () => void;
  maxWidthClass?: string;
}

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/dashboard": "Decisions",
  "/profile": "Profile & settings",
};

/** Bottom tab bar for phones – the four primary destinations, always one tap away. */
function MobileTabBarInner() {
  const active = useActiveNav();
  return <MobileTabBarList active={active} />;
}

function MobileTabBarList({ active }: { active: ReturnType<typeof useActiveNav> }) {
  const short: Record<string, string> = {
    overview: "Overview",
    workspaces: "Workspaces",
    ledger: "Ledger",
    profile: "Profile",
  };
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ key, href, Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 h-16 text-[13px] font-medium transition-colors ${
                isActive ? "text-accent" : "text-ink-3 hover:text-ink"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span>{short[key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileTabBar() {
  return (
    <Suspense fallback={<MobileTabBarList active={null} />}>
      <MobileTabBarInner />
    </Suspense>
  );
}

export default function AppShell({
  children,
  activeFolderId,
  activeDecisionId,
  breadcrumbs,
  actions,
  onRefresh,
  maxWidthClass = "max-w-[1200px]",
}: AppShellProps) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [, setNameTick] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("decisionlens_sidebar_collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("decisionlens_sidebar_collapsed", String(next));
    } catch {
      // Ignore
    }
  };

  const loadUser = useCallback(async () => {
    try {
      setUser(await getMe());
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onProfile = () => {
      setNameTick((n) => n + 1);
      loadUser();
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfile);
  }, [loadUser]);

  const pageTitle =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/folders") ? "Workspace" : pathname.startsWith("/decisions") ? "Decision" : "DecisionLens");

  const crumbs: BreadcrumbItem[] =
    breadcrumbs && breadcrumbs.length > 0 ? breadcrumbs : [{ label: pageTitle }];

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col antialiased font-ui">
      <Sidebar
        activeFolderId={activeFolderId}
        activeDecisionId={activeDecisionId}
        onRefresh={() => {
          loadUser();
          onRefresh?.();
        }}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        showMobileHeader={false}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[272px]"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-page/90 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 -ml-1 text-ink-2 hover:text-ink hover:bg-subtle rounded-[10px] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[16px] text-ink-2 min-w-0">
              {crumbs.map((crumb, idx) => {
                const last = idx === crumbs.length - 1;
                return (
                  <div key={idx} className={`flex items-center gap-1.5 min-w-0 ${last ? "" : "hidden sm:flex"}`}>
                    {idx > 0 && <ChevronRight className="w-4 h-4 text-ink-3 shrink-0 hidden sm:block" />}
                    {crumb.href && !last ? (
                      <Link href={crumb.href} className="hover:text-ink truncate max-w-[220px] transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-ink font-semibold truncate max-w-[60vw] sm:max-w-[360px]">{crumb.label}</span>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <ThemeToggleButton />

            {loadingUser ? (
              <div className="w-10 h-10 rounded-full bg-subtle animate-pulse" />
            ) : user ? (
              <Link
                href="/profile"
                className="flex items-center gap-2.5 pl-1 pr-1 sm:pr-3 h-11 rounded-full hover:bg-subtle transition-colors"
                title="Profile & settings"
              >
                <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 font-semibold text-[14px] flex items-center justify-center shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(user.display_name, user.email)
                  )}
                </div>
                <span className="hidden sm:inline text-[15px] font-medium text-ink">
                  {formatDisplayName(user.display_name, user.email)}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 h-11 px-4 text-[15px] font-semibold text-on-ink bg-ink hover:bg-ink-hover rounded-[10px] transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </header>

        <main
          className={`flex-1 w-full mx-auto px-4 sm:px-8 lg:px-10 pt-6 sm:pt-10 pb-28 lg:pb-14 ${maxWidthClass}`}
        >
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
