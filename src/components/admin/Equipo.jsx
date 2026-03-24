import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../layout/AdminLayout"
import "../../styles/Equipo.css"

export default function Equipo() {

  const [modelos, setModelos] = useState([])
  const [equipos, setEquipos] = useState([]) // Todos los equipos (individuales y generales)
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalModelo, setModalModelo] = useState(false)
  const [modalEquipo, setModalEquipo] = useState(false)
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

  // Formulario para nuevo equipo (unificado)
  const [formEquipo, setFormEquipo] = useState({
    modelo_id: "",
    tipo: "INDIVIDUAL",
    numero_serie: "",
    cantidad: 1,
    sede_id: "",
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

    // Cargar modelos de equipo
    const { data: modelosData } = await supabase
      .from("modelos_equipo")
      .select("*")
      .order("nombre")
    setModelos(modelosData || [])

    // Cargar todos los equipos (unificados)
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

  // CRUD Modelos
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
        tipo: formModelo.tipo
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
        tipo: modeloEditando.tipo
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

  // CRUD Equipos (unificado)
  const crearEquipo = async (e) => {
    e.preventDefault()
    if (!formEquipo.modelo_id) {
      alert("Seleccione un modelo")
      return
    }

    if (formEquipo.tipo === "INDIVIDUAL") {
      if (!formEquipo.numero_serie) {
        alert("Ingrese número de serie")
        return
      }
      if (!formEquipo.sede_id) {
        alert("Seleccione una sede")
        return
      }

      const existe = equipos.some(eq => eq.numero_serie === formEquipo.numero_serie)
      if (existe) {
        alert("El número de serie ya existe")
        return
      }
    } else {
      if (!formEquipo.cantidad || formEquipo.cantidad < 1) {
        alert("La cantidad debe ser al menos 1")
        return
      }
    }

    const equipoData = {
      modelo_id: parseInt(formEquipo.modelo_id),
      tipo: formEquipo.tipo,
      estado: formEquipo.estado
    }

    if (formEquipo.tipo === "INDIVIDUAL") {
      equipoData.numero_serie = formEquipo.numero_serie
      equipoData.sede_id = parseInt(formEquipo.sede_id)
      equipoData.cantidad = null
    } else {
      equipoData.cantidad = formEquipo.cantidad
      equipoData.sede_id = null
      equipoData.numero_serie = null
    }

    const { error } = await supabase
      .from("equipos")
      .insert([equipoData])

    if (error) {
      alert("Error creando equipo: " + error.message)
      return
    }

    alert("Equipo creado correctamente")
    setFormEquipo({
      modelo_id: "",
      tipo: "INDIVIDUAL",
      numero_serie: "",
      cantidad: 1,
      sede_id: "",
      estado: "ACTIVO"
    })
    setModalEquipo(false)
    cargarDatos()
  }

  const editarEquipo = async (e) => {
    e.preventDefault()
    
    const equipoData = {
      modelo_id: equipoEditando.modelo_id,
      tipo: equipoEditando.tipo,
      estado: equipoEditando.estado
    }

    if (equipoEditando.tipo === "INDIVIDUAL") {
      equipoData.numero_serie = equipoEditando.numero_serie
      equipoData.sede_id = equipoEditando.sede_id
      equipoData.cantidad = null
      equipoData.ambulancia_id = equipoEditando.ambulancia_id
    } else {
      equipoData.cantidad = equipoEditando.cantidad
      equipoData.sede_id = null
      equipoData.numero_serie = null
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
    setModalEquipo(false)
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
      case "INACTIVO": return { bg: "#f3f4f6", color: "#4b5563", text: "⚪ Inactivo" }
      case "BAJA": return { bg: "#fee2e2", color: "#991b1b", text: "❌ Baja" }
      default: return { bg: "#f3f4f6", color: "#4b5563", text: estado }
    }
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Gestión de Equipo Médico">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
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

        {/* Botones de acción */}
        <div className="equipo-actions">
          <button className="btn-primary" onClick={() => setModalModelo(true)}>
            <span>➕</span> Nuevo Modelo
          </button>
          <button className="btn-primary btn-equipo" onClick={() => setModalEquipo(true)}>
            <span>🔢</span> Nuevo Equipo
          </button>
        </div>

        {/* Pestañas de navegación */}
        <div className="equipo-tabs">
          <button
            className={`tab-button ${tipoVista === "individual" ? "active" : ""}`}
            onClick={() => setTipoVista("individual")}
          >
            <span>🔢</span> Equipos con Serie ({equiposIndividuales.length})
          </button>
          <button
            className={`tab-button ${tipoVista === "general" ? "active" : ""}`}
            onClick={() => setTipoVista("general")}
          >
            <span>📦</span> Equipos Generales ({equiposGenerales.length})
          </button>
        </div>

        {/* Filtros */}
        <div className="equipo-filtros">
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
          <div className="filtro-group">
            <label>Estado:</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>
        </div>

        {/* Lista de modelos */}
        <div className="equipo-section">
          <div className="section-header">
            <span>📋</span>
            <h3>Modelos de Equipo ({modelos.length})</h3>
          </div>
          <div className="modelos-grid">
            {modelos.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🧰</span>
                <p>No hay modelos registrados</p>
              </div>
            ) : (
              modelos.map(modelo => (
                <div key={modelo.id} className="modelo-card">
                  <div className="modelo-header">
                    <strong>{modelo.nombre}</strong>
                    <span className={`tipo-badge ${modelo.tipo === "GENERAL" ? "general" : "individual"}`}>
                      {modelo.tipo === "GENERAL" ? "📦 General" : "🔢 Individual"}
                    </span>
                    <div className="modelo-actions">
                      <button className="btn-icon" onClick={() => {
                        setModeloEditando(modelo)
                        setModalModelo(true)
                      }}>✏️</button>
                      <button className="btn-icon delete" onClick={() => eliminarModelo(modelo.id)}>🗑️</button>
                    </div>
                  </div>
                  {modelo.descripcion && (
                    <p className="modelo-descripcion">{modelo.descripcion}</p>
                  )}
                  {modelo.categoria && (
                    <span className="modelo-categoria">{modelo.categoria}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vista de Equipos */}
        <div className="equipo-section">
          <div className="section-header">
            <span>{tipoVista === "individual" ? "🔢" : "📦"}</span>
            <h3>{tipoVista === "individual" ? "Equipos con Serie" : "Equipos Generales"} ({equiposFiltrados.length})</h3>
          </div>
          <div className="inventario-grid">
            {equiposFiltrados.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">{tipoVista === "individual" ? "🔢" : "📦"}</span>
                <p>No hay equipos registrados</p>
              </div>
            ) : (
              equiposFiltrados.map(equipo => {
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
                          setModalEquipo(true)
                        }}>✏️</button>
                        <button className="btn-icon delete" onClick={() => eliminarEquipo(equipo.id)}>🗑️</button>
                      </div>
                    </div>
                    
                    {equipo.tipo === "INDIVIDUAL" ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <div className="inventario-cantidad">
                          <span className="cantidad-label">📦 Cantidad:</span>
                          <span className="cantidad-valor">{equipo.cantidad} unidades</span>
                        </div>
                        <div className="inventario-note">
                          <span className="note-label">📝 Nota:</span>
                          <span className="note-text">Disponible para todas las sedes</span>
                        </div>
                      </>
                    )}

                    <div className="inventario-estado-actions">
                      <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "ACTIVO")}>
                        ✅ Activo
                      </button>
                      <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "MANTENIMIENTO")}>
                        🔧 Mantenimiento
                      </button>
                      <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "INACTIVO")}>
                        ⚪ Inactivo
                      </button>
                      <button className="estado-btn" onClick={() => cambiarEstadoEquipo(equipo.id, "BAJA")}>
                        ❌ Baja
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
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
                  placeholder="Ej: Monitores, Ventiladores, Consumibles"
                  value={modeloEditando ? modeloEditando.categoria : formModelo.categoria}
                  onChange={(e) => modeloEditando 
                    ? setModeloEditando({...modeloEditando, categoria: e.target.value})
                    : setFormModelo({...formModelo, categoria: e.target.value})
                  }
                />
              </div>
              <div className="form-group">
                <label>Tipo de equipo</label>
                <select
                  value={modeloEditando ? modeloEditando.tipo : formModelo.tipo}
                  onChange={(e) => modeloEditando 
                    ? setModeloEditando({...modeloEditando, tipo: e.target.value})
                    : setFormModelo({...formModelo, tipo: e.target.value})
                  }
                >
                  <option value="INDIVIDUAL">🔢 Individual (con número de serie)</option>
                  <option value="GENERAL">📦 General (por cantidad, para todas las sedes)</option>
                </select>
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

      {/* Modal para Equipo */}
      {modalEquipo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{equipoEditando ? "✏️ Editar Equipo" : "🔢 Nuevo Equipo"}</h3>
            <form onSubmit={equipoEditando ? editarEquipo : crearEquipo}>
              <div className="form-group">
                <label>Modelo *</label>
                <select
                  value={equipoEditando ? equipoEditando.modelo_id : formEquipo.modelo_id}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, modelo_id: parseInt(e.target.value)})
                    : setFormEquipo({...formEquipo, modelo_id: e.target.value})
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
                <label>Tipo de equipo</label>
                <select
                  value={equipoEditando ? equipoEditando.tipo : formEquipo.tipo}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, tipo: e.target.value})
                    : setFormEquipo({...formEquipo, tipo: e.target.value})
                  }
                >
                  <option value="INDIVIDUAL">🔢 Individual (con número de serie)</option>
                  <option value="GENERAL">📦 General (por cantidad)</option>
                </select>
              </div>

              {(equipoEditando ? equipoEditando.tipo : formEquipo.tipo) === "INDIVIDUAL" ? (
                <>
                  <div className="form-group">
                    <label>Número de Serie *</label>
                    <input
                      type="text"
                      placeholder="Ej: SN-2024-00123"
                      value={equipoEditando ? equipoEditando.numero_serie : formEquipo.numero_serie}
                      onChange={(e) => equipoEditando 
                        ? setEquipoEditando({...equipoEditando, numero_serie: e.target.value})
                        : setFormEquipo({...formEquipo, numero_serie: e.target.value})
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sede asignada *</label>
                    <select
                      value={equipoEditando ? equipoEditando.sede_id : formEquipo.sede_id}
                      onChange={(e) => equipoEditando 
                        ? setEquipoEditando({...equipoEditando, sede_id: parseInt(e.target.value)})
                        : setFormEquipo({...formEquipo, sede_id: e.target.value})
                      }
                      required
                    >
                      <option value="">Seleccione una sede</option>
                      {sedes.map(sede => (
                        <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Cantidad disponible"
                    value={equipoEditando ? equipoEditando.cantidad : formEquipo.cantidad}
                    onChange={(e) => equipoEditando 
                      ? setEquipoEditando({...equipoEditando, cantidad: parseInt(e.target.value)})
                      : setFormEquipo({...formEquipo, cantidad: parseInt(e.target.value)})
                    }
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Estado</label>
                <select
                  value={equipoEditando ? equipoEditando.estado : formEquipo.estado}
                  onChange={(e) => equipoEditando 
                    ? setEquipoEditando({...equipoEditando, estado: e.target.value})
                    : setFormEquipo({...formEquipo, estado: e.target.value})
                  }
                >
                  <option value="ACTIVO">✅ Activo</option>
                  <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
                  <option value="INACTIVO">⚪ Inactivo</option>
                  <option value="BAJA">❌ Baja</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setModalEquipo(false)
                  setEquipoEditando(null)
                  setFormEquipo({
                    modelo_id: "",
                    tipo: "INDIVIDUAL",
                    numero_serie: "",
                    cantidad: 1,
                    sede_id: "",
                    estado: "ACTIVO"
                  })
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