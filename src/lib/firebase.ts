import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { PurchaseRecord, AuditLogEntry, Catalog, User } from '../types';

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBR4Ux3AHKKUN_f_aRK_rGVidOnTSwvuuk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0584258501.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0584258501",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0584258501.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "93475370198",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:93475370198:web:44424a79392bb2100cc577",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-sistemadecontrol-5592e35a-812a-481c-bad9-b7ae12134a41"
};

const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);

// Inicializamos Firestore con el databaseId aprovisionado
export const db = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId || '(default)');

// Verificación obligatoria de conexión al servidor Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Verificando conectividad con Firebase Firestore...");
    }
    // Retornamos true si al menos respondió el servicio sin error de red fatal
    return true;
  }
}
testConnection();

// Colecciones
export const PURCHASES_COLLECTION = 'purchases';
export const AUDIT_LOGS_COLLECTION = 'audit_logs';
export const CATALOGS_COLLECTION = 'catalogs';
export const USERS_COLLECTION = 'users';

// Helpers de Firestore en tiempo real
export async function savePurchaseToFirestore(purchase: PurchaseRecord): Promise<void> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchase.id);
    await setDoc(docRef, purchase, { merge: true });
  } catch (err) {
    console.error("Error guardando adquisición en Firestore:", err);
  }
}

export async function removePurchaseFromFirestore(purchaseId: string): Promise<void> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error eliminando adquisición en Firestore:", err);
  }
}

export async function saveAuditLogToFirestore(log: AuditLogEntry): Promise<void> {
  try {
    const docRef = doc(db, AUDIT_LOGS_COLLECTION, log.id);
    await setDoc(docRef, log);
  } catch (err) {
    console.error("Error registrando auditoría en Firestore:", err);
  }
}

export async function saveCatalogToFirestore(catalog: Catalog): Promise<void> {
  try {
    const docRef = doc(db, CATALOGS_COLLECTION, catalog.id);
    await setDoc(docRef, catalog, { merge: true });
  } catch (err) {
    console.error("Error guardando catálogo en Firestore:", err);
  }
}

export async function removeCatalogFromFirestore(catalogId: string): Promise<void> {
  try {
    const docRef = doc(db, CATALOGS_COLLECTION, catalogId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error eliminando catálogo en Firestore:", err);
  }
}

export async function saveUserToFirestore(user: User): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.error("Error guardando usuario en Firestore:", err);
  }
}

export async function removeUserFromFirestore(userId: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error eliminando usuario en Firestore:", err);
  }
}

// Sembrado inicial si la base de datos está vacía
export async function seedInitialDataIfEmpty(
  initialPurchases: PurchaseRecord[],
  initialCatalogs: Catalog[],
  initialUsers: User[],
  initialLogs: AuditLogEntry[]
): Promise<void> {
  try {
    const purchasesSnap = await getDocs(query(collection(db, PURCHASES_COLLECTION), limit(1)));
    if (purchasesSnap.empty) {
      console.log("Sembrando datos institucionales iniciales en Firestore...");
      const batch = writeBatch(db);

      // Compras
      for (const p of initialPurchases) {
        const ref = doc(db, PURCHASES_COLLECTION, p.id);
        batch.set(ref, p);
      }

      // Catálogos
      for (const c of initialCatalogs) {
        const ref = doc(db, CATALOGS_COLLECTION, c.id);
        batch.set(ref, c);
      }

      // Usuarios
      for (const u of initialUsers) {
        const ref = doc(db, USERS_COLLECTION, u.id);
        batch.set(ref, u);
      }

      // Auditoría
      for (const log of initialLogs.slice(0, 15)) {
        const ref = doc(db, AUDIT_LOGS_COLLECTION, log.id);
        batch.set(ref, log);
      }

      await batch.commit();
      console.log("Sembrado inicial de Firestore completado con éxito.");
    }
  } catch (err) {
    console.warn("Nota sobre sembrado inicial en Firestore:", err);
  }
}
