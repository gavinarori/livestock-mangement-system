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

export const CreateAnimalSchema = z.object({
  name: z.string().min(1, 'Animal name is required'),
  type: z.enum(['CATTLE', 'SHEEP', 'GOAT', 'PIG', 'POULTRY', 'HORSE', 'FISH', 'AQUATIC', 'OTHER']),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  color: z.string().optional(),
  distinctMarks: z.string().optional(),
  identificationId: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  healthStatus: z.enum(['HEALTHY', 'SICK', 'INJURED', 'RECOVERING', 'DECEASED']).optional(),
  acquisitionDate: z.string().optional(),
  acquisitionPrice: z.number().optional(),
})

export const UpdateAnimalSchema = CreateAnimalSchema.partial()

export const HealthRecordSchema = z.object({
  recordType: z.enum(['vaccination', 'treatment', 'checkup', 'diagnosis']),
  description: z.string().min(1, 'Description is required'),
  date: z.string(),
  vaccineName: z.string().optional(),
  diagnosis: z.string().optional(),
  diseaseCategory: z.enum(['INFECTIOUS', 'GENETIC', 'NUTRITIONAL', 'ENVIRONMENTAL', 'PARASITIC', 'OTHER']).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  treatment: z.string().optional(),
  temperature: z.number().optional(),
  weight: z.number().optional(),
  notes: z.string().optional(),
})

export const VeterinaryNoteSchema = z.object({
  veterinarian: z.string().min(1, 'Veterinarian name is required'),
  date: z.string(),
  examination: z.string().min(1, 'Examination details required'),
  diagnosis: z.string().optional(),
  recommendations: z.string().min(1, 'Recommendations required'),
  prescriptions: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type CreateAnimalInput = z.infer<typeof CreateAnimalSchema>
export type UpdateAnimalInput = z.infer<typeof UpdateAnimalSchema>
export type HealthRecordInput = z.infer<typeof HealthRecordSchema>
export type VeterinaryNoteInput = z.infer<typeof VeterinaryNoteSchema>
