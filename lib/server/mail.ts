import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import { getEnv } from "./env";

export async function sendAccountEmail(to: string, subject: string, url: string) {
  const env = getEnv();
  const message = {
    from: env.MAIL_FROM,
    to,
    subject,
    text: `${subject}\n\nAcesse o link para continuar:\n${url}\n\nSe você não solicitou esta ação, ignore este e-mail.`,
  };

  if (env.MAIL_TRANSPORT === "file") {
    const directory = resolve(env.MAIL_OUTBOX_DIR);

    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(directory, `${randomUUID()}.json`), JSON.stringify(message), {
      mode: 0o600,
      flag: "wx",
    });

    return;
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });

  await transport.sendMail(message);
}
