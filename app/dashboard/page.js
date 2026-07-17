"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Lock,
  Unlock,
  Clock,
  ChevronRight,
  Search,
  LogOut,
  Cake,
  Heart,
  GraduationCap,
  Mail,
  Sparkles,
  Package,
  Home,
  User,
} from "lucide-react";
import { getSession, logOut } from "../lib/auth";
import { getCapsules, getEffectiveStatus } from "../lib/storage";
import styles from "./dashboard.module.css";

const OCCASION_ICONS = {
  birthday: Cake,
  anniversary: Heart,
  graduation: GraduationCap,
  love: Mail,
  "just-because": Sparkles,
  custom: Package,
};

const STATUS_LABELS = {
  sealed: "Sealed",
  unlockable: "Ready to Open",
  soon: "Unlocking Soon",
  opened: "Opened",
};

export default function DashboardPage() {
  const [capsules, setCapsules] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session);
      await loadCapsules();
      setIsLoaded(true);
    })();

    // Refresh every minute to update countdowns
    const interval = setInterval(loadCapsules, 60000);
    return () => clearInterval(interval);
  }, [router]);

  async function loadCapsules() {
    try {
      const caps = await getCapsules();
      setCapsules(caps);
    } catch {
      setCapsules([]);
    }
  }

  function getRelativeTime(dateStr) {
    const now = new Date();
    const target = new Date(dateStr);
    const diff = target - now;
    const absDiff = Math.abs(diff);
    const isPast = diff < 0;

    if (absDiff < 60 * 60 * 1000) {
      const mins = Math.floor(absDiff / (60 * 1000));
      return isPast ? `${mins}m ago` : `in ${mins}m`;
    }
    if (absDiff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(absDiff / (60 * 60 * 1000));
      return isPast ? `${hours}h ago` : `in ${hours}h`;
    }
    const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
    if (days < 30) return isPast ? `${days}d ago` : `in ${days} day${days > 1 ? "s" : ""}`;
    const months = Math.floor(days / 30);
    if (months < 12) return isPast ? `${months}mo ago` : `in ${months} month${months > 1 ? "s" : ""}`;
    const years = Math.floor(days / 365);
    return isPast ? `${years}y ago` : `in ${years} year${years > 1 ? "s" : ""}`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  // Filter and search
  let filtered = capsules;
  if (filter !== "all") {
    filtered = capsules.filter((c) => {
      const st = getEffectiveStatus(c);
      if (filter === "sealed") return st === "sealed" || st === "soon" || st === "unlockable";
      return st === filter;
    });
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(q));
  }

  // Sort
  const statusOrder = { unlockable: 0, soon: 1, sealed: 2, opened: 3 };
  filtered.sort((a, b) => {
    const sa = getEffectiveStatus(a);
    const sb = getEffectiveStatus(b);
    return (statusOrder[sa] || 0) - (statusOrder[sb] || 0);
  });

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };

  if (!isLoaded) return null;

  return (
    <div className={styles.page}>
      {/* ── Mobile Top Bar ── */}
      <header className={styles.mobileTopBar}>
        <Link href="/dashboard" className={styles.mobileTopBarLogo}>
          <div className={styles.logoIcon}>
            <img src="/logo.png" alt="MemoryVault" width={22} height={22} style={{ display: 'block' }} />
          </div>
          <span className={styles.logoText}>MemoryVault</span>
        </Link>
        <div className={styles.mobileTopBarRight}>
          <button
            className={styles.mobileTopBarAvatar}
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Toggle profile menu"
          >
            {user?.name ? user.name[0].toUpperCase() : "U"}
          </button>
          {profileOpen && (
            <div className={styles.mobileProfileDropdown}>
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownName}>{user?.name || "User"}</p>
                <p className={styles.dropdownEmail}>{user?.email || "No email"}</p>
              </div>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLogout}>
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="MemoryVault" width={22} height={22} style={{ display: 'block' }} />
            </div>
            <span className={styles.logoText}>MemoryVault</span>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`}>
            <Package size={18} />
            <span>My Capsules</span>
          </Link>
          <Link href="/create" className={styles.sidebarLink}>
            <Plus size={18} />
            <span>Create New</span>
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Your Time Capsules</h1>
            <p className={styles.subtitle}>
              {capsules.length} capsule{capsules.length !== 1 ? "s" : ""} in your vault
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/create" className={styles.createBtn}>
              <Plus size={18} />
              Create Capsule
            </Link>

            <div className={styles.profileContainer}>
              <button
                className={styles.profileBadge}
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Toggle profile menu"
              >
                <div className={styles.avatar}>
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className={styles.profileName}>{user?.name || "User"}</span>
              </button>

              {profileOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownName}>{user?.name || "User"}</p>
                    <p className={styles.dropdownEmail}>{user?.email || "No email available"}</p>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Total Capsules</span>
            <span className={styles.statsValue}>{capsules.length}</span>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Sealed</span>
            <span className={styles.statsValue}>
              {capsules.filter(c => {
                const st = getEffectiveStatus(c);
                return st === "sealed" || st === "soon";
              }).length}
            </span>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Ready to Open</span>
            <span className={styles.statsValue}>
              {capsules.filter(c => getEffectiveStatus(c) === "unlockable").length}
            </span>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Opened</span>
            <span className={styles.statsValue}>
              {capsules.filter(c => getEffectiveStatus(c) === "opened").length}
            </span>
          </div>
        </div>

        {/* Filters + Search */}
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            {["all", "sealed", "opened"].map((f) => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search capsules..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Capsule List */}
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Package size={40} strokeWidth={1.2} />
            </div>
            <h3 className={styles.emptyTitle}>
              {capsules.length === 0 ? "No capsules yet" : "No matching capsules"}
            </h3>
            <p className={styles.emptyText}>
              {capsules.length === 0
                ? "Create your first time capsule and preserve a memory for the future."
                : "Try adjusting your search or filter."}
            </p>
            {capsules.length === 0 && (
              <Link href="/create" className={styles.emptyCta}>
                <Plus size={18} />
                Create a Capsule
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((capsule, i) => {
              const status = getEffectiveStatus(capsule);
              const OccasionIcon = OCCASION_ICONS[capsule.occasion] || Package;
              return (
                <Link
                  href={`/capsule/${capsule.id}`}
                  key={capsule.id}
                  className={`${styles.card} ${styles[`card_${status}`]}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`${styles.cardIcon} ${styles[`cardIcon_${status}`]}`}>
                    <OccasionIcon size={20} strokeWidth={1.8} />
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{capsule.title}</h3>
                    <div className={styles.cardMeta}>
                      <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>
                        <span className={styles.badgeDot} />
                        {STATUS_LABELS[status]}
                      </span>
                      <span className={styles.cardMetaSep}>·</span>
                      <span>
                        {status === "opened"
                          ? `Opened ${formatDate(capsule.openedAt)}`
                          : `Opens ${getRelativeTime(capsule.unlockDate)}`}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className={styles.cardChevron} />
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={styles.bottomNav}>
        <Link
          href="/dashboard"
          className={`${styles.bottomNavItem} ${pathname === "/dashboard" ? styles.bottomNavItemActive : ""}`}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/create" className={`${styles.bottomNavItem} ${pathname === "/create" ? styles.bottomNavItemActive : ""}`}>
          <Plus size={20} />
          <span>Create</span>
        </Link>
        <Link href="/profile" className={`${styles.bottomNavItem} ${pathname === "/profile" ? styles.bottomNavItemActive : ""}`}>
          <User size={20} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
