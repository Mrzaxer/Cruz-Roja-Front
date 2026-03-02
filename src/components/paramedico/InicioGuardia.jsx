import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import Layout from '../layout/Layout'
import Card from '../ui/Card'
import Button from '../ui/Button'

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

    let mensaje = '🚑 Inicio de Guardia\n\n'

    mensaje += '✅ EQUIPO COMPLETO:\n'
    if (completos.length === 0) {
      mensaje += 'Ninguno\n'
    } else {
      completos.forEach(item => {
        mensaje += `- ${item.nombre} (${item.observacion})\n`
      })
    }

    mensaje += '\n❌ EQUIPO FALTANTE:\n'
    if (faltantes.length === 0) {
      mensaje += 'Ninguno\n'
    } else {
      faltantes.forEach(item => {
        mensaje += `- ${item.nombre} (${item.observacion})\n`
      })
    }

    alert(mensaje)

    console.log('Completos:', completos)
    console.log('Faltantes:', faltantes)
  }

  if (cargando) {
    return (
      <Layout titulo="Inicio de Guardia">
        <p>Cargando equipo médico...</p>
      </Layout>
    )
  }

  return (
    <Layout titulo="Inicio de Guardia">
      <Card className="mb-4">
        <p><strong>Ambulancia:</strong> {ambulancia.codigo}</p>
      </Card>

      <Card title="🧰 Verificación de Equipo Médico">

        {insumos.length === 0 && (
          <p>No hay equipo médico configurado</p>
        )}

        {insumos.map(insumo => (
          <div
            key={insumo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px'
            }}
          >
            <input
              type="checkbox"
              checked={equipoEstado[insumo.id]?.presente || false}
              onChange={() => toggleCheck(insumo.id)}
            />

            <div style={{ minWidth: '150px' }}>
              <strong>{insumo.nombre}</strong>
              {insumo.descripcion && (
                <p style={{ fontSize: '12px', color: '#666' }}>
                  {insumo.descripcion}
                </p>
              )}
            </div>

            <input
              type="text"
              placeholder="Observaciones (opcional)"
              value={equipoEstado[insumo.id]?.observacion || ''}
              onChange={(e) =>
                cambiarObservacion(insumo.id, e.target.value)
              }
              style={{ flex: 1 }}
            />
          </div>
        ))}

        <Button onClick={guardarInicio} className="mt-4">
          Guardar inicio de guardia
        </Button>

      </Card>
    </Layout>
  )
}