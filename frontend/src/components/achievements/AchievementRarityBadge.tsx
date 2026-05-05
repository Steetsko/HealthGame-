type AchievementRarityBadgeProps = {
  rarityLabel: string;
  rarity: string;
};

export function AchievementRarityBadge({ rarityLabel, rarity }: AchievementRarityBadgeProps) {
  return <span className={`achievement-rarity-badge rarity-${rarity.toLowerCase()}`}>{rarityLabel}</span>;
}
