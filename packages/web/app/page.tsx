"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdventureListItem, SystemInfo } from "@corvran/shared";
import Image from "next/image";
import styles from "./page.module.css";

function sortAdventures(adventures: AdventureListItem[]): AdventureListItem[] {
  return [...adventures].sort((a, b) => {
    if (a.lastPlayed === null && b.lastPlayed !== null) return -1;
    if (a.lastPlayed !== null && b.lastPlayed === null) return 1;
    if (a.lastPlayed === null && b.lastPlayed === null) return a.name.localeCompare(b.name);
    return new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime();
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdventureListPage() {
  const router = useRouter();
  const [adventures, setAdventures] = useState<AdventureListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    fetch("/api/daemon/adventures")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load adventures");
        const data = (await res.json()) as { adventures: AdventureListItem[] };
        setAdventures(sortAdventures(data.adventures));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load adventures");
      });
  }, []);

  if (error) {
    return (
      <>
        <Header onNewAdventure={() => setWizardOpen(true)} />
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
        <Header onNewAdventure={() => setWizardOpen(true)} />
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
        <Header onNewAdventure={() => setWizardOpen(true)} />
        <main className={styles.page}>
          <div className={styles.pageInner}>
            <EmptyState onNewAdventure={() => setWizardOpen(true)} />
          </div>
        </main>
        {wizardOpen && (
          <CreationWizard
            onClose={() => setWizardOpen(false)}
            onCreated={(id) => router.push(`/adventure/${id}`)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Header onNewAdventure={() => setWizardOpen(true)} />
      <main className={styles.page}>
        <div className={styles.pageInner}>
          <div className={styles.pageHeading}>
            <h1>Your Adventures</h1>
            <button
              className={styles.newAdventureBtn}
              onClick={() => setWizardOpen(true)}
            >
              + New Adventure
            </button>
          </div>

          <div className={styles.adventureList}>
            {adventures.map((adventure) => (
              <AdventureCard key={adventure.id} adventure={adventure} />
            ))}
          </div>
        </div>
      </main>
      {wizardOpen && (
        <CreationWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(id) => router.push(`/adventure/${id}`)}
        />
      )}
    </>
  );
}

function Header({ onNewAdventure }: { onNewAdventure: () => void }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
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
      </div>
      <button className={styles.headerNewBtn} onClick={onNewAdventure}>
        + New
      </button>
    </header>
  );
}

function AdventureCard({ adventure }: { adventure: AdventureListItem }) {
  const conceptSnippet = adventure.concept
    ? adventure.concept.length > 100
      ? adventure.concept.slice(0, 100) + "\u2026"
      : adventure.concept
    : null;

  return (
    <a className={styles.adventureCard} href={`/adventure/${adventure.id}`}>
      <div className={styles.adventureCardContent}>
        <div className={styles.adventureCardTop}>
          <span className={styles.adventureName}>{adventure.name}</span>
          {adventure.system && (
            <span className={styles.systemBadge}>{adventure.system}</span>
          )}
        </div>
        {conceptSnippet && (
          <p className={styles.adventureConcept}>{conceptSnippet}</p>
        )}
        <div className={styles.adventureMeta}>
          <span
            className={`${styles.badge} ${adventure.hasHistory ? styles.badgeContinue : styles.badgeNew}`}
          >
            {adventure.hasHistory ? "Continue" : "New adventure"}
          </span>
          {adventure.characterName && (
            <span className={styles.characterName}>
              Playing as {adventure.characterName}
            </span>
          )}
          {adventure.lastPlayed && (
            <span className={styles.lastPlayed}>
              {relativeTime(adventure.lastPlayed)}
            </span>
          )}
        </div>
      </div>
      <div className={styles.adventureCardRight}>{"\u203a"}</div>
    </a>
  );
}

function EmptyState({ onNewAdventure }: { onNewAdventure: () => void }) {
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
      <p>Start one. The game master will help you build your character and world through conversation.</p>
      <button className={styles.newAdventureBtn} onClick={onNewAdventure}>
        + New Adventure
      </button>
    </div>
  );
}

function CreationWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [systems, setSystems] = useState<SystemInfo[] | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [concept, setConcept] = useState("");
  const [name, setName] = useState("Untitled Adventure");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/daemon/systems")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load systems");
        const data = (await res.json()) as { systems: SystemInfo[] };
        setSystems(data.systems);
      })
      .catch(() => {
        setSystems([]);
      });
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/daemon/adventures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          system: selectedSystem,
          concept: concept.trim() || null,
        }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { adventure: AdventureListItem };
        onCreated(data.adventure.id);
        return;
      }

      const body = (await res.json()) as { error: string };
      setError(body.error);
    } catch {
      setError("Failed to create adventure. Is the daemon running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wizardOverlay} onClick={onClose}>
      <div className={styles.wizardModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.wizardHeader}>
          <h2>New Adventure</h2>
          <button className={styles.wizardClose} onClick={onClose}>
            {"\u00d7"}
          </button>
        </div>

        <div className={styles.wizardBody}>
          <div className={styles.wizardField}>
            <label className={styles.wizardLabel}>System</label>
            <div className={styles.systemPicker}>
              <button
                className={`${styles.systemOption} ${selectedSystem === null ? styles.systemOptionSelected : ""}`}
                onClick={() => setSelectedSystem(null)}
              >
                <span className={styles.systemOptionAlias}>Freeform</span>
                <span className={styles.systemOptionDesc}>No rules system, pure narrative</span>
              </button>
              {systems === null ? (
                <div className={styles.systemsLoading}>Loading systems...</div>
              ) : (
                systems.map((sys) => (
                  <button
                    key={sys.alias}
                    className={`${styles.systemOption} ${selectedSystem === sys.alias ? styles.systemOptionSelected : ""}`}
                    onClick={() => setSelectedSystem(sys.alias)}
                  >
                    <span className={styles.systemOptionAlias}>{sys.alias}</span>
                    <span className={styles.systemOptionDesc}>{sys.description}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className={styles.wizardField}>
            <label className={styles.wizardLabel} htmlFor="wizard-concept">
              What&apos;s your adventure about?
            </label>
            <textarea
              id="wizard-concept"
              className={styles.wizardTextarea}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Describe the setting, theme, or premise. Leave blank to start with a blank slate."
            />
            <div className={styles.charCount}>{concept.length}/1000</div>
          </div>

          <div className={styles.wizardField}>
            <label className={styles.wizardLabel} htmlFor="wizard-name">
              Adventure name
            </label>
            <input
              id="wizard-name"
              type="text"
              className={styles.wizardInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {error && <div className={styles.wizardError}>{error}</div>}
        </div>

        <div className={styles.wizardFooter}>
          <button
            className={styles.wizardSubmit}
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? "Creating..." : "Begin Adventure"}
          </button>
        </div>
      </div>
    </div>
  );
}
