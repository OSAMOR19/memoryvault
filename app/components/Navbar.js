"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    // Check auth
    const auth = localStorage.getItem("memoryvault_auth");
    setIsLoggedIn(!!auth);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("memoryvault_auth");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  // Don't show navbar on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <img src="/logo.png" alt="MemoryVault" width={24} height={24} style={{ display: 'block' }} />
          </div>
          <span className={styles.logoText}>MemoryVault</span>
        </Link>

        {/* Desktop nav */}
        <div className={styles.desktopLinks}>
          <Link href="/#features" className={styles.navLink}>
            Features
          </Link>
          <Link href="/#how-it-works" className={styles.navLink}>
            How It Works
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className={styles.btnSecondary}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.btnSecondary}>
                Log In
              </Link>
              <Link href="/signup" className={styles.btnPrimary}>
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link
            href="/#features"
            className={styles.mobileLink}
            onClick={() => setMenuOpen(false)}
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className={styles.mobileLink}
            onClick={() => setMenuOpen(false)}
          >
            How It Works
          </Link>
          <div className={styles.mobileDivider} />
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className={styles.mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className={styles.mobileLink}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={styles.mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className={styles.mobileCta}
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
