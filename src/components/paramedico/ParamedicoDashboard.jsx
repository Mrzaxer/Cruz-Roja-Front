import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../supabase'
import Layout from '../layout/Layout'
import Card from '../ui/Card'
import Button from '../ui/Button'

export default function ParamedicoDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [fase, setFase] = useState('seleccion')
  const [ambulancias, setAmbulancias] = useState([])
  const [ambulanciaSeleccionada, setAmbulanciaSeleccionada] = useState(null)

  useEffect(() => {
    if (user?.sede_id) cargarAmbulancias()
  }, [user])

  const cargarAmbulancias = async () => {
    const { data } = await supabase
      .from('ambulancias')
      .select('*')
      .eq('sede_id', user.sede_id)
      .eq('estado', 'ACTIVA')

    setAmbulancias(data || [])
  }

  const irAEquipo = () => {
    navigate('/paramedico/equipo', {
      state: { ambulancia: ambulanciaSeleccionada }
    })
  }

  const irAInsumos = () => {
    navigate('/paramedico/insumos', {
      state: { ambulancia: ambulanciaSeleccionada }
    })
  }

  return (
    <Layout titulo="Panel Paramédico">

      {fase === 'seleccion' && (
        <Card title="🚑 Selecciona una ambulancia">
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {ambulancias.map(amb => (
              <div
                key={amb.id}
                onClick={() => setAmbulanciaSeleccionada(amb)}
                style={{
                  minWidth: 150,
                  border: '1px solid #ccc',
                  cursor: 'pointer'
                }}
              >
                {amb.codigo}
              </div>
            ))}
          </div>

          <Button
            onClick={() => setFase('menu')}
            disabled={!ambulanciaSeleccionada}
          >
            Aceptar
          </Button>
        </Card>
      )}

      {fase === 'menu' && (
        <Card title={`🚑 ${ambulanciaSeleccionada.codigo}`}>
          <Button onClick={irAEquipo}>🧰Equipo</Button>
          <Button onClick={irAInsumos}>📦Insumos</Button>
        </Card>
      )}

    </Layout>
  )
}