import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import SubadminLayout from "../layout/SubadminLayout"
import "../../styles/SubadminDashboard.css"

export default function SubadminDashboard() {
  const { user } = useAuth()
  const [ambulancias, setAmbulancias] = useState([])
  const [paramedicos, setParamedicos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [insumosPendientes, setInsumosPendientes] = useState(0)
  const [reportesPendientes, setReportesPendientes] = useState(0)
  const [notificaciones, setNotificaciones] = useState([])
  const [actividadesRecientes, setActividadesRecientes] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    if (user?.sede_id) {
      cargarDatos()
    }
  }, [user])

  const cargarDatos = async () => {
    // Ambulancias de la sede
    const { data: ambulanciasData } = await supabase
      .from("ambulancias")
      .select("*")
      .eq("sede_id", user.sede_id)

    if (ambulanciasData) {
      setAmbulancias(ambulanciasData)
    }

    // Paramédicos de la sede
    const { data: paramedicosData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("sede_id", user.sede_id)
      .eq("rol", "PARAMEDICO")

    if (paramedicosData) {
      setParamedicos(paramedicosData)
    }

    // Equipos de la sede (INDIVIDUAL)
    const { data: equiposData } = await supabase
      .from("equipos")
      .select(`
        *,
        modelo:modelos_equipo(nombre)
      `)
      .eq("sede_id", user.sede_id)
      .eq("tipo", "INDIVIDUAL")

    if (equiposData) {
      setEquipos(equiposData)
    }

    // Insumos sin configurar (cantidad 0)
    const { data: configurados } = await supabase
      .from("insumos_por_sede")
      .select("*")
      .eq("sede_id", user.sede_id)
      .eq("cantidad_establecida", 0)

    setInsumosPendientes(configurados?.length || 0)

    // Reportes de equipo pendientes Y resueltos recientemente
    const { data: reportes } = await supabase
      .from("reportes")
      .select(`
        *,
        equipo:equipos(
          *,
          modelo:modelos_equipo(nombre)
        )
      `)
      .eq("equipo.sede_id", user.sede_id)
      .in("tipo_reporte", ["EQUIPO", "CONSUMIBLE"])

    // Contar pendientes
    const pendientes = (reportes || []).filter(r => 
      r.estado === "PENDIENTE" || r.estado === "EN_REVISION"
    ).length
    setReportesPendientes(pendientes)

    // Actividades recientes de la sede
    const { data: registros } = await supabase
      .from("registros")
      .select("*, ambulancias(codigo), usuarios(nombre)")
      .eq("sede_id", user.sede_id)
      .order("fecha", { ascending: false })
      .limit(10)

    setActividadesRecientes(
      (registros || []).map(r => ({
        id: r.id,
        texto: `${r.usuarios?.nombre} realizó ${r.tipo} en ambulancia ${r.ambulancias?.codigo}`,
        tiempo: new Date(r.fecha).toLocaleString()
      }))
    )

    // Generar notificaciones incluyendo reportes resueltos
    generarNotificaciones(ambulanciasData, equiposData, configurados, reportes)
  }

  const generarNotificaciones = (ambulanciasData, equiposData, insumosConfig, reportesData) => {
    const notificacionesList = []

    // 1. Insumos pendientes de configuración
    if (insumosPendientes > 0) {
      notificacionesList.push({
        id: "insumos",
        tipo: "warning",
        icono: "⚠️",
        titulo: "Insumos sin configurar",
        mensaje: `${insumosPendientes} insumo(s) requieren configuración de cantidad`,
        accion: () => navigate("/subadmin/insumos-sede"),
        fecha: new Date().toISOString()
      })
    }

    // 2. Reportes de equipo pendientes
    if (reportesPendientes > 0) {
      notificacionesList.push({
        id: "reportes",
        tipo: "danger",
        icono: "📋",
        titulo: "Reportes pendientes",
        mensaje: `${reportesPendientes} reporte(s) de equipo esperan atención`,
        accion: () => navigate("/subadmin/equipo"),
        fecha: new Date().toISOString()
      })
    }

    // 3. Reportes resueltos recientemente (últimas 24 horas)
    const reportesResueltos = (reportesData || []).filter(r => {
      if (r.estado !== "RESUELTO") return false
      const fechaResolucion = new Date(r.fecha_resolucion)
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return fechaResolucion > hace24Horas
    })

    reportesResueltos.forEach(reporte => {
      notificacionesList.push({
        id: `resuelto_${reporte.id}`,
        tipo: "success",
        icono: "✅",
        titulo: "Reporte resuelto",
        mensaje: `El reporte de ${reporte.equipo?.modelo?.nombre} (N° ${reporte.equipo?.numero_serie || 'general'}) fue resuelto. ${reporte.comentario_admin ? `Comentario: ${reporte.comentario_admin}` : ''}`,
        accion: () => navigate("/subadmin/equipo"),
        fecha: reporte.fecha_resolucion,
        leida: false
      })
    })

    // 4. Equipos en mantenimiento
    const equiposEnMantenimiento = equiposData?.filter(e => e.estado === "MANTENIMIENTO").length || 0
    if (equiposEnMantenimiento > 0) {
      notificacionesList.push({
        id: "mantenimiento",
        tipo: "warning",
        icono: "🔧",
        titulo: "Equipos en mantenimiento",
        mensaje: `${equiposEnMantenimiento} equipo(s) están en mantenimiento`,
        accion: () => navigate("/subadmin/equipo"),
        fecha: new Date().toISOString()
      })
    }

    // 5. Equipos inactivos
    const equiposInactivos = equiposData?.filter(e => e.estado === "INACTIVO").length || 0
    if (equiposInactivos > 0) {
      notificacionesList.push({
        id: "inactivos",
        tipo: "info",
        icono: "⚪",
        titulo: "Equipos inactivos",
        mensaje: `${equiposInactivos} equipo(s) están inactivos`,
        accion: () => navigate("/subadmin/equipo"),
        fecha: new Date().toISOString()
      })
    }

    // 6. Ambulancias en mantenimiento
    const ambulanciasMantenimiento = ambulanciasData?.filter(a => a.estado === "MANTENIMIENTO").length || 0
    if (ambulanciasMantenimiento > 0) {
      notificacionesList.push({
        id: "amb_mantenimiento",
        tipo: "warning",
        icono: "🚑",
        titulo: "Ambulancias en mantenimiento",
        mensaje: `${ambulanciasMantenimiento} ambulancia(s) están en mantenimiento`,
        accion: () => navigate("/subadmin/ambulancias"),
        fecha: new Date().toISOString()
      })
    }

    // 7. Ambulancias inactivas
    const ambulanciasInactivas = ambulanciasData?.filter(a => a.estado === "INACTIVA").length || 0
    if (ambulanciasInactivas > 0) {
      notificacionesList.push({
        id: "amb_inactivas",
        tipo: "info",
        icono: "⚪",
        titulo: "Ambulancias inactivas",
        mensaje: `${ambulanciasInactivas} ambulancia(s) están inactivas`,
        accion: () => navigate("/subadmin/ambulancias"),
        fecha: new Date().toISOString()
      })
    }

    // Ordenar por fecha (más recientes primero) y luego por prioridad
    const prioridad = { success: 0, danger: 1, warning: 2, info: 3 }
    notificacionesList.sort((a, b) => {
      const fechaA = new Date(a.fecha)
      const fechaB = new Date(b.fecha)
      if (fechaB - fechaA !== 0) return fechaB - fechaA
      return prioridad[a.tipo] - prioridad[b.tipo]
    })

    setNotificaciones(notificacionesList)
  }

  const getTipoColor = (tipo) => {
    switch(tipo) {
      case "danger": return { bg: "#fee2e2", border: "#991b1b", icon: "#b22222" }
      case "warning": return { bg: "#fef9c3", border: "#ca8a04", icon: "#f59e0b" }
      case "info": return { bg: "#dbeafe", border: "#2563eb", icon: "#3b82f6" }
      case "success": return { bg: "#dcfce7", border: "#166534", icon: "#10b981" }
      default: return { bg: "#f3f4f6", border: "#6b7280", icon: "#6b7280" }
    }
  }

  return (
    <SubadminLayout 
      titulo="Panel de Control" 
      subtitulo={`Bienvenido a ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="subadmin-dashboard-notificaciones">
        
        {/* Banner de bienvenida */}
        <div className="welcome-banner">
          <div className="welcome-icon">👋</div>
          <div className="welcome-text">
            <h2>¡Hola, {user?.nombre}!</h2>
            <p>Resumen de actividad y notificaciones importantes</p>
          </div>
        </div>

        {/* Notificaciones - Principal */}
        <div className="notificaciones-principal">
          <h3 className="notificaciones-titulo">
            <span>🔔</span>
            Notificaciones y Alertas
          </h3>
          
          {notificaciones.length === 0 ? (
            <div className="empty-notificaciones">
              <span>✅</span>
              <p>Todo está en orden. No hay notificaciones pendientes.</p>
            </div>
          ) : (
            <div className="notificaciones-grid">
              {notificaciones.map(notif => {
                const colors = getTipoColor(notif.tipo)
                return (
                  <div 
                    key={notif.id} 
                    className={`notificacion-card ${notif.tipo}`}
                    onClick={notif.accion}
                    style={{ borderLeftColor: colors.border }}
                  >
                    <div className="notificacion-card-icono" style={{ backgroundColor: colors.bg, color: colors.icon }}>
                      {notif.icono}
                    </div>
                    <div className="notificacion-card-contenido">
                      <h4>{notif.titulo}</h4>
                      <p>{notif.mensaje}</p>
                      <span className="notificacion-fecha">
                        {new Date(notif.fecha).toLocaleDateString()} {new Date(notif.fecha).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="notificacion-card-arrow">→</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Actividades Recientes */}
        <div className="actividades-recientes">
          <h3 className="actividades-titulo">
            <span>🕒</span>
            Actividad Reciente
          </h3>
          
          {actividadesRecientes.length === 0 ? (
            <div className="empty-actividades">
              <span>📭</span>
              <p>No hay actividad reciente</p>
            </div>
          ) : (
            <ul className="actividades-lista">
              {actividadesRecientes.map((actividad) => (
                <li key={actividad.id} className="actividad-item">
                  <div className="actividad-dot"></div>
                  <span className="actividad-texto">{actividad.texto}</span>
                  <span className="actividad-tiempo">{actividad.tiempo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </SubadminLayout>
  )
}