import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'
import '../../styles/GestionInsumos.css'

export default function GestionInsumos() {

  const [insumos, setInsumos] = useState([])
  const [sedes, setSedes] = useState([]) // Agregar estado para sedes
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Manejo de Vía Aérea')
  const [obligatorioGlobal, setObligatorioGlobal] = useState(true)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    cargarInsumos()
    cargarSedes() // Cargar sedes
  }, [])

  const cargarSedes = async () => {
    const { data } = await supabase.from('sedes').select('id')
    setSedes(data || [])
  }

  const cargarInsumos = async () => {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('categoria')
      .order('nombre')

    setInsumos(data || [])
  }

  const crearInsumo = async () => {

    if (!nombre) {
      alert('El nombre es obligatorio')
      return
    }

    setCargando(true)

    // 1. Crear el insumo
    const { data: nuevoInsumo, error: errorInsumo } = await supabase
      .from('insumos')
      .insert([
        {
          nombre,
          descripcion,
          categoria,
          obligatorio_global: obligatorioGlobal,
          activo: true
        }
      ])
      .select()
      .single()

    if (errorInsumo) {
      alert('Error al crear insumo: ' + errorInsumo.message)
      console.log(errorInsumo)
      setCargando(false)
      return
    }

    // 2. Insertar configuración por defecto en TODAS las sedes (cantidad = 1, activo = true)
    if (sedes.length > 0 && nuevoInsumo) {
      const configsPorSede = sedes.map(sede => ({
        sede_id: sede.id,
        insumo_id: nuevoInsumo.id,
        cantidad_establecida: 1,
        activo_en_sede: true
      }))

      const { error: errorConfig } = await supabase
        .from('insumos_por_sede')
        .insert(configsPorSede)

      if (errorConfig) {
        console.error('Error al crear configuraciones por sede:', errorConfig)
        // No alertamos al usuario porque el insumo ya se creó
      }
    }

    alert('Insumo creado correctamente con cantidad 1 en todas las sedes')

    setNombre('')
    setDescripcion('')
    setCategoria('Manejo de Vía Aérea')
    setObligatorioGlobal(true)

    cargarInsumos()
    setCargando(false)
  }

  const toggleActivo = async (id, estadoActual) => {

    await supabase
      .from('insumos')
      .update({ activo: !estadoActual })
      .eq('id', id)

    cargarInsumos()
  }

  return (
    <AdminLayout 
      titulo="Gestión de Insumos"
      subtitulo="Administra el catálogo global de insumos"
    >
      <div className="insumos-container">
        
        <div className="insumos-banner">
          <div className="insumos-banner-icon">💉</div>
          <div className="insumos-banner-text">
            <h2>Catálogo de Insumos</h2>
            <p>Gestiona los insumos médicos disponibles</p>
          </div>
        </div>

        <div className="insumos-grid">
          
          <div className="insumos-card">
            <div className="insumos-card-header">
              <span>➕</span>
              <h3>Nuevo Insumo</h3>
            </div>
            
            <div className="insumos-card-body">
              <div className="insumos-form">
                
                <div className="form-group">
                  <label>Nombre del insumo *</label>
                  <input
                    placeholder="Ej: Guantes estériles"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <input
                    placeholder="Descripción del insumo"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                  >
                    <option value="Manejo de Vía Aérea">Manejo de Vía Aérea</option>
                    <option value="Manejo Intravenoso e Intramuscular">Manejo Intravenoso e Intramuscular</option>
                    <option value="Soluciones">Soluciones</option>
                    <option value="Curaciones y Varios">Curaciones y Varios</option>
                    <option value="Limpieza y Desinfección">Limpieza y Desinfección</option>
                    <option value="Medicamentos">Medicamentos</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={obligatorioGlobal}
                    onChange={e => setObligatorioGlobal(e.target.value === 'true')}
                  >
                    <option value="true">🔴 Obligatorio en todas las sedes</option>
                    <option value="false">⚪ Opcional por sede</option>
                  </select>
                </div>

                <button 
                  onClick={crearInsumo} 
                  disabled={cargando}
                  className="btn-crear"
                >
                  {cargando ? (
                    <>
                      ⏳ Creando...
                    </>
                  ) : (
                    <>
                      ➕ Crear Insumo
                    </>
                  )}
                </button>

              </div>
            </div>
          </div>

          <div className="insumos-list-card">
            <div className="insumos-list-header">
              <span>📋</span>
              <h3>Lista de Insumos ({insumos.length})</h3>
            </div>

            <div className="insumos-list-body">
              {insumos.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📦</span>
                  <p>No hay insumos registrados</p>
                </div>
              ) : (
                insumos.map(insumo => (
                  <div
                    key={insumo.id}
                    className={`insumo-item ${!insumo.activo ? 'inactivo' : ''}`}
                  >
                    <div className="insumo-header">
                      <strong>{insumo.nombre}</strong>
                      <span className={`insumo-badge ${insumo.obligatorio_global ? 'obligatorio' : 'opcional'}`}>
                        {insumo.obligatorio_global ? '🔴 Obligatorio' : '⚪ Opcional'}
                      </span>
                    </div>

                    {insumo.descripcion && (
                      <div className="insumo-descripcion">
                        {insumo.descripcion}
                      </div>
                    )}

                    <div className="insumo-detalles">
                      <span>Categoría: {insumo.categoria}</span>
                    </div>

                    <div className="insumo-acciones">
                      <button
                        onClick={() => toggleActivo(insumo.id, insumo.activo)}
                        className={`btn-toggle ${!insumo.activo ? 'activar' : ''}`}
                      >
                        {insumo.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  )
}