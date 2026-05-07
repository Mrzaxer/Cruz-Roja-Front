/**
 * @component SubadminInsumosSede
 * @description Gestión de insumos por sede para subadministradores:
 *              - Ver insumos activos e inactivos de la sede
 *              - Editar cantidades establecidas por insumo (mínimo 1)
 *              - Activar/desactivar insumos en la sede
 *              - Los insumos obligatorios globales no pueden desactivarse
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import SubadminLayout from '../layout/SubadminLayout'
import '../../styles/SubadminInsumosSede.css'

export default function SubadminInsumosSede() {
  const { user } = useAuth()
  
  // ===== ESTADOS =====
  const [insumosSede, setInsumosSede] = useState([])
  const [insumosInactivos, setInsumosInactivos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [cantidadEdit, setCantidadEdit] = useState(1)
  const [vista, setVista] = useState('activos')

  // ===== CARGA INICIAL =====
  useEffect(() => {
    if (user?.sede_id) cargarDatos()
  }, [user])

  /**
   * Carga todos los insumos del catálogo y su configuración por sede
   */
  const cargarDatos = async () => {
    // 1. Obtener todos los insumos del catálogo global
    const { data: todosInsumos } = await supabase
      .from('insumos')
      .select('*')
      .order('categoria')
      .order('nombre')

    // 2. Obtener configuración de insumos para esta sede
    const { data: configurados } = await supabase
      .from('insumos_por_sede')
      .select('*')
      .eq('sede_id', user.sede_id)

    const activos = []
    const inactivos = []

    todosInsumos?.forEach(insumo => {
      const config = (configurados || []).find(c => c.insumo_id === insumo.id)
      
      // Saltar insumos desactivados globalmente por el admin
      if (insumo.activo === false) return

      const activoEnSede = config ? config.activo_en_sede !== false : true
      let cantidad = config?.cantidad_establecida || 1
      if (cantidad < 1) cantidad = 1

      const insumoConConfig = {
        ...insumo,
        cantidad_establecida: cantidad,
        config_id: config?.id,
        activo_en_sede: activoEnSede
      }

      if (activoEnSede) {
        activos.push(insumoConConfig)
      } else {
        inactivos.push(insumoConConfig)
      }
    })

    setInsumosSede(activos)
    setInsumosInactivos(inactivos)
    setCargando(false)
  }

  /**
   * Guarda la cantidad establecida para un insumo
   * @param {number} insumoId - ID del insumo
   * @param {number} cantidad - Nueva cantidad (mínimo 1)
   */
  const guardarCantidad = async (insumoId, cantidad) => {
    if (cantidad < 1) {
      alert('La cantidad debe ser al menos 1')
      return
    }

    const insumo = insumosSede.find(i => i.id === insumoId)
    const existe = insumo?.config_id

    if (existe) {
      await supabase
        .from('insumos_por_sede')
        .update({ 
          cantidad_establecida: cantidad,
          activo_en_sede: true 
        })
        .eq('insumo_id', insumoId)
        .eq('sede_id', user.sede_id)
    } else {
      await supabase
        .from('insumos_por_sede')
        .insert([{
          sede_id: user.sede_id,
          insumo_id: insumoId,
          cantidad_establecida: cantidad,
          activo_en_sede: true
        }])
    }

    setEditando(null)
    cargarDatos()
  }

  /**
   * Activa o desactiva un insumo en la sede
   * @param {number} insumoId - ID del insumo
   * @param {boolean} estaActivo - Estado actual (true = activo)
   */
  const toggleActivoSede = async (insumoId, estaActivo) => {
    const insumo = [...insumosSede, ...insumosInactivos].find(i => i.id === insumoId)
    const existe = insumo?.config_id

    if (existe) {
      await supabase
        .from('insumos_por_sede')
        .update({ 
          activo_en_sede: !estaActivo,
          cantidad_establecida: !estaActivo ? 1 : insumo.cantidad_establecida
        })
        .eq('insumo_id', insumoId)
        .eq('sede_id', user.sede_id)
    } else {
      await supabase
        .from('insumos_por_sede')
        .insert([{
          sede_id: user.sede_id,
          insumo_id: insumoId,
          cantidad_establecida: 1,
          activo_en_sede: !estaActivo
        }])
    }

    cargarDatos()
  }

  /**
   * Agrupa insumos por categoría
   * @param {Array} lista - Lista de insumos
   * @returns {Object} Objeto agrupado por categoría
   */
  const agruparPorCategoria = (lista) => {
    return lista.reduce((acc, insumo) => {
      if (!acc[insumo.categoria]) {
        acc[insumo.categoria] = []
      }
      acc[insumo.categoria].push(insumo)
      return acc
    }, {})
  }

  // ===== RENDER =====
  if (cargando) {
    return (
      <SubadminLayout titulo="Insumos por Sede">
        <div className="loading-container">
          <div className="loading-spinner">
            <span>⟳</span>
            <p>Cargando insumos...</p>
          </div>
        </div>
      </SubadminLayout>
    )
  }

  const insumosActivosPorCategoria = agruparPorCategoria(insumosSede)
  const insumosInactivosPorCategoria = agruparPorCategoria(insumosInactivos)

  return (
    <SubadminLayout 
      titulo="Configuración de Insumos por Sede"
      subtitulo={`Define cantidades y activa/desactiva insumos para ${user?.sedes?.nombre || 'tu sede'}`}
    >
      <div className="insumos-sede-container">
        
        {/* BANNER */}
        <div className="insumos-banner">
          <div className="insumos-banner-icon">💉</div>
          <div className="insumos-banner-text">
            <h2>Gestión de Insumos</h2>
            <p>Los insumos activos deben tener cantidad mínima de 1</p>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="insumos-tabs">
          <button
            onClick={() => setVista('activos')}
            className={`tab-button ${vista === 'activos' ? 'active' : ''}`}
          >
            📋 Activos ({insumosSede.length})
          </button>
          <button
            onClick={() => setVista('inactivos')}
            className={`tab-button ${vista === 'inactivos' ? 'active' : ''} inactive-tab`}
          >
            ⚪ Inactivos ({insumosInactivos.length})
          </button>
        </div>

        {/* VISTA DE ACTIVOS */}
        {vista === 'activos' && (
          <>
            {Object.keys(insumosActivosPorCategoria).length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">💉</span>
                <p>No hay insumos activos en esta sede</p>
              </div>
            ) : (
              Object.keys(insumosActivosPorCategoria).map(categoria => (
                <div key={categoria} className="categoria-section">
                  <h3 className="categoria-titulo activo">
                    <span>📋</span>
                    {categoria}
                  </h3>

                  <div className="insumos-grid">
                    {insumosActivosPorCategoria[categoria].map(insumo => (
                      <div key={insumo.id} className="insumo-item activo">
                        <div className="insumo-info">
                          <div className="insumo-header">
                            <strong className="insumo-nombre">{insumo.nombre}</strong>
                            {insumo.obligatorio_global && (
                              <span className="badge obligatorio">🔴 Obligatorio</span>
                            )}
                          </div>
                          {insumo.descripcion && (
                            <p className="insumo-descripcion">{insumo.descripcion}</p>
                          )}
                        </div>

                        <div className="insumo-acciones">
                          {editando === insumo.id ? (
                            <div className="edit-mode">
                              <input
                                type="number"
                                min="1"
                                value={cantidadEdit}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  if (val >= 1) setCantidadEdit(val)
                                }}
                                className="edit-input"
                              />
                              <button
                                onClick={() => guardarCantidad(insumo.id, cantidadEdit)}
                                className="btn-guardar"
                              >
                                ✓ Guardar
                              </button>
                              <button
                                onClick={() => setEditando(null)}
                                className="btn-cancelar"
                              >
                                ✗ Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="cantidad-display">
                                <span className="cantidad-label">Cantidad</span>
                                <span className="cantidad-valor">{insumo.cantidad_establecida}</span>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setEditando(insumo.id)
                                  setCantidadEdit(insumo.cantidad_establecida)
                                }}
                                className="btn-editar"
                              >
                                ✏️ Editar
                              </button>

                              {!insumo.obligatorio_global && (
                                <button
                                  onClick={() => toggleActivoSede(insumo.id, true)}
                                  className="btn-desactivar"
                                >
                                  ⚪ Desactivar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* VISTA DE INACTIVOS */}
        {vista === 'inactivos' && (
          <>
            {Object.keys(insumosInactivosPorCategoria).length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⚪</span>
                <p>No hay insumos inactivos en esta sede</p>
              </div>
            ) : (
              Object.keys(insumosInactivosPorCategoria).map(categoria => (
                <div key={categoria} className="categoria-section">
                  <h3 className="categoria-titulo inactivo">
                    <span>⚪</span>
                    {categoria} (Inactivos)
                  </h3>

                  <div className="insumos-grid">
                    {insumosInactivosPorCategoria[categoria].map(insumo => (
                      <div key={insumo.id} className="insumo-item inactivo">
                        <div className="insumo-info">
                          <div className="insumo-header">
                            <strong className="insumo-nombre inactivo">{insumo.nombre}</strong>
                            {insumo.obligatorio_global && (
                              <span className="badge obligatorio">🔴 Obligatorio</span>
                            )}
                          </div>
                          {insumo.descripcion && (
                            <p className="insumo-descripcion">{insumo.descripcion}</p>
                          )}
                        </div>

                        <button
                          onClick={() => toggleActivoSede(insumo.id, false)}
                          className="btn-activar"
                        >
                          ✅ Activar (Cantidad 1)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

      </div>
    </SubadminLayout>
  )
}