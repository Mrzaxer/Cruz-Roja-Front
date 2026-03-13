import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'

export default function SubadminAmbulancias() {
  const { user } = useAuth()
  const [ambulancias, setAmbulancias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ambulanciaEditando, setAmbulanciaEditando] = useState(null)
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    placa: '',
    estado: 'ACTIVA'
  })

  useEffect(() => {
    if (user?.sede_id) cargarAmbulancias()
  }, [user])

  const cargarAmbulancias = async () => {
    const { data } = await supabase
      .from('ambulancias')
      .select('*')
      .eq('sede_id', user.sede_id)
      .order('codigo')

    setAmbulancias(data || [])
    setCargando(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (ambulanciaEditando) {
      await supabase
        .from('ambulancias')
        .update(formData)
        .eq('id', ambulanciaEditando.id)
    } else {
      await supabase
        .from('ambulancias')
        .insert([{ ...formData, sede_id: user.sede_id }])
    }
    
    setModalAbierto(false)
    setAmbulanciaEditando(null)
    setFormData({ codigo: '', descripcion: '', placa: '', estado: 'ACTIVA' })
    cargarAmbulancias()
  }

  const handleEditar = (ambulancia) => {
    setAmbulanciaEditando(ambulancia)
    setFormData({
      codigo: ambulancia.codigo,
      descripcion: ambulancia.descripcion || '',
      placa: ambulancia.placa || '',
      estado: ambulancia.estado
    })
    setModalAbierto(true)
  }

  const handleEliminar = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta ambulancia?')) {
      await supabase.from('ambulancias').delete().eq('id', id)
      cargarAmbulancias()
    }
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
      <SubadminLayout titulo="Gestión de Ambulancias">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p>Cargando ambulancias...</p>
          </div>
        </div>
      </SubadminLayout>
    )
  }

  return (
    <SubadminLayout 
      titulo="Gestión de Ambulancias"
      subtitulo={`Ambulancias de ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="crud-container">
        <div className="crud-header">
          <h3>Lista de Ambulancias</h3>
          <button 
            className="btn-primary"
            onClick={() => {
              setAmbulanciaEditando(null)
              setFormData({ codigo: '', descripcion: '', placa: '', estado: 'ACTIVA' })
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
                    <td>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditar(amb)}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleEliminar(amb.id)}
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
                <label>Código</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  placeholder="Ej: GDL-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Placa</label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({...formData, placa: e.target.value})}
                  placeholder="Ej: JNC-45A"
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
    </SubadminLayout>
  )
}