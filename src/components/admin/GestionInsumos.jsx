/**
 * @component GestionInsumos
 * @description Gestión completa del catálogo global de insumos médicos:
 *              - Crear insumos con categorías y tipos (obligatorio/opcional)
 *              - Editar insumos existentes
 *              - Al crear un insumo, se asigna automáticamente cantidad 1 en todas las sedes
 *              - Activar/desactivar insumos del catálogo
 * @returns {JSX.Element}
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'
import '../../styles/GestionInsumos.css'

export default function GestionInsumos() {
  // ===== ESTADOS =====
  const [insumos, setInsumos] = useState([])
  const [sedes, setSedes] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Manejo de Vía Aérea')
  const [obligatorioGlobal, setObligatorioGlobal] = useState(true)
  const [cargando, setCargando] = useState(false)
  
  // Estados para edición
  const [editando, setEditando] = useState(false)
  const [insumoEditandoId, setInsumoEditandoId] = useState(null)
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false)

  // ===== CARGA INICIAL =====
  useEffect(() => {
    cargarInsumos()
    cargarSedes()
  }, [])

  /**
   * Carga todas las sedes (para asignar insumos automáticamente)
   */
  const cargarSedes = async () => {
    const { data } = await supabase.from('sedes').select('id')
    setSedes(data || [])
  }

  /**
   * Carga el catálogo de insumos ordenado por categoría y nombre
   */
  const cargarInsumos = async () => {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('categoria')
      .order('nombre')

    setInsumos(data || [])
  }

  /**
   * Crea un nuevo insumo y lo asigna automáticamente a todas las sedes con cantidad 1
   */
  const crearInsumo = async () => {
    if (!nombre) {
      alert('El nombre es obligatorio')
      return
    }

    setCargando(true)

    // 1. Crear el insumo en catálogo global
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
      }
    }

    alert('Insumo creado correctamente con cantidad 1 en todas las sedes')

    // Limpiar formulario
    limpiarFormulario()
    cargarInsumos()
    setCargando(false)
  }

  /**
   * Abre el modal de edición con los datos del insumo
   * @param {Object} insumo - Insumo a editar
   */
  const abrirModalEdicion = (insumo) => {
    setEditando(true)
    setInsumoEditandoId(insumo.id)
    setNombre(insumo.nombre)
    setDescripcion(insumo.descripcion || '')
    setCategoria(insumo.categoria)
    setObligatorioGlobal(insumo.obligatorio_global)
    setModalEdicionAbierto(true)
  }

  /**
   * Actualiza un insumo existente
   */
  const actualizarInsumo = async () => {
    if (!nombre) {
      alert('El nombre es obligatorio')
      return
    }

    setCargando(true)

    const { error } = await supabase
      .from('insumos')
      .update({
        nombre,
        descripcion,
        categoria,
        obligatorio_global: obligatorioGlobal
      })
      .eq('id', insumoEditandoId)

    if (error) {
      alert('Error al actualizar insumo: ' + error.message)
      setCargando(false)
      return
    }

    alert('Insumo actualizado correctamente')
    cerrarModalEdicion()
    limpiarFormulario()
    cargarInsumos()
    setCargando(false)
  }

  /**
   * Cierra el modal de edición y limpia los estados
   */
  const cerrarModalEdicion = () => {
    setModalEdicionAbierto(false)
    setEditando(false)
    setInsumoEditandoId(null)
    limpiarFormulario()
  }

  /**
   * Limpia el formulario de creación
   */
  const limpiarFormulario = () => {
    setNombre('')
    setDescripcion('')
    setCategoria('Manejo de Vía Aérea')
    setObligatorioGlobal(true)
  }

  /**
   * Activa o desactiva un insumo del catálogo global
   * @param {number} id - ID del insumo
   * @param {boolean} estadoActual - Estado actual del insumo
   */
  const toggleActivo = async (id, estadoActual) => {
    await supabase
      .from('insumos')
      .update({ activo: !estadoActual })
      .eq('id', id)

    cargarInsumos()
  }

  // ===== RENDER =====
  return (
    <AdminLayout 
      titulo="Gestión de Insumos"
      subtitulo="Administra el catálogo global de insumos"
    >
      <div className="insumos-container">
        
        {/* BANNER */}
        <div className="insumos-banner">
          <div className="insumos-banner-icon">💉</div>
          <div className="insumos-banner-text">
            <h2>Catálogo de Insumos</h2>
            <p>Gestiona los insumos médicos disponibles</p>
          </div>
        </div>

        <div className="insumos-grid">
          
          {/* COLUMNA DE CREACIÓN */}
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
                    type="text"
                    placeholder="Ej: Guantes estériles"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    placeholder="Descripción del insumo"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)}>
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
                  {cargando ? '⏳ Creando...' : '➕ Crear Insumo'}
                </button>

              </div>
            </div>
          </div>

          {/* COLUMNA DE LISTADO */}
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
                      <div className="insumo-nombre">
                        <strong>{insumo.nombre}</strong>
                        <span className={`insumo-badge ${insumo.obligatorio_global ? 'obligatorio' : 'opcional'}`}>
                          {insumo.obligatorio_global ? '🔴 Obligatorio' : '⚪ Opcional'}
                        </span>
                      </div>
                      <div className="insumo-acciones-header">
                        <button
                          onClick={() => abrirModalEdicion(insumo)}
                          className="btn-editar"
                          title="Editar insumo"
                        >
                          Editar
                        </button>
                      </div>
                    </div>

                    {insumo.descripcion && (
                      <div className="insumo-descripcion">
                        {insumo.descripcion}
                      </div>
                    )}

                    <div className="insumo-detalles">
                      <div className="insumo-detalle">
                        📂 Categoría: <span>{insumo.categoria}</span>
                      </div>
                    </div>

                    <div className="insumo-acciones-footer">
                      <button
                        onClick={() => toggleActivo(insumo.id, insumo.activo)}
                        className={`btn-toggle ${!insumo.activo ? 'activar' : ''}`}
                      >
                        {insumo.activo ? '🔴 Desactivar' : '🟢 Activar'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {modalEdicionAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Editar Insumo</h3>
              <button className="modal-close" onClick={cerrarModalEdicion}>×</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); actualizarInsumo(); }}>
              <div className="form-group">
                <label>Nombre del insumo *</label>
                <input
                  type="text"
                  placeholder="Ej: Guantes estériles"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  placeholder="Descripción del insumo"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}>
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

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cerrarModalEdicion}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}