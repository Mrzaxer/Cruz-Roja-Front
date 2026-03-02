import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import Layout from '../layout/Layout'
import Card from '../ui/Card'
import Button from '../ui/Button'

export default function GestionInsumos() {
  const [insumos, setInsumos] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Equipo Médico')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    cargarInsumos()
  }, [])

  const cargarInsumos = async () => {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('categoria')
      .order('nombre')

    setInsumos(data || [])
  }

  const crearInsumo = async () => {
    if (!nombre) {
      alert('El nombre es obligatorio')
      return
    }

    setCargando(true)

    const { error } = await supabase
      .from('insumos')
      .insert([
        {
          nombre,
          descripcion,
          categoria,
          activo: true
        }
      ])

    if (error) {
      alert('Error al crear insumo')
    } else {
      setNombre('')
      setDescripcion('')
      setCategoria('Equipo Médico')
      cargarInsumos()
    }

    setCargando(false)
  }

  const toggleActivo = async (id, estadoActual) => {
    await supabase
      .from('insumos')
      .update({ activo: !estadoActual })
      .eq('id', id)

    cargarInsumos()
  }

  return (
    <Layout titulo="Gestión de Insumos">

      {/* CREAR INSUMO */}
      <Card title="➕ Nuevo Insumo" className="mb-6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          <input
            placeholder="Nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />

          <input
            placeholder="Descripción"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />

          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            <option value="Equipo Médico">Equipo Médico</option>
            <option value="Insumos">Insumos</option>
          </select>

          <Button onClick={crearInsumo} disabled={cargando}>
            Crear
          </Button>

        </div>
      </Card>

      {/* LISTA */}
      <Card title="📋 Lista de Insumos">
        {insumos.map(insumo => (
          <div
            key={insumo.id}
            style={{
              borderBottom: '1px solid #ddd',
              padding: '10px 0'
            }}
          >
            <strong>{insumo.nombre}</strong>
            <p style={{ fontSize: 12 }}>{insumo.descripcion}</p>
            <p style={{ fontSize: 12 }}>
              Categoría: {insumo.categoria}
            </p>

            <Button
              onClick={() => toggleActivo(insumo.id, insumo.activo)}
            >
              {insumo.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        ))}

        {insumos.length === 0 && (
          <p>No hay insumos registrados</p>
        )}
      </Card>

    </Layout>
  )
}