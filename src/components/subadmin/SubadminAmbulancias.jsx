/**
 * @component SubadminAmbulancias
 * @description CRUD completo para la gestión de ambulancias por sede (subadministrador).
 *              - Listado de ambulancias de la sede del subadmin
 *              - Crear nuevas ambulancias (asignadas automáticamente a su sede)
 *              - Editar ambulancias existentes
 *              - Eliminar ambulancias (con confirmación)
 *              - Control de estados (Activa, Inactiva, Mantenimiento)
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'

export default function SubadminAmbulancias() {
  // ===== ESTADOS =====
  const { user } = useAuth()
  const [ambulancias, setAmbulancias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ambulanciaEditando, setAmbulanciaEditando] = useState(null)
  
  // Formulario
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    placa: '',
    estado: 'ACTIVA'
  })

  // ===== CARGA INICIAL =====
  useEffect(() => {
    if (user?.sede_id) cargarAmbulancias()
  }, [user])

  /**
   * Carga las ambulancias de la sede del subadministrador
   */
  const cargarAmbulancias = async () => {
    const { data } = await supabase
      .from('ambulancias')
      .select('*')
      .eq('sede_id', user.sede_id)
      .order('codigo')

    setAmbulancias(data || [])
    setCargando(false)
  }

  /**
   * Guarda o actualiza una ambulancia
   * @param {Event} e - Evento del formulario
   */
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
    
    cerrarModal()
    cargarAmbulancias()
  }

  /**
   * Abre el modal para editar una ambulancia
   * @param {Object} ambulancia - Datos de la ambulancia a editar
   */
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

  /**
   * Elimina una ambulancia previa confirmación
   * @param {number} id - ID de la ambulancia a eliminar
   */
  const handleEliminar = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta ambulancia?')) {
      await supabase.from('ambulancias').delete().eq('id', id)
      cargarAmbulancias()
    }
  }

  /**
   * Abre el modal para crear una nueva ambulancia
   */
  const abrirModalNuevo = () => {
    setAmbulanciaEditando(null)
    setFormData({ codigo: '', descripcion: '', placa: '', estado: 'ACTIVA' })
    setModalAbierto(true)
  }

  /**
   * Cierra el modal y limpia los estados
   */
  const cerrarModal = () => {
    setModalAbierto(false)
    setAmbulanciaEditando(null)
    setFormData({ codigo: '', descripcion: '', placa: '', estado: 'ACTIVA' })
  }

  /**
   * Obtiene los estilos visuales según el estado de la ambulancia
   * @param {string} estado - Estado de la ambulancia
   * @returns {Object} Estilos CSS y texto
   */
  const getEstadoStyle = (estado) => {
    switch(estado) {
      case 'ACTIVA': 
        return { bg: '#dcfce7', color: '#166534', text: 'Activa' }
      case 'INACTIVA': 
        return { bg: '#fee2e2', color: '#991b1b', text: 'Inactiva' }
      case 'MANTENIMIENTO': 
        return { bg: '#fef9c3', color: '#854d0e', text: 'Mantenimiento' }
      default: 
        return { bg: '#f3f4f6', color: '#4b5563', text: estado }
    }
  }

  // ===== RENDER =====
  if (cargando) {
    return (
      <SubadminLayout titulo="Gestión de Ambulancias">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
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
          <button className="btn-primary" onClick={abrirModalNuevo}>
            <span>+</span> Nueva Ambulancia
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
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
                    <td>
                      <strong>{amb.codigo}</strong>
                    </td>
                    <td>{amb.placa || '-'}</td>
                    <td>{amb.descripcion || '-'}</td>
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

      {/* MODAL */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>{ambulanciaEditando ? '' : ''}</span>
              <h3>{ambulanciaEditando ? 'Editar Ambulancia' : 'Nueva Ambulancia'}</h3>
              <button className="modal-close" onClick={cerrarModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Código *</label>
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
                  <option value="ACTIVA">✅ Activa</option>
                  <option value="INACTIVA">❌ Inactiva</option>
                  <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>
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