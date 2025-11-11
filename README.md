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

Overdrip uses a **direct Google OAuth authentication flow** with immediate device registration:

### 1. Device Setup (On Pi)

```bash
$ overdrip setup
```

- CLI prompts for device name (or asks to keep/change existing name for re-auth)
- CLI starts local OAuth server and opens Google sign-in in browser
- User authenticates with Google using PKCE (Proof Key for Code Exchange)
- CLI exchanges OAuth tokens for Firebase authentication
- CLI calls `setupDevice` Cloud Function with user authentication
- Device is immediately registered and ready to use

### 2. Runtime Operations

- Pi authenticates automatically on boot using stored credentials
- Device pushes sensor data and pulls configuration from Firestore
- Web dashboard displays all registered devices with real-time updates

### Key Features

- **Direct Google OAuth** - Secure PKCE flow, no client secrets needed
- **Immediate Registration** - Devices registered instantly during setup
- **Custom Device Names** - Users name devices during setup process
- **Re-authentication Support** - Existing devices can re-authenticate seamlessly
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

- OAuth-based authentication with PKCE security
- `setupDevice` Cloud Function with user authentication
- CLI with React-based UI and standalone executable compilation
- Web app with Google Sign-In and device dashboard
- Device management (unregister with confirmation)
- Shared type-safe schemas (Zod)
- Firestore security rules
- Monitoring infrastructure (Terraform-managed metrics, dashboards, alerts)

🔄 **In Progress:**

- Pi runtime operations (sensor data push/pull)
- Device status reporting and heartbeat system

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
/users/{userId}/devices/{deviceId}
  name: string
  registeredAt: timestamp    # Only set for new devices
  lastSetup: timestamp       # Updated on each re-authentication
  setupMethod: "google_oauth"

/devices/{deviceId}
  lastSeen: timestamp

/devices/{deviceId}/metrics/{metricId}  # Sensor data
/devices/{deviceId}/config               # Device configuration
/devices/{deviceId}/events/{eventId}     # Device events
```

## License

MIT License
