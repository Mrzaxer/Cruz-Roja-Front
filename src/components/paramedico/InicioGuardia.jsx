import { useEffect, useState } from 'react'
import { useLocation, Navigate, useNavigate }  from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import ParamedicoLayout from '../layout/ParamedicoLayout'
import '../../styles/InicioGuardia.css'

export default function InicioGuardia() {

  const { user } = useAuth()
  const { state } = useLocation()
  const navigate = useNavigate()

  const ambulancia = state?.ambulancia

  const [equipos, setEquipos] = useState([]) // Equipos con serie (asignados)
  const [equiposGenerales, setEquiposGenerales] = useState([]) // Equipos generales (con cantidad)
  const [equipoEstado, setEquipoEstado] = useState({})
  const [cantidades, setCantidades] = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Función para obtener la fecha actual en GMT-6 (hora centro de México)
  const getFechaGMT6 = () => {
    const now = new Date()
    // Obtener la hora en GMT-6
    const offset = -6
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const fechaGMT6 = new Date(utc + (offset * 3600000))
    return fechaGMT6.toISOString()
  }

  if (!ambulancia) {
    return <Navigate to="/paramedico" />
  }

  useEffect(() => {
    cargarEquiposPorAmbulancia()
    cargarEquiposGenerales()
  }, [ambulancia])

  const cargarEquiposPorAmbulancia = async () => {
    try {
      // Cargar equipos con serie asignados a esta ambulancia
      const { data: equiposAsignados, error: errorEquipos } = await supabase
        .from("equipos")
        .select(`
          id,
          numero_serie,
          estado,
          modelo:modelos_equipo(id, nombre, descripcion, categoria)
        `)
        .eq("ambulancia_id", ambulancia.id)
        .eq("tipo", "INDIVIDUAL")
        .eq("estado", "ACTIVO")

      if (errorEquipos) {
        console.error('Error cargando equipos asignados:', errorEquipos)
      }

      const equiposFormateados = (equiposAsignados || []).map(equipo => ({
        id: `serie_${equipo.id}`,
        tipo: "serie",
        equipo_id: equipo.id,
        nombre: equipo.modelo?.nombre || "Equipo sin modelo",
        descripcion: equipo.modelo?.descripcion || "",
        numero_serie: equipo.numero_serie,
        categoria: equipo.modelo?.categoria || ""
      }))

      setEquipos(equiposFormateados)

    } catch (error) {
      console.error('Error cargando equipos con serie:', error)
    }
  }

  const cargarEquiposGenerales = async () => {
    try {
      // Cargar equipos generales (tipo GENERAL) - AHORA USANDO CAMPOS DIRECTOS
      const { data: equiposGeneralesData, error: errorGenerales } = await supabase
        .from("equipos")
        .select(`
          id,
          nombre,
          descripcion,
          categoria,
          cantidad,
          estado
        `)
        .eq("tipo", "GENERAL")
        .eq("estado", "ACTIVO")

      if (errorGenerales) {
        console.error('Error cargando equipos generales:', errorGenerales)
      }

      const equiposGeneralesFormateados = (equiposGeneralesData || []).map(equipo => ({
        id: `general_${equipo.id}`,
        tipo: "general",
        equipo_id: equipo.id,
        nombre: equipo.nombre || "Equipo sin nombre",
        descripcion: equipo.descripcion || "",
        cantidad_establecida: equipo.cantidad,
        categoria: equipo.categoria || ""
      }))

      setEquiposGenerales(equiposGeneralesFormateados)

    } catch (error) {
      console.error('Error cargando equipos generales:', error)
    } finally {
      setCargando(false)
    }
  }

  // Para equipos con serie (checkbox)
  const toggleCheck = (id) => {
    setEquipoEstado(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        presente: !prev[id]?.presente
      }
    }))
  }

  // Para equipos generales (cantidad)
  const cambiarCantidad = (id, valor) => {
    const cantidad = valor === '' ? '' : Number(valor)
    setCantidades(prev => ({
      ...prev,
      [id]: cantidad
    }))
  }

  const cambiarObservacion = (id, texto) => {
    setEquipoEstado(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        observacion: texto
      }
    }))
  }

  // ==================== VALIDACIÓN DE FORMULARIO COMPLETO ====================
  const verificarFormularioCompleto = () => {
    // Verificar equipos con serie (checkbox)
    const todosEquiposSerieCompletos = equipos.every(equipo => 
      equipoEstado[equipo.id]?.presente !== undefined
    )
    
    // Verificar equipos generales (cantidad)
    const todosEquiposGeneralesCompletos = equiposGenerales.every(equipo => 
      cantidades[equipo.id] !== undefined && cantidades[equipo.id] !== ''
    )
    
    // Si hay equipos con serie y están todos completos, o no hay equipos con serie
    const serieCompleto = equipos.length === 0 ? true : todosEquiposSerieCompletos
    
    // Si hay equipos generales y están todos completos, o no hay equipos generales
    const generalCompleto = equiposGenerales.length === 0 ? true : todosEquiposGeneralesCompletos
    
    return serieCompleto && generalCompleto
  }

  // Verificar si el botón debe estar deshabilitado
  const formularioCompleto = verificarFormularioCompleto()

  const guardarInicio = async () => {
    // Validar antes de guardar
    if (!formularioCompleto) {
      alert("⚠️ Debes completar toda la información antes de guardar el inicio de guardia")
      return
    }

    setGuardando(true)

    try {
      // Obtener la fecha actual en GMT-6
      const fechaGMT6 = getFechaGMT6()
      console.log('Fecha en GMT-6:', fechaGMT6)

      // 1. Crear registro de inicio con fecha en GMT-6
      const { data: registro, error: errorRegistro } = await supabase
        .from('registros')
        .insert({
          sede_id: ambulancia.sede_id,
          ambulancia_id: ambulancia.id,
          paramedico_id: user.id,
          tipo: 'INICIO',
          observaciones: '',
          fecha: fechaGMT6
        })
        .select()
        .single()

      if (errorRegistro) throw errorRegistro

      // 2. Guardar detalles de equipos con serie (checkbox)
      const equiposConSerie = equipos.filter(e => equipoEstado[e.id]?.presente !== undefined)
      const detallesSerie = equiposConSerie.map(equipo => ({
        registro_id: registro.id,
        equipo_id: equipo.equipo_id,
        estado: equipoEstado[equipo.id]?.presente || false,
        comentario: equipoEstado[equipo.id]?.observacion || null
      }))

      if (detallesSerie.length > 0) {
        const { error: errorDetalleSerie } = await supabase
          .from('detalle_equipos')
          .insert(detallesSerie)

        if (errorDetalleSerie) throw errorDetalleSerie
      }

      // 3. Guardar detalles de equipos generales (cantidad)
      const equiposGeneralesList = equiposGenerales.filter(e => cantidades[e.id] !== undefined && cantidades[e.id] !== '')
      const detallesGenerales = equiposGeneralesList.map(equipo => ({
        registro_id: registro.id,
        equipo_id: equipo.equipo_id,
        cantidad_registrada: cantidades[equipo.id] || 0,
        comentario: equipoEstado[equipo.id]?.observacion || null
      }))

      if (detallesGenerales.length > 0) {
        const { error: errorDetalleGeneral } = await supabase
          .from('detalle_equipos')
          .insert(detallesGenerales)

        if (errorDetalleGeneral) throw errorDetalleGeneral
      }

      // 4. Calcular resumen
      const totalSerie = equipos.length
      const completosSerie = equipos.filter(e => equipoEstado[e.id]?.presente).length
      const totalGenerales = equiposGenerales.length
      const completosGenerales = equiposGenerales.filter(e => {
        const cantidad = cantidades[e.id]
        return cantidad !== undefined && cantidad !== '' && cantidad >= 0
      }).length

      alert(
        `✅ Inicio de Guardia Registrado\n\n` +
        `Ambulancia: ${ambulancia.codigo}\n\n` +
        `📋 EQUIPOS CON SERIE:\n` +
        `  Total: ${totalSerie}\n` +
        `  Verificados: ${completosSerie}\n` +
        `  Faltantes: ${totalSerie - completosSerie}\n\n` +
        `📦 EQUIPOS GENERALES (por cantidad):\n` +
        `  Total: ${totalGenerales}\n` +
        `  Registrados: ${completosGenerales}\n` +
        `  Pendientes: ${totalGenerales - completosGenerales}`
      )

      navigate("/paramedico", { replace: true })

    } catch (error) {
      console.error('Error guardando inicio:', error)
      alert("Error al guardar inicio de guardia")
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <ParamedicoLayout titulo="Inicio de Guardia">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando equipo médico...</p>
          </div>
        </div>
      </ParamedicoLayout>
    )
  }

  const totalSerie = equipos.length
  const completosSerie = equipos.filter(e => equipoEstado[e.id]?.presente).length
  const totalGenerales = equiposGenerales.length
  const completosGenerales = equiposGenerales.filter(e => {
    const cantidad = cantidades[e.id]
    return cantidad !== undefined && cantidad !== '' && cantidad >= 0
  }).length
  const total = totalSerie + totalGenerales
  const completos = completosSerie + completosGenerales
  const porcentaje = total > 0 ? Math.round((completos / total) * 100) : 0

  // Obtener cantidad de campos pendientes
  const pendientesSerie = equipos.length - completosSerie
  const pendientesGenerales = equiposGenerales.length - completosGenerales
  const totalPendientes = pendientesSerie + pendientesGenerales

  return (

    <ParamedicoLayout titulo="Inicio de Guardia">

      <div className="inicio-container">

        <div className="ambulancia-banner">

          <div className="ambulancia-icono">🚑</div>

          <div className="ambulancia-info">
            <h2>Ambulancia {ambulancia.codigo}</h2>
            <p>Inicio de guardia - Verificación de equipo médico</p>
          </div>

          {ambulancia.placa && (
            <div className="ambulancia-placa">
              Placa: {ambulancia.placa}
            </div>
          )}

        </div>

        <div className="verificacion-card">

          <div className="card-header">
            <div className="card-header-icon">🧰</div>

            <div className="card-header-text">
              <h3>Verificación de Equipo Médico</h3>
              <p>Revisa que todo el equipo esté en su lugar</p>
            </div>
          </div>

          <div className="equipo-lista">

            {total === 0 ? (

              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>No hay equipo registrado</h4>
                <p>Contacta al administrador para configurar el equipo</p>
              </div>

            ) : (

              <>
                {/* Sección de Equipos con Serie (asignados a esta ambulancia) */}
                {equipos.length > 0 && (
                  <>
                    <h4 className="equipo-seccion-titulo">
                      <span>🔢</span> Equipos Asignados (con número de serie)
                    </h4>
                    {equipos.map(equipo => (
                      <div
                        key={equipo.id}
                        className={`equipo-item ${equipoEstado[equipo.id]?.presente ? 'completo' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={equipoEstado[equipo.id]?.presente || false}
                          onChange={() => toggleCheck(equipo.id)}
                          className="equipo-check"
                        />

                        <div className="equipo-contenido">
                          <div className="equipo-nombre">
                            <strong>{equipo.nombre}</strong>
                            {equipo.numero_serie && (
                              <span className="equipo-serie-badge">
                                N° {equipo.numero_serie}
                              </span>
                            )}
                            {equipoEstado[equipo.id]?.presente && (
                              <span className="equipo-badge">✓ Verificado</span>
                            )}
                          </div>

                          {equipo.descripcion && (
                            <div className="equipo-descripcion">{equipo.descripcion}</div>
                          )}

                          {equipo.categoria && (
                            <div className="equipo-categoria">
                              <span className="categoria-badge">{equipo.categoria}</span>
                            </div>
                          )}

                          <div className="equipo-observacion">
                            <span className="observacion-icono">📝</span>
                            <input
                              type="text"
                              placeholder="Observaciones (opcional)"
                              value={equipoEstado[equipo.id]?.observacion || ''}
                              onChange={(e) => cambiarObservacion(equipo.id, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Sección de Equipos Generales (con cantidad) */}
                {equiposGenerales.length > 0 && (
                  <>
                    <h4 className="equipo-seccion-titulo">
                      <span>📦</span> Equipos (registrar cantidad)
                    </h4>
                    {equiposGenerales.map(equipo => {
                      // Determinar estado del equipo general
                      const cantidadIngresada = cantidades[equipo.id]
                      const cantidadEsperada = equipo.cantidad_establecida
                      let estadoEquipo = ''
                      
                      if (cantidadIngresada !== undefined && cantidadIngresada !== '') {
                        if (cantidadIngresada === cantidadEsperada) {
                          estadoEquipo = 'completo'
                        } else if (cantidadIngresada < cantidadEsperada) {
                          estadoEquipo = 'faltante'
                        } else if (cantidadIngresada > cantidadEsperada) {
                          estadoEquipo = 'excedente'
                        }
                      }
                      
                      return (
                        <div
                          key={equipo.id}
                          className={`equipo-item ${estadoEquipo}`}
                        >
                          <div className="equipo-contenido" style={{ flex: 1 }}>
                            <div className="equipo-nombre">
                              <strong>{equipo.nombre}</strong>
                              <span className="equipo-cantidad-establecida">
                                Esperado: {equipo.cantidad_establecida} unidades
                              </span>
                              {cantidadIngresada !== undefined && cantidadIngresada !== '' && (
                                <span className="equipo-badge">✓ Registrado</span>
                              )}
                            </div>

                            {equipo.descripcion && (
                              <div className="equipo-descripcion">{equipo.descripcion}</div>
                            )}

                            {equipo.categoria && (
                              <div className="equipo-categoria">
                                <span className="categoria-badge">{equipo.categoria}</span>
                              </div>
                            )}

                            <div className="equipo-cantidad-input">
                              <label className="cantidad-label">Cantidad presente:</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Ingrese cantidad"
                                value={cantidades[equipo.id] ?? ''}
                                onChange={(e) => cambiarCantidad(equipo.id, e.target.value)}
                                className={`cantidad-input ${estadoEquipo}`}
                              />
                            </div>

                            <div className="equipo-observacion">
                              <span className="observacion-icono">📝</span>
                              <input
                                type="text"
                                placeholder="Observaciones (opcional)"
                                value={equipoEstado[equipo.id]?.observacion || ''}
                                onChange={(e) => cambiarObservacion(equipo.id, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}

          </div>

          {total > 0 && (

            <div className="resumen-verificacion">

              <div className="resumen-stats">
                {equipos.length > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Equipos con serie:</span>
                    <span className="stat-value">{completosSerie}/{totalSerie}</span>
                  </div>
                )}
                {equiposGenerales.length > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Equipos:</span>
                    <span className="stat-value">{completosGenerales}/{totalGenerales}</span>
                  </div>
                )}
                
                <div className="stat-item">
                  <span className="stat-label">Progreso:</span>
                  <span className="stat-value">{porcentaje}%</span>
                </div>

                {totalPendientes > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Pendientes:</span>
                    <span className="stat-value faltante">{totalPendientes}</span>
                  </div>
                )}
              </div>

              <button
                onClick={guardarInicio}
                disabled={guardando || !formularioCompleto}
                className="btn-guardar"
                style={!formularioCompleto ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {guardando ? 'Guardando...' : '✅ Guardar inicio de guardia'}
              </button>

            </div>

          )}

        </div>

      </div>

    </ParamedicoLayout>

  )
}