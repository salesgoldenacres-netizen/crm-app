import { z } from "zod";

export const leadSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(100, { message: "Name must not exceed 100 characters." })
    .trim(),
  phone: z
    .string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .max(15, { message: "Phone number must not exceed 15 digits." })
    .regex(/^[+]?[0-9\s-()]+$/, { message: "Phone number contains invalid characters." }),
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email format." })
    .or(z.literal(""))
    .optional(),
  projectId: z.string().optional(),
  plotId: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  leadSource: z.string().optional(),
  leadMedium: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
