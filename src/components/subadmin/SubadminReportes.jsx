/**
 * @component SubadminReportes
 * @description Módulo de reportes para subadministradores:
 *              - Visualización de registros de inicio y cierre de guardia
 *              - Filtros por rango de fechas
 *              - Resumen estadístico (total, inicios, cierres)
 *              - Detalle de equipos (inicio) e insumos (cierre)
 *              - Generación de PDF completo de cierre
 *              - Generación de Ticket de Abastecimiento (solo faltantes/excedentes)
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'
import '../../styles/SubadminReportes.css'
import firmaInst from '../../assets/imagenes/firmainst.png'

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Formatea una fecha UTC a hora local de México (GMT-6)
 * @param {string} fechaUTC - Fecha en formato UTC
 * @returns {string} Fecha formateada en hora de México
 */
const formatearFechaLocal = (fechaUTC) => {
  if (!fechaUTC) return '-'
  
  const fecha = new Date(fechaUTC)
  // Ajustar a GMT-6 (hora centro de México)
  const offset = -6
  const utc = fecha.getTime() + (fecha.getTimezoneOffset() * 60000)
  const fechaMexico = new Date(utc + (offset * 3600000))
  
  return fechaMexico.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Formatea una fecha UTC para impresión (formato largo)
 * @param {string} fechaUTC - Fecha en formato UTC
 * @returns {string} Fecha formateada para impresión
 */
const formatearFechaImpresion = (fechaUTC) => {
  if (!fechaUTC) return '-'
  
  const fecha = new Date(fechaUTC)
  const offset = -6
  const utc = fecha.getTime() + (fecha.getTimezoneOffset() * 60000)
  const fechaMexico = new Date(utc + (offset * 3600000))
  
  return fechaMexico.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Genera PDF completo del cierre de guardia
 * @param {Object} registro - Registro de cierre
 * @param {Array} detalles - Detalles de insumos del cierre
 */
const generarPDF = (registro, detalles) => {
  const ventanaPDF = window.open('', '_blank')
  
  // Agrupar por categoría
  const detallesPorCategoria = {}
  detalles.forEach(detalle => {
    const categoria = detalle.insumo?.categoria || 'Sin categoría'
    if (!detallesPorCategoria[categoria]) {
      detallesPorCategoria[categoria] = []
    }
    detallesPorCategoria[categoria].push(detalle)
  })

  const fechaGeneracion = new Date().toLocaleString('es-MX', { 
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Formato de Cierre - Ambulancia ${registro.ambulancias?.codigo}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          margin: 0;
          padding: 20px;
          color: #333;
          background: white;
        }
        
        .reporte-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
        }
        
        .header { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          margin-bottom: 25px; 
          border-bottom: 3px solid #b22222; 
          padding-bottom: 15px; 
        }
        
        .header-logo { 
          display: flex; 
          align-items: center; 
        }
        
        .header-logo img { 
          max-height: 65px; 
          width: auto; 
        }
        
        .header-titulo { 
          text-align: right; 
        }
        
        .header-titulo h1 { 
          color: #b22222; 
          margin: 0; 
          font-size: 16px; 
          font-weight: 500;
          letter-spacing: 1px;
        }
        
        .header-titulo h2 { 
          color: #2c3e50; 
          margin: 5px 0 0; 
          font-size: 22px; 
          font-weight: bold; 
        }
        
        .info-section { 
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 18px 20px; 
          border-radius: 12px; 
          margin-bottom: 25px; 
          border: 1px solid #dee2e6;
        }
        
        .info-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 12px; 
        }
        
        .info-item { 
          margin: 0; 
        }
        
        .info-label { 
          font-weight: 700; 
          color: #495057; 
          min-width: 100px;
          display: inline-block;
        }
        
        .info-value {
          color: #212529;
        }
        
        .categoria { 
          margin-bottom: 30px; 
          page-break-inside: avoid; 
        }
        
        .categoria-titulo { 
          background: linear-gradient(135deg, #b22222, #8b0000);
          color: white; 
          padding: 10px 18px; 
          margin: 0 0 15px 0; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 15px; 
        }
        
        th { 
          background: linear-gradient(135deg, #f1f3f5, #e9ecef);
          padding: 12px; 
          text-align: left; 
          font-size: 13px; 
          font-weight: 700;
          border: 1px solid #dee2e6;
          color: #495057;
        }
        
        td { 
          padding: 10px 12px; 
          border: 1px solid #dee2e6; 
          font-size: 13px; 
        }
        
        .badge { 
          display: inline-block; 
          padding: 4px 10px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: 700; 
        }
        
        .badge-faltante { 
          background-color: #fee2e2; 
          color: #991b1b; 
        }
        
        .badge-excedente { 
          background-color: #dbeafe; 
          color: #1e40af; 
        }
        
        .badge-completo { 
          background-color: #dcfce7; 
          color: #166534; 
        }
        
        .observaciones { 
          margin-top: 25px; 
          padding: 15px 20px; 
          background-color: #f8f9fa; 
          border-left: 4px solid #b22222; 
          border-radius: 8px;
        }
        
        .observaciones strong {
          color: #495057;
          display: block;
          margin-bottom: 8px;
        }
        
        .footer { 
          margin-top: 35px; 
          text-align: center; 
          font-size: 11px; 
          color: #868e96; 
          border-top: 1px solid #dee2e6; 
          padding-top: 20px; 
        }
        
        .print-button {
          text-align: center;
          margin-top: 20px;
          padding: 15px;
        }
        
        .print-button button {
          padding: 12px 30px;
          background: linear-gradient(135deg, #b22222, #8b0000);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .print-button button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(178, 34, 34, 0.3);
        }
        
        @media print {
          body {
            margin: 0;
            padding: 15px;
            background: white;
          }
          
          .reporte-container {
            margin: 0;
            padding: 0;
          }
          
          .print-button {
            display: none;
          }
          
          .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
          }
          
          .info-section {
            background: #f8f9fa;
            break-inside: avoid;
          }
          
          .categoria {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          table {
            break-inside: avoid;
          }
          
          th, td {
            border: 1px solid #dee2e6;
          }
        }
      </style>
    </head>
    <body>
      <div class="reporte-container">
        <div class="header">
          <div class="header-logo">
            <img src="${firmaInst}" alt="Cruz Roja Mexicana" />
          </div>
          <div class="header-titulo">
            <h1>CRUZ ROJA MEXICANA</h1>
            <h2>Formato de Cierre de Guardia</h2>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">📅 Fecha:</span>
              <span class="info-value">${formatearFechaImpresion(registro.fecha)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🚑 Ambulancia:</span>
              <span class="info-value">${registro.ambulancias?.codigo || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">👤 Paramédico:</span>
              <span class="info-value">${registro.usuarios?.nombre || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📧 Correo:</span>
              <span class="info-value">${registro.usuarios?.correo || 'N/A'}</span>
            </div>
          </div>
        </div>

        ${Object.keys(detallesPorCategoria).map(categoria => `
          <div class="categoria">
            <div class="categoria-titulo">📦 ${categoria}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%">Insumo</th>
                  <th style="width: 35%">Descripción</th>
                  <th style="width: 12%">Cant. Establecida</th>
                  <th style="width: 12%">Cant. Registrada</th>
                  <th style="width: 11%">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${detallesPorCategoria[categoria].map(detalle => {
                  const cantidad = detalle.cantidad_registrada || 0
                  const establecida = detalle.cantidad_establecida || 0
                  let estado = '', badgeClass = ''
                  if (cantidad < establecida) { estado = 'Faltante'; badgeClass = 'badge-faltante' }
                  else if (cantidad > establecida) { estado = 'Excedente'; badgeClass = 'badge-excedente' }
                  else { estado = 'Completo'; badgeClass = 'badge-completo' }
                  return `
                  <tr>
                    <td><strong>${detalle.insumo?.nombre || 'N/A'}</strong></td>
                    <td>${detalle.insumo?.descripcion || '-'}</td>
                    <td style="text-align: center">${establecida}</td>
                    <td style="text-align: center">${cantidad}</td>
                    <td style="text-align: center"><span class="badge ${badgeClass}">${estado}</span></td>
                  </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        ${registro.observaciones ? `
          <div class="observaciones">
            <strong>📝 Observaciones:</strong>
            <p>${registro.observaciones}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Documento generado el ${fechaGeneracion}</p>
          <p>Sistema de Gestión de Ambulancias - Cruz Roja Mexicana</p>
        </div>
        
        <div class="print-button">
          <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        </div>
      </div>
    </body>
    </html>
  `
  ventanaPDF.document.write(contenidoHTML)
  ventanaPDF.document.close()
}

/**
 * Genera Ticket de Abastecimiento (solo insumos faltantes y excedentes)
 * @param {Object} registro - Registro de cierre
 * @param {Array} detalles - Detalles de insumos del cierre
 */
const generarTicketAbastecimiento = (registro, detalles) => {
  const ventanaTicket = window.open('', '_blank')
  
  // Filtrar solo insumos que faltan o sobran
  const insumosFaltantes = detalles.filter(d => {
    const registrado = d.cantidad_registrada || 0
    const establecido = d.cantidad_establecida || 0
    return registrado < establecido
  })
  
  const insumosExcedentes = detalles.filter(d => {
    const registrado = d.cantidad_registrada || 0
    const establecido = d.cantidad_establecida || 0
    return registrado > establecido
  })

  const fechaGeneracion = new Date().toLocaleString('es-MX', { 
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  const totalFaltantes = insumosFaltantes.reduce((sum, d) => sum + ((d.cantidad_establecida || 0) - (d.cantidad_registrada || 0)), 0)
  const totalExcedentes = insumosExcedentes.reduce((sum, d) => sum + ((d.cantidad_registrada || 0) - (d.cantidad_establecida || 0)), 0)

  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket Abastecimiento - Ambulancia ${registro.ambulancias?.codigo}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background: #e0e0e0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        
        .ticket { 
          max-width: 400px; 
          width: 100%;
          margin: 0 auto; 
          background: white;
          font-size: 13px;
          line-height: 1.4;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 8px;
        }
        
        .ticket-content {
          padding: 16px 14px;
        }
        
        .header { 
          text-align: center; 
          border-bottom: 1px dashed #ccc; 
          padding-bottom: 10px; 
          margin-bottom: 12px; 
        }
        
        .header-logo { 
          text-align: center;
          margin-bottom: 8px;
        }
        
        .header-logo img { 
          max-height: 45px; 
          width: auto; 
        }
        
        .header-titulo h1 { 
          color: #b22222; 
          margin: 0; 
          font-size: 15px; 
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .header-titulo h2 { 
          color: #333; 
          margin: 5px 0 0; 
          font-size: 13px; 
          font-weight: 600;
        }
        
        .info { 
          background: #f5f5f5; 
          padding: 10px 12px; 
          margin-bottom: 12px; 
          font-size: 12px; 
          border-radius: 6px;
        }
        
        .info p { 
          margin: 4px 0; 
        }
        
        .info strong {
          font-weight: 700;
          color: #333;
        }
        
        .totales {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        
        .total-item {
          flex: 1;
          text-align: center;
          padding: 8px 5px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 12px;
        }
        
        .total-faltante {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .total-excedente {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .seccion { 
          margin-bottom: 14px; 
        }
        
        .seccion-titulo { 
          font-weight: bold; 
          padding: 6px 8px; 
          margin-bottom: 8px; 
          font-size: 12px; 
          text-align: center;
          border-radius: 4px;
        }
        
        .seccion-titulo.faltante { 
          background-color: #fee2e2; 
          color: #991b1b; 
        }
        
        .seccion-titulo.excedente { 
          background-color: #dbeafe; 
          color: #1e40af; 
        }
        
        .tabla-insumos {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .tabla-insumos td {
          padding: 6px 4px;
          border-bottom: 1px solid #eee;
        }
        
        .tabla-insumos .nombre {
          font-weight: 600;
          color: #333;
        }
        
        .tabla-insumos .cantidad {
          text-align: center;
          white-space: nowrap;
          padding: 0 5px;
        }
        
        .cantidad-faltante {
          color: #991b1b;
          font-weight: bold;
          background: #fee2e2;
          border-radius: 4px;
          padding: 2px 5px;
        }
        
        .cantidad-excedente {
          color: #1e40af;
          font-weight: bold;
          background: #dbeafe;
          border-radius: 4px;
          padding: 2px 5px;
        }
        
        .etiqueta-cantidad {
          font-size: 10px;
          color: #666;
          display: inline-block;
          margin-right: 2px;
        }
        
        .empty-message {
          text-align: center;
          padding: 20px;
          background: #dcfce7;
          margin: 12px 0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          color: #166534;
        }
        
        .abastecimiento { 
          margin-top: 14px; 
          padding-top: 10px; 
          border-top: 1px dashed #ccc; 
        }
        
        .abastecimiento-titulo {
          font-weight: bold;
          font-size: 12px;
          text-align: center;
          margin-bottom: 10px;
          text-transform: uppercase;
          color: #333;
        }
        
        .opciones {
          display: flex;
          justify-content: space-around;
          margin-bottom: 12px;
          font-size: 12px;
        }
        
        .opcion {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .opcion input {
          width: 14px;
          height: 14px;
          margin: 0;
          cursor: pointer;
        }
        
        .observaciones-linea {
          font-size: 11px;
          margin: 10px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .observaciones-linea span {
          font-weight: 600;
          color: #555;
        }
        
        .linea-puntos {
          border-bottom: 1px dotted #999;
          flex: 1;
          height: 1px;
          margin-top: 2px;
        }
        
        .firma { 
          margin-top: 14px; 
          text-align: center; 
          font-size: 11px; 
          border-top: 1px dashed #ccc; 
          padding-top: 10px; 
        }
        
        .firma-linea {
          margin-top: 6px;
          padding-top: 6px;
          font-family: monospace;
          font-size: 12px;
          letter-spacing: 2px;
        }
        
        .firma-texto {
          margin-top: 4px;
          font-size: 10px;
          color: #666;
        }
        
        .footer { 
          text-align: center; 
          font-size: 9px; 
          color: #999; 
          margin-top: 12px; 
          padding-top: 8px;
          border-top: 1px solid #eee;
        }
        
        .print-button {
          text-align: center;
          margin-top: 12px;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 6px;
        }
        
        .print-button button {
          padding: 8px 20px;
          background: #b22222;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .print-button button:hover {
          background: #8b0000;
          transform: translateY(-1px);
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          
          .ticket {
            max-width: 100%;
            box-shadow: none;
            border-radius: 0;
          }
          
          .print-button {
            display: none;
          }
          
          .tabla-insumos td {
            border-bottom: 1px solid #ddd;
          }
          
          .opcion input {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="ticket-content">
          
          <div class="header">
            <div class="header-logo">
              <img src="${firmaInst}" alt="Cruz Roja Mexicana" />
            </div>
            <div class="header-titulo">
              <h1>TICKET DE ABASTECIMIENTO</h1>
              <h2>Ambulancia ${registro.ambulancias?.codigo || 'N/A'}</h2>
            </div>
          </div>
          
          <div class="info">
            <p><strong>📅 Fecha:</strong> ${formatearFechaImpresion(registro.fecha)}</p>
            <p><strong>👤 Paramédico:</strong> ${registro.usuarios?.nombre || 'N/A'}</p>
          </div>
          
          <div class="totales">
            ${insumosFaltantes.length > 0 ? `
              <div class="total-item total-faltante">
                ⚠️ Faltan: ${totalFaltantes} unidad(es)
              </div>
            ` : ''}
            ${insumosExcedentes.length > 0 ? `
              <div class="total-item total-excedente">
                📦 Sobran: ${totalExcedentes} unidad(es)
              </div>
            ` : ''}
          </div>
          
          ${insumosFaltantes.length > 0 ? `
            <div class="seccion">
              <div class="seccion-titulo faltante">
                ⚠️ INSUMOS FALTANTES (${insumosFaltantes.length})
              </div>
              <table class="tabla-insumos">
                ${insumosFaltantes.map(d => {
                  const falta = (d.cantidad_establecida || 0) - (d.cantidad_registrada || 0)
                  return `
                  <tr>
                    <td class="nombre">${d.insumo?.nombre || 'N/A'}</td>
                    <td class="cantidad"><span class="etiqueta-cantidad">Est:</span>${d.cantidad_establecida || 0}</td>
                    <td class="cantidad"><span class="etiqueta-cantidad">Reg:</span>${d.cantidad_registrada || 0}</td>
                    <td class="cantidad"><span class="cantidad-faltante">Falta: ${falta}</span></td>
                  </tr>
                  `
                }).join('')}
              </table>
            </div>
          ` : ''}
          
          ${insumosExcedentes.length > 0 ? `
            <div class="seccion">
              <div class="seccion-titulo excedente">
                📦 INSUMOS EXCEDENTES (${insumosExcedentes.length})
              </div>
              <table class="tabla-insumos">
                ${insumosExcedentes.map(d => {
                  const sobra = (d.cantidad_registrada || 0) - (d.cantidad_establecida || 0)
                  return `
                  <tr>
                    <td class="nombre">${d.insumo?.nombre || 'N/A'}</td>
                    <td class="cantidad"><span class="etiqueta-cantidad">Est:</span>${d.cantidad_establecida || 0}</td>
                    <td class="cantidad"><span class="etiqueta-cantidad">Reg:</span>${d.cantidad_registrada || 0}</td>
                    <td class="cantidad"><span class="cantidad-excedente">Sobra: ${sobra}</span></td>
                  </tr>
                  `
                }).join('')}
              </table>
            </div>
          ` : ''}
          
          ${insumosFaltantes.length === 0 && insumosExcedentes.length === 0 ? `
            <div class="empty-message">
              ✅ Todos los insumos están en la cantidad establecida
            </div>
          ` : ''}
          
          <div class="abastecimiento">
            <div class="abastecimiento-titulo">📋 REGISTRO DE ABASTECIMIENTO</div>
            <div class="opciones">
              <label class="opcion">
                <input type="checkbox"> ✅ Abastecido
              </label>
              <label class="opcion">
                <input type="checkbox"> 🔄 En proceso
              </label>
              <label class="opcion">
                <input type="checkbox"> ⏰ Pendiente
              </label>
            </div>
            <div class="observaciones-linea">
              <span>📝 Observaciones:</span>
              <div class="linea-puntos"></div>
            </div>
          </div>
          
          <div class="firma">
            <div class="firma-linea">
              _________________________________
            </div>
            <div class="firma-texto">Firma del Responsable de Abastecimiento</div>
            <div class="firma-texto">Fecha: ___/___/______</div>
          </div>
          
          <div class="footer">
            <p>Generado: ${fechaGeneracion} | Sistema Cruz Roja</p>
          </div>
          
          <div class="print-button">
            <button onclick="window.print()">🖨️ Imprimir Ticket</button>
          </div>
          
        </div>
      </div>
    </body>
    </html>
  `
  ventanaTicket.document.write(contenidoHTML)
  ventanaTicket.document.close()
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function SubadminReportes() {
  const { user } = useAuth()
  
  // ===== ESTADOS =====
  const [fechaI, setFechaI] = useState(new Date().toISOString().split('T')[0])
  const [fechaF, setFechaF] = useState(new Date().toISOString().split('T')[0])
  const [registros, setRegistros] = useState([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null)
  const [detalles, setDetalles] = useState([])
  const [cargandoDetalles, setCargandoDetalles] = useState(false)
  const [resumen, setResumen] = useState({
    total: 0,
    inicios: 0,
    cierres: 0
  })

  // ===== CARGA DE DATOS =====
  useEffect(() => {
    if (user?.sede_id) cargarReportes()
  }, [fechaI, fechaF])

  /**
   * Carga los reportes del período seleccionado
   */
  const cargarReportes = async () => {
    const { data: registrosData } = await supabase
      .from('registros')
      .select(`
        id,
        fecha,
        tipo,
        observaciones,
        ambulancia_id,
        paramedico_id,
        sede_id
      `)
      .eq('sede_id', user.sede_id)
      .gte('fecha', fechaI)
      .lte('fecha', fechaF + ' 23:59:59')
      .order('fecha', { ascending: false })

    // Enriquecer con nombres de ambulancia y paramédico
    const registrosConRelaciones = await Promise.all(
      (registrosData || []).map(async (registro) => {
        const { data: ambulancia } = await supabase
          .from('ambulancias')
          .select('codigo')
          .eq('id', registro.ambulancia_id)
          .single()

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('nombre, correo')
          .eq('id', registro.paramedico_id)
          .single()

        return {
          ...registro,
          ambulancias: ambulancia || { codigo: 'N/A' },
          usuarios: usuario || { nombre: 'Desconocido', correo: '' }
        }
      })
    )

    setRegistros(registrosConRelaciones)

    const inicios = (registrosConRelaciones || []).filter(r => r.tipo === 'INICIO').length
    const cierres = (registrosConRelaciones || []).filter(r => r.tipo === 'CIERRE').length

    setResumen({
      total: registrosConRelaciones?.length || 0,
      inicios,
      cierres
    })
  }

  /**
   * Carga los detalles de un registro específico
   * @param {Object} registro - Registro seleccionado
   */
  const verDetalles = async (registro) => {
    setRegistroSeleccionado(registro)
    setModalAbierto(true)
    setCargandoDetalles(true)

    if (registro.tipo === 'INICIO') {
      // Cargar detalles de equipos para inicio de guardia
      const { data } = await supabase
        .from('detalle_equipos')
        .select(`
          id,
          estado,
          cantidad_registrada,
          comentario,
          equipo:equipos(
            id,
            tipo,
            numero_serie,
            nombre,
            descripcion,
            categoria,
            cantidad,
            modelo:modelos_equipo(id, nombre, descripcion, categoria)
          )
        `)
        .eq('registro_id', registro.id)

      const detallesFormateados = (data || []).map(detalle => {
        const equipo = detalle.equipo
        if (equipo.tipo === 'GENERAL') {
          return {
            ...detalle,
            equipo: {
              ...equipo,
              nombre_mostrar: equipo.nombre || 'Equipo sin nombre',
              descripcion_mostrar: equipo.descripcion || '',
              categoria_mostrar: equipo.categoria || '',
              tipo_equipo: 'GENERAL'
            }
          }
        } else {
          return {
            ...detalle,
            equipo: {
              ...equipo,
              nombre_mostrar: equipo.modelo?.nombre || 'Equipo sin modelo',
              descripcion_mostrar: equipo.modelo?.descripcion || '',
              categoria_mostrar: equipo.modelo?.categoria || '',
              tipo_equipo: 'INDIVIDUAL'
            }
          }
        }
      })
      setDetalles(detallesFormateados)
    } else {
      // Cargar detalles de insumos para cierre de guardia
      const { data } = await supabase
        .from('detalle_insumos')
        .select(`
          id,
          cantidad_registrada,
          cantidad_establecida,
          comentario,
          insumo:insumos (
            id,
            nombre,
            categoria,
            descripcion
          )
        `)
        .eq('registro_id', registro.id)
      setDetalles(data || [])
    }

    setCargandoDetalles(false)
  }

  /**
   * Descarga el PDF completo del cierre
   */
  const descargarPDF = () => {
    if (registroSeleccionado && detalles.length > 0) {
      generarPDF(registroSeleccionado, detalles)
    }
  }

  /**
   * Descarga el Ticket de Abastecimiento
   */
  const descargarTicket = () => {
    if (registroSeleccionado && detalles.length > 0) {
      generarTicketAbastecimiento(registroSeleccionado, detalles)
    }
  }

  /**
   * Cierra el modal de detalles
   */
  const cerrarModal = () => {
    setModalAbierto(false)
    setRegistroSeleccionado(null)
    setDetalles([])
  }

  // ===== RENDER =====
  return (
    <SubadminLayout 
      titulo="Reportes de Sede"
      subtitulo={`Estadísticas de ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="reportes-container">
        
        {/* FILTROS DE FECHA */}
        <div className="filtros-fecha">
          <div className="filtro-group">
            <label className="filtro-label">Fecha Inicio</label>
            <input 
              type="date" 
              className="filtro-input" 
              value={fechaI} 
              onChange={(e) => setFechaI(e.target.value)} 
            />
          </div>
          <div className="filtro-group">
            <label className="filtro-label">Fecha Fin</label>
            <input 
              type="date" 
              className="filtro-input" 
              value={fechaF} 
              onChange={(e) => setFechaF(e.target.value)} 
            />
          </div>
        </div>

        {/* TARJETAS DE RESUMEN */}
        <div className="resumen-grid">
          <div className="resumen-card total">
            <div className="resumen-icon">📋</div>
            <div className="resumen-label">Total Registros</div>
            <div className="resumen-valor">{resumen.total}</div>
          </div>
          <div className="resumen-card inicios">
            <div className="resumen-icon">🚑</div>
            <div className="resumen-label">Inicios de Guardia</div>
            <div className="resumen-valor">{resumen.inicios}</div>
          </div>
          <div className="resumen-card cierres">
            <div className="resumen-icon">✅</div>
            <div className="resumen-label">Cierres de Guardia</div>
            <div className="resumen-valor">{resumen.cierres}</div>
          </div>
        </div>

        {/* TABLA DE REGISTROS */}
        <div className="registros-table-container">
          <h3 className="registros-titulo">Registros del período</h3>
          {registros.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No hay registros en este período</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="registros-table">
                <thead>
                  <tr>
                    <th>Fecha (Hora México)</th>
                    <th>Tipo</th>
                    <th>Ambulancia</th>
                    <th>Paramédico</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.id}>
                      <td>{formatearFechaLocal(r.fecha)}</td>
                      <td>
                        <span className={`tipo-badge ${r.tipo === 'INICIO' ? 'inicio' : 'cierre'}`}>
                          {r.tipo === 'INICIO' ? '🚑 Inicio' : '✅ Cierre'}
                        </span>
                      </td>
                      <td>{r.ambulancias?.codigo || '-'}</td>
                      <td>
                        <div className="usuario-info">
                          <span className="usuario-nombre">{r.usuarios?.nombre || '-'}</span>
                          <span className="usuario-correo">{r.usuarios?.correo || ''}</span>
                        </div>
                      </td>
                      <td>
                        <button 
                          onClick={() => verDetalles(r)} 
                          className={`btn-ver-detalles ${r.tipo === 'INICIO' ? 'inicio' : 'cierre'}`}
                        >
                          <span>📋</span> Ver {r.tipo === 'INICIO' ? 'Inicio' : 'Cierre'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLES */}
      {modalAbierto && registroSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {registroSeleccionado.tipo === 'INICIO' ? '🚑 Inicio de Guardia' : '✅ Cierre de Guardia'}
              </h2>
              <button onClick={cerrarModal} className="modal-close">✕</button>
            </div>

            <div className="modal-info">
              <p><strong>📅 Fecha:</strong> {formatearFechaLocal(registroSeleccionado.fecha)}</p>
              <p><strong>🚑 Ambulancia:</strong> {registroSeleccionado.ambulancias?.codigo}</p>
              <p><strong>👤 Paramédico:</strong> {registroSeleccionado.usuarios?.nombre}</p>
              {registroSeleccionado.observaciones && (
                <p><strong>📝 Observaciones:</strong> {registroSeleccionado.observaciones}</p>
              )}
            </div>

            <h3 className="detalles-titulo">Detalles ({detalles.length})</h3>

            {cargandoDetalles ? (
              <div className="loading-container">
                <span className="loading-spinner">⟳</span>
                <p className="loading-text">Cargando detalles...</p>
              </div>
            ) : (
              <div className="detalles-lista">
                {detalles.length === 0 ? (
                  <p className="empty-state">No hay detalles registrados</p>
                ) : (
                  detalles.map((detalle, index) => (
                    <div key={detalle.id || index} className="detalle-item">
                      {registroSeleccionado.tipo === 'INICIO' ? (
                        // Detalle de EQUIPO (inicio)
                        <>
                          <div className="detalle-header">
                            <span className="detalle-nombre">{detalle.equipo?.nombre_mostrar || 'Equipo sin nombre'}</span>
                            {detalle.equipo?.tipo_equipo === 'INDIVIDUAL' && detalle.equipo?.numero_serie && (
                              <span className="detalle-serie">🔢 N° {detalle.equipo.numero_serie}</span>
                            )}
                            {detalle.equipo?.tipo_equipo === 'GENERAL' && detalle.cantidad_registrada !== undefined && (
                              <span className="detalle-cantidad-badge">Cantidad: {detalle.cantidad_registrada}</span>
                            )}
                            {detalle.estado !== undefined && detalle.equipo?.tipo_equipo === 'INDIVIDUAL' && (
                              <span className={`detalle-badge ${detalle.estado ? 'presente' : 'ausente'}`}>
                                {detalle.estado ? '✓ Presente' : '✗ Ausente'}
                              </span>
                            )}
                          </div>
                          {detalle.equipo?.categoria_mostrar && (
                            <div className="detalle-categoria">
                              <span className="categoria-badge">{detalle.equipo.categoria_mostrar}</span>
                            </div>
                          )}
                          {detalle.equipo?.descripcion_mostrar && (
                            <p className="detalle-descripcion">{detalle.equipo.descripcion_mostrar}</p>
                          )}
                          {detalle.comentario && <p className="detalle-comentario">📝 {detalle.comentario}</p>}
                        </>
                      ) : (
                        // Detalle de INSUMO (cierre)
                        <>
                          <div className="detalle-header">
                            <span className="detalle-nombre">{detalle.insumo?.nombre || 'Insumo sin nombre'}</span>
                            <span className="detalle-badge categoria">{detalle.insumo?.categoria || 'Sin categoría'}</span>
                          </div>
                          {detalle.insumo?.descripcion && (
                            <p className="detalle-descripcion">{detalle.insumo.descripcion}</p>
                          )}
                          <p className="detalle-cantidad">
                            Cantidad establecida: <strong>{detalle.cantidad_establecida || 0}</strong> | 
                            Registrada: <strong>{detalle.cantidad_registrada || 0}</strong>
                          </p>
                          {detalle.comentario && <p className="detalle-comentario">📝 {detalle.comentario}</p>}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="modal-actions">
              {registroSeleccionado.tipo === 'CIERRE' && detalles.length > 0 && (
                <>
                  <button onClick={descargarPDF} className="btn-pdf">
                    <span>📄</span> Descargar PDF Completo
                  </button>
                  <button onClick={descargarTicket} className="btn-ticket">
                    <span>🎫</span> Ticket Abastecimiento
                  </button>
                </>
              )}
              <button onClick={cerrarModal} className="btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </SubadminLayout>
  )
}