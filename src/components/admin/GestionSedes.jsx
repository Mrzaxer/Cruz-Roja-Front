import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'

export default function GestionSedes() {
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [sedeEditando, setSedeEditando] = useState(null)
  const [formData, setFormData] = useState({ nombre: '', ubicacion: '' })

  useEffect(() => {
    cargarSedes()
  }, [])

  const cargarSedes = async () => {
    const { data } = await supabase
      .from('sedes')
      .select('*')
      .order('nombre')
    setSedes(data || [])
    setCargando(false)
  }

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
    
    setModalAbierto(false)
    setSedeEditando(null)
    setFormData({ nombre: '', ubicacion: '' })
    cargarSedes()
  }

  const handleEditar = (sede) => {
    setSedeEditando(sede)
    setFormData({ nombre: sede.nombre, ubicacion: sede.ubicacion || '' })
    setModalAbierto(true)
  }

  const handleEliminar = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta sede?')) {
      await supabase.from('sedes').delete().eq('id', id)
      cargarSedes()
    }
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Sedes">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando sedes...</p>
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
          <button 
            className="btn-primary"
            onClick={() => {
              setSedeEditando(null)
              setFormData({ nombre: '', ubicacion: '' })
              setModalAbierto(true)
            }}
          >
            <span>+</span> Nueva Sede
          </button>
        </div>

        <div className="table-responsive">
          <table>
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
                  <td>
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

      {/* Modal */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{sedeEditando ? 'Editar Sede' : 'Nueva Sede'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre de la sede</label>
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
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {sedeEditando ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}