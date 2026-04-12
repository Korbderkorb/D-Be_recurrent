# Environment Setup Guide

## Overview

This project uses environment variables to store sensitive Firebase credentials. These should **never be committed to version control**.

## Setup Instructions

### 1. Create Your Local Environment File

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

### 2. Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `learning-platform-login-c3916`
3. Click **Project Settings** (gear icon)
4. In the **General** tab, scroll down to **Your apps** section
5. Find your web app and copy the configuration object
6. Fill in the values in `.env.local`:

```
VITE_FIREBASE_API_KEY=AIzaSyAVOCqB5T5btizQYdRRg8DGV6F33a2eii8
VITE_FIREBASE_AUTH_DOMAIN=learning-platform-login-c3916.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=learning-platform-login-c3916
VITE_FIREBASE_STORAGE_BUCKET=learning-platform-login-c3916.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=753912014324
VITE_FIREBASE_APP_ID=1:753912014324:web:e6fee33e6f89d9d71845a1
VITE_FIREBASE_MEASUREMENT_ID=G-DB51TZGJX3
VITE_FIRESTORE_DATABASE_ID=(default)
VITE_BOOTSTRAP_ADMIN_EMAIL=korbinian.enzinger@gmail.com
```

### 3. Remove the Old Config File

After confirming `.env.local` works, remove the JSON config file:

```bash
rm firebase-applet-config.json
```

### 4. Verify It Works

```bash
npm install
npm run dev
```

The app should start without errors and log: `Firebase initialized with environment variables`

## Important Notes

- ✅ `.env.local` is in `.gitignore` - it will never be committed
- ✅ `.env.example` is safe to commit - it only has placeholder values
- ⚠️ If you see "Missing required Firebase configuration" error, check that all values are filled in `.env.local`
- ⚠️ Different environments (dev, staging, production) will need different `.env.local` files with their respective Firebase projects

## For Team Members

When setting up locally:
1. Clone the repo
2. Copy `.env.example` to `.env.local`
3. Fill in the credentials (ask your admin for the values)
4. Run `npm install && npm run dev`

Do NOT ask for or share `.env.local` files - each developer should have their own copy with the same credentials.

## Migration Notes (Original Deployment)

The credentials that were in `firebase-applet-config.json` have been moved to environment variables:
- Same Firebase project: `learning-platform-login-c3916`
- Same credentials, just stored securely now
- All user data and Firestore rules remain unchanged
