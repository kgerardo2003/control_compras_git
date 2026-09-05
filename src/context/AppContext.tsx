import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  PurchaseRecord, 
  Catalog, 
  AuditLogEntry, 
  AppNotification, 
  ActiveTab, 
  UserRole,
  AuditAction,
  CatalogItem,
  SystemThemeId,
  CustomLogoConfig
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_CATALOGS, 
  INITIAL_PURCHASES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_NOTIFICATIONS 
} from '../data/initialData';
import { SYSTEM_THEMES, ThemeConfig } from '../utils/themeConfig';
import { 
  db,
  PURCHASES_COLLECTION, 
  AUDIT_LOGS_COLLECTION, 
  CATALOGS_COLLECTION, 
  USERS_COLLECTION,
  savePurchaseToFirestore,
  removePurchaseFromFirestore,
  saveAuditLogToFirestore,
  saveCatalogToFirestore,
  removeCatalogFromFirestore,
  saveUserToFirestore,
  removeUserFromFirestore,
  seedInitialDataIfEmpty
} from '../lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';

export const DEFAULT_LOGO_CONFIG: CustomLogoConfig = {
  type: 'preset',
  presetId: 'oj_vector',
  title: 'Organismo Judicial',
  subtitle: 'Gerencia de Informática y Telecomunicaciones (GIT)'
};

interface AppContextType {
  currentUser: User | null;
  users: User[];
  purchases: PurchaseRecord[];
  catalogs: Catalog[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOnline: boolean;
  isFirestoreConnected: boolean;
  firestoreStatus: 'conectado' | 'conectando' | 'offline';
  selectedPurchase: PurchaseRecord | null;
  setSelectedPurchase: (purchase: PurchaseRecord | null) => void;
  isPurchaseModalOpen: boolean;
  setIsPurchaseModalOpen: (open: boolean) => void;
  purchaseToEdit: PurchaseRecord | null;
  setPurchaseToEdit: (purchase: PurchaseRecord | null) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;

  // Temas y Personalización
  theme: SystemThemeId;
  setTheme: (theme: SystemThemeId) => void;
  themeConfig: ThemeConfig;
  customLogo: CustomLogoConfig;
  setCustomLogo: (logo: CustomLogoConfig | ((prev: CustomLogoConfig) => CustomLogoConfig)) => void;
  resetLogo: () => void;
  
  // Auth
  login: (username: string, password?: string) => { success: boolean; message: string };
  logout: () => void;
  switchDemoUser: (role: UserRole) => void;

  // Compras CRUD
  addPurchase: (data: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>) => PurchaseRecord;
  updatePurchase: (id: string, data: Partial<PurchaseRecord>) => void;
  deletePurchase: (id: string) => void;

  // Catálogos CRUD
  addCatalog: (data: Omit<Catalog, 'id' | 'esSistema'>) => Catalog;
  updateCatalog: (id: string, data: Partial<Catalog>) => void;
  deleteCatalog: (id: string) => void;
  addCatalogItem: (catalogId: string, item: Omit<CatalogItem, 'id'>) => void;
  updateCatalogItem: (catalogId: string, itemId: string, item: Partial<CatalogItem>) => void;
  deleteCatalogItem: (catalogId: string, itemId: string) => void;

  // Usuarios CRUD
  addUser: (data: Omit<User, 'id' | 'fechaCreacion'>) => User;
  updateUser: (id: string, data: Partial<User>) => void;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;

  // Auditoría
  logAudit: (
    accion: AuditAction, 
    modulo: AuditLogEntry['modulo'], 
    detalles: string, 
    registroId?: string,
    valoresAnteriores?: Record<string, any>, 
    valoresNuevos?: Record<string, any>
  ) => void;

  // Notificaciones
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void;
  triggerSimulatedNotification: () => void;

  // Reseteo
  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'oj_git_users_v1',
  PURCHASES: 'oj_git_purchases_v1',
  CATALOGS: 'oj_git_catalogs_v1',
  AUDIT_LOGS: 'oj_git_audit_v1',
  NOTIFICATIONS: 'oj_git_notifs_v1',
  SESSION: 'oj_git_session_v1',
  THEME: 'oj_git_theme_v1',
  LOGO: 'oj_git_logo_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialización con persistencia en localStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        const adminIndex = parsed.findIndex(u => u.username.toLowerCase() === 'admin');
        if (adminIndex >= 0) {
          parsed[adminIndex].nombreCompleto = 'Lic. Kevin Gerarado López de León';
          parsed[adminIndex].email = 'klopez@oj.gob.gt';
          parsed[adminIndex].password = 'Guate2026*';
          parsed[adminIndex].rol = 'administrador';
          parsed[adminIndex].cargo = 'Gerente de Informática y Telecomunicaciones';
          parsed[adminIndex].departamento = 'Gerencia de Informática - OJ';
          parsed[adminIndex].activo = true;
          return parsed;
        } else {
          return [INITIAL_USERS[0], ...parsed];
        }
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    if (saved) {
      try {
        const parsed: PurchaseRecord[] = JSON.parse(saved);
        return parsed.map(p => {
          if (!p.areaSolicitante) {
            const initialMatch = INITIAL_PURCHASES.find(ip => ip.id === p.id);
            return {
              ...p,
              areaSolicitante: initialMatch?.areaSolicitante || 'Soporte técnico'
            };
          }
          return p;
        });
      } catch {
        return INITIAL_PURCHASES;
      }
    }
    return INITIAL_PURCHASES;
  });

  const [catalogs, setCatalogs] = useState<Catalog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATALOGS);
    if (saved) {
      try {
        const parsed: Catalog[] = JSON.parse(saved);
        const hasAreaCat = parsed.some(c => c.codigo === 'AREA_SOLICITANTE');
        if (!hasAreaCat) {
          const areaCat = INITIAL_CATALOGS.find(c => c.codigo === 'AREA_SOLICITANTE');
          if (areaCat) {
            return [...parsed, areaCat];
          }
        }
        return parsed;
      } catch {
        return INITIAL_CATALOGS;
      }
    }
    return INITIAL_CATALOGS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map((n: AppNotification, idx: number) => {
            if (!n.id || seen.has(n.id)) {
              const uniqueId = `notif-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
              seen.add(uniqueId);
              return { ...n, id: uniqueId };
            }
            seen.add(n.id);
            return n;
          });
        }
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const sessionActive = sessionStorage.getItem('OJ_SESSION_ACTIVE');
    if (sessionActive) {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username && parsed.username.toLowerCase() === 'admin') {
            parsed.nombreCompleto = 'Lic. Kevin Gerarado López de León';
            parsed.email = 'klopez@oj.gob.gt';
            parsed.password = 'Guate2026*';
            parsed.cargo = 'Gerente de Informática y Telecomunicaciones';
            parsed.departamento = 'Gerencia de Informática - OJ';
          }
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null; // Inicia en el panel de logueo al ingresar al sistema
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [firestoreStatus, setFirestoreStatus] = useState<'conectado' | 'conectando' | 'offline'>('conectando');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseRecord | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Sincronización en Tiempo Real Multiusuario con Firebase Firestore
  useEffect(() => {
    // Sembrado inicial de contingencia si la base de datos en la nube está limpia
    seedInitialDataIfEmpty(INITIAL_PURCHASES, INITIAL_CATALOGS, INITIAL_USERS, INITIAL_AUDIT_LOGS)
      .then(() => {
        setIsFirestoreConnected(true);
        setFirestoreStatus('conectado');
      })
      .catch((err) => {
        console.warn("Conexión Firestore:", err);
      });

    // Suscripción reactiva a Adquisiciones (Purchases)
    const unsubPurchases = onSnapshot(collection(db, PURCHASES_COLLECTION), (snapshot) => {
      if (!snapshot.empty) {
        const remoteItems: PurchaseRecord[] = [];
        snapshot.forEach((doc) => {
          remoteItems.push(doc.data() as PurchaseRecord);
        });
        remoteItems.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
        setPurchases(remoteItems);
      }
      setIsFirestoreConnected(true);
      setFirestoreStatus('conectado');
    }, (error) => {
      console.warn("Firestore Purchases Listener Error:", error);
      setFirestoreStatus('offline');
    });

    // Suscripción reactiva a Bitácora Oficial (Audit Logs)
    const qLogs = query(collection(db, AUDIT_LOGS_COLLECTION), limit(150));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      if (!snapshot.empty) {
        const remoteLogs: AuditLogEntry[] = [];
        snapshot.forEach((doc) => {
          remoteLogs.push(doc.data() as AuditLogEntry);
        });
        remoteLogs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        setAuditLogs(remoteLogs);
      }
    }, (error) => {
      console.warn("Firestore Logs Listener Error:", error);
    });

    // Suscripción reactiva a Catálogos Parametrizados
    const unsubCatalogs = onSnapshot(collection(db, CATALOGS_COLLECTION), (snapshot) => {
      if (!snapshot.empty) {
        const remoteCatalogs: Catalog[] = [];
        snapshot.forEach((doc) => {
          remoteCatalogs.push(doc.data() as Catalog);
        });
        setCatalogs(remoteCatalogs);
      }
    }, (error) => {
      console.warn("Firestore Catalogs Listener Error:", error);
    });

    // Suscripción reactiva a Directorio de Usuarios
    const unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
      if (!snapshot.empty) {
        const remoteUsers: User[] = [];
        snapshot.forEach((doc) => {
          remoteUsers.push(doc.data() as User);
        });
        setUsers(remoteUsers);
      }
    }, (error) => {
      console.warn("Firestore Users Listener Error:", error);
    });

    return () => {
      unsubPurchases();
      unsubLogs();
      unsubCatalogs();
      unsubUsers();
    };
  }, []);

  // Tema del sistema
  const [theme, setThemeState] = useState<SystemThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved && (saved === 'azul_persia_acero' || saved === 'slate_ambar' || saved === 'azul_judicial' || saved === 'grafito_esmeralda')) {
      if (saved === 'slate_ambar') {
        localStorage.setItem(STORAGE_KEYS.THEME, 'azul_persia_acero');
        return 'azul_persia_acero';
      }
      return saved as SystemThemeId;
    }
    return 'azul_persia_acero';
  });

  const themeConfig = SYSTEM_THEMES[theme] || SYSTEM_THEMES.azul_persia_acero;

  const setTheme = (newTheme: SystemThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    addNotification({
      tipo: 'info',
      titulo: 'Tema Visual Actualizado',
      mensaje: `Se ha aplicado el tema "${SYSTEM_THEMES[newTheme]?.name}".`,
      categoria: 'sistema'
    });
  };

  // Logotipo personalizado
  const [customLogo, setCustomLogoState] = useState<CustomLogoConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGO);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_LOGO_CONFIG;
      }
    }
    return DEFAULT_LOGO_CONFIG;
  });

  const setCustomLogo = (updater: CustomLogoConfig | ((prev: CustomLogoConfig) => CustomLogoConfig)) => {
    setCustomLogoState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEYS.LOGO, JSON.stringify(next));
      return next;
    });
  };

  const resetLogo = () => {
    setCustomLogoState(DEFAULT_LOGO_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.LOGO);
    addNotification({
      tipo: 'info',
      titulo: 'Logotipo Restablecido',
      mensaje: 'Se ha restaurado el logotipo vectorial oficial del Organismo Judicial.',
      categoria: 'sistema'
    });
  };

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(catalogs));
  }, [catalogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }, [currentUser]);

  // Auditoría Helper
  const logAudit = useCallback((
    accion: AuditAction, 
    modulo: AuditLogEntry['modulo'], 
    detalles: string, 
    registroId?: string,
    valoresAnteriores?: Record<string, any>, 
    valoresNuevos?: Record<string, any>
  ) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fecha: new Date().toISOString(),
      usuario: currentUser ? `${currentUser.username} (${currentUser.nombreCompleto})` : 'Sistema Anónimo',
      rol: currentUser ? currentUser.rol : 'usuario_estandar',
      accion,
      modulo,
      detalles,
      registroId,
      ip: '10.150.2.' + (Math.floor(Math.random() * 80) + 10),
      valoresAnteriores,
      valoresNuevos
    };

    setAuditLogs(prev => [newEntry, ...prev]);
    saveAuditLogToFirestore(newEntry);
  }, [currentUser]);

  // Helper de Notificación
  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${uniqueSuffix}`,
      fecha: new Date().toISOString(),
      leida: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  // Login
  const login = (username: string, password?: string) => {
    const trimmedUser = username.toLowerCase().trim();
    const user = users.find(u => u.username.toLowerCase() === trimmedUser);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado en los registros del Organismo Judicial.' };
    }
    if (!user.activo) {
      return { success: false, message: 'La cuenta de usuario se encuentra suspendida o inactiva.' };
    }

    const expectedPassword = user.username.toLowerCase() === 'admin' ? 'Guate2026*' : user.password;
    if (password && expectedPassword && password !== expectedPassword) {
      return { success: false, message: 'Contraseña institucional incorrecta.' };
    }

    const updatedUser = { 
      ...user, 
      nombreCompleto: user.username.toLowerCase() === 'admin' ? 'Lic. Kevin Gerarado López de León' : user.nombreCompleto,
      email: user.username.toLowerCase() === 'admin' ? 'klopez@oj.gob.gt' : user.email,
      password: expectedPassword,
      ultimoAcceso: new Date().toISOString() 
    };
    sessionStorage.setItem('OJ_SESSION_ACTIVE', 'true');
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    setActiveTab('dashboard');
    
    // Registrar auditoría
    const tempLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fecha: new Date().toISOString(),
      usuario: `${updatedUser.username} (${updatedUser.nombreCompleto})`,
      rol: updatedUser.rol,
      accion: 'LOGIN',
      modulo: 'Autenticación',
      detalles: `Inicio de sesión exitoso como ${updatedUser.rol.toUpperCase()}.`,
      ip: '10.150.2.45'
    };
    setAuditLogs(prev => [tempLog, ...prev]);

    return { success: true, message: `Bienvenido, ${updatedUser.nombreCompleto}` };
  };

  const logout = () => {
    if (currentUser) {
      const tempLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fecha: new Date().toISOString(),
        usuario: `${currentUser.username} (${currentUser.nombreCompleto})`,
        rol: currentUser.rol,
        accion: 'LOGOUT',
        modulo: 'Autenticación',
        detalles: 'Cierre de sesión de la plataforma.',
        ip: '10.150.2.45'
      };
      setAuditLogs(prev => [tempLog, ...prev]);
    }
    sessionStorage.removeItem('OJ_SESSION_ACTIVE');
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setCurrentUser(null);
  };

  const switchDemoUser = (role: UserRole) => {
    const target = users.find(u => u.rol === role && u.activo) || users[0];
    if (target) {
      sessionStorage.setItem('OJ_SESSION_ACTIVE', 'true');
      setCurrentUser(target);
      setActiveTab('dashboard');
      logAudit('LOGIN', 'Autenticación', `Cambio rápido a perfil demo: ${target.rol.toUpperCase()} (${target.nombreCompleto})`);
    }
  };

  // Compras CRUD
  const addPurchase = (data: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>): PurchaseRecord => {
    const newId = `pur-2026-${String(purchases.length + 1).padStart(3, '0')}`;
    const newRecord: PurchaseRecord = {
      ...data,
      id: newId,
      creadoPor: currentUser ? currentUser.nombreCompleto : 'Operador GIT',
      fechaCreacion: new Date().toISOString(),
    };

    setPurchases(prev => [newRecord, ...prev]);
    savePurchaseToFirestore(newRecord);

    logAudit(
      'CREAR_COMPRA', 
      'Compras', 
      `Creación de evento NOG: ${data.nog} - F56-e: ${data.f56e} (${data.descripcion.slice(0, 50)}...)`,
      newId,
      undefined,
      data
    );

    addNotification({
      tipo: 'info',
      titulo: 'Nueva Adquisición Registrada',
      mensaje: `NOG ${data.nog} registrado por Q.${data.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
      categoria: 'nuevo_registro',
      enlaceId: newId
    });

    return newRecord;
  };

  const updatePurchase = (id: string, data: Partial<PurchaseRecord>) => {
    const prev = purchases.find(p => p.id === id);
    if (!prev) return;

    const updated: PurchaseRecord = {
      ...prev,
      ...data,
      modificadoPor: currentUser ? currentUser.nombreCompleto : 'Operador GIT',
      fechaModificacion: new Date().toISOString(),
    };

    setPurchases(prevList => prevList.map(p => p.id === id ? updated : p));
    savePurchaseToFirestore(updated);

    // Si cambió el estatus, emitir notificación especial
    if (data.estatusEvento && data.estatusEvento !== prev.estatusEvento) {
      logAudit(
        'CAMBIO_ESTATUS',
        'Compras',
        `Cambio de estatus para NOG ${prev.nog}: de "${prev.estatusEvento}" a "${data.estatusEvento}"`,
        id,
        { estatusEvento: prev.estatusEvento },
        { estatusEvento: data.estatusEvento }
      );

      const notifType = data.estatusEvento === 'Adjudicación' ? 'exito' : data.estatusEvento === 'Desierto' ? 'alerta' : 'info';
      addNotification({
        tipo: notifType,
        titulo: `Estatus Actualizado: ${data.estatusEvento}`,
        mensaje: `El evento NOG ${prev.nog} cambió de "${prev.estatusEvento}" a "${data.estatusEvento}"`,
        categoria: 'cambio_estatus',
        enlaceId: id
      });
    } else {
      logAudit(
        'EDITAR_COMPRA',
        'Compras',
        `Edición de registro NOG ${prev.nog} - F56-e: ${prev.f56e}`,
        id,
        prev,
        data
      );
    }
  };

  const deletePurchase = (id: string) => {
    const prev = purchases.find(p => p.id === id);
    if (!prev) return;

    setPurchases(prevList => prevList.filter(p => p.id !== id));
    removePurchaseFromFirestore(id);
    logAudit('ELIMINAR_COMPRA', 'Compras', `Eliminación de evento NOG: ${prev.nog} (${prev.descripcion.slice(0, 40)}...)`, id, prev);
  };

  // Catálogos CRUD
  const addCatalog = (data: Omit<Catalog, 'id' | 'esSistema'>): Catalog => {
    const newCat: Catalog = {
      ...data,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      esSistema: false,
    };
    setCatalogs(prev => [...prev, newCat]);
    saveCatalogToFirestore(newCat);
    logAudit('CREAR_CATALOGO', 'Catálogos', `Creación de nuevo catálogo: ${data.nombre} (${data.codigo})`, newCat.id);
    return newCat;
  };

  const updateCatalog = (id: string, data: Partial<Catalog>) => {
    const current = catalogs.find(c => c.id === id);
    if (!current) return;
    const updated = { ...current, ...data };
    setCatalogs(prev => prev.map(c => c.id === id ? updated : c));
    saveCatalogToFirestore(updated);
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Actualización de catálogo ID: ${id}`, id, undefined, data);
  };

  const deleteCatalog = (id: string) => {
    const cat = catalogs.find(c => c.id === id);
    if (cat?.esSistema) return; // Proteger catálogos del sistema
    setCatalogs(prev => prev.filter(c => c.id !== id));
    removeCatalogFromFirestore(id);
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Eliminación de catálogo: ${cat?.nombre}`, id);
  };

  const addCatalogItem = (catalogId: string, item: Omit<CatalogItem, 'id'>) => {
    const newItem: CatalogItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    let updatedCatalog: Catalog | null = null;
    setCatalogs(prev => prev.map(cat => {
      if (cat.id === catalogId) {
        updatedCatalog = {
          ...cat,
          items: [...cat.items, newItem]
        };
        return updatedCatalog;
      }
      return cat;
    }));
    if (updatedCatalog) {
      saveCatalogToFirestore(updatedCatalog);
    }
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Añadido elemento "${item.valor}" al catálogo ID: ${catalogId}`, catalogId);
  };

  const updateCatalogItem = (catalogId: string, itemId: string, item: Partial<CatalogItem>) => {
    let updatedCatalog: Catalog | null = null;
    setCatalogs(prev => prev.map(cat => {
      if (cat.id === catalogId) {
        updatedCatalog = {
          ...cat,
          items: cat.items.map(it => it.id === itemId ? { ...it, ...item } : it)
        };
        return updatedCatalog;
      }
      return cat;
    }));
    if (updatedCatalog) {
      saveCatalogToFirestore(updatedCatalog);
    }
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Modificado elemento ${itemId} en catálogo ID: ${catalogId}`, catalogId);
  };

  const deleteCatalogItem = (catalogId: string, itemId: string) => {
    let updatedCatalog: Catalog | null = null;
    setCatalogs(prev => prev.map(cat => {
      if (cat.id === catalogId) {
        updatedCatalog = {
          ...cat,
          items: cat.items.filter(it => it.id !== itemId)
        };
        return updatedCatalog;
      }
      return cat;
    }));
    if (updatedCatalog) {
      saveCatalogToFirestore(updatedCatalog);
    }
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Eliminado elemento ${itemId} de catálogo ID: ${catalogId}`, catalogId);
  };

  // Usuarios CRUD
  const addUser = (data: Omit<User, 'id' | 'fechaCreacion'>): User => {
    const newUser: User = {
      ...data,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fechaCreacion: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    saveUserToFirestore(newUser);
    logAudit('CREAR_USUARIO', 'Usuarios', `Creación de usuario: ${newUser.username} con rol ${newUser.rol}`, newUser.id);
    return newUser;
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const current = users.find(u => u.id === id);
    if (!current) return;
    const updated = { ...current, ...data };
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    saveUserToFirestore(updated);
    logAudit('EDITAR_USUARIO', 'Usuarios', `Actualización de usuario ID: ${id}`, id, undefined, data);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextState = !u.activo;
        const updated = { ...u, activo: nextState };
        saveUserToFirestore(updated);
        logAudit('EDITAR_USUARIO', 'Usuarios', `Cambio de estado de usuario ${u.username} a ${nextState ? 'ACTIVO' : 'INACTIVO'}`, id);
        return updated;
      }
      return u;
    }));
  };

  const deleteUser = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.username === 'admin') return; // Proteger superadmin
    setUsers(prev => prev.filter(u => u.id !== id));
    removeUserFromFirestore(id);
    logAudit('EDITAR_USUARIO', 'Usuarios', `Eliminación de usuario: ${user?.username}`, id);
  };

  // Notificaciones
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const triggerSimulatedNotification = () => {
    const samples = [
      {
        tipo: 'urgente' as const,
        titulo: 'Visto Bueno Pendiente',
        mensaje: 'La solicitud F56-e F56-2024-038 requiere Vo.Bo. de la Gerencia de Informática antes de las 16:00 hrs.',
        categoria: 'aprobacion_vobo' as const,
      },
      {
        tipo: 'exito' as const,
        titulo: 'Ofertas Recibidas en Guatecompras',
        mensaje: 'Se han recibido 3 ofertas para el evento NOG 22019482 (Licenciamiento Enterprise).',
        categoria: 'vencimiento_oferta' as const,
      },
      {
        tipo: 'alerta' as const,
        titulo: 'Alerta de Presupuesto GIT',
        mensaje: 'La ejecución presupuestaria del rubro de Telecomunicaciones ha alcanzado el 78% del techo asignado.',
        categoria: 'sistema' as const,
      }
    ];
    const chosen = samples[Math.floor(Math.random() * samples.length)];
    addNotification(chosen);
  };

  const resetToDemoData = () => {
    setUsers(INITIAL_USERS);
    setPurchases(INITIAL_PURCHASES);
    setCatalogs(INITIAL_CATALOGS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.clear();
    logAudit('RESTAURAR_DATOS', 'Sistema', 'Restauración completa de los datos de demostración del sistema.');
  };

  const unreadNotificationsCount = notifications.filter(n => !n.leida).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        purchases,
        catalogs,
        auditLogs,
        notifications,
        unreadNotificationsCount,
        activeTab,
        setActiveTab,
        isOnline,
        isFirestoreConnected,
        firestoreStatus,
        selectedPurchase,
        setSelectedPurchase,
        isPurchaseModalOpen,
        setIsPurchaseModalOpen,
        purchaseToEdit,
        setPurchaseToEdit,
        isLoginModalOpen,
        setIsLoginModalOpen,
        login,
        logout,
        switchDemoUser,
        addPurchase,
        updatePurchase,
        deletePurchase,
        addCatalog,
        updateCatalog,
        deleteCatalog,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        logAudit,
        markNotificationRead,
        markAllNotificationsRead,
        addNotification,
        triggerSimulatedNotification,
        resetToDemoData,
        theme,
        setTheme,
        themeConfig,
        customLogo,
        setCustomLogo,
        resetLogo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
