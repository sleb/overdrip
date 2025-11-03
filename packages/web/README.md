# @overdrip/web

React web application for user authentication and device registration for the Overdrip plant watering system.

## Features

- **Google Sign-In** - Users authenticate with their Google account
- **Device Registration** - Enter registration code from Raspberry Pi to claim devices
- **Dashboard** - View all registered devices with real-time updates
- **Device Management** - Unregister devices with confirmation dialog
- **Responsive Design** - Works on desktop and mobile
- **Modern UI** - Built with shadcn/ui components and Tailwind CSS

## Development

Start the development server:

```bash
bun dev
```

The app will be available at http://localhost:3000

## Tech Stack

- **Framework**: React 18 with React Router
- **Build Tool**: Bun's built-in bundler (via `Bun.serve()`)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (customized)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Shared Code**: `@overdrip/core` for Firebase config and schemas

## Project Structure

```
src/
├── pages/
│   ├── login.tsx              # Google Sign-In page
│   ├── register-device.tsx    # Device registration form
│   └── dashboard.tsx          # Device list with real-time updates
├── components/
│   ├── device-card.tsx        # Reusable device card component
│   └── ui/                    # shadcn/ui primitives
├── lib/
│   ├── register-device.ts     # Device registration logic
│   └── utils.ts               # Utility functions (cn helper)
├── router.tsx                 # React Router configuration
├── main.tsx                   # App entry point
└── index.html                 # HTML template
```

## Routes

- `/` - Redirects to `/login` if not authenticated
- `/login` - Google Sign-In page
- `/dashboard` - Device list (requires auth)
- `/register-device` - Device registration form (requires auth)

## Key Features

### Real-Time Device List

The dashboard uses Firestore's `onSnapshot` to listen for real-time updates:

```typescript
const unsubscribe = onSnapshot(
  query(collection(db, `users/${user.uid}/devices`)),
  (snapshot) => {
    const devices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      registeredAt: doc.data().registeredAt.toDate()
    }));
    setDevices(devices);
  }
);
```

### Device Registration Flow

1. User clicks "Register New Device" on dashboard
2. Form validates registration code format (`XXXX-XXXX`)
3. Calls `registerDevice` Cloud Function via `httpsCallable`
4. Function validates code, links device to user, deletes one-time code
5. Real-time listener automatically updates dashboard

### Device Unregistration

- Each device card has an "Unregister" button
- Confirmation dialog prevents accidental deletion
- Uses Firestore `deleteDoc` to remove device from user's collection
- Real-time listener automatically updates UI

## shadcn/ui Components

This project uses shadcn/ui components. Add new components with:

```bash
bunx shadcn@latest add <component-name>
```

**Installed components:**
- Button
- Card (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- Input
- Label
- Select
- Dropdown Menu
- Navigation Menu

**Component Organization:**
- UI primitives: `src/components/ui/` (from shadcn)
- Domain components: `src/components/` (e.g., `device-card.tsx`)

**Configuration:** See `components.json` for shadcn settings

## Building for Production

TODO: Add production build commands

## Deployment

Deploy to Firebase Hosting:

```bash
# Build and deploy
firebase deploy --only hosting
```

## Environment Variables

Firebase config is centralized in `@overdrip/core/config.ts`. No environment variables needed for the web app.

## Current Status

✅ **Complete:**
- Google Sign-In authentication flow
- Device registration with code validation
- Dashboard with real-time device list
- Device card component following shadcn patterns
- Unregister functionality with confirmation

🔄 **TODO:**
- Device name editing
- Device detail view with sensor data
- Device configuration UI
- Production build and Firebase Hosting deployment
