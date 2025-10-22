# Login System Documentation

## Overview

This is a complete Firebase-based authentication system for React Native with Expo, featuring email/password authentication, password reset, and secure session management.

## Features

- Email/Password Login
- User Registration
- Password Reset via Email
- Secure Authentication State Management
- Form Validation
- Loading States
- Error Handling
- Auto-navigation based on auth state

## Structure

### Core Files

- `src/context/AuthContext.tsx` - Authentication context provider with Firebase integration
- `src/screens/LoginScreen.tsx` - Login/Register UI screen
- `src/screens/HomeScreen.tsx` - Protected home screen for authenticated users
- `src/navigation/AppNavigator.tsx` - Navigation logic with auth-based routing
- `App.tsx` - Root application component

## Usage

### Authentication Methods

#### Sign In

```typescript
const { signIn } = useAuth();
await signIn(email, password);
```

#### Sign Up

```typescript
const { signUp } = useAuth();
await signUp(email, password);
```

#### Sign Out

```typescript
const { signOut } = useAuth();
await signOut();
```

#### Reset Password

```typescript
const { resetPassword } = useAuth();
await resetPassword(email);
```

### Using Auth Context in Components

```typescript
import { useAuth } from "../context/AuthContext";

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return <ActivityIndicator />;

  return user ? <Text>{user.email}</Text> : <LoginButton />;
}
```

## Validation Rules

- Email must be valid format
- Password must be at least 6 characters
- All fields required

## Security Features

- Passwords hidden by default with toggle visibility
- Firebase secure authentication
- Auto session management
- Protected routes

## Running the App

1. Start the development server:

```bash
npm start
```

2. Run on Android:

```bash
npm run android
```

3. Run on iOS:

```bash
npm run ios
```

## Firebase Setup Required

Ensure `google-services.json` is properly configured in:

- Root directory
- `android/app/` directory

## Dependencies

- @react-native-firebase/app
- @react-native-firebase/auth
- @react-navigation/native
- @react-navigation/native-stack
- expo
