import admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { env } from './env.js';

let firebaseInitialized = false;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  firebaseInitialized = true;
} catch (err) {
  console.warn(
    '[firebase] Failed to initialize Firebase — auth routes will be unavailable.',
    env.NODE_ENV === 'development' ? (err as Error).message : '',
  );
}

export const firebaseAuth: Auth | null = firebaseInitialized ? admin.auth() : null;
export const firestore: Firestore | null = firebaseInitialized ? admin.firestore() : null;
