import { z } from 'zod'

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().optional(),
  organizationSlug: z.string().optional(),
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Helper: treat empty string / null / undefined all as undefined so optional
// fields are stripped cleanly before hitting Prisma.
const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === null || v === '' ? undefined : v))

const optionalPositiveNumber = z
  .union([z.number().positive(), z.null()])
  .optional()
  .transform((v) => (v === null ? undefined : v))

const optionalNumber = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => (v === null ? undefined : v))

// dateOfBirth / acquisitionDate come as ISO strings from the form
const optionalDateString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === null || v === '' ? undefined : v))

export const CreateAnimalSchema = z.object({
  name: z.string().min(1, 'Animal name is required'),
  type: z.enum(['CATTLE', 'SHEEP', 'GOAT', 'PIG', 'POULTRY', 'HORSE', 'FISH', 'AQUATIC', 'OTHER']),
  breed: optionalString,
  dateOfBirth: optionalDateString,
  gender: z
    .union([z.enum(['MALE', 'FEMALE', 'OTHER']), z.null()])
    .optional()
    .transform((v) => (v === null ? undefined : v)),
  weight: optionalPositiveNumber,
  height: optionalPositiveNumber,
  color: optionalString,
  distinctMarks: optionalString,
  identificationId: optionalString,
  notes: optionalString,
  location: optionalString,
  healthStatus: z
    .union([z.enum(['HEALTHY', 'SICK', 'INJURED', 'RECOVERING', 'DECEASED']), z.null()])
    .optional()
    .transform((v) => (v === null ? undefined : v)),
  acquisitionDate: optionalDateString,
  acquisitionPrice: optionalNumber,
})

export const UpdateAnimalSchema = CreateAnimalSchema.partial()

export const HealthRecordSchema = z.object({
  recordType: z.enum(['vaccination', 'treatment', 'checkup', 'diagnosis']),
  description: z.string().min(1, 'Description is required'),
  date: z.string(),
  vaccineName: optionalString,
  diagnosis: optionalString,
  diseaseCategory: z
    .union([
      z.enum(['INFECTIOUS', 'GENETIC', 'NUTRITIONAL', 'ENVIRONMENTAL', 'PARASITIC', 'OTHER']),
      z.null(),
    ])
    .optional()
    .transform((v) => (v === null ? undefined : v)),
  severity: z
    .union([z.enum(['mild', 'moderate', 'severe']), z.null()])
    .optional()
    .transform((v) => (v === null ? undefined : v)),
  treatment: optionalString,
  temperature: optionalNumber,
  weight: optionalPositiveNumber,
  notes: optionalString,
})

export const VeterinaryNoteSchema = z.object({
  veterinarian: z.string().min(1, 'Veterinarian name is required'),
  date: z.string(),
  examination: z.string().min(1, 'Examination details required'),
  diagnosis: optionalString,
  recommendations: z.string().min(1, 'Recommendations required'),
  prescriptions: optionalString,
  followUpDate: optionalDateString,
  notes: optionalString,
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type CreateAnimalInput = z.infer<typeof CreateAnimalSchema>
export type UpdateAnimalInput = z.infer<typeof UpdateAnimalSchema>
export type HealthRecordInput = z.infer<typeof HealthRecordSchema>
export type VeterinaryNoteInput = z.infer<typeof VeterinaryNoteSchema>