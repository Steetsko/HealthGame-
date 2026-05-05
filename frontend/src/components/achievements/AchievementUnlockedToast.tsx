import { AchievementIcon } from "./AchievementIcon";
import { AchievementRarityBadge } from "./AchievementRarityBadge";
import type { NormalizedAchievement } from "./achievementMappers";

type AchievementUnlockedToastProps = {
  achievement: NormalizedAchievement;
  onClose: () => void;
};

export function AchievementUnlockedToast({ achievement, onClose }: AchievementUnlockedToastProps) {
  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <button
        type="button"
        className="achievement-toast-close"
        aria-label="Закрыть уведомление"
        onClick={onClose}
      >
        ×
      </button>

      <div className="achievement-toast-particles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="achievement-toast-head">
        <span>Достижение получено!</span>
        <strong>Отличная работа! Продолжай в том же духе.</strong>
      </div>

      <div className={`achievement-toast-card rarity-${achievement.rarity} achievement-tone-${achievement.tone}`}>
        <AchievementIcon icon={achievement.iconKey} rarity={achievement.rarity} unlocked size="lg" />
        <div className="achievement-toast-copy">
          <div className="achievement-toast-title">
            <strong>{achievement.title}</strong>
            <AchievementRarityBadge rarity={achievement.rarity} rarityLabel={achievement.rarityLabel} />
          </div>
          <p>{achievement.description}</p>
          <span className="achievement-toast-label">Новое достижение</span>
        </div>
      </div>
    </div>
  );
}
