import * as XLSX from 'xlsx';
import { JudicaturaRecord } from '../types';
import {
  getJudicaturaComputoInfo,
  getJudicaturaAudioInfo,
  getJudicaturaRedInfo,
  getJudicaturaEnlaceInfo
} from './judicaturaComponentUtils';

/**
 * Normaliza las filas de judicaturas para exportación limpia a Excel
 */
export const prepareJudicaturasForExport = (records: JudicaturaRecord[]) => {
  return records.map((j, idx) => {
    const computo = getJudicaturaComputoInfo(j);
    const audio = getJudicaturaAudioInfo(j);
    const red = getJudicaturaRedInfo(j);
    const enlace = getJudicaturaEnlaceInfo(j);

    return {
      'No.': idx + 1,
      'ID': j.id,
      'Nombre de la Judicatura': j.nombreJudicatura,
      'Cámara / Ramo': j.tipoRamo,
      'Fecha Inicio Adecuaciones': j.fechaInicioAdecuaciones,
      'Fecha Fin Adecuaciones': j.fechaFinAdecuaciones,
      'Cómputo (Se cuenta con equipo)': j.equipoComputo,
      'Estatus Cómputo': computo.status,
      'Cómputo Instalado': computo.instalado,
      'Audio (Se cuenta con equipo)': j.equipoAudio,
      'Estatus Audio': audio.status,
      'Audio Instalado': audio.instalado,
      'Red (Se cuenta con red)': j.cableadoEstructurado,
      'Estatus Red': red.status,
      'Red Instalada': red.instalado,
      'Enlace (Se cuenta con enlace)': j.enlaceDatos,
      'Estatus Enlace': enlace.status,
      'Enlace Instalado': enlace.instalado,
      'Fecha de Inauguración': j.fechaInauguracion || '',
      'Estatus de Inauguración': j.estadoInauguracion || 'Pendiente Fecha',
      'Priorizado': j.priorizado === 'Si' ? 'Si' : 'No',
      'Observaciones': (j.observaciones || []).map(o => `[${o.autor || 'GIT'}]: ${o.texto}`).join(' ; ') || '',
      'Creado Por': j.creadoPor || 'Sistema GIT',
      'Fecha Creación': j.fechaCreacion ? j.fechaCreacion.slice(0, 10) : ''
    };
  });
};

/**
 * Exporta registros de judicaturas a un archivo Excel (.xlsx) con anchos de columnas adaptados
 */
export const exportJudicaturasToExcel = (records: JudicaturaRecord[], fileName?: string) => {
  const exportData = prepareJudicaturasForExport(records);
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Configurar anchos óptimos para cada columna
  const colWidths = [
    { wch: 6 },  // No.
    { wch: 24 }, // ID
    { wch: 45 }, // Nombre
    { wch: 18 }, // Cámara
    { wch: 18 }, // Fecha Inicio
    { wch: 18 }, // Fecha Fin
    { wch: 18 }, // Computo
    { wch: 22 }, // Estatus Cómputo
    { wch: 16 }, // Cómputo Instalado
    { wch: 18 }, // Audio
    { wch: 22 }, // Estatus Audio
    { wch: 16 }, // Audio Instalado
    { wch: 18 }, // Red
    { wch: 20 }, // Estatus Red
    { wch: 16 }, // Red Instalada
    { wch: 18 }, // Enlace
    { wch: 24 }, // Estatus Enlace
    { wch: 16 }, // Enlace Instalado
    { wch: 20 }, // Fecha Inauguración
    { wch: 22 }, // Estatus
    { wch: 14 }, // Priorizado
    { wch: 55 }, // Observaciones
    { wch: 26 }, // Creado Por
    { wch: 16 }, // Fecha Creación
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Judicaturas_OJ');

  const today = new Date().toISOString().slice(0, 10);
  const finalName = fileName ? `${fileName}.xlsx` : `Judicaturas_OJ_GIT_${today}.xlsx`;

  XLSX.writeFile(workbook, finalName);
};

/**
 * Exporta registros de judicaturas a formato CSV con codificación UTF-8
 */
export const exportJudicaturasToCSV = (records: JudicaturaRecord[], fileName?: string) => {
  const exportData = prepareJudicaturasForExport(records);
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  // Prepend UTF-8 BOM so Excel opens accents correctly
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = fileName ? `${fileName}.csv` : `Judicaturas_OJ_GIT_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Descarga una plantilla de importación oficial con ejemplos y explicaciones
 */
export const downloadJudicaturasImportTemplate = () => {
  const templateRows = [
    {
      'ID': '',
      'Nombre de la Judicatura': 'Juzgado de Primera Instancia Penal de Turno de Mixco',
      'Cámara / Ramo': 'Penal',
      'Fecha Inicio Adecuaciones': '2026-03-01',
      'Fecha Fin Adecuaciones': '2026-03-25',
      'Equipo de Cómputo': 'Si',
      'Estatus Cómputo': 'Instalado',
      'Cómputo Instalado': 'Si',
      'Equipo de Audio': 'Si',
      'Estatus Audio': 'Instalado',
      'Audio Instalado': 'Si',
      'Cableado Estructurado': 'Si',
      'Estatus Red': 'Terminado',
      'Red Instalada': 'Si',
      'Enlace de Datos': 'Si',
      'Estatus Enlace': 'Instalado',
      'Enlace Instalado': 'Si',
      'Fecha de Inauguración': '2026-04-10',
      'Estatus de Inauguración': 'Pendiente Fecha',
      'Priorizado': 'Si',
      'Observaciones': 'Adecuación de cableado categoría 6A y sistema de grabación de audio.'
    },
    {
      'ID': '',
      'Nombre de la Judicatura': 'Juzgado de Paz Civil y Familia de Villa Nueva',
      'Cámara / Ramo': 'Civil',
      'Fecha Inicio Adecuaciones': '2026-03-10',
      'Fecha Fin Adecuaciones': '2026-04-05',
      'Equipo de Cómputo': 'Si',
      'Estatus Cómputo': 'Se cuenta con equipo',
      'Cómputo Instalado': 'No',
      'Equipo de Audio': 'No',
      'Estatus Audio': 'Solicitado F56',
      'Audio Instalado': 'No',
      'Cableado Estructurado': 'Si',
      'Estatus Red': 'Terminado',
      'Red Instalada': 'Si',
      'Enlace de Datos': 'No',
      'Estatus Enlace': 'Solicitado',
      'Enlace Instalado': 'No',
      'Fecha de Inauguración': '',
      'Estatus de Inauguración': 'Reprogramado',
      'Priorizado': 'No',
      'Observaciones': 'Se cuenta con equipo de cómputo en bodega, pendiente de instalación en sede judicial.'
    },
    {
      'ID': '',
      'Nombre de la Judicatura': 'Sala Primera del Tribunal de Amparos y Antejuicios',
      'Cámara / Ramo': 'Amparos',
      'Fecha Inicio Adecuaciones': '2026-02-15',
      'Fecha Fin Adecuaciones': '2026-03-15',
      'Equipo de Cómputo': 'Si',
      'Estatus Cómputo': 'Instalado',
      'Cómputo Instalado': 'Si',
      'Equipo de Audio': 'Si',
      'Estatus Audio': 'Instalado',
      'Audio Instalado': 'Si',
      'Cableado Estructurado': 'Si',
      'Estatus Red': 'Terminado',
      'Red Instalada': 'Si',
      'Enlace de Datos': 'Si',
      'Estatus Enlace': 'Instalado',
      'Enlace Instalado': 'Si',
      'Fecha de Inauguración': '2026-03-20',
      'Estatus de Inauguración': 'Inaugurado',
      'Priorizado': 'Si',
      'Observaciones': 'Sede equipada al 100% con enlace de fibra óptica dedicado.'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);

  worksheet['!cols'] = [
    { wch: 15 }, // ID
    { wch: 45 }, // Nombre
    { wch: 18 }, // Cámara
    { wch: 18 }, // Inicio
    { wch: 18 }, // Fin
    { wch: 18 }, // Cómputo
    { wch: 16 }, // Audio
    { wch: 22 }, // Cableado
    { wch: 18 }, // Enlace
    { wch: 20 }, // Inauguración
    { wch: 22 }, // Estatus
    { wch: 50 }, // Observaciones
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Judicaturas');

  XLSX.writeFile(workbook, 'Plantilla_Importacion_Judicaturas_OJ.xlsx');
};
