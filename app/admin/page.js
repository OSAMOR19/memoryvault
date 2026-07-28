'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Package,
  Lock,
  Unlock,
  Image as ImageIcon,
  Shield,
  Search,
  ArrowLeft,
  LogOut,
  Bell,
  Home,
  Plus,
} from 'lucide-react';
import { getSession, logOut } from '../lib/auth';
import { getAdminDashboardData, isAdmin } from '../lib/storage';
import styles from './admin.module.css';

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Check if user is an authorized admin
        if (!isAdmin(session.email)) {
          router.push('/dashboard');
          return;
        }

        setCurrentUser(session);
        const adminData = await getAdminDashboardData();
        setData(adminData);
      } catch (err) {
        console.error('[Admin] Load stats error:', err);
        setError(err.message || 'Failed to authorize or load admin dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  function getRelativeLoginTime(dateStr) {
    if (!dateStr) return 'Never';
    const now = new Date();
    const target = new Date(dateStr);
    const diff = target - now;
    const absDiff = Math.abs(diff);
    const isPast = diff < 0;

    if (absDiff < 60 * 1000) {
      return 'Just now';
    }
    if (absDiff < 60 * 60 * 1000) {
      const mins = Math.floor(absDiff / (60 * 1000));
      return isPast ? `${mins}m ago` : `${mins}m from now`;
    }
    if (absDiff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(absDiff / (60 * 60 * 1000));
      return isPast ? `${hours}h ago` : `${hours}h from now`;
    }
    const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
    if (days === 1) return isPast ? 'Yesterday' : 'Tomorrow';
    if (days < 30) return isPast ? `${days}d ago` : `${days}d from now`;
    
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingDot} />
        <span className={styles.loadingText}>Loading admin console...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorView}>
        <Shield size={48} className={styles.errorIcon} style={{ color: '#C62828' }} />
        <h2 className={styles.errorTitle}>Access Restriction</h2>
        <p className={styles.errorText}>{error}</p>
        <Link href="/dashboard" className={styles.errorCta}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Filter users based on search
  const filteredUsers = (data?.users || []).filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const stats = data?.stats || {
    total_users: 0,
    total_capsules: 0,
    total_sealed: 0,
    total_opened: 0,
    total_photos: 0,
  };

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
            style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E9B114', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: '700', border: 'none', cursor: 'pointer' }}
          >
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
          </button>
          {profileOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '180px', background: 'white', border: '1px solid #F3F0EB', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '6px', zIndex: 100 }}>
              <div style={{ padding: '8px 12px 10px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A' }}>{currentUser?.name || 'Admin'}</p>
                <p style={{ fontSize: '0.75rem', color: '#9E9E9E', marginTop: '2px', wordBreak: 'break-all' }}>{currentUser?.email || ''}</p>
              </div>
              <div style={{ height: '1px', background: '#F3F0EB', margin: '6px 0' }} />
              <button
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', borderRadius: '8px', fontSize: '0.8125rem', color: '#6B6B6B', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
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
          <Link href="/dashboard" className={styles.sidebarLink}>
            <Package size={18} />
            <span>My Capsules</span>
          </Link>
          <Link href="/create" className={styles.sidebarLink}>
            <Plus size={18} />
            <span>Create New</span>
          </Link>
          <Link href="/notifications" className={styles.sidebarLink}>
            <Bell size={18} />
            <span>Notifications</span>
          </Link>
          <Link href="/admin" className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`}>
            <Shield size={18} />
            <span>Admin Panel</span>
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Control Center</h1>
            <p className={styles.subtitle}>MemoryVault platform overview and statistics</p>
          </div>
          <Link href="/dashboard" className={styles.errorCta} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '10px 20px' }}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </header>

        {/* ── Stats Grid ── */}
        <section className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Total Registered Users</span>
            <span className={styles.statsValue}>
              <Users size={20} style={{ color: '#E9B114', marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }} />
              {stats.total_users}
            </span>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Total Capsules Sealed</span>
            <span className={styles.statsValue}>
              <Lock size={20} style={{ color: '#E9B114', marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }} />
              {stats.total_capsules}
            </span>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Active Sealed</span>
            <span className={styles.statsValue}>
              <ImageIcon size={20} style={{ color: '#C49710', marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }} />
              {stats.total_sealed}
            </span>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Total Opened</span>
            <span className={styles.statsValue}>
              <Unlock size={20} style={{ color: '#2E7D32', marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }} />
              {stats.total_opened}
            </span>
          </div>
        </section>

        {/* ── Filter / Search ── */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ── Data Table ── */}
        <section className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>User Details</th>
                  <th className={styles.th}>Joined Date</th>
                  <th className={styles.th}>Last Log In</th>
                  <th className={styles.th} style={{ textAlign: 'center' }}>Capsules</th>
                  <th className={styles.th} style={{ textAlign: 'center' }}>Photos</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.td} style={{ textAlign: 'center', padding: '40px 0', color: '#9E9E9E' }}>
                      No matching registered users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUserAdmin = isAdmin(u.email);
                    return (
                      <tr key={u.id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.userName}>
                            {u.name || 'Anonymous User'}
                            {isUserAdmin && (
                              <span className={`${styles.badge} ${styles.badgeAdmin}`} style={{ marginLeft: '8px' }}>
                                Admin
                              </span>
                            )}
                          </div>
                          <div className={styles.userEmail}>{u.email}</div>
                        </td>
                        <td className={styles.td}>{formatDate(u.created_at)}</td>
                        <td className={styles.td}>{getRelativeLoginTime(u.last_sign_in_at)}</td>
                        <td className={styles.td} style={{ textAlign: 'center', fontWeight: '600' }}>{u.capsule_count}</td>
                        <td className={styles.td} style={{ textAlign: 'center', color: '#9E9E9E' }}>{u.photo_count}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard" className={styles.bottomNavItem}>
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/create" className={styles.bottomNavItem}>
          <Plus size={20} />
          <span>Create</span>
        </Link>
        <Link href="/notifications" className={styles.bottomNavItem}>
          <Bell size={20} />
          <span>Alerts</span>
        </Link>
        <Link href="/admin" className={`${styles.bottomNavItem} ${styles.bottomNavItemActive}`}>
          <Shield size={20} />
          <span>Admin</span>
        </Link>
      </nav>
    </div>
  );
}
