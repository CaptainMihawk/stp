import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, AUTH_DOMAIN } from '../lib/supabase'
import type { Profile, VinculoSetor } from '../lib/types'
import { listarMeusDados } from '../services/solicitacoesService'

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  vinculosSetor: VinculoSetor[]
  isGestorSetor: boolean
  loading: boolean
  signIn: (matricula: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000

async function loadUserContext(userId: string) {
  try {
    const data = await listarMeusDados()
    return { profile: data.profile, vinculos: data.vinculos }
  } catch (err) {
    console.error('Erro ao carregar dados do usuário via Edge Function:', err)
    return { profile: null, vinculos: [] }
  }
}

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
