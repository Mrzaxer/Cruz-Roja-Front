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
      // Cargar equipos generales (tipo GENERAL)
      const { data: equiposGeneralesData, error: errorGenerales } = await supabase
        .from("equipos")
        .select(`
          id,
          cantidad,
          estado,
          modelo:modelos_equipo(id, nombre, descripcion, categoria)
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
        nombre: equipo.modelo?.nombre || "Equipo sin modelo",
        descripcion: equipo.modelo?.descripcion || "",
        cantidad_establecida: equipo.cantidad,
        categoria: equipo.modelo?.categoria || ""
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

  const guardarInicio = async () => {
    setGuardando(true)

    try {
      // 1. Crear registro de inicio
      const { data: registro, error: errorRegistro } = await supabase
        .from('registros')
        .insert({
          sede_id: ambulancia.sede_id,
          ambulancia_id: ambulancia.id,
          paramedico_id: user.id,
          tipo: 'INICIO',
          observaciones: ''
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
            <span>⛑️</span>
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
                      <span>📦</span> Equipos Generales (registrar cantidad)
                    </h4>
                    {equiposGenerales.map(equipo => (
                      <div
                        key={equipo.id}
                        className={`equipo-item ${cantidades[equipo.id] !== undefined && cantidades[equipo.id] !== '' ? 'completo' : ''}`}
                      >
                        <div className="equipo-contenido" style={{ flex: 1 }}>
                          <div className="equipo-nombre">
                            <strong>{equipo.nombre}</strong>
                            <span className="equipo-cantidad-establecida">
                              Esperado: {equipo.cantidad_establecida} unidades
                            </span>
                            {cantidades[equipo.id] !== undefined && cantidades[equipo.id] !== '' && (
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
                              className="cantidad-input"
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
                    ))}
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
                    <span className="stat-label">Equipos generales:</span>
                    <span className="stat-value">{completosGenerales}/{totalGenerales}</span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-label">Total verificados:</span>
                  <span className="stat-value">{completos}/{total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Progreso:</span>
                  <span className="stat-value">{porcentaje}%</span>
                </div>
              </div>

              <button
                onClick={guardarInicio}
                disabled={guardando}
                className="btn-guardar"
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