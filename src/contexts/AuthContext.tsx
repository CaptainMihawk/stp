import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, AUTH_DOMAIN } from '../lib/supabase'
import type { Profile, RoleSetor, VinculoSetor } from '../lib/types'

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  vinculosSetor: VinculoSetor[]
  /** Gestor operacional = role_setor GESTOR em algum setor ativo (independente de profiles.role) */
  isGestorSetor: boolean
  loading: boolean
  signIn: (matricula: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000

async function loadProfile(userId: string) {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      console.error('Erro ao buscar perfil:', error)
      return null
    }
    return data ?? null
  } catch (err) {
    console.error('Exceção ao buscar perfil do usuário:', err)
    return null
  }
}

async function loadVinculosSetor(userId: string): Promise<VinculoSetor[]> {
  try {
    const { data, error } = await supabase
      .from('profiles_setores')
      .select('setor_id, role_setor, ativo')
      .eq('profile_id', userId)
      .eq('ativo', true)

    if (error) {
      console.error('Erro ao buscar vínculos de setor:', error)
      return []
    }

    return (data ?? []).map((row) => ({
      setor_id: row.setor_id as number,
      role_setor: row.role_setor as RoleSetor,
      ativo: row.ativo as boolean,
    }))
  } catch (err) {
    console.error('Exceção ao buscar vínculos de setor:', err)
    return []
  }
}

async function loadUserContext(userId: string) {
  const [fetchedProfile, vinculos] = await Promise.all([
    loadProfile(userId),
    loadVinculosSetor(userId),
  ])
  return { profile: fetchedProfile, vinculos }
}

/**
 * Evita deadlock do Supabase Auth ao recarregar a página: não chamar .from() etc.
 * diretamente dentro do callback síncrono de onAuthStateChange.
 */
function deferAuthSideEffect(fn: () => void | Promise<void>) {
  setTimeout(() => {
    void fn()
  }, 0)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vinculosSetor, setVinculosSetor] = useState<VinculoSetor[]>([])
  const [loading, setLoading] = useState(true)

  const isGestorSetor = vinculosSetor.some(
    (v) => v.ativo && v.role_setor === 'GESTOR',
  )

  useEffect(() => {
    let alive = true

    const finishLoading = () => {
      if (alive) setLoading(false)
    }

    const safetyTimer = window.setTimeout(finishLoading, AUTH_BOOTSTRAP_TIMEOUT_MS)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      deferAuthSideEffect(async () => {
        try {
          setSession(nextSession)

          if (!nextSession?.user?.id) {
            setProfile(null)
            setVinculosSetor([])
            return
          }

          const { profile: fetchedProfile, vinculos } = await loadUserContext(nextSession.user.id)
          if (!alive) return
          setProfile(fetchedProfile)
          setVinculosSetor(vinculos)
        } catch (err) {
          console.error('Erro no processamento de autenticação:', err)
        } finally {
          finishLoading()
        }
      })
    })

    return () => {
      alive = false
      window.clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(matricula: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: `${matricula.trim()}${AUTH_DOMAIN}`,
      password,
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setVinculosSetor([])
    setLoading(false)
  }

  async function refreshProfile() {
    const { data: { session: current } } = await supabase.auth.getSession()
    if (!current?.user?.id) return
    const { profile: fetchedProfile, vinculos } = await loadUserContext(current.user.id)
    setProfile(fetchedProfile)
    setVinculosSetor(vinculos)
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }

  const value = useMemo(
    () => ({
      session,
      profile,
      vinculosSetor,
      isGestorSetor,
      loading,
      signIn,
      signOut,
      refreshProfile,
      updatePassword,
    }),
    [session, profile, vinculosSetor, isGestorSetor, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
