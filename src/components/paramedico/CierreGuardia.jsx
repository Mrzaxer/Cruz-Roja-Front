import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import Layout from '../layout/Layout'
import Card from '../ui/Card'
import Button from '../ui/Button'

export default function CierreGuardia() {
  const { state } = useLocation()
  const ambulancia = state?.ambulancia

  const categorias = [
    "Manejo de Vía Aérea",
    "Manejo Intravenoso e Intramuscular",
    "Soluciones",
    "Curaciones y Varios",
    "Limpieza y Desinfección",
    "Medicamentos"
  ]

  const [categoriaIndex, setCategoriaIndex] = useState(0)
  const [insumos, setInsumos] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [observacionesFinales, setObservacionesFinales] = useState('')
  const [cargando, setCargando] = useState(true)

  const categoriaActual = categorias[categoriaIndex]
  const esUltimaCategoria = categoriaIndex === categorias.length - 1

  if (!ambulancia) {
    return <Navigate to="/paramedico" />
  }

  useEffect(() => {
    cargarInsumos()
  }, [categoriaIndex])

  const cargarInsumos = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from('insumos')
      .select('id, nombre, descripcion, cantidad_establecida')
      .eq('categoria', categoriaActual)
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error(error)
    } else {
      setInsumos(data || [])
    }

    setCargando(false)
  }

  const cambiarCantidad = (id, valor) => {
    setCantidades(prev => ({
      ...prev,
      [id]: valor
    }))
  }

  const categoriaCompleta = () => {
    return insumos.every(insumo =>
      cantidades[insumo.id] !== undefined &&
      cantidades[insumo.id] !== ''
    )
  }

  const siguienteCategoria = () => {
    if (!categoriaCompleta()) {
      alert("Debes ingresar cantidad en todos los insumos")
      return
    }

    if (!esUltimaCategoria) {
      setCategoriaIndex(prev => prev + 1)
    }
  }

  const finalizarCierre = () => {
    if (!categoriaCompleta()) {
      alert("Debes completar todos los insumos antes de cerrar")
      return
    }

    const faltantes = []
    const completos = []
    const excedentes = []

    insumos.forEach(insumo => {
      const cantidadReal = parseInt(cantidades[insumo.id] || 0)
      const cantidadEstablecida = insumo.cantidad_establecida || 0

      if (cantidadReal < cantidadEstablecida) {
        faltantes.push(
          `${insumo.nombre} (Esperado: ${cantidadEstablecida} | Real: ${cantidadReal})`
        )
      } else if (cantidadReal === cantidadEstablecida) {
        completos.push(insumo.nombre)
      } else {
        excedentes.push(
          `${insumo.nombre} (Esperado: ${cantidadEstablecida} | Real: ${cantidadReal})`
        )
      }
    })

    let mensaje = `🚑 Cierre de Guardia\n`
    mensaje += `Ambulancia: ${ambulancia.codigo}\n\n`

    mensaje += `🔴 FALTANTES:\n`
    mensaje += faltantes.length > 0 ? faltantes.join('\n') : "Ninguno"
    mensaje += `\n\n`

    mensaje += `🟢 COMPLETOS:\n`
    mensaje += completos.length > 0 ? completos.join('\n') : "Ninguno"
    mensaje += `\n\n`

    mensaje += `🔵 EXCEDENTES:\n`
    mensaje += excedentes.length > 0 ? excedentes.join('\n') : "Ninguno"
    mensaje += `\n\n`

    mensaje += `📝 Observaciones Generales:\n`
    mensaje += observacionesFinales || "Sin observaciones"

    alert(mensaje)
  }

  return (
    <Layout titulo="Cierre de Guardia">
      <Card className="mb-4">
        <p><strong>Ambulancia:</strong> {ambulancia.codigo}</p>
      </Card>

      <Card title={`📦 ${categoriaActual}`}>

        {cargando && <p>Cargando insumos...</p>}

        {!cargando && insumos.map(insumo => (
          <div
            key={insumo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '12px'
            }}
          >
            <div style={{ minWidth: '230px' }}>
              <strong>{insumo.nombre}</strong>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Establecida: {insumo.cantidad_establecida}
              </p>
            </div>

            <input
              type="number"
              min="0"
              placeholder="Cantidad real"
              value={cantidades[insumo.id] || ''}
              onChange={(e) =>
                cambiarCantidad(insumo.id, e.target.value)
              }
              style={{ width: '100px' }}
            />
          </div>
        ))}

        {!esUltimaCategoria && (
          <Button onClick={siguienteCategoria} className="mt-3">
            Siguiente Categoría ➡
          </Button>
        )}

        {esUltimaCategoria && (
          <>
            <div style={{ marginTop: '20px' }}>
              <h4>📝 Observaciones Generales (Opcional)</h4>
              <textarea
                value={observacionesFinales}
                onChange={(e) => setObservacionesFinales(e.target.value)}
                rows="4"
                style={{ width: '100%' }}
              />
            </div>

            <Button
              onClick={finalizarCierre}
              disabled={!categoriaCompleta()}
              className="mt-3"
            >
              Finalizar Cierre 🚑
            </Button>
          </>
        )}

      </Card>
    </Layout>
  )
}