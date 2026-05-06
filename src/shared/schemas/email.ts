import { z } from 'zod';

const containsAt = (v: string) =>
  v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .every(s => s.includes('@'));

export const emailFormSchema = z.object({
  from: z
    .string()
    .min(1, 'Required')
    .max(500)
    .refine(containsAt, { message: 'From must contain valid email address(es)' }),
  to: z
    .string()
    .min(1, 'Required')
    .max(500)
    .refine(containsAt, { message: 'To must contain valid email address(es)' }),
  cc: z
    .string()
    .max(500)
    .refine(v => !v || containsAt(v), { message: 'CC must contain valid email address(es)' })
    .optional(),
  bcc: z
    .string()
    .max(500)
    .refine(v => !v || containsAt(v), { message: 'BCC must contain valid email address(es)' })
    .optional(),
  subject: z.string().min(1, 'Required').max(500),
  content: z.string().max(4000).optional(),
  attachments: z.array(z.string().max(200)).max(10).optional(),
});

export type EmailFormValues = z.infer<typeof emailFormSchema>;
