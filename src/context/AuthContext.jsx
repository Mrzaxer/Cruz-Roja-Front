import { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (correo, password) => {
    try {
      // 1. Buscar el usuario
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', correo.trim())
        .eq('password', password.trim())
        .eq('activo', true)
        .maybeSingle()

      if (errorUsuario || !usuario) {
        return { success: false, error: 'Credenciales inválidas' }
      }

      // 2. Buscar el nombre de la sede
      let nombreSede = 'Sin sede'
      if (usuario.sede_id) {
        const { data: sede } = await supabase
          .from('sedes')
          .select('nombre')
          .eq('id', usuario.sede_id)
          .single()
        
        nombreSede = sede?.nombre || 'Sin sede'
      }

      // 3. Combinar los datos
      const usuarioCompleto = {
        ...usuario,
        sedes: { nombre: nombreSede }
      }

      // 4. Guardar en localStorage y estado
      localStorage.setItem('user', JSON.stringify(usuarioCompleto))
      setUser(usuarioCompleto)
      
      return { success: true, user: usuarioCompleto }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, error: 'Error al conectar con el servidor' }
    }
  }

  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = {
    user,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}