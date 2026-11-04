export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { contactFormSchema } from "@lib/contact-schema.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { HttpError, publicRoute } from "@lib/api/route.ts";
import { readJson } from "@lib/api/request.ts";

const CONTACT_EMAIL_TO = "hello@kanby.ai";
const CONTACT_EMAIL_FROM = "Kanby Contact Form <do-not-reply@kanby.ai>";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Read the secret at runtime via Deno.env.get(), NOT import.meta.env.
// Astro/Vite statically inlines import.meta.env.* at build time, so on Deno
// Deploy the value gets frozen in during the build — or baked as `undefined`
// when the var isn't present in the build environment — and the production
// runtime env var is ignored. Deno.env.get() is a true runtime lookup.
const apiKey = Deno.env.get("RESEND_API_KEY");
if (!apiKey) {
  console.error("RESEND_API_KEY is not set in environment variables.");
}
const resend = apiKey ? new Resend(apiKey) : null;

// The contact form, emailed to CONTACT_EMAIL_TO. Validation messages are shown
// to the visitor, so unlike parseBody() the first issue is sent back.
export const POST = publicRoute(async ({ request }) => {
  if (!resend) throw new HttpError(503, "Email service is not configured.");

  const parsed = contactFormSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid input.",
    );
  }

  const { name, email, message } = parsed.data;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  const { error } = await resend.emails.send({
    from: CONTACT_EMAIL_FROM,
    to: CONTACT_EMAIL_TO,
    replyTo: email,
    subject: `New contact form message from ${name}`,
    html:
      `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Message:</strong></p><p>${safeMessage}</p>`,
  });

  if (error) {
    console.error("Resend API error:", error);
    throw new HttpError(502, "Failed to send message.");
  }

  return jsonResponse({ ok: true }, 200);
}) satisfies APIRoute;
