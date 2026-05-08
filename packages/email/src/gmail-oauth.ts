import { OAuth2Client } from "google-auth-library";

export function createGoogleOAuthClient(): OAuth2Client | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

export function gmailConsentUrl(oauth2: OAuth2Client, state: string): string {
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://mail.google.com/"],
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(oauth2: OAuth2Client, code: string) {
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export async function refreshAccessToken(
  oauth2: OAuth2Client,
  refreshToken: string,
): Promise<{ accessToken: string; expiryDate?: number }> {
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2.refreshAccessToken();
  const accessToken = credentials.access_token;
  if (!accessToken) {
    throw new Error("gmail_no_access_token");
  }
  return {
    accessToken,
    expiryDate: credentials.expiry_date ?? undefined,
  };
}
