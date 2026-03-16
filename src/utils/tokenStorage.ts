import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

const TOKEN_KEY = "app_jwt_token";
const ENCRYPTED_EMAIL_KEY = "app_encrypted_email";

const isNative = () => Capacitor.getPlatform() !== "web";

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
    if (value) return value;


    try {
      const raw = localStorage.getItem("auth_current_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw || "null");
      if (!parsed) return null;

      // Map common tokenStorage keys to fields on the stored user
      if (key === "user_id") return parsed.id ?? null;
      if (key === "user_email") return parsed.email ?? null;
      if (key === "user_firstName") return parsed.firstName ?? null;
      if (key === "user_lastName") return parsed.lastName ?? null;
      if (key === "user_mobile") return parsed.mobile ?? null;
      if (key === "user_gender") return parsed.gender ?? null;
      if (key === "user_name") return parsed.name ?? (parsed.firstName ? `${parsed.firstName}${parsed.lastName ? ' ' + parsed.lastName : ''}` : null);
    } catch {
      // ignore JSON parse/storage errors and fall through to null
    }

    return null;
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

/* Auth helpers */
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
  await removeItem("user_email");
  await removeItem("user_mobile");
  await removeItem("user_gender");
  await removeItem("user_id");
  await removeItem("otp_token");
  await removeItem("otp_resend_attempts");
  await removeItem("otp_lock_until");
  await removeItem("otp_cooldown_until");
  await removeItem("otp_sent_at");
  await removeItem("otp_expiry");
}


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
