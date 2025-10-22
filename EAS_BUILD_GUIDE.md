# EAS Build Guide for Android

## Prerequisites

- EAS CLI installed globally (already done)
- Expo account (create at https://expo.dev)
- Android device or emulator

## Setup Steps

### 1. Login to EAS

```bash
eas login
```

### 2. Configure Project

```bash
eas build:configure
```

This will link your project to EAS and update the projectId in app.json.

### 3. Build for Android Device

#### Development Build (Recommended for testing)

```bash
eas build --profile development --platform android
```

This creates an APK you can install directly on your device.

#### Preview Build

```bash
eas build --profile preview --platform android
```

Creates an APK for internal distribution.

#### Production Build

```bash
eas build --profile production --platform android
```

Creates a production-ready APK.

## Build Profiles Explained

### Development Profile

- Includes dev tools
- Faster builds
- Good for testing Firebase integration
- APK format (easy to install)

### Preview Profile

- Production-like build
- No dev tools
- Internal testing
- APK format

### Production Profile

- Optimized for production
- Smallest size
- Ready for Play Store
- Can be APK or AAB

## Installing on Your Device

### Option 1: Direct Download

1. After build completes, EAS provides a download URL
2. Open URL on your Android device
3. Download and install the APK
4. Enable "Install from Unknown Sources" if prompted

### Option 2: QR Code

1. Scan the QR code shown after build
2. Download and install on device

### Option 3: Local Build (Faster)

```bash
eas build --profile development --platform android --local
```

Requires Android SDK installed locally.

## Troubleshooting

### Google Services

Ensure `google-services.json` is in:

- Project root
- `android/app/` directory

### Permissions

If Firebase auth fails, check AndroidManifest.xml has:

- INTERNET permission
- ACCESS_NETWORK_STATE permission

### Build Fails

```bash
eas build:list
```

Check build logs for detailed errors.

## Quick Commands

```bash
# Check build status
eas build:list

# View build details
eas build:view [build-id]

# Submit to Play Store
eas submit --platform android

# Update credentials
eas credentials
```

## Testing the Login

1. Install APK on device
2. Open app
3. Test login/signup with Firebase
4. Verify authentication works
5. Test password reset email

## Next Steps

- Add app signing for Play Store
- Configure push notifications
- Set up CI/CD for automated builds
- Add error tracking (Sentry, Bugsnag)

## File Structure

```
mybill/
├── eas.json              # EAS build configuration
├── app.json              # Expo app configuration
├── google-services.json  # Firebase config
└── android/
    └── app/
        └── google-services.json
```
