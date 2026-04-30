'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download } from 'lucide-react'

export function ExportVentasPDF({ 
  data, 
  stats 
}: { 
  data: any[], 
  stats: { totalRevenue: number, totalCobrado: number, totalRestante: number } 
}) {
  const exportPDF = () => {
    const doc = new jsPDF()
    const now = new Date()
    const dateStr = format(now, "dd/MM/yyyy HH:mm")

    // Header
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('Reporte de Ventas - Ruarte Reports', 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generado el: ${dateStr}`, 14, 30)

    // Resumen Financiero
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Resumen Financiero', 14, 45)
    
    autoTable(doc, {
      startY: 50,
      head: [['Concepto', 'Monto']],
      body: [
        ['Total Revenue (Ventas Totales)', `$${stats.totalRevenue.toLocaleString('es-AR')}`],
        ['Total Cobrado (Cashflow Real)', `$${stats.totalCobrado.toLocaleString('es-AR')}`],
        ['Total Cuentas por Cobrar', `$${stats.totalRestante.toLocaleString('es-AR')}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    })

    // Detalle de Transacciones
    doc.setFontSize(14)
    doc.text('Detalle de Transacciones', 14, (doc as any).lastAutoTable.finalY + 15)

    const tableRows = data.map(item => [
      item.fecha ? format(new Date(item.fecha), "dd/MM/yy") : '—',
      item.contacto || '—',
      item.closer || '—',
      item.concepto || '—',
      `$${Number(item.monto).toLocaleString('es-AR')}`,
      item.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE'
    ])

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Fecha', 'Contacto', 'Closer', 'Concepto', 'Monto', 'Estado']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55] }, // Gray-800
      styles: { fontSize: 8 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'center' }
      }
    })

    doc.save(`Reporte_Ventas_${format(now, "yyyy-MM-dd")}.pdf`)
  }

  return (
    <button
      onClick={exportPDF}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
    >
      <Download className="h-4 w-4" />
      Exportar PDF
    </button>
  )
}
