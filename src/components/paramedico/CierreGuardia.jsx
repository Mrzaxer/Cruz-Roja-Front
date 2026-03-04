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

  const cambiarCantidad = (id, valor) => {
    setCantidades(prev => ({
      ...prev,
      [id]: valor
    }))
  }

  const obtenerEstadoInsumo = (insumo) => {
    const cantidad = parseInt(cantidades[insumo.id] || 0)
    const establecida = insumo.cantidad_establecida || 0
    
    if (cantidad < establecida) return 'faltante'
    if (cantidad > establecida) return 'excedente'
    if (cantidad === establecida && cantidad > 0) return 'completo'
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
      const cantidadReal = parseInt(cantidades[insumo.id] || 0)
      const cantidadEstablecida = insumo.cantidad_establecida || 0
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

    // Aquí iría la lógica para guardar en la base de datos

    const mensaje = `✅ Cierre de Guardia Completado\n\n` +
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
        
        {/* Banner de ambulancia */}
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

        {/* Barra de progreso */}
        <div className="categorias-nav">
          <div className="categorias-progreso">
            <div className="progreso-bar" style={{ width: `${progreso}%` }}></div>
          </div>
          <div className="categorias-indicador">
            <span>Categoría</span>
            <span className="categoria-actual">{categoriaIndex + 1}/{categorias.length}</span>
          </div>
        </div>

        {/* Tarjeta de categoría */}
        <div className="categoria-card">
          <div className="categoria-header">
            <div className="categoria-header-icono">📦</div>
            <div className="categoria-header-texto">
              <h3>{categoriaActual}</h3>
              <p>Registra las cantidades reales de cada insumo</p>
            </div>
          </div>

          <div className="insumos-lista">
            {insumos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>No hay insumos en esta categoría</h4>
                <p>Continúa con la siguiente categoría</p>
              </div>
            ) : (
              insumos.map(insumo => {
                const estado = obtenerEstadoInsumo(insumo)
                return (
                  <div
                    key={insumo.id}
                    className={`insumo-item ${estado !== 'pendiente' ? estado : ''}`}
                  >
                    <div className="insumo-info">
                      <div className="insumo-nombre">
                        <strong>{insumo.nombre}</strong>
                        {estado !== 'pendiente' && (
                          <span className={`insumo-badge ${estado}`}>
                            {estado === 'completo' && '✓ Completo'}
                            {estado === 'faltante' && '⚠️ Faltante'}
                            {estado === 'excedente' && '📈 Excedente'}
                          </span>
                        )}
                      </div>
                      
                      {insumo.descripcion && (
                        <div className="insumo-descripcion">
                          {insumo.descripcion}
                        </div>
                      )}
                      
                      <div className="insumo-establecido">
                        <span>Cantidad establecida:</span>
                        <span className="establecido-valor">
                          {insumo.cantidad_establecida}
                        </span>
                      </div>
                    </div>

                    <div className="insumo-cantidad">
                      <input
                        type="number"
                        min="0"
                        placeholder="Cantidad real"
                        value={cantidades[insumo.id] || ''}
                        onChange={(e) => cambiarCantidad(insumo.id, e.target.value)}
                        className={`cantidad-input ${estado !== 'pendiente' ? estado : ''}`}
                      />
                    </div>

                    <div className="insumo-estado">
                      {cantidades[insumo.id] && (
                        <span className={`estado-badge ${estado}`}>
                          {estado === 'completo' && 'Completo'}
                          {estado === 'faltante' && 'Faltante'}
                          {estado === 'excedente' && 'Excedente'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {esUltimaCategoria && (
            <div className="observaciones-section">
              <div className="observaciones-header">
                <span>📝</span>
                <h4>Observaciones Generales</h4>
              </div>
              <textarea
                value={observacionesFinales}
                onChange={(e) => setObservacionesFinales(e.target.value)}
                rows="4"
                className="observaciones-textarea"
                placeholder="Ingresa cualquier observación adicional sobre el turno o los insumos..."
              />
            </div>
          )}

          <div className="acciones-footer">
            <div className="resumen-stats">
              <div className="stat-item">
                <span className="stat-label">Completos:</span>
                <span className="stat-value completo">{resumen.completos}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Faltantes:</span>
                <span className="stat-value faltante">{resumen.faltantes}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Excedentes:</span>
                <span className="stat-value excedente">{resumen.excedentes}</span>
              </div>
            </div>

            {!esUltimaCategoria ? (
              <button
                onClick={siguienteCategoria}
                disabled={!categoriaCompleta()}
                className="btn-siguiente"
              >
                <span>Siguiente Categoría</span>
                <span>→</span>
              </button>
            ) : (
              <button
                onClick={finalizarCierre}
                disabled={!categoriaCompleta()}
                className="btn-finalizar"
              >
                <span>✅</span>
                <span>Finalizar Cierre</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </ParamedicoLayout>
  )
}