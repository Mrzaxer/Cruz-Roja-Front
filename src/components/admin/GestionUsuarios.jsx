/**
 * @component GestionUsuarios
 * @description CRUD completo para la gestión de usuarios del sistema:
 *              - Listado de usuarios con nombre, correo, rol, sede y estado
 *              - Crear nuevos usuarios (ADMIN, SUBADMIN, PARAMEDICO)
 *              - Editar usuarios existentes
 *              - Eliminar usuarios (con confirmación)
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'

export default function GestionUsuarios() {
  // ===== ESTADOS =====
  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    rol: 'PARAMEDICO',
    sede_id: '',
    activo: true
  })

  // ===== CARGA INICIAL =====
  useEffect(() => {
    cargarDatos()
  }, [])

  /**
   * Carga usuarios y sedes desde Supabase
   */
  const cargarDatos = async () => {
    const [usuariosRes, sedesRes] = await Promise.all([
      supabase.from('usuarios').select('*, sedes(nombre)').order('nombre'),
      supabase.from('sedes').select('*').order('nombre')
    ])
    setUsuarios(usuariosRes.data || [])
    setSedes(sedesRes.data || [])
    setCargando(false)
  }

  /**
   * Guarda o actualiza un usuario
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (usuarioEditando) {
      const updateData = { ...formData }
      if (!updateData.password) delete updateData.password
      await supabase.from('usuarios').update(updateData).eq('id', usuarioEditando.id)
    } else {
      await supabase.from('usuarios').insert([formData])
    }
    
    cerrarModal()
    cargarDatos()
  }

  /**
   * Elimina un usuario previa confirmación
   * @param {number} id - ID del usuario a eliminar
   */
  const eliminarUsuario = async (id) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await supabase.from('usuarios').delete().eq('id', id)
      cargarDatos()
    }
  }

  /**
   * Abre el modal para editar un usuario
   * @param {Object} usuario - Datos del usuario a editar
   */
  const abrirModalEditar = (usuario) => {
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
  }

  /**
   * Abre el modal para crear un nuevo usuario
   */
  const abrirModalNuevo = () => {
    setUsuarioEditando(null)
    setFormData({
      nombre: '',
      correo: '',
      password: '',
      rol: 'PARAMEDICO',
      sede_id: '',
      activo: true
    })
    setModalAbierto(true)
  }

  /**
   * Cierra el modal y limpia los estados
   */
  const cerrarModal = () => {
    setModalAbierto(false)
    setUsuarioEditando(null)
    setFormData({
      nombre: '',
      correo: '',
      password: '',
      rol: 'PARAMEDICO',
      sede_id: '',
      activo: true
    })
  }

  /**
   * Obtiene los estilos visuales según el rol del usuario
   * @param {string} rol - Rol del usuario (ADMIN, SUBADMIN, PARAMEDICO)
   * @returns {Object} Estilos CSS y texto
   */
  const getRolClass = (rol) => {
    switch(rol) {
      case 'ADMIN': 
        return { bg: '#fee2e2', color: '#b91c1c', text: 'Administrador' }
      case 'SUBADMIN': 
        return { bg: '#dbeafe', color: '#1e40af', text: 'Subadministrador' }
      case 'PARAMEDICO': 
        return { bg: '#dcfce7', color: '#166534', text: 'Paramédico' }
      default: 
        return { bg: '#f3f4f6', color: '#4b5563', text: rol }
    }
  }

  /**
   * Obtiene los estilos visuales según el estado del usuario
   * @param {boolean} activo - Estado del usuario
   * @returns {Object} Estilos CSS y texto
   */
  const getEstadoStyle = (activo) => {
    return {
      bg: activo ? '#dcfce7' : '#fee2e2',
      color: activo ? '#166534' : '#991b1b',
      text: activo ? 'Activo' : 'Inactivo'
    }
  }

  // ===== RENDER =====
  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Usuarios">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando usuarios...</p>
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
          <button className="btn-primary" onClick={abrirModalNuevo}>
            <span>+</span> Nuevo Usuario
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
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
                const estadoStyle = getEstadoStyle(usuario.activo)
                return (
                  <tr key={usuario.id}>
                    <td>
                      <strong>{usuario.nombre}</strong>
                    </td>
                    <td>{usuario.correo}</td>
                    <td>
                      <span className="rol-badge" style={{
                        backgroundColor: rolStyle.bg,
                        color: rolStyle.color
                      }}>
                        {rolStyle.text}
                      </span>
                    </td>
                    <td>{usuario.sedes?.nombre || 'Sin sede'}</td>
                    <td>
                      <span className="estado-badge" style={{
                        backgroundColor: estadoStyle.bg,
                        color: estadoStyle.color
                      }}>
                        {estadoStyle.text}
                      </span>
                    </td>
                    <td className="acciones">
                      <button 
                        className="btn-edit"
                        onClick={() => abrirModalEditar(usuario)}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => eliminarUsuario(usuario.id)}
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

      {/* MODAL */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>{usuarioEditando ? '' : ''}</span>
              <h3>{usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={cerrarModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Juan Pérez García"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Correo electrónico *</label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  placeholder="Ej: juan.perez@cruzroja.mx"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  Contraseña {usuarioEditando && '(dejar vacío para no cambiar)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!usuarioEditando}
                  placeholder={usuarioEditando ? '••••••••' : 'Ingrese contraseña'}
                />
              </div>
              
              <div className="form-group">
                <label>Rol *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  required
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
                <small className="form-hint">
                  Los paramédicos deben tener una sede asignada
                </small>
              </div>
              
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.value === 'true'})}
                >
                  <option value="true">✅ Activo</option>
                  <option value="false">❌ Inactivo</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {usuarioEditando ? 'Guardar Cambios' : ' Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}