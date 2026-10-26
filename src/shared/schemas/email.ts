import { z } from 'zod';
import { vmsg } from '@/shared/components/form/validationMessage';

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

// Messages are tokens (see validationMessage.ts): EmailCompositionModal translates them where shown.
const invalidList = { message: vmsg('invalidEmailList') };

export const emailFormSchema = z
  .object({
    from: z.string().min(1, vmsg('required')).max(500).refine(validAddresses, invalidList),
    to: z
      .string()
      .max(500)
      .refine(v => !v || validAddresses(v), invalidList)
      .optional(),
    cc: z
      .string()
      .max(500)
      .refine(v => !v || validAddresses(v), invalidList)
      .optional(),
    bcc: z
      .string()
      .max(500)
      .refine(v => !v || validAddresses(v), invalidList)
      .optional(),
    subject: z.string().min(1, vmsg('required')).max(500),
    content: z.string().max(8000).optional(),
    attachments: z.array(z.string().max(200)).max(10).optional(),
  })
  .refine(data => !!(data.to?.trim() || data.cc?.trim() || data.bcc?.trim()), {
    message: vmsg('recipientRequired'),
    path: ['to'],
  });

export type EmailFormValues = z.infer<typeof emailFormSchema>;
