import { useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedAchievement } from "./achievementMappers";

const TOAST_DURATION = 5200;
const STORAGE_KEY = "hg_seen_achievements_v1";

function readSeenAchievementKeys() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

function writeSeenAchievementKeys(keys: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // ignore storage errors in private mode
  }
}

export function useAchievementNotifications(achievements: NormalizedAchievement[], ready: boolean) {
  const [queue, setQueue] = useState<NormalizedAchievement[]>([]);
  const [active, setActive] = useState<NormalizedAchievement | null>(null);
  const initializedRef = useRef(false);
  const knownKeysRef = useRef<Set<string>>(new Set());

  const unlockedAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked),
    [achievements]
  );

  useEffect(() => {
    if (!ready) return;
    const nextKeys = new Set(
      unlockedAchievements.map((achievement) => `${achievement.code}:${achievement.unlockedAt ?? achievement.id}`)
    );

    if (!initializedRef.current) {
      const seenKeys = readSeenAchievementKeys();
      nextKeys.forEach((key) => seenKeys.add(key));
      knownKeysRef.current = seenKeys;
      writeSeenAchievementKeys(seenKeys);
      initializedRef.current = true;
      return;
    }

    const nextAchievements = unlockedAchievements.filter((achievement) => {
      const key = `${achievement.code}:${achievement.unlockedAt ?? achievement.id}`;
      return !knownKeysRef.current.has(key);
    });

    if (nextAchievements.length) {
      setQueue((current) => {
        const existingKeys = new Set([
          ...current.map((achievement) => `${achievement.code}:${achievement.unlockedAt ?? achievement.id}`),
          ...(active ? [`${active.code}:${active.unlockedAt ?? active.id}`] : [])
        ]);
        const toAppend = nextAchievements.filter((achievement) => {
          const key = `${achievement.code}:${achievement.unlockedAt ?? achievement.id}`;
          return !existingKeys.has(key);
        });
        if (toAppend.length) {
          const seenKeys = new Set(knownKeysRef.current);
          toAppend.forEach((achievement) => seenKeys.add(`${achievement.code}:${achievement.unlockedAt ?? achievement.id}`));
          knownKeysRef.current = seenKeys;
          writeSeenAchievementKeys(seenKeys);
        }
        return toAppend.length ? [...current, ...toAppend] : current;
      });
    }

    const mergedKeys = new Set(knownKeysRef.current);
    nextKeys.forEach((key) => mergedKeys.add(key));
    knownKeysRef.current = mergedKeys;
    writeSeenAchievementKeys(mergedKeys);
  }, [active, unlockedAchievements, ready]);

  useEffect(() => {
    if (active || !queue.length) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return undefined;
    const timeout = window.setTimeout(() => {
      setActive(null);
    }, TOAST_DURATION);
    return () => window.clearTimeout(timeout);
  }, [active]);

  return {
    activeAchievement: active,
    closeAchievementToast: () => setActive(null)
  };
}
