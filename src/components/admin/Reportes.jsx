/**
 * @component Reportes
 * @description Centro de reportes unificado del sistema:
 *              - Reporte de insumos registrados (con filtros por fecha, sede, ambulancia, paramédico)
 *              - Reporte de equipo médico (fallas, mantenimiento, observaciones)
 *              - Exportación a Excel/CSV
 *              - Gestión de estados de reportes (Pendiente, En revisión, Resuelto)
 * @returns {JSX.Element}
 */

import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../layout/AdminLayout"
import "../../styles/Reportes.css"

export default function Reportes() {
  // ===== ESTADOS DE VISTA =====
  const [vista, setVista] = useState("insumos")
  
  // ===== ESTADOS DE DATOS =====
  const [insumosData, setInsumosData] = useState([])
  const [reportesEquipo, setReportesEquipo] = useState([])
  const [cargandoInsumos, setCargandoInsumos] = useState(true)
  const [cargandoEquipo, setCargandoEquipo] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  
  // ===== FILTROS PARA INSUMOS =====
  const [fechaI, setFechaI] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [fechaF, setFechaF] = useState(new Date().toISOString().split('T')[0])
  const [sedeId, setSedeId] = useState("")
  const [ambulanciaId, setAmbulanciaId] = useState("")
  const [paramedicoId, setParamedicoId] = useState("")
  
  // ===== CATÁLOGOS =====
  const [sedes, setSedes] = useState([])
  const [ambulancias, setAmbulancias] = useState([])
  const [ambulanciasFiltradas, setAmbulanciasFiltradas] = useState([])
  const [paramedicos, setParamedicos] = useState([])
  const [paramedicosFiltrados, setParamedicosFiltrados] = useState([])
  
  // ===== MODAL DE EDICIÓN =====
  const [modalReporte, setModalReporte] = useState(false)
  const [reporteEditando, setReporteEditando] = useState(null)
  const [nuevoEstado, setNuevoEstado] = useState("")
  const [comentarioAdmin, setComentarioAdmin] = useState("")
  const [guardando, setGuardando] = useState(false)

  // ===== CARGA INICIAL =====
  useEffect(() => {
    cargarCatalogos()
  }, [])

  // ===== CARGA SEGÚN VISTA Y FILTROS =====
  useEffect(() => {
    if (vista === "insumos") {
      cargarInsumos()
    } else {
      cargarReportesEquipo()
    }
  }, [vista, fechaI, fechaF, sedeId, ambulanciaId, paramedicoId])

  // ===== FILTRAR AMBULANCIAS POR SEDE =====
  useEffect(() => {
    if (sedeId) {
      const filtradas = ambulancias.filter(a => a.sede_id === parseInt(sedeId))
      setAmbulanciasFiltradas(filtradas)
      if (ambulanciaId && !filtradas.some(a => a.id === parseInt(ambulanciaId))) {
        setAmbulanciaId("")
      }
    } else {
      setAmbulanciasFiltradas(ambulancias)
    }
  }, [sedeId, ambulancias, ambulanciaId])

  // ===== FILTRAR PARAMÉDICOS POR SEDE =====
  useEffect(() => {
    if (sedeId) {
      const filtrados = paramedicos.filter(p => p.sede_id === parseInt(sedeId))
      setParamedicosFiltrados(filtrados)
      if (paramedicoId && !filtrados.some(p => p.id === parseInt(paramedicoId))) {
        setParamedicoId("")
      }
    } else {
      setParamedicosFiltrados(paramedicos)
    }
  }, [sedeId, paramedicos, paramedicoId])

  /**
   * Carga catálogos de sedes, ambulancias y paramédicos
   */
  const cargarCatalogos = async () => {
    try {
      const { data: sedesData } = await supabase.from("sedes").select("*").order("nombre")
      setSedes(sedesData || [])
      
      const { data: ambulanciasData } = await supabase
        .from("ambulancias") 
        .select("id, codigo, sede_id")
        .order("codigo")
      setAmbulancias(ambulanciasData || [])
      setAmbulanciasFiltradas(ambulanciasData || [])
      
      const { data: paramedicosData } = await supabase
        .from("usuarios") 
        .select("id, nombre, sede_id")
        .eq("rol", "PARAMEDICO")
        .order("nombre")
      setParamedicos(paramedicosData || [])
      setParamedicosFiltrados(paramedicosData || [])
      
    } catch (error) {
      console.error("Error cargando catálogos:", error)
    }
  }

  /**
   * Carga el reporte de insumos con filtros aplicados
   */
  const cargarInsumos = async () => {
    setCargandoInsumos(true)
    
    try {
      let query = supabase
        .from("detalle_insumos")
        .select(`
          cantidad_registrada,
          cantidad_establecida,
          comentario,
          insumo_id,
          insumos ( id, nombre, categoria ),
          registros!inner (
            id,
            paramedico_id,
            ambulancia_id,
            fecha,
            sede_id,
            sedes ( id, nombre )
          )
        `)
      
      // Aplicar filtros
      if (fechaI) query = query.gte("registros.fecha", fechaI)
      if (fechaF) query = query.lte("registros.fecha", fechaF + " 23:59:59")
      if (sedeId) query = query.eq("registros.sede_id", parseInt(sedeId))
      if (ambulanciaId) query = query.eq("registros.ambulancia_id", parseInt(ambulanciaId))
      if (paramedicoId) query = query.eq("registros.paramedico_id", parseInt(paramedicoId))
      
      const { data, error } = await query.order("registros(fecha)", { ascending: false })
      
      if (error) {
        console.error("Error cargando insumos:", error)
        setInsumosData([])
        return
      }
      
      if (data && data.length > 0) {
        // Obtener nombres de paramédicos y ambulancias
        const paramedicoIds = [...new Set(data.map(item => item.registros?.paramedico_id).filter(id => id))]
        const ambulanciaIds = [...new Set(data.map(item => item.registros?.ambulancia_id).filter(id => id))]
        
        const { data: paramedicosData } = await supabase
          .from("usuarios")
          .select("id, nombre")
          .in("id", paramedicoIds)
        
        const { data: ambulanciasData } = await supabase
          .from("ambulancias")
          .select("id, codigo")
          .in("id", ambulanciaIds)
        
        const paramedicosMap = {}
        paramedicosData?.forEach(p => { paramedicosMap[p.id] = p.nombre })
        
        const ambulanciasMap = {}
        ambulanciasData?.forEach(a => { ambulanciasMap[a.id] = a.codigo })
        
        const dataConNombres = data.map(item => ({
          ...item,
          cantidad_solicitada: Math.max(0, (item.cantidad_establecida || 1) - (item.cantidad_registrada || 0)),
          paramedico_nombre: paramedicosMap[item.registros?.paramedico_id] || `ID: ${item.registros?.paramedico_id}`,
          ambulancia_codigo: ambulanciasMap[item.registros?.ambulancia_id] || `ID: ${item.registros?.ambulancia_id}`
        }))
        
        setInsumosData(dataConNombres)
      } else {
        setInsumosData([])
      }
    } catch (error) {
      console.error("Error en cargarInsumos:", error)
      setInsumosData([])
    } finally {
      setCargandoInsumos(false)
    }
  }

  /**
   * Carga los reportes de equipo médico
   */
  const cargarReportesEquipo = async () => {
    setCargandoEquipo(true)
    
    try {
      const { data, error } = await supabase
        .from("reportes")
        .select(`
          *,
          equipo:equipos(
            id,
            tipo,
            nombre,
            descripcion,
            categoria,
            cantidad,
            numero_serie,
            modelo:modelos_equipo(id, nombre, descripcion, categoria),
            ambulancia:ambulancias(codigo, placa),
            sede:sedes(nombre)
          ),
          subadmin:usuarios(nombre, correo)
        `)
        .in("tipo_reporte", ["EQUIPO", "CONSUMIBLE"])
        .order("fecha_reporte", { ascending: false })
        .limit(100)
  
      if (error) {
        console.error("Error cargando reportes equipo:", error)
        setReportesEquipo([])
      } else {
        const reportesFormateados = (data || []).map(reporte => {
          const equipo = reporte.equipo
          if (!equipo) return reporte
          
          let nombreEquipo = ""
          let descripcionEquipo = ""
          let categoriaEquipo = ""
          let numeroSerie = null
          let esGeneral = false
          
          if (equipo.tipo === "GENERAL") {
            esGeneral = true
            nombreEquipo = equipo.nombre || "Equipo sin nombre"
            descripcionEquipo = equipo.descripcion || ""
            categoriaEquipo = equipo.categoria || ""
          } else {
            nombreEquipo = equipo.modelo?.nombre || "Equipo sin modelo"
            descripcionEquipo = equipo.modelo?.descripcion || ""
            categoriaEquipo = equipo.modelo?.categoria || ""
            numeroSerie = equipo.numero_serie
          }
          
          return {
            ...reporte,
            equipo_info: {
              id: equipo.id,
              tipo: equipo.tipo,
              nombre: nombreEquipo,
              descripcion: descripcionEquipo,
              categoria: categoriaEquipo,
              numero_serie: numeroSerie,
              cantidad: equipo.cantidad,
              es_general: esGeneral,
              sede: equipo.sede,
              ambulancia: equipo.ambulancia
            }
          }
        })
        
        setReportesEquipo(reportesFormateados)
      }
    } catch (error) {
      console.error("Error en cargarReportesEquipo:", error)
      setReportesEquipo([])
    } finally {
      setCargandoEquipo(false)
    }
  }

  /**
   * Actualiza el estado de un reporte
   */
  const actualizarReporte = async () => {
    if (!nuevoEstado) {
      alert("Seleccione un estado")
      return
    }

    setGuardando(true)

    const updateData = {
      estado: nuevoEstado,
      comentario_admin: comentarioAdmin
    }

    if (nuevoEstado === "RESUELTO") {
      updateData.fecha_resolucion = new Date().toISOString()
    }

    const { error } = await supabase
      .from("reportes")
      .update(updateData)
      .eq("id", reporteEditando.id)

    if (error) {
      alert("Error al actualizar reporte: " + error.message)
      setGuardando(false)
      return
    }

    alert("Reporte actualizado correctamente")
    cerrarModal()
    cargarReportesEquipo()
  }

  /**
   * Abre modal para editar un reporte
   * @param {Object} reporte - Reporte a editar
   */
  const abrirModalEditar = (reporte) => {
    setReporteEditando(reporte)
    setNuevoEstado(reporte.estado)
    setComentarioAdmin(reporte.comentario_admin || "")
    setModalReporte(true)
  }

  /**
   * Cierra el modal de edición
   */
  const cerrarModal = () => {
    setModalReporte(false)
    setReporteEditando(null)
    setNuevoEstado("")
    setComentarioAdmin("")
    setGuardando(false)
  }

  /**
   * Exporta datos a Excel/CSV
   * @param {string} tipo - Tipo de reporte ("insumos" o "equipo")
   */
  const exportarExcel = (tipo) => {
    if (tipo === "insumos") {
      if (insumosData.length === 0) {
        alert("No hay datos de insumos registrados con los filtros seleccionados")
        return
      }

      let csv = "Registro,Sede,Fecha,Paramédico,Ambulancia,Insumo,Cantidad Establecida,Cantidad Registrada,Cantidad Solicitada,Comentario\n"
      insumosData.forEach(d => {
        csv += `${d.registros?.id || ""},${d.registros?.sedes?.nombre || ""},${d.registros?.fecha || ""},${d.paramedico_nombre || ""},${d.ambulancia_codigo || ""},${d.insumos?.nombre || ""},${d.cantidad_establecida ?? 1},${d.cantidad_registrada || 0},${d.cantidad_solicitada ?? 0},"${(d.comentario || "").replace(/"/g, '""')}"\n`
      })
      
      descargarArchivo(csv, "reporte_insumos.csv")
    } else {
      if (reportesEquipo.length === 0) {
        alert("No hay reportes de equipo")
        return
      }

      let csv = "ID,Equipo,Tipo,Sede,Ambulancia,Tipo Reporte,Descripción,Estado,Reportado por,Fecha,Comentario Admin,Fecha Resolución\n"
      reportesEquipo.forEach(r => {
        const equipoInfo = r.equipo_info || r.equipo
        const nombreEquipo = equipoInfo?.nombre || "Equipo sin nombre"
        const tipoEquipo = equipoInfo?.tipo === "GENERAL" ? "General" : "Individual"
        const numeroSerie = equipoInfo?.numero_serie ? ` (${equipoInfo.numero_serie})` : ""
        csv += `${r.id},${nombreEquipo}${numeroSerie},${tipoEquipo},${equipoInfo?.sede?.nombre || ""},${equipoInfo?.ambulancia?.codigo || "No asignada"},${r.tipo_reporte},"${(r.descripcion || "").replace(/"/g, '""')}",${r.estado},${r.subadmin?.nombre || ""},${r.fecha_reporte},${r.comentario_admin || ""},${r.fecha_resolucion || ""}\n`
      })
      descargarArchivo(csv, "reporte_equipo.csv")
    }
  }

  /**
   * Descarga un archivo CSV
   * @param {string} contenido - Contenido del archivo
   * @param {string} nombreArchivo - Nombre del archivo
   */
  const descargarArchivo = (contenido, nombreArchivo) => {
    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = nombreArchivo
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Limpia todos los filtros de insumos
   */
  const limpiarFiltros = () => {
    setFechaI(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setFechaF(new Date().toISOString().split('T')[0])
    setSedeId("")
    setAmbulanciaId("")
    setParamedicoId("")
  }

  /**
   * Obtiene estilos según el estado del reporte
   * @param {string} estado - Estado del reporte
   * @returns {Object} Estilos CSS y texto
   */
  const getEstadoColor = (estado) => {
    const estados = {
      PENDIENTE: { bg: "#fee2e2", color: "#991b1b", text: "🔴 Pendiente" },
      EN_REVISION: { bg: "#fef9c3", color: "#854d0e", text: "🟡 En revisión" },
      RESUELTO: { bg: "#dcfce7", color: "#166534", text: "🟢 Resuelto" }
    }
    return estados[estado] || { bg: "#f3f4f6", color: "#4b5563", text: estado }
  }

  /**
   * Obtiene icono según tipo de reporte
   * @param {string} tipo - Tipo de reporte
   * @returns {string} Emoji del tipo
   */
  const getTipoIcono = (tipo) => {
    const iconos = {
      FALLA: "⚠️",
      MANTENIMIENTO: "🔧",
      OBSERVACION: "📝"
    }
    return iconos[tipo] || "📋"
  }

  // Reportes filtrados por estado
  const reportesFiltrados = filtroEstado
    ? reportesEquipo.filter(r => r.estado === filtroEstado)
    : reportesEquipo

  // ===== RENDER =====
  return (
    <AdminLayout 
      titulo="Reportes del Sistema"
      subtitulo="Consulta y exporta reportes de insumos y equipo médico"
    >
      <div className="reportes-unificado">
        
        {/* BANNER */}
        <div className="reportes-banner">
          <div className="reportes-banner-icon">📊</div>
          <div className="reportes-banner-text">
            <h2>Centro de Reportes</h2>
            <p>Consulta detallada de insumos utilizados y reportes de equipo médico</p>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="reportes-tabs">
          <button
            className={`tab-button ${vista === "insumos" ? "active" : ""}`}
            onClick={() => setVista("insumos")}
          >
            <span>💊</span> Insumos
          </button>
          <button
            className={`tab-button ${vista === "equipo" ? "active" : ""}`}
            onClick={() => setVista("equipo")}
          >
            <span>🧰</span> Reportes de Equipo
          </button>
        </div>

        {/* ===== SECCIÓN DE INSUMOS ===== */}
        {vista === "insumos" && (
          <div className="reportes-section">
            <div className="section-header">
              <div className="section-title">
                <span>💊</span>
                <h3>Reporte de insumos registrados</h3>
              </div>
            </div>

            {/* Filtros */}
            <div className="filtros-insumos">
              <div className="filtros-grid">
                <div className="filtro-group">
                  <label>Fecha Inicio</label>
                  <input type="date" value={fechaI} onChange={(e) => setFechaI(e.target.value)} />
                </div>
                <div className="filtro-group">
                  <label>Fecha Fin</label>
                  <input type="date" value={fechaF} onChange={(e) => setFechaF(e.target.value)} />
                </div>
                <div className="filtro-group">
                  <label>Sede</label>
                  <select value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
                    <option value="">Todas las sedes</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Ambulancia</label>
                  <select value={ambulanciaId} onChange={(e) => setAmbulanciaId(e.target.value)}>
                    <option value="">Todas las ambulancias</option>
                    {ambulanciasFiltradas.map(a => <option key={a.id} value={a.id}>{a.codigo}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Paramédico</label>
                  <select value={paramedicoId} onChange={(e) => setParamedicoId(e.target.value)}>
                    <option value="">Todos los paramédicos</option>
                    {paramedicosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="filtros-actions">
                <button onClick={() => exportarExcel("insumos")} className="btn-excel">
                  <span>📊</span> Descargar Excel
                </button>
                {(sedeId || ambulanciaId || paramedicoId || 
                  fechaI !== new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || 
                  fechaF !== new Date().toISOString().split('T')[0]) && (
                  <button onClick={limpiarFiltros} className="btn-limpiar">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de insumos */}
            {cargandoInsumos ? (
              <div className="loading-container">
                <div className="loading-spinner"><span>⟳</span><p>Cargando datos...</p></div>
              </div>
            ) : insumosData.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No hay registros de insumos con los filtros seleccionados</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="reportes-table">
                  <thead>
                    <tr>
                      <th>Registro</th>
                      <th>Sede</th>
                      <th>Fecha</th>
                      <th>Paramédico</th>
                      <th>Ambulancia</th>
                      <th>Insumo</th>
                      <th>Establecido</th>
                      <th>Registrado</th>
                      <th>Solicitado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosData.map((d, i) => (
                      <tr key={i}>
                        <td>{d.registros?.id}</td>
                        <td>{d.registros?.sedes?.nombre}</td>
                        <td>{new Date(d.registros?.fecha).toLocaleString()}</td>
                        <td><strong>{d.paramedico_nombre}</strong></td>
                        <td>{d.ambulancia_codigo}</td>
                        <td>{d.insumos?.nombre}</td>
                        <td className="cantidad-cell establecido">{d.cantidad_establecida ?? 1}</td>
                        <td className="cantidad-cell registrado">{d.cantidad_registrada || 0}</td>
                        <td className="cantidad-cell solicitado">{d.cantidad_solicitada ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== SECCIÓN DE REPORTES DE EQUIPO ===== */}
        {vista === "equipo" && (
          <div className="reportes-section">
            <div className="section-header">
              <div className="section-title">
                <span>🧰</span>
                <h3>Reportes de equipo médico</h3>
              </div>
              <div className="section-actions">
                <div className="filtro-group">
                  <label>Filtrar por estado:</label>
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="PENDIENTE">🔴 Pendientes</option>
                    <option value="EN_REVISION">🟡 En revisión</option>
                    <option value="RESUELTO">🟢 Resueltos</option>
                  </select>
                </div>
                <button onClick={() => exportarExcel("equipo")} className="btn-excel">
                  <span>📊</span> Descargar Excel
                </button>
              </div>
            </div>

            {cargandoEquipo ? (
              <div className="loading-container">
                <div className="loading-spinner"><span>⟳</span><p>Cargando reportes...</p></div>
              </div>
            ) : reportesFiltrados.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <p>No hay reportes de equipo</p>
              </div>
            ) : (
              <div className="reportes-grid-equipo">
                {reportesFiltrados.map(reporte => {
                  const estadoStyle = getEstadoColor(reporte.estado)
                  const equipoInfo = reporte.equipo_info || reporte.equipo
                  const esGeneral = equipoInfo?.tipo === "GENERAL"
                  
                  return (
                    <div key={reporte.id} className={`reporte-equipo-card ${reporte.estado.toLowerCase()}`}>
                      <div className="reporte-header">
                        <div className="reporte-tipo">
                          <span className="tipo-icono">{getTipoIcono(reporte.tipo_reporte)}</span>
                          <span className="tipo-texto">{reporte.tipo_reporte}</span>
                        </div>
                        <span className="reporte-estado" style={estadoStyle}>{estadoStyle.text}</span>
                      </div>

                      <div className="reporte-equipo">
                        <strong>{equipoInfo?.nombre || "Equipo sin nombre"}</strong>
                        {!esGeneral && equipoInfo?.numero_serie && (
                          <span className="serie">🔢 N° Serie: {equipoInfo.numero_serie}</span>
                        )}
                        {esGeneral && equipoInfo?.cantidad && (
                          <span className="cantidad-badge">📦 Cantidad: {equipoInfo.cantidad} unidades</span>
                        )}
                        {equipoInfo?.categoria && (
                          <span className="categoria-badge">🏷️ {equipoInfo.categoria}</span>
                        )}
                      </div>

                      <div className="reporte-ubicacion">
                        <span>🏢 Sede: {equipoInfo?.sede?.nombre || "Sin sede"}</span>
                        <span>🚑 Ambulancia: {equipoInfo?.ambulancia?.codigo || "No asignada"}</span>
                      </div>

                      <div className="reporte-descripcion">
                        <strong>📋 Reporte:</strong>
                        <p>{reporte.descripcion}</p>
                      </div>

                      <div className="reporte-info">
                        <span>👤 Reportado por: {reporte.subadmin?.nombre || "N/A"}</span>
                        <span>📅 {new Date(reporte.fecha_reporte).toLocaleString()}</span>
                      </div>

                      {reporte.comentario_admin && (
                        <div className="reporte-respuesta">
                          <strong>📝 Respuesta del Admin:</strong>
                          <p>{reporte.comentario_admin}</p>
                        </div>
                      )}

                      {reporte.fecha_resolucion && (
                        <div className="reporte-resolucion">
                          <span>✅ Resuelto el: {new Date(reporte.fecha_resolucion).toLocaleString()}</span>
                        </div>
                      )}

                      <button className="btn-editar-reporte" onClick={() => abrirModalEditar(reporte)}>
                        ✏️ Cambiar estado
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODAL PARA EDITAR REPORTE ===== */}
      {modalReporte && reporteEditando && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📋 Actualizar reporte</h3>
            
            <div className="reporte-info-modal">
              <p><strong>Equipo:</strong> {reporteEditando.equipo_info?.nombre || reporteEditando.equipo?.modelo?.nombre || "Equipo sin nombre"}</p>
              {reporteEditando.equipo_info?.numero_serie && (
                <p><strong>Serie:</strong> {reporteEditando.equipo_info.numero_serie}</p>
              )}
              {reporteEditando.equipo_info?.tipo === "GENERAL" && (
                <p><strong>Cantidad:</strong> {reporteEditando.equipo_info.cantidad} unidades</p>
              )}
              <p><strong>Reportado por:</strong> {reporteEditando.subadmin?.nombre}</p>
              <p><strong>Descripción:</strong> {reporteEditando.descripcion}</p>
            </div>

            <div className="form-group">
              <label>Estado del reporte</label>
              <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
                <option value="PENDIENTE">🔴 Pendiente</option>
                <option value="EN_REVISION">🟡 En revisión</option>
                <option value="RESUELTO">🟢 Resuelto</option>
              </select>
            </div>

            <div className="form-group">
              <label>Comentario / Solución</label>
              <textarea
                rows="4"
                placeholder="Describa la acción tomada o solución aplicada..."
                value={comentarioAdmin}
                onChange={(e) => setComentarioAdmin(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-save" onClick={actualizarReporte} disabled={guardando}>
                {guardando ? "⏳ Guardando..." : "💾 Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}