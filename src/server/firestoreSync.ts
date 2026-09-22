import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate, setLogLevel } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { getStoreState, setStoreState } from './dataStore';

try {
  setLogLevel('silent');
} catch (_) {}

let firestoreSyncRunning = false;

export async function syncFirestoreData(): Promise<{ success: boolean; message: string; counts?: any }> {
  if (firestoreSyncRunning) {
    return { success: true, message: 'Sincronización ya en curso' };
  }

  firestoreSyncRunning = true;
  let tempApp: any = null;
  let db: any = null;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      firestoreSyncRunning = false;
      return { success: false, message: 'firebase-applet-config.json no encontrado' };
    }

    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    tempApp = initializeApp(cfg, `sync-app-${Date.now()}`);
    db = getFirestore(tempApp, cfg.firestoreDatabaseId);

    console.log('[FirestoreSync] Reconciliando base de datos central con Firestore...');

    const purchasesSnap = await getDocs(collection(db, 'purchases'));
    const purchases: any[] = [];
    purchasesSnap.forEach(d => purchases.push(d.data()));

    const usersSnap = await getDocs(collection(db, 'users'));
    const users: any[] = [];
    usersSnap.forEach(d => users.push(d.data()));

    const catalogsSnap = await getDocs(collection(db, 'catalogs'));
    const catalogs: any[] = [];
    catalogsSnap.forEach(d => catalogs.push(d.data()));

    const budgetLinesSnap = await getDocs(collection(db, 'budget_lines'));
    const budgetLines: any[] = [];
    budgetLinesSnap.forEach(d => budgetLines.push(d.data()));

    const budgetModSnap = await getDocs(collection(db, 'budget_modifications'));
    const budgetModifications: any[] = [];
    budgetModSnap.forEach(d => budgetModifications.push(d.data()));

    const auditLogsSnap = await getDocs(collection(db, 'audit_logs'));
    const auditLogs: any[] = [];
    auditLogsSnap.forEach(d => auditLogs.push(d.data()));

    // Reconciliar con el almacén local en disco
    const current = getStoreState();
    
    // Si Firestore tiene compras, actualizar sin resucitar compras eliminadas
    const deletedPurchasesSet = new Set(current.deletedPurchaseIds || []);
    const updatedPurchases = purchases.length > 0 
      ? purchases.filter(p => !deletedPurchasesSet.has(p.id)) 
      : current.purchases;

    // Si Firestore tiene usuarios, actualizar preservando contraseñas pero IGNORANDO usuarios eliminados
    const deletedUsersSet = new Set(current.deletedUserIds || []);
    let updatedUsers = current.users.filter(u => 
      !deletedUsersSet.has(u.id) && 
      !deletedUsersSet.has(u.username.toLowerCase())
    );

    if (users.length > 0) {
      const userMap = new Map<string, any>();
      updatedUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
      users.forEach(u => {
        const uId = u.id || '';
        const uName = (u.username || '').toLowerCase();
        if (deletedUsersSet.has(uId) || deletedUsersSet.has(uName)) {
          return; // No resucitar usuarios eliminados
        }
        const prev = userMap.get(uName);
        userMap.set(uName, {
          ...prev,
          ...u,
          password: u.password || prev?.password || (uName === 'admin' ? 'Guate2026*' : (uName === 'kglopezd' ? 'Jslb16042015@@' : 'user123'))
        });
      });
      updatedUsers = Array.from(userMap.values()).filter(u => 
        !deletedUsersSet.has(u.id) && 
        !deletedUsersSet.has(u.username.toLowerCase())
      );
    }

    const updated = {
      ...current,
      version: Date.now(),
      lastUpdated: new Date().toISOString(),
      purchases: updatedPurchases,
      users: updatedUsers,
      catalogs: catalogs.length > 0 ? catalogs : current.catalogs,
      budgetLines: budgetLines.length > 0 ? budgetLines : current.budgetLines,
      budgetModifications: budgetModifications.length > 0 ? budgetModifications : current.budgetModifications,
      auditLogs: auditLogs.length > 0 ? auditLogs : current.auditLogs
    };

    setStoreState(updated);

    const counts = {
      purchases: updated.purchases.length,
      users: updated.users.length,
      catalogs: updated.catalogs.length,
      budgetLines: updated.budgetLines.length,
      budgetModifications: updated.budgetModifications.length,
      auditLogs: updated.auditLogs.length
    };

    console.log('[FirestoreSync] Reconciliación exitosa:', counts);
    return { success: true, message: 'Base de datos Firestore sincronizada con éxito', counts };
  } catch (err: any) {
    console.warn('[FirestoreSync] Aviso durante reconciliación con Firestore:', err?.message || err);
    return { success: false, message: err?.message || 'Error durante reconciliación con Firestore' };
  } finally {
    firestoreSyncRunning = false;
    if (db) {
      try {
        await terminate(db);
      } catch (_) {}
    }
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch (_) {}
    }
  }
}
