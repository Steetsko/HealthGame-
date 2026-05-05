import axios from "axios";
import { useAuthStore } from "./auth";
import type {
  Achievement,
  HabitCategory,
  AuthResponse,
  Challenge,
  ChallengeDetails,
  CommunityComment,
  CommunityPost,
  DashboardSummary,
  GoogleCalendarAgenda,
  GoogleCalendarConnectLink,
  GoogleCalendarConnection,
  GoogleCalendarSyncResult,
  Habit,
  HabitCheckin,
  HabitTimelineDay,
  NotificationItem,
  PageResponse,
  PublicUserProfile,
  TodayHabit,
  UnreadNotificationCount,
  UserProfile,
  WeatherWellness
} from "./types";

function normalizeApiBaseUrl(baseUrl: string | undefined) {
  const raw = (baseUrl ?? "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/\/+$/, "");
  return normalized.replace(/\/api$/, "");
}

export function getBackendBaseUrl() {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:8080";
}

const api = axios.create({
  baseURL: getBackendBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type LoginPayload = { login: string; password: string };
export type RegisterPayload = {
  email: string;
  phone: string | null;
  password: string;
  nickname: string;
  firstName: string;
  timezone: string;
};
export type UpdateProfilePayload = {
  email: string;
  phone: string;
  nickname: string;
  firstName: string;
  timezone: string;
  avatarUrl: string;
};
export type HabitPayload = {
  categoryId: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  targetValue: number;
  unit: string;
  frequency: string;
  isActive: boolean;
  schedules: Array<{ dayOfWeek: number | null; timeOfDay: string | null; minTimesPerDay: number; isEnabled: boolean }>;
};
export type CheckinPayload = { checkinDate: string; value: number; comment: string; source: string };
export type ChallengeCreatePayload = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  goalType: string;
  goalValue: number;
  xpReward: number;
  isPublic: boolean;
  coverImageUrl?: string;
  targets: Array<{ targetKind: string; categoryId: number }>;
};
export type CommunityPostPayload = {
  text: string;
  imageUrl?: string | null;
  visibility?: string;
};
export type CommunityCommentPayload = {
  text: string;
  parentCommentId?: number | null;
};
export type CommunityReactionPayload = {
  reaction: "like" | "fire" | "clap";
};
export type AdminModerationPayload = {
  moderationStatus: "VISIBLE" | "HIDDEN" | "REMOVED";
  note?: string;
};
export type AdminUserStatusPayload = {
  note?: string;
};

export async function login(payload: LoginPayload) { return (await api.post<AuthResponse>("/api/v1/auth/login", payload)).data; }
export async function register(payload: RegisterPayload) { return (await api.post("/api/v1/auth/register", payload)).data; }
export async function logout() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return;
  await api.post("/api/v1/auth/logout", { refreshToken });
}
export async function getCurrentUser() { return (await api.get<UserProfile>("/api/v1/users/me")).data; }
export async function getDashboardSummary() { return (await api.get<DashboardSummary>("/api/v1/users/me/dashboard-summary")).data; }
export async function getUserProfile(userId: number) { return (await api.get<PublicUserProfile>(`/api/v1/users/${userId}`)).data; }
export async function updateCurrentUser(payload: UpdateProfilePayload) { return (await api.put<UserProfile>("/api/v1/users/me", payload)).data; }
export async function getHabits() { return (await api.get<PageResponse<Habit>>("/api/v1/habits", { params: { page: 0, size: 20 } })).data; }
export async function getHabitTimeline(habitId: number, days = 7) { return (await api.get<HabitTimelineDay[]>(`/api/v1/habits/${habitId}/timeline`, { params: { days } })).data; }
export async function getTodayHabits() { return (await api.get<TodayHabit[]>("/api/v1/habits/today")).data; }
export async function createHabit(payload: HabitPayload) { return (await api.post<Habit>("/api/v1/habits", payload)).data; }
export async function updateHabit(habitId: number, payload: HabitPayload) { return (await api.put<Habit>(`/api/v1/habits/${habitId}`, payload)).data; }
export async function checkInHabit(habitId: number, payload: CheckinPayload) { return (await api.post<HabitCheckin>(`/api/v1/habits/${habitId}/checkins`, payload)).data; }
export async function getMyChallenges() { return (await api.get<PageResponse<Challenge>>("/api/v1/challenges", { params: { scope: "MY", page: 0, size: 20 } })).data; }
export async function getPublicChallenges(params?: { page?: number; size?: number }) { return (await api.get<PageResponse<Challenge>>("/api/v1/challenges", { params: { scope: "PUBLIC", page: params?.page ?? 0, size: params?.size ?? 20 } })).data; }
export async function getChallenge(challengeId: number) { return (await api.get<ChallengeDetails>(`/api/v1/challenges/${challengeId}`)).data; }
export async function createChallenge(payload: ChallengeCreatePayload) { return (await api.post<ChallengeDetails>("/api/v1/challenges", payload)).data; }
export async function joinChallenge(challengeId: number) { return (await api.post<ChallengeDetails>(`/api/v1/challenges/${challengeId}/join`)).data; }
export async function deleteChallenge(challengeId: number) { return (await api.delete(`/api/v1/challenges/${challengeId}`)).data; }
export async function getAchievements() { return (await api.get<Achievement[]>("/api/v1/achievements/my")).data; }
export async function getNotifications() { return (await api.get<NotificationItem[]>("/api/v1/notifications")).data; }
export async function getUnreadNotificationCount() { return (await api.get<UnreadNotificationCount>("/api/v1/notifications/unread-count")).data; }
export async function markNotificationRead(notificationId: number) { return (await api.put<NotificationItem>(`/api/v1/notifications/${notificationId}/read`)).data; }
export async function markAllNotificationsRead() { return (await api.put<UnreadNotificationCount>("/api/v1/notifications/read-all")).data; }
export async function deleteNotification(notificationId: number) { return (await api.delete(`/api/v1/notifications/${notificationId}`)).data; }
export async function getCommunityPosts(params?: { page?: number; size?: number }) {
  return (await api.get<PageResponse<CommunityPost>>("/api/v1/community/posts", { params: { page: params?.page ?? 0, size: params?.size ?? 15 } })).data;
}
export async function getUserPosts(userId: number, params?: { page?: number; size?: number }) {
  return (await api.get<PageResponse<CommunityPost>>(`/api/v1/community/users/${userId}/posts`, { params: { page: params?.page ?? 0, size: params?.size ?? 15 } })).data;
}
export async function createCommunityPost(payload: CommunityPostPayload) { return (await api.post<CommunityPost>("/api/v1/community/posts", payload)).data; }
export async function commentOnCommunityPost(postId: number, payload: CommunityCommentPayload) { return (await api.post<CommunityComment>(`/api/v1/community/posts/${postId}/comments`, payload)).data; }
export async function reactToCommunityPost(postId: number, payload: CommunityReactionPayload) { return (await api.post<CommunityPost>(`/api/v1/community/posts/${postId}/reactions`, payload)).data; }
export async function toggleCommunityPostLike(postId: number) { return (await api.post<CommunityPost>(`/api/v1/community/posts/${postId}/likes/toggle`)).data; }
export async function getChallengeDiscussion(challengeId: number) { return (await api.get<CommunityComment[]>(`/api/v1/community/challenges/${challengeId}/discussion`)).data; }
export async function commentOnChallengeDiscussion(challengeId: number, payload: CommunityCommentPayload) { return (await api.post<CommunityComment>(`/api/v1/community/challenges/${challengeId}/discussion`, payload)).data; }
export async function deleteHabit(habitId: number) { return (await api.delete(`/api/v1/habits/${habitId}`)).data; }
export async function leaveChallenge(challengeId: number) { return (await api.post(`/api/v1/challenges/${challengeId}/leave`)).data; }
export async function getHabitCategories() { return (await api.get<HabitCategory[]>("/api/v1/habits/categories")).data; }
export async function createHabitCategory(payload: { name: string }) { return (await api.post<HabitCategory>("/api/v1/habits/categories", payload)).data; }
export async function moderateChallenge(challengeId: number, payload: AdminModerationPayload) { return (await api.post(`/api/v1/admin/challenges/${challengeId}/moderation`, payload)).data; }
export async function moderatePost(postId: number, payload: AdminModerationPayload) { return (await api.post(`/api/v1/admin/posts/${postId}/moderation`, payload)).data; }
export async function moderateComment(commentId: number, payload: AdminModerationPayload) { return (await api.post(`/api/v1/admin/comments/${commentId}/moderation`, payload)).data; }
export async function blockUserAsAdmin(userId: number, payload: AdminUserStatusPayload) { return (await api.post(`/api/v1/admin/users/${userId}/block`, payload)).data; }
export async function unblockUserAsAdmin(userId: number) { return (await api.post(`/api/v1/admin/users/${userId}/unblock`)).data; }
export async function grantAdminRole(userId: number) { return (await api.post(`/api/v1/admin/users/${userId}/grant-admin`)).data; }
export async function getGoogleCalendarAgenda() { return (await api.get<GoogleCalendarAgenda>("/api/v1/integrations/google/calendar/agenda")).data; }
export async function getGoogleCalendarConnectLink(redirectPath = "/extras/calendar") {
  return (await api.get<GoogleCalendarConnectLink>("/api/v1/integrations/google/calendar/connect-link", { params: { redirectPath } })).data;
}
export async function syncGoogleCalendarHabits() { return (await api.post<GoogleCalendarSyncResult>("/api/v1/integrations/google/calendar/sync-habits")).data; }
export async function disconnectGoogleCalendar() { return (await api.post<GoogleCalendarConnection>("/api/v1/integrations/google/calendar/disconnect")).data; }
export async function getWeatherWellness(city?: string) { return (await api.get<WeatherWellness>("/api/v1/integrations/weather/wellness", { params: city ? { city } : {} })).data; }
