"use client";

import { PenLine, CalendarClock, Lock, PartyPopper } from "lucide-react";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    icon: PenLine,
    step: "01",
    title: "Write Your Message",
    description:
      "Pour your thoughts into a beautiful editor. Add photos, voice notes, and optional NIM gifts.",
  },
  {
    icon: CalendarClock,
    step: "02",
    title: "Set an Unlock Date",
    description:
      "Choose when the capsule reveals its contents — a month, a year, or decades from now.",
  },
  {
    icon: Lock,
    step: "03",
    title: "Seal the Capsule",
    description:
      "Your capsule is locked with a satisfying wax-seal animation. No peeking until the date arrives.",
  },
  {
    icon: PartyPopper,
    step: "04",
    title: "Open & Relive",
    description:
      "When the moment comes, open your capsule to relive memories and unwrap any gifts inside.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>How It Works</span>
          <h2 className={styles.title}>Four simple steps</h2>
          <p className={styles.subtitle}>
            From thought to time capsule in under two minutes.
          </p>
        </div>

        <div className={styles.steps}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div className={styles.step} key={i}>
                <div className={styles.stepNumber}>{step.step}</div>
                <div className={styles.stepLine} />
                <div className={styles.stepIconWrap}>
                  <Icon size={24} strokeWidth={1.8} />
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
