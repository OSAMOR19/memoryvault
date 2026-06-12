"use client";

import { Lock, Clock, Gift, Image, Mic, Shield } from "lucide-react";
import styles from "./FeaturesSection.module.css";

const features = [
  {
    icon: Lock,
    title: "Time-Locked Capsules",
    description:
      "Seal your memories with a future unlock date. No one — not even you — can peek until the moment arrives.",
  },
  {
    icon: Clock,
    title: "Precision Timing",
    description:
      "Set your capsule to unlock in a month, a year, or a decade. Watch the countdown tick toward the reveal.",
  },
  {
    icon: Gift,
    title: "NIM Crypto Gifts",
    description:
      "Attach NIM cryptocurrency that unlocks with the capsule. A gift that travels through time.",
  },
  {
    icon: Image,
    title: "Photos & Media",
    description:
      "Preserve photos alongside your message. Relive moments exactly as you captured them.",
  },
  {
    icon: Mic,
    title: "Voice Notes",
    description:
      "Record your voice for a personal touch. Let your future self hear exactly how you felt.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Your capsules are encrypted and personal. Only you decide who gets to open them.",
  },
];

export default function FeaturesSection() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Features</span>
          <h2 className={styles.title}>
            Everything you need to
            <br />
            preserve what matters
          </h2>
          <p className={styles.subtitle}>
            Thoughtfully designed tools to capture, seal, and reveal your most
            precious memories.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div className={styles.card} key={i}>
                <div className={styles.iconWrap}>
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDesc}>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
