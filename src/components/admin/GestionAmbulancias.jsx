import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'

export default function GestionAmbulancias() {
  const [ambulancias, setAmbulancias] = useState([])
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ambulanciaEditando, setAmbulanciaEditando] = useState(null)
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    placa: '',
    estado: 'ACTIVA',
    sede_id: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const [ambulanciasRes, sedesRes] = await Promise.all([
      supabase.from('ambulancias').select('*, sedes(nombre)').order('codigo'),
      supabase.from('sedes').select('*').order('nombre')
    ])
    setAmbulancias(ambulanciasRes.data || [])
    setSedes(sedesRes.data || [])
    setCargando(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (ambulanciaEditando) {
      await supabase.from('ambulancias').update(formData).eq('id', ambulanciaEditando.id)
    } else {
      await supabase.from('ambulancias').insert([formData])
    }
    
    setModalAbierto(false)
    setAmbulanciaEditando(null)
    setFormData({ codigo: '', descripcion: '', placa: '', estado: 'ACTIVA', sede_id: '' })
    cargarDatos()
  }

  const getEstadoStyle = (estado) => {
    switch(estado) {
      case 'ACTIVA': return { bg: '#dcfce7', color: '#166534', text: 'Activa' }
      case 'INACTIVA': return { bg: '#f3f4f6', color: '#4b5563', text: 'Inactiva' }
      case 'MANTENIMIENTO': return { bg: '#fef9c3', color: '#854d0e', text: 'Mantenimiento' }
      default: return { bg: '#f3f4f6', color: '#4b5563', text: estado }
    }
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Ambulancias">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando ambulancias...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      titulo="Gestión de Ambulancias"
      subtitulo="Control de flotilla de ambulancias"
    >
      <div className="crud-container">
        <div className="crud-header">
          <h3>Lista de Ambulancias</h3>
          <button 
            className="btn-primary"
            onClick={() => {
              setAmbulanciaEditando(null)
              setFormData({ codigo: '', descripcion: '', placa: '', estado: 'ACTIVA', sede_id: '' })
              setModalAbierto(true)
            }}
          >
            <span>+</span> Nueva Ambulancia
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Placa</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Sede</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ambulancias.map(amb => {
                const estadoStyle = getEstadoStyle(amb.estado)
                return (
                  <tr key={amb.id}>
                    <td><strong>{amb.codigo}</strong></td>
                    <td>{amb.placa || '-'}</td>
                    <td>{amb.descripcion || '-'}</td>
                    <td>
                      <span style={{
                        backgroundColor: estadoStyle.bg,
                        color: estadoStyle.color,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {estadoStyle.text}
                      </span>
                    </td>
                    <td>{amb.sedes?.nombre || 'Sin sede'}</td>
                    <td>
                      <button 
                        className="btn-edit"
                        onClick={() => {
                          setAmbulanciaEditando(amb)
                          setFormData({
                            codigo: amb.codigo,
                            descripcion: amb.descripcion || '',
                            placa: amb.placa || '',
                            estado: amb.estado,
                            sede_id: amb.sede_id || ''
                          })
                          setModalAbierto(true)
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => {
                          if (confirm('¿Estás seguro de eliminar esta ambulancia?')) {
                            supabase.from('ambulancias').delete().eq('id', amb.id)
                              .then(() => cargarDatos())
                          }
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{ambulanciaEditando ? 'Editar Ambulancia' : 'Nueva Ambulancia'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Código de ambulancia</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  placeholder="Ej: SJ-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Placa</label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({...formData, placa: e.target.value})}
                  placeholder="Ej: ABC-123"
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Ej: Ambulancia de soporte básico"
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                </select>
              </div>
              <div className="form-group">
                <label>Sede</label>
                <select
                  value={formData.sede_id}
                  onChange={(e) => setFormData({...formData, sede_id: e.target.value})}
                  required
                >
                  <option value="">Seleccione una sede</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {ambulanciaEditando ? 'Guardar Cambios' : 'Crear Ambulancia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}