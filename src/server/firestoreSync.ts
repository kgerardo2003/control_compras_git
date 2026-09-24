import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch, terminate, setLogLevel } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { getStoreState, setStoreState } from './dataStore';

try {
  setLogLevel('silent');
} catch (_) {}

let firestoreSyncRunning = false;

function cleanUndefined<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = cleanUndefined(value);
      }
    }
    return result as T;
  }
  return data;
}

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

    const judicaturasSnap = await getDocs(collection(db, 'judicaturas'));
    const judicaturas: any[] = [];
    judicaturasSnap.forEach(d => judicaturas.push(d.data()));

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

    // Sincronizar judicaturas bidireccionalmente
    let updatedJudicaturas = current.judicaturas;
    if (judicaturas.length > 0) {
      const jMap = new Map<string, any>();
      current.judicaturas.forEach(j => jMap.set(j.id, j));
      judicaturas.forEach(j => {
        if (j && j.id) {
          jMap.set(j.id, { ...(jMap.get(j.id) || {}), ...j });
        }
      });
      updatedJudicaturas = Array.from(jMap.values());
    }

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
      judicaturas: updatedJudicaturas,
      users: updatedUsers,
      catalogs: catalogs.length > 0 ? catalogs : current.catalogs,
      budgetLines: budgetLines.length > 0 ? budgetLines : current.budgetLines,
      budgetModifications: budgetModifications.length > 0 ? budgetModifications : current.budgetModifications,
      auditLogs: auditLogs.length > 0 ? auditLogs : current.auditLogs
    };

    setStoreState(updated);

    const counts = {
      purchases: updated.purchases.length,
      judicaturas: updated.judicaturas.length,
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

/**
 * Forzar subida de todos los datos locales (Judicaturas, Compras, Presupuesto, etc.)
 * a la base de datos de producción de Firestore.
 */
export async function forcePushToFirestore(): Promise<{
  success: boolean;
  message: string;
  counts?: Record<string, number>;
}> {
  let tempApp: any = null;
  let db: any = null;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      return { success: false, message: 'firebase-applet-config.json no encontrado' };
    }

    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    tempApp = initializeApp(cfg, `force-push-${Date.now()}`);
    db = getFirestore(tempApp, cfg.firestoreDatabaseId);

    const store = getStoreState();
    console.log(`[FirestoreSync] Forzando sincronización hacia base de datos de producción Firestore (${cfg.firestoreDatabaseId})...`);

    // 1. Subir Judicaturas a Firestore
    if (store.judicaturas && store.judicaturas.length > 0) {
      const batch = writeBatch(db);
      for (const j of store.judicaturas) {
        if (j && j.id) {
          const docRef = doc(db, 'judicaturas', j.id);
          batch.set(docRef, cleanUndefined(j), { merge: true });
        }
      }
      await batch.commit();
      console.log(`[FirestoreSync] ${store.judicaturas.length} judicaturas sincronizadas a producción.`);
    }

    // 2. Subir Compras a Firestore (por lotes de 400)
    if (store.purchases && store.purchases.length > 0) {
      const CHUNK = 400;
      for (let i = 0; i < store.purchases.length; i += CHUNK) {
        const slice = store.purchases.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        for (const p of slice) {
          if (p && p.id) {
            const cleanP = cleanUndefined(p) as any;
            if (cleanP.f56Documento?.dataUrl && cleanP.f56Documento.dataUrl.length > 500000) {
              cleanP.f56Documento = {
                nombre: cleanP.f56Documento.nombre,
                tamano: cleanP.f56Documento.tamano,
                tipo: cleanP.f56Documento.tipo,
                fechaSubida: cleanP.f56Documento.fechaSubida,
                storageKey: 'indexeddb'
              };
            }
            const docRef = doc(db, 'purchases', p.id);
            batch.set(docRef, cleanP, { merge: true });
          }
        }
        await batch.commit();
      }
      console.log(`[FirestoreSync] ${store.purchases.length} compras sincronizadas a producción.`);
    }

    // 3. Subir Renglones Presupuestarios a Firestore
    if (store.budgetLines && store.budgetLines.length > 0) {
      const batch = writeBatch(db);
      for (const bl of store.budgetLines) {
        if (bl && bl.id) {
          const docRef = doc(db, 'budget_lines', bl.id);
          batch.set(docRef, cleanUndefined(bl), { merge: true });
        }
      }
      await batch.commit();
      console.log(`[FirestoreSync] ${store.budgetLines.length} renglones presupuestarios sincronizados a producción.`);
    }

    // 4. Subir Catálogos a Firestore
    if (store.catalogs && store.catalogs.length > 0) {
      const batch = writeBatch(db);
      for (const c of store.catalogs) {
        if (c && c.id) {
          const docRef = doc(db, 'catalogs', c.id);
          batch.set(docRef, cleanUndefined(c), { merge: true });
        }
      }
      await batch.commit();
    }

    // 5. Subir Usuarios Esenciales a Firestore
    if (store.users && store.users.length > 0) {
      const batch = writeBatch(db);
      for (const u of store.users) {
        if (u && u.id) {
          const docRef = doc(db, 'users', u.id);
          batch.set(docRef, cleanUndefined(u), { merge: true });
        }
      }
      await batch.commit();
    }

    const counts = {
      judicaturas: store.judicaturas.length,
      purchases: store.purchases.length,
      budgetLines: store.budgetLines.length,
      catalogs: store.catalogs.length,
      users: store.users.length,
    };

    return {
      success: true,
      message: `Sincronización forzada completada con éxito en la base de datos de producción: ${counts.judicaturas} judicaturas y ${counts.purchases} compras sincronizadas.`,
      counts
    };
  } catch (err: any) {
    console.error('[FirestoreSync] Error forzando subida a Firestore:', err);
    return {
      success: false,
      message: `Error sincronizando con base de datos de producción: ${err?.message || String(err)}`
    };
  } finally {
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

