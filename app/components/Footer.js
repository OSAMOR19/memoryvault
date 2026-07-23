import Link from "next/link";

import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="NimCapsule" width={20} height={20} style={{ display: 'block' }} />
            </div>
            <span className={styles.logoText}>NimCapsule</span>
          </div>
          <p className={styles.tagline}>
            Your memories, sealed in time.
          </p>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copy}>
            &copy; {new Date().getFullYear()} NimCapsule. All rights reserved.
          </p>
          <div className={styles.links}>
            <Link href="/login" className={styles.link}>Log In</Link>
            <Link href="/signup" className={styles.link}>Sign Up</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
