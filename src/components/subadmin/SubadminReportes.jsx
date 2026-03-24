import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'
import '../../styles/SubadminReportes.css'

// Función para formatear fecha a hora de México
const formatearFechaLocal = (fechaUTC) => {
  if (!fechaUTC) return '-'
  
  return new Date(fechaUTC).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Función para generar PDF de Cierre (completo)
const generarPDF = (registro, detalles) => {
  const ventanaPDF = window.open('', '_blank')
  
  const detallesPorCategoria = {}
  detalles.forEach(detalle => {
    const categoria = detalle.insumo?.categoria || 'Sin categoría'
    if (!detallesPorCategoria[categoria]) {
      detallesPorCategoria[categoria] = []
    }
    detallesPorCategoria[categoria].push(detalle)
  })

  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Formato de Cierre - Ambulancia ${registro.ambulancias?.codigo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #b22222; padding-bottom: 20px; }
        .header h1 { color: #b22222; margin: 0; font-size: 24px; }
        .header h2 { color: #666; margin: 5px 0 0; font-size: 18px; font-weight: normal; }
        .info-section { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #ddd; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .info-item { margin: 5px 0; }
        .info-label { font-weight: bold; color: #555; }
        .categoria { margin-bottom: 25px; page-break-inside: avoid; }
        .categoria-titulo { background-color: #b22222; color: white; padding: 8px 15px; margin: 0 0 15px 0; border-radius: 5px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background-color: #f0f0f0; padding: 10px; text-align: left; font-size: 14px; border: 1px solid #ddd; }
        td { padding: 8px 10px; border: 1px solid #ddd; font-size: 13px; }
        .observaciones { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #b22222; font-style: italic; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-faltante { background-color: #fee2e2; color: #991b1b; }
        .badge-excedente { background-color: #dbeafe; color: #1e40af; }
        .badge-completo { background-color: #dcfce7; color: #166534; }
        @media print { body { margin: 20px; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CRUZ ROJA MEXICANA</h1>
        <h2>Formato de Cierre de Guardia</h2>
      </div>
      
      <div class="info-section">
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Fecha:</span> ${formatearFechaLocal(registro.fecha)}</div>
          <div class="info-item"><span class="info-label">Ambulancia:</span> ${registro.ambulancias?.codigo || 'N/A'}</div>
          <div class="info-item"><span class="info-label">Paramédico:</span> ${registro.usuarios?.nombre || 'N/A'}</div>
          <div class="info-item"><span class="info-label">Correo:</span> ${registro.usuarios?.correo || 'N/A'}</div>
        </div>
      </div>

      ${Object.keys(detallesPorCategoria).map(categoria => `
        <div class="categoria">
          <div class="categoria-titulo">${categoria}</div>
          <table>
            <thead><tr><th>Insumo</th><th>Descripción</th><th>Cantidad Establecida</th><th>Cantidad Registrada</th><th>Estado</th></tr></thead>
            <tbody>
              ${detallesPorCategoria[categoria].map(detalle => {
                const cantidad = detalle.cantidad_registrada || 0
                const establecida = detalle.cantidad_establecida || 0
                let estado = '', badgeClass = ''
                if (cantidad < establecida) { estado = 'Faltante'; badgeClass = 'badge-faltante' }
                else if (cantidad > establecida) { estado = 'Excedente'; badgeClass = 'badge-excedente' }
                else { estado = 'Completo'; badgeClass = 'badge-completo' }
                return `<tr>
                  <td><strong>${detalle.insumo?.nombre || 'N/A'}</strong></td>
                  <td>${detalle.insumo?.descripcion || '-'}</td>
                  <td>${establecida}</td>
                  <td>${cantidad}</td>
                  <td><span class="badge ${badgeClass}">${estado}</span></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      ${registro.observaciones ? `<div class="observaciones"><strong>Observaciones:</strong><br>${registro.observaciones}</div>` : ''}
      <div class="footer">
        <p>Documento generado el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
        <p>Sistema de Gestión de Ambulancias - Cruz Roja Mexicana</p>
      </div>
      <div style="text-align: center; margin-top: 20px;" class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background-color: #b22222; color: white; border: none; border-radius: 5px; cursor: pointer;">🖨️ Imprimir / Guardar PDF</button>
      </div>
    </body>
    </html>
  `
  ventanaPDF.document.write(contenidoHTML)
  ventanaPDF.document.close()
}

// Función para generar Ticket de Abastecimiento (solo faltantes y excedentes)
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

  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket de Abastecimiento - Ambulancia ${registro.ambulancias?.codigo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; padding: 15px; max-width: 400px; margin: 0 auto; }
        .ticket { border: 1px solid #ccc; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { color: #b22222; margin: 0; font-size: 18px; }
        .header h2 { color: #666; margin: 5px 0 0; font-size: 14px; font-weight: normal; }
        .info { background-color: #f9f9f9; padding: 8px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; }
        .info p { margin: 3px 0; }
        .seccion { margin-bottom: 15px; }
        .seccion-titulo { font-weight: bold; padding: 5px; border-radius: 4px; margin-bottom: 8px; font-size: 13px; }
        .seccion-titulo.faltante { background-color: #fee2e2; color: #991b1b; border-left: 3px solid #991b1b; }
        .seccion-titulo.excedente { background-color: #dbeafe; color: #1e40af; border-left: 3px solid #1e40af; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        td { padding: 6px 2px; border-bottom: 1px dotted #eee; }
        .cantidad { text-align: center; width: 50px; }
        .abastecido { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; text-align: center; }
        .abastecido label { font-size: 11px; display: block; margin-bottom: 5px; }
        .checkbox-line { display: flex; align-items: center; justify-content: center; gap: 20px; margin: 10px 0; flex-wrap: wrap; }
        .checkbox-item { display: flex; align-items: center; gap: 5px; font-size: 11px; }
        .firma { margin-top: 20px; text-align: center; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 10px; }
        .footer { text-align: center; font-size: 9px; color: #999; margin-top: 15px; }
        @media print { body { margin: 0; padding: 0; } .no-print { display: none; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <h1>CRUZ ROJA MEXICANA</h1>
          <h2>Ticket de Abastecimiento</h2>
        </div>
        
        <div class="info">
          <p><strong>Ambulancia:</strong> ${registro.ambulancias?.codigo || 'N/A'}</p>
          <p><strong>Fecha:</strong> ${formatearFechaLocal(registro.fecha)}</p>
          <p><strong>Paramédico:</strong> ${registro.usuarios?.nombre || 'N/A'}</p>
        </div>

        ${insumosFaltantes.length > 0 ? `
          <div class="seccion">
            <div class="seccion-titulo faltante">⚠️ INSUMOS FALTANTES (Requieren abastecimiento)</div>
            <table>
              ${insumosFaltantes.map(d => `
                <tr>
                  <td><strong>${d.insumo?.nombre || 'N/A'}</strong></td>
                  <td class="cantidad">Esperado: ${d.cantidad_establecida || 0}</td>
                  <td class="cantidad">Registrado: ${d.cantidad_registrada || 0}</td>
                  <td class="cantidad">Faltan: ${(d.cantidad_establecida || 0) - (d.cantidad_registrada || 0)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        ${insumosExcedentes.length > 0 ? `
          <div class="seccion">
            <div class="seccion-titulo excedente">📦 INSUMOS EXCEDENTES (Sobrantes)</div>
            <table>
              ${insumosExcedentes.map(d => `
                <tr>
                  <td><strong>${d.insumo?.nombre || 'N/A'}</strong></td>
                  <td class="cantidad">Esperado: ${d.cantidad_establecida || 0}</td>
                  <td class="cantidad">Registrado: ${d.cantidad_registrada || 0}</td>
                  <td class="cantidad">Sobran: ${(d.cantidad_registrada || 0) - (d.cantidad_establecida || 0)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        ${insumosFaltantes.length === 0 && insumosExcedentes.length === 0 ? `
          <div style="text-align: center; padding: 20px; color: #10b981;">
            ✅ Todos los insumos están en la cantidad establecida
          </div>
        ` : ''}

        <div class="abastecido">
          <label>📋 REGISTRO DE ABASTECIMIENTO</label>
          <div class="checkbox-line">
            <div class="checkbox-item">
              <input type="checkbox"> <label>Abastecido</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox"> <label>En proceso</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox"> <label>Pendiente</label>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <label>Observaciones: _________________________</label>
          </div>
        </div>

        <div class="firma">
          <p>_________________________________</p>
          <p>Firma del Responsable de Abastecimiento</p>
          <p>Fecha: ___/___/______</p>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
          <p>Sistema de Gestión de Ambulancias - Cruz Roja Mexicana</p>
        </div>
        
        <div style="text-align: center; margin-top: 15px;" class="no-print">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #b22222; color: white; border: none; border-radius: 5px; cursor: pointer;">🖨️ Imprimir Ticket</button>
        </div>
      </div>
    </body>
    </html>
  `
  ventanaTicket.document.write(contenidoHTML)
  ventanaTicket.document.close()
}

export default function SubadminReportes() {
  const { user } = useAuth()
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

  useEffect(() => {
    if (user?.sede_id) cargarReportes()
  }, [fechaI, fechaF])

  const cargarReportes = async () => {
    const { data: registrosData, error } = await supabase
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

    if (error) {
      console.error('Error cargando registros:', error)
      return
    }

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

  const verDetalles = async (registro) => {
    setRegistroSeleccionado(registro)
    setModalAbierto(true)
    setCargandoDetalles(true)

    if (registro.tipo === 'INICIO') {
      const { data, error } = await supabase
        .from('detalle_equipos')
        .select(`
          id,
          estado,
          cantidad_registrada,
          comentario,
          equipo:equipos(
            id,
            numero_serie,
            modelo:modelos_equipo(id, nombre, descripcion, categoria)
          )
        `)
        .eq('registro_id', registro.id)

      if (error) {
        console.error('Error cargando detalles de inicio:', error)
        setDetalles([])
      } else {
        setDetalles(data || [])
      }
    } else {
      const { data, error } = await supabase
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

      if (error) {
        console.error('Error cargando detalles de cierre:', error)
        setDetalles([])
      } else {
        setDetalles(data || [])
      }
    }

    setCargandoDetalles(false)
  }

  const descargarPDF = () => {
    if (registroSeleccionado && detalles.length > 0) {
      generarPDF(registroSeleccionado, detalles)
    }
  }

  const descargarTicket = () => {
    if (registroSeleccionado && detalles.length > 0) {
      generarTicketAbastecimiento(registroSeleccionado, detalles)
    }
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setRegistroSeleccionado(null)
    setDetalles([])
  }

  return (
    <SubadminLayout 
      titulo="Reportes de Sede"
      subtitulo={`Estadísticas de ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="reportes-container">
        
        <div className="filtros-fecha">
          <div className="filtro-group">
            <label className="filtro-label">Fecha Inicio</label>
            <input type="date" className="filtro-input" value={fechaI} onChange={(e) => setFechaI(e.target.value)} />
          </div>
          <div className="filtro-group">
            <label className="filtro-label">Fecha Fin</label>
            <input type="date" className="filtro-input" value={fechaF} onChange={(e) => setFechaF(e.target.value)} />
          </div>
        </div>

        <div className="resumen-grid">
          <div className="resumen-card total"><div className="resumen-icon">📋</div><div className="resumen-label">Total Registros</div><div className="resumen-valor">{resumen.total}</div></div>
          <div className="resumen-card inicios"><div className="resumen-icon">🚑</div><div className="resumen-label">Inicios</div><div className="resumen-valor">{resumen.inicios}</div></div>
          <div className="resumen-card cierres"><div className="resumen-icon">✅</div><div className="resumen-label">Cierres</div><div className="resumen-valor">{resumen.cierres}</div></div>
        </div>

        <div className="registros-table-container">
          <h3 className="registros-titulo">Registros del período</h3>
          {registros.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">📭</span><p>No hay registros en este período</p></div>
          ) : (
            <div className="table-responsive">
              <table className="registros-table">
                <thead><tr><th>Fecha (Hora México)</th><th>Tipo</th><th>Ambulancia</th><th>Paramédico</th><th>Acciones</th></tr></thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.id}>
                      <td>{formatearFechaLocal(r.fecha)}</td>
                      <td><span className={`tipo-badge ${r.tipo === 'INICIO' ? 'inicio' : 'cierre'}`}>{r.tipo}</span></td>
                      <td>{r.ambulancias?.codigo || '-'}</td>
                      <td><div className="usuario-info"><span className="usuario-nombre">{r.usuarios?.nombre || '-'}</span><span className="usuario-correo">{r.usuarios?.correo || ''}</span></div></td>
                      <td><button onClick={() => verDetalles(r)} className={`btn-ver-detalles ${r.tipo === 'INICIO' ? 'inicio' : 'cierre'}`}><span>📋</span> Ver {r.tipo === 'INICIO' ? 'Inicio' : 'Cierre'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles */}
      {modalAbierto && registroSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{registroSeleccionado.tipo === 'INICIO' ? '🚑 Inicio de Guardia' : '✅ Cierre de Guardia'}</h2>
              <button onClick={cerrarModal} className="modal-close">✕</button>
            </div>

            <div className="modal-info">
              <p><strong>Fecha:</strong> {formatearFechaLocal(registroSeleccionado.fecha)}</p>
              <p><strong>Ambulancia:</strong> {registroSeleccionado.ambulancias?.codigo}</p>
              <p><strong>Paramédico:</strong> {registroSeleccionado.usuarios?.nombre}</p>
              {registroSeleccionado.observaciones && <p><strong>Observaciones:</strong> {registroSeleccionado.observaciones}</p>}
            </div>

            <h3 className="detalles-titulo">Detalles ({detalles.length}):</h3>

            {cargandoDetalles ? (
              <div className="loading-container"><span className="loading-spinner">⛑️</span><p className="loading-text">Cargando detalles...</p></div>
            ) : (
              <div className="detalles-lista">
                {detalles.length === 0 ? (
                  <p className="empty-state">No hay detalles registrados</p>
                ) : (
                  detalles.map((detalle, index) => (
                    <div key={detalle.id || index} className="detalle-item">
                      {registroSeleccionado.tipo === 'INICIO' ? (
                        <>
                          <div className="detalle-header">
                            <span className="detalle-nombre">{detalle.equipo?.modelo?.nombre || 'Equipo sin nombre'}</span>
                            {detalle.equipo?.numero_serie && <span className="detalle-serie">N° {detalle.equipo.numero_serie}</span>}
                            <span className={`detalle-badge ${detalle.estado ? 'presente' : 'ausente'}`}>{detalle.estado ? '✓ Presente' : '✗ Ausente'}</span>
                          </div>
                          {detalle.equipo?.modelo?.descripcion && <p className="detalle-descripcion">{detalle.equipo.modelo.descripcion}</p>}
                          {detalle.comentario && <p className="detalle-comentario">📝 {detalle.comentario}</p>}
                        </>
                      ) : (
                        <>
                          <div className="detalle-header">
                            <span className="detalle-nombre">{detalle.insumo?.nombre || 'Insumo sin nombre'}</span>
                            <span className="detalle-badge categoria">{detalle.insumo?.categoria || 'Sin categoría'}</span>
                          </div>
                          {detalle.insumo?.descripcion && <p className="detalle-descripcion">{detalle.insumo.descripcion}</p>}
                          <p className="detalle-cantidad">Cantidad establecida: <strong>{detalle.cantidad_establecida || 0}</strong> | Registrada: <strong>{detalle.cantidad_registrada || 0}</strong></p>
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
                  <button onClick={descargarPDF} className="btn-pdf"><span>📄</span> Descargar PDF Completo</button>
                  <button onClick={descargarTicket} className="btn-ticket"><span>🎫</span> Ticket Abastecimiento</button>
                </>
              )}
              <button onClick={cerrarModal} className="btn-cerrar">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </SubadminLayout>
  )
}