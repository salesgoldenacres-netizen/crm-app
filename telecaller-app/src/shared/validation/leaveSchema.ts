import { z } from "zod";

export const leaveSchema = z
  .object({
    leaveType: z.enum(["casual", "sick", "earned"], {
      message: "Leave type must be casual, sick, or earned.",
    }),
    startDate: z
      .string()
      .min(1, { message: "Start date is required." })
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date format." }),
    endDate: z
      .string()
      .min(1, { message: "End date is required." })
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date format." }),
    reason: z
      .string()
      .min(5, { message: "Reason must be at least 5 characters long." })
      .max(200, { message: "Reason must not exceed 200 characters." })
      .trim(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: "End date must be on or after start date.",
      path: ["endDate"],
    }
  );

export type LeaveInput = z.infer<typeof leaveSchema>;
