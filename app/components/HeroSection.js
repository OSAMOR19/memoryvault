"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Clock, Gift } from "lucide-react";
import styles from "./HeroSection.module.css";

export default function HeroSection() {
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement("div");
      dot.className = styles.particle;
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.width = `${2 + Math.random() * 3}px`;
      dot.style.height = dot.style.width;
      dot.style.animationDelay = `${Math.random() * 6}s`;
      dot.style.animationDuration = `${5 + Math.random() * 5}s`;
      container.appendChild(dot);
    }
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.particles} ref={particlesRef} />

      <div className={styles.content}>
        <div className={styles.badge}>
          <Lock size={13} strokeWidth={2.5} />
          <span>Digital Time Capsules</span>
        </div>

        <h1 className={styles.heading}>
          Your memories,
          <br />
          <em className={styles.headingEm}>sealed in time.</em>
        </h1>

        <p className={styles.subheading}>
          Create digital time capsules filled with messages, photos, and crypto
          gifts that unlock at a future date you choose.
        </p>

        <div className={styles.actions}>
          <Link href="/signup" className={styles.btnPrimary}>
            Create a Time Capsule
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className={styles.btnSecondary}>
            Sign In
          </Link>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <Clock size={16} className={styles.statIcon} />
            <span>Time-locked until you choose</span>
          </div>
          <div className={styles.stat}>
            <Gift size={16} className={styles.statIcon} />
            <span>Attach NIM crypto gifts</span>
          </div>
        </div>
      </div>

      {/* Decorative capsule illustration */}
      <div className={styles.illustration}>
        <div className={styles.capsuleVisual}>
          <div className={styles.capsuleOuter}>
            <div className={styles.capsuleInner}>
              <Lock size={32} strokeWidth={1.5} />
            </div>
          </div>
          <div className={styles.capsuleRing1} />
          <div className={styles.capsuleRing2} />
          <div className={styles.capsuleRing3} />
        </div>
      </div>
    </section>
  );
}
