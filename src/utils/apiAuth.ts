export const API_BASE = "https://endpoint.whitemantis.ae/api";

import tokenStorage from "./tokenStorage";

const jsonHeaders = { "Content-Type": "application/json" };

async function buildHeaders(baseHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...baseHeaders };

  try {
    const token = await tokenStorage.getToken();

    if (token) {
      headers["Authorization"] = `JWT ${token}`;
    }
  } catch {
    // ignore storage errors
  }

  return headers;
}

async function post(path: string, body: unknown) {
  const url = `${API_BASE}${path}`;
  const headers = await buildHeaders(jsonHeaders);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${url} failed ${res.status}: ${text}`);
  }

  return res.json();
}

export type ApiUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  gender?: string;
};

export async function sendOtp(
  email: string,
): Promise<{ encryptedEmail: string }> {
  const res = await fetch(`${API_BASE}/otp/send-app`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!data?.success) {
    throw new Error(data?.message || "OTP send failed");
  }

  return {
    encryptedEmail: data.email,
  };
}

export async function verifyOtp(
  encryptedEmail: string,
  otp: string,
): Promise<{
  isNewUser: boolean;
  token: string;
  user: ApiUser;
}> {
  const res = await fetch(`${API_BASE}/otp/verify-app`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      email: encryptedEmail,
      otp,
    }),
  });

  const data = await res.json();

  if (!data?.success || !data?.valid) {
    throw new Error("OTP verification failed");
  }

  // Save JWT immediately
  if (data.token) {
    await tokenStorage.setToken(data.token);
  }

  return {
    isNewUser: data.isNewUser,
    token: data.token,
    user: {
      id: data.user?.id || data.user?._id,
      email: data.user?.email,
      firstName: data.user?.firstName,
      lastName: data.user?.lastName,
      mobile: data.user?.mobile,
      gender: data.user?.gender,
    },
  };
}

export async function getProfile(encryptedEmail: string): Promise<ApiUser> {
  return post("/application/auth/user-auth/profile", {
    encryptedEmail,
  });
}

export async function prefillEmail(
  encryptedEmail: string,
): Promise<{ email: string }> {
  return post("/application/auth/user-auth/prefill", {
    encryptedEmail,
  });
}
export async function getUserById(userId: string) {
  const token = await tokenStorage.getToken();

  const res = await fetch(
    `${API_BASE.replace("/api", "")}/api/users/${userId}?depth=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
       Authorization: `JWT ${token}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();

  return data?.doc || data;
}

export async function changeEmailOtp(email: string) {
 

  const res = await post("/users/app-change-email", { email });



  if (!res?.success) {
    throw new Error(res?.message || "Failed to send OTP");
  }

  return res;
}
export async function verifyChangeEmail(encryptedEmail: string, otp: string) {


  const res = await post("/users/app-verify-change-email", {
    email: encryptedEmail,
    otp,
  });



  if (!res?.success || !res?.valid) {
    throw new Error(res?.message || "OTP verification failed");
  }

  return res;
}
export default {
  sendOtp,
  verifyOtp,
  getProfile,
  prefillEmail,
  changeEmailOtp,
  verifyChangeEmail,
};
