/**
 * @component GestionSedes
 * @description CRUD completo para la gestión de sedes:
 *              - Listado de sedes con ID, nombre y ubicación
 *              - Crear nuevas sedes
 *              - Editar sedes existentes
 *              - Eliminar sedes (con confirmación)
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'

export default function GestionSedes() {
  // ===== ESTADOS =====
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [sedeEditando, setSedeEditando] = useState(null)
  const [formData, setFormData] = useState({ nombre: '', ubicacion: '' })

  // ===== CARGA INICIAL =====
  useEffect(() => {
    cargarSedes()
  }, [])

  /**
   * Carga todas las sedes ordenadas por nombre
   */
  const cargarSedes = async () => {
    const { data } = await supabase
      .from('sedes')
      .select('*')
      .order('nombre')
    setSedes(data || [])
    setCargando(false)
  }

  /**
   * Guarda o actualiza una sede
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (sedeEditando) {
      await supabase
        .from('sedes')
        .update(formData)
        .eq('id', sedeEditando.id)
    } else {
      await supabase
        .from('sedes')
        .insert([formData])
    }
    
    cerrarModal()
    cargarSedes()
  }

  /**
   * Abre el modal para editar una sede
   * @param {Object} sede - Datos de la sede a editar
   */
  const handleEditar = (sede) => {
    setSedeEditando(sede)
    setFormData({ 
      nombre: sede.nombre, 
      ubicacion: sede.ubicacion || '' 
    })
    setModalAbierto(true)
  }

  /**
   * Elimina una sede previa confirmación
   * @param {number} id - ID de la sede a eliminar
   */
  const handleEliminar = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta sede?')) {
      await supabase.from('sedes').delete().eq('id', id)
      cargarSedes()
    }
  }

  /**
   * Abre el modal para crear una nueva sede
   */
  const abrirModalNuevo = () => {
    setSedeEditando(null)
    setFormData({ nombre: '', ubicacion: '' })
    setModalAbierto(true)
  }

  /**
   * Cierra el modal y limpia los estados
   */
  const cerrarModal = () => {
    setModalAbierto(false)
    setSedeEditando(null)
    setFormData({ nombre: '', ubicacion: '' })
  }

  // ===== RENDER =====
  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Sedes">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando sedes...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      titulo="Gestión de Sedes"
      subtitulo="Administre las sedes de la institución"
    >
      <div className="crud-container">
        <div className="crud-header">
          <h3>Lista de Sedes</h3>
          <button className="btn-primary" onClick={abrirModalNuevo}>
            <span>+</span> Nueva Sede
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sedes.map(sede => (
                <tr key={sede.id}>
                  <td>{sede.id}</td>
                  <td><strong>{sede.nombre}</strong></td>
                  <td>{sede.ubicacion || '-'}</td>
                  <td className="acciones">
                    <button 
                      className="btn-edit"
                      onClick={() => handleEditar(sede)}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleEliminar(sede.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>{sedeEditando ? '✏️' : '➕'}</span>
              <h3>{sedeEditando ? 'Editar Sede' : 'Nueva Sede'}</h3>
              <button className="modal-close" onClick={cerrarModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre de la sede *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Sede Central San José"
                  required
                />
              </div>
              <div className="form-group">
                <label>Ubicación</label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  placeholder="Ej: Av. Segunda, San José"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {sedeEditando ? '💾 Guardar Cambios' : '➕ Crear Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}