# Classroom Quiz App (Vite + React + Firebase)

An interactive classroom quiz application with real-time response tracking, teacher presentation screen, student mobile interface, dynamic QR code joining, and wrong answer explanations.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   Update `src/firebase.js` with your Firebase Realtime Database credentials:
   ```js
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
