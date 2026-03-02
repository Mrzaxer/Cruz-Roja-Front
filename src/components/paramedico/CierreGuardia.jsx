import { useLocation } from 'react-router-dom'
import { useEffect, useState } from "react";
import Layout from '../layout/Layout'

export default function CierreGuardia() {
  const { state } = useLocation()
  const ambulancia = state?.ambulancia

  const [categorias, setCategorias] = useState([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)

  useEffect(() => {
    obtenerCategorias()
  }, [])

  const obtenerCategorias = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/insumos/categorias")
      const data = await res.json()
      setCategorias(data)
    } catch (error) {
      console.error("Error al cargar categorías", error)
    }
  }

  if (!ambulancia) {
    return <p className="p-6 text-red-600">Error: no hay ambulancia seleccionada</p>
  }

  return (
    <Layout titulo="Fin de Guardia - Insumos">
      <div className="space-y-6">

        <div className="bg-gray-100 p-4 rounded-xl shadow">
          <p className="font-semibold">
            Ambulancia: {ambulancia.codigo}
          </p>
        </div>

        <h2 className="text-xl font-bold">Selecciona una Categoría</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categorias.map((cat, index) => (
            <button
              key={index}
              onClick={() => setCategoriaSeleccionada(cat)}
              className="bg-blue-600 text-white p-4 rounded-xl shadow hover:bg-blue-700 transition"
            >
              {cat}
            </button>
          ))}
        </div>

        {categoriaSeleccionada && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <h3 className="text-lg font-semibold">
              Categoría seleccionada:
            </h3>
            <p className="text-blue-700 font-bold">
              {categoriaSeleccionada}
            </p>
          </div>
        )}

      </div>
    </Layout>
  )
}