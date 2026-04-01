import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthResponse } from "./types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresInSeconds: number | null;
  refreshExpiresInSeconds: number | null;
  setTokens: (payload: AuthResponse) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresInSeconds: null,
      refreshExpiresInSeconds: null,
      setTokens: (payload) =>
        set({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          expiresInSeconds: payload.accessTokenExpiresInSeconds,
          refreshExpiresInSeconds: payload.refreshTokenExpiresInSeconds
        }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresInSeconds: null,
          refreshExpiresInSeconds: null
        })
    }),
    {
      name: "healthgame-auth",
      storage: createJSONStorage(() => localStorage)
    }
  )
);