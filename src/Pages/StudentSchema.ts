import { z } from "zod"

export const studentSchema = z.object({
    name: z.string().min(3, { message: "Name must be at least 3 characters" }),
    bq_id: z.string().min(3, { message: "BQ ID is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().min(10, { message: "Phone number must be at least 10 characters" }),
    CNIC: z.string().min(13, { message: "CNIC must be 13 characters" }).max(15),
    type: z.string().optional().default("Student"),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }).optional().or(z.literal("")),
    course: z.string().min(1, { message: "Please select a course" }),
    gender: z.string().min(1, { message: "Please select a gender" }),
    shift: z.string().min(1, { message: "Please select a shift" }),
})

export type StudentFormValues = z.infer<typeof studentSchema>
