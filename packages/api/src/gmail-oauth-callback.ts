import { createHmac } from "node:crypto";
import type { Db } from "@cairnly/db";
import { users } from "@cairnly/db";
import { createGoogleOAuthClient, exchangeCodeForTokens } from "@cairnly/email";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";

import { createEmailRepository } from "./repositories/email-repository";

type StatePayload = {
  workspaceId: string;
  userId: string;
  nonce: string;
  exp: number;
};

function parseState(state: string, secret: string): StatePayload {
  const last = state.lastIndexOf(".");
  if (last <= 0) {
    throw new Error("invalid_state");
  }
  const body = state.slice(0, last);
  const sig = state.slice(last + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (sig !== expected) {
    throw new Error("invalid_state_signature");
  }
  const json = Buffer.from(body, "base64url").toString("utf8");
  const parsed = JSON.parse(json) as StatePayload;
  if (typeof parsed.workspaceId !== "string" || typeof parsed.userId !== "string") {
    throw new Error("invalid_state_body");
  }
  if (parsed.exp < Date.now()) {
    throw new Error("state_expired");
  }
  return parsed;
}

export async function completeGmailOAuthCallback(
  db: Db,
  input: {
    code: string;
    state: string;
    secret: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const oauth2 = createGoogleOAuthClient();
    if (!oauth2) {
      return { ok: false, message: "not_configured" };
    }

    const payload = parseState(input.state, input.secret);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, payload.userId), eq(users.workspaceId, payload.workspaceId)),
      )
      .limit(1);

    if (!user) {
      return { ok: false, message: "user_mismatch" };
    }

    const tokens = await exchangeCodeForTokens(oauth2, input.code);
    const access = tokens.access_token;
    if (!access) {
      return { ok: false, message: "no_access_token" };
    }

    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    if (!profileRes.ok) {
      return { ok: false, message: "profile_failed" };
    }
    const profile = (await profileRes.json()) as { emailAddress?: string };
    const address = profile.emailAddress?.trim().toLowerCase();
    if (!address) {
      return { ok: false, message: "no_email" };
    }

    const emailRepo = createEmailRepository(db);
    const oauthPayload: Record<string, unknown> = {};
    if (tokens.refresh_token) {
      oauthPayload.refresh_token = tokens.refresh_token;
    }
    if (tokens.access_token) {
      oauthPayload.access_token = tokens.access_token;
    }
    if (tokens.expiry_date != null) {
      oauthPayload.expiry_date = tokens.expiry_date;
    }
    if (tokens.scope) {
      oauthPayload.scope = tokens.scope;
    }
    if (tokens.token_type) {
      oauthPayload.token_type = tokens.token_type;
    }

    await emailRepo.insertAccount({
      id: createId(),
      workspaceId: payload.workspaceId,
      provider: "gmail",
      address,
      oauthToken: oauthPayload,
      imapConfig: {},
      syncState: { lastImapUid: 0 },
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return { ok: false, message: msg };
  }
}
