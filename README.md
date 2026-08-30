# Smart Attendance - Employee Mobile App (React Native / Expo)

A complete, production-grade mobile application built specifically for employees to handle facial biometric check-in, GPS geofencing, leave applications, attendance history, payslips, and referral rewards.

---

## Features
- **Biometric Face Recognition & GPS Check-In/Check-Out**
- **Live Geofence Boundary & Proximity Verification**
- **Facial Biometrics Registration (AI Embedding)**
- **Monthly Attendance History & Punctuality Tracker**
- **Leave Application & Quotas Management**
- **Salary Breakdown & Payslips View**
- **20% Recurring Referral & Affiliate Program**
- **Offline Session Persistence via AsyncStorage**

---

## Setup & Running the Mobile App

1. **Navigate to the mobile directory**:
   ```bash
   cd smartattendance-mobile
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Expo Development Server**:
   ```bash
   npx expo start
   ```

4. **Run on Device or Emulator**:
   - **Android Emulator**: Press `a` in terminal
   - **iOS Simulator (Mac)**: Press `i` in terminal
   - **Physical Device**: Scan the QR code using the **Expo Go** app (iOS / Android)

---

## Backend API Configuration
The API endpoint is configured in `src/api/client.ts`:
- **Android Emulator**: `http://10.0.2.2:3000`
- **iOS Simulator / Local Device**: `http://localhost:3000` or your machine's local IP address (e.g. `http://192.168.1.XX:3000`) or production domain.
