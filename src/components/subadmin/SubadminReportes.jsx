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

// Función para generar PDF
const generarPDF = (registro, detalles) => {
  // Crear una nueva ventana para el PDF
  const ventanaPDF = window.open('', '_blank')
  
  // Agrupar detalles por categoría
  const detallesPorCategoria = {}
  detalles.forEach(detalle => {
    const categoria = detalle.insumo?.categoria || 'Sin categoría'
    if (!detallesPorCategoria[categoria]) {
      detallesPorCategoria[categoria] = []
    }
    detallesPorCategoria[categoria].push(detalle)
  })

  // Generar HTML del PDF
  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Formato de Cierre - Ambulancia ${registro.ambulancias?.codigo}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #b22222;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #b22222;
          margin: 0;
          font-size: 24px;
        }
        .header h2 {
          color: #666;
          margin: 5px 0 0;
          font-size: 18px;
          font-weight: normal;
        }
        .info-section {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid #ddd;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .info-item {
          margin: 5px 0;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .categoria {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .categoria-titulo {
          background-color: #b22222;
          color: white;
          padding: 8px 15px;
          margin: 0 0 15px 0;
          border-radius: 5px;
          font-size: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th {
          background-color: #f0f0f0;
          padding: 10px;
          text-align: left;
          font-size: 14px;
          border: 1px solid #ddd;
        }
        td {
          padding: 8px 10px;
          border: 1px solid #ddd;
          font-size: 13px;
        }
        .observaciones {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #b22222;
          font-style: italic;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }
        .badge-completo {
          background-color: #dcfce7;
          color: #166534;
        }
        .badge-faltante {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .badge-excedente {
          background-color: #dbeafe;
          color: #1e40af;
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CRUZ ROJA MEXICANA</h1>
        <h2>Formato de Cierre de Guardia</h2>
      </div>
      
      <div class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Fecha:</span> ${formatearFechaLocal(registro.fecha)}
          </div>
          <div class="info-item">
            <span class="info-label">Ambulancia:</span> ${registro.ambulancias?.codigo || 'N/A'}
          </div>
          <div class="info-item">
            <span class="info-label">Paramédico:</span> ${registro.usuarios?.nombre || 'N/A'}
          </div>
          <div class="info-item">
            <span class="info-label">Correo:</span> ${registro.usuarios?.correo || 'N/A'}
          </div>
        </div>
      </div>

      ${Object.keys(detallesPorCategoria).map(categoria => `
        <div class="categoria">
          <div class="categoria-titulo">${categoria}</div>
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Descripción</th>
                <th>Cantidad Establecida</th>
                <th>Cantidad Registrada</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${detallesPorCategoria[categoria].map(detalle => {
                const cantidad = detalle.cantidad_registrada || 0
                const establecida = detalle.insumo?.cantidad_establecida || 0
                let estado = ''
                let badgeClass = ''
                
                if (cantidad < establecida) {
                  estado = 'Faltante'
                  badgeClass = 'badge-faltante'
                } else if (cantidad > establecida) {
                  estado = 'Excedente'
                  badgeClass = 'badge-excedente'
                } else {
                  estado = 'Completo'
                  badgeClass = 'badge-completo'
                }
                
                return `
                  <tr>
                    <td><strong>${detalle.insumo?.nombre || 'N/A'}</strong></td>
                    <td>${detalle.insumo?.descripcion || '-'}</td>
                    <td>${establecida}</td>
                    <td>${cantidad}</td>
                    <td><span class="badge ${badgeClass}">${estado}</span></td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      ${registro.observaciones ? `
        <div class="observaciones">
          <strong>Observaciones:</strong><br>
          ${registro.observaciones}
        </div>
      ` : ''}

      <div class="footer">
        <p>Documento generado el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
        <p>Sistema de Gestión de Ambulancias - Cruz Roja Mexicana</p>
      </div>
      
      <div style="text-align: center; margin-top: 20px;" class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background-color: #b22222; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>
    </body>
    </html>
  `

  ventanaPDF.document.write(contenidoHTML)
  ventanaPDF.document.close()
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
    console.log('Cargando reportes para sede:', user.sede_id)
    
    // Primero obtener los registros
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

    console.log('Registros encontrados:', registrosData)

    // Luego obtener los datos relacionados para cada registro
    const registrosConRelaciones = await Promise.all(
      (registrosData || []).map(async (registro) => {
        // Obtener ambulancia
        const { data: ambulancia } = await supabase
          .from('ambulancias')
          .select('codigo')
          .eq('id', registro.ambulancia_id)
          .single()

        // Obtener usuario (paramédico)
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

    console.log('Registros con relaciones:', registrosConRelaciones)
    setRegistros(registrosConRelaciones)

    // Calcular resumen
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

    console.log('Cargando detalles para registro:', registro.id, 'tipo:', registro.tipo)

    if (registro.tipo === 'INICIO') {
      // Cargar detalles de equipo médico
      const { data, error } = await supabase
        .from('detalle_equipo')
        .select(`
          id,
          estado,
          comentario,
          equipo:equipo_medico(id, nombre, descripcion)
        `)
        .eq('registro_id', registro.id)

      if (error) {
        console.error('Error cargando detalles de inicio:', error)
        setDetalles([])
      } else {
        console.log('Detalles de inicio recibidos:', data)
        console.log('Cantidad de detalles de inicio:', data?.length || 0)
        setDetalles(data || [])
      }
    } else {
      // Cargar detalles de insumos
      const { data, error } = await supabase
        .from('detalle_insumos')
        .select(`
          id,
          cantidad_registrada,
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
        console.log('Detalles de cierre recibidos:', data)
        console.log('Cantidad de detalles de cierre:', data?.length || 0)
        
        // Verificar que cada detalle tenga insumo
        if (data) {
          data.forEach((item, index) => {
            console.log(`Detalle ${index + 1}:`, {
              id: item.id,
              cantidad: item.cantidad_registrada,
              tieneInsumo: !!item.insumo,
              insumoId: item.insumo?.id,
              insumoNombre: item.insumo?.nombre
            })
          })
        }
        
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
        
        {/* Filtros de fecha */}
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

        {/* Tarjetas de resumen */}
        <div className="resumen-grid">
          <div className="resumen-card total">
            <div className="resumen-icon">📋</div>
            <div className="resumen-label">Total Registros</div>
            <div className="resumen-valor">{resumen.total}</div>
          </div>
          <div className="resumen-card inicios">
            <div className="resumen-icon">🚑</div>
            <div className="resumen-label">Inicios</div>
            <div className="resumen-valor">{resumen.inicios}</div>
          </div>
          <div className="resumen-card cierres">
            <div className="resumen-icon">✅</div>
            <div className="resumen-label">Cierres</div>
            <div className="resumen-valor">{resumen.cierres}</div>
          </div>
        </div>

        {/* Tabla de registros */}
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
                          {r.tipo}
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
                          <span>📋</span>
                          Ver {r.tipo === 'INICIO' ? 'Inicio' : 'Cierre'}
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

      {/* Modal de detalles */}
      {modalAbierto && registroSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {registroSeleccionado.tipo === 'INICIO' ? '🚑 Inicio de Guardia' : '✅ Cierre de Guardia'}
              </h2>
              <button onClick={cerrarModal} className="modal-close">
                ✕
              </button>
            </div>

            <div className="modal-info">
              <p><strong>Fecha:</strong> {formatearFechaLocal(registroSeleccionado.fecha)}</p>
              <p><strong>Ambulancia:</strong> {registroSeleccionado.ambulancias?.codigo}</p>
              <p><strong>Paramédico:</strong> {registroSeleccionado.usuarios?.nombre}</p>
              {registroSeleccionado.observaciones && (
                <p><strong>Observaciones:</strong> {registroSeleccionado.observaciones}</p>
              )}
            </div>

            <h3 className="detalles-titulo">Detalles ({detalles.length}):</h3>

            {cargandoDetalles ? (
              <div className="loading-container">
                <span className="loading-spinner">⛑️</span>
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
                        <>
                          <div className="detalle-header">
                            <span className="detalle-nombre">{detalle.equipo?.nombre || 'Equipo sin nombre'}</span>
                            <span className={`detalle-badge ${detalle.estado ? 'presente' : 'ausente'}`}>
                              {detalle.estado ? '✓ Presente' : '✗ Ausente'}
                            </span>
                          </div>
                          {detalle.equipo?.descripcion && (
                            <p className="detalle-descripcion">{detalle.equipo.descripcion}</p>
                          )}
                          {detalle.comentario && (
                            <p className="detalle-comentario">📝 {detalle.comentario}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="detalle-header">
                            <span className="detalle-nombre">{detalle.insumo?.nombre || 'Insumo sin nombre'}</span>
                            <span className="detalle-badge categoria">
                              {detalle.insumo?.categoria || 'Sin categoría'}
                            </span>
                          </div>
                          
                          {detalle.insumo?.descripcion && (
                            <p className="detalle-descripcion">{detalle.insumo.descripcion}</p>
                          )}
                          
                          <p className="detalle-cantidad">
                            Cantidad registrada: <strong>{detalle.cantidad_registrada}</strong>
                          </p>
                          
                          {detalle.comentario && (
                            <p className="detalle-comentario">📝 {detalle.comentario}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="modal-actions">
              {registroSeleccionado.tipo === 'CIERRE' && detalles.length > 0 && (
                <button onClick={descargarPDF} className="btn-pdf">
                  <span>📄</span>
                  Descargar PDF
                </button>
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