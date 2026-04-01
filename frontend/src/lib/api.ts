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
  Habit,
  HabitCheckin,
  HabitTimelineDay,
  PageResponse,
  TodayHabit,
  UserProfile
} from "./types";

function normalizeApiBaseUrl(baseUrl: string | undefined) {
  // Р’ РєРѕРґРµ СЌРЅРґРїРѕРёРЅС‚С‹ СѓР¶Рµ СЃРѕРґРµСЂР¶Р°С‚ РїСЂРµС„РёРєСЃ `/api/v1/...`,
  // РїРѕСЌС‚РѕРјСѓ `VITE_API_BASE_URL` РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ "С…РѕСЃС‚" Р±РµР· `/api`.
  const raw = (baseUrl ?? "").trim();
  // Р•СЃР»Рё РїРµСЂРµРјРµРЅРЅР°СЏ РЅРµ Р·Р°РґР°РЅР°, РёСЃРїРѕР»СЊР·СѓРµРј РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Рµ Р·Р°РїСЂРѕСЃС‹ (Vite proxy РёР»Рё same-origin).
  if (!raw) return "";
  const normalized = raw.replace(/\/+$/, "");
  return normalized.replace(/\/api$/, "");
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
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
  phone: string;
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

export async function login(payload: LoginPayload) { return (await api.post<AuthResponse>("/api/v1/auth/login", payload)).data; }
export async function register(payload: RegisterPayload) { return (await api.post("/api/v1/auth/register", payload)).data; }
export async function logout() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return;
  await api.post("/api/v1/auth/logout", { refreshToken });
}
export async function getCurrentUser() { return (await api.get<UserProfile>("/api/v1/users/me")).data; }
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
export async function getCommunityPosts() { return (await api.get<PageResponse<CommunityPost>>("/api/v1/community/posts", { params: { page: 0, size: 20 } })).data; }
export async function createCommunityPost(payload: CommunityPostPayload) { return (await api.post<CommunityPost>("/api/v1/community/posts", payload)).data; }
export async function commentOnCommunityPost(postId: number, payload: CommunityCommentPayload) { return (await api.post<CommunityComment>(`/api/v1/community/posts/${postId}/comments`, payload)).data; }
export async function toggleCommunityPostLike(postId: number) { return (await api.post<CommunityPost>(`/api/v1/community/posts/${postId}/likes/toggle`)).data; }
export async function getChallengeDiscussion(challengeId: number) { return (await api.get<CommunityComment[]>(`/api/v1/community/challenges/${challengeId}/discussion`)).data; }
export async function commentOnChallengeDiscussion(challengeId: number, payload: CommunityCommentPayload) { return (await api.post<CommunityComment>(`/api/v1/community/challenges/${challengeId}/discussion`, payload)).data; }

export async function deleteHabit(habitId: number) { return (await api.delete(`/api/v1/habits/${habitId}`)).data; }
export async function leaveChallenge(challengeId: number) { return (await api.post(`/api/v1/challenges/${challengeId}/leave`)).data; }

export async function getHabitCategories() {
  return (await api.get<HabitCategory[]>("/api/v1/habits/categories")).data;
}

export async function createHabitCategory(payload: { name: string }) {
  return (await api.post<HabitCategory>("/api/v1/habits/categories", payload)).data;
}


