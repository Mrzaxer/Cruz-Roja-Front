import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'

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
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flexWrap: 'wrap'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaI}
              onChange={(e) => setFechaI(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaF}
              onChange={(e) => setFechaF(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ backgroundColor: '#b22222', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Total Registros</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{resumen.total}</div>
          </div>
          <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚑</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Inicios</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{resumen.inicios}</div>
          </div>
          <div style={{ backgroundColor: '#16a34a', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Cierres</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{resumen.cierres}</div>
          </div>
        </div>

        {/* Tabla de registros */}
        <div className="crud-container">
          <h3 style={{ marginBottom: '1rem' }}>Registros del período</h3>
          
          {registros.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '8px',
              color: '#666'
            }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
              <p>No hay registros en este período</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
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
                        <span style={{
                          backgroundColor: r.tipo === 'INICIO' ? '#dcfce7' : '#fee2e2',
                          color: r.tipo === 'INICIO' ? '#166534' : '#991b1b',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          {r.tipo}
                        </span>
                      </td>
                      <td>{r.ambulancias?.codigo || '-'}</td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{r.usuarios?.nombre || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>{r.usuarios?.correo || ''}</div>
                      </td>
                      <td>
                        <button
                          onClick={() => verDetalles(r)}
                          style={{
                            backgroundColor: r.tipo === 'INICIO' ? '#2563eb' : '#16a34a',
                            color: 'white',
                            border: 'none',
                            padding: '0.4rem 1rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#b22222' }}>
                {registroSeleccionado.tipo === 'INICIO' ? '🚑 Inicio de Guardia' : '✅ Cierre de Guardia'}
              </h2>
              <button
                onClick={cerrarModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <p><strong>Fecha:</strong> {formatearFechaLocal(registroSeleccionado.fecha)}</p>
              <p><strong>Ambulancia:</strong> {registroSeleccionado.ambulancias?.codigo}</p>
              <p><strong>Paramédico:</strong> {registroSeleccionado.usuarios?.nombre}</p>
              {registroSeleccionado.observaciones && (
                <p><strong>Observaciones:</strong> {registroSeleccionado.observaciones}</p>
              )}
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Detalles ({detalles.length}):</h3>

            {cargandoDetalles ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⛑️</span>
                <p>Cargando detalles...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {detalles.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                    No hay detalles registrados
                  </p>
                ) : (
                  detalles.map((detalle, index) => (
                    <div key={detalle.id || index} style={{
                      padding: '1rem',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      {registroSeleccionado.tipo === 'INICIO' ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{detalle.equipo?.nombre || 'Equipo sin nombre'}</span>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              backgroundColor: detalle.estado ? '#dcfce7' : '#fee2e2',
                              color: detalle.estado ? '#166534' : '#991b1b'
                            }}>
                              {detalle.estado ? '✓ Presente' : '✗ Ausente'}
                            </span>
                          </div>
                          {detalle.equipo?.descripcion && (
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                              {detalle.equipo.descripcion}
                            </p>
                          )}
                          {detalle.comentario && (
                            <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#666', marginTop: '0.25rem' }}>
                              📝 {detalle.comentario}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{detalle.insumo?.nombre || 'Insumo sin nombre'}</span>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              backgroundColor: '#e5e7eb',
                              color: '#374151'
                            }}>
                              {detalle.insumo?.categoria || 'Sin categoría'}
                            </span>
                          </div>
                          
                          {detalle.insumo?.descripcion && (
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                              {detalle.insumo.descripcion}
                            </p>
                          )}
                          
                          <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                            Cantidad registrada: <strong>{detalle.cantidad_registrada}</strong>
                          </p>
                          
                          {detalle.comentario && (
                            <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#666', marginTop: '0.25rem' }}>
                              📝 {detalle.comentario}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <button
              onClick={cerrarModal}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#b22222',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </SubadminLayout>
  )
}