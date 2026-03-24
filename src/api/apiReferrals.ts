import tokenStorage from "../utils/tokenStorage";
import { API_BASE } from "../utils/apiAuth";

export type ValidateReferralResult = {
  valid: boolean;
  unavailable?: boolean;
  referrer?: { id: string; firstName?: string; lastName?: string } | null;
  message?: string;
};


export async function validateReferralCode(code: string): Promise<ValidateReferralResult> {
  if (!code || code.trim().length === 0) {
    return { valid: false, message: "No code provided" };
  }

  const url = `${API_BASE}/users/validate-referral`;

  const token = await tokenStorage.getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  try {
    // Backend expects { referralCode: string } in the request body
    console.debug('[apiReferrals] validateReferralCode -> sending request', { url, payload: { referralCode: code.trim() } });
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ referralCode: code.trim() }),
    });

    console.debug('[apiReferrals] validateReferralCode -> received status', { status: res.status });

    if (!res.ok) {
      // If the endpoint isn't present (404) treat validation as temporarily unavailable
      if (res.status === 404) {
        console.debug('[apiReferrals] validateReferralCode -> endpoint not found (404)');
        return { valid: false, unavailable: true, message: 'Validation service unavailable' };
      }
      // Try to read json error message
      const json = await res.json().catch(() => null);
      console.debug('[apiReferrals] validateReferralCode -> error json', json);
      const message = json?.message || json?.errors?.[0]?.message || `Server returned ${res.status}`;
      return { valid: false, message };
    }

    const json = await res.json();
    console.debug('[apiReferrals] validateReferralCode -> success json', json);
    // Expect { valid: boolean, referrer?: { id, firstName, lastName }, message?: string }
    return {
      valid: !!json?.valid,
      referrer: json?.referrer ?? null,
      message: json?.message,
    };
  } catch (err) {
    // err may be unknown; try to read message safely
  console.error('[apiReferrals] validateReferralCode -> network/error', err);
  const msg = (err && typeof err === 'object' && 'message' in err) ? (err as Error).message : String(err);
    return { valid: false, message: msg || "Network error" };
  }
}

export function buildInviteText(code: string, appLink: string) {
  const safeCode = code || "";
  const link = appLink || "";
  return `Join WhiteMantis and get a free stamp when you order. Use my code ${safeCode} when you sign up: ${link}`;
}

export default { validateReferralCode, buildInviteText };
