/**
 * Formateador de moneda en Quetzales de Guatemala (GTQ)
 */
export function formatQuetzales(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'Q. 0.00';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric).replace('GTQ', 'Q.').trim();
}

/**
 * Formateador de fechas a formato local de Guatemala (DD/MM/YYYY)
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    // Evitar desfase de zona horaria si solo viene YYYY-MM-DD
    if (dateString.length === 10 && dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formateador de fecha y hora completa para auditoría
 */
export function formatDateTime(dateTimeString: string | undefined | null): string {
  if (!dateTimeString) return '—';
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateTimeString;
  }
}

/**
 * Exportar arreglo de objetos a CSV
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    '\uFEFF' + // UTF-8 BOM para Excel
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
