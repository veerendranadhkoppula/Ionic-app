import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export const ONBOARDING_KEY = 'hasSeenOnboarding';

// ── Async (Capacitor Preferences on native, localStorage on web) ──────────

export async function setHasSeenOnboardingAsync(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
    }
    // Always mirror to localStorage so synchronous callers still work on web
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

export async function getHasSeenOnboardingAsync(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: ONBOARDING_KEY });
      if (value === 'true') return true;
    }
    // Fallback to localStorage (covers web + legacy data)
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function clearHasSeenOnboardingAsync(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: ONBOARDING_KEY });
    }
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

// ── Sync shims kept for any existing callers (web only / fallback) ─────────

export function setHasSeenOnboarding() {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    // Fire-and-forget for native so the Preferences store is updated too
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: ONBOARDING_KEY, value: 'true' }).catch(() => {});
    }
  } catch {
    // ignore storage errors
  }
}

export function getHasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function clearHasSeenOnboarding() {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
    if (Capacitor.isNativePlatform()) {
      Preferences.remove({ key: ONBOARDING_KEY }).catch(() => {});
    }
  } catch {
    // ignore
  }
}
