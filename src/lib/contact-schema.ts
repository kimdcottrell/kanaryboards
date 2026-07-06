import { z } from "astro/zod";

export const MESSAGE_MAX_LENGTH = 500;

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().min(1, "Email is required").email("Invalid email"),
  message: z.string().trim().min(1, "Message is required").max(
    MESSAGE_MAX_LENGTH,
  ),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
