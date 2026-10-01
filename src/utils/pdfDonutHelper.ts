import jsPDF from 'jspdf';

export interface PdfDonutSlice {
  label: string;
  value: number;
  color: [number, number, number];
}

/**
 * Dibuja una tarjeta con gráfica de dona circular vectorial (Pie / Donut Chart),
 * valor central, porcentaje y leyenda detallada directamente en el documento jsPDF.
 */
export function drawPdfDonutCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  slices: PdfDonutSlice[],
  centerText: string,
  centerSub?: string
): void {
  // Fondo de la tarjeta con borde sutil
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');

  // Cintilla superior de la tarjeta (azul oscuro)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(x, y, width, 4.5, 2, 2, 'F');
  // Rectángulo inferior para que las esquinas de abajo de la cintilla sean rectas
  doc.rect(x, y + 2.5, width, 2, 'F');

  // Título de la gráfica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), x + 3.5, y + 3.3);

  const total = slices.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const cx = x + 16.5;
  const cy = y + 4.5 + ((height - 4.5) / 2);
  const radius = 8;
  const innerRadius = 4.2;

  if (total > 0) {
    let currentAngle = -Math.PI / 2;
    const steps = 120;

    slices.forEach(slice => {
      const val = Number(slice.value) || 0;
      if (val <= 0) return;
      const sliceAngle = (val / total) * 2 * Math.PI;
      const sliceSteps = Math.max(1, Math.round((val / total) * steps));
      const stepAngle = sliceAngle / sliceSteps;

      doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);

      for (let i = 0; i < sliceSteps; i++) {
        const a1 = currentAngle + i * stepAngle;
        const a2 = currentAngle + (i + 1) * stepAngle;

        const x1 = cx + radius * Math.cos(a1);
        const y1 = cy + radius * Math.sin(a1);
        const x2 = cx + radius * Math.cos(a2);
        const y2 = cy + radius * Math.sin(a2);

        doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
      }

      currentAngle += sliceAngle;
    });

    // Corte interior para convertir en gráfica de dona
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');

    // Texto central en el interior de la dona
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    doc.text(centerText, cx, cy + (centerSub ? -0.4 : 0.8), { align: 'center' });
    if (centerSub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(100, 116, 139);
      doc.text(centerSub, cx, cy + 2.2, { align: 'center' });
    }

    // Leyenda y valores al lado derecho de la dona
    let legendY = y + 7.5;
    const legendX = cx + radius + 4;
    const maxItems = Math.min(slices.length, 4);

    for (let i = 0; i < maxItems; i++) {
      const slice = slices[i];
      const val = Number(slice.value) || 0;
      if (val <= 0 && slices.length > 2) continue;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;

      // Círculo del color
      doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
      doc.circle(legendX + 1, legendY - 0.7, 1.1, 'F');

      // Etiqueta
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(51, 65, 85);
      const cleanLabel = slice.label.length > 17 ? slice.label.slice(0, 16) + '..' : slice.label;
      doc.text(cleanLabel, legendX + 3.2, legendY);

      // Porcentaje alineado a la derecha
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${pct}%`, x + width - 3, legendY, { align: 'right' });

      legendY += 3.8;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Sin datos registrados', cx, cy, { align: 'center' });
  }
}
