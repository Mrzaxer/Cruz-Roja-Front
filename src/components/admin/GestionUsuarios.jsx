import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    rol: 'PARAMEDICO',
    sede_id: '',
    activo: true
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const [usuariosRes, sedesRes] = await Promise.all([
      supabase.from('usuarios').select('*, sedes(nombre)').order('nombre'),
      supabase.from('sedes').select('*').order('nombre')
    ])
    setUsuarios(usuariosRes.data || [])
    setSedes(sedesRes.data || [])
    setCargando(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (usuarioEditando) {
      const updateData = { ...formData }
      if (!updateData.password) delete updateData.password
      await supabase.from('usuarios').update(updateData).eq('id', usuarioEditando.id)
    } else {
      await supabase.from('usuarios').insert([formData])
    }
    
    setModalAbierto(false)
    setUsuarioEditando(null)
    setFormData({
      nombre: '', correo: '', password: '', rol: 'PARAMEDICO', sede_id: '', activo: true
    })
    cargarDatos()
  }

  const getRolClass = (rol) => {
    switch(rol) {
      case 'ADMIN': return { bg: '#fee2e2', color: '#b91c1c', text: 'Administrador' }
      case 'SUBADMIN': return { bg: '#dbeafe', color: '#1e40af', text: 'Subadministrador' }
      case 'PARAMEDICO': return { bg: '#dcfce7', color: '#166534', text: 'Paramédico' }
      default: return { bg: '#f3f4f6', color: '#4b5563', text: rol }
    }
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Usuarios">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando usuarios...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      titulo="Gestión de Usuarios"
      subtitulo="Administre paramédicos y administradores"
    >
      <div className="crud-container">
        <div className="crud-header">
          <h3>Lista de Usuarios</h3>
          <button 
            className="btn-primary"
            onClick={() => {
              setUsuarioEditando(null)
              setFormData({
                nombre: '', correo: '', password: '', rol: 'PARAMEDICO', sede_id: '', activo: true
              })
              setModalAbierto(true)
            }}
          >
            <span>+</span> Nuevo Usuario
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Sede</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(usuario => {
                const rolStyle = getRolClass(usuario.rol)
                return (
                  <tr key={usuario.id}>
                    <td><strong>{usuario.nombre}</strong></td>
                    <td>{usuario.correo}</td>
                    <td>
                      <span style={{
                        backgroundColor: rolStyle.bg,
                        color: rolStyle.color,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {rolStyle.text}
                      </span>
                    </td>
                    <td>{usuario.sedes?.nombre || 'Sin sede'}</td>
                    <td>
                      <span style={{
                        backgroundColor: usuario.activo ? '#dcfce7' : '#fee2e2',
                        color: usuario.activo ? '#166534' : '#991b1b',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-edit"
                        onClick={() => {
                          setUsuarioEditando(usuario)
                          setFormData({
                            nombre: usuario.nombre,
                            correo: usuario.correo,
                            password: '',
                            rol: usuario.rol,
                            sede_id: usuario.sede_id || '',
                            activo: usuario.activo
                          })
                          setModalAbierto(true)
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => {
                          if (confirm('¿Estás seguro de eliminar este usuario?')) {
                            supabase.from('usuarios').delete().eq('id', usuario.id)
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
            <h3>{usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contraseña {usuarioEditando && '(dejar vacío para no cambiar)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!usuarioEditando}
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="SUBADMIN">Subadministrador</option>
                  <option value="PARAMEDICO">Paramédico</option>
                </select>
              </div>
              <div className="form-group">
                <label>Sede</label>
                <select
                  value={formData.sede_id}
                  onChange={(e) => setFormData({...formData, sede_id: e.target.value})}
                >
                  <option value="">Sin sede</option>
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
                  {usuarioEditando ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}