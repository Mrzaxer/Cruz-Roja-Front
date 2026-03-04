import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../supabase'
import ParamedicoLayout from '../layout/ParamedicoLayout' // Cambiamos a ParamedicoLayout
import '../../styles/ParamedicoDashboard.css'

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
    <ParamedicoLayout titulo="Panel Paramédico">
      <div className="paramedico-container">
        
        {/* Banner superior */}
        <div className="paramedico-banner">
          <div className="banner-content">
            <h2>Cruz Roja Mexicana</h2>
            <p>Sistema de Gestión de Ambulancias</p>
          </div>
        </div>

        {fase === 'seleccion' && (
          <div className="paramedico-card">
            <h3>🚑 Selecciona una ambulancia</h3>
            
            {ambulancias.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚑</span>
                <p>No hay ambulancias activas disponibles</p>
              </div>
            ) : (
              <>
                <div className="ambulancias-grid">
                  {ambulancias.map(amb => (
                    <div
                      key={amb.id}
                      onClick={() => setAmbulanciaSeleccionada(amb)}
                      className={`ambulancia-item ${ambulanciaSeleccionada?.id === amb.id ? 'selected' : ''}`}
                    >
                      <div className="ambulancia-icon">🚑</div>
                      <div className="ambulancia-info">
                        <span className="codigo">{amb.codigo}</span>
                        <span className="placa">{amb.placa || 'Sin placa'}</span>
                      </div>
                      {ambulanciaSeleccionada?.id === amb.id && (
                        <div className="check">✓</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="action-footer">
                  <button
                    onClick={() => setFase('menu')}
                    disabled={!ambulanciaSeleccionada}
                    className="btn-aceptar"
                  >
                    Continuar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {fase === 'menu' && (
          <div className="paramedico-card">
            <h3>🚑 Ambulancia {ambulanciaSeleccionada?.codigo}</h3>
            
            <div className="menu-grid">
              <div className="menu-item" onClick={irAEquipo}>
                <div className="menu-icon">🧰</div>
                <h3>Equipo Médico</h3>
                <p>Verificar equipo y herramientas</p>
                <div className="menu-arrow">→</div>
              </div>

              <div className="menu-item" onClick={irAInsumos}>
                <div className="menu-icon">📦</div>
                <h3>Insumos</h3>
                <p>Revisar inventario de insumos</p>
                <div className="menu-arrow">→</div>
              </div>
            </div>

            <button 
              onClick={() => setFase('seleccion')} 
              className="btn-cambiar"
            >
              Cambiar ambulancia
            </button>
          </div>
        )}

      </div>
    </ParamedicoLayout>
  )
}