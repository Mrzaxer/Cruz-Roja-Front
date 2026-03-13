import { useEffect, useState } from 'react'
import { useLocation, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import ParamedicoLayout from '../layout/ParamedicoLayout'
import '../../styles/CierreGuardia.css'

export default function CierreGuardia() {

  const { user } = useAuth()
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
  const [guardando, setGuardando] = useState(false)

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

    const sedeId = ambulancia?.sede_id

    const { data, error } = await supabase
      .from('insumos')
      .select(`
        id,
        nombre,
        descripcion,
        obligatorio_global,
        insumos_por_sede!left (
          sede_id,
          cantidad_establecida,
          activo_en_sede
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

    // Filtrar insumos activos en esta sede
    const filtrados = data
      .map(insumo => {
        const configSede = insumo.insumos_por_sede?.find(
          rel => rel.sede_id === sedeId
        )

        // Determinar si está activo en esta sede
        const activoEnSede = configSede ? configSede.activo_en_sede !== false : true
        
        // Si no está activo, no aparece
        if (!activoEnSede) return null

        // Obtener cantidad establecida (mínimo 1)
        let cantidadSede = configSede?.cantidad_establecida ?? 1
        if (cantidadSede < 1) cantidadSede = 1

        return {
          ...insumo,
          cantidad_establecida: cantidadSede
        }
      })
      .filter(Boolean)

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
    // Si no hay insumos, la categoría se considera completa automáticamente
    if (insumos.length === 0) return true
    
    // Si hay insumos, todos deben tener cantidad
    return insumos.every(insumo =>
      cantidades[insumo.id] !== undefined &&
      cantidades[insumo.id] !== ''
    )
  }

  const siguienteCategoria = () => {
    if (!categoriaCompleta()) {
      alert("Debes ingresar cantidad en todos los insumos de esta categoría")
      return
    }

    if (!esUltimaCategoria) {
      setCategoriaIndex(prev => prev + 1)
    }
  }

  const recolectarTodosLosInsumos = async () => {
    let todosLosInsumos = []
    
    // Recorrer todas las categorías
    for (const cat of categorias) {
      const { data } = await supabase
        .from('insumos')
        .select(`
          id,
          nombre,
          descripcion,
          obligatorio_global,
          insumos_por_sede!left (
            sede_id,
            cantidad_establecida,
            activo_en_sede
          )
        `)
        .eq('categoria', cat)
        .eq('activo', true)

      // Filtrar insumos activos
      const filtrados = (data || [])
        .map(insumo => {
          const configSede = insumo.insumos_por_sede?.find(
            rel => rel.sede_id === ambulancia.sede_id
          )
          const activoEnSede = configSede ? configSede.activo_en_sede !== false : true
          if (!activoEnSede) return null
          
          let cantidadSede = configSede?.cantidad_establecida ?? 1
          if (cantidadSede < 1) cantidadSede = 1
          
          return {
            ...insumo,
            cantidad_establecida: cantidadSede
          }
        })
        .filter(Boolean)
      
      todosLosInsumos = [...todosLosInsumos, ...filtrados]
    }
    
    return todosLosInsumos
  }

  const finalizarCierre = async () => {

    // Verificar que la categoría actual esté completa
    if (!categoriaCompleta()) {
      alert("Debes completar todos los insumos de esta categoría")
      return
    }

    setGuardando(true)

    try {
      // Recolectar TODOS los insumos de TODAS las categorías
      const todosLosInsumos = await recolectarTodosLosInsumos()
      
      console.log('Total insumos a guardar:', todosLosInsumos.length)

      // Crear el registro principal de cierre
      const { data: registro, error: errorRegistro } = await supabase
        .from('registros')
        .insert({
          sede_id: ambulancia.sede_id,
          ambulancia_id: ambulancia.id,
          paramedico_id: user.id,
          tipo: 'CIERRE',
          observaciones: observacionesFinales
        })
        .select()
        .single()

      if (errorRegistro) throw errorRegistro

      // Guardar los detalles de TODOS los insumos
      const detalles = todosLosInsumos.map(insumo => ({
        registro_id: registro.id,
        insumo_id: insumo.id,
        cantidad_registrada: cantidades[insumo.id] ?? 0,
        comentario: ''
      }))

      console.log('Guardando detalles:', detalles.length)

      const { error: errorDetalles } = await supabase
        .from('detalle_insumos')
        .insert(detalles)

      if (errorDetalles) throw errorDetalles

      // Calcular resumen
      const resumen = {
        completos: [],
        faltantes: [],
        excedentes: []
      }

      todosLosInsumos.forEach(insumo => {
        const cantidadReal = cantidades[insumo.id] ?? 0
        const cantidadEsperada = insumo.cantidad_establecida ?? 0
        
        const item = {
          nombre: insumo.nombre,
          esperado: cantidadEsperada,
          real: cantidadReal
        }

        if (cantidadReal < cantidadEsperada) resumen.faltantes.push(item)
        else if (cantidadReal > cantidadEsperada) resumen.excedentes.push(item)
        else resumen.completos.push(item)
      })

      alert(
        `✅ Cierre de Guardia Guardado\n\n` +
        `Total insumos: ${todosLosInsumos.length}\n` +
        `Completos: ${resumen.completos.length}\n` +
        `Faltantes: ${resumen.faltantes.length}\n` +
        `Excedentes: ${resumen.excedentes.length}`
      )

      navigate("/paramedico", { replace: true })

    } catch (error) {
      console.error('Error guardando cierre:', error)
      alert("Error al guardar el cierre de guardia")
    } finally {
      setGuardando(false)
    }

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

          {insumos.length === 0 ? (
            <div className="empty-categoria">
              <p>No hay insumos activos en esta categoría</p>
              {!esUltimaCategoria && (
                <button
                  onClick={siguienteCategoria}
                  className="btn-siguiente"
                  style={{ marginTop: '1rem' }}
                >
                  Siguiente categoría →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="insumos-lista">
                {insumos.map(insumo => {

                  const estado = obtenerEstadoInsumo(insumo)

                  return (

                    <div key={insumo.id} className={`insumo-item ${estado}`}>

                      <div className="insumo-info">
                        <strong>{insumo.nombre}</strong>
                        {insumo.descripcion && (
                          <p className="insumo-descripcion">{insumo.descripcion}</p>
                        )}
                        <p className="insumo-cantidad-establecida">
                          Cantidad establecida: <span>{insumo.cantidad_establecida}</span>
                        </p>
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

              {!esUltimaCategoria && (
                <div className="acciones-footer">
                  <button
                    onClick={siguienteCategoria}
                    disabled={!categoriaCompleta()}
                    className="btn-siguiente"
                  >
                    Siguiente categoría →
                  </button>
                </div>
              )}
            </>
          )}

          {esUltimaCategoria && (
            <>
              {insumos.length > 0 && (
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
                <button
                  onClick={finalizarCierre}
                  disabled={!categoriaCompleta() || guardando}
                  className="btn-finalizar"
                >
                  {guardando ? 'Guardando...' : '✅ Finalizar Cierre'}
                </button>
              </div>
            </>
          )}

        </div>

      </div>

    </ParamedicoLayout>

  )

}