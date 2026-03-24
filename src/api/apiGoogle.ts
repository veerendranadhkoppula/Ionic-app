
const API_BASE = "https://endpoint.whitemantis.ae/api";

export interface GoogleAuthResponse {
  success: boolean;
  message: string;
  token: string;
  isNewUser: boolean;
  user: {
    id: string | number;
    email: string;
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  };
}

/**
 * Exchange a Google idToken for a WhiteMantis session JWT.
 *
 * @param googleToken  The `idToken` returned by Google Sign-In
 * @throws             Error with a human-readable message on failure
 */
export async function postGoogleAuth(googleToken: string): Promise<GoogleAuthResponse> {
  const res = await fetch(`${API_BASE}/app/google-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ googleToken }),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an invalid response");
  }

  if (!res.ok || !data.success) {
    throw new Error((data.error as string) || `Google auth failed (${res.status})`);
  }

  return data as unknown as GoogleAuthResponse;
}
