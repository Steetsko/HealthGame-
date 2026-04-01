export type UserProfile = {
  id: number;
  email: string;
  phone: string | null;
  nickname: string;
  firstName: string | null;
  timezone: string;
  status: string;
  registeredAt: string;
  lastLoginAt: string | null;
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
  code: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  awardedAt: string;
  source: string;
};

export type CommunityComment = {
  id: number;
  authorId: number;
  authorName: string;
  authorNickname: string;
  text: string;
  createdAt: string;
  replies: CommunityComment[];
};

export type CommunityPost = {
  id: number;
  authorId: number;
  authorName: string;
  authorNickname: string;
  text: string;
  imageUrl: string | null;
  visibility: string;
  createdAt: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  comments: CommunityComment[];
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

