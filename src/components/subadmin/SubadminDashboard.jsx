import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import { useNavigate } from "react-router-dom"

export default function SubadminDashboard() {

  const [ambulancias, setAmbulancias] = useState([])
  const [insumosFaltantes, setInsumosFaltantes] = useState(0)

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
  }

  return (
    <div style={{ padding: "40px" }}>

      <h1>📊 Dashboard Subadministrador</h1>

      {/* Tarjetas de datos */}
      <div style={{
        display: "flex",
        gap: "20px",
        marginTop: "30px"
      }}>

        <div style={{
          background: "#f4f4f4",
          padding: "20px",
          borderRadius: "10px",
          width: "200px"
        }}>
          <h3>🚑 Ambulancias</h3>
          <p>{ambulancias.length}</p>
        </div>

        <div style={{
          background: "#ffe5e5",
          padding: "20px",
          borderRadius: "10px",
          width: "200px"
        }}>
          <h3>⚠️ Faltantes</h3>
          <p>{insumosFaltantes}</p>
        </div>

      </div>


      {/* Botones principales */}
      <div style={{
        marginTop: "50px",
        display: "flex",
        gap: "20px"
      }}>

        <button
          onClick={() => navigate("/subadmin/insumos")}
          style={{
            padding: "20px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "18px",
            width: "180px"
          }}
        >
          📦 Insumos
        </button>

        <button
          onClick={() => navigate("/subadmin/ambulancias")}
          style={{
            padding: "20px",
            background: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "18px",
            width: "180px"
          }}
        >
          🚑 Ambulancias
        </button>

        <button
          onClick={() => navigate("/subadmin/reportes")}
          style={{
            padding: "20px",
            background: "#f57c00",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "18px",
            width: "180px"
          }}
        >
          📄 Reportes
        </button>

      </div>

    </div>
  )
}