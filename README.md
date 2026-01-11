# Queue Management System

A modern, real-time queue management system built with React Native and Firebase.

## Features
-   📱 **Mobile User App**: Join queue, view status, get wait estimates.
-   💻 **Admin Dashboard**: Manage queue, view stats, reset system.
-   📺 **Monitor Mode**: Dedicated full-screen view for digital signage.
-   ⚡ **Real-time**: Instant updates via Firestore.
-   🎨 **Modern UI**: Gradients, haptics, and glassmorphism design.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Firebase**:
    -   Ensure `firebaseConfig.js` has your credentials.
    -   Create a Firestore Database in "Test Mode".

3.  **Run the App**:
    ```bash
    npx expo start
    ```

## Usage

-   **Web**: Press `w` to open in browser (Best for Admin/Monitor).
-   **Mobile**: Scan QR code with Expo Go (Best for Users).
-   **Queue Code**: Use `12345` to join the queue.

## Project Structure
-   `screens/HomeScreen.js`: Main landing page.
-   `screens/UserScreen.js`: User interface for joining/viewing ticket.
-   `screens/AdminScreen.js`: Admin controls and Monitor Mode.
-   `firebaseConfig.js`: Database configuration.
