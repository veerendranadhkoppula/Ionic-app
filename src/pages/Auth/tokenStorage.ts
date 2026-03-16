import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

const TOKEN_KEY = "app_jwt_token";
const ENCRYPTED_EMAIL_KEY = "app_encrypted_email";

const isNative = () => Capacitor.getPlatform() !== "web";

/* =========================
   Generic helpers
========================= */
export async function setItem(key: string, value: string): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } else {
    return localStorage.getItem(key);
  }
}

export async function removeItem(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

/* =========================
   Auth helpers
========================= */
export async function setToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await removeItem(TOKEN_KEY);
}

export async function setEncryptedEmail(encryptedEmail: string): Promise<void> {
  await setItem(ENCRYPTED_EMAIL_KEY, encryptedEmail);
}

export async function getEncryptedEmail(): Promise<string | null> {
  return getItem(ENCRYPTED_EMAIL_KEY);
}

export async function setUserName(name: string): Promise<void> {
  await setItem("user_name", name);
}

export async function getUserName(): Promise<string | null> {
  return getItem("user_name");
}

export async function clearAll(): Promise<void> {
  await removeItem(TOKEN_KEY);
  await removeItem(ENCRYPTED_EMAIL_KEY);
  await removeItem("user_name");
  await removeItem("otp_token");
  await removeItem("otp_resend_attempts");
  await removeItem("otp_lock_until");
  await removeItem("otp_cooldown_until");
  await removeItem("otp_sent_at");
  await removeItem("otp_expiry");
}

/* =========================
   Default export
========================= */
export default {
  setItem,
  getItem,
  removeItem,
  setToken,
  getToken,
  clearToken,
  setEncryptedEmail,
  getEncryptedEmail,
  clearAll,
  getUserName,
  setUserName,
};
