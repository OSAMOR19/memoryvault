'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Trash2,
  Check,
  Package,
  Lock,
  Unlock,
  LogOut,
  Home,
  User,
  Plus,
  Shield,
} from 'lucide-react';
import { getSession, logOut } from '../lib/auth';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationsCount,
  isAdmin,
} from '../lib/storage';
import styles from './notifications.module.css';

const NOTIFICATION_ICONS = {
  created: Lock,
  opened: Unlock,
  deleted: Trash2,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session);
      await loadNotifications();
      setIsLoaded(true);
    })();
  }, [router]);

  async function loadNotifications() {
    try {
      const list = await getNotifications();
      setNotifications(list);
      const count = await getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('[Notifications] Load error:', err);
    }
  }

  const handleMarkAsRead = async (id) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      await loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    const success = await markAllNotificationsAsRead();
    if (success) {
      await loadNotifications();
    }
  };

  const handleDelete = async (id) => {
    const success = await deleteNotification(id);
    if (success) {
      await loadNotifications();
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await Promise.all(notifications.map((n) => deleteNotification(n.id)));
      await loadNotifications();
    } catch (err) {
      console.error('[Notifications] Clear error:', err);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  function getRelativeTime(dateStr) {
    const now = new Date();
    const target = new Date(dateStr);
    const diff = target - now;
    const absDiff = Math.abs(diff);
    const isPast = diff < 0;

    if (absDiff < 60 * 1000) {
      return 'just now';
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
    if (days < 30) return isPast ? `${days}d ago` : `${days}d from now`;
    const months = Math.floor(days / 30);
    if (months < 12) return isPast ? `${months}mo ago` : `${months}mo from now`;
    const years = Math.floor(days / 365);
    return isPast ? `${years}y ago` : `${years}y from now`;
  }

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
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </button>
          {profileOpen && (
            <div className={styles.mobileProfileDropdown}>
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownName}>{user?.name || 'User'}</p>
                <p className={styles.dropdownEmail}>{user?.email || ''}</p>
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
          <Link href="/notifications" className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`}>
            <Bell size={18} />
            <span>Notifications</span>
            {unreadCount > 0 && <span className={styles.navUnreadDot} />}
          </Link>
          {isAdmin(user?.email) && (
            <Link href="/admin" className={styles.sidebarLink}>
              <Shield size={18} />
              <span>Admin Panel</span>
            </Link>
          )}
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
            <h1 className={styles.title}>Activity Center</h1>
            <p className={styles.subtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread activity log${unreadCount !== 1 ? 's' : ''}`
                : 'Your history is up to date'}
            </p>
          </div>
          {notifications.length > 0 && (
            <div className={styles.headerActions}>
              <button className={styles.clearAllBtn} onClick={handleClearAll}>
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
              {unreadCount > 0 && (
                <button className={styles.markReadBtn} onClick={handleMarkAllAsRead}>
                  <Check size={14} />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          )}
        </header>

        {/* ── Notifications List ── */}
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Bell size={40} strokeWidth={1.2} />
            </div>
            <h3 className={styles.emptyTitle}>No notifications yet</h3>
            <p className={styles.emptyText}>
              Activities like sealing, unlocking, or opening your time capsules will appear here.
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((n) => {
              const Icon = NOTIFICATION_ICONS[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  className={`${styles.card} ${!n.is_read ? styles.cardUnread : ''}`}
                >
                  <div className={`${styles.cardIcon} ${styles[`cardIcon_${n.type}`]}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>{n.title}</h4>
                      <span className={styles.cardMeta}>{getRelativeTime(n.created_at)}</span>
                    </div>
                    <p className={styles.cardMessage}>{n.message}</p>
                  </div>
                  <div className={styles.cardActions}>
                    {!n.is_read && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleMarkAsRead(n.id)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDelete(n.id)}
                      title="Delete log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <Link
          href="/notifications"
          className={`${styles.bottomNavItem} ${styles.bottomNavItemActive}`}
        >
          <Bell size={20} />
          <span>Alerts</span>
          {unreadCount > 0 && <div className={styles.mobileBadgeDot} />}
        </Link>
        <Link href="/profile" className={styles.bottomNavItem}>
          <User size={20} />
          <span>Profile</span>
        </Link>
        {isAdmin(user?.email) && (
          <Link href="/admin" className={styles.bottomNavItem}>
            <Shield size={20} />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
