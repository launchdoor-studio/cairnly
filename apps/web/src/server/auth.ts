import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import * as schema from "@cairnly/db";
import { createDb } from "@cairnly/db";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

const authUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://cairnly:change-me@localhost:5432/cairnly";
const workspaceId = process.env.CAIRNLY_DEFAULT_WORKSPACE_ID ?? "dev_workspace";

function parseCommaSeparatedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Extra origins for CSRF/origin checks (e.g. `next dev -p 3002` while BETTER_AUTH_URL stays on :3000). */
function extraTrustedOrigins(): string[] {
  const fromEnv = parseCommaSeparatedOrigins(
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  );
  const fromPort =
    process.env.NODE_ENV !== "production" &&
    typeof process.env.PORT === "string" &&
    /^[0-9]+$/.test(process.env.PORT)
      ? [
          `http://localhost:${process.env.PORT}`,
          `http://127.0.0.1:${process.env.PORT}`,
        ]
      : [];

  const merged = [...fromEnv];
  for (const origin of fromPort) {
    if (!merged.includes(origin)) {
      merged.push(origin);
    }
  }

  return merged;
}

const trustedOrigins = extraTrustedOrigins();

export const auth = betterAuth({
  baseURL: authUrl,
  ...(trustedOrigins.length ? { trustedOrigins } : {}),
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-change-me-dev-only-change-me-32",
  database: drizzleAdapter(createDb({ connectionString: databaseUrl, max: 5 }), {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      passkey: schema.passkeys,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      workspaceId: {
        type: "string",
        required: false,
        defaultValue: workspaceId,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
        input: false,
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 5 * 60,
      sendMagicLink: async ({ email, url }) => {
        process.stdout.write(`Cairnly magic link for ${email}: ${url}\n`);
      },
    }),
    passkey({
      rpID: new URL(authUrl).hostname,
      rpName: "Cairnly",
      origin: authUrl,
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
