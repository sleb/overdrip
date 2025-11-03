# Overdrip

IoT plant watering system where Raspberry Pi devices authenticate with Firebase, push sensor data, and pull configuration.

## Project Structure

This is a Bun monorepo with platform-specific packages:

```
packages/
├── core/       # Shared platform-agnostic code (config, schemas)
├── cli/        # Raspberry Pi CLI (uses Bun APIs)
├── web/        # React web app (browser-safe)
└── functions/  # Firebase Cloud Functions (built with Bun, deployed to Node.js)

infrastructure/
└── terraform/  # Monitoring infrastructure (metrics, dashboards, alerts)
```

## Architecture

Overdrip uses a **custom token authentication flow** with registration codes:

### 1. Device Setup (On Pi)

```bash
$ overdrip setup
```

- CLI calls `createDevice` Cloud Function
- Function generates device ID and custom Firebase token
- Function generates registration code (e.g., `A3K9-PL2M`) and stores in Firestore
- CLI authenticates with custom token and displays registration code

### 2. Device Registration (On Web)

- User visits web app and signs in with Google
- User enters registration code from Pi
- Web app calls `registerDevice` Cloud Function
- Function links device to user account and deletes one-time code

### 3. Runtime Operations

- Pi authenticates automatically on boot using stored credentials
- Device pushes sensor data and pulls configuration from Firestore
- Web dashboard displays all registered devices with real-time updates

### Key Features

- **Server-side registration code generation** - Secure, Firebase-managed
- **Auto-cleanup** - Scheduled function deletes expired codes daily
- **Monitoring** - Terraform-managed dashboards and alerts
- **Type-safe API contracts** - Shared Zod schemas between client and server
- **Real-time updates** - Firestore listeners for instant UI updates

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2.23 or later
- [Terraform](https://terraform.io) (for infrastructure deployment)
- Firebase project configured

### Installation

Install dependencies for all packages:

```bash
bun install
```

### Development

**Run the web app:**

```bash
cd packages/web
bun dev
```

**Run the CLI:**

```bash
cd packages/cli
bun run src/cli.ts setup
```

**Build and deploy Cloud Functions:**

```bash
cd packages/functions
bun run build
firebase deploy --only functions
```

**Deploy monitoring infrastructure:**

```bash
cd infrastructure/terraform
terraform init
terraform apply
```

## Current Status

✅ **Complete:**
- Backend Cloud Functions (create, register, scheduled cleanup)
- Web app with Google Sign-In, device registration, and dashboard
- Device management (register, unregister with confirmation)
- Shared type-safe schemas (Zod)
- Firestore security rules (Cloud Functions-only write access)
- Monitoring infrastructure (Terraform-managed metrics, dashboards, alerts)

🔄 **In Progress:**
- CLI credential loading and session restoration
- Pi runtime operations (sensor data push/pull)

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React + React Router + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Scheduler)
- **Infrastructure**: Terraform + Google Cloud Monitoring
- **CLI Framework**: clerc + Ink (React for CLIs)
- **Type Safety**: TypeScript + Zod schemas

## Documentation

- **Functions API**: See [packages/functions/README.md](./packages/functions/README.md)
- **CLI Usage**: See [packages/cli/README.md](./packages/cli/README.md)
- **Web App**: See [packages/web/README.md](./packages/web/README.md)
- **Infrastructure**: See [infrastructure/README.md](./infrastructure/README.md)

## Firestore Structure

```
/registration-codes/{code}
  deviceId: string
  createdAt: timestamp  # Auto-deleted after 24h by scheduled function

/users/{userId}/devices/{deviceId}
  name: string
  code: string
  registeredAt: timestamp

/devices/{deviceId}
  lastSeen: timestamp

/devices/{deviceId}/metrics/{metricId}  # Sensor data
/devices/{deviceId}/config               # Device configuration
/devices/{deviceId}/events/{eventId}     # Device events
```

## License

MIT License
