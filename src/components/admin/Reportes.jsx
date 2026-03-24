import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../layout/AdminLayout"
import "../../styles/Reportes.css"

export default function Reportes() {
  const [vista, setVista] = useState("insumos")
  const [insumosData, setInsumosData] = useState([])
  const [reportesEquipo, setReportesEquipo] = useState([])
  const [cargando, setCargando] = useState({ insumos: true, equipo: true })
  const [filtroEstado, setFiltroEstado] = useState("")
  
  // Filtros para insumos
  const [fechaI, setFechaI] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [fechaF, setFechaF] = useState(new Date().toISOString().split('T')[0])
  const [sedeId, setSedeId] = useState("")
  const [ambulanciaId, setAmbulanciaId] = useState("")
  const [paramedicoId, setParamedicoId] = useState("")
  const [sedes, setSedes] = useState([])
  const [ambulancias, setAmbulancias] = useState([])
  const [paramedicos, setParamedicos] = useState([])
  
  // Resumen por insumo
  const [resumenInsumos, setResumenInsumos] = useState([])
  
  // Modal de edición de reporte
  const [modalReporte, setModalReporte] = useState(false)
  const [reporteEditando, setReporteEditando] = useState(null)
  const [nuevoEstado, setNuevoEstado] = useState("")
  const [comentarioAdmin, setComentarioAdmin] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarCatalogos()
  }, [])

  useEffect(() => {
    if (vista === "insumos") {
      cargarInsumos()
    } else {
      cargarReportesEquipo()
    }
  }, [fechaI, fechaF, sedeId, ambulanciaId, paramedicoId])

  const cargarCatalogos = async () => {
    try {
      const { data: sedesData } = await supabase.from("sedes").select("*").order("nombre")
      setSedes(sedesData || [])
      
      const { data: ambulanciasData } = await supabase.from("ambulancias").select("id, codigo").order("codigo")
      setAmbulancias(ambulanciasData || [])
      
      const { data: paramedicosData } = await supabase.from("usuarios").select("id, nombre").eq("rol", "PARAMEDICO").order("nombre")
      setParamedicos(paramedicosData || [])
    } catch (error) {
      console.error("Error cargando catálogos:", error)
    }
  }

  // ==================== CARGA DE DATOS CON FILTROS ====================
  const cargarInsumos = async () => {
    setCargando(prev => ({ ...prev, insumos: true }))
    
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
      if (fechaI) {
        query = query.gte("registros.fecha", fechaI)
      }
      if (fechaF) {
        query = query.lte("registros.fecha", fechaF + " 23:59:59")
      }
      if (sedeId) {
        query = query.eq("registros.sede_id", parseInt(sedeId))
      }
      if (ambulanciaId) {
        query = query.eq("registros.ambulancia_id", parseInt(ambulanciaId))
      }
      if (paramedicoId) {
        query = query.eq("registros.paramedico_id", parseInt(paramedicoId))
      }
      
      const { data, error } = await query.order("registros(fecha)", { ascending: false })
      
      if (error) {
        console.error("Error cargando insumos:", error)
        setInsumosData([])
        setCargando(prev => ({ ...prev, insumos: false }))
        return
      }
      
      if (data && data.length > 0) {
        const dataConCalculo = data.map(item => ({
          ...item,
          cantidad_solicitada: Math.max(0, (item.cantidad_establecida || 1) - (item.cantidad_registrada || 0))
        }))
        
        setInsumosData(dataConCalculo)
        calcularResumenInsumos(dataConCalculo)
      } else {
        setInsumosData([])
        setResumenInsumos([])
      }
    } catch (error) {
      console.error("Error en cargarInsumos:", error)
      setInsumosData([])
    } finally {
      setCargando(prev => ({ ...prev, insumos: false }))
    }
  }

  const calcularResumenInsumos = (data) => {
    if (!data || data.length === 0) {
      setResumenInsumos([])
      return
    }
    
    const resumen = {}
    data.forEach(item => {
      const insumoId = item.insumo_id
      const insumoNombre = item.insumos?.nombre || "Desconocido"
      const categoria = item.insumos?.categoria || "Sin categoría"
      const cantidadRegistrada = item.cantidad_registrada || 0
      const cantidadEstablecida = item.cantidad_establecida ?? 1
      const cantidadSolicitada = Math.max(0, cantidadEstablecida - cantidadRegistrada)
      
      if (!resumen[insumoId]) {
        resumen[insumoId] = {
          id: insumoId,
          nombre: insumoNombre,
          categoria: categoria,
          total_registrado: 0,
          total_establecido: 0,
          total_solicitado: 0,
          registros: 0
        }
      }
      resumen[insumoId].total_registrado += cantidadRegistrada
      resumen[insumoId].total_establecido += cantidadEstablecida
      resumen[insumoId].total_solicitado += cantidadSolicitada
      resumen[insumoId].registros += 1
    })
    
    const resumenArray = Object.values(resumen).sort((a, b) => b.total_solicitado - a.total_solicitado)
    setResumenInsumos(resumenArray)
  }

  const cargarReportesEquipo = async () => {
    setCargando(prev => ({ ...prev, equipo: true }))
    
    try {
      const { data, error } = await supabase
        .from("reportes")
        .select(`
          *,
          equipo:equipos(
            *,
            modelo:modelos_equipo(id, nombre, descripcion, categoria),
            ambulancia:ambulancias(codigo, placa),
            sede:sedes(nombre)
          ),
          subadmin:usuarios(nombre, correo)
        `)
        .in("tipo_reporte", ["EQUIPO", "CONSUMIBLE"])
        .order("fecha_reporte", { ascending: false })
  
      if (error) {
        console.error("Error cargando reportes equipo:", error)
        setReportesEquipo([])
      } else {
        setReportesEquipo(data || [])
      }
    } catch (error) {
      console.error("Error en cargarReportesEquipo:", error)
      setReportesEquipo([])
    } finally {
      setCargando(prev => ({ ...prev, equipo: false }))
    }
  }

  // ==================== ACTUALIZAR REPORTE ====================
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

  const abrirModalEditar = (reporte) => {
    setReporteEditando(reporte)
    setNuevoEstado(reporte.estado)
    setComentarioAdmin(reporte.comentario_admin || "")
    setModalReporte(true)
  }

  const cerrarModal = () => {
    setModalReporte(false)
    setReporteEditando(null)
    setNuevoEstado("")
    setComentarioAdmin("")
    setGuardando(false)
  }

  // ==================== EXPORTAR EXCEL ====================
  const exportarExcel = (tipo) => {
    if (tipo === "insumos") {
      if (insumosData.length === 0) {
        alert("No hay datos de insumos registrados con los filtros seleccionados")
        return
      }

      let csv = "Registro,Sede,Fecha,Paramédico,Ambulancia,Insumo,Cantidad Establecida,Cantidad Registrada,Cantidad Solicitada,Comentario\n"
      insumosData.forEach(d => {
        csv += `${d.registros?.id || ""},${d.registros?.sedes?.nombre || ""},${d.registros?.fecha || ""},${d.registros?.paramedico_id || ""},${d.registros?.ambulancia_id || ""},${d.insumos?.nombre || ""},${d.cantidad_establecida ?? 1},${d.cantidad_registrada || 0},${d.cantidad_solicitada ?? 0},${d.comentario || ""}\n`
      })
      
      csv += "\n\n=== RESUMEN POR INSUMO ===\n"
      csv += "Insumo,Categoría,Total Establecido,Total Registrado,Total Solicitado,Registros\n"
      resumenInsumos.forEach(r => {
        csv += `${r.nombre},${r.categoria},${r.total_establecido},${r.total_registrado},${r.total_solicitado},${r.registros}\n`
      })
      
      descargarArchivo(csv, "reporte_insumos.csv")
    } else {
      if (reportesEquipo.length === 0) {
        alert("No hay reportes de equipo")
        return
      }

      let csv = "ID,Equipo,Sede,Ambulancia,Tipo,Descripción,Estado,Reportado por,Fecha,Comentario Admin\n"
      reportesEquipo.forEach(r => {
        csv += `${r.id},${r.equipo?.modelo?.nombre || ""},${r.equipo?.sede?.nombre || ""},${r.equipo?.ambulancia?.codigo || "No asignada"},${r.tipo_reporte},${r.descripcion},${r.estado},${r.subadmin?.nombre || ""},${r.fecha_reporte},${r.comentario_admin || ""}\n`
      })
      descargarArchivo(csv, "reporte_equipo.csv")
    }
  }

  const descargarArchivo = (contenido, nombreArchivo) => {
    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = nombreArchivo
    link.click()
    URL.revokeObjectURL(url)
  }

  const getEstadoColor = (estado) => {
    const estados = {
      PENDIENTE: { bg: "#fee2e2", color: "#991b1b", text: "🔴 Pendiente" },
      EN_REVISION: { bg: "#fef9c3", color: "#854d0e", text: "🟡 En revisión" },
      RESUELTO: { bg: "#dcfce7", color: "#166534", text: "🟢 Resuelto" }
    }
    return estados[estado] || { bg: "#f3f4f6", color: "#4b5563", text: estado }
  }

  const getTipoIcono = (tipo) => {
    const iconos = {
      FALLA: "⚠️",
      MANTENIMIENTO: "🔧",
      OBSERVACION: "📝"
    }
    return iconos[tipo] || "📋"
  }

  const reportesFiltrados = filtroEstado
    ? reportesEquipo.filter(r => r.estado === filtroEstado)
    : reportesEquipo

  // ==================== RENDER ====================
  return (
    <AdminLayout 
      titulo="Reportes del Sistema"
      subtitulo="Consulta y exporta reportes de insumos y equipo médico"
    >
      <div className="reportes-unificado">
        
        {/* Banner */}
        <div className="reportes-banner">
          <div className="reportes-banner-icon">📊</div>
          <div className="reportes-banner-text">
            <h2>Centro de Reportes</h2>
            <p>Consulta detallada de insumos utilizados y reportes de equipo médico</p>
          </div>
        </div>

        {/* Pestañas */}
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

        {/* Sección de Insumos */}
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
                    {ambulancias.map(a => <option key={a.id} value={a.id}>{a.codigo}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Paramédico</label>
                  <select value={paramedicoId} onChange={(e) => setParamedicoId(e.target.value)}>
                    <option value="">Todos los paramédicos</option>
                    {paramedicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="filtros-actions">
                <button onClick={() => exportarExcel("insumos")} className="btn-excel">
                  <span>📊</span> Descargar Excel
                </button>
                {(sedeId || ambulanciaId || paramedicoId || fechaI !== new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || fechaF !== new Date().toISOString().split('T')[0]) && (
                  <button onClick={() => {
                    setFechaI(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                    setFechaF(new Date().toISOString().split('T')[0])
                    setSedeId("")
                    setAmbulanciaId("")
                    setParamedicoId("")
                  }} className="btn-limpiar">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Resumen por insumo */}
            {resumenInsumos.length > 0 && (
              <div className="resumen-insumos">
                <h4>📊 Resumen de consumo por insumo</h4>
                <div className="resumen-grid-insumos">
                  {resumenInsumos.map(insumo => (
                    <div key={insumo.id} className="resumen-card-insumo">
                      <div className="resumen-insumo-nombre">{insumo.nombre}</div>
                      <div className="resumen-insumo-categoria">{insumo.categoria}</div>
                      <div className="resumen-insumo-cantidades">
                        <div className="cantidad-item">
                          <span className="cantidad-label">Establecido:</span>
                          <span className="cantidad-valor establecido">{insumo.total_establecido}</span>
                        </div>
                        <div className="cantidad-item">
                          <span className="cantidad-label">Registrado:</span>
                          <span className="cantidad-valor registrado">{insumo.total_registrado}</span>
                        </div>
                        <div className="cantidad-item">
                          <span className="cantidad-label">Solicitado:</span>
                          <span className="cantidad-valor solicitado">{insumo.total_solicitado}</span>
                        </div>
                      </div>
                      <div className="resumen-insumo-registros">
                        <span className="registros-label">Registros:</span>
                        <span className="registros-valor">{insumo.registros}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla de detalles */}
            {cargando.insumos ? (
              <div className="loading-container">
                <div className="loading-spinner"><span>⛑️</span><p>Cargando datos...</p></div>
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
                      <th>Registro</th><th>Sede</th><th>Fecha</th><th>Paramédico</th><th>Ambulancia</th><th>Insumo</th>
                      <th>Establecido</th><th>Registrado</th><th>Solicitado</th><th>Comentario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosData.map((d, i) => (
                      <tr key={i}>
                        <td>{d.registros?.id}</td>
                        <td>{d.registros?.sedes?.nombre}</td>
                        <td>{new Date(d.registros?.fecha).toLocaleString()}</td>
                        <td>{d.registros?.paramedico_id}</td>
                        <td>{d.registros?.ambulancia_id}</td>
                        <td>{d.insumos?.nombre}</td>
                        <td className="cantidad-cell establecido">{d.cantidad_establecida ?? 1}</td>
                        <td className="cantidad-cell registrado">{d.cantidad_registrada || 0}</td>
                        <td className="cantidad-cell solicitado">{d.cantidad_solicitada ?? 0}</td>
                        <td className="comentario-cell">{d.comentario || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sección de Reportes de Equipo */}
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

            {cargando.equipo ? (
              <div className="loading-container">
                <div className="loading-spinner"><span>⛑️</span><p>Cargando reportes...</p></div>
              </div>
            ) : reportesFiltrados.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">✅</span><p>No hay reportes de equipo</p></div>
            ) : (
              <div className="reportes-grid-equipo">
                {reportesFiltrados.map(reporte => {
                  const estadoStyle = getEstadoColor(reporte.estado)
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
                        <strong>{reporte.equipo?.modelo?.nombre}</strong>
                        <span className="serie">N° Serie: {reporte.equipo?.numero_serie}</span>
                      </div>

                      <div className="reporte-ubicacion">
                        <span>🏢 Sede: {reporte.equipo?.sede?.nombre}</span>
                        <span>🚑 Ambulancia: {reporte.equipo?.ambulancia?.codigo || "No asignada"}</span>
                      </div>

                      <div className="reporte-descripcion">
                        <strong>Descripción:</strong>
                        <p>{reporte.descripcion}</p>
                      </div>

                      <div className="reporte-info">
                        <span>👤 Reportado por: {reporte.subadmin?.nombre}</span>
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
                        ✏️ Cambiar Estado
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para editar reporte */}
      {modalReporte && reporteEditando && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📋 Actualizar Reporte</h3>
            
            <div className="reporte-info-modal">
              <p><strong>Equipo:</strong> {reporteEditando.equipo?.modelo?.nombre}</p>
              <p><strong>Serie:</strong> {reporteEditando.equipo?.numero_serie}</p>
              <p><strong>Sede:</strong> {reporteEditando.equipo?.sede?.nombre}</p>
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
                {guardando ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}