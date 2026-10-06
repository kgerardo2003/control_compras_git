import { JudicaturaRecord } from '../types';

export interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage?: number;
  subtext?: string;
}

export interface JudicaturasExecutiveKPIs {
  totalJudicaturas: number;
  penalCount: number;
  civilCount: number;
  amparosCount: number;
  programadosCount: number;
  reprogramadosCount: number;
  inauguradosCount: number;
  pendientesCount: number;
  trasladoCount: number;
  finalizadoCount: number;
  inauguradosRate: number;
  programadosRate: number;
  priorizadosCount: number;
  noPriorizadosCount: number;
  priorizadosRate: number;
  equip100Count: number;
  equip100Rate: number;
  equipParcialCount: number;
  sinEquiparCount: number;
  computoCount: number;
  audioCount: number;
  redCount: number;
  enlaceCount: number;
}

const getJudEstatus = (j: JudicaturaRecord): string =>
  j.estadoInauguracion || (j.fechaInauguracion ? 'Programado' : 'Pendiente Fecha');

/**
 * Calcula todas las métricas ejecutivas para las tarjetas y gráficos circulares de judicaturas
 */
export function calculateJudicaturasKPIs(judicaturas: JudicaturaRecord[]): {
  kpis: JudicaturasExecutiveKPIs;
  estatusChartData: ChartDataItem[];
  ramoChartData: ChartDataItem[];
  coberturaTicChartData: ChartDataItem[];
  componentesTicChartData: ChartDataItem[];
  priorizadoChartData: ChartDataItem[];
} {
  const total = judicaturas.length;

  let penalCount = 0;
  let civilCount = 0;
  let amparosCount = 0;

  let programadosCount = 0;
  let reprogramadosCount = 0;
  let inauguradosCount = 0;
  let pendientesCount = 0;
  let trasladoCount = 0;
  let finalizadoCount = 0;

  let priorizadosCount = 0;
  let noPriorizadosCount = 0;

  let equip100Count = 0;
  let equipParcialCount = 0;
  let sinEquiparCount = 0;

  let computoCount = 0;
  let audioCount = 0;
  let redCount = 0;
  let enlaceCount = 0;

  judicaturas.forEach((j) => {
    // Ramo
    if (j.tipoRamo === 'Penal') penalCount++;
    else if (j.tipoRamo === 'Civil') civilCount++;
    else if (j.tipoRamo === 'Amparos') amparosCount++;

    // Estatus
    const st = getJudEstatus(j).trim().toLowerCase();
    if (st === 'programado') programadosCount++;
    else if (st === 'reprogramado') reprogramadosCount++;
    else if (st === 'inaugurado') inauguradosCount++;
    else if (st === 'traslado') trasladoCount++;
    else if (st === 'finalizado') finalizadoCount++;
    else pendientesCount++;

    // Priorizado
    if (j.priorizado === 'Si') {
      priorizadosCount++;
    } else {
      noPriorizadosCount++;
    }

    // TIC
    const c = j.equipoComputo === 'Si' ? 1 : 0;
    const a = j.equipoAudio === 'Si' ? 1 : 0;
    const r = j.cableadoEstructurado === 'Si' ? 1 : 0;
    const e = j.enlaceDatos === 'Si' ? 1 : 0;
    const ticTotal = c + a + r + e;

    if (c) computoCount++;
    if (a) audioCount++;
    if (r) redCount++;
    if (e) enlaceCount++;

    if (ticTotal === 4) equip100Count++;
    else if (ticTotal > 0) equipParcialCount++;
    else sinEquiparCount++;
  });

  const equip100Rate = total > 0 ? Math.round((equip100Count / total) * 100) : 0;
  const inauguradosRate = total > 0 ? Math.round((inauguradosCount / total) * 100) : 0;
  const programadosRate = total > 0 ? Math.round((programadosCount / total) * 100) : 0;
  const priorizadosRate = total > 0 ? Math.round((priorizadosCount / total) * 100) : 0;

  const kpis: JudicaturasExecutiveKPIs = {
    totalJudicaturas: total,
    penalCount,
    civilCount,
    amparosCount,
    programadosCount,
    reprogramadosCount,
    inauguradosCount,
    pendientesCount,
    trasladoCount,
    finalizadoCount,
    inauguradosRate,
    programadosRate,
    priorizadosCount,
    noPriorizadosCount,
    priorizadosRate,
    equip100Count,
    equip100Rate,
    equipParcialCount,
    sinEquiparCount,
    computoCount,
    audioCount,
    redCount,
    enlaceCount,
  };

  // 1. Gráfico Circular: Distribución por Estado de Apertura
  const estatusChartData: ChartDataItem[] = [
    { name: 'Programado', value: programadosCount, color: '#0284C7', percentage: total > 0 ? Math.round((programadosCount / total) * 100) : 0 },
    { name: 'Reprogramado', value: reprogramadosCount, color: '#DC2626', percentage: total > 0 ? Math.round((reprogramadosCount / total) * 100) : 0 },
    { name: 'Inaugurado', value: inauguradosCount, color: '#059669', percentage: total > 0 ? Math.round((inauguradosCount / total) * 100) : 0 },
    { name: 'Pendiente Fecha', value: pendientesCount, color: '#D97706', percentage: total > 0 ? Math.round((pendientesCount / total) * 100) : 0 },
    { name: 'Traslado', value: trasladoCount, color: '#7C3AED', percentage: total > 0 ? Math.round((trasladoCount / total) * 100) : 0 },
    { name: 'Finalizado', value: finalizadoCount, color: '#2563EB', percentage: total > 0 ? Math.round((finalizadoCount / total) * 100) : 0 },
  ].filter(d => d.value > 0);

  // 2. Gráfico Circular: Distribución por Cámara Jurisdiccional
  const ramoChartData: ChartDataItem[] = [
    { name: 'Cámara Penal', value: penalCount, color: '#6D28D9', percentage: total > 0 ? Math.round((penalCount / total) * 100) : 0 },
    { name: 'Cámara Civil', value: civilCount, color: '#1D4ED8', percentage: total > 0 ? Math.round((civilCount / total) * 100) : 0 },
    { name: 'Cámara Amparos', value: amparosCount, color: '#059669', percentage: total > 0 ? Math.round((amparosCount / total) * 100) : 0 },
  ].filter(d => d.value > 0);

  // 3. Gráfico Circular: Cobertura Tecnológica TIC
  const coberturaTicChartData: ChartDataItem[] = [
    { name: '100% Equipadas (4/4)', value: equip100Count, color: '#059669', percentage: equip100Rate },
    { name: 'Parcial (1-3 Componentes)', value: equipParcialCount, color: '#D97706', percentage: total > 0 ? Math.round((equipParcialCount / total) * 100) : 0 },
    { name: 'Sin Equipamiento (0)', value: sinEquiparCount, color: '#64748B', percentage: total > 0 ? Math.round((sinEquiparCount / total) * 100) : 0 },
  ].filter(d => d.value > 0);

  // 4. Gráfico Circular: Componentes TIC Instalados
  const totalInstalados = computoCount + audioCount + redCount + enlaceCount;
  const componentesTicChartData: ChartDataItem[] = [
    { name: 'Equipo de Cómputo (PC)', value: computoCount, color: '#2563EB', percentage: total > 0 ? Math.round((computoCount / total) * 100) : 0, subtext: `${computoCount}/${total} sedes` },
    { name: 'Equipo de Audio de Sala', value: audioCount, color: '#7C3AED', percentage: total > 0 ? Math.round((audioCount / total) * 100) : 0, subtext: `${audioCount}/${total} sedes` },
    { name: 'Cableado Estructurado Red', value: redCount, color: '#059669', percentage: total > 0 ? Math.round((redCount / total) * 100) : 0, subtext: `${redCount}/${total} sedes` },
    { name: 'Enlace de Datos / Telecom.', value: enlaceCount, color: '#0284C7', percentage: total > 0 ? Math.round((enlaceCount / total) * 100) : 0, subtext: `${enlaceCount}/${total} sedes` },
  ].filter(d => d.value > 0);

  // 5. Gráfico Circular: Distribución por Priorización Estratégica
  const priorizadoChartData: ChartDataItem[] = [
    { name: 'Priorizadas (Sí)', value: priorizadosCount, color: '#D97706', percentage: priorizadosRate, subtext: `${priorizadosCount}/${total} sedes` },
    { name: 'Ordinarias (No)', value: noPriorizadosCount, color: '#64748B', percentage: total > 0 ? Math.round((noPriorizadosCount / total) * 100) : 0, subtext: `${noPriorizadosCount}/${total} sedes` },
  ].filter(d => d.value > 0);

  return {
    kpis,
    estatusChartData,
    ramoChartData,
    coberturaTicChartData,
    componentesTicChartData,
    priorizadoChartData,
  };
}

/**
 * Dibuja un gráfico circular tipo Donut en un Canvas 2D
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

  // Centro blanco hueco del Donut
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Texto central
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';

  let fontSize = 34;
  if (centerTitle.length > 7) fontSize = 26;
  if (centerTitle.length > 11) fontSize = 20;

  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.fillText(centerTitle, centerX, centerY - 8);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText(centerSubtitle.toUpperCase(), centerX, centerY + (fontSize > 25 ? 18 : 14));
}

/**
 * Dibuja la leyenda detallada y nítida al lado derecho del gráfico circular
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
  const rowHeight = 48;

  data.forEach((item) => {
    const pct = item.percentage !== undefined ? item.percentage : (totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0);

    // Caja de color (20 x 20)
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(startX, currentY - 10, 20, 20, 5);
    ctx.fill();

    // Nombre de la categoría
    const maxNameWidth = 320;
    let displayName = item.name;
    ctx.font = 'bold 21px Helvetica, Arial, sans-serif';
    if (ctx.measureText(displayName).width > maxNameWidth) {
      while (displayName.length > 4 && ctx.measureText(displayName + '…').width > maxNameWidth) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '…';
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(displayName, startX + 30, currentY);

    // Badge de conteo y porcentaje
    const badgeX = startX + 360;
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(badgeX, currentY - 14, 150, 28, 6);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.value} sedes (${pct}%)`, badgeX + 75, currentY);

    // Subtexto opcional a la derecha
    if (item.subtext) {
      const subX = startX + maxAvailableWidth - 10;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0A0A69';
      ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
      ctx.fillText(item.subtext, subX, currentY);
    }

    // Línea separadora sutil
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, currentY + 20);
    ctx.lineTo(startX + maxAvailableWidth, currentY + 20);
    ctx.stroke();

    currentY += rowHeight;
  });
}

/**
 * Genera una imagen Data URL a 300 DPI (3000 x 1680) con el panel ejecutivo de 4 KPIs y 4 Gráficos Circulares
 */
export function generateJudicaturasExecutiveDashboardImage(judicaturas: JudicaturaRecord[]): string | null {
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

    const { kpis, estatusChartData, ramoChartData, coberturaTicChartData, componentesTicChartData, priorizadoChartData } =
      calculateJudicaturasKPIs(judicaturas);

    // ==========================================
    // 1. FILA DE 5 TARJETAS EJECUTIVAS DE KPIS
    // ==========================================
    const startX = 40;
    const cardY = 30;
    const cardHeight = 150;
    const cardGap = 20;
    const cardWidth = (width - (startX * 2) - (cardGap * 4)) / 5; // ~568px

    const kpiCards = [
      {
        title: 'TOTAL JUDICATURAS EN SEGUIMIENTO',
        value: `${kpis.totalJudicaturas} Sedes`,
        sub: `Penal: ${kpis.penalCount} • Civil: ${kpis.civilCount} • Amparos: ${kpis.amparosCount}`,
        borderColor: '#0A0A69',
        accentColor: '#0A0A69',
      },
      {
        title: 'JUDICATURAS PRIORIZADAS (ALTA PRIORIDAD)',
        value: `${kpis.priorizadosCount} (${kpis.priorizadosRate}%)`,
        sub: `${kpis.priorizadosCount} sedes priorizadas de ${kpis.totalJudicaturas}`,
        borderColor: '#D97706',
        accentColor: '#D97706',
      },
      {
        title: 'CUMPLIMIENTO GLOBAL TIC (100%)',
        value: `${kpis.equip100Rate}%`,
        sub: `${kpis.equip100Count} de ${kpis.totalJudicaturas} sedes con los 4 componentes`,
        borderColor: '#059669',
        accentColor: '#059669',
      },
      {
        title: 'AVANCE DE APERTURA / INAUGURACIÓN',
        value: `${kpis.inauguradosRate + kpis.programadosRate}%`,
        sub: `${kpis.inauguradosCount} inauguradas • ${kpis.programadosCount} programadas con fecha`,
        borderColor: '#0284C7',
        accentColor: '#0284C7',
      },
      {
        title: 'PENDIENTES Y REPROGRAMACIONES',
        value: `${kpis.pendientesCount + kpis.reprogramadosCount + kpis.trasladoCount}`,
        sub: `${kpis.pendientesCount} fecha pendiente • ${kpis.reprogramadosCount} reprog.`,
        borderColor: '#DC2626',
        accentColor: '#DC2626',
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
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Barra superior de acento institucional
      ctx.fillStyle = card.borderColor;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardWidth, 8, [16, 16, 0, 0]);
      ctx.fill();

      // Título del KPI
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 17px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.title, cx + 20, cardY + 42);

      // Valor Principal
      ctx.fillStyle = card.accentColor;
      ctx.font = 'bold 40px Helvetica, Arial, sans-serif';
      ctx.fillText(card.value, cx + 20, cardY + 92);

      // Subtítulo
      ctx.fillStyle = '#475569';
      ctx.font = 'normal 17px Helvetica, Arial, sans-serif';
      ctx.fillText(card.sub, cx + 20, cardY + 130);
    });

    // =========================================================================
    // 2. CUADRÍCULA 2 x 2 DE GRÁFICAS CIRCULARES
    // =========================================================================
    const gridY = cardY + cardHeight + 25; // Y = 205
    const gridHeight = 1260;
    const rowHeight = (gridHeight - 30) / 2; // ~615px
    const colWidth = (width - (startX * 2) - 30) / 2; // ~1445px

    const chartSections = [
      {
        title: 'DISTRIBUCIÓN POR ESTADO DE INAUGURACIÓN',
        subtitle: 'Proporción y volumen por fase operativa del proceso de apertura',
        data: estatusChartData,
        centerTitle: `${kpis.totalJudicaturas}`,
        centerSub: 'SEDES',
        col: 0,
        row: 0,
        badgeColor: '#0A0A69',
      },
      {
        title: 'DISTRIBUCIÓN POR CÁMARA JURISDICCIONAL',
        subtitle: 'Distribución institucional entre Cámara Penal, Civil y Amparos',
        data: ramoChartData,
        centerTitle: '3',
        centerSub: 'CÁMARAS',
        col: 1,
        row: 0,
        badgeColor: '#6D28D9',
      },
      {
        title: 'NIVEL DE COBERTURA TECNOLÓGICA TIC',
        subtitle: 'Sedes con equipamiento completo (100%), parcial o sin equipar',
        data: coberturaTicChartData,
        centerTitle: `${kpis.equip100Rate}%`,
        centerSub: 'LISTAS 100%',
        col: 0,
        row: 1,
        badgeColor: '#059669',
      },
      {
        title: 'PRIORIZACIÓN INSTITUCIONAL DE SEDES',
        subtitle: 'Proporción de judicaturas con Alta Prioridad OJ (Sí) vs Ordinarias (No)',
        data: priorizadoChartData,
        centerTitle: `${kpis.priorizadosRate}%`,
        centerSub: 'PRIORIZADAS',
        col: 1,
        row: 1,
        badgeColor: '#D97706',
      },
    ];

    chartSections.forEach((sec) => {
      const secX = startX + sec.col * (colWidth + 30);
      const secY = gridY + sec.row * (rowHeight + 30);

      // Caja exterior del gráfico
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(secX, secY, colWidth, rowHeight, 18);
      ctx.fill();

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Cabecera de la sección
      ctx.fillStyle = sec.badgeColor;
      ctx.beginPath();
      ctx.roundRect(secX, secY, colWidth, 6, [18, 18, 0, 0]);
      ctx.fill();

      // Título
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sec.title, secX + 28, secY + 44);

      // Subtítulo descriptivo
      ctx.fillStyle = '#64748B';
      ctx.font = 'normal 17px Helvetica, Arial, sans-serif';
      ctx.fillText(sec.subtitle, secX + 28, secY + 74);

      // Línea divisoria bajo el encabezado
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(secX + 24, secY + 92);
      ctx.lineTo(secX + colWidth - 24, secY + 92);
      ctx.stroke();

      // Gráfica de Dona
      const donutCenterX = secX + 220;
      const donutCenterY = secY + 96 + ((rowHeight - 96) / 2);
      const outerRadius = 185;
      const innerRadius = 110;

      drawDonutChart(
        ctx,
        sec.data,
        donutCenterX,
        donutCenterY,
        outerRadius,
        innerRadius,
        sec.centerTitle,
        sec.centerSub
      );

      // Leyenda espaciosa a la derecha
      const legendStartX = secX + 460;
      const legendStartY = secY + 130;
      const legendWidth = colWidth - 480;

      drawSpaciousChartLegend(
        ctx,
        sec.data,
        legendStartX,
        legendStartY,
        kpis.totalJudicaturas,
        legendWidth
      );
    });

    // =========================================================================
    // 3. FRANJA INFERIOR DE DIAGNÓSTICO INSTITUCIONAL Y ALERTAS TÉCNICAS
    // =========================================================================
    const bannerY = gridY + gridHeight + 20; // Y = 1485
    const bannerHeight = 145;

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(startX, bannerY, width - (startX * 2), bannerHeight, 14);
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Borde vertical de acento
    ctx.fillStyle = '#0A0A69';
    ctx.beginPath();
    ctx.roundRect(startX, bannerY, 12, bannerHeight, [14, 0, 0, 14]);
    ctx.fill();

    // Título del banner
    ctx.fillStyle = '#0A0A69';
    ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DIAGNÓSTICO EJECUTIVO Y RECOMENDACIONES TÉCNICAS DE INFRAESTRUCTURA TIC', startX + 32, bannerY + 38);

    // Texto de diagnóstico
    ctx.fillStyle = '#334155';
    ctx.font = 'normal 19px Helvetica, Arial, sans-serif';
    const diagLine1 = `• Cobertura Integral TIC: De ${kpis.totalJudicaturas} judicaturas registradas, ${kpis.equip100Count} sedes (${kpis.equip100Rate}%) cuentan con la totalidad de los 4 componentes (Cómputo, Audio, Red y Enlace).`;
    const diagLine2 = `• Estatus de Apertura y Priorización: ${kpis.inauguradosCount} judicaturas inauguradas (${kpis.inauguradosRate}%), ${kpis.programadosCount} programadas con fecha (${kpis.programadosRate}%) y ${kpis.priorizadosCount} sedes PRIORIZADAS (${kpis.priorizadosRate}%) de alta prioridad institucional.`;
    const diagLine3 = `• Prioridad de Gestión Técnica: Se recomienda agilizar los trabajos de telecomunicaciones y cableado en las ${kpis.equipParcialCount + kpis.sinEquiparCount} sedes con adecuación parcial para cumplir el calendario oficial.`;

    ctx.fillText(diagLine1, startX + 32, bannerY + 70);
    ctx.fillText(diagLine2, startX + 32, bannerY + 98);
    ctx.fillText(diagLine3, startX + 32, bannerY + 126);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generando dashboard ejecutivo de judicaturas en canvas:', err);
    return null;
  }
}

/**
 * Genera una gráfica circular (gauge / donut) a 300 DPI para la Ficha Técnica Individual
 */
export function generateIndividualJudicaturaGaugeImage(judicatura: JudicaturaRecord): string | null {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const width = 2400;
    const height = 650;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const c = judicatura.equipoComputo === 'Si' ? 1 : 0;
    const a = judicatura.equipoAudio === 'Si' ? 1 : 0;
    const r = judicatura.cableadoEstructurado === 'Si' ? 1 : 0;
    const e = judicatura.enlaceDatos === 'Si' ? 1 : 0;
    const readyCount = c + a + r + e;
    const pct = Math.round((readyCount / 4) * 100);

    // Fondo del panel
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, height - 40, 16);
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cintilla superior
    ctx.fillStyle = '#0A0A69';
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, 8, [16, 16, 0, 0]);
    ctx.fill();

    // 1. Gráfica circular a la izquierda
    const centerX = 320;
    const centerY = height / 2;
    const outerRadius = 200;
    const innerRadius = 130;

    const slices: ChartDataItem[] = [
      { name: 'Completado', value: readyCount, color: pct === 100 ? '#059669' : '#0284C7' },
      { name: 'Pendiente', value: 4 - readyCount, color: '#E2E8F0' },
    ];

    drawDonutChart(
      ctx,
      slices,
      centerX,
      centerY,
      outerRadius,
      innerRadius,
      `${pct}%`,
      'COBERTURA TIC'
    );

    // 2. Indicadores en 5 tarjetas compactas a la derecha
    const startX = 640;
    const cardGap = 20;
    const cardWidth = (width - startX - 40 - (cardGap * 4)) / 5; // ~328px
    const cardHeight = 220;
    const cardY = (height - cardHeight) / 2;

    const isPriorizado = judicatura.priorizado === 'Si';

    const components = [
      {
        name: 'EQUIPO CÓMPUTO',
        ready: c === 1,
        statusText: c === 1 ? 'COMPLETADO' : 'PENDIENTE',
        desc: c === 1 ? 'Instalado y operativo' : 'Pendiente de entrega',
        activeColor: '#059669',
      },
      {
        name: 'AUDIO DE SALA',
        ready: a === 1,
        statusText: a === 1 ? 'COMPLETADO' : 'PENDIENTE',
        desc: a === 1 ? 'Instalado y calibrado' : 'Pendiente instalación',
        activeColor: '#059669',
      },
      {
        name: 'CABLEADO RED',
        ready: r === 1,
        statusText: r === 1 ? 'COMPLETADO' : 'PENDIENTE',
        desc: r === 1 ? 'Certificado y probado' : 'Pendiente de tendido',
        activeColor: '#059669',
      },
      {
        name: 'ENLACE DE DATOS',
        ready: e === 1,
        statusText: e === 1 ? 'COMPLETADO' : 'PENDIENTE',
        desc: e === 1 ? 'Conectado a red OJ' : 'Sin enlace activo',
        activeColor: '#059669',
      },
      {
        name: 'PRIORIZACIÓN',
        ready: isPriorizado,
        statusText: isPriorizado ? 'PRIORIZADO' : 'ORDINARIO',
        desc: isPriorizado ? 'Alta prioridad OJ' : 'Trámite estándar',
        activeColor: '#D97706',
      },
    ];

    components.forEach((comp, idx) => {
      const cx = startX + idx * (cardWidth + cardGap);

      ctx.fillStyle = comp.ready ? '#F0FDF4' : '#FFFBEB';
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardWidth, cardHeight, 12);
      ctx.fill();

      ctx.strokeStyle = comp.ready ? '#86EFAC' : '#FDE68A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Barra superior
      ctx.fillStyle = comp.ready ? comp.activeColor : '#94A3B8';
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardWidth, 6, [12, 12, 0, 0]);
      ctx.fill();

      // Título
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(comp.name, cx + 16, cardY + 45);

      // Estado
      ctx.fillStyle = comp.ready ? comp.activeColor : '#64748B';
      ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
      ctx.fillText(comp.statusText, cx + 16, cardY + 115);

      // Descripción
      ctx.fillStyle = '#64748B';
      ctx.font = 'normal 16px Helvetica, Arial, sans-serif';
      ctx.fillText(comp.desc, cx + 16, cardY + 170);
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generando gauge de judicatura individual:', err);
    return null;
  }
}
