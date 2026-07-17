import { z } from "zod";

/**
 * User profile fields persisted to Firestore.
 * Password is never part of the persisted User document — Auth-only.
 */
export const userSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long." })
    .max(50, { message: "Username must not exceed 50 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." })
    .trim(),
  role: z.string().min(1, { message: "Role is required." }),
  hideFinancials: z.boolean().default(true),
  hideEmail: z.boolean().default(false),
  hideLeadSource: z.boolean().default(false),
  allowExport: z.boolean().default(true),
});

/** Create-user form: password is required for Firebase Auth, never written to Firestore. */
export const createUserSchema = userSchema.extend({
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

/** Edit-user form: no password field (use Firebase Auth password reset). */
export const updateUserSchema = userSchema;

export type UserInput = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
