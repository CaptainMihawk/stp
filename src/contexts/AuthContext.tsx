import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, VinculoSetor, BloqueioTrocaMes, Setor } from '../lib/types'
import { listarMeusDados } from '../services/solicitacoesService'
import { logAppError } from '../lib/errors'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  vinculosSetor: (VinculoSetor & { setor: Setor })[]
  bloqueios: BloqueioTrocaMes[]
  isGestorSetor: boolean
  loading: boolean
  signIn: (matricula: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000

async function loadUserContext() {
  try {
    const data = await listarMeusDados()
    return { profile: data.profile, vinculos: data.vinculos, bloqueios: data.bloqueios ?? [] }
  } catch (err) {
    logAppError(err, { endpoint: 'solicitacoes', action: 'listar_meus_dados' })
    return { profile: null, vinculos: [], bloqueios: [] }
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
  const [vinculosSetor, setVinculosSetor] = useState<(VinculoSetor & { setor: Setor })[]>([])
  const [bloqueios, setBloqueios] = useState<BloqueioTrocaMes[]>([])
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
            setBloqueios([])
            return
          }

          const { profile: fetchedProfile, vinculos, bloqueios: fetchedBloqueios } = await loadUserContext()
          if (!alive) return
          setProfile(fetchedProfile)
          setVinculosSetor(vinculos)
          setBloqueios(fetchedBloqueios)
        } catch (err) {
          logAppError(err, { endpoint: 'auth', action: 'onAuthStateChange' })
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
    try {
      const url = `${SUPABASE_URL}/functions/v1/login?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula: matricula.trim(), password }),
      })

      const data: unknown = await res.json()
      const json = data as { access_token?: string; refresh_token?: string; error?: string; code?: string }

      if (!res.ok) {
        if (json.code === 'USER_INACTIVE') return { error: 'Usuário inativo. Procure o administrador.' }
        if (json.code === 'TOO_MANY_REQUESTS') return { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
        return { error: 'Matrícula ou senha inválidas.' }
      }

      if (!json.access_token) {
        return { error: 'Resposta inválida do servidor.' }
      }

      await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token ?? '',
      })

      return { error: null }
    } catch {
      return { error: 'Erro de conexão. Verifique sua internet.' }
    }
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
    const { profile: fetchedProfile, vinculos, bloqueios: fetchedBloqueios } = await loadUserContext()
    setProfile(fetchedProfile)
    setVinculosSetor(vinculos)
    setBloqueios(fetchedBloqueios)
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
      bloqueios,
      isGestorSetor,
      loading,
      signIn,
      signOut,
      refreshProfile,
      updatePassword,
    }),
    [session, profile, vinculosSetor, bloqueios, isGestorSetor, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
