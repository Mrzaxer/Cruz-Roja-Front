import { useEffect, useState } from 'react'
import { useLocation, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import ParamedicoLayout from '../layout/ParamedicoLayout'
import '../../styles/CierreGuardia.css'

export default function CierreGuardia() {

  const { state } = useLocation()
  const navigate = useNavigate()

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
      .select(`
        id,
        nombre,
        descripcion,
        cantidad_establecida,
        obligatorio_global,
        insumos_por_sede (
          sede_id
        )
      `)
      .eq('categoria', categoriaActual)
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error cargando insumos:', error)
      setCargando(false)
      return
    }

    const sedeId = ambulancia?.sede_id

    const filtrados = data.filter(insumo => {

      if (insumo.obligatorio_global) {
        return true
      }

      if (!insumo.obligatorio_global) {
        return insumo.insumos_por_sede?.some(
          rel => rel.sede_id === sedeId
        )
      }

      return false
    })

    setInsumos(filtrados)
    setCargando(false)
  }

  const cambiarCantidad = (id, valor) => {

    setCantidades(prev => ({
      ...prev,
      [id]: valor === '' ? '' : Number(valor)
    }))

  }

  const obtenerEstadoInsumo = (insumo) => {

    const cantidad = cantidades[insumo.id]
    const establecida = insumo.cantidad_establecida ?? 0

    if (cantidad === '' || cantidad === undefined) return 'pendiente'
    if (cantidad < establecida) return 'faltante'
    if (cantidad > establecida) return 'excedente'
    return 'completo'
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
      alert("Debes completar todos los insumos")
      return
    }

    const resumen = {
      completos: [],
      faltantes: [],
      excedentes: []
    }

    insumos.forEach(insumo => {

      const cantidadReal = cantidades[insumo.id] ?? 0
      const cantidadEsperada = insumo.cantidad_establecida ?? 0
      const estado = obtenerEstadoInsumo(insumo)

      const item = {
        nombre: insumo.nombre,
        esperado: cantidadEsperada,
        real: cantidadReal
      }

      if (estado === 'faltante') resumen.faltantes.push(item)
      if (estado === 'excedente') resumen.excedentes.push(item)
      if (estado === 'completo') resumen.completos.push(item)

    })

    console.log('Cierre de guardia:', {
      ambulancia: ambulancia.codigo,
      resumen,
      observaciones: observacionesFinales
    })

    const mensaje =
      `✅ Cierre de Guardia Completado\n\n` +
      `Ambulancia: ${ambulancia.codigo}\n` +
      `Completos: ${resumen.completos.length}\n` +
      `Faltantes: ${resumen.faltantes.length}\n` +
      `Excedentes: ${resumen.excedentes.length}`

    alert(mensaje)

    navigate("/", { replace: true })
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
                    onChange={(e) =>
                      cambiarCantidad(insumo.id, e.target.value)
                    }
                    className={`cantidad-input ${estado}`}
                  />

                </div>

              )

            })}

          </div>

          {esUltimaCategoria && (

            <div className="observaciones-finales">

              <h4>Observaciones finales (opcional)</h4>

              <textarea
                placeholder="Escribe observaciones generales del turno..."
                value={observacionesFinales}
                onChange={(e) =>
                  setObservacionesFinales(e.target.value)
                }
              />

            </div>

          )}

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