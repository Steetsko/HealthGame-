import type { ReactNode } from "react";

type AchievementIconProps = {
  icon: string;
  rarity?: string;
  unlocked?: boolean;
  size?: "sm" | "md" | "lg";
};

type IconGlyphProps = { className?: string };

function iconClass(size: AchievementIconProps["size"]) {
  if (size === "sm") return "achievement-icon-shell is-sm";
  if (size === "lg") return "achievement-icon-shell is-lg";
  return "achievement-icon-shell is-md";
}

function normalizeIconKey(icon: string) {
  const value = icon.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    first_step: "sparkles",
    first_checkin: "sparkles",
    team_player: "users",
    challenge_joiner: "users",
    streak: "flame",
    streak_7: "flame",
    streak_30: "flame",
    goal: "target",
    winner: "trophy",
    healthy_heart: "heart",
    daily: "calendar",
    energy: "zap",
    favorite: "star",
    defender: "shield",
    legend: "crown"
  };
  return aliases[value] ?? value;
}

function SvgBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SparklesIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
      <path d="M18.5 13.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z" />
    </SvgBase>
  );
}

function UsersIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13A4 4 0 0 1 16 11.87" />
    </SvgBase>
  );
}

function FlameIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M12 2s4 3.5 4 7.5a4 4 0 1 1-8 0C8 6 12 2 12 2Z" />
      <path d="M12 11s2 1.5 2 3.5a2 2 0 1 1-4 0c0-1.6 2-3.5 2-3.5Z" />
    </SvgBase>
  );
}

function TargetIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </SvgBase>
  );
}

function TrophyIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M6 6H4a2 2 0 0 0 2 3" />
      <path d="M18 6h2a2 2 0 0 1-2 3" />
      <path d="M12 11v4" />
      <path d="M9 21h6" />
      <path d="M10 15h4l1 6H9l1-6Z" />
    </SvgBase>
  );
}

function HeartIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z" />
      <path d="M8 12h2l1.2-2.2L13 14h3" />
    </SvgBase>
  );
}

function CalendarIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </SvgBase>
  );
}

function ZapIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </SvgBase>
  );
}

function StarIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2l-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </SvgBase>
  );
}

function ShieldIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </SvgBase>
  );
}

function CrownIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="m4 18 1.5-9L10 13l2-7 2 7 4.5-4 1.5 9H4Z" />
      <path d="M4 18h16" />
    </SvgBase>
  );
}

function MedalIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="m8 3 4 6 4-6" />
      <circle cx="12" cy="16" r="5" />
      <path d="m10.7 16 1 1 1.6-2" />
    </SvgBase>
  );
}

function AwardIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 13.5 7 21l5-3 5 3-1.5-7.5" />
    </SvgBase>
  );
}

function CompassIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.8 8.2-3 7.6-1.6-4.2-4.2-1.6 7.6-3Z" />
    </SvgBase>
  );
}

function PenIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="m4 20 4.2-1 9.6-9.6a2 2 0 0 0 0-2.8l-.4-.4a2 2 0 0 0-2.8 0L5 15.8 4 20Z" />
      <path d="m13.5 7.5 3 3" />
    </SvgBase>
  );
}

function BoltBadgeIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12.8 6-3 5h2.5L11 18l3.2-5.2h-2.5l1.1-6.8Z" />
    </SvgBase>
  );
}

function LeafIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <path d="M20 4c-8 .2-13.6 3.8-16 10 3 .8 6.8.2 9.6-1.6C17.7 9.8 20 6 20 4Z" />
      <path d="M8 14c-.1 2.6.8 4.6 2.7 6" />
    </SvgBase>
  );
}

function SunBadgeIcon({ className }: IconGlyphProps) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.2 5.8l-1.8 1.8M7.6 16.4l-1.8 1.8M18.2 18.2l-1.8-1.8M7.6 7.6 5.8 5.8" />
    </SvgBase>
  );
}

const achievementIconMap: Record<string, (props: IconGlyphProps) => JSX.Element> = {
  sparkles: SparklesIcon,
  users: UsersIcon,
  flame: FlameIcon,
  target: TargetIcon,
  trophy: TrophyIcon,
  heart: HeartIcon,
  calendar: CalendarIcon,
  zap: ZapIcon,
  star: StarIcon,
  shield: ShieldIcon,
  crown: CrownIcon,
  medal: MedalIcon,
  compass: CompassIcon,
  pen: PenIcon,
  bolt: BoltBadgeIcon,
  leaf: LeafIcon,
  sun: SunBadgeIcon
};

export function AchievementIcon({ icon, rarity = "common", unlocked = true, size = "md" }: AchievementIconProps) {
  const key = normalizeIconKey(icon);
  const Glyph = achievementIconMap[key] ?? AwardIcon;

  return (
    <div className={`${iconClass(size)} rarity-${rarity.toLowerCase()} ${unlocked ? "is-unlocked" : "is-locked"}`}>
      <div className="achievement-icon-glow" />
      <Glyph className="achievement-icon-glyph" />
    </div>
  );
}
