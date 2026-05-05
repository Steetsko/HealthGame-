import { AchievementIcon } from "./AchievementIcon";
import { AchievementProgressBar } from "./AchievementProgressBar";
import { AchievementRarityBadge } from "./AchievementRarityBadge";
import type { NormalizedAchievement } from "./achievementMappers";

type AchievementCardProps = {
  achievement: NormalizedAchievement;
  accentClassName?: string;
  compact?: boolean;
};

function formatAwardedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export function AchievementCard({ achievement, accentClassName, compact = false }: AchievementCardProps) {
  const awardedAt = formatAwardedAt(achievement.unlockedAt);

  return (
    <article
      className={`achievement-card-shell rarity-${achievement.rarity} achievement-tone-${achievement.tone} ${achievement.unlocked ? "is-unlocked" : "is-locked"} ${accentClassName ?? ""} ${compact ? "is-compact" : ""}`}
      data-achievement-code={achievement.code}
    >
      <div className="achievement-card-particles" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="achievement-card-layout">
        <AchievementIcon
          icon={achievement.iconKey}
          rarity={achievement.rarity}
          unlocked={achievement.unlocked}
          size={compact ? "md" : "lg"}
        />

        <div className="achievement-card-copy">
          <div className="achievement-card-topline">
            <strong>{achievement.title}</strong>
            <AchievementRarityBadge rarity={achievement.rarity} rarityLabel={achievement.rarityLabel} />
          </div>

          <p>{achievement.description}</p>

          <div className="achievement-card-meta">
            <span>{achievement.statusLabel}</span>
            {awardedAt ? <span>{awardedAt}</span> : <span>Ещё не открыто</span>}
          </div>

          {achievement.progressPercent != null &&
          achievement.progressCurrent != null &&
          achievement.progressTarget != null ? (
            <AchievementProgressBar
              current={achievement.progressCurrent}
              target={achievement.progressTarget}
              percent={achievement.progressPercent}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
