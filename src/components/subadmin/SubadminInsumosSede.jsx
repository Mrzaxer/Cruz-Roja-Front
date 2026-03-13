import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'

export default function SubadminInsumosSede() {
  const { user } = useAuth()
  const [insumosSede, setInsumosSede] = useState([])
  const [insumosInactivos, setInsumosInactivos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [cantidadEdit, setCantidadEdit] = useState(1) // Valor mínimo 1
  const [vista, setVista] = useState('activos')

  useEffect(() => {
    if (user?.sede_id) cargarDatos()
  }, [user])

  const cargarDatos = async () => {
    // Cargar TODOS los insumos globales (activos e inactivos)
    const { data: todosInsumos } = await supabase
      .from('insumos')
      .select('*')
      .order('categoria')
      .order('nombre')

    // Cargar configuraciones de la sede
    const { data: configurados } = await supabase
      .from('insumos_por_sede')
      .select('*')
      .eq('sede_id', user.sede_id)

    // Separar activos e inactivos
    const activos = []
    const inactivos = []

    todosInsumos?.forEach(insumo => {
      const config = (configurados || []).find(c => c.insumo_id === insumo.id)
      
      // Si el admin lo desactivó globalmente, no aparece
      if (insumo.activo === false) return

      // Determinar si está activo en la sede
      // Por defecto, si no hay config, está activo (true)
      const activoEnSede = config ? config.activo_en_sede !== false : true
      
      // Para activos, la cantidad mínima es 1
      // Si no hay config o la cantidad es 0, se asigna 1 por defecto
      let cantidad = config?.cantidad_establecida || 1
      if (cantidad < 1) cantidad = 1

      const insumoConConfig = {
        ...insumo,
        cantidad_establecida: cantidad,
        config_id: config?.id,
        activo_en_sede: activoEnSede
      }

      if (activoEnSede) {
        activos.push(insumoConConfig)
      } else {
        inactivos.push(insumoConConfig)
      }
    })

    setInsumosSede(activos)
    setInsumosInactivos(inactivos)
    setCargando(false)
  }

  const guardarCantidad = async (insumoId, cantidad) => {
    // Validar que la cantidad sea al menos 1
    if (cantidad < 1) {
      alert('La cantidad debe ser al menos 1')
      return
    }

    const insumo = insumosSede.find(i => i.id === insumoId)
    const existe = insumo?.config_id

    if (existe) {
      // Actualizar
      await supabase
        .from('insumos_por_sede')
        .update({ 
          cantidad_establecida: cantidad,
          activo_en_sede: true 
        })
        .eq('insumo_id', insumoId)
        .eq('sede_id', user.sede_id)
    } else {
      // Insertar
      await supabase
        .from('insumos_por_sede')
        .insert([{
          sede_id: user.sede_id,
          insumo_id: insumoId,
          cantidad_establecida: cantidad,
          activo_en_sede: true
        }])
    }

    setEditando(null)
    cargarDatos()
  }

  const toggleActivoSede = async (insumoId, estaActivo) => {
    const insumo = [...insumosSede, ...insumosInactivos].find(i => i.id === insumoId)
    const existe = insumo?.config_id

    if (existe) {
      // Actualizar estado
      await supabase
        .from('insumos_por_sede')
        .update({ 
          activo_en_sede: !estaActivo,
          // Si se desactiva, la cantidad no importa
          // Si se activa, aseguramos cantidad mínima 1
          cantidad_establecida: !estaActivo ? 1 : insumo.cantidad_establecida
        })
        .eq('insumo_id', insumoId)
        .eq('sede_id', user.sede_id)
    } else {
      // Insertar con estado contrario
      await supabase
        .from('insumos_por_sede')
        .insert([{
          sede_id: user.sede_id,
          insumo_id: insumoId,
          cantidad_establecida: 1, // Siempre 1 al activar
          activo_en_sede: !estaActivo
        }])
    }

    cargarDatos()
  }

  const agruparPorCategoria = (lista) => {
    return lista.reduce((acc, insumo) => {
      if (!acc[insumo.categoria]) {
        acc[insumo.categoria] = []
      }
      acc[insumo.categoria].push(insumo)
      return acc
    }, {})
  }

  if (cargando) {
    return (
      <SubadminLayout titulo="Insumos por Sede">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p>Cargando insumos...</p>
          </div>
        </div>
      </SubadminLayout>
    )
  }

  const insumosActivosPorCategoria = agruparPorCategoria(insumosSede)
  const insumosInactivosPorCategoria = agruparPorCategoria(insumosInactivos)

  return (
    <SubadminLayout 
      titulo="Configuración de Insumos por Sede"
      subtitulo={`Define cantidades y activa/desactiva insumos para ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="insumos-sede-container">
        
        {/* Banner informativo */}
        <div className="insumos-banner" style={{ marginBottom: '2rem' }}>
          <div className="insumos-banner-icon">📦</div>
          <div className="insumos-banner-text">
            <h2>Gestión de Insumos</h2>
            <p>Los insumos activos deben tener cantidad mínima de 1</p>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setVista('activos')}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: vista === 'activos' ? '#b22222' : 'white',
              color: vista === 'activos' ? 'white' : '#b22222',
              border: '2px solid #b22222',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              flex: 1
            }}
          >
            📋 ACTIVOS ({insumosSede.length})
          </button>
          <button
            onClick={() => setVista('inactivos')}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: vista === 'inactivos' ? '#6b7280' : 'white',
              color: vista === 'inactivos' ? 'white' : '#6b7280',
              border: '2px solid #6b7280',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              flex: 1
            }}
          >
            ⚪ INACTIVOS ({insumosInactivos.length})
          </button>
        </div>

        {/* Vista de activos */}
        {vista === 'activos' && (
          <>
            {Object.keys(insumosActivosPorCategoria).length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📦</span>
                <p>No hay insumos activos en esta sede</p>
              </div>
            ) : (
              Object.keys(insumosActivosPorCategoria).map(categoria => (
                <div key={categoria} style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ 
                    fontSize: '1.3rem', 
                    color: '#b22222', 
                    borderBottom: '2px solid #b22222',
                    paddingBottom: '0.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>📋</span>
                    {categoria}
                  </h3>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {insumosActivosPorCategoria[categoria].map(insumo => (
                      <div 
                        key={insumo.id}
                        style={{
                          backgroundColor: '#f9f9f9',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ flex: 2, minWidth: '250px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1.1rem' }}>{insumo.nombre}</strong>
                            {insumo.obligatorio_global && (
                              <span style={{
                                backgroundColor: '#fee2e2',
                                color: '#b22222',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                🔴 OBLIGATORIO
                              </span>
                            )}
                          </div>
                          
                          {insumo.descripcion && (
                            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                              {insumo.descripcion}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          {editando === insumo.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="number"
                                min="1" // Mínimo 1 en el input
                                value={cantidadEdit}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  if (val >= 1) setCantidadEdit(val)
                                }}
                                style={{
                                  width: '80px',
                                  padding: '0.5rem',
                                  border: '2px solid #b22222',
                                  borderRadius: '4px'
                                }}
                              />
                              <button
                                onClick={() => guardarCantidad(insumo.id, cantidadEdit)}
                                style={{
                                  backgroundColor: '#b22222',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditando(null)}
                                style={{
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <>
                              <div style={{ textAlign: 'center', minWidth: '100px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Cantidad</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.3rem' }}>
                                  {insumo.cantidad_establecida}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setEditando(insumo.id)
                                  setCantidadEdit(insumo.cantidad_establecida)
                                }}
                                style={{
                                  backgroundColor: '#b22222',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Editar
                              </button>

                              {!insumo.obligatorio_global && (
                                <button
                                  onClick={() => toggleActivoSede(insumo.id, true)}
                                  style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⚪ Desactivar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Vista de inactivos */}
        {vista === 'inactivos' && (
          <>
            {Object.keys(insumosInactivosPorCategoria).length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⚪</span>
                <p>No hay insumos inactivos en esta sede</p>
              </div>
            ) : (
              Object.keys(insumosInactivosPorCategoria).map(categoria => (
                <div key={categoria} style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ 
                    fontSize: '1.3rem', 
                    color: '#6b7280', 
                    borderBottom: '2px solid #6b7280',
                    paddingBottom: '0.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>⚪</span>
                    {categoria} (Inactivos)
                  </h3>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {insumosInactivosPorCategoria[categoria].map(insumo => (
                      <div 
                        key={insumo.id}
                        style={{
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          padding: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                          opacity: 0.8
                        }}
                      >
                        <div style={{ flex: 2, minWidth: '250px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1.1rem', color: '#6b7280' }}>{insumo.nombre}</strong>
                            {insumo.obligatorio_global && (
                              <span style={{
                                backgroundColor: '#fee2e2',
                                color: '#b22222',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                🔴 OBLIGATORIO
                              </span>
                            )}
                          </div>
                          
                          {insumo.descripcion && (
                            <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                              {insumo.descripcion}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => toggleActivoSede(insumo.id, false)}
                          style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Activar (Cantidad 1)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

      </div>
    </SubadminLayout>
  )
}