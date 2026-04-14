/**
 * @component SubadminParamedicos
 * @description CRUD completo para la gestión de paramédicos por sede (subadministrador).
 *              - Listado de paramédicos de la sede del subadmin
 *              - Crear nuevos paramédicos (asignados automáticamente a su sede)
 *              - Editar paramédicos existentes
 *              - Activar/desactivar paramédicos
 *              - Gestión de contraseñas (opcional en edición)
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'

export default function SubadminParamedicos() {
  // ===== ESTADOS =====
  const { user } = useAuth()
  const [paramedicos, setParamedicos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [paramedicoEditando, setParamedicoEditando] = useState(null)
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    activo: true
  })

  // ===== CARGA INICIAL =====
  useEffect(() => {
    if (user?.sede_id) cargarParamedicos()
  }, [user])

  /**
   * Carga los paramédicos de la sede del subadministrador
   */
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

  /**
   * Guarda o actualiza un paramédico
   * @param {Event} e - Evento del formulario
   */
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
    
    cerrarModal()
    cargarParamedicos()
  }

  /**
   * Abre el modal para editar un paramédico
   * @param {Object} paramedico - Datos del paramédico a editar
   */
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

  /**
   * Activa o desactiva un paramédico
   * @param {number} id - ID del paramédico
   * @param {boolean} estadoActual - Estado actual del paramédico
   */
  const toggleActivo = async (id, estadoActual) => {
    await supabase
      .from('usuarios')
      .update({ activo: !estadoActual })
      .eq('id', id)
    cargarParamedicos()
  }

  /**
   * Abre el modal para crear un nuevo paramédico
   */
  const abrirModalNuevo = () => {
    setParamedicoEditando(null)
    setFormData({ nombre: '', correo: '', password: '', activo: true })
    setModalAbierto(true)
  }

  /**
   * Cierra el modal y limpia los estados
   */
  const cerrarModal = () => {
    setModalAbierto(false)
    setParamedicoEditando(null)
    setFormData({ nombre: '', correo: '', password: '', activo: true })
  }

  /**
   * Obtiene los estilos visuales según el estado del paramédico
   * @param {boolean} activo - Estado del paramédico
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
      <SubadminLayout titulo="Gestión de Paramédicos">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
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
          <button className="btn-primary" onClick={abrirModalNuevo}>
            <span>+</span> Nuevo Paramédico
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paramedicos.map(p => {
                const estadoStyle = getEstadoStyle(p.activo)
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong>
                    </td>
                    <td>{p.correo}</td>
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
                        onClick={() => handleEditar(p)}
                      >
                        ✏️ Editar
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
              <span>{paramedicoEditando ? '' : ''}</span>
              <h3>{paramedicoEditando ? 'Editar Paramédico' : 'Nuevo Paramédico'}</h3>
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
                  Contraseña {paramedicoEditando && '(dejar vacío para no cambiar)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!paramedicoEditando}
                  placeholder={paramedicoEditando ? '••••••••' : 'Ingrese contraseña'}
                />
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