"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  FileText,
  User as UserIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  LogOut,
  LogIn,
  X,
} from "lucide-react";
import {
  getFolders,
  getDecisions,
  createFolder,
  createDecision,
  getMe,
  clearStoredToken,
  Folder,
  Decision,
  User,
} from "@/lib/api";
import { formatDisplayName, initials, PROFILE_UPDATED_EVENT } from "@/lib/userDisplay";
import { ThemeToggleButton, useTheme } from "@/components/ThemeProvider";

export { formatDisplayName };

export const SIDEBAR_WIDTH = 272;

interface SidebarProps {
  activeFolderId?: number;
  activeDecisionId?: number;
  onRefresh?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  showMobileHeader?: boolean;
}

type NavKey = "overview" | "workspaces" | "ledger" | "profile";

export const NAV_ITEMS: {
  key: NavKey;
  label: string;
  href: string;
  Icon: typeof LayoutDashboard;
}[] = [
  { key: "overview", label: "Overview", href: "/overview", Icon: LayoutDashboard },
  { key: "workspaces", label: "Workspaces", href: "/dashboard?view=workspaces", Icon: FolderOpen },
  { key: "ledger", label: "Decision ledger", href: "/dashboard?view=ledger", Icon: FileText },
  { key: "profile", label: "Profile & settings", href: "/profile", Icon: UserIcon },
];

/** Resolve which primary section the current URL belongs to. */
export function useActiveNav(): NavKey | null {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname === "/overview") return "overview";
  if (pathname === "/profile") return "profile";
  if (pathname.startsWith("/folders")) return "workspaces";
  if (pathname.startsWith("/decisions")) return "ledger";
  if (pathname === "/dashboard") {
    return params.get("view") === "workspaces" ? "workspaces" : "ledger";
  }
  return null;
}

function PrimaryNavInner({ collapsed }: { collapsed: boolean }) {
  const active = useActiveNav();
  return <PrimaryNavList collapsed={collapsed} active={active} />;
}

function PrimaryNavList({ collapsed, active }: { collapsed: boolean; active: NavKey | null }) {
  return (
    <nav className="space-y-1" aria-label="Main">
      {NAV_ITEMS.map(({ key, label, href, Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            title={label}
            className={`group flex items-center gap-3 h-11 rounded-[10px] text-[16px] transition-colors ${
              collapsed ? "justify-center px-0" : "px-3"
            } ${
              isActive
                ? "bg-surface text-ink font-semibold shadow-soft border border-line"
                : "text-ink-2 hover:text-ink hover:bg-surface/70 border border-transparent"
            }`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"}`} />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function PrimaryNav({ collapsed }: { collapsed: boolean }) {
  return (
    <Suspense fallback={<PrimaryNavList collapsed={collapsed} active={null} />}>
      <PrimaryNavInner collapsed={collapsed} />
    </Suspense>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 mb-1.5">
      <span className="text-[13px] font-semibold text-ink-3 uppercase tracking-[0.06em]">{children}</span>
      {action}
    </div>
  );
}

export default function Sidebar({
  activeFolderId,
  activeDecisionId,
  onRefresh,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  mobileOpen: controlledMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [, setNameTick] = useState(0);

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const collapsedRaw = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const mobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  // Never show the collapsed rail inside the mobile drawer
  const collapsed = collapsedRaw && !mobileOpen;

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewDecisionModal, setShowNewDecisionModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newDecisionTitle, setNewDecisionTitle] = useState("");
  const [newDecisionFolderId, setNewDecisionFolderId] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (controlledCollapsed === undefined) {
      try {
        const saved = localStorage.getItem("decisionlens_sidebar_collapsed");
        if (saved !== null) setInternalCollapsed(saved === "true");
      } catch {
        // Ignore storage errors
      }
    }
  }, [controlledCollapsed]);

  const toggleCollapsed = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      try {
        localStorage.setItem("decisionlens_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
    }
  };

  const closeMobile = useCallback(() => {
    if (onCloseMobile) onCloseMobile();
    else setInternalMobileOpen(false);
  }, [onCloseMobile]);

  const loadSidebarData = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
      if (u) {
        const [folderList, decisionList] = await Promise.all([
          getFolders().catch(() => []),
          getDecisions().catch(() => []),
        ]);
        setFolders(folderList);
        setDecisions(decisionList);
        if (folderList.length > 0) {
          setNewDecisionFolderId((prev) => (prev === "" ? folderList[0].id : prev));
        }
      } else {
        setFolders([]);
        setDecisions([]);
      }
    } catch {
      setUser(null);
      setFolders([]);
      setDecisions([]);
    }
  }, []);

  useEffect(() => {
    loadSidebarData();
  }, [loadSidebarData]);

  // Refresh name when it is edited in Profile & settings
  useEffect(() => {
    const onProfile = () => {
      setNameTick((n) => n + 1);
      loadSidebarData();
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfile);
  }, [loadSidebarData]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Close drawer with Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMobile();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
    router.push("/auth");
  };

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [folders, searchQuery]);

  const recentDecisions = useMemo(() => {
    const sorted = [...decisions].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    if (!searchQuery.trim()) return sorted.slice(0, 5);
    return sorted
      .filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5);
  }, [decisions, searchQuery]);

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      const created = await createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
      });
      setShowNewFolderModal(false);
      setNewFolderName("");
      setNewFolderDesc("");
      await loadSidebarData();
      onRefresh?.();
      router.push(`/folders/${created.id}`);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecisionTitle.trim()) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      let targetFolderId = newDecisionFolderId;
      if (!targetFolderId && folders.length > 0) targetFolderId = folders[0].id;
      if (!targetFolderId) {
        const defaultFolder = await createFolder({
          name: "General Decisions",
          description: "Primary workspace",
        });
        targetFolderId = defaultFolder.id;
      }

      const created = await createDecision({
        folder_id: Number(targetFolderId),
        title: newDecisionTitle.trim(),
        status: "evaluating",
        record_type: "decision",
      });

      setShowNewDecisionModal(false);
      setNewDecisionTitle("");
      await loadSidebarData();
      onRefresh?.();
      router.push(`/decisions/${created.id}`);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 text-[16px] bg-surface border border-line rounded-[10px] text-ink placeholder-ink-3 focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none transition";
  const labelCls = "block text-[15px] font-medium text-ink mb-2";

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
          aria-hidden
        />
      )}

      <aside
        aria-label="Sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-subtle border-r border-line text-ink transition-all duration-200 ease-in-out font-ui ${
          collapsed ? "w-[76px]" : "w-[288px] lg:w-[272px]"
        } ${mobileOpen ? "translate-x-0 shadow-soft-lg" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header: Logo + collapse */}
        <div className={`h-16 border-b border-line flex items-center shrink-0 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <Link href="/overview" className="flex items-center gap-3 overflow-hidden" title="DecisionLens overview">
            <div className="w-9 h-9 rounded-[10px] bg-ink text-on-ink flex items-center justify-center font-bold text-[14px] tracking-tight shrink-0">
              DL
            </div>
            {!collapsed && (
              <span className="font-semibold text-[18px] tracking-tight text-ink">DecisionLens</span>
            )}
          </Link>

          {!collapsed && (
            <>
              <button
                onClick={toggleCollapsed}
                className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-[8px] text-ink-3 hover:text-ink hover:bg-surface transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={closeMobile}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[8px] text-ink-2 hover:text-ink hover:bg-surface transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Primary action */}
        <div className={`border-b border-line shrink-0 ${collapsed ? "p-3" : "p-4"}`}>
          {collapsed ? (
            <button
              onClick={() => setShowNewDecisionModal(true)}
              className="w-12 h-12 mx-auto rounded-[12px] bg-ink text-on-ink hover:bg-ink-hover flex items-center justify-center transition-colors"
              title="New decision"
              aria-label="New decision"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setShowNewDecisionModal(true)}
              className="w-full h-12 px-4 rounded-[12px] bg-ink text-on-ink hover:bg-ink-hover font-semibold text-[16px] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              <Plus className="w-5 h-5" />
              <span>New decision</span>
            </button>
          )}
        </div>

        {/* Scrollable navigation */}
        <div className={`flex-1 overflow-y-auto py-4 space-y-6 ${collapsed ? "px-3" : "px-3"}`}>
          <PrimaryNav collapsed={collapsed} />

          {collapsed && (
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex w-full items-center justify-center h-11 rounded-[10px] text-ink-3 hover:text-ink hover:bg-surface transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {!collapsed && user && (
            <>
              {/* Search */}
              <div className="relative px-0.5">
                <Search className="w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workspaces & decisions"
                  aria-label="Search workspaces and decisions"
                  className="w-full h-11 bg-surface border border-line rounded-[10px] text-[15px] text-ink placeholder-ink-3 pl-10 pr-3 focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none transition"
                />
              </div>

              {/* Workspaces */}
              <div>
                <SectionLabel
                  action={
                    <button
                      type="button"
                      onClick={() => setShowNewFolderModal(true)}
                      className="inline-flex items-center gap-1 h-8 px-2 rounded-[8px] text-[14px] font-medium text-ink-2 hover:text-ink hover:bg-surface transition-colors"
                      title="New workspace"
                    >
                      <Plus className="w-4 h-4" />
                      New
                    </button>
                  }
                >
                  Workspaces
                </SectionLabel>
                <div className="space-y-0.5">
                  {filteredFolders.length === 0 ? (
                    <p className="text-[15px] text-ink-3 px-3 py-2">
                      {searchQuery ? "No matching workspaces" : "No workspaces yet"}
                    </p>
                  ) : (
                    filteredFolders.map((f) => {
                      const isActive = activeFolderId === f.id || pathname === `/folders/${f.id}`;
                      return (
                        <Link
                          key={f.id}
                          href={`/folders/${f.id}`}
                          className={`flex items-center gap-3 h-10 px-3 rounded-[10px] text-[15px] transition-colors ${
                            isActive
                              ? "bg-surface text-ink font-medium border border-line"
                              : "text-ink-2 hover:text-ink hover:bg-surface/70 border border-transparent"
                          }`}
                        >
                          <FolderIcon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-accent" : "text-ink-3"}`} />
                          <span className="truncate">{f.name}</span>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent decisions */}
              <div>
                <SectionLabel>Recent decisions</SectionLabel>
                <div className="space-y-0.5">
                  {recentDecisions.length === 0 ? (
                    <p className="text-[15px] text-ink-3 px-3 py-2">
                      {searchQuery ? "No matching decisions" : "No recent decisions"}
                    </p>
                  ) : (
                    recentDecisions.map((d) => {
                      const isActive = activeDecisionId === d.id || pathname === `/decisions/${d.id}`;
                      return (
                        <Link
                          key={d.id}
                          href={`/decisions/${d.id}`}
                          title={d.title}
                          className={`flex items-center gap-3 h-10 px-3 rounded-[10px] text-[15px] transition-colors ${
                            isActive
                              ? "bg-surface text-ink font-medium border border-line"
                              : "text-ink-2 hover:text-ink hover:bg-surface/70 border border-transparent"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-accent" : "bg-ink-3/60"}`} />
                          <span className="truncate">{d.title}</span>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer: account + theme */}
        <div className={`border-t border-line shrink-0 ${collapsed ? "p-3 space-y-2" : "p-3"}`}>
          {user ? (
            collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <ThemeToggleButton />
                <Link
                  href="/profile"
                  className="w-10 h-10 rounded-full bg-accent-100 text-accent-700 font-semibold text-[14px] flex items-center justify-center overflow-hidden"
                  title={formatDisplayName(user.display_name, user.email)}
                >
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(user.display_name, user.email)
                  )}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 min-w-0 flex-1 p-2 rounded-[10px] hover:bg-surface transition-colors"
                  title="Profile & settings"
                >
                  <div className="w-10 h-10 rounded-full bg-accent-100 text-accent-700 font-semibold text-[14px] flex items-center justify-center shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials(user.display_name, user.email)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink truncate leading-tight">
                      {formatDisplayName(user.display_name, user.email)}
                    </p>
                    <p className="text-[13px] text-ink-3 truncate leading-tight mt-1">{user.email}</p>
                  </div>
                </Link>
                <ThemeToggleButton />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center w-10 h-10 text-ink-3 hover:text-red-600 hover:bg-surface rounded-[8px] transition-colors shrink-0"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )
          ) : collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <ThemeToggleButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth"
                className="flex-1 h-11 px-4 rounded-[10px] bg-ink text-on-ink hover:bg-ink-hover text-[16px] font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                <span>Sign in</span>
              </Link>
              <ThemeToggleButton />
            </div>
          )}
          <span className="sr-only">Current theme: {resolvedTheme}</span>
        </div>
      </aside>

      {/* Modal: New Workspace */}
      {showNewFolderModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 font-ui"
          onClick={(e) => e.target === e.currentTarget && setShowNewFolderModal(false)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="new-ws-title" className="bg-surface rounded-t-[16px] sm:rounded-[16px] border border-line max-w-lg w-full p-6 sm:p-7 shadow-soft-lg animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 id="new-ws-title" className="text-[22px] font-semibold text-ink">New workspace</h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-ink-3 hover:text-ink hover:bg-subtle rounded-[8px]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-[15px]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateNewFolder} className="space-y-5">
              <div>
                <label className={labelCls} htmlFor="ws-name">Workspace name</label>
                <input
                  id="ws-name"
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Product Strategy"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ws-desc">
                  Description <span className="text-ink-3 font-normal">(optional)</span>
                </label>
                <textarea
                  id="ws-desc"
                  rows={3}
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="What kind of decisions live here?"
                  className={inputCls}
                />
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="h-12 px-5 text-[16px] font-medium text-ink-2 hover:text-ink border border-line hover:bg-subtle rounded-[10px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-6 bg-ink hover:bg-ink-hover text-on-ink text-[16px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Creating…" : "Create workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Decision */}
      {showNewDecisionModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 font-ui"
          onClick={(e) => e.target === e.currentTarget && setShowNewDecisionModal(false)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="new-dec-title" className="bg-surface rounded-t-[16px] sm:rounded-[16px] border border-line max-w-lg w-full p-6 sm:p-7 shadow-soft-lg animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 id="new-dec-title" className="text-[22px] font-semibold text-ink">New decision</h3>
              <button
                type="button"
                onClick={() => setShowNewDecisionModal(false)}
                className="text-ink-3 hover:text-ink hover:bg-subtle rounded-[8px]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-[15px]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateNewDecision} className="space-y-5">
              <div>
                <label className={labelCls} htmlFor="dec-ws">Workspace</label>
                <select
                  id="dec-ws"
                  value={newDecisionFolderId}
                  onChange={(e) => setNewDecisionFolderId(Number(e.target.value))}
                  className={inputCls}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  {folders.length === 0 && <option value="">General Decisions (created automatically)</option>}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="dec-title">What decision are you weighing?</label>
                <textarea
                  id="dec-title"
                  rows={3}
                  required
                  autoFocus
                  value={newDecisionTitle}
                  onChange={(e) => setNewDecisionTitle(e.target.value)}
                  placeholder="e.g. Should we enter a new regional market this year?"
                  className={inputCls}
                />
              </div>
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewDecisionModal(false)}
                  className="h-12 px-5 text-[16px] font-medium text-ink-2 hover:text-ink border border-line hover:bg-subtle rounded-[10px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-6 bg-ink hover:bg-ink-hover text-on-ink text-[16px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Starting…" : "Start decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
