import fs from 'fs';
import path from 'path';
import { 
  PurchaseRecord, 
  User, 
  UserProfile, 
  Catalog, 
  AuditLogEntry, 
  BudgetLineItem, 
  BudgetModification 
} from '../types';
import { 
  INITIAL_PURCHASES, 
  INITIAL_USERS, 
  INITIAL_CATALOGS, 
  INITIAL_USER_PROFILES, 
  INITIAL_AUDIT_LOGS 
} from '../data/initialData';
import { 
  INITIAL_BUDGET_LINES, 
  INITIAL_BUDGET_MODIFICATIONS 
} from '../data/initialBudgetData';

export interface DataStoreState {
  version: number;
  lastUpdated: string;
  purchases: PurchaseRecord[];
  users: User[];
  catalogs: Catalog[];
  budgetLines: BudgetLineItem[];
  budgetModifications: BudgetModification[];
  auditLogs: AuditLogEntry[];
  userProfiles: UserProfile[];
}

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
      
      storeMemory = {
        version: parsed.version || 1,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [...INITIAL_PURCHASES],
        users: Array.isArray(parsed.users) ? parsed.users : [...INITIAL_USERS],
        catalogs: Array.isArray(parsed.catalogs) ? parsed.catalogs : [...INITIAL_CATALOGS],
        budgetLines: Array.isArray(parsed.budgetLines) ? parsed.budgetLines : [...INITIAL_BUDGET_LINES],
        budgetModifications: Array.isArray(parsed.budgetModifications) ? parsed.budgetModifications : [...INITIAL_BUDGET_MODIFICATIONS],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [...INITIAL_AUDIT_LOGS],
        userProfiles: Array.isArray(parsed.userProfiles) ? parsed.userProfiles : [...INITIAL_USER_PROFILES]
      };

      // Garantizar que siempre exista la cuenta admin base
      const hasAdmin = storeMemory.users.some(u => u.username.toLowerCase() === 'admin');
      if (!hasAdmin && INITIAL_USERS.length > 0) {
        storeMemory.users.unshift(INITIAL_USERS[0]);
      }

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
    users: [...INITIAL_USERS],
    catalogs: [...INITIAL_CATALOGS],
    budgetLines: [...INITIAL_BUDGET_LINES],
    budgetModifications: [...INITIAL_BUDGET_MODIFICATIONS],
    auditLogs: [...INITIAL_AUDIT_LOGS],
    userProfiles: [...INITIAL_USER_PROFILES]
  };

  persistToDisk();
  console.log('[DataStore] Inicializado nuevo almacén central institucional.');
  return storeMemory;
}

// Obtener estado completo
export function getStoreState(): DataStoreState {
  return initDataStore();
}

// Compras (Purchases)
export function savePurchase(purchase: PurchaseRecord): PurchaseRecord {
  const store = initDataStore();
  const index = store.purchases.findIndex(p => p.id === purchase.id);
  if (index >= 0) {
    store.purchases[index] = { ...store.purchases[index], ...purchase };
  } else {
    store.purchases.unshift(purchase);
  }
  persistToDisk();
  return purchase;
}

export function deletePurchase(id: string): boolean {
  const store = initDataStore();
  const initialLength = store.purchases.length;
  store.purchases = store.purchases.filter(p => p.id !== id);
  const deleted = store.purchases.length < initialLength;
  if (deleted) {
    persistToDisk();
    console.log(`[DataStore] Compra eliminada permanentemente: ${id}`);
  }
  return deleted;
}

export function batchDeletePurchases(ids: string[]): number {
  const store = initDataStore();
  const idSet = new Set(ids);
  const initialLength = store.purchases.length;
  store.purchases = store.purchases.filter(p => !idSet.has(p.id));
  const count = initialLength - store.purchases.length;
  if (count > 0) {
    persistToDisk();
    console.log(`[DataStore] Eliminación en lote: ${count} compras retiradas.`);
  }
  return count;
}

// Usuarios (Users)
export function findUser(query: string): User | undefined {
  const store = initDataStore();
  const clean = query.trim().toLowerCase();
  return store.users.find(u => 
    u.id === query || 
    u.username.toLowerCase() === clean || 
    (u.email && u.email.toLowerCase().trim() === clean)
  );
}

export function saveUser(user: User): User {
  const store = initDataStore();
  const index = store.users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  if (index >= 0) {
    store.users[index] = { ...store.users[index], ...user };
  } else {
    store.users.push(user);
  }
  persistToDisk();
  return user;
}

export function deleteUser(id: string): boolean {
  const store = initDataStore();
  const user = store.users.find(u => u.id === id);
  if (user?.username.toLowerCase() === 'admin') {
    return false; // Proteger la cuenta admin
  }
  const initialLength = store.users.length;
  store.users = store.users.filter(u => u.id !== id);
  const deleted = store.users.length < initialLength;
  if (deleted) {
    persistToDisk();
    console.log(`[DataStore] Usuario eliminado permanentemente: ${id}`);
  }
  return deleted;
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
  persistToDisk();
  return catalog;
}

export function deleteCatalog(id: string): boolean {
  const store = initDataStore();
  const initialLength = store.catalogs.length;
  store.catalogs = store.catalogs.filter(c => c.id !== id);
  const deleted = store.catalogs.length < initialLength;
  if (deleted) {
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
  persistToDisk();
  return line;
}

export function deleteBudgetLine(id: string): boolean {
  const store = initDataStore();
  const initialLength = store.budgetLines.length;
  store.budgetLines = store.budgetLines.filter(b => b.id !== id && b.renglonPresupuestario !== id);
  const deleted = store.budgetLines.length < initialLength;
  if (deleted) {
    persistToDisk();
  }
  return deleted;
}

export function setBudgetLines(lines: BudgetLineItem[]): BudgetLineItem[] {
  const store = initDataStore();
  store.budgetLines = [...lines];
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
  persistToDisk();
  return entry;
}
