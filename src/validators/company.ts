import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  logo: z.string().min(1, "Logo is required").max(200),
  owner_name: z.string().max(200).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  phone: z.string().max(44).optional().nullable(),
  whatts: z.string().max(100).optional().nullable(),
  facebook: z.string().max(200).optional().nullable(),
  instgram: z.string().max(200).optional().nullable(),
  email: z.string().email("Invalid email format").max(100).optional().nullable().or(z.literal("")),
});
