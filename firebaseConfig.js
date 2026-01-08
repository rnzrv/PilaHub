// Firebase Configuration for PilaHub
// This file contains the Firebase setup for the queue management system

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAwgFK1vFZQ7gqN9GeT3VuWSkKfPQtAQls",
    authDomain: "queuesystem-d7bcd.firebaseapp.com",
    projectId: "queuesystem-d7bcd",
    storageBucket: "queuesystem-d7bcd.firebasestorage.app",
    messagingSenderId: "417220684944",
    appId: "1:417220684944:web:01f9513f2cbce8cc0ebc15"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore database
export const db = getFirestore(app);
