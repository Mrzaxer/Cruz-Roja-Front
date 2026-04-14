/**
 * @component CierreGuardia
 * @description Formulario de cierre de guardia para paramédicos:
 *              - Registro de cantidades reales de insumos por categoría
 *              - Validación de cantidades establecidas por sede
 *              - Navegación por categorías
 *              - Observaciones finales
 *              - Guardado en Supabase con fecha en GMT-6 (hora centro de México)
 * @returns {JSX.Element}
 */

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

  // ===== CATEGORÍAS =====
  const categorias = [
    "Manejo de Vía Aérea",
    "Manejo Intravenoso e Intramuscular",
    "Soluciones",
    "Curaciones y Varios",
    "Limpieza y Desinfección",
    "Medicamentos"
  ]

  // ===== ESTADOS =====
  const [categoriaIndex, setCategoriaIndex] = useState(0)
  const [insumos, setInsumos] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [observacionesFinales, setObservacionesFinales] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const categoriaActual = categorias[categoriaIndex]
  const esUltimaCategoria = categoriaIndex === categorias.length - 1

  // Redirigir si no hay ambulancia seleccionada
  if (!ambulancia) {
    return <Navigate to="/paramedico" />
  }

  /**
   * Obtiene la fecha actual en GMT-6 (hora centro de México)
   * @returns {string} Fecha en formato ISO con ajuste GMT-6
   */
  const getFechaGMT6 = () => {
    const now = new Date()
    const offset = -6
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const fechaGMT6 = new Date(utc + (offset * 3600000))
    return fechaGMT6.toISOString()
  }

  // ===== CARGA DE INSUMOS POR CATEGORÍA =====
  useEffect(() => {
    cargarInsumos()
  }, [categoriaIndex])

  /**
   * Carga los insumos de la categoría actual con su configuración por sede
   */
  const cargarInsumos = async () => {
    setCargando(true)

    const sedeId = ambulancia?.sede_id

    // 1. Obtener TODOS los insumos de la categoría actual
    const { data: insumosGlobales } = await supabase
      .from('insumos')
      .select('id, nombre, descripcion, obligatorio_global')
      .eq('categoria', categoriaActual)
      .eq('activo', true)
      .order('nombre')

    if (!insumosGlobales || insumosGlobales.length === 0) {
      setInsumos([])
      setCargando(false)
      return
    }

    // 2. Obtener las configuraciones de la sede para estos insumos
    const insumoIds = insumosGlobales.map(i => i.id)
    const { data: configsSede } = await supabase
      .from('insumos_por_sede')
      .select('insumo_id, cantidad_establecida, activo_en_sede')
      .eq('sede_id', sedeId)
      .in('insumo_id', insumoIds)

    const configMap = new Map()
    configsSede?.forEach(config => {
      configMap.set(config.insumo_id, config)
    })

    // 3. Filtrar insumos según la lógica correcta
    const filtrados = insumosGlobales
      .map(insumo => {
        const config = configMap.get(insumo.id)
        
        let activoEnSede = true
        let cantidadEstablecida = 1
        
        if (config) {
          activoEnSede = config.activo_en_sede !== false
          cantidadEstablecida = config.cantidad_establecida ?? 1
        } else {
          if (!insumo.obligatorio_global) {
            return null
          }
          cantidadEstablecida = 1
        }
        
        if (!activoEnSede) return null
        if (cantidadEstablecida < 1) cantidadEstablecida = 1
        
        return {
          ...insumo,
          cantidad_establecida: cantidadEstablecida
        }
      })
      .filter(Boolean)

    setInsumos(filtrados)
    setCargando(false)
  }

  /**
   * Cambia la cantidad registrada de un insumo
   * @param {number} id - ID del insumo
   * @param {string} valor - Valor ingresado
   */
  const cambiarCantidad = (id, valor) => {
    setCantidades(prev => ({
      ...prev,
      [id]: valor === '' ? '' : Number(valor)
    }))
  }

  /**
   * Obtiene el estado de un insumo (completo, faltante, excedente, pendiente)
   * @param {Object} insumo - Objeto del insumo
   * @returns {string} Estado del insumo
   */
  const obtenerEstadoInsumo = (insumo) => {
    const cantidad = cantidades[insumo.id]
    const establecida = insumo.cantidad_establecida ?? 0

    if (cantidad === '' || cantidad === undefined) return 'pendiente'
    if (cantidad < establecida) return 'faltante'
    if (cantidad > establecida) return 'excedente'
    return 'completo'
  }

  /**
   * Verifica si la categoría actual está completa
   * @returns {boolean} True si todos los insumos tienen cantidad registrada
   */
  const categoriaCompleta = () => {
    if (insumos.length === 0) return true
    return insumos.every(insumo =>
      cantidades[insumo.id] !== undefined &&
      cantidades[insumo.id] !== ''
    )
  }

  /**
   * Avanza a la siguiente categoría
   */
  const siguienteCategoria = () => {
    if (!categoriaCompleta()) {
      alert("Debes ingresar cantidad en todos los insumos de esta categoría")
      return
    }

    if (!esUltimaCategoria) {
      setCategoriaIndex(prev => prev + 1)
    }
  }

  /**
   * Recolecta todos los insumos de todas las categorías para guardar
   * @returns {Array} Lista de todos los insumos con cantidades establecidas
   */
  const recolectarTodosLosInsumos = async () => {
    let todosLosInsumos = []
    
    for (const cat of categorias) {
      const { data: insumosGlobales } = await supabase
        .from('insumos')
        .select('id, nombre, descripcion, obligatorio_global')
        .eq('categoria', cat)
        .eq('activo', true)

      if (!insumosGlobales || insumosGlobales.length === 0) continue

      const insumoIds = insumosGlobales.map(i => i.id)
      
      const { data: configsSede } = await supabase
        .from('insumos_por_sede')
        .select('insumo_id, cantidad_establecida, activo_en_sede')
        .eq('sede_id', ambulancia.sede_id)
        .in('insumo_id', insumoIds)

      const configMap = new Map()
      configsSede?.forEach(config => {
        configMap.set(config.insumo_id, config)
      })

      const filtrados = insumosGlobales
        .map(insumo => {
          const config = configMap.get(insumo.id)
          
          let activoEnSede = true
          let cantidadEstablecida = 1
          
          if (config) {
            activoEnSede = config.activo_en_sede !== false
            cantidadEstablecida = config.cantidad_establecida ?? 1
          } else {
            if (!insumo.obligatorio_global) {
              return null
            }
            cantidadEstablecida = 1
          }
          
          if (!activoEnSede) return null
          if (cantidadEstablecida < 1) cantidadEstablecida = 1
          
          return {
            ...insumo,
            cantidad_establecida: cantidadEstablecida
          }
        })
        .filter(Boolean)
      
      todosLosInsumos = [...todosLosInsumos, ...filtrados]
    }
    
    return todosLosInsumos
  }

  /**
   * Finaliza el cierre de guardia y guarda todos los datos
   */
  const finalizarCierre = async () => {
    if (!categoriaCompleta()) {
      alert("Debes completar todos los insumos de esta categoría")
      return
    }

    setGuardando(true)

    try {
      const todosLosInsumos = await recolectarTodosLosInsumos()
      
      // Obtener fecha actual en GMT-6
      const fechaGMT6 = getFechaGMT6()

      // Crear el registro principal de cierre
      const { data: registro, error: errorRegistro } = await supabase
        .from('registros')
        .insert({
          sede_id: ambulancia.sede_id,
          ambulancia_id: ambulancia.id,
          paramedico_id: user.id,
          tipo: 'CIERRE',
          observaciones: observacionesFinales,
          fecha: fechaGMT6
        })
        .select()
        .single()

      if (errorRegistro) throw errorRegistro

      // Guardar los detalles de TODOS los insumos
      const detalles = todosLosInsumos.map(insumo => ({
        registro_id: registro.id,
        insumo_id: insumo.id,
        cantidad_registrada: cantidades[insumo.id] ?? 0,
        cantidad_establecida: insumo.cantidad_establecida,
        comentario: ''
      }))

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

  // ===== RENDER =====
  if (cargando) {
    return (
      <ParamedicoLayout titulo="Cierre de Guardia">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando insumos...</p>
          </div>
        </div>
      </ParamedicoLayout>
    )
  }

  return (
    <ParamedicoLayout titulo="Cierre de Guardia">
      <div className="cierre-container">
        
        {/* BANNER DE AMBULANCIA */}
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

        {/* TARJETA DE CATEGORÍA */}
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
                        onChange={(e) => cambiarCantidad(insumo.id, e.target.value)}
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

          {/* ÚLTIMA CATEGORÍA - OBSERVACIONES Y FINALIZAR */}
          {esUltimaCategoria && (
            <>
              {insumos.length > 0 && (
                <div className="observaciones-finales">
                  <h4>📝 Observaciones finales (opcional)</h4>
                  <textarea
                    placeholder="Escribe observaciones generales del turno..."
                    value={observacionesFinales}
                    onChange={(e) => setObservacionesFinales(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="acciones-footer">
                <button
                  onClick={finalizarCierre}
                  disabled={!categoriaCompleta() || guardando}
                  className="btn-finalizar"
                >
                  {guardando ? '⏳ Guardando...' : '✅ Finalizar Cierre'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ParamedicoLayout>
  )
}