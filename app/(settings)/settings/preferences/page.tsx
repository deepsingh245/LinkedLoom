"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebase/user";
import { successToast, dangerToast } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPreferences } from "@/types";
import { useTheme } from "next-themes";

function CustomSwitch({
  checked,
  onCheckedChange,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${checked ? "bg-primary" : "bg-muted"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={disabled}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 left-1 w-4 h-4 bg-background rounded-full transition-transform duration-200 ${checked ? "translate-x-5" : "bg-muted-foreground"}`}
      ></span>
    </button>
  );
}

function SettingsRow({ title, description, control }: { title: string, description: string, control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium text-foreground">{title}</Label>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}

type PreferenceKey = keyof UserPreferences | `notifications.${keyof UserPreferences['notifications']}` | `ai.${keyof UserPreferences['ai']}` | `privacy.${keyof UserPreferences['privacy']}`;
type PreferenceValue = UserPreferences[keyof UserPreferences] | UserPreferences['notifications'][keyof UserPreferences['notifications']] | UserPreferences['ai'][keyof UserPreferences['ai']] | UserPreferences['privacy'][keyof UserPreferences['privacy']];

/**
 * Sets a value on a nested object path.
 */
function set(obj: Partial<UserPreferences>, path: string, value: PreferenceValue): Partial<UserPreferences> {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || typeof current[key] !== 'object' || current[key] === null) {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
    return obj;
}

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const { setTheme } = useTheme();

  const handleUpdate = async (
    key: PreferenceKey,
    value: PreferenceValue
  ) => {
    if (!user?.uid) return;

    try {
      // Deep copy to avoid state mutation issues
      const updatedPrefs: Partial<UserPreferences> = JSON.parse(
        JSON.stringify(profile?.preferences || {})
      );

      set(updatedPrefs, key, value);

      // If the theme is being updated, also update it in the app
      if (key === "theme") {
        setTheme(value as string);
      }

      await updateUserProfile(user.uid, {
        preferences: updatedPrefs as UserPreferences,
      });
      successToast("Preferences updated.");
    } catch (error) {
      console.error("Failed to update preferences:", error);
      dangerToast("Failed to save changes.");
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading preferences...</div>;
  }

  const prefs: UserPreferences = profile?.preferences || {
    theme: "dark",
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

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-1">
          Settings
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Customize your experience and preferences.
        </p>
      </div>

      {/* Appearance */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="space-y-2">
              <Label className="text-[13px] text-muted-foreground">Theme</Label>
              <Select
                value={prefs.theme || "dark"}
                onValueChange={(val) => handleUpdate("theme", val as UserPreferences["theme"])}
              >
                <SelectTrigger className="w-full bg-background border-border text-foreground focus:ring-primary shadow-none h-10 rounded-lg">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 opacity-50 cursor-not-allowed">
              <Label className="text-[13px] text-muted-foreground">Density</Label>
              <Select
                value={prefs.density || "comfortable"}
                onValueChange={(val) => handleUpdate("density", val as UserPreferences["density"])}
                disabled
              >
                <SelectTrigger className="w-full bg-background border-border text-foreground focus:ring-primary shadow-none h-10 rounded-lg">
                  <SelectValue placeholder="Density" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-foreground">
                  Animations & Transitions
                </Label>
                <p className="text-[13px] text-muted-foreground">
                  Disable for reduced-motion experience
                </p>
              </div>
              <CustomSwitch
                checked={prefs.animationsEnabled !== false}
                onCheckedChange={(val) => handleUpdate("animationsEnabled", val)}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border rounded-2xl opacity-50 cursor-not-allowed">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <SettingsRow
            title="Post Published"
            description="When your scheduled posts go live"
            control={
              <CustomSwitch
                checked={!!prefs.notifications?.postPublished}
                onCheckedChange={(val) => handleUpdate("notifications.postPublished", val)}
                disabled
              />
            }
          />
          <SettingsRow
            title="Weekly Digest"
            description="Performance summary every Monday"
            control={
              <CustomSwitch
                checked={!!prefs.notifications?.weeklyDigest}
                onCheckedChange={(val) => handleUpdate("notifications.weeklyDigest", val)}
                disabled
              />
            }
          />
          <SettingsRow
            title="AI Suggestions"
            description="New post ideas based on your best content"
            control={
              <CustomSwitch
                checked={!!prefs.notifications?.aiSuggestions}
                onCheckedChange={(val) => handleUpdate("notifications.aiSuggestions", val)}
                disabled
              />
            }
          />
          <SettingsRow
            title="Comment Alerts"
            description="Notify when posts receive comments"
            control={
              <CustomSwitch
                checked={!!prefs.notifications?.commentAlerts}
                onCheckedChange={(val) => handleUpdate("notifications.commentAlerts", val)}
                disabled
              />
            }
          />
          <SettingsRow
            title="Milestone Alerts"
            description="When you hit follower or view milestones"
            control={
              <CustomSwitch
                checked={!!prefs.notifications?.milestoneAlerts}
                onCheckedChange={(val) => handleUpdate("notifications.milestoneAlerts", val)}
                disabled
              />
            }
          />
          <SettingsRow
            title="Product Updates"
            description="LinkedLoom new features and announcements"
            control={
              <CustomSwitch
                checked={!!prefs.notifications?.productUpdates}
                onCheckedChange={(val) => handleUpdate("notifications.productUpdates", val)}
                disabled
              />
            }
          />
        </CardContent>
      </Card>

      {/* AI Preferences */}
      <Card className="bg-card border-border rounded-2xl opacity-50 cursor-not-allowed">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            AI Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="space-y-2">
              <Label className="text-[13px] text-muted-foreground">Default Tone</Label>
              <Select
                value={prefs.ai?.defaultTone || "professional"}
                onValueChange={(val) => handleUpdate("ai.defaultTone", val)}
                disabled
              >
                <SelectTrigger className="w-full bg-background border-border text-foreground focus:ring-primary shadow-none h-10 rounded-lg">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="viral">Viral</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] text-muted-foreground">Content Language</Label>
              <Select
                value={prefs.ai?.language || "english"}
                onValueChange={(val) => handleUpdate("ai.language", val)}
                disabled
              >
                <SelectTrigger className="w-full bg-background border-border text-foreground focus:ring-primary shadow-none h-10 rounded-lg">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <SettingsRow
              title="Auto-add Hashtags"
              description="Automatically append relevant hashtags"
              control={
                <CustomSwitch
                  checked={!!prefs.ai?.autoHashtags}
                  onCheckedChange={(val) => handleUpdate("ai.autoHashtags", val)}
                  disabled
                />
              }
            />
            <SettingsRow
              title="Smart Suggestions"
              description="Show AI-powered topic ideas in your dashboard"
              control={
                <CustomSwitch
                  checked={!!prefs.ai?.smartSuggestions}
                  onCheckedChange={(val) => handleUpdate("ai.smartSuggestions", val)}
                  disabled
                />
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="bg-card border-border rounded-2xl opacity-50 cursor-not-allowed">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <SettingsRow
            title="Public Profile"
            description="Allow others to view your LinkedLoom profile"
            control={
              <CustomSwitch
                checked={!!prefs.privacy?.publicProfile}
                onCheckedChange={(val) => handleUpdate("privacy.publicProfile", val)}
                disabled
              />
            }
          />
          <SettingsRow
            title="Analytics Sharing"
            description="Share anonymized data to improve AI quality"
            control={
              <CustomSwitch
                checked={!!prefs.privacy?.analyticsSharing}
                onCheckedChange={(val) => handleUpdate("privacy.analyticsSharing", val)}
                disabled
              />
            }
          />
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">
                Two-Factor Authentication
              </Label>
              <p className="text-[13px] text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${prefs.privacy?.twoFactorAuth ? "bg-primary" : "bg-amber-500"}`}
                ></span>
                <span
                  className={`text-[11px] font-medium ${prefs.privacy?.twoFactorAuth ? "text-primary" : "text-amber-500"}`}
                >
                  {prefs.privacy?.twoFactorAuth ? "Enabled" : "Disabled"}
                </span>
              </div>
              <CustomSwitch
                checked={!!prefs.privacy?.twoFactorAuth}
                onCheckedChange={(val) => handleUpdate("privacy.twoFactorAuth", val)}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
