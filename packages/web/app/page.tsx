"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdventureListItem } from "@corvran/shared";
import Image from "next/image";
import styles from "./page.module.css";

export default function AdventureListPage() {
  const router = useRouter();
  const [adventures, setAdventures] = useState<AdventureListItem[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/daemon/adventures")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load adventures");
        const data = (await res.json()) as { adventures: AdventureListItem[] };
        setAdventures(data.adventures);

        // Single-adventure auto-redirect
        if (data.adventures.length === 1) {
          router.push(`/adventure/${data.adventures[0].id}`);
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load adventures"
        );
      });
  }, [router]);

  if (error) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.pageInner}>
            <div className={styles.loading}>{error}</div>
          </div>
        </main>
      </>
    );
  }

  if (adventures === null) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.pageInner}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </main>
      </>
    );
  }

  if (adventures.length === 0) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.pageInner}>
            <EmptyState />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.pageInner}>
          <div className={styles.pageHeading}>
            <h1>Choose Your Adventure</h1>
            <p>Select an adventure to continue or begin a new session.</p>
          </div>

          <div className={styles.sectionLabel}>Your Adventures</div>

          <div className={styles.adventureList}>
            {adventures.map((adventure) => (
              <AdventureCard key={adventure.id} adventure={adventure} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Image
          src="/logo.png"
          width={28}
          height={28}
          alt="Corvran"
          className={styles.logoImg}
        />
      </div>
      <span className={styles.appName}>Adventure Engine of Corvran</span>
    </header>
  );
}

function AdventureCard({ adventure }: { adventure: AdventureListItem }) {
  const hasHistory = adventure.hasHistory;
  const fileHints: string[] = [];
  if (adventure.hasCharacter) fileHints.push("Character");
  if (adventure.hasWorld) fileHints.push("World");
  if (adventure.hasHistory) fileHints.push("History");

  return (
    <a
      className={styles.adventureCard}
      href={`/adventure/${adventure.id}`}
    >
      <div className={styles.adventureCardLeft}>
        <span className={styles.adventureName}>{adventure.name}</span>
        <div className={styles.adventureMeta}>
          <span
            className={`${styles.badge} ${hasHistory ? styles.badgeContinue : styles.badgeNew}`}
          >
            {hasHistory ? "Continue" : "New adventure"}
          </span>
          <span className={styles.adventureHint}>
            {fileHints.length > 0
              ? fileHints.join(" \u00b7 ")
              : "No files yet \u2014 GM will help you begin"}
          </span>
        </div>
      </div>
      <div className={styles.adventureCardRight}>{"\u203a"}</div>
    </a>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.ravenIcon}>
        <Image
          src="/logo.png"
          width={64}
          height={64}
          alt=""
          className={styles.ravenIconImg}
        />
      </div>
      <h2>No adventures yet</h2>
      <p>
        Create an adventure directory to begin. The game master will help you
        build your character and world through conversation.
      </p>
      <div className={styles.codeHint}>mkdir adventures/my-first-adventure</div>
      <p className={styles.restartHint}>
        Then restart the engine and return here.
      </p>
    </div>
  );
}
