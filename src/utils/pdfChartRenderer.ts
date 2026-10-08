import { PurchaseRecord } from '../types';
import { formatQuetzales, getModalidadCompraByMonto } from './formatters';

export interface ChartDataItem {
  name: string;
  value: number;
  amount: number;
  color: string;
  percentage?: number;
}

export interface ExecutiveDecisionKPIs {
  totalPurchases: number;
  totalAmount: number;
  adjudicatedCount: number;
  adjudicatedAmount: number;
  adjudicationRate: number;
  dictamenCount: number;
  dictamenRate: number;
  evaluacionCount: number;
  evaluacionAmount: number;
  prescindidoCount: number;
  prescindidoAmount: number;
  desiertoCount: number;
  desiertoAmount: number;
  sinOfertasCount: number;
  averageTicket: number;
  topAreaName: string;
  topAreaAmount: number;
  topAreaPercentage: number;
  modalidadPredominante: string;
  modalidadPredominantePct: number;
  comprasDirectasCount: number;
  comprasDirectasAmount: number;
  bajaCuantiaCount: number;
  bajaCuantiaAmount: number;
  cotizacionCount: number;
  cotizacionAmount: number;
  licitacionCount: number;
  licitacionAmount: number;
}

/**
 * Calcula todas las métricas de decisión y agrupaciones para los gráficos circulares
 */
export function calculateExecutiveKPIs(purchases: PurchaseRecord[]): {
  kpis: ExecutiveDecisionKPIs;
  estatusChartData: ChartDataItem[];
  modalidadChartData: ChartDataItem[];
  dictamenChartData: ChartDataItem[];
  areaChartData: ChartDataItem[];
  recommendations: Array<{ type: 'success' | 'warning' | 'info'; title: string; desc: string }>;
} {
  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  // Estatus
  const estatusMap: Record<string, { count: number; amount: number }> = {
    'Adjudicación': { count: 0, amount: 0 },
    'Evaluación': { count: 0, amount: 0 },
    'Prescindido': { count: 0, amount: 0 },
    'Desierto': { count: 0, amount: 0 },
  };

  // Modalidad LCE
  const modalidadMap: Record<string, { count: number; amount: number }> = {
    'Baja Cuantía': { count: 0, amount: 0 },
    'Compra Directa': { count: 0, amount: 0 },
    'Cotización': { count: 0, amount: 0 },
    'Licitación': { count: 0, amount: 0 },
  };

  // Dictamen GIT
  let dictamenCount = 0;
  let dictamenAmount = 0;
  let sinDictamenCount = 0;
  let sinDictamenAmount = 0;

  // Áreas
  const areaMap: Record<string, { count: number; amount: number }> = {};
  let sinOfertasCount = 0;

  purchases.forEach((p) => {
    const monto = Number(p.monto) || 0;
    
    // Estatus
    const est = p.estatusEvento || 'Evaluación';
    if (!estatusMap[est]) {
      estatusMap[est] = { count: 0, amount: 0 };
    }
    estatusMap[est].count += 1;
    estatusMap[est].amount += monto;

    if (Number(p.cantidadOfertas) === 0 || est === 'Desierto') {
      sinOfertasCount += 1;
    }

    // Modalidad
    const rawMod = (p.modalidadCompra || '').trim();
    let mod: string;
    if (rawMod.toLowerCase().includes('licita')) {
      mod = 'Licitación';
    } else if (rawMod.toLowerCase().includes('cotiza')) {
      mod = 'Cotización';
    } else if (rawMod.toLowerCase().includes('baja cuant')) {
      mod = 'Baja Cuantía';
    } else if (rawMod.toLowerCase().includes('directa')) {
      mod = 'Compra Directa';
    } else if (monto > 900000) {
      mod = 'Licitación';
    } else if (monto > 90000) {
      mod = 'Cotización';
    } else {
      mod = 'Compra Directa';
    }
    if (!modalidadMap[mod]) {
      modalidadMap[mod] = { count: 0, amount: 0 };
    }
    modalidadMap[mod].count += 1;
    modalidadMap[mod].amount += monto;

    // Dictamen GIT
    if (p.evaluadoGIT === 'Sí' || Boolean(p.fechaDictamenGIT)) {
      dictamenCount += 1;
      dictamenAmount += monto;
    } else {
      sinDictamenCount += 1;
      sinDictamenAmount += monto;
    }

    // Área
    let area = (p.areaSolicitante || '').trim() || 'Soporte Técnico';
    const lowerArea = area.toLowerCase();
    if (lowerArea === 'soporte técnico' || lowerArea === 'soporte tecnico') {
      area = 'Soporte Técnico';
    } else if (lowerArea === 'soporte técnico remoto' || lowerArea === 'soporte tecnico remoto') {
      area = 'Soporte Técnico Remoto';
    } else if (lowerArea === 'estadistica' || lowerArea === 'estadística') {
      area = 'Estadística';
    }
    if (!areaMap[area]) {
      areaMap[area] = { count: 0, amount: 0 };
    }
    areaMap[area].count += 1;
    areaMap[area].amount += monto;
  });

  const adjudicatedCount = estatusMap['Adjudicación']?.count || 0;
  const adjudicatedAmount = estatusMap['Adjudicación']?.amount || 0;
  const adjudicationRate = totalPurchases > 0 ? (adjudicatedCount / totalPurchases) * 100 : 0;
  const dictamenRate = totalPurchases > 0 ? (dictamenCount / totalPurchases) * 100 : 0;
  const evaluacionCount = estatusMap['Evaluación']?.count || 0;
  const evaluacionAmount = estatusMap['Evaluación']?.amount || 0;
  const prescindidoCount = estatusMap['Prescindido']?.count || 0;
  const prescindidoAmount = estatusMap['Prescindido']?.amount || 0;
  const desiertoCount = estatusMap['Desierto']?.count || 0;
  const desiertoAmount = estatusMap['Desierto']?.amount || 0;
  const averageTicket = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

  // Top área
  const sortedAreas = Object.entries(areaMap).sort((a, b) => b[1].amount - a[1].amount);
  const topAreaName = sortedAreas[0]?.[0] || 'N/A';
  const topAreaAmount = sortedAreas[0]?.[1].amount || 0;
  const topAreaPercentage = totalAmount > 0 ? (topAreaAmount / totalAmount) * 100 : 0;

  // Modalidad predominante
  const sortedMod = Object.entries(modalidadMap).sort((a, b) => b[1].count - a[1].count);
  const modalidadPredominante = sortedMod[0]?.[0] || 'N/A';
  const modalidadPredominantePct = totalPurchases > 0 ? ((sortedMod[0]?.[1].count || 0) / totalPurchases) * 100 : 0;

  const kpis: ExecutiveDecisionKPIs = {
    totalPurchases,
    totalAmount,
    adjudicatedCount,
    adjudicatedAmount,
    adjudicationRate,
    dictamenCount,
    dictamenRate,
    evaluacionCount,
    evaluacionAmount,
    prescindidoCount,
    prescindidoAmount,
    desiertoCount,
    desiertoAmount,
    sinOfertasCount,
    averageTicket,
    topAreaName,
    topAreaAmount,
    topAreaPercentage,
    modalidadPredominante,
    modalidadPredominantePct,
    comprasDirectasCount: modalidadMap['Compra Directa']?.count || 0,
    comprasDirectasAmount: modalidadMap['Compra Directa']?.amount || 0,
    bajaCuantiaCount: modalidadMap['Baja Cuantía']?.count || 0,
    bajaCuantiaAmount: modalidadMap['Baja Cuantía']?.amount || 0,
    cotizacionCount: modalidadMap['Cotización']?.count || 0,
    cotizacionAmount: modalidadMap['Cotización']?.amount || 0,
    licitacionCount: modalidadMap['Licitación']?.count || 0,
    licitacionAmount: modalidadMap['Licitación']?.amount || 0,
  };

  // Preparar data para gráficas circulares
  const estatusColors: Record<string, string> = {
    'Adjudicación': '#2563EB', // Blue 600
    'Evaluación': '#D97706',   // Amber 600
    'Prescindido': '#E11D48',  // Rose 600
    'Desierto': '#64748B',     // Slate 500
  };

  const estatusChartData: ChartDataItem[] = Object.entries(estatusMap)
    .filter(([_, data]) => data.count > 0)
    .map(([name, data]) => ({
      name,
      value: data.count,
      amount: data.amount,
      color: estatusColors[name] || '#3B82F6',
      percentage: totalPurchases > 0 ? Math.round((data.count / totalPurchases) * 100) : 0,
    }));

  const modalidadColors: Record<string, string> = {
    'Baja Cuantía': '#059669',  // Emerald 600
    'Compra Directa': '#2563EB', // Blue 600
    'Cotización': '#D97706',     // Amber 600
    'Licitación': '#7C3AED',     // Purple 600
  };

  const modalidadChartData: ChartDataItem[] = Object.entries(modalidadMap)
    .filter(([_, data]) => data.count > 0)
    .map(([name, data]) => ({
      name,
      value: data.count,
      amount: data.amount,
      color: modalidadColors[name] || '#6366F1',
      percentage: totalPurchases > 0 ? Math.round((data.count / totalPurchases) * 100) : 0,
    }));

  const dictamenChartData: ChartDataItem[] = [
    {
      name: 'Con Dictamen Técnico GIT',
      value: dictamenCount,
      amount: dictamenAmount,
      color: '#059669', // Emerald
      percentage: totalPurchases > 0 ? Math.round((dictamenCount / totalPurchases) * 100) : 0,
    },
    {
      name: 'Pendiente / Sin Dictamen',
      value: sinDictamenCount,
      amount: sinDictamenAmount,
      color: '#DC2626', // Red
      percentage: totalPurchases > 0 ? Math.round((sinDictamenCount / totalPurchases) * 100) : 0,
    },
  ].filter(d => d.value > 0);

  const areaPalette = [
    '#0A0A69', // Navy OJ
    '#2563EB', // Blue 600
    '#0D9488', // Teal 600
    '#D97706', // Amber 600
    '#7C3AED', // Violet 600
    '#DB2777', // Rose 600
    '#059669', // Emerald 600
    '#EA580C', // Orange 600
    '#4F46E5', // Indigo 600
    '#0284C7', // Sky 600
    '#64748B', // Slate 500
  ];

  // Desglose de todas las áreas solicitantes reales (sin categorías artificiales como 'Otras Dependencias')
  const areaChartData: ChartDataItem[] = sortedAreas.map(([name, data], idx) => ({
    name,
    value: data.count,
    amount: data.amount,
    color: areaPalette[idx % areaPalette.length],
    percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
  }));

  // Hallazgos y recomendaciones para toma de decisiones
  const recommendations: Array<{ type: 'success' | 'warning' | 'info'; title: string; desc: string }> = [];

  if (dictamenRate < 80) {
    recommendations.push({
      type: 'warning',
      title: 'Cobertura de Dictamen Técnico GIT por Debajo del Umbral',
      desc: `Solo el ${dictamenRate.toFixed(1)}% (${dictamenCount} de ${totalPurchases}) de los eventos cuentan con dictamen técnico formal. Se recomienda priorizar la emisión de informes de idoneidad técnica previo a comprometer fondos.`,
    });
  } else {
    recommendations.push({
      type: 'success',
      title: 'Excelente Cobertura de Fiscalización Técnica',
      desc: `El ${dictamenRate.toFixed(1)}% de las adquisiciones cuentan con dictamen de la Gerencia de Informática, asegurando compatibilidad técnica institucional.`,
    });
  }

  if (adjudicationRate > 65) {
    recommendations.push({
      type: 'success',
      title: 'Alta Efectividad de Convocatoria y Adjudicación',
      desc: `Se ha concretado la adjudicación del ${adjudicationRate.toFixed(1)}% de los eventos (${formatQuetzales(adjudicatedAmount)} adjudicados), reflejando un proceso ágil con proveedores.`,
    });
  } else if (evaluacionCount > 0) {
    recommendations.push({
      type: 'info',
      title: 'Eventos Clave en Etapa de Evaluación de Ofertas',
      desc: `Existen ${evaluacionCount} eventos en fase de evaluación por un valor de ${formatQuetzales(evaluacionAmount)}. Se sugiere dar seguimiento oportuno a la junta receptora para evitar retrasos de adjudicación.`,
    });
  }

  const comprasDirectasPct = totalPurchases > 0 ? (kpis.comprasDirectasCount / totalPurchases) * 100 : 0;
  if (comprasDirectasPct > 50) {
    recommendations.push({
      type: 'info',
      title: 'Modalidad Predominante: Compra Directa Institucional',
      desc: `El ${comprasDirectasPct.toFixed(1)}% de las adquisiciones corresponden a Compra Directa (${formatQuetzales(kpis.comprasDirectasAmount)}) conforme al Art. 43 literal b) de la Ley de Contrataciones del Estado (hasta Q90,000.00 con NOG).`,
    });
  }

  return {
    kpis,
    estatusChartData,
    modalidadChartData,
    dictamenChartData,
    areaChartData,
    recommendations,
  };
}

/**
 * Dibuja un gráfico circular de dona en un contexto 2D de canvas a alta resolución
 */
function drawDonutChart(
  ctx: CanvasRenderingContext2D,
  data: ChartDataItem[],
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  centerTitle: string,
  centerSubtitle: string
) {
  const totalVal = data.reduce((acc, d) => acc + d.value, 0);
  if (totalVal === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;

  data.forEach((item) => {
    const sliceAngle = (item.value / totalVal) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = item.color;
    ctx.fill();

    // Borde blanco nítido
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    startAngle = endAngle;
  });

  // Centro hueco del Donut
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Texto central con tipografía ajustada automáticamente para que nunca desborde ni se corte
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  
  let fontSize = 36;
  if (centerTitle.length > 7) {
    fontSize = 26;
  }
  if (centerTitle.length > 11) {
    fontSize = 20;
  }
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.fillText(centerTitle, centerX, centerY - 8);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText(centerSubtitle.toUpperCase(), centerX, centerY + (fontSize > 25 ? 18 : 14));
}

/**
 * Dibuja la leyenda detallada y nítida al lado derecho del gráfico
 * con tipografía grande, nombres completos, porcentajes y montos en Quetzales de alto contraste.
 * Ajusta dinámicamente la escala para que cuando haya hasta 9 o más áreas, todas encajen con perfecta legibilidad.
 */
function drawSpaciousChartLegend(
  ctx: CanvasRenderingContext2D,
  data: ChartDataItem[],
  startX: number,
  startY: number,
  totalCount: number,
  maxAvailableWidth: number
) {
  let currentY = startY;
  const count = data.length;
  const isCompact = count > 5;
  const rowHeight = isCompact ? Math.max(34, Math.floor(365 / count)) : 52;
  const nameFontSize = count > 7 ? 17 : (isCompact ? 19 : 22);
  const badgeFontSize = count > 7 ? 14 : (isCompact ? 15 : 18);
  const amountFontSize = count > 7 ? 18 : (isCompact ? 20 : 24);
  const boxSize = isCompact ? 16 : 20;
  const badgeHeight = isCompact ? 24 : 28;

  data.forEach((item) => {
    const pct = totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0;

    // Caja de color
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(startX, currentY - boxSize / 2, boxSize, boxSize, 4);
    ctx.fill();

    // Nombre de la categoría ajustado con ancho máximo para evitar colisiones
    const maxNameWidth = 340;
    let displayName = item.name;
    ctx.font = `bold ${nameFontSize}px Helvetica, Arial, sans-serif`;
    if (ctx.measureText(displayName).width > maxNameWidth) {
      while (displayName.length > 4 && ctx.measureText(displayName + '…').width > maxNameWidth) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '…';
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(displayName, startX + boxSize + 10, currentY);

    // Badge de conteo y porcentaje
    const badgeX = startX + 370;
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(badgeX, currentY - badgeHeight / 2, 135, badgeHeight, 5);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = `bold ${badgeFontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${item.value} ev. (${pct}%)`, badgeX + 67, currentY);

    // Monto en Quetzales alineado a la derecha en negrita y tipografía nítida
    const amountX = startX + maxAvailableWidth - 10;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0A0A69';
    ctx.font = `bold ${amountFontSize}px Courier, monospace, sans-serif`;
    ctx.fillText(formatQuetzales(item.amount), amountX, currentY);

    // Línea separadora sutil
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, currentY + rowHeight / 2);
    ctx.lineTo(startX + maxAvailableWidth, currentY + rowHeight / 2);
    ctx.stroke();

    currentY += rowHeight;
  });
}

/**
 * Genera una imagen en formato Data URL con el panel ejecutivo de KPIs y los 4 gráficos circulares
 * distribuidos en una elegante cuadrícula 2x2 a ULTRA ALTA RESOLUCIÓN (3000 x 1680)
 * para garantizar máxima legibilidad y cero borrosidad en el PDF oficial.
 */
export function generateExecutiveDashboardImage(purchases: PurchaseRecord[]): string | null {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const width = 3000;
    const height = 1680;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo blanco limpio
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const { kpis, estatusChartData, modalidadChartData, dictamenChartData, areaChartData, recommendations } =
      calculateExecutiveKPIs(purchases);

    // ==========================================
    // 1. FILA DE 4 TARJETAS EJECUTIVAS DE KPIS
    // ==========================================
    const startX = 40;
    const cardY = 30;
    const cardHeight = 150;
    const cardGap = 30;
    const cardWidth = (width - (startX * 2) - (cardGap * 3)) / 4; // ~707px cada tarjeta

    const kpiCards = [
      {
        title: 'PRESUPUESTO TOTAL GESTIONADO',
        value: formatQuetzales(kpis.totalAmount),
        sub: `${kpis.totalPurchases} adquisiciones registradas`,
        borderColor: '#0A0A69',
        accentColor: '#0A0A69',
      },
      {
        title: 'EFECTIVIDAD EN ADJUDICACIÓN',
        value: `${kpis.adjudicationRate.toFixed(1)}%`,
        sub: `${kpis.adjudicatedCount} resueltas (${formatQuetzales(kpis.adjudicatedAmount)})`,
        borderColor: '#2563EB',
        accentColor: '#2563EB',
      },
      {
        title: 'COBERTURA DICTAMEN TÉCNICO GIT',
        value: `${kpis.dictamenRate.toFixed(1)}%`,
        sub: `${kpis.dictamenCount} con informe técnico favorable`,
        borderColor: '#059669',
        accentColor: '#059669',
      },
      {
        title: 'TICKET MEDIO / MODALIDAD',
        value: formatQuetzales(kpis.averageTicket),
        sub: `Predomina: ${kpis.modalidadPredominante}`,
        borderColor: '#D97706',
        accentColor: '#D97706',
      },
    ];

    kpiCards.forEach((card, idx) => {
      const cx = startX + idx * (cardWidth + cardGap);

      // Fondo tarjeta
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardWidth, cardHeight, 16);
      ctx.fill();

      // Borde suave
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Barra superior de acento institucional
      ctx.fillStyle = card.borderColor;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardWidth, 8, [16, 16, 0, 0]);
      ctx.fill();

      // Título del KPI
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.title, cx + 24, cardY + 42);

      // Valor Principal en Quetzales o Porcentaje (Grande y nítido)
      ctx.fillStyle = card.accentColor;
      ctx.font = 'bold 44px Helvetica, Arial, sans-serif';
      ctx.fillText(card.value, cx + 24, cardY + 92);

      // Subtítulo
      ctx.fillStyle = '#475569';
      ctx.font = 'normal 20px Helvetica, Arial, sans-serif';
      ctx.fillText(card.sub, cx + 24, cardY + 130);
    });

    // =========================================================================
    // 2. CUADRÍCULA 2 x 2 DE GRÁFICAS CIRCULARES (AMPLIA, NÍTIDA Y BIEN DISTRIBUIDA)
    // =========================================================================
    const chartsStartY = 210;
    const gridGapX = 35;
    const gridGapY = 30;
    const boxWidth = (width - (startX * 2) - gridGapX) / 2; // ~1442px de ancho cada caja
    const boxHeight = 490; // altura generosa

    const chartBoxes = [
      {
        title: '1. DISTRIBUCIÓN POR ESTATUS DEL EVENTO',
        subtitle: 'Adjudicados vs En Trámite / Prescindidos / Desiertos',
        data: estatusChartData,
        centerTitle: `${kpis.totalPurchases}`,
        centerSubtitle: 'Eventos',
        total: kpis.totalPurchases,
      },
      {
        title: '2. MODALIDADES DE COMPRA (LEY DE CONTRATACIONES)',
        subtitle: 'Distribución oficial según Ley de Contrataciones del Estado (LCE)',
        data: modalidadChartData,
        centerTitle: `${modalidadChartData.length}`,
        centerSubtitle: 'Modalidades',
        total: kpis.totalPurchases,
      },
      {
        title: '3. COBERTURA DE DICTÁMENES TÉCNICOS GIT',
        subtitle: 'Expedientes con Idoneidad Técnica Oficial Emitida',
        data: dictamenChartData,
        centerTitle: `${kpis.dictamenRate.toFixed(0)}%`,
        centerSubtitle: 'Cobertura',
        total: kpis.totalPurchases,
      },
      {
        title: '4. CONCENTRACIÓN DE INVERSIÓN POR ÁREA SOLICITANTE',
        subtitle: 'Distribución presupuestaria por dependencia de TI',
        data: areaChartData,
        centerTitle: formatQuetzales(kpis.totalAmount).split('.')[0],
        centerSubtitle: 'Total GTQ',
        total: areaChartData.reduce((acc, d) => acc + d.value, 0),
      },
    ];

    chartBoxes.forEach((box, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = startX + col * (boxWidth + gridGapX);
      const by = chartsStartY + row * (boxHeight + gridGapY);

      // Contenedor de la gráfica
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(bx, by, boxWidth, boxHeight, 16);
      ctx.fill();

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Encabezado de la caja
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(box.title, bx + 28, by + 42);

      ctx.fillStyle = '#64748B';
      ctx.font = 'normal 18px Helvetica, Arial, sans-serif';
      ctx.fillText(box.subtitle, bx + 28, by + 72);

      // Línea divisoria
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + 28, by + 88);
      ctx.lineTo(bx + boxWidth - 28, by + 88);
      ctx.stroke();

      // Dibuja el gráfico circular (Donut grande)
      const donutCenterX = bx + 200;
      const donutCenterY = by + 280;
      const outerR = 130;
      const innerR = 82;

      drawDonutChart(
        ctx,
        box.data,
        donutCenterX,
        donutCenterY,
        outerR,
        innerR,
        box.centerTitle,
        box.centerSubtitle
      );

      // Dibuja la leyenda detallada con amplio espacio a la derecha
      const legendStartX = bx + 370;
      const legendStartY = by + (box.data.length > 5 ? 100 : 130);
      const legendWidth = boxWidth - 400;

      drawSpaciousChartLegend(
        ctx,
        box.data,
        legendStartX,
        legendStartY,
        box.total,
        legendWidth
      );
    });

    // =========================================================================
    // 3. BLOQUE DE RECOMENDACIONES Y HALLAZGOS ESTRATÉGICOS DE DECISIÓN
    // =========================================================================
    const recY = chartsStartY + (boxHeight * 2) + gridGapY + 25;
    const recHeight = 220;
    const recWidth = width - startX * 2;

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(startX, recY, recWidth, recHeight, 16);
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cabecera institucional del panel de decisiones
    ctx.fillStyle = '#0A0A69';
    ctx.beginPath();
    ctx.roundRect(startX, recY, recWidth, 52, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HALLAZGOS Y RECOMENDACIONES ESTRATÉGICAS PARA TOMA DE DECISIONES DE COMPRA', startX + 28, recY + 34);

    // Items de recomendaciones
    const itemWidth = (recWidth - 60) / 3;
    recommendations.slice(0, 3).forEach((rec, rIdx) => {
      const rx = startX + 24 + rIdx * (itemWidth + 18);
      const ry = recY + 70;

      // Caja individual
      ctx.fillStyle = rec.type === 'warning' ? '#FFFBEB' : rec.type === 'success' ? '#F0FDF4' : '#EFF6FF';
      ctx.beginPath();
      ctx.roundRect(rx, ry, itemWidth, 130, 12);
      ctx.fill();

      ctx.strokeStyle = rec.type === 'warning' ? '#FDE68A' : rec.type === 'success' ? '#BBF7D0' : '#BFDBFE';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Título
      ctx.fillStyle = rec.type === 'warning' ? '#92400E' : rec.type === 'success' ? '#166534' : '#1E40AF';
      ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(rec.title, rx + 18, ry + 32);

      // Descripción con tipografía legible
      ctx.fillStyle = '#334155';
      ctx.font = 'normal 16px Helvetica, Arial, sans-serif';
      wrapCanvasText(ctx, rec.desc, rx + 18, ry + 62, itemWidth - 36, 22);
    });

    return canvas.toDataURL('image/png', 0.95);
  } catch (err) {
    console.error('Error generando canvas de gráficos circulares:', err);
    return null;
  }
}

/**
 * Función auxiliar para ajustar texto en múltiples líneas en Canvas 2D
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
