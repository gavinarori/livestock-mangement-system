# Enterprise Livestock Management System

A comprehensive, enterprise-grade web application for managing livestock operations across multiple farms and organizations. Built with Next.js 16, Prisma, MongoDB, and shadcn/ui components for an accessible, scalable, and secure experience.

## Features

### Core Features
- **User Authentication**: Secure signup and login with JWT-based authentication and bcrypt hashing
- **Animal Management**: Create, read, update, and delete animal records with comprehensive tracking
- **Health & Veterinary Management**: Document vaccinations, treatments, diagnoses, and veterinary notes with timeline visualization
- **Breeding Program Tracking**: Record breeding events and offspring genealogy
- **Share Links**: Generate public/private shareable links for animal records
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Accessibility**: WCAG 2.1 AA compliant with proper semantic HTML and keyboard navigation

### Enterprise Features
- **Multi-Tenancy**: Complete organization isolation with separate data per farm/company
- **Role-Based Access Control (RBAC)**: 5 predefined roles (Admin, Manager, Veterinarian, Worker, Viewer) with granular permissions
- **Team Management**: Add and manage team members with role assignments and permission control
- **Organization Settings**: Customize organization details, branding, and resource limits
- **Analytics Dashboard**: Comprehensive herd metrics, health trends, disease tracking, and breeding insights
- **Subscription Tiers**: Support for different subscription plans with configurable resource limits

## Tech Stack

- **Frontend**: Next.js 16 with React 19 and Turbopack
- **Database**: MongoDB with Prisma ORM for type safety and migrations
- **Authentication**: Custom JWT with bcrypt password hashing
- **UI Components**: shadcn/ui with Tailwind CSS v4.2.0
- **Validation**: Zod for schema validation
- **Icons**: Lucide React
- **State Management**: Built-in React hooks with SWR for client-side caching

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd livestock-manager
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Update `.env.local` with your MongoDB connection string and JWT secret:
```
MONGODB_URI=mongodb://your-mongodb-connection-string
JWT_SECRET=your-secure-random-secret
```

4. Start the development server:
```bash
pnpm dev
```

5. Open http://localhost:3000 in your browser

## Project Structure

```
app/
├── api/                          # API routes
│   ├── auth/                     # Authentication endpoints
│   │   ├── signup/              # User registration
│   │   └── login/               # User login
│   └── animals/                 # Animal management endpoints
│       ├── route.ts             # List and create animals
│       ├── [id]/route.ts        # Get, update, delete animal
│       └── [id]/share/route.ts  # Share animal links
├── login/                        # Login page
├── signup/                       # Sign up page
├── animals/                      # Animal management pages
│   ├── page.tsx                 # Animals list
│   ├── new/                     # Create new animal
│   ├── [id]/                    # Animal detail
│   └── [id]/edit/               # Edit animal
└── layout.tsx                    # Root layout

components/
├── animals/
│   ├── animal-form.tsx          # Animal form component
│   └── animal-list.tsx          # Animal list component
├── auth/
│   ├── signup-form.tsx          # Signup form
│   └── login-form.tsx           # Login form
└── ui/                          # shadcn/ui components

lib/
├── auth/
│   ├── utils.ts                 # Auth utilities (hashing, JWT)
│   └── middleware.ts            # Auth middleware
├── db/
│   ├── client.ts                # MongoDB connection
│   └── models.ts                # TypeScript models
└── validations/
    └── index.ts                 # Zod schemas
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user and create organization
- `POST /api/auth/login` - Login user and return JWT token

### Animals (Multi-Tenant)
- `GET /api/animals` - Get all animals in organization (requires: animals:read)
- `POST /api/animals` - Create new animal (requires: animals:create)
- `GET /api/animals/[id]` - Get animal details (requires: animals:read)
- `PUT /api/animals/[id]` - Update animal (requires: animals:update)
- `DELETE /api/animals/[id]` - Delete animal (requires: animals:delete)

### Health & Veterinary
- `GET /api/animals/[id]/health` - Get health records (requires: health:read)
- `POST /api/animals/[id]/health` - Create health record (requires: health:create)
- `GET /api/animals/[id]/veterinary` - Get veterinary notes (requires: veterinary:read)
- `POST /api/animals/[id]/veterinary` - Create veterinary note (requires: veterinary:create)

### Sharing
- `POST /api/animals/[id]/share` - Create share link (requires: sharing:create)
- `GET /api/animals/[id]/share` - Get share details (requires: sharing:read)

### Organization & Members
- `GET /api/organization` - Get organization details (requires: organization:manage)
- `PUT /api/organization` - Update organization (requires: organization:manage)
- `GET /api/organization/members` - List organization members (requires: members:read)
- `POST /api/organization/members` - Add new member (requires: members:manage)

### Analytics
- `GET /api/analytics` - Get herd analytics and insights (requires: analytics:read)

## Database Schema (Prisma Models)

### Organization
```
{
  id: String (primary key)
  name: String
  slug: String (unique)
  description: String
  logo: String
  subscription: String (free | starter | professional | enterprise)
  maxAnimals: Int
  maxMembers: Int
  members: User[]
  animals: Animal[]
  healthRecords: HealthRecord[]
  veterinaryNotes: VeterinaryNote[]
  breedings: Breeding[]
  shares: AnimalShare[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### User
```
{
  id: String (primary key)
  email: String (unique)
  name: String
  password: String (hashed)
  role: UserRole (ADMIN | MANAGER | VETERINARIAN | WORKER | VIEWER)
  organization: Organization
  organizationId: String (foreign key)
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Animal
```
{
  id: String (primary key)
  name: String
  type: AnimalType (CATTLE | SHEEP | GOAT | PIG | POULTRY | HORSE | FISH | AQUATIC | OTHER)
  breed: String
  dateOfBirth: DateTime
  gender: AnimalGender (MALE | FEMALE | OTHER)
  healthStatus: HealthStatus (HEALTHY | SICK | INJURED | RECOVERING | DECEASED)
  weight: Float
  height: Float
  color: String
  distinctMarks: String
  identificationId: String
  notes: String
  location: String
  acquisitionDate: DateTime
  acquisitionPrice: Float
  parentMale: Animal (optional)
  parentFemale: Animal (optional)
  offspring: Animal[]
  organization: Organization
  organizationId: String (foreign key)
  healthRecords: HealthRecord[]
  veterinaryNotes: VeterinaryNote[]
  breedings: Breeding[]
  shares: AnimalShare[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### HealthRecord
```
{
  id: String (primary key)
  animal: Animal
  animalId: String (foreign key)
  organization: Organization
  organizationId: String (foreign key)
  recordType: String (vaccination | treatment | checkup | diagnosis)
  description: String
  date: DateTime
  recordedBy: String
  vaccineName: String
  vaccinationStatus: VaccinationStatus
  nextDueDate: DateTime
  diagnosis: String
  diseaseCategory: DiseaseCategory
  severity: String (mild | moderate | severe)
  treatment: String
  outcome: String
  temperature: Float
  weight: Float
  notes: String
  attachments: String[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### VeterinaryNote
```
{
  id: String (primary key)
  animal: Animal
  animalId: String (foreign key)
  organization: Organization
  organizationId: String (foreign key)
  veterinarian: String
  date: DateTime
  examination: String
  diagnosis: String
  recommendations: String
  prescriptions: String
  followUpDate: DateTime
  notes: String
  attachments: String[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Breeding
```
{
  id: String (primary key)
  animal: Animal
  animalId: String (foreign key)
  breedingAnimal: Animal
  breedingAnimalId: String (foreign key)
  organization: Organization
  organizationId: String (foreign key)
  breedingDate: DateTime
  expectedBirthDate: DateTime
  actualBirthDate: DateTime
  notes: String
  offspring: Int
  createdAt: DateTime
  updatedAt: DateTime
}
```

### AnimalShare
```
{
  id: String (primary key)
  animal: Animal
  animalId: String (foreign key)
  organization: Organization
  organizationId: String (foreign key)
  shareCode: String (unique)
  isPublic: Boolean
  expiresAt: DateTime
  viewCount: Int
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Phase 2 Enhancements (Roadmap)

- **IoT Integration**: Sensor data integration for real-time monitoring (temperature, weight, activity)
- **Advanced Breeding**: Extended genealogy, genetic tracking, and inbreeding coefficient calculation
- **Feed Management**: Feed inventory, nutrition plans, and cost tracking
- **Compliance Reporting**: Generate regulatory compliance reports and certifications
- **Advanced Analytics**: Predictive analytics, ML-based disease detection, performance benchmarking
- **File Management**: Photo gallery, document storage, and file sharing
- **Mobile App**: Native mobile applications for iOS and Android
- **Veterinary Integrations**: Direct integration with veterinary services and pharmacies
- **Export/Reports**: PDF report generation and data export capabilities
- **Audit Logging**: Complete audit trail of all changes for compliance

## Security Considerations

- All passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- API endpoints validate authentication
- Input validation with Zod schemas
- HTTPS recommended for production
- Consider adding CSRF protection for production

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or suggestions, please open an GitHub issue or contact the development team.
