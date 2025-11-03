# GitHub Copilot Instructions

## Project Context

This is a React Native mobile application for bill/expense management built with:

- React Native (Expo)
- TypeScript
- Firebase (Auth, Firestore)
- React Navigation

## Design Philosophy

- **Style**: Minimalism - clean, simple, uncluttered interfaces
- **Theme**: Black and Orange color scheme
- **Language**: Vietnamese - all UI text must be in Vietnamese
- **Approach**: Focus on essential features, remove unnecessary elements

## Coding Standards

### General Rules

- Always use TypeScript with proper types
- Use functional components with React Hooks
- Follow React Native best practices
- Use SafeAreaView for all screens to handle device notches/edges
- Import SafeAreaView from 'react-native-safe-area-context'
- All UI text, labels, buttons, alerts, and messages must be in Vietnamese

### File Structure

- Components: PascalCase (e.g., `BudgetSetupScreen.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useAuth.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE

### Styling

- Use StyleSheet.create() for all styles
- Define styles at the bottom of the file
- **Minimalist Design Principles**:
  - Clean layouts with ample white space
  - Simple, clear typography
  - Minimal use of borders and shadows
  - Focus on content hierarchy
  - Use subtle animations if any
- **Color Scheme** (Black & Orange):
  - Primary (Orange): #FF6B35 or #FF8C42
  - Primary Dark (Orange): #E55525
  - Accent (Light Orange): #FFA474
  - Background: #000000 (Black)
  - Surface/Card: #1A1A1A (Dark Gray)
  - Text Primary: #FFFFFF (White)
  - Text Secondary: #B0B0B0 (Light Gray)
  - Text on Orange: #000000 (Black)
  - Border: #333333 (Subtle gray)
  - Error: #FF6B6B
  - Success: #51CF66

### Firebase/Firestore

- Always handle errors with try/catch
- Use proper TypeScript types for Firebase data
- Use serverTimestamp() for createdAt/updatedAt fields
- Structure document IDs meaningfully (e.g., `${userId}_${month}`)

### Navigation

- Use proper TypeScript types for navigation props
- Use `navigation.replace()` for login/signup flows
- Use `navigation.reset()` when changing auth state
- Pass route params for context (e.g., `fromSignup: true`)

### Error Handling

- Always wrap async operations in try/catch
- Show user-friendly Alert messages for errors
- Set loading states during async operations
- Validate user inputs before submission

### Forms

- Disable inputs during loading
- Show loading indicators in buttons
- Validate on submit, not on change (unless specified)
- Use appropriate keyboard types (email, decimal-pad, etc.)
- Clear form after successful submission when appropriate

### Code Organization

- Group related state variables together
- Define handler functions before the return statement
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks

## Project-Specific Rules

### Authentication

- After signup, always navigate to BudgetSetup screen
- Use `fromSignup` param to track signup flow
- Reset navigation stack after auth state changes

### Budget Management

- Store budgets in Firestore with format: `budgets/{userId}_{YYYY-MM}`
- Use current month format: `YYYY-MM`
- Always include userId, month, totalBudget, createdAt, updatedAt

### UI/UX

- Use KeyboardAvoidingView for forms
- Use ScrollView with keyboardShouldPersistTaps="handled"
- Provide cancel/skip options for optional flows
- Show confirmation alerts before destructive actions

## When Making Changes

1. Read existing files to understand current implementation
2. Follow existing code patterns and style
3. Check for errors after edits
4. Ensure TypeScript types are correct
5. Test navigation flows mentally before implementing
6. Consider edge cases and error scenarios

## Don't Do This

- Don't use `any` type unless absolutely necessary
- Don't create inline styles
- Don't skip error handling
- Don't forget SafeAreaView on screens
- Don't create new patterns - follow existing ones
- Don't make assumptions - read the code first

## Communication Style

- Be concise and direct
- Explain changes clearly but briefly
- Don't create documentation files unless asked
- Focus on implementation, not lengthy explanations
