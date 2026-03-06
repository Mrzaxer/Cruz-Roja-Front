import { useEffect, useState } from "react"
import { supabase } from "../../supabase"

export default function SubadminDashboard() {

  const [ambulancias, setAmbulancias] = useState([])
  const [insumosFaltantes, setInsumosFaltantes] = useState(0)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {

    // cargar ambulancias
    const { data: ambulanciasData } = await supabase
      .from("ambulancias")
      .select("*")

    if (ambulanciasData) {
      setAmbulancias(ambulanciasData)
    }

    // ejemplo de faltantes
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

    </div>
  )
}