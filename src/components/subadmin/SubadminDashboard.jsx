/**
 * @component SubadminDashboard
 * @description Panel de control para subadministradores de sede.
 *              - Muestra notificaciones y alertas importantes
 *              - Actividad reciente de la sede
 *              - Resumen de insumos pendientes, reportes, equipos y ambulancias
 *              - Las fechas se manejan en GMT-6 (hora centro de México)
 * @returns {JSX.Element}
 */

import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import SubadminLayout from "../layout/SubadminLayout"
import "../../styles/subadmindashboard.css"

export default function SubadminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // ===== ESTADOS =====
  const [ambulancias, setAmbulancias] = useState([])
  const [paramedicos, setParamedicos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [insumosPendientes, setInsumosPendientes] = useState(0)
  const [reportesPendientes, setReportesPendientes] = useState(0)
  const [notificaciones, setNotificaciones] = useState([])
  const [actividadesRecientes, setActividadesRecientes] = useState([])

  /**
   * Convierte una fecha ISO a GMT-6 (hora centro de México)
   * @param {string} fechaISO - Fecha en formato ISO
   * @returns {Date} Fecha en GMT-6
   */
  const formatearFechaGMT6 = (fechaISO) => {
    if (!fechaISO) return null
    const fecha = new Date(fechaISO)
    const offset = -6
    const utc = fecha.getTime() + (fecha.getTimezoneOffset() * 60000)
    return new Date(utc + (offset * 3600000))
  }

  /**
   * Obtiene la fecha actual en GMT-6
   * @returns {Date} Fecha actual en GMT-6
   */
  const getFechaGMT6 = () => {
    const now = new Date()
    const offset = -6
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    return new Date(utc + (offset * 3600000))
  }

  // ===== CARGA INICIAL =====
  useEffect(() => {
    if (user?.sede_id) {
      cargarDatos()
    }
  }, [user])

  /**
   * Carga todos los datos del dashboard
   */
  const cargarDatos = async () => {
    // 1. Ambulancias de la sede
    const { data: ambulanciasData } = await supabase
      .from("ambulancias")
      .select("*")
      .eq("sede_id", user.sede_id)
    setAmbulancias(ambulanciasData || [])

    // 2. Paramédicos de la sede
    const { data: paramedicosData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("sede_id", user.sede_id)
      .eq("rol", "PARAMEDICO")
    setParamedicos(paramedicosData || [])

    // 3. Equipos de la sede (INDIVIDUAL)
    const { data: equiposData } = await supabase
      .from("equipos")
      .select(`
        *,
        modelo:modelos_equipo(nombre)
      `)
      .eq("sede_id", user.sede_id)
      .eq("tipo", "INDIVIDUAL")
    setEquipos(equiposData || [])

    // 4. Insumos sin configurar (cantidad 0)
    const { data: configurados } = await supabase
      .from("insumos_por_sede")
      .select("*")
      .eq("sede_id", user.sede_id)
      .eq("cantidad_establecida", 0)
    setInsumosPendientes(configurados?.length || 0)

    // 5. Reportes de equipo
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

    // 6. Actividades recientes
    const { data: registros } = await supabase
      .from("registros")
      .select("*, ambulancias(codigo), usuarios(nombre)")
      .eq("sede_id", user.sede_id)
      .order("fecha", { ascending: false })
      .limit(10)

    setActividadesRecientes(
      (registros || []).map(r => {
        const fechaGMT6 = formatearFechaGMT6(r.fecha)
        return {
          id: r.id,
          texto: `${r.usuarios?.nombre} realizó ${r.tipo} en ambulancia ${r.ambulancias?.codigo}`,
          tiempo: fechaGMT6?.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) || ''
        }
      })
    )

    // 7. Generar notificaciones
    generarNotificaciones(ambulanciasData, equiposData, configurados, reportes)
  }

  /**
   * Genera notificaciones basadas en el estado actual
   * @param {Array} ambulanciasData - Lista de ambulancias
   * @param {Array} equiposData - Lista de equipos
   * @param {Array} insumosConfig - Configuración de insumos
   * @param {Array} reportesData - Lista de reportes
   */
  const generarNotificaciones = (ambulanciasData, equiposData, insumosConfig, reportesData) => {
    const notificacionesList = []
    const ahoraGMT6 = getFechaGMT6()
    const hace24Horas = new Date(ahoraGMT6.getTime() - 24 * 60 * 60 * 1000)

    // 1. Insumos pendientes de configuración
    if (insumosPendientes > 0) {
      notificacionesList.push({
        id: "insumos",
        tipo: "warning",
        icono: "⚠️",
        titulo: "Insumos sin configurar",
        mensaje: `${insumosPendientes} insumo(s) requieren configuración de cantidad`,
        accion: () => navigate("/subadmin/insumos-sede"),
        fecha: ahoraGMT6.toISOString()
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
        fecha: ahoraGMT6.toISOString()
      })
    }

    // 3. Reportes resueltos recientemente (últimas 24 horas)
    const reportesResueltos = (reportesData || []).filter(r => {
      if (r.estado !== "RESUELTO") return false
      const fechaResolucion = formatearFechaGMT6(r.fecha_resolucion)
      return fechaResolucion && fechaResolucion > hace24Horas
    })

    reportesResueltos.forEach(reporte => {
      const fechaResolucion = formatearFechaGMT6(reporte.fecha_resolucion)
      notificacionesList.push({
        id: `resuelto_${reporte.id}`,
        tipo: "success",
        icono: "✅",
        titulo: "Reporte resuelto",
        mensaje: `El reporte de ${reporte.equipo?.modelo?.nombre || reporte.equipo?.nombre || 'equipo'} fue resuelto.`,
        accion: () => navigate("/subadmin/equipo"),
        fecha: fechaResolucion?.toISOString() || ahoraGMT6.toISOString(),
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
        fecha: ahoraGMT6.toISOString()
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
        fecha: ahoraGMT6.toISOString()
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
        fecha: ahoraGMT6.toISOString()
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
        fecha: ahoraGMT6.toISOString()
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

  /**
   * Obtiene los colores según el tipo de notificación
   * @param {string} tipo - Tipo de notificación (danger, warning, info, success)
   * @returns {Object} Estilos CSS
   */
  const getTipoColor = (tipo) => {
    switch(tipo) {
      case "danger": return { bg: "#fee2e2", border: "#991b1b", icon: "#b22222" }
      case "warning": return { bg: "#fef9c3", border: "#ca8a04", icon: "#f59e0b" }
      case "info": return { bg: "#dbeafe", border: "#2563eb", icon: "#3b82f6" }
      case "success": return { bg: "#dcfce7", border: "#166534", icon: "#10b981" }
      default: return { bg: "#f3f4f6", border: "#6b7280", icon: "#6b7280" }
    }
  }

  /**
   * Formatea la fecha de una notificación para mostrar tiempo relativo
   * @param {string} fechaISO - Fecha en formato ISO
   * @returns {string} Tiempo relativo formateado
   */
  const formatearFechaNotificacion = (fechaISO) => {
    if (!fechaISO) return ''
    const fecha = formatearFechaGMT6(fechaISO)
    if (!fecha) return ''
    
    const ahora = getFechaGMT6()
    const diffHoras = Math.floor((ahora - fecha) / (1000 * 60 * 60))
    
    if (diffHoras < 1) {
      const diffMinutos = Math.floor((ahora - fecha) / (1000 * 60))
      if (diffMinutos < 1) return 'Hace unos segundos'
      return `Hace ${diffMinutos} minuto${diffMinutos !== 1 ? 's' : ''}`
    } else if (diffHoras < 24) {
      return `Hace ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`
    } else {
      return fecha.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Mexico_City'
      })
    }
  }

  // ===== RENDER =====
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

        {/* Notificaciones principales */}
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
                        {formatearFechaNotificacion(notif.fecha)}
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