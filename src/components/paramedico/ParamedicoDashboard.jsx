import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../supabase'
import Layout from '../layout/Layout'
import Card from '../ui/Card'
import Button from '../ui/Button'
// import InicioGuardia from './InicioGuardia'
// import CierreGuardia from './CierreGuardia'
// import HistorialRegistros from './HistorialRegistros'

export default function ParamedicoDashboard() {
  const { user } = useAuth()
  const [vista, setVista] = useState('principal')
  const [ambulancias, setAmbulancias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [estadisticas, setEstadisticas] = useState({
    registrosHoy: 0,
    ambulanciaActiva: null
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // Cargar ambulancias activas
    const { data: ambData } = await supabase
      .from('ambulancias')
      .select('*')
      .eq('sede_id', user.sede_id)
      .eq('estado', 'ACTIVA')
    
    setAmbulancias(ambData || [])

    // Contar registros de hoy
    const hoy = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('registros')
      .select('*', { count: 'exact', head: true })
      .eq('paramedico_id', user.id)
      .gte('fecha', hoy)
    
    setEstadisticas({
      registrosHoy: count || 0,
      ambulanciaActiva: ambData?.length || 0
    })
    
    setCargando(false)
  }

  if (cargando) {
    return (
      <Layout titulo="Panel Paramédico">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">🚑</div>
            <p className="text-gray-500">Cargando...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // if (vista !== 'principal') {
  //   return (
  //     <Layout titulo={vista === 'inicio' ? 'Inicio de Guardia' : 'Cierre de Guardia'}>
  //       <Button 
  //         variant="outline" 
  //         size="sm" 
  //         onClick={() => setVista('principal')}
  //         className="mb-4"
  //       >
  //         ← Volver
  //       </Button>
        
  //       {vista === 'inicio' && <InicioGuardia ambulancias={ambulancias} />}
  //       {vista === 'cierre' && <CierreGuardia ambulancias={ambulancias} />}
  //       {vista === 'historial' && <HistorialRegistros />}
  //     </Layout>
  //   )
  // }

  return (
    <Layout titulo="Panel Paramédico">
      {/* Tarjeta de bienvenida */}
      <Card className="mb-6 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Hola, {user?.nombre}! 👋
            </h2>
            <p className="text-gray-600">
              Sede: <span className="font-medium">{user?.sedes?.nombre || 'No asignada'}</span>
            </p>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
            <p className="text-sm text-gray-500">Registros hoy</p>
            <p className="text-2xl font-bold text-red-600">{estadisticas.registrosHoy}</p>
          </div>
        </div>
      </Card>

      {/* Tarjetas de acción rápida */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div 
          onClick={() => setVista('inicio')}
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-red-200"
        >
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-bold text-lg mb-1">Inicio de Guardia</h3>
          <p className="text-sm text-gray-500">Registrar inicio de turno y verificar insumos</p>
        </div>

        <div 
          onClick={() => setVista('cierre')}
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-red-200"
        >
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-bold text-lg mb-1">Cierre de Guardia</h3>
          <p className="text-sm text-gray-500">Registrar insumos utilizados y faltantes</p>
        </div>

        <div 
          onClick={() => setVista('historial')}
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-red-200"
        >
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-bold text-lg mb-1">Mis Registros</h3>
          <p className="text-sm text-gray-500">Ver historial de guardias anteriores</p>
        </div>
      </div>

      {/* Lista de ambulancias activas */}
      <Card title="🚑 Ambulancias Activas" icon="🚑">
        {ambulancias.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {ambulancias.map(amb => (
              <div key={amb.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{amb.codigo}</p>
                    <p className="text-sm text-gray-600">{amb.placa || 'Sin placa'}</p>
                    <p className="text-xs text-gray-500 mt-1">{amb.descripcion}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                    {amb.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No hay ambulancias activas en esta sede
          </p>
        )}
      </Card>
    </Layout>
  )
}