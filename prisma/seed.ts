// prisma/seed.ts — HerdWise Full Seed
// Targets the real production org & admin user from MongoDB

import {
  PrismaClient,
  AnimalGender,
  AnimalType,
  HealthStatus,
  VaccinationStatus,
  DiseaseCategory,
  DiseaseSeverity,
  DiseaseTrend,
  TreatmentStatus,
  TreatmentPriority,
  VaccinationScheduleStatus,
  BreedingOutcome,
  BreedingMethod,
  HeatCycleStatus,
  UserRole,
  FeedType,
  MedicineCategory,
  EquipmentStatus,
  StockTransactionType,
  EquipmentEventType,
  VetAvailabilityStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

// ─── Real IDs from the database ───────────────────────────────────────────────
const ORG_ID   = '6a1830b7c6b12c05c1372641'   // "My Farm"
const ADMIN_ID = '6a1830b8c6b12c05c1372642'   // Gavin Arori (ADMIN)

async function main() {
  console.log('🌱 Starting HerdWise seed for My Farm (Gavin Arori)…')

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP  (scoped to this org so we never touch other orgs)
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.equipmentEvent.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.stockTransaction.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.equipmentItem.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.medicineItem.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.feedItem.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.breeding.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.heatCycle.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.veterinaryNote.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.diseaseOutbreakAnimal.deleteMany({
    where: { outbreak: { organizationId: ORG_ID } },
  })
  await prisma.diseaseOutbreak.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.treatment.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.vaccinationSchedule.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.healthRecord.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.animal.deleteMany({ where: { organizationId: ORG_ID } })
  await prisma.vetProfile.deleteMany({ where: { organizationId: ORG_ID } })

  // Delete non-admin demo users for this org (keep Gavin)
  await prisma.user.deleteMany({
    where: { organizationId: ORG_ID, id: { not: ADMIN_ID } },
  })

  console.log('🧹 Cleared existing demo data for My Farm')

  // ──────────────────────────────────────────────────────────────────────────
  // EXTRA USERS
  // ──────────────────────────────────────────────────────────────────────────
  const vetUser = await prisma.user.create({
    data: {
      email: 'vet.emily@myfarm.co.ke',
      name: 'Dr. Emily Carter',
      // bcrypt hash of "demo1234"
      password: '$2b$10$dHpZiDAYmYbNYyFtPS.rTeTpq.SsyxM7Yz/O1f0Zgio7nbeUh0PlS',
      role: UserRole.VETERINARIAN,
      organizationId: ORG_ID,
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@myfarm.co.ke',
      name: 'James Odhiambo',
      password: '$2b$10$dHpZiDAYmYbNYyFtPS.rTeTpq.SsyxM7Yz/O1f0Zgio7nbeUh0PlS',
      role: UserRole.MANAGER,
      organizationId: ORG_ID,
    },
  })

  const workerUser = await prisma.user.create({
    data: {
      email: 'worker@myfarm.co.ke',
      name: 'Grace Wanjiru',
      password: '$2b$10$dHpZiDAYmYbNYyFtPS.rTeTpq.SsyxM7Yz/O1f0Zgio7nbeUh0PlS',
      role: UserRole.WORKER,
      organizationId: ORG_ID,
    },
  })

  console.log('👥 Users created')

  // ──────────────────────────────────────────────────────────────────────────
  // VET PROFILES
  // ──────────────────────────────────────────────────────────────────────────


const emilyVetProfile = await prisma.vetProfile.create({
  data: {
    organizationId: ORG_ID,
    userId: vetUser.id,
    name: 'Dr. Emily Carter',
    email: 'emily.carter@vetclinic.co.ke',
    phone: '+254711000001',
    speciality: 'Bovine & Small Ruminants',
    licenseNo: 'KVB-2019-0412',
    availability: VetAvailabilityStatus.AVAILABLE,
    currentCaseCount: 2,
    isExternal: false,
    clinicName: 'My Farm On-Site Clinic',
    clinicAddress: 'North Grazing Zone, My Farm',
    notes: 'Primary resident veterinarian.',
  },
})

const michaelVetProfile = await prisma.vetProfile.create({
  data: {
    organizationId: ORG_ID,
    name: 'Dr. Michael Reed',
    email: 'michael.reed@afrivetconsult.co.ke',
    phone: '+254722000002',
    speciality: 'Sheep & Goat Medicine',
    licenseNo: 'KVB-2017-0281',
    availability: VetAvailabilityStatus.BUSY,
    currentCaseCount: 4,
    isExternal: true,
    clinicName: 'AfriVet Consultancy',
    clinicAddress: 'Kiambu Road, Nairobi',
    notes: 'External livestock consultant — call 48hrs ahead.',
  },
})

console.log('🩺 Vet profiles created')

  // ──────────────────────────────────────────────────────────────────────────
  // ANIMALS  (18 across multiple species for a rich demo)
  // ──────────────────────────────────────────────────────────────────────────

  // ── Cattle ──
  const bullAtlas = await prisma.animal.create({
    data: {
      name: 'Atlas', type: AnimalType.CATTLE, breed: 'Boran',
      dateOfBirth: new Date('2020-03-10'), gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY, weight: 720, color: 'Brown',
      identificationId: 'CAT-001', location: 'North Grazing Zone',
      organizationId: ORG_ID, notes: 'Primary breeding bull', inbreedingCoeff: 0.02,
    },
  })

  const cowBella = await prisma.animal.create({
    data: {
      name: 'Bella', type: AnimalType.CATTLE, breed: 'Friesian',
      dateOfBirth: new Date('2021-06-12'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 540, color: 'Black & White',
      identificationId: 'CAT-002', location: 'Dairy Unit A',
      organizationId: ORG_ID, notes: 'High milk producer — 28L/day', inbreedingCoeff: 0.03,
    },
  })

  const cowDaisy = await prisma.animal.create({
    data: {
      name: 'Daisy', type: AnimalType.CATTLE, breed: 'Ayrshire',
      dateOfBirth: new Date('2022-08-15'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.RECOVERING, weight: 500, color: 'Red & White',
      identificationId: 'CAT-003', location: 'Recovery Pen',
      organizationId: ORG_ID, notes: 'Recovering from mastitis', inbreedingCoeff: 0.04,
    },
  })

  const cowRose = await prisma.animal.create({
    data: {
      name: 'Rose', type: AnimalType.CATTLE, breed: 'Jersey',
      dateOfBirth: new Date('2022-01-20'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 460, color: 'Fawn',
      identificationId: 'CAT-004', location: 'Dairy Unit A',
      organizationId: ORG_ID, notes: 'Jersey — rich butter-fat milk', inbreedingCoeff: 0.02,
    },
  })

  const cowNala = await prisma.animal.create({
    data: {
      name: 'Nala', type: AnimalType.CATTLE, breed: 'Sahiwal',
      dateOfBirth: new Date('2023-03-05'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.SICK, weight: 410, color: 'Reddish Brown',
      identificationId: 'CAT-005', location: 'Sick Bay',
      organizationId: ORG_ID, notes: 'Suspected Lumpy Skin Disease — under observation',
      inbreedingCoeff: 0.01,
    },
  })

  const bullTitan = await prisma.animal.create({
    data: {
      name: 'Titan', type: AnimalType.CATTLE, breed: 'Angus',
      dateOfBirth: new Date('2019-07-14'), gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY, weight: 800, color: 'Black',
      identificationId: 'CAT-006', location: 'Bull Pen',
      organizationId: ORG_ID, notes: 'Secondary stud bull', inbreedingCoeff: 0.01,
    },
  })

  // ── Sheep ──
  const ramThor = await prisma.animal.create({
    data: {
      name: 'Thor', type: AnimalType.SHEEP, breed: 'Dorper',
      dateOfBirth: new Date('2021-11-09'), gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY, weight: 110, color: 'White',
      identificationId: 'SHP-001', location: 'Sheep Section',
      organizationId: ORG_ID, notes: 'Strong genetics', inbreedingCoeff: 0.02,
    },
  })

  const eweAurora = await prisma.animal.create({
    data: {
      name: 'Aurora', type: AnimalType.SHEEP, breed: 'Merino',
      dateOfBirth: new Date('2022-04-18'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 72, color: 'White',
      identificationId: 'SHP-002', location: 'Sheep Section',
      organizationId: ORG_ID, notes: 'Fine wool producer', inbreedingCoeff: 0.01,
    },
  })

  const eweMaya = await prisma.animal.create({
    data: {
      name: 'Maya', type: AnimalType.SHEEP, breed: 'Dorper',
      dateOfBirth: new Date('2023-01-30'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.INJURED, weight: 65, color: 'Brown & White',
      identificationId: 'SHP-003', location: 'Recovery Pen',
      organizationId: ORG_ID, notes: 'Leg injury from fence — splinted', inbreedingCoeff: 0.03,
    },
  })

  // ── Goats ──
  const goatLuna = await prisma.animal.create({
    data: {
      name: 'Luna', type: AnimalType.GOAT, breed: 'Alpine',
      dateOfBirth: new Date('2023-02-10'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 68, color: 'Cream',
      identificationId: 'GOT-001', location: 'Goat House',
      organizationId: ORG_ID, inbreedingCoeff: 0.01,
    },
  })

  const buckZeus = await prisma.animal.create({
    data: {
      name: 'Zeus', type: AnimalType.GOAT, breed: 'Boer',
      dateOfBirth: new Date('2021-09-22'), gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY, weight: 95, color: 'White & Brown',
      identificationId: 'GOT-002', location: 'Goat House',
      organizationId: ORG_ID, notes: 'Boer stud buck', inbreedingCoeff: 0.01,
    },
  })

  const goatStar = await prisma.animal.create({
    data: {
      name: 'Star', type: AnimalType.GOAT, breed: 'Galla',
      dateOfBirth: new Date('2022-12-01'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 55, color: 'White',
      identificationId: 'GOT-003', location: 'Goat House',
      organizationId: ORG_ID, inbreedingCoeff: 0.00,
    },
  })

  // ── Pigs ──
  const sowPeach = await prisma.animal.create({
    data: {
      name: 'Peach', type: AnimalType.PIG, breed: 'Large White',
      dateOfBirth: new Date('2023-05-10'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 180, color: 'Pink',
      identificationId: 'PIG-001', location: 'Pig Sty A',
      organizationId: ORG_ID, notes: 'Good litter size', inbreedingCoeff: 0.02,
    },
  })

  const boarMax = await prisma.animal.create({
    data: {
      name: 'Max', type: AnimalType.PIG, breed: 'Duroc',
      dateOfBirth: new Date('2022-09-14'), gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY, weight: 220, color: 'Red-Brown',
      identificationId: 'PIG-002', location: 'Pig Sty B',
      organizationId: ORG_ID, notes: 'Primary stud boar', inbreedingCoeff: 0.01,
    },
  })

  // ── Poultry ──
  const henMauve = await prisma.animal.create({
    data: {
      name: 'Flock-A', type: AnimalType.POULTRY, breed: 'Kienyeji',
      dateOfBirth: new Date('2025-01-15'), gender: AnimalGender.FEMALE,
      healthStatus: HealthStatus.HEALTHY, weight: 2.1, color: 'Mixed',
      identificationId: 'PLT-001', location: 'Poultry House A',
      organizationId: ORG_ID, notes: 'Free-range layer flock — 48 birds', inbreedingCoeff: 0.00,
    },
  })

  const cockerelBlaze = await prisma.animal.create({
    data: {
      name: 'Flock-B', type: AnimalType.POULTRY, breed: 'Broiler',
      dateOfBirth: new Date('2025-03-01'), gender: AnimalGender.OTHER,
      healthStatus: HealthStatus.HEALTHY, weight: 1.8, color: 'White',
      identificationId: 'PLT-002', location: 'Poultry House B',
      organizationId: ORG_ID, notes: 'Broiler batch — 120 birds', inbreedingCoeff: 0.00,
    },
  })

  // ── Horse ──
  const horseKing = await prisma.animal.create({
    data: {
      name: 'King', type: AnimalType.HORSE, breed: 'Thoroughbred',
      dateOfBirth: new Date('2018-04-20'), gender: AnimalGender.MALE,
      healthStatus: HealthStatus.HEALTHY, weight: 520, color: 'Bay',
      identificationId: 'HRS-001', location: 'Stable',
      organizationId: ORG_ID, notes: 'Farm work horse', inbreedingCoeff: 0.01,
    },
  })

  // ── Fish ──
  const fishTankA = await prisma.animal.create({
    data: {
      name: 'Tilapia-Tank-A', type: AnimalType.FISH, breed: 'Nile Tilapia',
      dateOfBirth: new Date('2025-02-01'), gender: AnimalGender.OTHER,
      healthStatus: HealthStatus.HEALTHY, weight: 0.35, color: 'Grey-Silver',
      identificationId: 'FSH-001', location: 'Aquaculture Unit',
      organizationId: ORG_ID, notes: 'Pond A — ~200 fingerlings', inbreedingCoeff: 0.00,
    },
  })

  console.log('🐄🐑🐐🐷🐓🐴🐟 Animals created (18)')

  // ──────────────────────────────────────────────────────────────────────────
  // HEALTH RECORDS
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.healthRecord.createMany({
    data: [
      {
        animalId: bullAtlas.id, organizationId: ORG_ID,
        recordType: 'Vaccination', description: 'Annual FMD vaccination',
        date: new Date('2026-01-15'), recordedBy: 'Dr. Emily Carter',
        vaccineName: 'FMD Trivalent', vaccinationStatus: VaccinationStatus.FULLY_VACCINATED,
        nextDueDate: new Date('2027-01-15'), temperature: 38.5, weight: 715,
        notes: 'Excellent condition', attachments: [], createdById: vetUser.id,
      },
      {
        animalId: cowBella.id, organizationId: ORG_ID,
        recordType: 'Milk Production Check', description: 'Monthly milk production review',
        date: new Date('2026-05-01'), recordedBy: 'James Odhiambo',
        diagnosis: 'Excellent milk production', outcome: 'Healthy',
        temperature: 38.3, weight: 541, notes: '28 litres/day average',
        attachments: [], createdById: managerUser.id,
      },
      {
        animalId: cowDaisy.id, organizationId: ORG_ID,
        recordType: 'Treatment', description: 'Mastitis treatment — Daisy',
        date: new Date('2026-04-28'), recordedBy: 'Dr. Emily Carter',
        diagnosis: 'Clinical mastitis', diseaseCategory: DiseaseCategory.INFECTIOUS,
        severity: 'Moderate', treatment: 'Cepravin + Oxytetracycline',
        outcome: 'Recovering', temperature: 39.2, weight: 498,
        notes: 'Recovery progressing well', attachments: [], createdById: vetUser.id,
      },
      {
        animalId: cowNala.id, organizationId: ORG_ID,
        recordType: 'Diagnosis', description: 'Suspected Lumpy Skin Disease',
        date: new Date('2026-05-20'), recordedBy: 'Dr. Emily Carter',
        diagnosis: 'Suspected LSD', diseaseCategory: DiseaseCategory.INFECTIOUS,
        severity: 'Moderate', treatment: 'Symptomatic — under observation',
        temperature: 40.1, weight: 410, notes: 'Lab samples sent to DVS Nairobi',
        attachments: [], createdById: vetUser.id,
      },
      {
        animalId: goatLuna.id, organizationId: ORG_ID,
        recordType: 'Vaccination', description: 'Annual clostridial booster',
        date: new Date('2026-04-05'), recordedBy: 'Dr. Michael Reed',
        vaccineName: 'Heptavac-P Plus', vaccinationStatus: VaccinationStatus.FULLY_VACCINATED,
        nextDueDate: new Date('2027-04-05'), temperature: 39.0, weight: 68,
        notes: 'Healthy response', attachments: [], createdById: vetUser.id,
      },
      {
        animalId: eweMaya.id, organizationId: ORG_ID,
        recordType: 'Injury Assessment', description: 'Leg injury — fence entanglement',
        date: new Date('2026-05-10'), recordedBy: 'Grace Wanjiru',
        diagnosis: 'Fractured metatarsal', severity: 'Moderate',
        treatment: 'Splinting + anti-inflammatories', outcome: 'Under care',
        temperature: 38.8, weight: 65, notes: 'Restricted movement required',
        attachments: [], createdById: workerUser.id,
      },
      {
        animalId: ramThor.id, organizationId: ORG_ID,
        recordType: 'Deworming', description: 'Quarterly anthelmintic treatment',
        date: new Date('2026-03-15'), recordedBy: 'Dr. Emily Carter',
        treatment: 'Albendazole 2.5% oral', outcome: 'Completed',
        temperature: 38.6, weight: 108, notes: 'Egg count pre-treatment: 400 EPG',
        attachments: [], createdById: vetUser.id,
      },
      {
        animalId: sowPeach.id, organizationId: ORG_ID,
        recordType: 'Vaccination', description: 'CSF + Parvovirus vaccination',
        date: new Date('2026-02-20'), recordedBy: 'Dr. Emily Carter',
        vaccineName: 'Farrowsure Gold B', vaccinationStatus: VaccinationStatus.FULLY_VACCINATED,
        nextDueDate: new Date('2026-08-20'), temperature: 38.7, weight: 175,
        notes: 'Pre-farrowing booster', attachments: [], createdById: vetUser.id,
      },
      {
        animalId: bullTitan.id, organizationId: ORG_ID,
        recordType: 'Annual Checkup', description: 'Full physical and fertility test',
        date: new Date('2026-04-10'), recordedBy: 'Dr. Emily Carter',
        diagnosis: 'Healthy — BSE score 98/100', outcome: 'Cleared for breeding',
        temperature: 38.4, weight: 795, notes: 'Sperm motility excellent',
        attachments: [], createdById: vetUser.id,
      },
      {
        animalId: cowRose.id, organizationId: ORG_ID,
        recordType: 'Milk Production Check', description: 'Monthly production review',
        date: new Date('2026-05-05'), recordedBy: 'James Odhiambo',
        diagnosis: 'Good condition', outcome: 'Healthy', temperature: 38.2, weight: 462,
        notes: '18 litres/day, 5.1% butter fat', attachments: [], createdById: managerUser.id,
      },
    ],
  })

  console.log('💉 Health records created')

  // ──────────────────────────────────────────────────────────────────────────
  // VACCINATION SCHEDULES
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.vaccinationSchedule.createMany({
    data: [
      {
        animalId: bullAtlas.id, organizationId: ORG_ID,
        vaccineName: 'FMD Trivalent Booster', vaccineType: 'Viral',
        dueDate: new Date('2027-01-15'), status: VaccinationScheduleStatus.UPCOMING,
        assignedVetName: 'Dr. Emily Carter', dosage: '2ml IM', route: 'Intramuscular',
        notes: 'Annual FMD booster', createdById: ADMIN_ID,
      },
      {
        animalId: cowBella.id, organizationId: ORG_ID,
        vaccineName: 'Brucellosis (S19)', vaccineType: 'Bacterial',
        dueDate: new Date('2026-07-01'), status: VaccinationScheduleStatus.UPCOMING,
        assignedVetName: 'Dr. Emily Carter', dosage: '2ml SC', route: 'Subcutaneous',
        manufacturer: 'Kevevapi', createdById: ADMIN_ID,
      },
      {
        animalId: cowDaisy.id, organizationId: ORG_ID,
        vaccineName: 'FMD Trivalent', vaccineType: 'Viral',
        dueDate: new Date('2026-06-01'), status: VaccinationScheduleStatus.OVERDUE,
        assignedVetName: 'Dr. Emily Carter', dosage: '2ml IM', route: 'Intramuscular',
        notes: 'Delayed — was sick', createdById: ADMIN_ID,
      },
      {
        animalId: goatLuna.id, organizationId: ORG_ID,
        vaccineName: 'Heptavac-P Plus', vaccineType: 'Clostridial',
        dueDate: new Date('2027-04-05'), status: VaccinationScheduleStatus.UPCOMING,
        assignedVetName: 'Dr. Michael Reed', dosage: '2ml IM', route: 'Intramuscular',
        manufacturer: 'MSD Animal Health', createdById: ADMIN_ID,
      },
      {
        animalId: ramThor.id, organizationId: ORG_ID,
        vaccineName: 'Ovipast Plus', vaccineType: 'Pasteurella',
        dueDate: new Date('2026-09-15'), status: VaccinationScheduleStatus.UPCOMING,
        assignedVetName: 'Dr. Michael Reed', dosage: '2ml SC', route: 'Subcutaneous',
        createdById: ADMIN_ID,
      },
      {
        animalId: sowPeach.id, organizationId: ORG_ID,
        vaccineName: 'Farrowsure Gold B', vaccineType: 'Parvovirus/Leptospira',
        dueDate: new Date('2026-08-20'), status: VaccinationScheduleStatus.UPCOMING,
        assignedVetName: 'Dr. Emily Carter', dosage: '2ml IM', route: 'Intramuscular',
        createdById: ADMIN_ID,
      },
    ],
  })

  console.log('📋 Vaccination schedules created')

  // ──────────────────────────────────────────────────────────────────────────
  // TREATMENTS
  // ──────────────────────────────────────────────────────────────────────────
  const mastitisTreatment = await prisma.treatment.create({
    data: {
      animalId: cowDaisy.id, organizationId: ORG_ID,
      condition: 'Clinical Mastitis', status: TreatmentStatus.IN_PROGRESS,
      priority: TreatmentPriority.HIGH, startDate: new Date('2026-04-28'),
      endDate: new Date('2026-05-15'), medication: 'Cepravin + Oxytetracycline',
      dosage: '1 syringe BID + 10mg/kg IV', frequency: 'Twice daily',
      route: 'Intramammary', temperature: 39.2, weight: 498,
      assignedVetName: 'Dr. Emily Carter', isolationRequired: true,
      isolationLocation: 'Recovery Pen', followUpDate: new Date('2026-05-28'),
      diagnosisSource: 'Clinical exam', notes: 'Monitor SCC levels',
      attachments: [], createdById: vetUser.id,
    },
  })

  await prisma.treatment.create({
    data: {
      animalId: cowNala.id, organizationId: ORG_ID,
      condition: 'Suspected Lumpy Skin Disease', status: TreatmentStatus.IN_PROGRESS,
      priority: TreatmentPriority.CRITICAL, startDate: new Date('2026-05-20'),
      medication: 'Oxytetracycline + Anti-inflammatory', dosage: '10mg/kg IM daily',
      frequency: 'Once daily', route: 'Intramuscular', temperature: 40.1, weight: 410,
      assignedVetName: 'Dr. Emily Carter', isolationRequired: true,
      isolationLocation: 'Sick Bay', followUpDate: new Date('2026-06-03'),
      diagnosisSource: 'Clinical exam — lab pending', notes: 'Quarantine enforced',
      attachments: [], createdById: vetUser.id,
    },
  })

  await prisma.treatment.create({
    data: {
      animalId: eweMaya.id, organizationId: ORG_ID,
      condition: 'Fractured Metatarsal — Left Hind', status: TreatmentStatus.IN_PROGRESS,
      priority: TreatmentPriority.MEDIUM, startDate: new Date('2026-05-10'),
      medication: 'Meloxicam + Procaine Penicillin', dosage: 'As directed',
      frequency: 'Once daily', route: 'Oral / IM', temperature: 38.8, weight: 65,
      assignedVetName: 'Dr. Emily Carter', isolationRequired: true,
      isolationLocation: 'Recovery Pen', followUpDate: new Date('2026-06-01'),
      diagnosisSource: 'Clinical exam + X-ray', notes: 'Splint check weekly',
      attachments: [], createdById: vetUser.id,
    },
  })

  console.log('💊 Treatments created')

  // ──────────────────────────────────────────────────────────────────────────
  // DISEASE OUTBREAKS
  // ──────────────────────────────────────────────────────────────────────────
  const mastitisOutbreak = await prisma.diseaseOutbreak.create({
    data: {
      organizationId: ORG_ID, name: 'Mastitis Cluster — Dairy Unit A',
      category: DiseaseCategory.INFECTIOUS, severity: DiseaseSeverity.MEDIUM,
      trend: DiseaseTrend.FALLING, firstCaseDate: new Date('2026-04-25'),
      lastCaseDate: new Date('2026-04-28'), isActive: true,
      quarantineActive: true, quarantineZone: 'Recovery Pen',
      containmentNotes: 'Affected animals isolated; improved teat dip protocol',
      treatmentProtocol: 'Intramammary antibiotics + systemic OTC',
      preventionMeasures: 'Pre- and post-milking teat dipping; dry-cow therapy',
      reportedToAuthorities: false, notes: 'Situation improving — 1 active case',
      createdById: vetUser.id,
    },
  })

  await prisma.diseaseOutbreakAnimal.create({
    data: {
      outbreakId: mastitisOutbreak.id, animalId: cowDaisy.id,
      dateAffected: new Date('2026-04-28'), isRecovered: false, notes: 'Primary case',
    },
  })

  const lsdOutbreak = await prisma.diseaseOutbreak.create({
    data: {
      organizationId: ORG_ID, name: 'Suspected LSD — Nala',
      category: DiseaseCategory.INFECTIOUS, severity: DiseaseSeverity.HIGH,
      trend: DiseaseTrend.STABLE, firstCaseDate: new Date('2026-05-20'),
      lastCaseDate: new Date('2026-05-20'), isActive: true,
      quarantineActive: true, quarantineZone: 'Sick Bay',
      containmentNotes: 'Single animal quarantined; vectors being controlled',
      treatmentProtocol: 'Symptomatic support + antibiotics for secondary infections',
      preventionMeasures: 'Vector control; vaccination of remaining herd planned',
      reportedToAuthorities: true, notes: 'Awaiting DVS lab confirmation',
      createdById: vetUser.id,
    },
  })

  await prisma.diseaseOutbreakAnimal.create({
    data: {
      outbreakId: lsdOutbreak.id, animalId: cowNala.id,
      dateAffected: new Date('2026-05-20'), isRecovered: false, notes: 'Index case',
    },
  })

  console.log('🦠 Disease outbreaks created')

  // ──────────────────────────────────────────────────────────────────────────
  // VETERINARY NOTES
  // ──────────────────────────────────────────────────────────────────────────
 await prisma.veterinaryNote.createMany({
  data: [
    {
      animalId: cowBella.id,
      organizationId: ORG_ID,
      veterinarianId: emilyVetProfile.id,
      date: new Date('2026-05-04'),
      examination: 'Post-breeding examination — rectal palpation',
      diagnosis: 'Healthy — possible early pregnancy',
      recommendations: 'Monitor for pregnancy signs; repeat check in 4 weeks',
      prescriptions: 'Mineral supplements — Calfera 500ml',
      followUpDate: new Date('2026-06-04'),
      attachments: [],
      notes: 'Excellent breeding condition. Bull coverage confirmed.',
    },
    {
      animalId: bullAtlas.id,
      organizationId: ORG_ID,
      veterinarianId: emilyVetProfile.id,
      date: new Date('2026-03-10'),
      examination: 'Breeding soundness evaluation',
      diagnosis: 'Healthy — BSE score 90/100',
      recommendations: 'Maintain current nutrition; limit to 25 cows per season',
      prescriptions: 'Vitamin E/Se injection pre-season',
      followUpDate: new Date('2026-09-10'),
      attachments: [],
      notes: 'Slightly lower motility than last year — monitor.',
    },
    {
      animalId: ramThor.id,
      organizationId: ORG_ID,
      veterinarianId: michaelVetProfile.id,
      date: new Date('2026-02-12'),
      examination: 'Breeding fitness evaluation',
      diagnosis: 'Healthy — cleared for breeding',
      recommendations: 'Maintain current nutrition regimen',
      attachments: [],
      notes: 'Strong breeding condition. FAMACHA score 2.',
    },
    {
      animalId: goatLuna.id,
      organizationId: ORG_ID,
      veterinarianId: michaelVetProfile.id,
      date: new Date('2026-04-05'),
      examination: 'Post-vaccination check + general exam',
      diagnosis: 'Healthy',
      recommendations: 'Ready for breeding — active heat observed',
      attachments: [],
      notes: 'FAMACHA score 1. Good body condition.',
    },
    {
      animalId: sowPeach.id,
      organizationId: ORG_ID,
      veterinarianId: emilyVetProfile.id,
      date: new Date('2026-02-20'),
      examination: 'Pre-farrowing examination',
      diagnosis: 'Pregnant — approximately 8 weeks to farrowing',
      recommendations: 'Move to farrowing crate at week 110 of gestation',
      prescriptions: 'Farrowsure Gold B vaccination administered',
      followUpDate: new Date('2026-04-20'),
      attachments: [],
      notes: 'Good body condition score. Expected litter: 10-12 piglets.',
    },
  ],
})

  console.log('📝 Veterinary notes created')

  // ──────────────────────────────────────────────────────────────────────────
  // HEAT CYCLES
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.heatCycle.createMany({
    data: [
      {
        animalId: cowBella.id, organizationId: ORG_ID,
        lastHeatDate: new Date('2026-05-01'), nextExpectedDate: new Date('2026-05-22'),
        cycleLengthDays: 21, status: HeatCycleStatus.EXPECTED,
        intensity: 'Strong', observedBy: 'Grace Wanjiru',
        notes: 'Normal cycle — bred on 05-03', createdById: ADMIN_ID,
      },
      {
        animalId: cowRose.id, organizationId: ORG_ID,
        lastHeatDate: new Date('2026-04-15'), nextExpectedDate: new Date('2026-05-06'),
        cycleLengthDays: 21, status: HeatCycleStatus.OVERDUE,
        intensity: 'Moderate', observedBy: 'James Odhiambo',
        notes: 'Overdue — check for silent heat', createdById: managerUser.id,
      },
      {
        animalId: goatLuna.id, organizationId: ORG_ID,
        lastHeatDate: new Date('2026-05-07'), nextExpectedDate: new Date('2026-05-28'),
        cycleLengthDays: 21, status: HeatCycleStatus.ACTIVE,
        intensity: 'Strong', observedBy: 'Grace Wanjiru',
        notes: 'Ready for breeding — Zeus introduced', createdById: ADMIN_ID,
      },
      {
        animalId: eweAurora.id, organizationId: ORG_ID,
        lastHeatDate: new Date('2026-05-12'), nextExpectedDate: new Date('2026-06-02'),
        cycleLengthDays: 17, status: HeatCycleStatus.EXPECTED,
        intensity: 'Moderate', observedBy: 'Grace Wanjiru',
        notes: 'Normal cycle', createdById: workerUser.id,
      },
    ],
  })

  console.log('🌡️ Heat cycles created')

  // ──────────────────────────────────────────────────────────────────────────
  // BREEDING RECORDS
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.breeding.createMany({
    data: [
      {
        damId: cowBella.id, sireId: bullAtlas.id, organizationId: ORG_ID,
        breedingDate: new Date('2026-05-03'), method: BreedingMethod.NATURAL,
        outcome: BreedingOutcome.PENDING, expectedBirthDate: new Date('2027-02-10'),
        inbreedingCoeff: 0.025, confirmedPregnancy: false,
        veterinarian: 'Dr. Emily Carter', location: 'Breeding Paddock',
        notes: 'First attempt — Atlas × Bella cross',
        attachments: [], createdById: ADMIN_ID,
      },
      {
        damId: cowRose.id, sireId: bullTitan.id, organizationId: ORG_ID,
        breedingDate: new Date('2026-03-20'), method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        outcome: BreedingOutcome.PENDING, expectedBirthDate: new Date('2027-01-04'),
        inbreedingCoeff: 0.015, confirmedPregnancy: false,
        veterinarian: 'Dr. Emily Carter', location: 'AI Unit',
        notes: 'Angus semen imported — Titan sire line',
        attachments: [], createdById: ADMIN_ID,
      },
      {
        damId: goatLuna.id, sireId: buckZeus.id, organizationId: ORG_ID,
        breedingDate: new Date('2026-05-08'), method: BreedingMethod.NATURAL,
        outcome: BreedingOutcome.PENDING, expectedBirthDate: new Date('2026-10-03'),
        inbreedingCoeff: 0.01, confirmedPregnancy: false,
        veterinarian: 'Dr. Michael Reed', location: 'Goat House',
        notes: 'Zeus × Luna — expected twin kids',
        attachments: [], createdById: ADMIN_ID,
      },
      {
        damId: eweAurora.id, sireId: ramThor.id, organizationId: ORG_ID,
        breedingDate: new Date('2026-01-10'), method: BreedingMethod.NATURAL,
        outcome: BreedingOutcome.SUCCESSFUL, expectedBirthDate: new Date('2026-06-05'),
        actualBirthDate: new Date('2026-06-02'), offspringCount: 2,
        inbreedingCoeff: 0.015, confirmedPregnancy: true,
        veterinarian: 'Dr. Michael Reed', location: 'Sheep Section',
        notes: 'Twin lambs born — both healthy. Thor × Aurora',
        attachments: [], createdById: managerUser.id,
      },
    ],
  })

  console.log('🧬 Breeding records created')

  // ──────────────────────────────────────────────────────────────────────────
  // FEED INVENTORY
  // ──────────────────────────────────────────────────────────────────────────
  const dairyMeal = await prisma.feedItem.create({
    data: {
      organizationId: ORG_ID, name: 'Unga Dairy Meal 18%', type: FeedType.DAIRY,
      quantityKg: 320, minimumKg: 100, maximumKg: 600, costPerKg: 52, totalValue: 16640,
      supplier: 'Unga Farm Care', supplierPhone: '+254722000100',
      supplierEmail: 'orders@ungafarmcare.co.ke', lastRestocked: new Date('2026-05-01'),
      expiryDate: new Date('2026-09-01'), batchNumber: 'UFG-2605-002',
      storageLocation: 'Feed Store A', notes: 'Primary cattle feed',
      proteinPct: 18, energyMcal: 2.8, moisturePct: 11, createdById: ADMIN_ID,
    },
  })

  const goatPellets = await prisma.feedItem.create({
    data: {
      organizationId: ORG_ID, name: 'Goat & Sheep Pellets', type: FeedType.GOAT,
      quantityKg: 85, minimumKg: 30, maximumKg: 200, costPerKg: 58, totalValue: 4930,
      supplier: 'Vegpro Kenya', supplierPhone: '+254733000200',
      lastRestocked: new Date('2026-04-28'), expiryDate: new Date('2026-10-28'),
      batchNumber: 'VPK-2604-011', storageLocation: 'Feed Store B',
      notes: 'Small ruminant feed', proteinPct: 16, energyMcal: 2.6, moisturePct: 10,
      createdById: ADMIN_ID,
    },
  })

  const pigFinisher = await prisma.feedItem.create({
    data: {
      organizationId: ORG_ID, name: 'Pig Grower-Finisher 16%', type: FeedType.PIG,
      quantityKg: 60, minimumKg: 20, maximumKg: 200, costPerKg: 55, totalValue: 3300,
      supplier: 'Pronutro Kenya', supplierPhone: '+254711000800',
      lastRestocked: new Date('2026-05-05'), expiryDate: new Date('2026-11-05'),
      batchNumber: 'PRN-2605-009', storageLocation: 'Feed Store B',
      notes: 'Finishing ration for pigs', proteinPct: 16, energyMcal: 3.1, moisturePct: 12,
      createdById: ADMIN_ID,
    },
  })

  const layerMash = await prisma.feedItem.create({
    data: {
      organizationId: ORG_ID, name: 'Fugo Layer Mash 17%', type: FeedType.POULTRY,
      quantityKg: 150, minimumKg: 50, maximumKg: 400, costPerKg: 48, totalValue: 7200,
      supplier: 'Fugo Feeds', supplierPhone: '+254700000900',
      lastRestocked: new Date('2026-05-03'), expiryDate: new Date('2026-08-03'),
      batchNumber: 'FUG-2605-041', storageLocation: 'Feed Store A',
      notes: 'Layer hen feed — 48 birds', proteinPct: 17, energyMcal: 2.6, moisturePct: 13,
      createdById: ADMIN_ID,
    },
  })

  const rhodesGrass = await prisma.feedItem.create({
    data: {
      organizationId: ORG_ID, name: 'Rhodes Grass Hay', type: FeedType.ROUGHAGE,
      quantityKg: 500, minimumKg: 150, maximumKg: 1000, costPerKg: 15, totalValue: 7500,
      supplier: 'Ol Kalou Hay Suppliers', supplierPhone: '+254722001100',
      lastRestocked: new Date('2026-04-20'), batchNumber: 'RGH-2604-003',
      storageLocation: 'Hay Barn', notes: 'Cattle & small ruminant roughage',
      proteinPct: 8, energyMcal: 1.8, moisturePct: 15, createdById: managerUser.id,
    },
  })

  console.log('🌾 Feed inventory created')

  // ──────────────────────────────────────────────────────────────────────────
  // MEDICINE INVENTORY
  // ──────────────────────────────────────────────────────────────────────────
  const cepravin = await prisma.medicineItem.create({
    data: {
      organizationId: ORG_ID, name: 'Cepravin', category: MedicineCategory.ANTIBIOTIC,
      quantity: 8, unit: 'syringes', minimumQty: 6, maximumQty: 24,
      costPerUnit: 450, totalValue: 3600, expiryDate: new Date('2027-03-31'),
      batchNumber: 'CPV-2503-041', usageCount: 4,
      supplier: 'Kenvet Supplies', supplierPhone: '+254700000300',
      manufacturer: 'Boehringer', licenseNo: 'KE-VET-2021-0088',
      storageTemp: 'cool-dry', storageLocation: 'Medicine Cabinet A',
      withdrawalDays: 3, activeIngredient: 'Cephapirin benzathine',
      dosageInstructions: '1 syringe per affected quarter',
      notes: 'Primary mastitis treatment', createdById: vetUser.id,
    },
  })

  const fmdVaccine = await prisma.medicineItem.create({
    data: {
      organizationId: ORG_ID, name: 'FMD Trivalent Vaccine', category: MedicineCategory.VACCINE,
      quantity: 15, unit: 'doses', minimumQty: 10, maximumQty: 50,
      costPerUnit: 320, totalValue: 4800, expiryDate: new Date('2026-12-31'),
      batchNumber: 'FMD-2601-KEV', usageCount: 5,
      supplier: 'Kevevapi', supplierPhone: '+254020000500',
      manufacturer: 'Kenya Veterinary Vaccines Institute', licenseNo: 'KE-VET-GOV-FMD',
      storageTemp: 'refrigerated', storageLocation: 'Vaccine Fridge',
      withdrawalDays: 0, activeIngredient: 'Inactivated FMD virus (types O, A, SAT)',
      dosageInstructions: '2ml IM annually', notes: 'Maintain cold chain at 2-8°C',
      createdById: vetUser.id,
    },
  })

  const oxytet = await prisma.medicineItem.create({
    data: {
      organizationId: ORG_ID, name: 'Oxytetracycline 20%', category: MedicineCategory.ANTIBIOTIC,
      quantity: 4, unit: 'bottles', minimumQty: 2, maximumQty: 12,
      costPerUnit: 850, totalValue: 3400, expiryDate: new Date('2027-06-30'),
      batchNumber: 'OXT-2504-007', usageCount: 3,
      supplier: 'Kenvet Supplies', supplierPhone: '+254700000300',
      manufacturer: 'Norbrook', licenseNo: 'KE-VET-OXT-2020',
      storageTemp: 'cool-dry', storageLocation: 'Medicine Cabinet A',
      withdrawalDays: 28, activeIngredient: 'Oxytetracycline dihydrate 200mg/ml',
      dosageInstructions: '10mg/kg IM once daily for 3-5 days',
      notes: 'Broad-spectrum — cattle, sheep, goats, pigs', createdById: vetUser.id,
    },
  })

  const albendazole = await prisma.medicineItem.create({
    data: {
      organizationId: ORG_ID, name: 'Albendazole 2.5% Oral', category: MedicineCategory.DEWORMER,
      quantity: 6, unit: 'bottles', minimumQty: 3, maximumQty: 20,
      costPerUnit: 380, totalValue: 2280, expiryDate: new Date('2027-09-30'),
      batchNumber: 'ALB-2502-019', usageCount: 8,
      supplier: 'Kenvet Supplies', supplierPhone: '+254700000300',
      manufacturer: 'Chanelle Pharma', licenseNo: 'KE-VET-ALB-2019',
      storageTemp: 'room-temp', storageLocation: 'Medicine Shelf B',
      withdrawalDays: 14, activeIngredient: 'Albendazole 25mg/ml',
      dosageInstructions: '7.5mg/kg oral — cattle; 5mg/kg — sheep/goats',
      notes: 'Broad-spectrum anthelmintic', createdById: vetUser.id,
    },
  })

  const meloxicam = await prisma.medicineItem.create({
    data: {
      organizationId: ORG_ID, name: 'Metacam 20mg/ml (Meloxicam)', category: MedicineCategory.TREATMENT,
      quantity: 3, unit: 'bottles', minimumQty: 2, maximumQty: 10,
      costPerUnit: 1200, totalValue: 3600, expiryDate: new Date('2027-12-31'),
      batchNumber: 'MTC-2601-031', usageCount: 2,
      supplier: 'Boehringer Kenya', supplierPhone: '+254702000400',
      manufacturer: 'Boehringer Ingelheim', licenseNo: 'KE-VET-MTC-2022',
      storageTemp: 'room-temp', storageLocation: 'Medicine Cabinet A',
      withdrawalDays: 5, activeIngredient: 'Meloxicam 20mg/ml',
      dosageInstructions: '0.5mg/kg IV or SC once',
      notes: 'NSAID — pain and fever management', createdById: vetUser.id,
    },
  })

  console.log('💊 Medicine inventory created')

  // ──────────────────────────────────────────────────────────────────────────
  // EQUIPMENT
  // ──────────────────────────────────────────────────────────────────────────
  const milkingMachine = await prisma.equipmentItem.create({
    data: {
      organizationId: ORG_ID, name: 'Milking Machine', type: 'dairy',
      status: EquipmentStatus.OPERATIONAL, serialNumber: 'MM-DL4-2022-0071',
      model: 'Delaval DL-400', manufacturer: 'DeLaval',
      purchaseDate: new Date('2022-03-15'), purchaseCost: 285000, currentValue: 190000,
      lastServiceDate: new Date('2026-03-01'), nextServiceDate: new Date('2026-09-01'),
      serviceIntervalDays: 180, usageHours: 1840, maxUsageHours: 5000,
      assignedTo: 'Dairy Unit A', location: 'Milking Parlour',
      warrantyExpiry: new Date('2027-03-15'), supplier: 'Leldet Kenya',
      supplierPhone: '+254722000600', notes: 'Operational and recently serviced',
      createdById: ADMIN_ID,
    },
  })

  const tractorJD = await prisma.equipmentItem.create({
    data: {
      organizationId: ORG_ID, name: 'John Deere 5075E Tractor', type: 'vehicle',
      status: EquipmentStatus.OPERATIONAL, serialNumber: 'JD5075E-KE-2021-088',
      model: '5075E', manufacturer: 'John Deere',
      purchaseDate: new Date('2021-06-01'), purchaseCost: 1800000, currentValue: 1300000,
      lastServiceDate: new Date('2026-04-01'), nextServiceDate: new Date('2026-10-01'),
      serviceIntervalDays: 180, usageHours: 2240, maxUsageHours: 10000,
      location: 'Equipment Shed', warrantyExpiry: new Date('2026-06-01'),
      supplier: 'CFAO Equipment Kenya', supplierPhone: '+254202000700',
      notes: '75HP — main farm tractor', createdById: ADMIN_ID,
    },
  })

  const feedMixer = await prisma.equipmentItem.create({
    data: {
      organizationId: ORG_ID, name: 'Total Mixed Ration Mixer', type: 'feeding',
      status: EquipmentStatus.MAINTENANCE, serialNumber: 'TMR-BM1-2020-014',
      model: 'BM-1000', manufacturer: 'Bonsilage',
      purchaseDate: new Date('2020-09-10'), purchaseCost: 420000, currentValue: 250000,
      lastServiceDate: new Date('2025-11-15'), nextServiceDate: new Date('2026-05-15'),
      serviceIntervalDays: 180, usageHours: 3100, maxUsageHours: 8000,
      location: 'Feed Preparation Area', supplier: 'Agri-Tech Kenya',
      supplierPhone: '+254733000300', maintenanceNotes: 'Mixing auger being repaired — ETA 3 days',
      notes: 'Currently under repair', createdById: ADMIN_ID,
    },
  })

  const crushHolding = await prisma.equipmentItem.create({
    data: {
      organizationId: ORG_ID, name: 'Cattle Crush / Restraint Unit', type: 'medical',
      status: EquipmentStatus.OPERATIONAL, serialNumber: 'CCR-2019-041',
      model: 'Galvanised Cattle Crush Pro', manufacturer: 'Farmquip Kenya',
      purchaseDate: new Date('2019-03-01'), purchaseCost: 65000, currentValue: 45000,
      lastServiceDate: new Date('2026-01-10'), nextServiceDate: new Date('2026-07-10'),
      serviceIntervalDays: 180, location: 'Handling Yard',
      supplier: 'Farmquip Kenya', supplierPhone: '+254711000200',
      notes: 'Used for treatments and pregnancy checks', createdById: ADMIN_ID,
    },
  })

  console.log('🚜 Equipment created')

  // ──────────────────────────────────────────────────────────────────────────
  // STOCK TRANSACTIONS
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.stockTransaction.createMany({
    data: [
      {
        organizationId: ORG_ID, type: StockTransactionType.RESTOCK, resourceType: 'feed',
        feedItemId: dairyMeal.id, quantityBefore: 120, quantityChange: 200, quantityAfter: 320,
        costPerUnit: 52, totalCost: 10400, reason: 'Monthly restock', batchNumber: 'UFG-2605-002',
        notes: 'Delivery from Unga Farm Care — verified & counted', performedById: managerUser.id,
      },
      {
        organizationId: ORG_ID, type: StockTransactionType.CONSUME, resourceType: 'medicine',
        medicineItemId: cepravin.id, quantityBefore: 12, quantityChange: -4, quantityAfter: 8,
        costPerUnit: 450, totalCost: 1800, reason: 'Mastitis treatment — Daisy',
        referenceId: mastitisTreatment.id, notes: 'Used for CAT-003 (Daisy)',
        performedById: vetUser.id,
      },
      {
        organizationId: ORG_ID, type: StockTransactionType.CONSUME, resourceType: 'feed',
        feedItemId: dairyMeal.id, quantityBefore: 320, quantityChange: -15, quantityAfter: 305,
        costPerUnit: 52, totalCost: 780, reason: 'Daily cattle feeding — morning round',
        performedById: workerUser.id,
      },
      {
        organizationId: ORG_ID, type: StockTransactionType.CONSUME, resourceType: 'feed',
        feedItemId: layerMash.id, quantityBefore: 165, quantityChange: -15, quantityAfter: 150,
        costPerUnit: 48, totalCost: 720, reason: 'Daily poultry feeding',
        performedById: workerUser.id,
      },
      {
        organizationId: ORG_ID, type: StockTransactionType.RESTOCK, resourceType: 'medicine',
        medicineItemId: fmdVaccine.id, quantityBefore: 5, quantityChange: 10, quantityAfter: 15,
        costPerUnit: 320, totalCost: 3200, reason: 'Annual vaccine restock', batchNumber: 'FMD-2601-KEV',
        notes: 'Cold chain maintained — received from Kevevapi', performedById: vetUser.id,
      },
    ],
  })

  console.log('📦 Stock transactions created')

  // ──────────────────────────────────────────────────────────────────────────
  // EQUIPMENT EVENTS
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.equipmentEvent.createMany({
    data: [
      {
        organizationId: ORG_ID, equipmentId: milkingMachine.id,
        eventType: EquipmentEventType.SERVICE, eventDate: new Date('2026-03-01'),
        description: 'Routine 6-month service — pulsators, liners, vacuum tested',
        cost: 12500, technicianName: 'Leldet Kenya Service Engineer',
        nextActionDate: new Date('2026-09-01'), hoursAtEvent: 1820,
        notes: 'All systems operational — minor vacuum leak sealed', performedById: ADMIN_ID,
      },
      {
        organizationId: ORG_ID, equipmentId: tractorJD.id,
        eventType: EquipmentEventType.SERVICE, eventDate: new Date('2026-04-01'),
        description: 'Engine service — oil, filters, belts replaced',
        cost: 18000, technicianName: 'CFAO Equipment Kenya Technician',
        nextActionDate: new Date('2026-10-01'), hoursAtEvent: 2220,
        notes: 'Hydraulic fluid also topped up', performedById: ADMIN_ID,
      },
      {
        organizationId: ORG_ID, equipmentId: feedMixer.id,
        eventType: EquipmentEventType.REPAIR, eventDate: new Date('2026-05-22'),
        description: 'Mixing auger shaft broken — replacement ordered',
        cost: 35000, technicianName: 'Agri-Tech Kenya Technician',
        nextActionDate: new Date('2026-05-28'), hoursAtEvent: 3095,
        notes: 'ETA for part: 2026-05-25 — downtime 3-5 days', performedById: managerUser.id,
      },
    ],
  })

  console.log('🔧 Equipment events created')
  console.log('')
  console.log('✅  HerdWise seed completed for "My Farm" (Gavin Arori)')
  console.log('   Organisation ID : ' + ORG_ID)
  console.log('   Admin user ID   : ' + ADMIN_ID)
  console.log('   Animals         : 18')
  console.log('   Health records  : 10')
  console.log('   Treatments      : 3 active')
  console.log('   Outbreaks       : 2 (1 medium, 1 high)')
  console.log('   Breeding events : 4')
  console.log('   Feed items      : 5')
  console.log('   Medicine items  : 5')
  console.log('   Equipment       : 4 items')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })