/**
 * @license
 * Sistema de Control de Compras - Gerencia de Informática
 * Organismo Judicial de Guatemala
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PurchasesView } from './components/PurchasesView';
import { CatalogsView } from './components/CatalogsView';
import { AuditLogView } from './components/AuditLogView';
import { UsersView } from './components/UsersView';
import { ReportsView } from './components/ReportsView';
import { CustomizationView } from './components/CustomizationView';
import { LoginModal } from './components/LoginModal';
import { LoginView } from './components/LoginView';
import { AdminAccessGate } from './components/AdminAccessGate';
import { PurchaseFormModal } from './components/PurchaseFormModal';
import { PurchaseDetailModal } from './components/PurchaseDetailModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ToastContainer } from './components/ToastContainer';

const AppContent: React.FC = () => {
  const { activeTab, themeConfig, currentUser } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PUERTA DE AUTENTICACIÓN: Si el usuario no está autenticado, muestra el Panel de Logueo
  if (!currentUser) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  const isAdmin = currentUser.rol === 'administrador';
  const isAuditorOrAdmin = currentUser.rol === 'administrador' || currentUser.rol === 'auditor';

  return (
    <div className={`flex h-screen w-full ${themeConfig.appBackground} text-slate-800 font-sans overflow-hidden`}>
      
      {/* Barra Lateral Izquierda */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Cabecera Superior */}
        <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Contenedor con Scroll de Vistas */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 ${themeConfig.appBackground}`}>
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'compras' && <PurchasesView />}
            {activeTab === 'reportes' && <ReportsView />}
            
            {/* Control & Auditoría */}
            {activeTab === 'auditoria' && (
              isAuditorOrAdmin ? (
                <AuditLogView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Registro de Auditoría" 
                  moduleDescription="Supervisión institucional y bitácora de eventos del sistema" 
                />
              )
            )}

            {/* PANELES DE ADMINISTRACIÓN (Acceso restringido exclusivamente a Administradores) */}
            {activeTab === 'catalogos' && (
              isAdmin ? (
                <CatalogsView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Mantenimiento y Catálogos" 
                  moduleDescription="Mantenimiento de tablas maestras, categorías tecnológicas y modalidades de compra" 
                />
              )
            )}

            {activeTab === 'usuarios' && (
              isAdmin ? (
                <UsersView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Gestión de Usuarios" 
                  moduleDescription="Control de cuentas, asignación de roles y permisos institucionales" 
                />
              )
            )}

            {activeTab === 'personalizacion' && (
              isAdmin ? (
                <CustomizationView />
              ) : (
                <AdminAccessGate 
                  moduleTitle="Personalización & Temas" 
                  moduleDescription="Configuración de logotipos heráldicos y paletas cromáticas institucionales" 
                />
              )
            )}
          </div>
        </main>

        {/* Pie de Página Institucional (Professional Polish) */}
        <footer className="h-8 bg-slate-200 px-6 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-shrink-0 print:hidden">
          <span>© 2026 Organismo Judicial de Guatemala - Gerencia de Informática</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
              Sesión Verificada
            </span>
            <span>v1.0.5-OJ-SEC</span>
          </div>
        </footer>

      </div>

      {/* Modales del Sistema */}
      <LoginModal />
      <PurchaseFormModal />
      <PurchaseDetailModal />
      <ChangePasswordModal />

      {/* Notificaciones Flotantes (Toasts) */}
      <ToastContainer />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
