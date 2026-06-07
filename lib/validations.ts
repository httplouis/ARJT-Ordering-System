import { z } from "zod";

export const checkoutSchema = z.object({
  customer_name: z.string().min(2, "Enter your name"),
  contact_number: z.string().optional(),
  grade_section: z.string().optional(),
  fulfillment_type: z.enum(["pickup", "delivery"]),
  desired_date: z.string().min(1, "Choose a date"),
  desired_time: z.string().min(1, "Choose a time"),
  notes: z.string().max(240).optional(),
  gcash_reference: z.string().optional().refine((val) => !val || val.trim().length >= 6, {
    message: "Enter at least 6 characters or leave blank"
  }),
  payment_screenshot_url: z.string().optional()
});

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.coerce.number().min(1),
  category_id: z.string().min(1),
  image_url: z.string().url().or(z.literal("")),
  prep_time_minutes: z.coerce.number().min(1),
  is_available: z.boolean().default(true),
  is_popular: z.boolean().default(false)
});

export const settingsSchema = z.object({
  store_name: z.string().min(2),
  store_open: z.boolean(),
  opening_time: z.string(),
  closing_time: z.string(),
  delivery_fee: z.coerce.number().min(0),
  gcash_name: z.string().min(2),
  gcash_number: z.string().min(8),
  gcash_qr_url: z
    .string()
    .refine((value) => !value || value.startsWith("/") || /^https?:\/\//.test(value), {
      message: "Enter a valid URL or absolute path starting with /"
    })
    .or(z.literal("")),
  default_prep_minutes: z.coerce.number().min(1)
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Enter your name")
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
