import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  initDataStore, 
  getStoreState, 
  savePurchase, 
  deletePurchase, 
  saveBatchPurchases, 
  batchDeletePurchases, 
  clearAllPurchases,
  saveJudicatura,
  saveBulkJudicaturas,
  deleteJudicatura,
  addJudicaturaObservation,
  saveServicio,
  saveBulkServicios,
  deleteServicio,
  deleteBulkServicios,
  clearAllServicios,
  saveCatalog,
  deleteCatalog,
  saveUser,
  deleteUser,
  saveBudgetLine,
  deleteBudgetLine,
  addBudgetModification,
  addAuditLog
} from '../../src/server/dataStore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfigFile from '../../firebase-applet-config.json';

export const SHARED_FIRESTORE_DATABASE_ID = 'ai-studio-controlcomprasgi-02a1a92c-61ef-4fa8-b38d-a9532c263771';
export const SHARED_FIREBASE_PROJECT_ID = 'gen-lang-client-0584258501';
export const SHARED_FIRESTORE_DATABASE_URL = `https://firestore.googleapis.com/v1/projects/${SHARED_FIREBASE_PROJECT_ID}/databases/${SHARED_FIRESTORE_DATABASE_ID}/documents`;
export const SHARED_FIRESTORE_CONSOLE_URL = `https://console.firebase.google.com/project/${SHARED_FIREBASE_PROJECT_ID}/firestore/databases/${SHARED_FIRESTORE_DATABASE_ID}/data`;

// Inicializar almacén en memoria / /tmp
initDataStore();

// Inicializar Firebase para persistencia en la nube compartida
let db: any = null;
try {
  const { firestoreDatabaseId: _unused, ...coreOptions } = firebaseConfigFile;
  const app = getApps().length > 0 ? getApp() : initializeApp({
    ...coreOptions,
    projectId: SHARED_FIREBASE_PROJECT_ID
  }, 'vercel-api-sync');
  db = getFirestore(app, SHARED_FIRESTORE_DATABASE_ID);
} catch (e) {
  console.warn('[Vercel-API] Firestore init note:', e);
}

// Persistir cambios en segundo plano a Firestore
function syncCloudWrite(collectionName: string, docId: string, data: any | null) {
  if (!db || !docId) return;
  try {
    const dRef = doc(db, collectionName, String(docId));
    if (data === null) {
      deleteDoc(dRef).catch(() => {});
    } else {
      setDoc(dRef, data, { merge: true }).catch(() => {});
    }
  } catch (_) {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parsear ruta de acción
  let actionSegments: string[] = [];
  const actionQuery = req.query.action;
  if (Array.isArray(actionQuery)) {
    actionSegments = actionQuery;
  } else if (typeof actionQuery === 'string') {
    actionSegments = actionQuery.split('/').filter(Boolean);
  } else {
    const rawUrl = req.url || '';
    const cleanPath = rawUrl.replace(/^\/api\/db\/?/, '').split('?')[0];
    actionSegments = cleanPath.split('/').filter(Boolean);
  }

  const primaryAction = actionSegments[0] || '';
  const secondaryAction = actionSegments[1] || '';
  const thirdAction = actionSegments[2] || '';

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  try {
    // 1. Estado Completo de la Base de Datos
    if (primaryAction === 'state') {
      const state = getStoreState();
      return res.status(200).json({ success: true, data: state });
    }

    // 2. Versión de la Base de Datos
    if (primaryAction === 'version') {
      const state = getStoreState();
      return res.status(200).json({ success: true, version: state.version, lastUpdated: state.lastUpdated });
    }

    // 3. Estatus de Firestore
    if (primaryAction === 'firestore-status') {
      const state = getStoreState();
      return res.status(200).json({
        success: true,
        firestore: {
          connected: Boolean(db),
          projectId: SHARED_FIREBASE_PROJECT_ID,
          firestoreDatabaseId: SHARED_FIRESTORE_DATABASE_ID,
          databaseUrl: SHARED_FIRESTORE_DATABASE_URL,
          consoleUrl: SHARED_FIRESTORE_CONSOLE_URL,
          version: state.version,
          totalPurchases: state.purchases?.length || 0,
          totalJudicaturas: state.judicaturas?.length || 0,
          totalServicios: state.servicios?.length || 0,
          totalBudgetLines: state.budgetLines?.length || 0
        }
      });
    }

    // 4. Stream SSE o sondeo liviano
    if (primaryAction === 'stream') {
      const state = getStoreState();
      return res.status(200).json({ success: true, type: 'status', version: state.version });
    }

    // 5. Módulo de Compras (Purchases)
    if (primaryAction === 'purchases') {
      if (req.method === 'POST') {
        if (secondaryAction === 'batch') {
          const list = Array.isArray(body) ? body : (body.records || []);
          saveBatchPurchases(list);
          list.forEach((p: any) => syncCloudWrite('purchases', p.id, p));
          return res.status(200).json({ success: true, count: list.length });
        }
        if (secondaryAction === 'batch-delete') {
          const ids = Array.isArray(body) ? body : (body.ids || []);
          batchDeletePurchases(ids);
          ids.forEach((id: string) => syncCloudWrite('purchases', id, null));
          return res.status(200).json({ success: true, count: ids.length });
        }
        if (secondaryAction === 'clear-all') {
          const state = getStoreState();
          const currentIds = state.purchases.map(p => p.id);
          clearAllPurchases();
          currentIds.forEach(id => syncCloudWrite('purchases', id, null));
          return res.status(200).json({ success: true, count: currentIds.length });
        }
        // Guardar o actualizar compra individual
        if (body.id) {
          savePurchase(body);
          syncCloudWrite('purchases', body.id, body);
          return res.status(200).json({ success: true, record: body });
        }
        return res.status(400).json({ success: false, message: 'ID de compra requerido' });
      }

      if (req.method === 'DELETE') {
        const targetId = secondaryAction || body.id;
        if (targetId) {
          deletePurchase(decodeURIComponent(targetId));
          syncCloudWrite('purchases', decodeURIComponent(targetId), null);
          return res.status(200).json({ success: true });
        }
        return res.status(400).json({ success: false, message: 'ID no especificado' });
      }

      const state = getStoreState();
      return res.status(200).json({ success: true, data: state.purchases });
    }

    // 6. Módulo de Judicaturas
    if (primaryAction === 'judicaturas') {
      if (req.method === 'POST') {
        if (secondaryAction === 'bulk') {
          const items = Array.isArray(body) ? body : (body.judicaturas || []);
          saveBulkJudicaturas(items);
          items.forEach(j => syncCloudWrite('judicaturas', j.id, j));
          return res.status(200).json({ success: true, count: items.length });
        }
        if (thirdAction === 'observaciones' && secondaryAction) {
          addJudicaturaObservation(decodeURIComponent(secondaryAction), body);
          const state = getStoreState();
          const updated = state.judicaturas.find(j => j.id === decodeURIComponent(secondaryAction));
          if (updated) syncCloudWrite('judicaturas', updated.id, updated);
          return res.status(200).json({ success: true, data: updated });
        }
        if (body.id) {
          saveJudicatura(body);
          syncCloudWrite('judicaturas', body.id, body);
          return res.status(200).json({ success: true, data: body });
        }
      }

      if (req.method === 'DELETE') {
        const jId = secondaryAction || body.id;
        if (jId) {
          deleteJudicatura(decodeURIComponent(jId));
          syncCloudWrite('judicaturas', decodeURIComponent(jId), null);
          return res.status(200).json({ success: true });
        }
      }

      const state = getStoreState();
      return res.status(200).json(state.judicaturas);
    }

    // 7. Módulo de Servicios Contratados
    if (primaryAction === 'servicios') {
      if (req.method === 'POST') {
        if (secondaryAction === 'bulk') {
          const items = Array.isArray(body) ? body : (body.servicios || []);
          saveBulkServicios(items);
          items.forEach(s => syncCloudWrite('servicios_contratados', s.id, s));
          return res.status(200).json({ success: true, count: items.length });
        }
        if (secondaryAction === 'batch-delete') {
          const ids = Array.isArray(body) ? body : (body.ids || []);
          deleteBulkServicios(ids);
          ids.forEach(id => syncCloudWrite('servicios_contratados', id, null));
          return res.status(200).json({ success: true, count: ids.length });
        }
        if (secondaryAction === 'clear-all') {
          clearAllServicios();
          return res.status(200).json({ success: true });
        }
        if (body.id) {
          saveServicio(body);
          syncCloudWrite('servicios_contratados', body.id, body);
          return res.status(200).json({ success: true, data: body });
        }
      }

      if (req.method === 'DELETE') {
        const sId = secondaryAction || body.id;
        if (sId) {
          deleteServicio(decodeURIComponent(sId));
          syncCloudWrite('servicios_contratados', decodeURIComponent(sId), null);
          return res.status(200).json({ success: true });
        }
      }

      const state = getStoreState();
      return res.status(200).json(state.servicios);
    }

    // 8. Catálogos
    if (primaryAction === 'catalogs') {
      if (req.method === 'POST' && body.id) {
        saveCatalog(body);
        syncCloudWrite('catalogs', body.id, body);
        return res.status(200).json({ success: true, data: body });
      }
      if (req.method === 'DELETE') {
        const cId = secondaryAction || body.id;
        if (cId) {
          deleteCatalog(decodeURIComponent(cId));
          syncCloudWrite('catalogs', decodeURIComponent(cId), null);
          return res.status(200).json({ success: true });
        }
      }
      const state = getStoreState();
      return res.status(200).json({ success: true, data: state.catalogs });
    }

    // 9. Directorio de Usuarios
    if (primaryAction === 'users') {
      if (req.method === 'GET' && secondaryAction) {
        const query = decodeURIComponent(secondaryAction).toLowerCase();
        const state = getStoreState();
        const found = state.users.find(u => 
          (u.username && u.username.toLowerCase() === query) ||
          (u.email && u.email.toLowerCase() === query)
        );
        return res.status(200).json({ success: Boolean(found), user: found || null });
      }

      if (req.method === 'POST' && body.id) {
        saveUser(body);
        syncCloudWrite('users', body.id, body);
        return res.status(200).json({ success: true, data: body });
      }

      if (req.method === 'DELETE') {
        const uId = secondaryAction || body.id;
        if (uId) {
          deleteUser(decodeURIComponent(uId));
          syncCloudWrite('users', decodeURIComponent(uId), null);
          return res.status(200).json({ success: true });
        }
      }

      const state = getStoreState();
      return res.status(200).json({ success: true, data: state.users });
    }

    // 10. Módulo Financiero y Presupuestario
    if (primaryAction === 'budget-lines') {
      if (req.method === 'POST' && body.id) {
        saveBudgetLine(body);
        syncCloudWrite('budget_lines', body.id, body);
        return res.status(200).json({ success: true, data: body });
      }
      if (req.method === 'DELETE') {
        const blId = secondaryAction || body.id;
        if (blId) {
          deleteBudgetLine(decodeURIComponent(blId));
          syncCloudWrite('budget_lines', decodeURIComponent(blId), null);
          return res.status(200).json({ success: true });
        }
      }
      const state = getStoreState();
      return res.status(200).json({ success: true, data: state.budgetLines });
    }

    if (primaryAction === 'budget-modifications') {
      if (req.method === 'POST' && body.id) {
        addBudgetModification(body);
        syncCloudWrite('budget_modifications', body.id, body);
        return res.status(200).json({ success: true, data: body });
      }
      const state = getStoreState();
      return res.status(200).json({ success: true, data: state.budgetModifications });
    }

    // 11. Bitácora de Auditoría
    if (primaryAction === 'audit-logs') {
      if (req.method === 'POST' && body.id) {
        addAuditLog(body);
        syncCloudWrite('audit_logs', body.id, body);
        return res.status(200).json({ success: true, data: body });
      }
      const state = getStoreState();
      return res.status(200).json({ success: true, data: state.auditLogs });
    }

    // Fallback: Estado general
    const state = getStoreState();
    return res.status(200).json({ success: true, version: state.version, message: 'Operación procesada exitosamente' });
  } catch (error: any) {
    console.error('[Vercel-API] Error procesando solicitud:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno del servidor' });
  }
}
