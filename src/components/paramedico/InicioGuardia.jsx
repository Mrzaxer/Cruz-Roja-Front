import { useEffect, useState } from 'react'
import { useLocation, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import ParamedicoLayout from '../layout/ParamedicoLayout'
import '../../styles/InicioGuardia.css'

export default function InicioGuardia() {

  const { state } = useLocation()
  const navigate = useNavigate()

  const ambulancia = state?.ambulancia

  const [equipos, setEquipos] = useState([])
  const [equipoEstado, setEquipoEstado] = useState({})
  const [cargando, setCargando] = useState(true)

  if (!ambulancia) {
    return <Navigate to="/paramedico" />
  }

  useEffect(() => {
    cargarEquipo()
  }, [])

  const cargarEquipo = async () => {

    setCargando(true)

    const { data, error } = await supabase
      .from('equipo_medico')
      .select(`
        id,
        nombre,
        descripcion,
        obligatorio_global
      `)
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error cargando equipo:', error)
      setCargando(false)
      return
    }

    setEquipos(data)
    setCargando(false)

  }

  const toggleCheck = (id) => {

    setEquipoEstado(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        presente: !prev[id]?.presente
      }
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

    try {

      // 1️⃣ Crear registro de inicio
      const { data: registro, error: errorRegistro } = await supabase
        .from('registros')
        .insert({
          sede_id: ambulancia.sede_id,
          ambulancia_id: ambulancia.id,
          tipo: 'INICIO'
        })
        .select()
        .single()

      if (errorRegistro) throw errorRegistro

      // 2️⃣ Guardar detalle del equipo
      const detalles = equipos.map(equipo => ({
        registro_id: registro.id,
        equipo_id: equipo.id,
        estado: equipoEstado[equipo.id]?.presente || false,
        comentario: equipoEstado[equipo.id]?.observacion || null
      }))

      const { error: errorDetalle } = await supabase
        .from('detalle_equipo')
        .insert(detalles)

      if (errorDetalle) throw errorDetalle

      const completos = detalles.filter(d => d.estado).length
      const faltantes = detalles.length - completos
      const porcentaje = Math.round((completos / detalles.length) * 100)

      alert(
  `✅ Inicio de Guardia Registrado\n\n` +
  `Ambulancia: ${ambulancia.codigo}\n` +
  `Completos: ${completos}\n` +
  `Faltantes: ${faltantes}\n` +
  `Progreso: ${porcentaje}%`
)

navigate("/login")

    } catch (error) {

      console.error('Error guardando inicio:', error)
      alert("Error al guardar inicio de guardia")

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

  const completos = Object.values(equipoEstado).filter(e => e?.presente).length
  const total = equipos.length
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

            {equipos.length === 0 ? (

              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>No hay equipo configurado</h4>
              </div>

            ) : (

              equipos.map(equipo => (

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

                      {equipoEstado[equipo.id]?.presente && (
                        <span className="equipo-badge">
                          ✓ Verificado
                        </span>
                      )}
                    </div>

                    {equipo.descripcion && (
                      <div className="equipo-descripcion">
                        {equipo.descripcion}
                      </div>
                    )}

                    <div className="equipo-observacion">

                      <span className="observacion-icono">📝</span>

                      <input
                        type="text"
                        placeholder="Observaciones (opcional)"
                        value={equipoEstado[equipo.id]?.observacion || ''}
                        onChange={(e) =>
                          cambiarObservacion(equipo.id, e.target.value)
                        }
                      />

                    </div>

                  </div>

                </div>

              ))

            )}

          </div>

          {equipos.length > 0 && (

            <div className="resumen-verificacion">

              <div className="resumen-stats">

                <div className="stat-item">
                  <span className="stat-label">Completos:</span>
                  <span className="stat-value completo">{completos}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Faltantes:</span>
                  <span className="stat-value faltante">{total - completos}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Progreso:</span>
                  <span className="stat-value">{porcentaje}%</span>
                </div>

              </div>

              <button
                onClick={guardarInicio}
                className="btn-guardar"
              >
                <span>✅</span>
                Guardar inicio de guardia
              </button>

            </div>

          )}

        </div>

      </div>

    </ParamedicoLayout>

  )

}