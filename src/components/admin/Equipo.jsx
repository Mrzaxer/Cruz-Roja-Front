import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../layout/AdminLayout"
import "../../styles/Equipo.css"

export default function Equipo() {

  const [modelos, setModelos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalModelo, setModalModelo] = useState(false)
  const [modalEquipoIndividual, setModalEquipoIndividual] = useState(false)
  const [modalEquipoGeneral, setModalEquipoGeneral] = useState(false)
  const [modeloEditando, setModeloEditando] = useState(null)
  const [equipoEditando, setEquipoEditando] = useState(null)
  const [filtroSede, setFiltroSede] = useState("")
  const [filtroModelo, setFiltroModelo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [tipoVista, setTipoVista] = useState("individual")

  // Formulario para nuevo modelo
  const [formModelo, setFormModelo] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    tipo: "INDIVIDUAL"
  })

  // Formulario para equipo individual
  const [formEquipoIndividual, setFormEquipoIndividual] = useState({
    modelo_id: "",
    numero_serie: "",
    sede_id: "",
    estado: "ACTIVO"
  })

  // Formulario para equipo general (sin modelo)
  const [formEquipoGeneral, setFormEquipoGeneral] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    cantidad: 1,
    estado: "ACTIVO"
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // Cargar sedes
    const { data: sedesData } = await supabase
      .from("sedes")
      .select("*")
      .order("nombre")
    setSedes(sedesData || [])

    // Cargar modelos de equipo (solo individuales)
    const { data: modelosData } = await supabase
      .from("modelos_equipo")
      .select("*")
      .eq("tipo", "INDIVIDUAL")
      .order("nombre")
    setModelos(modelosData || [])

    // Cargar todos los equipos
    const { data: equiposData } = await supabase
      .from("equipos")
      .select(`
        *,
        modelo:modelos_equipo(id, nombre, descripcion),
        sede:sedes(id, nombre),
        ambulancia:ambulancias(id, codigo)
      `)
      .order("tipo")
      .order("numero_serie", { nullsLast: true })

    setEquipos(equiposData || [])
    setCargando(false)
  }

  // ==================== CRUD MODELOS ====================
  const crearModelo = async (e) => {
    e.preventDefault()
    if (!formModelo.nombre) {
      alert("Ingrese nombre del modelo")
      return
    }

    const { error } = await supabase
      .from("modelos_equipo")
      .insert({
        nombre: formModelo.nombre,
        descripcion: formModelo.descripcion,
        categoria: formModelo.categoria,
        tipo: "INDIVIDUAL"
      })

    if (error) {
      alert("Error creando modelo: " + error.message)
      return
    }

    alert("Modelo creado correctamente")
    setFormModelo({ nombre: "", descripcion: "", categoria: "", tipo: "INDIVIDUAL" })
    setModalModelo(false)
    cargarDatos()
  }

  const editarModelo = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from("modelos_equipo")
      .update({
        nombre: modeloEditando.nombre,
        descripcion: modeloEditando.descripcion,
        categoria: modeloEditando.categoria,
        tipo: "INDIVIDUAL"
      })
      .eq("id", modeloEditando.id)

    if (error) {
      alert("Error editando modelo")
      return
    }

    alert("Modelo actualizado")
    setModalModelo(false)
    setModeloEditando(null)
    cargarDatos()
  }

  const eliminarModelo = async (id) => {
    const tieneEquipos = equipos.some(eq => eq.modelo_id === id)
    
    if (tieneEquipos) {
      alert("No se puede eliminar el modelo porque tiene equipos asociados")
      return
    }

    const confirmar = confirm("¿Eliminar este modelo?")
    if (!confirmar) return

    const { error } = await supabase
      .from("modelos_equipo")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Error eliminando modelo")
      return
    }

    cargarDatos()
  }

  // ==================== CRUD EQUIPOS INDIVIDUALES ====================
  const crearEquipoIndividual = async (e) => {
    e.preventDefault()
    if (!formEquipoIndividual.modelo_id) {
      alert("Seleccione un modelo")
      return
    }
    if (!formEquipoIndividual.numero_serie) {
      alert("Ingrese número de serie")
      return
    }
    if (!formEquipoIndividual.sede_id) {
      alert("Seleccione una sede")
      return
    }

    const existe = equipos.some(eq => eq.numero_serie === formEquipoIndividual.numero_serie)
    if (existe) {
      alert("El número de serie ya existe")
      return
    }

    const equipoData = {
      modelo_id: parseInt(formEquipoIndividual.modelo_id),
      tipo: "INDIVIDUAL",
      numero_serie: formEquipoIndividual.numero_serie,
      sede_id: parseInt(formEquipoIndividual.sede_id),
      estado: formEquipoIndividual.estado,
      cantidad: null
    }

    const { error } = await supabase
      .from("equipos")
      .insert([equipoData])

    if (error) {
      alert("Error creando equipo: " + error.message)
      return
    }

    alert("Equipo individual creado correctamente")
    setFormEquipoIndividual({
      modelo_id: "",
      numero_serie: "",
      sede_id: "",
      estado: "ACTIVO"
    })
    setModalEquipoIndividual(false)
    cargarDatos()
  }

  // ==================== CRUD EQUIPOS GENERALES ====================
  const crearEquipoGeneral = async (e) => {
    e.preventDefault()
    
    if (!formEquipoGeneral.nombre) {
      alert("Ingrese nombre del equipo")
      return
    }
    if (!formEquipoGeneral.cantidad || formEquipoGeneral.cantidad < 1) {
      alert("La cantidad debe ser al menos 1")
      return
    }

    const equipoData = {
      tipo: "GENERAL",
      nombre: formEquipoGeneral.nombre,
      descripcion: formEquipoGeneral.descripcion || null,
      categoria: formEquipoGeneral.categoria || null,
      cantidad: formEquipoGeneral.cantidad,
      estado: formEquipoGeneral.estado,
      modelo_id: null,
      numero_serie: null,
      sede_id: null
    }

    const { error } = await supabase
      .from("equipos")
      .insert([equipoData])

    if (error) {
      alert("Error creando equipo general: " + error.message)
      return
    }

    alert("Equipo general creado correctamente")
    setFormEquipoGeneral({
      nombre: "",
      descripcion: "",
      categoria: "",
      cantidad: 1,
      estado: "ACTIVO"
    })
    setModalEquipoGeneral(false)
    cargarDatos()
  }

  const editarEquipo = async (e) => {
    e.preventDefault()
    
    const equipoData = {
      estado: equipoEditando.estado
    }

    if (equipoEditando.tipo === "INDIVIDUAL") {
      equipoData.modelo_id = equipoEditando.modelo_id
      equipoData.numero_serie = equipoEditando.numero_serie
      equipoData.sede_id = equipoEditando.sede_id
      equipoData.ambulancia_id = equipoEditando.ambulancia_id
      equipoData.cantidad = null
      equipoData.nombre = null
      equipoData.descripcion = null
      equipoData.categoria = null
    } else {
      equipoData.nombre = equipoEditando.nombre
      equipoData.descripcion = equipoEditando.descripcion
      equipoData.categoria = equipoEditando.categoria
      equipoData.cantidad = equipoEditando.cantidad
      equipoData.modelo_id = null
      equipoData.numero_serie = null
      equipoData.sede_id = null
      equipoData.ambulancia_id = null
    }

    const { error } = await supabase
      .from("equipos")
      .update(equipoData)
      .eq("id", equipoEditando.id)

    if (error) {
      alert("Error editando equipo: " + error.message)
      return
    }

    alert("Equipo actualizado")
    setModalEquipoIndividual(false)
    setModalEquipoGeneral(false)
    setEquipoEditando(null)
    cargarDatos()
  }

  const cambiarEstadoEquipo = async (id, nuevoEstado) => {
    const { error } = await supabase
      .from("equipos")
      .update({ estado: nuevoEstado })
      .eq("id", id)

    if (error) {
      alert("Error cambiando estado")
      return
    }

    cargarDatos()
  }

  const eliminarEquipo = async (id) => {
    const confirmar = confirm("¿Eliminar este equipo permanentemente?")
    if (!confirmar) return

    const { error } = await supabase
      .from("equipos")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Error eliminando equipo: " + error.message)
      return
    }

    cargarDatos()
  }

  // Filtros
  const equiposIndividuales = equipos.filter(e => e.tipo === "INDIVIDUAL")
  const equiposGenerales = equipos.filter(e => e.tipo === "GENERAL")

  const equiposFiltrados = (tipoVista === "individual" ? equiposIndividuales : equiposGenerales)
    .filter(eq => {
      if (filtroSede && eq.sede_id !== parseInt(filtroSede)) return false
      if (filtroModelo && eq.modelo_id !== parseInt(filtroModelo)) return false
      if (filtroEstado && eq.estado !== filtroEstado) return false
      return true
    })

  const getEstadoColor = (estado) => {
    switch(estado) {
      case "ACTIVO": return { bg: "#dcfce7", color: "#166534", text: "✅ Activo" }
      case "MANTENIMIENTO": return { bg: "#fef9c3", color: "#854d0e", text: "🔧 Mantenimiento" }
      case "INACTIVO": return { bg: "#fee2e2", color: "#991b1b", text: "❌ Inactivo" }
      default: return { bg: "#f3f4f6", color: "#4b5563", text: estado }
    }
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Equipo Médico">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando equipo médico...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      titulo="Gestión de Equipo Médico"
      subtitulo="Administre equipos individuales (con serie) y equipos generales"
    >
      <div className="equipo-container">
        
        <div className="equipo-banner">
          <div className="equipo-banner-icon">🧰</div>
          <div className="equipo-banner-text">
            <h2>Inventario de Equipo Médico</h2>
            <p>Gestiona equipos con número de serie (por sede) y equipos generales (por cantidad)</p>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="equipo-tabs">
          <button
            className={`tab-button ${tipoVista === "individual" ? "active" : ""}`}
            onClick={() => setTipoVista("individual")}
          >
            Equipos Individuales ({equiposIndividuales.length})
          </button>
          <button
            className={`tab-button ${tipoVista === "general" ? "active" : ""}`}
            onClick={() => setTipoVista("general")}
          >
            Equipos Generales ({equiposGenerales.length})
          </button>
        </div>

        {/* Filtros */}
        <div className="equipo-filtros">
          {tipoVista === "individual" && (
            <>
              <div className="filtro-group">
                <label>Sede:</label>
                <select value={filtroSede} onChange={(e) => setFiltroSede(e.target.value)}>
                  <option value="">Todas las sedes</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="filtro-group">
                <label>Modelo:</label>
                <select value={filtroModelo} onChange={(e) => setFiltroModelo(e.target.value)}>
                  <option value="">Todos los modelos</option>
                  {modelos.map(modelo => (
                    <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="filtro-group">
            <label>Estado:</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        </div>

        {/* VISTA DE EQUIPOS INDIVIDUALES */}
        {tipoVista === "individual" && (
          <>
            {/* Lista de Modelos */}
            <div className="equipo-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h3>Modelos de Equipo ({modelos.length})</h3>
                </div>
                <button className="btn-primary-small" onClick={() => setModalModelo(true)}>
                  ➕ Nuevo Modelo
                </button>
              </div>
              <div className="modelos-grid">
                {modelos.map(modelo => (
                  <div key={modelo.id} className="modelo-card">
                    <div className="modelo-header">
                      <strong>{modelo.nombre}</strong>
                      <div className="modelo-actions">
                        <button className="btn-icon" onClick={() => {
                          setModeloEditando(modelo)
                          setModalModelo(true)
                        }}>✏️</button>
                        <button className="btn-icon delete" onClick={() => eliminarModelo(modelo.id)}>🗑️</button>
                      </div>
                    </div>
                    {modelo.descripcion && <p className="modelo-descripcion">{modelo.descripcion}</p>}
                    {modelo.categoria && <span className="modelo-categoria">{modelo.categoria}</span>}
                  </div>
                ))}
                {/* Tarjeta para agregar nuevo modelo */}
                <div 
                  className="modelo-card agregar-card"
                  onClick={() => {
                    setModeloEditando(null)
                    setFormModelo({ nombre: "", descripcion: "", categoria: "", tipo: "INDIVIDUAL" })
                    setModalModelo(true)
                  }}
                >
                  <div className="agregar-contenido">
                    <span className="agregar-icono">➕</span>
                    <span className="agregar-texto">Nuevo Modelo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Equipos Individuales */}
            <div className="equipo-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h3>Equipos Individuales ({equiposFiltrados.length})</h3>
                </div>
                <button className="btn-primary-small" onClick={() => {
                  setEquipoEditando(null)
                  setFormEquipoIndividual({
                    modelo_id: "",
                    numero_serie: "",
                    sede_id: "",
                    estado: "ACTIVO"
                  })
                  setModalEquipoIndividual(true)
                }}>
                  ➕ Nuevo Equipo Individual
                </button>
              </div>
              
              <div className="inventario-grid">
                {equiposFiltrados.length === 0 ? (
                  <>
                    <div className="empty-state">
                      <span className="empty-icon">📦</span>
                      <p>No hay equipos individuales registrados</p>
                    </div>
                    <div 
                      className="inventario-card agregar-card agregar-card-vacio"
                      onClick={() => {
                        setEquipoEditando(null)
                        setFormEquipoIndividual({
                          modelo_id: "",
                          numero_serie: "",
                          sede_id: "",
                          estado: "ACTIVO"
                        })
                        setModalEquipoIndividual(true)
                      }}
                    >
                      <div className="agregar-contenido">
                        <span className="agregar-icono">➕</span>
                        <span className="agregar-texto">Agregar primer equipo individual</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {equiposFiltrados.map(equipo => {
                      const estadoStyle = getEstadoColor(equipo.estado)
                      return (
                        <div key={equipo.id} className="inventario-card">
                          <div className="inventario-header">
                            <div className="inventario-modelo">
                              <strong>{equipo.modelo?.nombre || "Sin modelo"}</strong>
                              <span className="estado-badge" style={estadoStyle}>{estadoStyle.text}</span>
                            </div>
                            <div className="inventario-actions">
                              <button className="btn-icon" onClick={() => {
                                setEquipoEditando(equipo)
                                setModalEquipoIndividual(true)
                              }}>✏️</button>
                              <button className="btn-icon delete" onClick={() => eliminarEquipo(equipo.id)}>🗑️</button>
                            </div>
                          </div>
                          
                          <div className="inventario-serie">
                            <span className="serie-label">🔢 N° Serie:</span>
                            <span className="serie-valor">{equipo.numero_serie}</span>
                          </div>
                          <div className="inventario-sede">
                            <span className="sede-label">🏢 Sede:</span>
                            <span className="sede-valor">{equipo.sede?.nombre || "Sin sede"}</span>
                          </div>
                          {equipo.ambulancia && (
                            <div className="inventario-ambulancia">
                              <span className="ambulancia-label">🚑 Ambulancia:</span>
                              <span className="ambulancia-valor">{equipo.ambulancia.codigo}</span>
                            </div>
                          )}
                          {equipo.modelo?.descripcion && (
                            <div className="inventario-descripcion">
                              <span className="descripcion-label">📝 Descripción:</span>
                              <span className="descripcion-valor">{equipo.modelo.descripcion}</span>
                            </div>
                          )}

                          <div className="inventario-estado-actions">
                            <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "ACTIVO")}>
                              ✅ Activo
                            </button>
                            <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "MANTENIMIENTO")}>
                              🔧 Mantenimiento
                            </button>
                            <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "INACTIVO")}>
                              ❌ Inactivo
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <div 
                      className="inventario-card agregar-card"
                      onClick={() => {
                        setEquipoEditando(null)
                        setFormEquipoIndividual({
                          modelo_id: "",
                          numero_serie: "",
                          sede_id: "",
                          estado: "ACTIVO"
                        })
                        setModalEquipoIndividual(true)
                      }}
                    >
                      <div className="agregar-contenido">
                        <span className="agregar-icono">➕</span>
                        <span className="agregar-texto">Nuevo Equipo Individual</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* VISTA DE EQUIPOS GENERALES */}
        {tipoVista === "general" && (
          <div className="equipo-section">
            <div className="section-header">
              <div className="section-header-left">
                <h3>Equipos Generales ({equiposFiltrados.length})</h3>
              </div>
              <button className="btn-primary-small" onClick={() => {
                setEquipoEditando(null)
                setFormEquipoGeneral({
                  nombre: "",
                  descripcion: "",
                  categoria: "",
                  cantidad: 1,
                  estado: "ACTIVO"
                })
                setModalEquipoGeneral(true)
              }}>
                ➕ Nuevo Equipo General
              </button>
            </div>
            
            <div className="inventario-grid">
              {equiposFiltrados.length === 0 ? (
                <>
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <p>No hay equipos generales registrados</p>
                  </div>
                  <div 
                    className="inventario-card agregar-card agregar-card-vacio"
                    onClick={() => {
                      setEquipoEditando(null)
                      setFormEquipoGeneral({
                        nombre: "",
                        descripcion: "",
                        categoria: "",
                        cantidad: 1,
                        estado: "ACTIVO"
                      })
                      setModalEquipoGeneral(true)
                    }}
                  >
                    <div className="agregar-contenido">
                      <span className="agregar-icono">➕</span>
                      <span className="agregar-texto">Agregar primer equipo general</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {equiposFiltrados.map(equipo => {
                    const estadoStyle = getEstadoColor(equipo.estado)
                    return (
                      <div key={equipo.id} className="inventario-card">
                        <div className="inventario-header">
                          <div className="inventario-modelo">
                            <strong>{equipo.nombre}</strong>
                            <span className="estado-badge" style={estadoStyle}>{estadoStyle.text}</span>
                          </div>
                          <div className="inventario-actions">
                            <button className="btn-icon" onClick={() => {
                              setEquipoEditando(equipo)
                              setModalEquipoGeneral(true)
                            }}>✏️</button>
                            <button className="btn-icon delete" onClick={() => eliminarEquipo(equipo.id)}>🗑️</button>
                          </div>
                        </div>
                        
                        <div className="inventario-cantidad">
                          <span className="cantidad-label">📦 Cantidad:</span>
                          <span className="cantidad-valor">{equipo.cantidad} unidades</span>
                        </div>
                        <div className="inventario-note">
                          <span className="note-label">📝 Nota:</span>
                          <span className="note-text">Disponible para todas las sedes</span>
                        </div>
                        {equipo.descripcion && (
                          <div className="inventario-descripcion">
                            <span className="descripcion-label">📝 Descripción:</span>
                            <span className="descripcion-valor">{equipo.descripcion}</span>
                          </div>
                        )}
                        {equipo.categoria && (
                          <div className="inventario-categoria">
                            <span className="categoria-label">🏷️ Categoría:</span>
                            <span className="categoria-valor">{equipo.categoria}</span>
                          </div>
                        )}

                        <div className="inventario-estado-actions">
                          <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "ACTIVO")}>
                            ✅ Activo
                          </button>
                          <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "MANTENIMIENTO")}>
                            🔧 Mantenimiento
                          </button>
                          <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "INACTIVO")}>
                            ❌ Inactivo
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <div 
                    className="inventario-card agregar-card"
                    onClick={() => {
                      setEquipoEditando(null)
                      setFormEquipoGeneral({
                        nombre: "",
                        descripcion: "",
                        categoria: "",
                        cantidad: 1,
                        estado: "ACTIVO"
                      })
                      setModalEquipoGeneral(true)
                    }}
                  >
                    <div className="agregar-contenido">
                      <span className="agregar-icono">➕</span>
                      <span className="agregar-texto">Nuevo Equipo General</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para Modelo */}
      {modalModelo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{modeloEditando ? "✏️ Editar Modelo" : "➕ Nuevo Modelo"}</h3>
            <form onSubmit={modeloEditando ? editarModelo : crearModelo}>
              <div className="form-group">
                <label>Nombre del modelo *</label>
                <input
                  type="text"
                  value={modeloEditando ? modeloEditando.nombre : formModelo.nombre}
                  onChange={(e) => modeloEditando 
                    ? setModeloEditando({...modeloEditando, nombre: e.target.value})
                    : setFormModelo({...formModelo, nombre: e.target.value})
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <input
                  type="text"
                  placeholder="Ej: Monitores, Ventiladores"
                  value={modeloEditando ? modeloEditando.categoria : formModelo.categoria}
                  onChange={(e) => modeloEditando 
                    ? setModeloEditando({...modeloEditando, categoria: e.target.value})
                    : setFormModelo({...formModelo, categoria: e.target.value})
                  }
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  rows="3"
                  value={modeloEditando ? modeloEditando.descripcion : formModelo.descripcion}
                  onChange={(e) => modeloEditando 
                    ? setModeloEditando({...modeloEditando, descripcion: e.target.value})
                    : setFormModelo({...formModelo, descripcion: e.target.value})
                  }
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setModalModelo(false)
                  setModeloEditando(null)
                  setFormModelo({ nombre: "", descripcion: "", categoria: "", tipo: "INDIVIDUAL" })
                }}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Equipo Individual */}
      {modalEquipoIndividual && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{equipoEditando ? "✏️ Editar Equipo Individual" : "➕ Nuevo Equipo Individual"}</h3>
            <form onSubmit={equipoEditando ? editarEquipo : crearEquipoIndividual}>
              <div className="form-group">
                <label>Modelo *</label>
                <select
                  value={equipoEditando ? equipoEditando.modelo_id : formEquipoIndividual.modelo_id}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, modelo_id: parseInt(e.target.value)})
                    : setFormEquipoIndividual({...formEquipoIndividual, modelo_id: e.target.value})
                  }
                  required
                >
                  <option value="">Seleccione un modelo</option>
                  {modelos.map(modelo => (
                    <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Número de Serie *</label>
                <input
                  type="text"
                  placeholder="Ej: SN-2024-00123"
                  value={equipoEditando ? equipoEditando.numero_serie : formEquipoIndividual.numero_serie}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, numero_serie: e.target.value})
                    : setFormEquipoIndividual({...formEquipoIndividual, numero_serie: e.target.value})
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Sede asignada *</label>
                <select
                  value={equipoEditando ? equipoEditando.sede_id : formEquipoIndividual.sede_id}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, sede_id: parseInt(e.target.value)})
                    : setFormEquipoIndividual({...formEquipoIndividual, sede_id: e.target.value})
                  }
                  required
                >
                  <option value="">Seleccione una sede</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={equipoEditando ? equipoEditando.estado : formEquipoIndividual.estado}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, estado: e.target.value})
                    : setFormEquipoIndividual({...formEquipoIndividual, estado: e.target.value})
                  }
                >
                  <option value="ACTIVO">✅ Activo</option>
                  <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
                  <option value="INACTIVO">❌ Inactivo</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setModalEquipoIndividual(false)
                  setEquipoEditando(null)
                }}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Equipo General */}
      {modalEquipoGeneral && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{equipoEditando ? "✏️ Editar Equipo General" : "➕ Nuevo Equipo General"}</h3>
            <form onSubmit={equipoEditando ? editarEquipo : crearEquipoGeneral}>
              <div className="form-group">
                <label>Nombre del equipo *</label>
                <input
                  type="text"
                  placeholder="Ej: Camilla de Urgencias"
                  value={equipoEditando ? equipoEditando.nombre : formEquipoGeneral.nombre}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, nombre: e.target.value})
                    : setFormEquipoGeneral({...formEquipoGeneral, nombre: e.target.value})
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <input
                  type="text"
                  placeholder="Ej: Movilidad, Consumibles, Protección"
                  value={equipoEditando ? equipoEditando.categoria : formEquipoGeneral.categoria}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, categoria: e.target.value})
                    : setFormEquipoGeneral({...formEquipoGeneral, categoria: e.target.value})
                  }
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  rows="3"
                  placeholder="Describe el equipo, sus características y uso..."
                  value={equipoEditando ? equipoEditando.descripcion : formEquipoGeneral.descripcion}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, descripcion: e.target.value})
                    : setFormEquipoGeneral({...formEquipoGeneral, descripcion: e.target.value})
                  }
                />
              </div>
              <div className="form-group">
                <label>Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Cantidad disponible"
                  value={equipoEditando ? equipoEditando.cantidad : formEquipoGeneral.cantidad}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, cantidad: parseInt(e.target.value)})
                    : setFormEquipoGeneral({...formEquipoGeneral, cantidad: parseInt(e.target.value)})
                  }
                  required
                />
                <small className="form-hint">Número de unidades disponibles</small>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={equipoEditando ? equipoEditando.estado : formEquipoGeneral.estado}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, estado: e.target.value})
                    : setFormEquipoGeneral({...formEquipoGeneral, estado: e.target.value})
                  }
                >
                  <option value="ACTIVO">✅ Activo</option>
                  <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
                  <option value="INACTIVO">❌ Inactivo</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setModalEquipoGeneral(false)
                  setEquipoEditando(null)
                }}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}