export type UserProfile = {
  id: number;
  email: string;
  phone: string | null;
  nickname: string;
  firstName: string | null;
  avatarUrl: string | null;
  timezone: string;
  status: string;
  roles: string[];
  registeredAt: string;
  lastLoginAt: string | null;
};


export type DashboardSummary = {
  level: number;
  xp: number;
  nextLevelXp: number;
  dailyScore: number;
  streakDays: number;
  todayCompletedCount: number;
  todayPlannedCount: number;
  weeklyCompletedCount: number;
  weeklyPlannedCount: number;
  weeklyProgressPercent: number;
  activeChallengesCount: number;
  insight: string;
};
export type PublicUserProfile = {
  id: number;
  nickname: string;
  firstName: string | null;
  avatarUrl: string | null;
  timezone: string;
  status: string;
  registeredAt: string;
  activeHabits: number;
  activeChallenges: number;
  achievements: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  streakDays: number;
  totalCheckins: number;
  challengeHistory: PublicUserChallenge[];
};

export type PublicUserChallenge = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  participantStatus: string;
  participantRole: string;
  startDate: string;
  endDate: string;
  goalValue: number;
  participantCount: number;
  coverImageUrl: string | null;
  joinedAt: string;
};

export type HabitSchedule = {
  id: number;
  dayOfWeek: number | null;
  timeOfDay: string | null;
  minTimesPerDay: number;
  isEnabled: boolean;
};

export type Habit = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  targetValue: number | null;
  unit: string | null;
  frequency: string;
  isActive: boolean;
  schedules: HabitSchedule[];
};

export type HabitTimelineDay = {
  date: string;
  scheduled: boolean;
  completed: boolean;
  value: number | null;
};

export type HabitCategory = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
};

export type TodayHabit = {
  id: number;
  name: string;
  categoryName: string;
  targetValue: number | null;
  unit: string | null;
  frequency: string;
  date: string;
  plannedTime: string | null;
  minTimesPerDay: number | null;
  completedToday: boolean;
};

export type HabitCheckin = {
  id: number;
  habitId: number;
  checkinDate: string;
  value: number | null;
  comment: string | null;
  source: string;
  createdAt: string;
};

export type ChallengeParticipant = {
  userId: number;
  email: string;
  nickname: string;
  participantRole: string;
  participantStatus: string;
  joinedAt: string;
};

export type ChallengeTarget = {
  id: number;
  targetKind: string;
  habitId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  unit: string | null;
};

export type ChallengeProgress = {
  currentValue: number;
  completionPercent: number;
  lastCheckinDate: string | null;
  completedAt: string | null;
};

export type Challenge = {
  id: number;
  creatorId: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  goalType: string;
  goalValue: number;
  xpReward: number;
  status: string;
  isPublic: boolean;
  currentUserParticipantStatus: string | null;
  currentValue?: number;
  completionPercent?: number;
  participantCount?: number;
  coverImageUrl?: string | null;
};

export type ChallengeDetails = Challenge & {
  currentUserParticipantRole?: string | null;
  targets: ChallengeTarget[];
  participants: ChallengeParticipant[];
  currentUserProgress: ChallengeProgress | null;
};

export type Achievement = {
  /** ID строки награды user_achievements (уникален для списка) */
  awardId?: number | null;
  id?: number | null;
  code: string;
  title?: string | null;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  unlocked?: boolean | null;
  unlockedAt?: string | null;
  awardedAt?: string | null;
  source?: string | null;
  progressCurrent?: number | null;
  progressTarget?: number | null;
};

export type CommunityComment = {
  id: number;
  authorId: number;
  authorName: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  text: string;
  moderationStatus: string;
  moderationNote: string | null;
  createdAt: string;
  replies: CommunityComment[];
};

export type CommunityPost = {
  id: number;
  authorId: number;
  authorName: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  text: string;
  imageUrl: string | null;
  visibility: string;
  moderationStatus: string;
  moderationNote: string | null;
  createdAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  currentReaction: string | null;
  reactionCounts: Record<string, number>;
  comments: CommunityComment[];
};

export type NotificationItem = {
  id: number;
  actorId: number | null;
  type: string;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type UnreadNotificationCount = {
  unreadCount: number;
};

export type GoogleCalendarEvent = {
  title: string;
  startAt: string;
  allDay: boolean;
  link: string | null;
};

export type GoogleCalendarAgenda = {
  connected: boolean;
  provider: string;
  events: GoogleCalendarEvent[];
  message: string;
};

export type GoogleCalendarSyncResult = {
  connected: boolean;
  createdCount: number;
  skippedCount: number;
  message: string;
};

export type GoogleCalendarConnection = {
  connected: boolean;
  message: string;
};

export type GoogleCalendarConnectLink = {
  authorizationUrl: string;
};

export type WeatherWellness = {
  city: string;
  condition: string;
  temperatureC: number;
  apparentTemperatureC: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  recommendations: Array<{
    category: string;
    title: string;
    text: string;
  }>;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
};
