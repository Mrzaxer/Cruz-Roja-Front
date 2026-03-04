import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import ParamedicoLayout from '../layout/ParamedicoLayout'
import '../../styles/InicioGuardia.css'

export default function InicioGuardia() {
  const { state } = useLocation()
  const ambulancia = state?.ambulancia

  const [insumos, setInsumos] = useState([])
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
      .from('insumos')
      .select('id, nombre, descripcion')
      .eq('categoria', 'Equipo Médico')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error cargando equipo:', error)
    } else {
      setInsumos(data || [])
    }

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

  const guardarInicio = () => {
    const completos = []
    const faltantes = []

    insumos.forEach(insumo => {
      const estado = equipoEstado[insumo.id]

      if (estado?.presente) {
        completos.push({
          nombre: insumo.nombre,
          observacion: estado?.observacion || 'Sin observación'
        })
      } else {
        faltantes.push({
          nombre: insumo.nombre,
          observacion: estado?.observacion || 'Sin observación'
        })
      }
    })

    // Aquí iría la lógica para guardar en la base de datos
    console.log('Guardando inicio de guardia:', {
      ambulancia: ambulancia.codigo,
      completos,
      faltantes
    })

    // Mostrar resumen
    const totalCompletos = completos.length
    const totalFaltantes = faltantes.length
    const porcentaje = Math.round((totalCompletos / insumos.length) * 100)

    alert(`✅ Inicio de Guardia Registrado\n\n` +
          `Ambulancia: ${ambulancia.codigo}\n` +
          `Completos: ${totalCompletos}\n` +
          `Faltantes: ${totalFaltantes}\n` +
          `Progreso: ${porcentaje}%`)
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
  const total = insumos.length
  const porcentaje = total > 0 ? Math.round((completos / total) * 100) : 0

  return (
    <ParamedicoLayout titulo="Inicio de Guardia">
      <div className="inicio-container">
        
        {/* Banner de ambulancia */}
        <div className="ambulancia-banner">
          <div className="ambulancia-icono">🚑</div>
          <div className="ambulancia-info">
            <h2>Ambulancia {ambulancia.codigo}</h2>
            <p>Inicio de guardia - Verificación de equipo</p>
          </div>
          {ambulancia.placa && (
            <div className="ambulancia-placa">
              Placa: {ambulancia.placa}
            </div>
          )}
        </div>

        {/* Tarjeta de verificación */}
        <div className="verificacion-card">
          <div className="card-header">
            <div className="card-header-icon">🧰</div>
            <div className="card-header-text">
              <h3>Verificación de Equipo Médico</h3>
              <p>Revisa que todo el equipo esté en su lugar</p>
            </div>
          </div>

          <div className="equipo-lista">
            {insumos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>No hay equipo configurado</h4>
                <p>Contacta al administrador para configurar el equipo médico</p>
              </div>
            ) : (
              insumos.map(insumo => (
                <div
                  key={insumo.id}
                  className={`equipo-item ${equipoEstado[insumo.id]?.presente ? 'completo' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={equipoEstado[insumo.id]?.presente || false}
                    onChange={() => toggleCheck(insumo.id)}
                    className="equipo-check"
                  />
                  
                  <div className="equipo-contenido">
                    <div className="equipo-nombre">
                      <strong>{insumo.nombre}</strong>
                      {equipoEstado[insumo.id]?.presente && (
                        <span className="equipo-badge">✓ Verificado</span>
                      )}
                    </div>
                    
                    {insumo.descripcion && (
                      <div className="equipo-descripcion">
                        {insumo.descripcion}
                      </div>
                    )}
                    
                    <div className="equipo-observacion">
                      <span className="observacion-icono">📝</span>
                      <input
                        type="text"
                        placeholder="Observaciones (opcional)"
                        value={equipoEstado[insumo.id]?.observacion || ''}
                        onChange={(e) => cambiarObservacion(insumo.id, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {insumos.length > 0 && (
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

              <button onClick={guardarInicio} className="btn-guardar">
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