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
  const [cantidad, setCantidad] = useState(0)
  const [obligatorioGlobal, setObligatorioGlobal] = useState(true)
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
          cantidad_establecida: cantidad,
          obligatorio_global: obligatorioGlobal,
          activo: true
        }
      ])

    if (error) {
      alert('Error al crear insumo')
      console.log(error)
    } else {

      setNombre('')
      setDescripcion('')
      setCategoria('Equipo Médico')
      setCantidad(0)
      setObligatorioGlobal(true)

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

          {/* CATEGORIA */}
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            <option value="Equipo Médico">Equipo Médico</option>
            <option value="Manejo de Vía Aérea">Manejo de Vía Aérea</option>
            <option value="Manejo Intravenoso e Intramuscular">Manejo Intravenoso e Intramuscular</option>
            <option value="Soluciones">Soluciones</option>
            <option value="Curaciones y Varios">Curaciones y Varios</option>
            <option value="Limpieza y Desinfección">Limpieza y Desinfección</option>
            <option value="Medicamentos">Medicamentos</option>
          </select>

          {/* CANTIDAD ESTABLECIDA */}
          <input
            type="number"
            placeholder="Cantidad establecida"
            value={cantidad}
            onChange={e => setCantidad(Number(e.target.value))}
          />

          {/* OBLIGATORIO GLOBAL */}
          <select
            value={obligatorioGlobal}
            onChange={e => setObligatorioGlobal(e.target.value === 'true')}
          >
            <option value="true">Obligatorio</option>
            <option value="false">No obligatorio</option>
          </select>

          <Button onClick={crearInsumo} disabled={cargando}>
            Crear
          </Button>

        </div>

      </Card>

      {/* LISTA DE INSUMOS */}
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

            <p style={{ fontSize: 12 }}>
              {insumo.descripcion}
            </p>

            <p style={{ fontSize: 12 }}>
              Categoría: {insumo.categoria}
            </p>

            <p style={{ fontSize: 12 }}>
              Cantidad establecida: {insumo.cantidad_establecida}
            </p>

            <p style={{ fontSize: 12 }}>
              Obligatorio: {insumo.obligatorio_global ? 'Sí' : 'No'}
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