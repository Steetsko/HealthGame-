import { AchievementUnlockedToast } from "./AchievementUnlockedToast";
import type { NormalizedAchievement } from "./achievementMappers";

type AchievementToastContainerProps = {
  achievement: NormalizedAchievement | null;
  onClose: () => void;
};

export function AchievementToastContainer({ achievement, onClose }: AchievementToastContainerProps) {
  if (!achievement) return null;

  return (
    <div className="achievement-toast-container">
      <AchievementUnlockedToast achievement={achievement} onClose={onClose} />
    </div>
  );
}
