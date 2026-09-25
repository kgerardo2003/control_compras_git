import fs from 'fs';
import path from 'path';
import { 
  PurchaseRecord, 
  User, 
  UserProfile, 
  Catalog, 
  AuditLogEntry, 
  BudgetLineItem, 
  BudgetModification,
  JudicaturaRecord,
  JudicaturaObservacion
} from '../types';
import { 
  INITIAL_PURCHASES, 
  INITIAL_USERS, 
  INITIAL_CATALOGS, 
  INITIAL_USER_PROFILES, 
  INITIAL_AUDIT_LOGS 
} from '../data/initialData';
import { INITIAL_JUDICATURAS } from '../data/initialJudicaturasData';
import { 
  INITIAL_BUDGET_LINES, 
  INITIAL_BUDGET_MODIFICATIONS 
} from '../data/initialBudgetData';

export interface DataStoreState {
  version: number;
  lastUpdated: string;
  purchases: PurchaseRecord[];
  judicaturas: JudicaturaRecord[];
  users: User[];
  catalogs: Catalog[];
  budgetLines: BudgetLineItem[];
  budgetModifications: BudgetModification[];
  auditLogs: AuditLogEntry[];
  userProfiles: UserProfile[];
  deletedPurchaseIds: string[];
  deletedUserIds: string[];
  isPurchasesInitialized: boolean;
}

// Cuentas institucionales esenciales que NUNCA deben perderse (Lic. Kevin Gerardo López de León)
export const ESSENTIAL_USER_USERNAMES = ['admin', 'kglopezd'];

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

let storeMemory: DataStoreState | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function persistToDisk(): void {
  try {
    ensureDataDir();
    if (!storeMemory) return;
    storeMemory.lastUpdated = new Date().toISOString();
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(storeMemory, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('[DataStore] Error persistiendo a disco:', err);
  }
}

export function initDataStore(): DataStoreState {
  if (storeMemory) {
    return storeMemory;
  }

  ensureDataDir();

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DataStoreState>;
      
      const isPurchasesInitialized = parsed.isPurchasesInitialized !== undefined 
        ? parsed.isPurchasesInitialized 
        : true;

      storeMemory = {
        version: parsed.version || 1,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        purchases: Array.isArray(parsed.purchases) ? parsed.purchases : (isPurchasesInitialized ? [] : [...INITIAL_PURCHASES]),
        judicaturas: Array.isArray(parsed.judicaturas) ? parsed.judicaturas : [...INITIAL_JUDICATURAS],
        users: Array.isArray(parsed.users) ? parsed.users : [...INITIAL_USERS],
        catalogs: Array.isArray(parsed.catalogs) ? parsed.catalogs : [...INITIAL_CATALOGS],
        budgetLines: Array.isArray(parsed.budgetLines) ? parsed.budgetLines : [...INITIAL_BUDGET_LINES],
        budgetModifications: Array.isArray(parsed.budgetModifications) ? parsed.budgetModifications : [...INITIAL_BUDGET_MODIFICATIONS],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [...INITIAL_AUDIT_LOGS],
        userProfiles: Array.isArray(parsed.userProfiles) ? parsed.userProfiles : [...INITIAL_USER_PROFILES],
        deletedPurchaseIds: Array.isArray(parsed.deletedPurchaseIds) ? Array.from(new Set([...parsed.deletedPurchaseIds, 'pur-2026-038'])) : ['pur-2026-038'],
        deletedUserIds: Array.isArray(parsed.deletedUserIds) ? Array.from(new Set([...parsed.deletedUserIds, 'usr-operador-1', 'operador', 'usr-auditor-1', 'auditor', 'usr-operador-2', 'jfuentes', 'usr-presupuesto-1', 'edmonroy', 'usr-compras-2', 'mmvaldez', 'usr-1790026026081-utwru'])) : ['usr-operador-1', 'operador', 'usr-auditor-1', 'auditor', 'usr-operador-2', 'jfuentes', 'usr-presupuesto-1', 'edmonroy', 'usr-compras-2', 'mmvaldez', 'usr-1790026026081-utwru'],
        isPurchasesInitialized
      };

      // Filtrar de inmediato compras eliminadas
      storeMemory.purchases = storeMemory.purchases.filter(p => 
        !storeMemory!.deletedPurchaseIds.includes(p.id)
      );

      // Filtrar de inmediato cualquier usuario que esté en la lista negra de eliminados
      storeMemory.users = storeMemory.users.filter(u => 
        !storeMemory!.deletedUserIds.includes(u.id) && 
        !storeMemory!.deletedUserIds.includes(u.username.toLowerCase())
      );

      // Garantizar ÚNICAMENTE que las cuentas esenciales del Lic. Kevin Gerardo López de León (admin y kglopezd) existan
      // NO resucitar usuarios que el usuario haya eliminado deliberadamente (ej: auditor, operador, jfuentes, etc.)
      const essentialInitial = INITIAL_USERS.filter(iu => 
        ESSENTIAL_USER_USERNAMES.includes(iu.username.toLowerCase())
      );

      essentialInitial.forEach(iu => {
        const existingIdx = storeMemory!.users.findIndex(u => 
          u.id === iu.id || 
          u.username.toLowerCase() === iu.username.toLowerCase()
        );
        if (existingIdx === -1) {
          storeMemory!.users.push({ ...iu });
        } else {
          // Asegurar credenciales y doble factor intactos
          storeMemory!.users[existingIdx] = {
            ...iu,
            ...storeMemory!.users[existingIdx],
            password: storeMemory!.users[existingIdx].password || iu.password,
            totpSecret: storeMemory!.users[existingIdx].totpSecret || iu.totpSecret,
            activo: true
          };
        }
      });

      persistToDisk();
      console.log(`[DataStore] Cargado desde disco: ${storeMemory.purchases.length} compras, ${storeMemory.users.length} usuarios.`);
      return storeMemory;
    } catch (err) {
      console.warn('[DataStore] Error leyendo store.json existente, recreando con datos iniciales:', err);
    }
  }

  // Inicialización de primer arranque
  storeMemory = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    purchases: [...INITIAL_PURCHASES],
    judicaturas: [...INITIAL_JUDICATURAS],
    users: INITIAL_USERS.filter(u => ESSENTIAL_USER_USERNAMES.includes(u.username.toLowerCase())),
    catalogs: [...INITIAL_CATALOGS],
    budgetLines: [...INITIAL_BUDGET_LINES],
    budgetModifications: [...INITIAL_BUDGET_MODIFICATIONS],
    auditLogs: [...INITIAL_AUDIT_LOGS],
    userProfiles: [...INITIAL_USER_PROFILES],
    deletedPurchaseIds: [],
    deletedUserIds: ['usr-operador-1', 'operador'],
    isPurchasesInitialized: true
  };

  persistToDisk();
  console.log('[DataStore] Inicializado nuevo almacén central institucional.');
  return storeMemory;
}

// Obtener estado completo
export function getStoreState(): DataStoreState {
  return initDataStore();
}

// Sobrescribir / reconciliar estado completo con persistencia a disco
export function setStoreState(newState: DataStoreState): DataStoreState {
  storeMemory = {
    ...newState,
    version: (newState.version || 1) + 1,
    lastUpdated: new Date().toISOString()
  };
  persistToDisk();
  return storeMemory;
}

// Obtener versión ligera para sondeo ultra-rápido multi-estación
export function getStoreVersion(): { version: number; lastUpdated: string; purchasesCount: number; usersCount: number } {
  const store = initDataStore();
  return {
    version: store.version || 1,
    lastUpdated: store.lastUpdated,
    purchasesCount: store.purchases.length,
    usersCount: store.users.length
  };
}

// Compras (Purchases)
export function savePurchase(purchase: PurchaseRecord): PurchaseRecord {
  const store = initDataStore();
  // Si está en la lista de eliminados confirmados, no permitir resurrección accidental
  if (store.deletedPurchaseIds && store.deletedPurchaseIds.includes(purchase.id)) {
    console.log(`[DataStore] Intento de resurrección bloqueado para compra eliminada: ${purchase.id}`);
    return purchase;
  }
  const index = store.purchases.findIndex(p => p.id === purchase.id);
  if (index >= 0) {
    store.purchases[index] = { ...store.purchases[index], ...purchase };
  } else {
    store.purchases.unshift(purchase);
  }
  store.version = (store.version || 1) + 1;
  store.isPurchasesInitialized = true;
  persistToDisk();
  return purchase;
}

export function saveBatchPurchases(newPurchases: PurchaseRecord[], replaceAll = false): PurchaseRecord[] {
  const store = initDataStore();
  const valid = newPurchases.filter(p => !store.deletedPurchaseIds?.includes(p.id));
  if (replaceAll) {
    store.purchases = [...valid];
  } else {
    const existingMap = new Map(store.purchases.map(p => [p.id, p]));
    valid.forEach(np => existingMap.set(np.id, np));
    store.purchases = Array.from(existingMap.values());
  }
  store.version = (store.version || 1) + 1;
  store.isPurchasesInitialized = true;
  persistToDisk();
  return store.purchases;
}

export function deletePurchase(id: string): boolean {
  const store = initDataStore();
  store.purchases = store.purchases.filter(p => p.id !== id);
  if (!store.deletedPurchaseIds) store.deletedPurchaseIds = [];
  if (!store.deletedPurchaseIds.includes(id)) {
    store.deletedPurchaseIds.push(id);
    if (store.deletedPurchaseIds.length > 500) {
      store.deletedPurchaseIds = store.deletedPurchaseIds.slice(-500);
    }
  }
  store.version = (store.version || 1) + 1;
  store.isPurchasesInitialized = true;
  persistToDisk();
  console.log(`[DataStore] Compra eliminada permanentemente y registrada en lista negra: ${id}`);
  return true;
}

export function batchDeletePurchases(ids: string[]): number {
  const store = initDataStore();
  const idSet = new Set(ids);
  const initialLength = store.purchases.length;
  store.purchases = store.purchases.filter(p => !idSet.has(p.id));
  const count = initialLength - store.purchases.length;
  if (count > 0) {
    if (!store.deletedPurchaseIds) store.deletedPurchaseIds = [];
    ids.forEach(id => {
      if (!store.deletedPurchaseIds.includes(id)) {
        store.deletedPurchaseIds.push(id);
      }
    });
    if (store.deletedPurchaseIds.length > 500) {
      store.deletedPurchaseIds = store.deletedPurchaseIds.slice(-500);
    }
    store.version = (store.version || 1) + 1;
    store.isPurchasesInitialized = true;
    persistToDisk();
    console.log(`[DataStore] Eliminación en lote: ${count} compras retiradas.`);
  }
  return count;
}

export function clearAllPurchases(): number {
  const store = initDataStore();
  const count = store.purchases.length;
  if (!store.deletedPurchaseIds) store.deletedPurchaseIds = [];
  store.purchases.forEach(p => {
    if (!store.deletedPurchaseIds.includes(p.id)) {
      store.deletedPurchaseIds.push(p.id);
    }
  });
  store.purchases = [];
  store.version = (store.version || 1) + 1;
  store.isPurchasesInitialized = true;
  persistToDisk();
  console.log(`[DataStore] Todas las compras (${count}) fueron vaciadas permanentemente.`);
  return count;
}

// Usuarios (Users)
export function findUser(query: string): User | undefined {
  const store = initDataStore();
  const clean = query.trim().toLowerCase();
  const cleanWithoutDomain = clean.replace(/@oj\.gob\.gt$/, '').replace(/@gmail\.com$/, '');

  const matchFromList = (list: User[]): User | undefined => {
    return list.find(u => 
      u.id === query || 
      u.username.toLowerCase() === clean || 
      u.username.toLowerCase() === cleanWithoutDomain ||
      (u.email && u.email.toLowerCase().trim() === clean) ||
      (u.email && u.email.toLowerCase().trim().replace(/@.+$/, '') === cleanWithoutDomain) ||
      ((clean.includes('kglopez') || clean === 'klopez' || clean === 'klopez@oj.gob.gt') && u.username.toLowerCase() === 'kglopezd')
    );
  };

  return matchFromList(store.users) || matchFromList(INITIAL_USERS);
}

export function saveUser(user: User): User {
  const store = initDataStore();
  // Si fue eliminado con anterioridad pero el administrador lo está recreando, remover de la lista negra
  if (store.deletedUserIds) {
    store.deletedUserIds = store.deletedUserIds.filter(
      id => id !== user.id && id !== user.username.toLowerCase()
    );
  }
  const index = store.users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  if (index >= 0) {
    store.users[index] = { ...store.users[index], ...user };
  } else {
    store.users.push(user);
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return user;
}

export function deleteUser(id: string): boolean {
  const store = initDataStore();
  const user = store.users.find(u => u.id === id || u.username.toLowerCase() === id.toLowerCase());
  if (user && ESSENTIAL_USER_USERNAMES.includes(user.username.toLowerCase())) {
    return false; // Proteger las cuentas esenciales del Lic. Kevin Gerardo López de León (admin y kglopezd)
  }

  if (!store.deletedUserIds) {
    store.deletedUserIds = [];
  }

  // Registrar permanentemente en la lista negra tanto ID como username
  if (id && !store.deletedUserIds.includes(id)) {
    store.deletedUserIds.push(id);
  }
  if (user?.username && !store.deletedUserIds.includes(user.username.toLowerCase())) {
    store.deletedUserIds.push(user.username.toLowerCase());
  }

  const initialLength = store.users.length;
  store.users = store.users.filter(u => 
    u.id !== id && 
    u.username.toLowerCase() !== id.toLowerCase() && 
    (user ? u.username.toLowerCase() !== user.username.toLowerCase() : true)
  );

  store.version = (store.version || 1) + 1;
  persistToDisk();
  console.log(`[DataStore] Usuario eliminado permanentemente y agregado a lista negra: ${id} (${user?.username || ''})`);
  return true;
}

// Catálogos
export function saveCatalog(catalog: Catalog): Catalog {
  const store = initDataStore();
  const index = store.catalogs.findIndex(c => c.id === catalog.id || c.codigo === catalog.codigo);
  if (index >= 0) {
    store.catalogs[index] = { ...store.catalogs[index], ...catalog };
  } else {
    store.catalogs.push(catalog);
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return catalog;
}

export function deleteCatalog(id: string): boolean {
  const store = initDataStore();
  const initialLength = store.catalogs.length;
  store.catalogs = store.catalogs.filter(c => c.id !== id);
  const deleted = store.catalogs.length < initialLength;
  if (deleted) {
    store.version = (store.version || 1) + 1;
    persistToDisk();
  }
  return deleted;
}

// Presupuesto
export function saveBudgetLine(line: BudgetLineItem): BudgetLineItem {
  const store = initDataStore();
  const index = store.budgetLines.findIndex(b => b.id === line.id || b.renglonPresupuestario === line.renglonPresupuestario);
  if (index >= 0) {
    store.budgetLines[index] = { ...store.budgetLines[index], ...line };
  } else {
    store.budgetLines.push(line);
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return line;
}

export function deleteBudgetLine(id: string): boolean {
  const store = initDataStore();
  const initialLength = store.budgetLines.length;
  store.budgetLines = store.budgetLines.filter(b => b.id !== id && b.renglonPresupuestario !== id);
  const deleted = store.budgetLines.length < initialLength;
  if (deleted) {
    store.version = (store.version || 1) + 1;
    persistToDisk();
  }
  return deleted;
}

export function setBudgetLines(lines: BudgetLineItem[]): BudgetLineItem[] {
  const store = initDataStore();
  store.budgetLines = [...lines];
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return store.budgetLines;
}

export function addBudgetModification(mod: BudgetModification): BudgetModification {
  const store = initDataStore();
  const index = store.budgetModifications.findIndex(m => m.id === mod.id);
  if (index >= 0) {
    store.budgetModifications[index] = { ...store.budgetModifications[index], ...mod };
  } else {
    store.budgetModifications.unshift(mod);
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return mod;
}

// Auditoría
export function addAuditLog(entry: AuditLogEntry): AuditLogEntry {
  const store = initDataStore();
  store.auditLogs.unshift(entry);
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return entry;
}

// Judicaturas por Inaugurar
export function saveBulkJudicaturas(records: JudicaturaRecord[], replaceAll: boolean = false): JudicaturaRecord[] {
  const store = initDataStore();
  if (!Array.isArray(store.judicaturas)) {
    store.judicaturas = [...INITIAL_JUDICATURAS];
  }
  if (replaceAll) {
    store.judicaturas = [...records];
  } else {
    const map = new Map(store.judicaturas.map(j => [j.id, j]));
    records.forEach(r => map.set(r.id, r));
    store.judicaturas = Array.from(map.values());
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return store.judicaturas;
}

export function saveJudicatura(judicatura: JudicaturaRecord): JudicaturaRecord {
  const store = initDataStore();
  if (!Array.isArray(store.judicaturas)) {
    store.judicaturas = [...INITIAL_JUDICATURAS];
  }
  const index = store.judicaturas.findIndex(j => j.id === judicatura.id);
  if (index >= 0) {
    store.judicaturas[index] = { ...store.judicaturas[index], ...judicatura };
  } else {
    store.judicaturas.unshift(judicatura);
  }
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return judicatura;
}

export function deleteJudicatura(id: string): boolean {
  const store = initDataStore();
  if (!Array.isArray(store.judicaturas)) {
    store.judicaturas = [];
    return false;
  }
  const initialLength = store.judicaturas.length;
  store.judicaturas = store.judicaturas.filter(j => j.id !== id);
  const deleted = store.judicaturas.length < initialLength;
  if (deleted) {
    store.version = (store.version || 1) + 1;
    persistToDisk();
  }
  return deleted;
}

export function addJudicaturaObservation(judicaturaId: string, obs: JudicaturaObservacion): JudicaturaRecord | null {
  const store = initDataStore();
  if (!Array.isArray(store.judicaturas)) {
    store.judicaturas = [...INITIAL_JUDICATURAS];
  }
  const jud = store.judicaturas.find(j => j.id === judicaturaId);
  if (!jud) return null;

  if (!Array.isArray(jud.observaciones)) {
    jud.observaciones = [];
  }
  jud.observaciones.unshift(obs);
  store.version = (store.version || 1) + 1;
  persistToDisk();
  return jud;
}

