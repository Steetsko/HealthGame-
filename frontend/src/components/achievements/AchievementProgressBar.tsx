type AchievementProgressBarProps = {
  current: number;
  target: number;
  percent: number;
};

export function AchievementProgressBar({ current, target, percent }: AchievementProgressBarProps) {
  return (
    <div className="achievement-progress">
      <div
        className="achievement-progress-track"
        role="progressbar"
        aria-label={`Прогресс достижения: ${current} из ${target}`}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
      >
        <div className="achievement-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <span>{current} из {target}</span>
    </div>
  );
}
