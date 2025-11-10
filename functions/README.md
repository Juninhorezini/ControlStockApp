# Firebase Functions for ControlStockApp

This folder contains a small Cloud Function (Express) that exposes an endpoint to create Firebase Auth users and corresponding Realtime Database profiles without requiring the admin to log out.

Endpoints:
- POST /createUser — body: { email, password, username, role }
  - Requires Authorization: Bearer <idToken> header from an authenticated admin user
  - Creates Auth user, writes /users/{uid} and /usernames/{username}

Deploy:
1. Install dependencies: `npm install`
2. Deploy functions: `firebase deploy --only functions` (requires firebase-tools and project configured)

Security:
- The endpoint requires the caller to be authenticated and to have `/users/{uid}.role === 'admin'` in the Realtime Database.
- In production, further tighten rules as needed.
