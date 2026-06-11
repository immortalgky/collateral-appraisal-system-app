import { z } from 'zod';

// Split on ',' or ';' to match the backend's ParseAddresses, and require EACH part to look
// like an email. The previous check only required a '@' somewhere in the whole string, so
// "a@b.com, bad" passed the FE and then threw server-side at MailboxAddress.Parse.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validAddresses = (v: string) =>
  v
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean)
    .every(s => EMAIL_RE.test(s));

export const emailFormSchema = z
  .object({
    from: z
      .string()
      .min(1, 'Required')
      .max(500)
      .refine(validAddresses, { message: 'From must contain valid email address(es)' }),
    to: z
      .string()
      .max(500)
      .refine(v => !v || validAddresses(v), { message: 'To must contain valid email address(es)' })
      .optional(),
    cc: z
      .string()
      .max(500)
      .refine(v => !v || validAddresses(v), { message: 'CC must contain valid email address(es)' })
      .optional(),
    bcc: z
      .string()
      .max(500)
      .refine(v => !v || validAddresses(v), { message: 'BCC must contain valid email address(es)' })
      .optional(),
    subject: z.string().min(1, 'Required').max(500),
    content: z.string().max(4000).optional(),
    attachments: z.array(z.string().max(200)).max(10).optional(),
  })
  .refine(
    data => !!(data.to?.trim() || data.cc?.trim() || data.bcc?.trim()),
    {
      message: 'At least one recipient (To, Cc, or Bcc) is required.',
      path: ['to'],
    },
  );

export type EmailFormValues = z.infer<typeof emailFormSchema>;
