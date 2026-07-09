export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { contactFormSchema } from "@lib/contact-schema.ts";

const CONTACT_EMAIL_TO = "hello@kanby.ai";
const CONTACT_EMAIL_FROM = "Kanby Contact Form <contact@kanby.ai>";

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

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

export const POST: APIRoute = async ({ request }) => {
  if (!resend) {
    return jsonResponse({ error: "Email service is not configured." }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      400,
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
    return jsonResponse({ error: "Failed to send message." }, 502);
  }

  return jsonResponse({ ok: true }, 200);
};
