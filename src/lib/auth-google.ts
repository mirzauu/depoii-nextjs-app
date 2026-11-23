import { randomBytes } from "node:crypto";
import { googleAuthConfigured, signAuthPayload, verifyAuthPayload } from "@/lib/auth";

export { googleAuthConfigured };

export const GOOGLE_OAUTH_COOKIE = "depoii_oauth_state";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function safeNext(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export function getAppOrigin(req: Request): string {
  const envUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:4417";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export function getGoogleCallbackUrl(req: Request): string {
  return `${getAppOrigin(req)}/api/auth/google/callback`;
}

export type OAuthStatePayload = {
  state: string;
  next: string;
  iat: number;
};

export function createGoogleOAuthState(next?: string | null): { stateToken: string } {
  const nonce = randomBytes(24).toString("hex");
  const payloadObj: OAuthStatePayload = {
    state: nonce,
    next: safeNext(next),
    iat: Date.now(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const mac = signAuthPayload(payloadStr);
  const stateToken = `${payloadStr}.${mac}`;

  return { stateToken };
}

export function verifyGoogleOAuthState(
  cookieToken?: string | null,
  paramToken?: string | null,
): { valid: true; next: string } | { valid: false; error: string } {
  if (!cookieToken || !paramToken) {
    return { valid: false, error: "Missing OAuth state token." };
  }

  if (cookieToken !== paramToken) {
    return { valid: false, error: "OAuth state token mismatch." };
  }

  const [payloadStr, mac] = paramToken.split(".");
  if (!payloadStr || !mac) {
    return { valid: false, error: "Malformed OAuth state token." };
  }

  if (!verifyAuthPayload(payloadStr, mac)) {
    return { valid: false, error: "Invalid OAuth state signature." };
  }

  let data: OAuthStatePayload;
  try {
    data = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
  } catch {
    return { valid: false, error: "Corrupted OAuth state payload." };
  }

  if (!data.state || typeof data.iat !== "number") {
    return { valid: false, error: "Incomplete OAuth state payload." };
  }

  if (Date.now() - data.iat > OAUTH_STATE_TTL_MS) {
    return { valid: false, error: "OAuth state token has expired." };
  }

  return { valid: true, next: safeNext(data.next) };
}

export function buildGoogleAuthorizeUrl(redirectUri: string, stateToken: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", stateToken);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "online");

  return url.toString();
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; id_token?: string } | { error: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return { error: "Google OAuth credentials are not configured." };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      id_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || !data.access_token) {
      console.error("[auth-google] token exchange failed:", data);
      return { error: data.error_description || data.error || "Token exchange failed." };
    }

    return { access_token: data.access_token, id_token: data.id_token };
  } catch (err) {
    console.error("[auth-google] token exchange request error:", err);
    return { error: "Failed to connect to Google OAuth server." };
  }
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleProfile(
  accessToken: string,
): Promise<{ user: GoogleUserInfo } | { error: string }> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await res.json().catch(() => ({}))) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || !data.sub || !data.email) {
      console.error("[auth-google] userinfo fetch failed:", data);
      return { error: data.error_description || data.error || "Failed to fetch user profile." };
    }

    return {
      user: {
        sub: data.sub,
        email: data.email,
        email_verified: Boolean(data.email_verified),
        name: data.name,
        picture: data.picture,
      },
    };
  } catch (err) {
    console.error("[auth-google] userinfo request error:", err);
    return { error: "Failed to fetch user info from Google." };
  }
}
