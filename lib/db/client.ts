import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = 'livestock'

let client: MongoClient | null = null
let db: Db | null = null

export async function connectDB(): Promise<Db> {
  if (db) return db

  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)
    console.log('[v0] Connected to MongoDB')
    return db
  } catch (error) {
    console.error('[v0] MongoDB connection error:', error)
    throw error
  }
}

export async function getDB(): Promise<Db> {
  if (!db) {
    return connectDB()
  }
  return db
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
