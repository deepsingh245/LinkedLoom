import type { UserPreferences } from "@/types";

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  density: "comfortable",
  animationsEnabled: true,
  notifications: {
    postPublished: true,
    weeklyDigest: true,
    aiSuggestions: false,
    commentAlerts: true,
    milestoneAlerts: true,
    productUpdates: false,
  },
  ai: {
    defaultTone: "professional",
    language: "english",
    autoHashtags: true,
    smartSuggestions: true,
  },
  privacy: {
    publicProfile: true,
    analyticsSharing: false,
    twoFactorAuth: false,
  },
};

/** Saved preferences can be partial (older accounts, or only the theme was ever saved): fill the gaps with defaults. */
export function mergePreferences(saved?: Partial<UserPreferences> | null): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...saved,
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...saved?.notifications },
    ai: { ...DEFAULT_PREFERENCES.ai, ...saved?.ai },
    privacy: { ...DEFAULT_PREFERENCES.privacy, ...saved?.privacy },
  };
}

/** Applies display preferences that are plain CSS switches (see globals.css). */
export function applyDisplayPreferences(prefs: UserPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.motion = prefs.animationsEnabled === false ? "reduced" : "full";
}
