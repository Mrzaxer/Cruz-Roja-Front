import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import { useNavigate } from "react-router-dom"
import SubadminLayout from "../layout/SubadminLayout"
import "../../styles/SubadminDashboard.css"

export default function SubadminDashboard() {
  const [ambulancias, setAmbulancias] = useState([])
  const [insumosFaltantes, setInsumosFaltantes] = useState(0)
  const [actividadesRecientes, setActividadesRecientes] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: ambulanciasData } = await supabase
      .from("ambulancias")
      .select("*")

    if (ambulanciasData) {
      setAmbulancias(ambulanciasData)
    }

    const { data: faltantes } = await supabase
      .from("insumos")
      .select("*")
      .eq("activo", false)

    if (faltantes) {
      setInsumosFaltantes(faltantes.length)
    }

    // Actividades de ejemplo
    setActividadesRecientes([
      { id: 1, texto: "Ambulancia AB-123 realizó guardia", tiempo: "Hace 2 horas" },
      { id: 2, texto: "Insumos reabastecidos en sede principal", tiempo: "Hace 5 horas" },
      { id: 3, texto: "Nuevo paramédico registrado", tiempo: "Ayer" },
    ])
  }

  return (
    <SubadminLayout 
      titulo="Panel de Control" 
      subtitulo="Bienvenido al sistema de gestión"
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
            <div className="stat-trend">+2 esta semana</div>
          </div>

          <div className="stat-card warning" onClick={() => navigate("/subadmin/insumos")}>
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">Insumos Faltantes</div>
              <div className="stat-value">{insumosFaltantes}</div>
            </div>
            
          </div>
        </div>

        {/* Acciones rápidas */}
        <h2 className="section-title">
          <span>⚡</span>
          Acciones Rápidas
        </h2>

        <div className="actions-grid">
          <div 
            className="action-card insumos"
            onClick={() => navigate("/subadmin/insumos")}
          >
            <div className="action-icon">📦</div>
            <h3>Gestión de Insumos</h3>
            <p>Administra el inventario de insumos médicos y verifica existencias</p>
            <button className="action-button">
              <span>📋</span>
              Ir a Insumos
              <span>→</span>
            </button>
          </div>

          <div 
            className="action-card ambulancias"
            onClick={() => navigate("/subadmin/ambulancias")}
          >
            <div className="action-icon">🚑</div>
            <h3>Gestión de Ambulancias</h3>
            <p>Controla el estado y disponibilidad de la flotilla de ambulancias</p>
            <button className="action-button">
              <span>🚨</span>
              Ir a Ambulancias
              <span>→</span>
            </button>
          </div>

          <div 
            className="action-card reportes"
            onClick={() => navigate("/subadmin/reportes")}
          >
            <div className="action-icon">📄</div>
            <h3>Reportes</h3>
            <p>Genera informes detallados de actividades y estadísticas</p>
            <button className="action-button">
              <span>📊</span>
              Ver Reportes
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