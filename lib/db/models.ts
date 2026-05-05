import { ObjectId } from 'mongodb'

export interface User {
  _id?: ObjectId
  email: string
  password: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface Animal {
  _id?: ObjectId
  userId: ObjectId
  name: string
  type: 'cattle' | 'sheep' | 'goat' | 'pig' | 'poultry' | 'horse' | 'other'
  breed?: string
  dateOfBirth?: Date
  weight?: number
  color?: string
  identifier?: string // ID, tag number, etc.
  notes?: string
  healthStatus?: 'healthy' | 'sick' | 'injured' | 'recovering'
  lastCheckup?: Date
  createdAt: Date
  updatedAt: Date
}

export interface HealthRecord {
  _id?: ObjectId
  animalId: ObjectId
  userId: ObjectId
  type: 'vaccination' | 'treatment' | 'checkup' | 'medication'
  date: Date
  description: string
  veterinarian?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface BreedingRecord {
  _id?: ObjectId
  animalId: ObjectId
  userId: ObjectId
  date: Date
  partnerId?: ObjectId // Another animal ID if applicable
  expectedDueDate?: Date
  outcome?: 'successful' | 'unsuccessful' | 'pending'
  offspring?: ObjectId[] // IDs of offspring animals
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface AnimalShare {
  _id?: ObjectId
  animalId: ObjectId
  userId: ObjectId
  shareCode: string
  isPublic: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}
