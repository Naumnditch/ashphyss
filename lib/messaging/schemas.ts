import { z } from 'zod';

export const templateSchema = z.object({
  name: z.string().trim().min(1, 'Name the template').max(120),
  category: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(1, 'Add a subject').max(300),
  body: z.string().min(1, 'Write the message').max(100_000),
});
