import * as XLSX from 'xlsx';
import { BudgetLineItem, BudgetModification, PurchaseRecord, BudgetDisponibilidadStatus } from '../types';
import { doesStatusAffectBudget } from '../data/budgetStandardCatalog';

/**
 * Recalcula dinámicamente la matriz de disponibilidad presupuestaria
 * considerando modificaciones aprobadas y adquisiciones registradas.
 */
export function calculateBudgetAvailability(
  lines: BudgetLineItem[],
  modifications: BudgetModification[],
  purchases: PurchaseRecord[]
): BudgetLineItem[] {
  return lines.map((line) => {
    // 1. Calcular Modificaciones Aprobadas netas para este renglón
    const modsAfectadas = modifications.filter(m => m.estado === 'aprobada');
    let modNeta = 0;
    let hasExplicitMods = false;

    for (const mod of modsAfectadas) {
      // Ampliación o Incremento al renglón (+)
      if ((mod.tipo === 'ampliacion' || (mod.tipo as string) === 'incremento') && mod.renglonPresupuestario === line.renglonPresupuestario) {
        modNeta += Number(mod.monto) || 0;
        hasExplicitMods = true;
      }
      // Disminución al renglón (-)
      else if (mod.tipo === 'disminucion' && mod.renglonPresupuestario === line.renglonPresupuestario) {
        modNeta -= Number(mod.monto) || 0;
        hasExplicitMods = true;
      }
      // Transferencia
      else if (mod.tipo === 'transferencia') {
        // Si este renglón es el destino recibe (+)
        if (mod.renglonPresupuestario === line.renglonPresupuestario) {
          modNeta += Number(mod.monto) || 0;
          hasExplicitMods = true;
        }
        // Si este renglón es el origen entrega (-)
        if (mod.renglonOrigenPresupuestario === line.renglonPresupuestario) {
          modNeta -= Number(mod.monto) || 0;
          hasExplicitMods = true;
        }
      }
    }

    // Si hay modificaciones explícitas en el módulo, usamos la suma calculada.
    // De lo contrario, conservamos el valor base provisto en la ficha o importado de Excel.
    const modificacionesAprobadas = hasExplicitMods ? modNeta : (Number(line.modificacionesAprobadas) || 0);

    // 2. Presupuesto Vigente = Inicial + Modificaciones Aprobadas
    const presupuestoInicial = Number(line.presupuestoInicial) || 0;
    const presupuestoVigente = presupuestoInicial + modificacionesAprobadas;

    // 3. Compras asociadas activas según regla institucional: Afecta Disponibilidad (Sí / No)
    // Se excluyen eventos Anulados, Rechazados, Desiertos y Prescindidos
    const activePurchases = purchases.filter(p => {
      const matchRenglon = p.renglonPresupuestario === line.renglonPresupuestario ||
        (p.descripcion && p.descripcion.includes(`[${line.renglonPresupuestario}]`));
      
      const affects = doesStatusAffectBudget(p.estatusEvento);
      return matchRenglon && affects;
    });

    // Sumar compras pagadas (Estatus 'Pagada' o estadoPago 'pagado')
    const purchasesPaidTotal = activePurchases
      .filter(p => p.estadoPago === 'pagado' || p.estatusEvento === 'Pagada')
      .reduce((sum, p) => sum + (Number(p.montoPagado) || Number(p.monto) || 0), 0);

    // Sumar compras comprometidas pendientes de pago (Registrada, En proceso, Comprometida, Adjudicada)
    const purchasesPendingTotal = activePurchases
      .filter(p => p.estadoPago !== 'pagado' && p.estatusEvento !== 'Pagada')
      .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

    // 4. Pagado que Rebaja
    // Si hay compras pagadas en el sistema se toman en cuenta, si no se mantiene el valor base histórico
    const pagadoBase = Number(line.pagadoQueRebaja) || 0;
    const pagadoQueRebaja = purchasesPaidTotal > 0 
      ? Math.max(pagadoBase, purchasesPaidTotal) 
      : pagadoBase;

    // 5. Disponible Real = Presupuesto Vigente - Pagado que Rebaja
    const disponibleReal = presupuestoVigente - pagadoQueRebaja;

    // 6. Comprometido Pendiente
    const comprometidoBase = Number(line.comprometidoPendiente) || 0;
    const comprometidoPendiente = purchasesPendingTotal > 0
      ? purchasesPendingTotal
      : comprometidoBase;

    // 7. Disponible Proyectado = Disponible Real - Comprometido Pendiente
    const disponibleProyectado = disponibleReal - comprometidoPendiente;

    // 8. Porcentaje Usado/Comprometido = ((Pagado + Comprometido) / Vigente) * 100
    const totalAfectado = pagadoQueRebaja + comprometidoPendiente;
    const porcentajeUsadoComprometido = presupuestoVigente > 0 
      ? Math.min(100, Math.max(0, (totalAfectado / presupuestoVigente) * 100))
      : 0;

    // 9. Estatus si hay disponibilidad o No
    let estatusDisponibilidad: BudgetDisponibilidadStatus = 'Con Disponibilidad';
    if (disponibleProyectado <= 0) {
      estatusDisponibilidad = 'Sin Disponibilidad';
    } else if (disponibleProyectado < (presupuestoVigente * 0.15)) {
      estatusDisponibilidad = 'Alerta Disponibilidad Baja';
    } else {
      estatusDisponibilidad = 'Con Disponibilidad';
    }

    return {
      ...line,
      presupuestoInicial,
      modificacionesAprobadas,
      presupuestoVigente,
      pagadoQueRebaja,
      disponibleReal,
      comprometidoPendiente,
      disponibleProyectado,
      porcentajeUsadoComprometido: Math.round(porcentajeUsadoComprometido * 100) / 100,
      estatusDisponibilidad
    };
  });
}

/**
 * Genera y descarga la plantilla de Excel modelo para importar presupuesto
 */
export function downloadBudgetExcelTemplate() {
  const rows = [
    {
      'Grupo Presupuestario': 'Grupo 100 - Servicios No Personales',
      'Renglón Presupuestario': '158',
      'Nombre del Renglón': 'Arrendamiento de Equipo de Cómputo',
      'Presupuesto Inicial': 2000000,
      'Modificaciones Aprobadas': 150000,
      'Presupuesto Vigente': 2150000,
      'Pagado que Rebaja': 850000,
      'Disponible Real': 1300000,
      'Comprometido Pendiente': 600000,
      'Disponible Proyectado': 700000,
      'Porcentaje Usado/Comprometido': '67.44%',
      'Estatus': 'Con Disponibilidad'
    },
    {
      'Grupo Presupuestario': 'Grupo 200 - Materiales y Suministros',
      'Renglón Presupuestario': '267',
      'Nombre del Renglón': 'Tintes, Pinturas y Colorantes',
      'Presupuesto Inicial': 400000,
      'Modificaciones Aprobadas': 40000,
      'Presupuesto Vigente': 440000,
      'Pagado que Rebaja': 220000,
      'Disponible Real': 220000,
      'Comprometido Pendiente': 160000,
      'Disponible Proyectado': 60000,
      'Porcentaje Usado/Comprometido': '86.36%',
      'Estatus': 'Alerta Disponibilidad Baja'
    },
    {
      'Grupo Presupuestario': 'Grupo 300 - Propiedad, Planta, Equipo e Intangibles',
      'Renglón Presupuestario': '328',
      'Nombre del Renglón': 'Equipo de Computación',
      'Presupuesto Inicial': 4500000,
      'Modificaciones Aprobadas': 300000,
      'Presupuesto Vigente': 4800000,
      'Pagado que Rebaja': 2100000,
      'Disponible Real': 2700000,
      'Comprometido Pendiente': 1900000,
      'Disponible Proyectado': 800000,
      'Porcentaje Usado/Comprometido': '83.33%',
      'Estatus': 'Con Disponibilidad'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuesto GIT');

  // Ajustar anchos de columnas
  worksheet['!cols'] = [
    { wch: 35 }, // Grupo
    { wch: 22 }, // Renglón
    { wch: 40 }, // Nombre
    { wch: 20 }, // Presupuesto Inicial
    { wch: 24 }, // Modificaciones
    { wch: 20 }, // Presupuesto Vigente
    { wch: 20 }, // Pagado que Rebaja
    { wch: 18 }, // Disponible Real
    { wch: 24 }, // Comprometido Pendiente
    { wch: 22 }, // Disponible Proyectado
    { wch: 28 }, // % Usado
    { wch: 22 }  // Estatus
  ];

  XLSX.writeFile(workbook, 'Plantilla_Disponibilidad_Presupuestaria_GIT.xlsx');
}

/**
 * Exporta la matriz actual de disponibilidad presupuestaria a Excel
 */
export function exportBudgetLinesToExcel(lines: BudgetLineItem[], filename = 'Matriz_Disponibilidad_Presupuestaria_GIT.xlsx') {
  const data = lines.map(line => ({
    'Grupo Presupuestario': line.grupoPresupuestario,
    'Renglón Presupuestario': line.renglonPresupuestario,
    'Nombre del Renglón': line.nombreRenglon,
    'Presupuesto Inicial': line.presupuestoInicial,
    'Modificaciones Aprobadas': line.modificacionesAprobadas,
    'Presupuesto Vigente': line.presupuestoVigente,
    'Pagado que Rebaja': line.pagadoQueRebaja,
    'Disponible Real': line.disponibleReal,
    'Comprometido Pendiente': line.comprometidoPendiente,
    'Disponible Proyectado': line.disponibleProyectado,
    'Porcentaje Usado/Comprometido': `${line.porcentajeUsadoComprometido.toFixed(2)}%`,
    'Estatus': line.estatusDisponibilidad
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Disponibilidad');

  worksheet['!cols'] = [
    { wch: 35 },
    { wch: 22 },
    { wch: 40 },
    { wch: 20 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 28 },
    { wch: 24 }
  ];

  XLSX.writeFile(workbook, filename);
}
