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
  const [insumosPendientes, setInsumosPendientes] = useState(0)
  const [actividadesRecientes, setActividadesRecientes] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    if (user?.sede_id) cargarDatos()
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

    // Insumos sin configurar (cantidad 0)
    const { data: configurados } = await supabase
      .from("insumos_por_sede")
      .select("*")
      .eq("sede_id", user.sede_id)
      .eq("cantidad_establecida", 0)

    setInsumosPendientes(configurados?.length || 0)

    // Actividades recientes de la sede
    const { data: registros } = await supabase
      .from("registros")
      .select("*, ambulancias(codigo), usuarios(nombre)")
      .eq("sede_id", user.sede_id)
      .order("fecha", { ascending: false })
      .limit(5)

    setActividadesRecientes(
      (registros || []).map(r => ({
        id: r.id,
        texto: `${r.usuarios?.nombre} realizó ${r.tipo} en ambulancia ${r.ambulancias?.codigo}`,
        tiempo: new Date(r.fecha).toLocaleString()
      }))
    )
  }

  return (
    <SubadminLayout 
      titulo="Panel de Control" 
      subtitulo={`Bienvenido a ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="subadmin-dashboard">
        
        {/* Tarjetas de estadísticas */}
        <div className="stats-grid">
          <div className="stat-card" onClick={() => navigate("/subadmin/ambulancias")}>
            <div className="stat-icon">🚑</div>
            <div className="stat-content">
              <div className="stat-label">Ambulancias</div>
              <div className="stat-value">{ambulancias.length}</div>
            </div>
            <div className="stat-trend">
              {ambulancias.filter(a => a.estado === 'ACTIVA').length} activas
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate("/subadmin/paramedicos")}>
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">Paramédicos</div>
              <div className="stat-value">{paramedicos.length}</div>
            </div>
            <div className="stat-trend">
              {paramedicos.filter(p => p.activo).length} activos
            </div>
          </div>

          <div className="stat-card warning" onClick={() => navigate("/subadmin/insumos-sede")}>
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">Insumos pendientes</div>
              <div className="stat-value">{insumosPendientes}</div>
            </div>
            <div className="stat-trend">Requieren configuración</div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <h2 className="section-title">
          <span>⚡</span>
          Acciones Rápidas
        </h2>

        <div className="actions-grid">
          <div 
            className="action-card ambulancias"
            onClick={() => navigate("/subadmin/ambulancias")}
          >
            <div className="action-icon">🚑</div>
            <h3>Ambulancias</h3>
            <p>Gestiona la flotilla de tu sede</p>
            <button className="action-button">
              <span>→</span>
            </button>
          </div>

          <div 
            className="action-card paramedicos"
            onClick={() => navigate("/subadmin/paramedicos")}
          >
            <div className="action-icon">👥</div>
            <h3>Paramédicos</h3>
            <p>Administra el personal</p>
            <button className="action-button">
              <span>→</span>
            </button>
          </div>

          <div 
            className="action-card insumos"
            onClick={() => navigate("/subadmin/insumos-sede")}
          >
            <div className="action-icon">📦</div>
            <h3>Insumos por Sede</h3>
            <p>Configura cantidades</p>
            <button className="action-button">
              <span>→</span>
            </button>
          </div>

          <div 
            className="action-card reportes"
            onClick={() => navigate("/subadmin/reportes")}
          >
            <div className="action-icon">📊</div>
            <h3>Reportes</h3>
            <p>Estadísticas de tu sede</p>
            <button className="action-button">
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Actividades recientes */}
        <div className="recent-activity">
          <h3 className="activity-title">
            <span>🕒</span>
            Actividad Reciente
          </h3>
          <ul className="activity-list">
            {actividadesRecientes.map((actividad) => (
              <li key={actividad.id} className="activity-item">
                <div className="activity-dot"></div>
                <span className="activity-text">{actividad.texto}</span>
                <span className="activity-time">{actividad.tiempo}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </SubadminLayout>
  )
}