import { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import { useAuth } from "../../context/AuthContext"
import SubadminLayout from "../layout/SubadminLayout"
import "../../styles/SubadminEquipo.css"

export default function SubadminEquipo() {
  const { user } = useAuth()
  const [equipos, setEquipos] = useState([]) // Equipos con serie (asignables)
  const [equiposGenerales, setEquiposGenerales] = useState([]) // Equipos generales
  const [ambulancias, setAmbulancias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAsignacion, setModalAsignacion] = useState(false)
  const [modalReporte, setModalReporte] = useState(false)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null)
  const [consumibleSeleccionado, setConsumibleSeleccionado] = useState(null)
  const [ambulanciaSeleccionada, setAmbulanciaSeleccionada] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [tipoVista, setTipoVista] = useState("individual")
  
  const [tipoReporte, setTipoReporte] = useState("FALLA")
  const [descripcionReporte, setDescripcionReporte] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      // Cargar ambulancias de la sede
      const { data: ambulanciasData, error: errorAmb } = await supabase
        .from("ambulancias")
        .select("id, codigo, placa")
        .eq("sede_id", user.sede_id)
        .eq("estado", "ACTIVA")

      if (errorAmb) console.error("Error ambulancias:", errorAmb)
      setAmbulancias(ambulanciasData || [])

      // Cargar equipos con serie (INDIVIDUAL) de la sede
      const { data: equiposData, error: errorEquipos } = await supabase
        .from("equipos")
        .select(`
          *,
          modelo:modelos_equipo(id, nombre, descripcion, categoria),
          ambulancia:ambulancias(id, codigo, placa),
          sede:sedes(id, nombre)
        `)
        .eq("sede_id", user.sede_id)
        .eq("tipo", "INDIVIDUAL")
        .order("estado", { ascending: true })
        .order("numero_serie", { ascending: true })

      if (errorEquipos) {
        console.error("Error equipos:", errorEquipos)
        setEquipos([])
      } else {
        // Cargar reportes para cada equipo
        const equiposConReportes = await Promise.all(
          (equiposData || []).map(async (equipo) => {
            const { data: reportes } = await supabase
              .from("reportes")
              .select("*")
              .eq("equipo_id", equipo.id)
              .eq("tipo_reporte", "EQUIPO")
            return { ...equipo, reportes: reportes || [] }
          })
        )
        setEquipos(equiposConReportes)
      }

      // Cargar equipos generales (GENERAL) - AHORA USANDO LOS CAMPOS DIRECTOS DEL EQUIPO
      const { data: equiposGeneralesData, error: errorGenerales } = await supabase
        .from("equipos")
        .select(`
          *,
          modelo:modelos_equipo(id, nombre, descripcion, categoria)
        `)
        .eq("tipo", "GENERAL")
        .order("estado", { ascending: true })

      if (errorGenerales) {
        console.error("Error equipos generales:", errorGenerales)
        setEquiposGenerales([])
      } else {
        setEquiposGenerales(equiposGeneralesData || [])
      }

      setCargando(false)
    } catch (error) {
      console.error("Error cargando datos:", error)
      setCargando(false)
    }
  }

  // ==================== EQUIPOS CON SERIE ====================
  const asignarEquipo = async () => {
    if (!ambulanciaSeleccionada) {
      alert("Seleccione una ambulancia")
      return
    }

    const { error } = await supabase
      .from("equipos")
      .update({ ambulancia_id: parseInt(ambulanciaSeleccionada) })
      .eq("id", equipoSeleccionado.id)

    if (error) {
      alert("Error al asignar equipo: " + error.message)
      return
    }

    alert("Equipo asignado correctamente")
    setModalAsignacion(false)
    setEquipoSeleccionado(null)
    setAmbulanciaSeleccionada("")
    cargarDatos()
  }

  const desasignarEquipo = async (equipoId) => {
    const confirmar = confirm("¿Desasignar este equipo de la ambulancia?")
    if (!confirmar) return

    const { error } = await supabase
      .from("equipos")
      .update({ ambulancia_id: null })
      .eq("id", equipoId)

    if (error) {
      alert("Error al desasignar equipo: " + error.message)
      return
    }

    cargarDatos()
  }

  const reportarEquipo = async () => {
    if (!descripcionReporte) {
      alert("Describa el problema del equipo")
      return
    }

    const { error } = await supabase
      .from("reportes")
      .insert({
        tipo_reporte: "EQUIPO",
        equipo_id: equipoSeleccionado.id,
        ambulancia_id: equipoSeleccionado.ambulancia_id,
        subadmin_id: user.id,
        descripcion: descripcionReporte,
        estado: "PENDIENTE"
      })

    if (error) {
      alert("Error al enviar reporte: " + error.message)
      return
    }

    alert("Reporte enviado correctamente al administrador")
    setModalReporte(false)
    setEquipoSeleccionado(null)
    setDescripcionReporte("")
    setTipoReporte("FALLA")
    cargarDatos()
  }

  // ==================== EQUIPOS GENERALES ====================
  const reportarConsumible = async () => {
    if (!descripcionReporte) {
      alert("Describa el problema o comentario")
      return
    }

    const { error } = await supabase
      .from("reportes")
      .insert({
        tipo_reporte: "CONSUMIBLE",
        equipo_id: consumibleSeleccionado.id,
        subadmin_id: user.id,
        descripcion: descripcionReporte,
        estado: "PENDIENTE"
      })

    if (error) {
      alert("Error al enviar reporte: " + error.message)
      return
    }

    alert("Comentario enviado correctamente al administrador")
    setModalReporte(false)
    setConsumibleSeleccionado(null)
    setDescripcionReporte("")
    setTipoReporte("FALLA")
    cargarDatos()
  }

  // ==================== FILTROS ====================
  const equiposFiltrados = filtroEstado
    ? equipos.filter(eq => eq.estado === filtroEstado)
    : equipos

  const equiposGeneralesFiltrados = filtroEstado
    ? equiposGenerales.filter(c => c.estado === filtroEstado)
    : equiposGenerales

  const equiposAsignados = equiposFiltrados.filter(eq => eq.ambulancia_id)
  const equiposDisponibles = equiposFiltrados.filter(eq => !eq.ambulancia_id)

  // ==================== UTILIDADES ====================
  const getEstadoColor = (estado) => {
    switch(estado) {
      case "ACTIVO": return { bg: "#dcfce7", color: "#166534", text: "✅ Activo" }
      case "MANTENIMIENTO": return { bg: "#fef9c3", color: "#854d0e", text: "🔧 Mantenimiento" }
      case "INACTIVO": return { bg: "#f3f4f6", color: "#4b5563", text: "⚪ Inactivo" }
      default: return { bg: "#f3f4f6", color: "#4b5563", text: estado }
    }
  }

  const tieneReportePendiente = (equipoId) => {
    const equipo = equipos.find(e => e.id === equipoId)
    if (!equipo?.reportes || equipo.reportes.length === 0) return false
    return equipo.reportes.some(r => r.estado === "PENDIENTE" || r.estado === "EN_REVISION")
  }

  if (cargando) {
    return (
      <SubadminLayout titulo="Gestión de Equipo Médico">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando equipos...</p>
          </div>
        </div>
      </SubadminLayout>
    )
  }

  return (
    <SubadminLayout 
      titulo="Gestión de Equipo Médico"
      subtitulo="Asigna equipos con serie a ambulancias y reporta problemas de equipos generales"
    >
      <div className="subadmin-equipo-container">
        
        {/* Banner */}
        <div className="equipo-banner">
          <div className="equipo-banner-icon">🧰</div>
          <div className="equipo-banner-text">
            <h2>Gestión de Equipo Médico</h2>
            <p>Administra equipos con serie y reporta novedades de equipos generales</p>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="equipo-tabs">
          <button
            className={`tab-button ${tipoVista === "individual" ? "active" : ""}`}
            onClick={() => setTipoVista("individual")}
          >
            <span>🔢</span> Equipos con Serie ({equipos.length})
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
            <label>Filtrar por estado:</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="ACTIVO">✅ Activos</option>
              <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
              <option value="INACTIVO">⚪ Inactivos</option>
            </select>
          </div>
        </div>

        {/* VISTA DE EQUIPOS CON SERIE */}
        {tipoVista === "individual" && (
          <>
            {/* Equipos Asignados por Ambulancia */}
            <div className="equipo-section">
              <div className="section-header">
                <span>🚑</span>
                <h3>Equipos Asignados por Ambulancia</h3>
              </div>

              {ambulancias.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🚑</span>
                  <p>No hay ambulancias activas en esta sede</p>
                </div>
              ) : (
                ambulancias.map(ambulancia => {
                  const equiposEnAmbulancia = equiposAsignados.filter(eq => eq.ambulancia_id === ambulancia.id)
                  return (
                    <div key={ambulancia.id} className="ambulancia-equipo-card">
                      <div className="ambulancia-header">
                        <div className="ambulancia-info">
                          <span className="ambulancia-icon">🚑</span>
                          <div>
                            <h4>{ambulancia.codigo}</h4>
                            <p>{ambulancia.placa}</p>
                          </div>
                        </div>
                        <div className="ambulancia-stats">
                          <span className="badge">{equiposEnAmbulancia.length} equipos</span>
                        </div>
                      </div>
                      <div className="ambulancia-equipos">
                        {equiposEnAmbulancia.length === 0 ? (
                          <p className="no-equipos">Sin equipos asignados</p>
                        ) : (
                          equiposEnAmbulancia.map(equipo => {
                            const estadoStyle = getEstadoColor(equipo.estado)
                            const tieneReporte = tieneReportePendiente(equipo.id)
                            return (
                              <div key={equipo.id} className="equipo-card-small">
                                <div className="equipo-info-small">
                                  <strong>{equipo.modelo?.nombre || "Sin modelo"}</strong>
                                  <span className="serie">N° {equipo.numero_serie}</span>
                                  <span className="estado-badge-small" style={estadoStyle}>
                                    {estadoStyle.text}
                                  </span>
                                  {tieneReporte && (
                                    <span className="reporte-badge">⚠️ Reporte pendiente</span>
                                  )}
                                </div>
                                <div className="equipo-actions-small">
                                  <button
                                    className="btn-reportar"
                                    onClick={() => {
                                      setEquipoSeleccionado(equipo)
                                      setDescripcionReporte("")
                                      setTipoReporte("FALLA")
                                      setModalReporte(true)
                                    }}
                                  >
                                    📋 Reportar falla
                                  </button>
                                  <button
                                    className="btn-desasignar"
                                    onClick={() => desasignarEquipo(equipo.id)}
                                  >
                                    Desasignar
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Equipos Disponibles */}
            <div className="equipo-section">
              <div className="section-header">
                <span>📦</span>
                <h3>Equipos Disponibles para Asignar</h3>
              </div>
              <div className="equipos-disponibles-grid">
                {equiposDisponibles.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <p>No hay equipos disponibles</p>
                  </div>
                ) : (
                  equiposDisponibles.map(equipo => {
                    const estadoStyle = getEstadoColor(equipo.estado)
                    const tieneReporte = tieneReportePendiente(equipo.id)
                    return (
                      <div key={equipo.id} className="equipo-disponible-card">
                        <div className="equipo-info">
                          <strong>{equipo.modelo?.nombre || "Sin modelo"}</strong>
                          <span className="serie">N° {equipo.numero_serie}</span>
                          <span className="estado-badge" style={estadoStyle}>
                            {estadoStyle.text}
                          </span>
                          {tieneReporte && (
                            <span className="reporte-badge">⚠️ Reporte pendiente</span>
                          )}
                          {equipo.modelo?.descripcion && (
                            <p className="equipo-descripcion">{equipo.modelo.descripcion}</p>
                          )}
                        </div>
                        <div className="equipo-actions">
                          <button
                            className="btn-reportar"
                            onClick={() => {
                              setEquipoSeleccionado(equipo)
                              setDescripcionReporte("")
                              setTipoReporte("FALLA")
                              setModalReporte(true)
                            }}
                          >
                            📋 Reportar falla
                          </button>
                          <button
                            className="btn-asignar"
                            onClick={() => {
                              setEquipoSeleccionado(equipo)
                              setAmbulanciaSeleccionada("")
                              setModalAsignacion(true)
                            }}
                            disabled={equipo.estado !== "ACTIVO"}
                          >
                            Asignar a ambulancia
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* VISTA DE EQUIPOS GENERALES - CORREGIDA */}
        {tipoVista === "general" && (
          <div className="equipo-section">
            <div className="section-header">
              <span>📦</span>
              <h3>Equipos Generales ({equiposGeneralesFiltrados.length})</h3>
              <p className="section-note">Estos elementos están disponibles para todas las sedes</p>
            </div>
            <div className="equipos-generales-grid">
              {equiposGeneralesFiltrados.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📦</span>
                  <p>No hay equipos generales registrados</p>
                </div>
              ) : (
                equiposGeneralesFiltrados.map(equipo => {
                  const estadoStyle = getEstadoColor(equipo.estado)
                  return (
                    <div key={equipo.id} className="equipo-general-card">
                      <div className="equipo-general-header">
                        <div className="equipo-general-info">
                          {/* CAMBIO IMPORTANTE: Usar los campos directos del equipo, no del modelo */}
                          <strong>{equipo.nombre || "Equipo sin nombre"}</strong>
                          <span className="estado-badge" style={estadoStyle}>
                            {estadoStyle.text}
                          </span>
                        </div>
                      </div>
                      <div className="equipo-general-detalles">
                        <div className="equipo-general-cantidad">
                          <span className="cantidad-label">📦 Cantidad disponible:</span>
                          <span className="cantidad-valor">{equipo.cantidad} unidades</span>
                        </div>
                        {/* CAMBIO IMPORTANTE: Mostrar categoría del equipo, no del modelo */}
                        {equipo.categoria && (
                          <div className="equipo-general-categoria">
                            <span className="categoria-label">🏷️ Categoría:</span>
                            <span className="categoria-valor">{equipo.categoria}</span>
                          </div>
                        )}
                        {/* CAMBIO IMPORTANTE: Mostrar descripción del equipo, no del modelo */}
                        {equipo.descripcion && (
                          <p className="equipo-general-descripcion">{equipo.descripcion}</p>
                        )}
                        <div className="equipo-general-note">
                          <span className="note-label">📝 Nota:</span>
                          <span className="note-text">Este equipo está disponible para todas las sedes</span>
                        </div>
                      </div>
                      <div className="equipo-general-actions">
                        <button
                          className="btn-reportar"
                          onClick={() => {
                            setConsumibleSeleccionado(equipo)
                            setDescripcionReporte("")
                            setTipoReporte("OBSERVACION")
                            setModalReporte(true)
                          }}
                        >
                          📋 Reportar comentario
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de asignación */}
      {modalAsignacion && equipoSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Asignar equipo a ambulancia</h3>
            <div className="equipo-info-modal">
              <strong>{equipoSeleccionado.modelo?.nombre || "Sin modelo"}</strong>
              <span>N° Serie: {equipoSeleccionado.numero_serie}</span>
            </div>
            <div className="form-group">
              <label>Seleccionar ambulancia</label>
              <select
                value={ambulanciaSeleccionada}
                onChange={(e) => setAmbulanciaSeleccionada(e.target.value)}
                required
              >
                <option value="">Seleccione una ambulancia</option>
                {ambulancias.map(amb => (
                  <option key={amb.id} value={amb.id}>{amb.codigo} - {amb.placa}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => {
                setModalAsignacion(false)
                setEquipoSeleccionado(null)
                setAmbulanciaSeleccionada("")
              }}>Cancelar</button>
              <button className="btn-save" onClick={asignarEquipo}>Asignar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reporte */}
      {modalReporte && (equipoSeleccionado || consumibleSeleccionado) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📋 Reportar {equipoSeleccionado ? "problema de equipo" : "comentario sobre equipo general"}</h3>
            <div className="equipo-info-modal">
              {/* CAMBIO IMPORTANTE: Mostrar información correcta según el tipo */}
              {equipoSeleccionado && (
                <>
                  <strong>{equipoSeleccionado.modelo?.nombre || "Sin modelo"}</strong>
                  <span>N° Serie: {equipoSeleccionado.numero_serie}</span>
                  {equipoSeleccionado.ambulancia && (
                    <span>Ambulancia: {equipoSeleccionado.ambulancia.codigo}</span>
                  )}
                </>
              )}
              {consumibleSeleccionado && (
                <>
                  <strong>{consumibleSeleccionado.nombre || "Equipo sin nombre"}</strong>
                  {consumibleSeleccionado.categoria && (
                    <span>Categoría: {consumibleSeleccionado.categoria}</span>
                  )}
                  <span>Cantidad disponible: {consumibleSeleccionado.cantidad} unidades</span>
                </>
              )}
            </div>
            <div className="form-group">
              <label>Tipo de reporte</label>
              <select value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
                <option value="FALLA">⚠️ Falla técnica</option>
                <option value="MANTENIMIENTO">🔧 Requiere mantenimiento</option>
                <option value="OBSERVACION">📝 Observación / Comentario</option>
              </select>
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                rows="4"
                placeholder={equipoSeleccionado 
                  ? "Describa detalladamente la falla u observación..."
                  : "Describa el problema o comentario sobre el equipo..."
                }
                value={descripcionReporte}
                onChange={(e) => setDescripcionReporte(e.target.value)}
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => {
                setModalReporte(false)
                setEquipoSeleccionado(null)
                setConsumibleSeleccionado(null)
                setDescripcionReporte("")
              }}>Cancelar</button>
              <button 
                className="btn-save" 
                onClick={equipoSeleccionado ? reportarEquipo : reportarConsumible}
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </SubadminLayout>
  )
}