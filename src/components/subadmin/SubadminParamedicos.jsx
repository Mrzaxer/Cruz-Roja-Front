import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'

export default function SubadminParamedicos() {
  const { user } = useAuth()
  const [paramedicos, setParamedicos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [paramedicoEditando, setParamedicoEditando] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    activo: true
  })

  useEffect(() => {
    if (user?.sede_id) cargarParamedicos()
  }, [user])

  const cargarParamedicos = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('sede_id', user.sede_id)
      .eq('rol', 'PARAMEDICO')
      .order('nombre')

    setParamedicos(data || [])
    setCargando(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (paramedicoEditando) {
      const updateData = { ...formData }
      if (!updateData.password) delete updateData.password
      await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', paramedicoEditando.id)
    } else {
      await supabase
        .from('usuarios')
        .insert([{
          ...formData,
          rol: 'PARAMEDICO',
          sede_id: user.sede_id
        }])
    }
    
    setModalAbierto(false)
    setParamedicoEditando(null)
    setFormData({ nombre: '', correo: '', password: '', activo: true })
    cargarParamedicos()
  }

  const handleEditar = (paramedico) => {
    setParamedicoEditando(paramedico)
    setFormData({
      nombre: paramedico.nombre,
      correo: paramedico.correo,
      password: '',
      activo: paramedico.activo
    })
    setModalAbierto(true)
  }

  const toggleActivo = async (id, estadoActual) => {
    await supabase
      .from('usuarios')
      .update({ activo: !estadoActual })
      .eq('id', id)
    cargarParamedicos()
  }

  if (cargando) {
    return (
      <SubadminLayout titulo="Gestión de Paramédicos">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p>Cargando paramédicos...</p>
          </div>
        </div>
      </SubadminLayout>
    )
  }

  return (
    <SubadminLayout 
      titulo="Gestión de Paramédicos"
      subtitulo={`Personal de ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="crud-container">
        <div className="crud-header">
          <h3>Lista de Paramédicos</h3>
          <button 
            className="btn-primary"
            onClick={() => {
              setParamedicoEditando(null)
              setFormData({ nombre: '', correo: '', password: '', activo: true })
              setModalAbierto(true)
            }}
          >
            <span>+</span> Nuevo Paramédico
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paramedicos.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.correo}</td>
                  <td>
                    <span style={{
                      backgroundColor: p.activo ? '#dcfce7' : '#fee2e2',
                      color: p.activo ? '#166534' : '#991b1b',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-edit"
                      onClick={() => handleEditar(p)}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn-toggle"
                      onClick={() => toggleActivo(p.id, p.activo)}
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
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
            <h3>{paramedicoEditando ? 'Editar Paramédico' : 'Nuevo Paramédico'}</h3>
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
                <label>Contraseña {paramedicoEditando && '(dejar vacío para no cambiar)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!paramedicoEditando}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {paramedicoEditando ? 'Guardar Cambios' : 'Crear Paramédico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SubadminLayout>
  )
}