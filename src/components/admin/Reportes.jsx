import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../layout/AdminLayout"

export default function Reportes() {

  const [datos, setDatos] = useState([])

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {

    const { data, error } = await supabase
      .from("detalle_insumos")
      .select(`
        cantidad_registrada,
        comentario,
        registros (
          id,
          paramedico_id,
          ambulancia_id
        ),
        insumos (
          nombre
        )
      `)

    if (error) {
      console.error("Error cargando datos:", error)
      return
    }

    setDatos(data)

  }

  const descargarExcel = () => {

    if (datos.length === 0) {
      alert("No hay datos registrados")
      return
    }

    let csv = "Registro,Paramedico,Ambulancia,Insumo,Cantidad,Comentario\n"

    datos.forEach(d => {

      csv += `${d.registros?.id},${d.registros?.paramedico_id},${d.registros?.ambulancia_id},${d.insumos?.nombre},${d.cantidad_registrada},${d.comentario}\n`

    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = "reporte_cierre_guardia.csv"
    link.click()

  }

  return (

    <AdminLayout titulo="Reporte de Cierres">

      <div style={{ padding: "20px" }}>

        <h2>📋 Reporte de insumos registrados</h2>

        <button
          onClick={descargarExcel}
          style={{
            marginBottom: "20px",
            padding: "10px",
            background: "#27ae60",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          Descargar Excel
        </button>

        <table border="1" cellPadding="10">

          <thead>
            <tr>
              <th>Registro</th>
              <th>Paramédico</th>
              <th>Ambulancia</th>
              <th>Insumo</th>
              <th>Cantidad</th>
              <th>Comentario</th>
            </tr>
          </thead>

          <tbody>

            {datos.map((d, i) => (

              <tr key={i}>
                <td>{d.registros?.id}</td>
                <td>{d.registros?.paramedico_id}</td>
                <td>{d.registros?.ambulancia_id}</td>
                <td>{d.insumos?.nombre}</td>
                <td>{d.cantidad_registrada}</td>
                <td>{d.comentario}</td>
              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AdminLayout>

  )

}