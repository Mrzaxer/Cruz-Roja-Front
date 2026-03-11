import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import AdminLayout from '../layout/AdminLayout'

export default function AdminDashboard() {

  const [stats, setStats] = useState({
    sedes: 0,
    usuarios: 0,
    ambulancias: 0,
    activas: 0,
    registrosHoy: 0
  })

  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  const cargarEstadisticas = async () => {

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

    setCargando(false)
  }

  if (cargando) {
    return (
      <AdminLayout titulo="Panel de Administración">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>⛑️</div>
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
              <div className="stat-label">SEDES</div>
              <div className="stat-value">{stats.sedes}</div>
            </div>
            <div className="stat-icon red">🏢</div>
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">USUARIOS</div>
              <div className="stat-value">{stats.usuarios}</div>
            </div>
            <div className="stat-icon blue">👥</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">AMBULANCIAS</div>
              <div className="stat-value">{stats.ambulancias}</div>
            </div>
            <div className="stat-icon green">🚑</div>
          </div>
        </div>

        <div className="stat-card yellow">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">ACTIVAS</div>
              <div className="stat-value">{stats.activas}</div>
            </div>
            <div className="stat-icon yellow">✅</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-label">REGISTROS HOY</div>
              <div className="stat-value">{stats.registrosHoy}</div>
            </div>
            <div className="stat-icon purple">📋</div>
          </div>
        </div>

      </div>


      <div className="quick-actions-grid">

        <a href="/admin/sedes" className="quick-action-card">
          <div className="quick-action-icon">🏢</div>
          <h3>Gestión de Sedes</h3>
          <p>Administre las sedes de la institución</p>
          <span className="quick-action-link red">
            Ir a Sedes →
          </span>
        </a>

        <a href="/admin/usuarios" className="quick-action-card">
          <div className="quick-action-icon">👥</div>
          <h3>Gestión de Usuarios</h3>
          <p>Administre paramédicos y administradores</p>
          <span className="quick-action-link blue">
            Ir a Usuarios →
          </span>
        </a>

        <a href="/admin/ambulancias" className="quick-action-card">
          <div className="quick-action-icon">🚑</div>
          <h3>Gestión de Ambulancias</h3>
          <p>Control de flotilla de ambulancias</p>
          <span className="quick-action-link green">
            Ir a Ambulancias →
          </span>
        </a>

        <a href="/admin/equipo" className="quick-action-card">
          <div className="quick-action-icon">🧰</div>
          <h3>Gestión de Equipo</h3>
          <p>Administre el equipo médico</p>
          <span className="quick-action-link purple">
            Ir a Equipo →
          </span>
        </a>

      </div>


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </AdminLayout>

  )
}