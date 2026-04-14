/**
 * @component AdminDashboard
 * @description Panel principal del administrador. Muestra estadísticas del sistema:
 *              total de sedes, usuarios, ambulancias, ambulancias activas y registros del día.
 * @returns {JSX.Element}
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'
import '../../styles/AdminDashboard.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    sedes: 0,
    usuarios: 0,
    ambulancias: 0,
    activas: 0,
    registrosHoy: 0
  })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  /**
   * Carga todas las estadísticas en paralelo desde Supabase
   * @returns {Promise<void>}
   */
  const cargarEstadisticas = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0]

      const [sedes, usuarios, ambulancias, activas, registros] = await Promise.all([
        supabase.from('sedes').select('*', { count: 'exact', head: true }),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase.from('ambulancias').select('*', { count: 'exact', head: true }),
        supabase.from('ambulancias').select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVA'),
        supabase.from('registros').select('*', { count: 'exact', head: true }).gte('fecha', hoy)
      ])

      setStats({
        sedes: sedes.count || 0,
        usuarios: usuarios.count || 0,
        ambulancias: ambulancias.count || 0,
        activas: activas.count || 0,
        registrosHoy: registros.count || 0
      })
    } catch (err) {
      console.error('Error al cargar estadísticas:', err)
      setError('Error al cargar los datos')
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Panel de Administración">
        <div className="loading-spinner">
          <div className="spinner">⟳</div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout titulo="Panel de Administración">
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={cargarEstadisticas}>Reintentar</button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      titulo="Panel de Administración"
      subtitulo="Bienvenido al sistema de gestión"
    >
      <div className="stats-grid">
        <div className="stat-card red">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Sedes</div>
              <div className="stat-value">{stats.sedes}</div>
            </div>
            <div className="stat-icon red">🏢</div>
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Usuarios</div>
              <div className="stat-value">{stats.usuarios}</div>
            </div>
            <div className="stat-icon blue">👥</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Ambulancias</div>
              <div className="stat-value">{stats.ambulancias}</div>
            </div>
            <div className="stat-icon green">🚑</div>
          </div>
        </div>

        <div className="stat-card yellow">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Activas</div>
              <div className="stat-value">{stats.activas}</div>
            </div>
            <div className="stat-icon yellow">✅</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">Registros hoy</div>
              <div className="stat-value">{stats.registrosHoy}</div>
            </div>
            <div className="stat-icon purple">📋</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}