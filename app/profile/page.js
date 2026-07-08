'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  LogOut,
  User,
  Mail,
  Calendar,
  Package,
  Unlock,
  Clock,
  Image as ImageIcon,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Home,
  Plus,
  Info,
} from 'lucide-react';
import { getSession, logOut, updateProfile, changePassword, deleteAccount } from '../lib/auth';
import { getCapsules, getEffectiveStatus } from '../lib/storage';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [stats, setStats] = useState({ total: 0, sealed: 0, opened: 0, ready: 0, photos: 0 });

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Change password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  // Profile dropdown (for top bar)
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session);
      setNewName(session.name || '');

      // Load stats from capsules
      try {
        const capsules = await getCapsules();
        const now = new Date();
        let sealed = 0, opened = 0, ready = 0, photos = 0;

        capsules.forEach(c => {
          const st = getEffectiveStatus(c);
          if (st === 'opened') opened++;
          else if (st === 'unlockable') ready++;
          else sealed++;
          if (c.photos) photos += c.photos.length;
        });

        setStats({ total: capsules.length, sealed, opened, ready, photos });
      } catch {
        setStats({ total: 0, sealed: 0, opened: 0, ready: 0, photos: 0 });
      }

      setIsLoaded(true);
    })();
  }, [router]);

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim().length < 2) return;

    const result = await updateProfile(user.id, { name: newName.trim() });
    if (result.success) {
      setUser({ ...user, name: newName.trim() });
      setEditingName(false);
      setNameSuccess('Name updated successfully');
      setTimeout(() => setNameSuccess(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword) { setPasswordError('New password is required'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPassword)) { setPasswordError('Password must contain an uppercase letter'); return; }
    if (!/[a-z]/.test(newPassword)) { setPasswordError('Password must contain a lowercase letter'); return; }
    if (!/[0-9]/.test(newPassword)) { setPasswordError('Password must contain a number'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }

    const result = await changePassword(newPassword);
    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setPasswordSuccess('Password changed successfully');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } else {
      setPasswordError(result.error || 'Something went wrong. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    await deleteAccount(user.id);
    router.push('/login');
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long', year: 'numeric',
      })
    : '';

  if (!isLoaded) return null;

  return (
    <div className={styles.page}>
      {/* Mobile Top Bar */}
      <header className={styles.mobileTopBar}>
        <Link href="/dashboard" className={styles.mobileTopBarLogo}>
          <div className={styles.logoIcon}>
            <Lock size={14} strokeWidth={2.5} />
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
            <div className={styles.topBarDropdown}>
              <div className={styles.topBarDropdownHeader}>
                <p className={styles.topBarDropdownName}>{user?.name || 'User'}</p>
                <p className={styles.topBarDropdownEmail}>{user?.email || ''}</p>
              </div>
              <div className={styles.topBarDropdownDivider} />
              <button className={styles.topBarDropdownItem} onClick={handleLogout}>
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className={styles.content}>
        <h1 className={styles.pageTitle}>Profile</h1>

        {/* Success messages */}
        {nameSuccess && (
          <div className={styles.successBanner}>
            <CheckCircle size={16} />
            {nameSuccess}
          </div>
        )}
        {passwordSuccess && (
          <div className={styles.successBanner}>
            <CheckCircle size={16} />
            {passwordSuccess}
          </div>
        )}

        {/* ── User Info Card ── */}
        <section className={styles.card}>
          <div className={styles.userHeader}>
            <div className={styles.avatarLarge}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className={styles.userInfo}>
              {editingName ? (
                <div className={styles.editNameRow}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={styles.editNameInput}
                    maxLength={50}
                    autoFocus
                  />
                  <button className={styles.saveNameBtn} onClick={handleSaveName}>Save</button>
                  <button className={styles.cancelNameBtn} onClick={() => { setEditingName(false); setNewName(user?.name || ''); }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className={styles.nameRow}>
                  <h2 className={styles.userName}>{user?.name || 'User'}</h2>
                  <button className={styles.editBtn} onClick={() => setEditingName(true)}>Edit</button>
                </div>
              )}
              <div className={styles.userDetail}>
                <Mail size={14} />
                <span>{user?.email || 'No email'}</span>
              </div>
              <div className={styles.userDetail}>
                <Calendar size={14} />
                <span>Member since {memberSince || 'recently'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── App Statistics ── */}
        <section className={styles.card}>
          <h3 className={styles.cardLabel}>Your Stats</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.statIconTotal}`}>
                <Package size={18} />
              </div>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.statIconSealed}`}>
                <Lock size={18} />
              </div>
              <span className={styles.statValue}>{stats.sealed}</span>
              <span className={styles.statLabel}>Sealed</span>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.statIconReady}`}>
                <Unlock size={18} />
              </div>
              <span className={styles.statValue}>{stats.ready}</span>
              <span className={styles.statLabel}>Ready</span>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.statIconOpened}`}>
                <Clock size={18} />
              </div>
              <span className={styles.statValue}>{stats.opened}</span>
              <span className={styles.statLabel}>Opened</span>
            </div>
          </div>
          <div className={styles.photoStat}>
            <ImageIcon size={16} />
            <span>{stats.photos} photo{stats.photos !== 1 ? 's' : ''} stored</span>
          </div>
        </section>

        {/* ── Account Security ── */}
        <section className={styles.card}>
          <h3 className={styles.cardLabel}>Account Security</h3>

          {!showPasswordForm ? (
            <button
              className={styles.actionRow}
              onClick={() => setShowPasswordForm(true)}
            >
              <div className={styles.actionRowLeft}>
                <Shield size={18} />
                <span>Change Password</span>
              </div>
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className={styles.passwordForm}>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>New Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.fieldInput}
                    placeholder="Enter new password"
                  />
                  <button
                    className={styles.pwToggle}
                    onClick={() => setShowNewPw(!showNewPw)}
                    type="button"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="Re-enter new password"
                />
              </div>

              {passwordError && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={14} />
                  {passwordError}
                </div>
              )}

              <div className={styles.passwordActions}>
                <button className={styles.primaryBtn} onClick={handleChangePassword}>
                  Update Password
                </button>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordError('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── About ── */}
        <section className={styles.card}>
          <h3 className={styles.cardLabel}>About</h3>
          <div className={styles.aboutRow}>
            <Info size={16} />
            <span>MemoryVault v1.0.0</span>
          </div>
          <p className={styles.aboutText}>
            Seal your memories in digital time capsules. Messages, photos, and
            crypto gifts — locked until the perfect moment.
          </p>
        </section>

        {/* ── Danger Zone ── */}
        <section className={`${styles.card} ${styles.dangerCard}`}>
          <h3 className={styles.cardLabel}>Danger Zone</h3>

          <button className={styles.logoutRow} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Log Out</span>
          </button>

          <div className={styles.dangerDivider} />

          {!showDeleteConfirm ? (
            <button
              className={styles.deleteRow}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={18} />
              <span>Delete Account</span>
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteWarning}>
                This will permanently delete your account and all capsules. This action cannot be undone.
              </p>
              <label className={styles.fieldLabel}>
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className={styles.fieldInput}
                placeholder="DELETE"
              />
              <div className={styles.deleteActions}>
                <button
                  className={styles.deleteBtn}
                  onClick={handleDeleteAccount}
                  disabled={deleteText !== 'DELETE'}
                >
                  Delete My Account
                </button>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard" className={styles.bottomNavItem}>
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/create" className={styles.bottomNavItem}>
          <Plus size={20} />
          <span>Create</span>
        </Link>
        <Link href="/profile" className={`${styles.bottomNavItem} ${styles.bottomNavItemActive}`}>
          <User size={20} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
