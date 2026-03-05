import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import ParamedicoLayout from '../layout/ParamedicoLayout'
import '../../styles/CierreGuardia.css'

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
  const progreso = ((categoriaIndex + 1) / categorias.length) * 100

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

  // 🔥 CORREGIDO: guarda como número y permite 0
  const cambiarCantidad = (id, valor) => {
    setCantidades(prev => ({
      ...prev,
      [id]: valor === '' ? '' : Number(valor)
    }))
  }

  const obtenerEstadoInsumo = (insumo) => {
    const cantidad = cantidades[insumo.id] ?? 0
    const establecida = insumo.cantidad_establecida ?? 0

    if (cantidad === '') return 'pendiente'
    if (cantidad < establecida) return 'faltante'
    if (cantidad > establecida) return 'excedente'
    if (cantidad === establecida) return 'completo'
    return 'pendiente'
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

  const calcularResumen = () => {
    let completos = 0
    let faltantes = 0
    let excedentes = 0

    insumos.forEach(insumo => {
      const estado = obtenerEstadoInsumo(insumo)
      if (estado === 'completo') completos++
      else if (estado === 'faltante') faltantes++
      else if (estado === 'excedente') excedentes++
    })

    return { completos, faltantes, excedentes }
  }

  const finalizarCierre = () => {
    if (!categoriaCompleta()) {
      alert("Debes completar todos los insumos antes de cerrar")
      return
    }

    const resumen = {
      ambulancia: ambulancia.codigo,
      completos: [],
      faltantes: [],
      excedentes: []
    }

    insumos.forEach(insumo => {
      const cantidadReal = cantidades[insumo.id] ?? 0
      const cantidadEstablecida = insumo.cantidad_establecida ?? 0
      const estado = obtenerEstadoInsumo(insumo)

      const item = {
        nombre: insumo.nombre,
        esperado: cantidadEstablecida,
        real: cantidadReal
      }

      if (estado === 'faltante') resumen.faltantes.push(item)
      else if (estado === 'completo') resumen.completos.push(item)
      else if (estado === 'excedente') resumen.excedentes.push(item)
    })

    console.log('Cierre de guardia:', resumen)

    const mensaje =
      `✅ Cierre de Guardia Completado\n\n` +
      `Ambulancia: ${ambulancia.codigo}\n` +
      `Completos: ${resumen.completos.length}\n` +
      `Faltantes: ${resumen.faltantes.length}\n` +
      `Excedentes: ${resumen.excedentes.length}`

    alert(mensaje)
  }

  if (cargando) {
    return (
      <ParamedicoLayout titulo="Cierre de Guardia">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⛑️</span>
            <p>Cargando insumos...</p>
          </div>
        </div>
      </ParamedicoLayout>
    )
  }

  const resumen = calcularResumen()

  return (
    <ParamedicoLayout titulo="Cierre de Guardia">
      <div className="cierre-container">

        <div className="cierre-banner">
          <div className="cierre-banner-icono">📋</div>
          <div className="cierre-banner-info">
            <h2>Ambulancia {ambulancia.codigo}</h2>
            <p>Cierre de guardia - Registro de insumos</p>
          </div>
          {ambulancia.placa && (
            <div className="cierre-banner-placa">
              Placa: {ambulancia.placa}
            </div>
          )}
        </div>

        <div className="categoria-card">
          <h3>{categoriaActual}</h3>

          <div className="insumos-lista">
            {insumos.map(insumo => {
              const estado = obtenerEstadoInsumo(insumo)
              return (
                <div key={insumo.id} className={`insumo-item ${estado}`}>
                  <div className="insumo-info">
                    <strong>{insumo.nombre}</strong>
                    <p>Cantidad establecida: {insumo.cantidad_establecida}</p>
                  </div>

                  <input
                    type="number"
                    min="0"
                    placeholder="Cantidad real"
                    value={cantidades[insumo.id] ?? ''}
                    onChange={(e) => cambiarCantidad(insumo.id, e.target.value)}
                    className={`cantidad-input ${estado}`}
                  />
                </div>
              )
            })}
          </div>

          <div className="acciones-footer">
            {!esUltimaCategoria ? (
              <button
                onClick={siguienteCategoria}
                disabled={!categoriaCompleta()}
                className="btn-siguiente"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={finalizarCierre}
                disabled={!categoriaCompleta()}
                className="btn-finalizar"
              >
                ✅ Finalizar Cierre
              </button>
            )}
          </div>
        </div>

      </div>
    </ParamedicoLayout>
  )
}