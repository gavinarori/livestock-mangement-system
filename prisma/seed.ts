// prisma/seed.ts

import {
  PrismaClient,
  AnimalGender,
  AnimalType,
  HealthStatus,
  VaccinationStatus,
  DiseaseCategory,
  BreedingOutcome,
  BreedingMethod,
  HeatCycleStatus,
  UserRole,
} from '@prisma/client'

const prisma = new PrismaClient()

const ORGANIZATION_ID = '69f9f27bed6ec4ffb9dfd1f8'

async function main() {
  console.log('🌱 Seeding livestock management data...')

  // ------------------------------------------------------------
  // USERS
  // ------------------------------------------------------------
  const adminUser = await prisma.user.upsert({
    where: {
      email: 'admin@herdwise.com',
    },
    update: {},
    create: {
      email: 'admin@herdwise.com',
      name: 'Farm Administrator',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      organizationId: ORGANIZATION_ID,
    },
  })

  const vetUser = await prisma.user.upsert({
    where: {
      email: 'vet@herdwise.com',
    },
    update: {},
    create: {
      email: 'vet@herdwise.com',
      name: 'Dr. Emily Carter',
      password: 'hashedpassword',
      role: UserRole.VETERINARIAN,
      organizationId: ORGANIZATION_ID,
    },
  })

  // ------------------------------------------------------------
  // ANIMALS
  // ------------------------------------------------------------
  const bullAtlas = await prisma.animal.create({
    data: {
      name: 'Atlas',
      type: AnimalType.CATTLE,
      breed: 'Boran',
      dateOfBirth: new Date('2020-03-10'),
      gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY,
      weight: 720,
      color: 'Brown',
      identificationId: 'CAT-001',
      location: 'North Grazing Zone',
      organizationId: ORGANIZATION_ID,
      notes: 'Primary breeding bull',
      inbreedingCoeff: 0.02,
    },
  })

  const cowBella = await prisma.animal.create({
    data: {
      name: 'Bella',
      type: AnimalType.CATTLE,
      breed: 'Friesian',
      dateOfBirth: new Date('2021-06-12'),
      gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY,
      weight: 540,
      color: 'Black & White',
      identificationId: 'CAT-002',
      location: 'Dairy Unit A',
      organizationId: ORGANIZATION_ID,
      notes: 'High milk producer',
      inbreedingCoeff: 0.03,
    },
  })

  const cowDaisy = await prisma.animal.create({
    data: {
      name: 'Daisy',
      type: AnimalType.CATTLE,
      breed: 'Ayrshire',
      dateOfBirth: new Date('2022-01-18'),
      gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.RECOVERING,
      weight: 500,
      color: 'Red & White',
      identificationId: 'CAT-003',
      location: 'Recovery Pen',
      organizationId: ORGANIZATION_ID,
      notes: 'Recovering from mild mastitis',
      inbreedingCoeff: 0.04,
    },
  })

  const goatLuna = await prisma.animal.create({
    data: {
      name: 'Luna',
      type: AnimalType.GOAT,
      breed: 'Alpine',
      dateOfBirth: new Date('2023-02-10'),
      gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY,
      weight: 68,
      color: 'Cream',
      identificationId: 'GOT-001',
      location: 'Goat House',
      organizationId: ORGANIZATION_ID,
      inbreedingCoeff: 0.01,
    },
  })

  const ramThor = await prisma.animal.create({
    data: {
      name: 'Thor',
      type: AnimalType.SHEEP,
      breed: 'Dorper',
      dateOfBirth: new Date('2021-11-09'),
      gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY,
      weight: 110,
      color: 'White',
      identificationId: 'SHP-001',
      location: 'Sheep Section',
      organizationId: ORGANIZATION_ID,
      notes: 'Strong genetics',
      inbreedingCoeff: 0.02,
    },
  })

  // ------------------------------------------------------------
  // EMPTY ANIMALS FOR FUTURE USER UPDATES
  // ------------------------------------------------------------
  await prisma.animal.createMany({
    data: [
      {
        name: 'Unnamed Heifer 1',
        type: AnimalType.CATTLE,
        breed: 'Friesian',
        dateOfBirth: new Date('2024-01-01'),
        gender: AnimalGender.FEMALE,
        healthStatus: HealthStatus.HEALTHY,
        organizationId: ORGANIZATION_ID,
        notes: 'Reserved for future breeding updates',
      },
      {
        name: 'Unnamed Goat 1',
        type: AnimalType.GOAT,
        breed: 'Boer',
        dateOfBirth: new Date('2024-03-15'),
        gender: AnimalGender.FEMALE,
        healthStatus: HealthStatus.HEALTHY,
        organizationId: ORGANIZATION_ID,
        notes: 'Reserved for user updates',
      },
      {
        name: 'Young Bull Pending',
        type: AnimalType.CATTLE,
        breed: 'Boran',
        dateOfBirth: new Date('2024-02-20'),
        gender: AnimalGender.MALE,
        healthStatus: HealthStatus.HEALTHY,
        organizationId: ORGANIZATION_ID,
        notes: 'No breeding data added yet',
      },
    ],
  })

  // ------------------------------------------------------------
  // HEAT CYCLES
  // ------------------------------------------------------------
  await prisma.heatCycle.createMany({
    data: [
      {
        animalId: cowBella.id,
        organizationId: ORGANIZATION_ID,
        lastHeatDate: new Date('2026-05-01'),
        nextExpectedDate: new Date('2026-05-22'),
        cycleLengthDays: 21,
        status: HeatCycleStatus.EXPECTED,
        intensity: 'Strong',
        observedBy: 'John Farmhand',
        notes: 'Normal cycle observed',
        createdById: adminUser.id,
      },
      {
        animalId: cowDaisy.id,
        organizationId: ORGANIZATION_ID,
        lastHeatDate: new Date('2026-04-20'),
        nextExpectedDate: new Date('2026-05-11'),
        cycleLengthDays: 21,
        status: HeatCycleStatus.OVERDUE,
        intensity: 'Moderate',
        observedBy: 'Farm Supervisor',
        notes: 'Monitor for irregular cycle',
        createdById: adminUser.id,
      },
      {
        animalId: goatLuna.id,
        organizationId: ORGANIZATION_ID,
        lastHeatDate: new Date('2026-05-07'),
        nextExpectedDate: new Date('2026-05-28'),
        cycleLengthDays: 21,
        status: HeatCycleStatus.ACTIVE,
        intensity: 'Strong',
        observedBy: 'Grace',
        notes: 'Ready for breeding',
        createdById: adminUser.id,
      },
    ],
  })

  // ------------------------------------------------------------
  // BREEDING RECORDS
  // ------------------------------------------------------------
  await prisma.breeding.create({
    data: {
      damId: cowBella.id,
      sireId: bullAtlas.id,
      organizationId: ORGANIZATION_ID,
      breedingDate: new Date('2026-05-03'),
      method: BreedingMethod.NATURAL,
      outcome: BreedingOutcome.PENDING,
      expectedBirthDate: new Date('2027-02-10'),
      inbreedingCoeff: 0.03,
      confirmedPregnancy: false,
      veterinarian: 'Dr. Emily Carter',
      location: 'Breeding Unit',
      notes: 'First breeding attempt successful',
      attachments: [],
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  })

  await prisma.breeding.create({
    data: {
      damId: cowDaisy.id,
      sireId: bullAtlas.id,
      organizationId: ORGANIZATION_ID,
      breedingDate: new Date('2026-03-10'),
      method: BreedingMethod.ARTIFICIAL_INSEMINATION,
      outcome: BreedingOutcome.SUCCESSFUL,
      offspringCount: 1,
      expectedBirthDate: new Date('2026-12-18'),
      inbreedingCoeff: 0.04,
      confirmedPregnancy: true,
      pregnancyCheckDate: new Date('2026-04-01'),
      veterinarian: 'Dr. Emily Carter',
      location: 'AI Unit',
      notes: 'Pregnancy confirmed after ultrasound',
      attachments: [],
      createdById: adminUser.id,
      updatedById: vetUser.id,
    },
  })

  // ------------------------------------------------------------
  // HEALTH RECORDS
  // ------------------------------------------------------------
  await prisma.healthRecord.createMany({
    data: [
      {
        animalId: cowBella.id,
        organizationId: ORGANIZATION_ID,
        recordType: 'Vaccination',
        description: 'Foot and mouth vaccination',
        date: new Date('2026-01-10'),
        recordedBy: 'Dr. Emily Carter',
        vaccineName: 'FMD Vaccine',
        vaccinationStatus: VaccinationStatus.FULLY_VACCINATED,
        nextDueDate: new Date('2027-01-10'),
        temperature: 38.4,
        weight: 540,
        notes: 'Responded well',
        attachments: [],
      },
      {
        animalId: cowDaisy.id,
        organizationId: ORGANIZATION_ID,
        recordType: 'Treatment',
        description: 'Mastitis treatment',
        date: new Date('2026-04-28'),
        recordedBy: 'Dr. Emily Carter',
        diagnosis: 'Mild Mastitis',
        diseaseCategory: DiseaseCategory.INFECTIOUS,
        severity: 'Moderate',
        treatment: 'Antibiotics for 5 days',
        outcome: 'Recovering',
        temperature: 39.1,
        weight: 498,
        notes: 'Improvement observed',
        attachments: [],
      },
      {
        animalId: goatLuna.id,
        organizationId: ORGANIZATION_ID,
        recordType: 'Deworming',
        description: 'Routine deworming',
        date: new Date('2026-03-15'),
        recordedBy: 'Farm Vet',
        treatment: 'Albendazole',
        outcome: 'Healthy',
        weight: 68,
        notes: 'Routine preventive care',
        attachments: [],
      },
    ],
  })

  // ------------------------------------------------------------
  // VETERINARY NOTES
  // ------------------------------------------------------------
  await prisma.veterinaryNote.createMany({
    data: [
      {
        animalId: cowBella.id,
        organizationId: ORGANIZATION_ID,
        veterinarian: 'Dr. Emily Carter',
        date: new Date('2026-05-04'),
        examination: 'Post breeding examination',
        diagnosis: 'Healthy reproductive condition',
        recommendations: 'Observe for pregnancy signs in 30 days',
        prescriptions: 'Mineral supplements',
        followUpDate: new Date('2026-06-04'),
        notes: 'Excellent breeding candidate',
        attachments: [],
      },
      {
        animalId: cowDaisy.id,
        organizationId: ORGANIZATION_ID,
        veterinarian: 'Dr. Emily Carter',
        date: new Date('2026-04-29'),
        examination: 'Udder examination',
        diagnosis: 'Recovering mastitis',
        recommendations: 'Continue medication and isolate if symptoms return',
        prescriptions: 'Oxytetracycline',
        followUpDate: new Date('2026-05-20'),
        notes: 'Recovery progressing well',
        attachments: [],
      },
      {
        animalId: ramThor.id,
        organizationId: ORGANIZATION_ID,
        veterinarian: 'Dr. Michael Reed',
        date: new Date('2026-02-12'),
        examination: 'Breeding fitness assessment',
        diagnosis: 'Healthy',
        recommendations: 'Maintain current feeding program',
        notes: 'Excellent ram condition',
        attachments: [],
      },
    ],
  })

  console.log('✅ Seed completed successfully')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })