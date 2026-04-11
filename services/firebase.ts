// services/firebase.ts — Firestore CRUD + real-time subscriptions
// See CLAUDE.md for architecture notes and SECURITY.md for deployment rules.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Recipe } from '@/types/recipe';

// ── Firebase Initialisation ────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return _app;
}

function getDB(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const RECIPES_COLLECTION = 'recipes';

function timestampToDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

function docToRecipe(id: string, data: Record<string, unknown>): Recipe {
  return {
    ...data,
    id,
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
  } as Recipe;
}

// ── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Add a new recipe to Firestore.
 * Returns the new document ID.
 */
export async function addRecipe(
  recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>,
): Promise<string> {
  const db = getDB();
  const docRef = await addDoc(collection(db, RECIPES_COLLECTION), {
    ...recipe,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * One-time fetch of all recipes, newest first.
 * Prefer subscribeToRecipes for real-time updates.
 */
export async function getRecipes(): Promise<Recipe[]> {
  const db = getDB();
  const q = query(collection(db, RECIPES_COLLECTION), orderBy('created_at', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToRecipe(d.id, d.data() as Record<string, unknown>));
}

/**
 * Real-time listener for the recipes collection.
 * Instantly updates across all family devices.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToRecipes(
  onUpdate: (recipes: Recipe[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getDB();
  const q = query(collection(db, RECIPES_COLLECTION), orderBy('created_at', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const recipes = snapshot.docs.map((d) =>
        docToRecipe(d.id, d.data() as Record<string, unknown>),
      );
      onUpdate(recipes);
    },
    (error) => onError(error),
  );
}

/**
 * Update specific fields of an existing recipe.
 * Automatically updates the `updated_at` timestamp.
 */
export async function updateRecipe(
  id: string,
  updates: Partial<Omit<Recipe, 'id' | 'created_at'>>,
): Promise<void> {
  const db = getDB();
  const docRef = doc(db, RECIPES_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * Permanently delete a recipe from Firestore.
 */
export async function deleteRecipe(id: string): Promise<void> {
  const db = getDB();
  await deleteDoc(doc(db, RECIPES_COLLECTION, id));
}
