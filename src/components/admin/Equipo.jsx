import { useEffect, useState } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../layout/AdminLayout"

export default function Equipo() {

  const [equipos, setEquipos] = useState([])
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarEquipos()
  }, [])

  const cargarEquipos = async () => {

    const { data, error } = await supabase
      .from("equipo_medico")
      .select("*")
      .order("nombre")

    if (!error) {
      setEquipos(data)
    }

    setCargando(false)
  }

  const crearEquipo = async (e) => {

    e.preventDefault()

    if (!nombre) {
      alert("Ingrese nombre del equipo")
      return
    }

    const { error } = await supabase
      .from("equipo_medico")
      .insert({
        nombre: nombre,
        descripcion: descripcion,
        activo: true
      })

    if (error) {
      alert("Error creando equipo")
      return
    }

    alert("Equipo creado correctamente")

    setNombre("")
    setDescripcion("")

    cargarEquipos()
  }

  const desactivarEquipo = async (id) => {

    const confirmar = confirm("¿Desactivar este equipo?")

    if (!confirmar) return

    const { error } = await supabase
      .from("equipo_medico")
      .update({ activo: false })
      .eq("id", id)

    if (error) {
      alert("Error desactivando equipo")
      return
    }

    cargarEquipos()
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Equipo Médico">
        <p>Cargando equipo...</p>
      </AdminLayout>
    )
  }

  return (

    <AdminLayout titulo="Gestión de Equipo Médico">

      <div style={{ padding: "20px" }}>

        <h2>➕ Agregar Equipo</h2>

        <form onSubmit={crearEquipo} style={{
          display: "flex",
          gap: "10px",
          marginBottom: "30px"
        }}>

          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="text"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <button type="submit">
            Crear
          </button>

        </form>


        <h2>📋 Lista de Equipo</h2>

        <table border="1" cellPadding="10">

          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Activo</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>

            {equipos.map((equipo) => (

              <tr key={equipo.id}>

                <td>{equipo.id}</td>

                <td>{equipo.nombre}</td>

                <td>{equipo.descripcion}</td>

                <td>
                  {equipo.activo ? "✅" : "❌"}
                </td>

                <td>

                  {equipo.activo && (

                    <button
                      onClick={() => desactivarEquipo(equipo.id)}
                    >
                      Desactivar
                    </button>

                  )}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AdminLayout>

  )
}