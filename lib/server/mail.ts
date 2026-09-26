import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getEnv } from "./env";

type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

async function sendEmail(message: EmailMessage): Promise<void> {
  const env = getEnv();

  if (env.MAIL_TRANSPORT === "disabled") {
    throw new Error("O envio de e-mail ainda não está configurado.");
  }

  if (env.MAIL_TRANSPORT === "file") {
    const directory = resolve(env.MAIL_OUTBOX_DIR);

    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(directory, `${randomUUID()}.json`), JSON.stringify(message), {
      mode: 0o600,
      flag: "wx",
    });

    return;
  }

  if (env.MAIL_TRANSPORT === "resend") {
    const { error } = await new Resend(env.RESEND_API_KEY).emails.send({
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });

    if (error) throw new Error(`Falha no Resend: ${error.message}`);

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

export async function sendAccountEmail(to: string, subject: string, url: string) {
  const env = getEnv();

  await sendEmail({
    from: env.MAIL_FROM,
    to,
    subject,
    text: `${subject}\n\nAcesse o link para continuar:\n${url}\n\nSe você não solicitou esta ação, ignore este e-mail.`,
  });
}

export async function sendSupportEmail(input: {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
}): Promise<void> {
  const env = getEnv();

  await sendEmail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });
}
