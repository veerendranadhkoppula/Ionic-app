const API_BASE = "https://endpoint.whitemantis.ae/api";

export interface AppleAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  appleSubId: string;
  isApplePrivateEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppleAuthResponse {
  success: boolean;
  token: string;
  user: AppleAuthUser;
  isNewUser: boolean;
  isApplePrivateEmail: boolean;
  needsContactEmail: boolean;
}

export async function postAppleAuth(
  appleToken: string,
  firstName: string = "",
  lastName: string = "",
): Promise<AppleAuthResponse> {
  const res = await fetch(`${API_BASE}/app/apple-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appleToken, firstName, lastName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Apple sign-in failed. Please try again.",
    );
  }

  return res.json();
}
