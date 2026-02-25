import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface FeatureFlags {
  "phase1.ui": boolean;
  "phase1.deals": boolean;
  "phase1.dealDetail": boolean;
  "phase1.onboarding": boolean;
  "phase1.programs": boolean;
  "phase1.sidebar": boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  "phase1.ui": true,
  "phase1.deals": true,
  "phase1.dealDetail": true,
  "phase1.onboarding": true,
  "phase1.programs": true,
  "phase1.sidebar": true,
};

interface FeatureFlagContextType {
  flags: FeatureFlags;
  isEnabled: (flag: keyof FeatureFlags) => boolean;
  setFlag: (flag: keyof FeatureFlags, value: boolean) => void;
  enableAll: () => void;
  disableAll: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

function loadFlags(): FeatureFlags {
  const flags = { ...DEFAULT_FLAGS };

  // Check environment variable for master toggle
  try {
    const envFlag = (import.meta as any).env?.VITE_ENABLE_PHASE1_UI;
    if (envFlag === "true") {
      Object.keys(flags).forEach((key) => {
        (flags as any)[key] = true;
      });
    }
  } catch {}

  // Override with localStorage values (per-flag granularity)
  try {
    const stored = localStorage.getItem("lendry_feature_flags");
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.keys(flags).forEach((key) => {
        if (typeof parsed[key] === "boolean") {
          (flags as any)[key] = parsed[key];
        }
      });
    }
  } catch {}

  return flags;
}

function saveFlags(flags: FeatureFlags) {
  try {
    localStorage.setItem("lendry_feature_flags", JSON.stringify(flags));
  } catch {}
}

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(loadFlags);

  const isEnabled = useCallback(
    (flag: keyof FeatureFlags) => {
      // Master toggle: if phase1.ui is off, all phase1 flags are off
      if (flag !== "phase1.ui" && !flags["phase1.ui"]) {
        return false;
      }
      return flags[flag];
    },
    [flags]
  );

  const setFlag = useCallback((flag: keyof FeatureFlags, value: boolean) => {
    setFlags((prev) => {
      const next = { ...prev, [flag]: value };
      saveFlags(next);
      return next;
    });
  }, []);

  const enableAll = useCallback(() => {
    const allOn = { ...DEFAULT_FLAGS };
    Object.keys(allOn).forEach((key) => {
      (allOn as any)[key] = true;
    });
    setFlags(allOn);
    saveFlags(allOn);
  }, []);

  const disableAll = useCallback(() => {
    setFlags(DEFAULT_FLAGS);
    saveFlags(DEFAULT_FLAGS);
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, setFlag, enableAll, disableAll }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    // Graceful fallback if provider not mounted — all flags off
    return {
      flags: DEFAULT_FLAGS,
      isEnabled: () => false,
      setFlag: () => {},
      enableAll: () => {},
      disableAll: () => {},
    } as FeatureFlagContextType;
  }
  return context;
}
