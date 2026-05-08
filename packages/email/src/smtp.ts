import nodemailer from "nodemailer";

export type SendMailInput = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

export type WorkspaceSmtpEnv = {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
};

export function smtpConfigFromEnv(env = process.env): WorkspaceSmtpEnv | null {
  const host = env.CAIRNLY_SMTP_HOST ?? env.SMTP_HOST;
  if (!host) {
    return null;
  }
  const portRaw = env.CAIRNLY_SMTP_PORT ?? env.SMTP_PORT ?? "587";
  const port = Number(portRaw);
  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user: env.CAIRNLY_SMTP_USER ?? env.SMTP_USER,
    pass: env.CAIRNLY_SMTP_PASS ?? env.SMTP_PASS,
    secure: (env.CAIRNLY_SMTP_SECURE ?? env.SMTP_SECURE) === "1" || port === 465,
  };
}

export function createSmtpTransport(config: WorkspaceSmtpEnv) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure ?? false,
    auth:
      config.user && config.pass
        ? {
            user: config.user,
            pass: config.pass,
          }
        : undefined,
  });
}

export async function sendWorkspaceSmtp(
  config: WorkspaceSmtpEnv | null,
  input: SendMailInput,
): Promise<void> {
  if (!config?.host) {
    throw new Error("smtp_not_configured");
  }
  const transport = createSmtpTransport(config);
  await transport.sendMail({
    from: input.from,
    to: input.to.join(", "),
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
