import { useEffect, useState, type ReactNode } from 'react'
import { ClipboardList, History, UserX, Users, ShieldAlert, Ban, Check } from 'lucide-react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { isStatusTerminal } from '../lib/solicitacaoRules'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { GestorRequestCard } from '../components/GestorRequestCard'
import { StatusPill } from '../components/StatusPill'
import { useToast } from '../components/Toast'
import { handleError } from '../lib/errors'
import type { StatusSolicitacao } from '../lib/types'
import * as solicitacoesService from '../services/solicitacoesService'
import * as setoresService from '../services/setoresService'

export function GestorPage() {
  const { profile, vinculosSetor } = useAuth()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<string>('pendentes')
  const [mesFiltro, setMesFiltro] = useState<string>(() => {
    const agora = new Date()
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  })
  const [statusFiltro, setStatusFiltro] = useState<StatusSolicitacao | ''>('')

  const [solicitacoes, setSolicitacoes] = useState<solicitacoesService.SolicitacaoListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [counts, setCounts] = useState<{ pendente: number; pedido_revogacao: number }>({ pendente: 0, pedido_revogacao: 0 })

  // Usuários tab — gestão de bloqueios
  const [usuariosSetorId, setUsuariosSetorId] = useState<string>('')
  const [usuariosMes, setUsuariosMes] = useState<string>(() => {
    const agora = new Date()
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  })
  const [membros, setMembros] = useState<setoresService.MembroSetor[]>([])
  const [isLoadingMembros, setIsLoadingMembros] = useState(false)
  const [acaoLoadingProfileId, setAcaoLoadingProfileId] = useState<string | null>(null)
  const [blockFormProfileId, setBlockFormProfileId] = useState<string | null>(null)
  const [blockFormMotivo, setBlockFormMotivo] = useState('')

  // Get gestor's active sectors
  const setoresGestor = vinculosSetor.filter(v => v.ativo && v.role_setor === 'GESTOR').map(v => v.setor)

  // Gera opções de meses (12 últimos meses, ordem crescente)
  const mesOptions = (() => {
    const options = [{ value: '', label: 'Todos os meses' }]
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      options.push({ value, label })
    }
    return options
  })()

  async function loadData() {
    if (!profile?.id) return
    setIsLoading(true)
    try {
      const response = await solicitacoesService.listarSolicitacoesComoGestor({
        status: statusFiltro || undefined,
        mes: mesFiltro || undefined,
      })
      // Ordena da mais nova para a mais antiga
      response.data.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
      setSolicitacoes(response.data)
      if (response.counts) {
        setCounts(response.counts)
      }
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'listar_solicitacoes_gestor' }))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.id) {
      void loadData()
    }
  }, [profile?.id, mesFiltro, statusFiltro])

  useEffect(() => {
    if (!profile?.id) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel('solicitacoes-gestor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          void loadData()
        }, 500)
      })
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [profile?.id])

  const listPendentes = solicitacoes.filter((s) => s.status === 'pendente')
  const listRevogacao = solicitacoes.filter((s) => s.status === 'pedido_revogacao')
  const listAguardando = solicitacoes.filter((s) => s.status === 'aguardando_cedente')
  const listAprovadas = solicitacoes.filter((s) => s.status === 'aprovado')
  const listHistorico = solicitacoes.filter((s) => isStatusTerminal(s.status))

  // Badges for Gestor tabs — uses backend counts when available, fallback to local filter
  const pendenteCount = !statusFiltro && !mesFiltro ? counts.pendente : listPendentes.length
  const revogacaoCount = !statusFiltro && !mesFiltro ? counts.pedido_revogacao : listRevogacao.length
  const totalPendentesAcao = pendenteCount + revogacaoCount
  const tabOptions: TabOption[] = [
    { id: 'pendentes', label: 'Homologação', icon: '📝', badge: totalPendentesAcao },
    { id: 'revogacao', label: 'Pedidos de Revogação', icon: '🔄', badge: revogacaoCount },
    { id: 'aguardando', label: 'Aguardando Cedente', icon: '⏳', badge: listAguardando.length },
    { id: 'aprovadas', label: 'Aprovadas', icon: '✅' },
    { id: 'historico', label: 'Histórico', icon: '📜' },
    { id: 'usuarios', label: 'Usuários', icon: '👥' },
  ]

  async function withLoading<T>(id: number, fn: () => Promise<T>) {
    setActionLoadingId(id)
    try {
      return await fn()
    } catch (err) {
      // O GestorRequestCard já mostra erro inline, mas garantimos toast + log também
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'gestor_acao' }))
      throw err // rethrow para o card mostrar o erro inline
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleHomologar(id: number, aprovar: boolean, replica?: string) {
    await withLoading(id, () => solicitacoesService.gestorResponder(id, aprovar, replica))
    void loadData()
  }

  async function handleResponderRevogacao(id: number, aceitar: boolean) {
    await withLoading(id, () => solicitacoesService.responderRevogacao(id, aceitar))
    void loadData()
  }

  async function handleRevogar(id: number, justificativa?: string) {
    await withLoading(id, () => solicitacoesService.revogarSolicitacao(id, justificativa))
    void loadData()
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateTimeStr
    }
  }

  const cardProps = {
    actionLoadingId,
    formatDate,
    formatDateTime,
    onHomologar: handleHomologar,
    onResponderRevogacao: handleResponderRevogacao,
    onRevogar: handleRevogar,
  }

  // ── Usuários tab — carregar membros ──
  async function loadMembros() {
    if (!usuariosSetorId) return
    setIsLoadingMembros(true)
    try {
      const data = await setoresService.listarColegasSetor(Number(usuariosSetorId))
      setMembros(data)
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'setores', action: 'listar_membros_setor' }))
    } finally {
      setIsLoadingMembros(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios' && usuariosSetorId) {
      void loadMembros()
    }
  }, [activeTab, usuariosSetorId, usuariosMes])

  // ── Bloquear / Desbloquear ──

  async function handleBloquearUsuario(profileId: string, motivo: string) {
    if (!usuariosSetorId) return
    setAcaoLoadingProfileId(profileId)
    try {
      await solicitacoesService.bloquearUsuarioMes({
        profile_id: profileId,
        setor_id: Number(usuariosSetorId),
        mes_referencia: usuariosMes,
        motivo: motivo || undefined,
      })
      toast.success('Usuário bloqueado para trocas neste mês.')
      setBlockFormProfileId(null)
      setBlockFormMotivo('')
      await loadMembros()
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'bloquear_usuario_mes' }))
    } finally {
      setAcaoLoadingProfileId(null)
    }
  }

  async function handleDesbloquearUsuario(profileId: string) {
    if (!usuariosSetorId) return
    setAcaoLoadingProfileId(profileId)
    try {
      await solicitacoesService.desbloquearUsuarioMes(profileId, Number(usuariosSetorId), usuariosMes)
      toast.success('Bloqueio removido com sucesso.')
      await loadMembros()
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'desbloquear_usuario_mes' }))
    } finally {
      setAcaoLoadingProfileId(null)
    }
  }



  // ── Render: Usuários (bloqueios) ──
  function renderUsuarios(): ReactNode {
    if (!usuariosSetorId) {
      return (
        <EmptyState
          title="Selecione um setor"
          description="Escolha um setor e mês para gerenciar os bloqueios de troca."
          icon="👥"
        />
      )
    }

    if (isLoadingMembros) {
      return <div className="center-screen">Carregando membros...</div>
    }

    if (membros.length === 0) {
      return (
        <EmptyState
          title="Nenhum membro encontrado"
          description="Este setor não possui membros ativos."
          icon="👥"
        />
      )
    }

    return (
      <table className="usuarios-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Matrícula</th>
            <th>Status</th>
            <th>Bloqueio</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {membros.filter(m => m.profile_id !== profile?.id).map((m) => {
            const loading = acaoLoadingProfileId === m.profile_id
            const isBlocked = m.bloqueado_mes && !!m.bloqueio
            const showForm = blockFormProfileId === m.profile_id

            return (
              <tr key={m.profile_id} className={isBlocked ? 'row-blocked' : ''}>
                <td data-label="Colaborador" className="usuario-name">{m.nome_completo}</td>
                <td data-label="Matrícula" className="usuario-matricula">{m.matricula}</td>
                <td data-label="Status">
                  {isBlocked ? (
                    <span className="blocked-badge" title="Bloqueado para trocas neste mês">
                      <Ban size={12} /> Bloqueado
                    </span>
                  ) : (
                    <span className="free-badge" title="Livre para trocas">
                      <Check size={12} /> Livre
                    </span>
                  )}
                </td>
                <td data-label="Bloqueio" className="usuario-bloqueio-info">
                  {isBlocked && m.bloqueio ? (
                    <span className="block-reason" title={`Motivo: ${m.bloqueio.motivo || 'Não informado'}`}>
                      {m.bloqueio.motivo || '—'}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td data-label="Ações" className="usuario-acoes">
                    {isBlocked ? (
                      <button
                        type="button"
                        className="ghost-button small-button"
                        onClick={() => handleDesbloquearUsuario(m.profile_id)}
                        disabled={loading}
                      >
                        {loading ? '...' : <><UserX size={14} /> Desbloquear</>}
                      </button>
                    ) : showForm ? (
                      <div className="block-inline-form">
                        <input
                          type="text"
                          value={blockFormMotivo}
                          onChange={(e) => setBlockFormMotivo(e.target.value)}
                          placeholder="Motivo (opcional)"
                          className="block-motivo-input"
                          disabled={loading}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="success-button small-button"
                          onClick={() => handleBloquearUsuario(m.profile_id, blockFormMotivo)}
                          disabled={loading}
                        >
                          {loading ? '...' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button small-button"
                          onClick={() => { setBlockFormProfileId(null); setBlockFormMotivo('') }}
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="ghost-button small-button"
                        onClick={() => setBlockFormProfileId(m.profile_id)}
                      >
                        <ShieldAlert size={14} /> Bloquear
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
    )
  }

  function renderList(
    items: solicitacoesService.SolicitacaoListItem[],
    empty: { title: string; description: string; icon: string },
    options?: { historico?: boolean },
  ) {
    if (items.length === 0) {
      return <EmptyState title={empty.title} description={empty.description} icon={empty.icon} />
    }

    if (options?.historico) {
      return (
        <div className="request-list">
          {items.map((item) => (
            <article className="request-card gestor-card-item" key={item.id}>
              <div className="request-head">
                <div>
                  <h4 className="gestor-card-title">Troca #{item.id}</h4>
                  <span className="request-date gestor-card-date">
                    Finalizada em:{' '}
                    {item.respondido_em ? formatDateTime(item.respondido_em) : '—'}
                  </span>
                </div>
                <StatusPill status={item.status} />
              </div>
              <div className="request-details">
                <div>
                  <span>🔴 Requisitante</span>
                  <strong>
                    {item.requisitante.nome_completo} ({item.requisitante.matricula})
                  </strong>
                </div>
                <div>
                  <span>🟢 Cedente</span>
                  <strong>
                    {item.cedente.nome_completo} ({item.cedente.matricula})
                  </strong>
                </div>
              </div>
              {item.funcao && (
                <p className="request-obs">
                  <strong>Função:</strong> {item.funcao}
                </p>
              )}
              {item.justificativa_revogacao && (
                <p className="request-obs gestor-obs-warning">
                  <strong>Revogação:</strong> {item.justificativa_revogacao}
                </p>
              )}
            </article>
          ))}
        </div>
      )
    }

    return (
      <div className="request-list">
        {items.map((item) => (
          <GestorRequestCard key={item.id} item={item} {...cardProps} />
        ))}
      </div>
    )
  }

  let tabContent: ReactNode = null

  if (isLoading) {
    tabContent = (
      <div className="center-screen gestor-loading">
        Carregando solicitações...
      </div>
    )
  } else if (activeTab === 'pendentes') {
    tabContent = renderList(listPendentes, {
      title: 'Nenhuma troca pendente',
      description: 'Propostas aceitas pelo cedente aparecerão aqui para homologação.',
      icon: '📝',
    })
  } else if (activeTab === 'revogacao') {
    tabContent = renderList(listRevogacao, {
      title: 'Nenhum pedido de revogação',
      description: 'Quando requisitante ou cedente solicitarem revogação, aparecerá nesta aba.',
      icon: '🔄',
    })
  } else if (activeTab === 'aguardando') {
    tabContent =
      listAguardando.length === 0 ? (
        <EmptyState
          title="Nenhuma troca aguardando cedente"
          description="Propostas aguardando aceite do colega cedente."
          icon="⏳"
        />
      ) : (
        <div className="request-list">
          {listAguardando.map((item) => (
            <div key={item.id}>
              <GestorRequestCard item={item} {...cardProps} />
              <div className="info-box gestor-info-cedente">
                Aguardando confirmação de <strong>{item.cedente.nome_completo}</strong>.
              </div>
            </div>
          ))}
        </div>
      )
  } else if (activeTab === 'aprovadas') {
    tabContent = renderList(listAprovadas, {
      title: 'Nenhuma troca aprovada ativa',
      description: 'Trocas homologadas que ainda podem ser revogadas.',
      icon: '✅',
    })
  } else if (activeTab === 'usuarios') {
    tabContent = (
      <div className="usuarios-tab-content">
        <div className="usuarios-filters">
          <div className="filter-group">
            <label htmlFor="usuarios-setor">
              Setor
            </label>
            <select
              id="usuarios-setor"
              value={usuariosSetorId}
              onChange={(e) => {
                setUsuariosSetorId(e.target.value)
                setMembros([])
                setBlockFormProfileId(null)
              }}
              className="filter-select"
            >
              <option value="">Selecione um setor</option>
              {setoresGestor.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="usuarios-mes">
              Mês
            </label>
            <input
              id="usuarios-mes"
              type="month"
              value={usuariosMes}
              onChange={(e) => setUsuariosMes(e.target.value)}
              className="filter-select"
            />
          </div>
        </div>
        {renderUsuarios()}
      </div>
    )
  } else {
    tabContent = renderList(
      listHistorico,
      {
        title: 'Histórico limpo',
        description: 'Recusas, cancelamentos e revogações concluídas.',
        icon: '📜',
      },
      { historico: true },
    )
  }

  return (
    <Layout title="Portal de Gestão & Homologação">
      <div className="grid">
        <section className="panel gestor-main-section">
          <h2 className="gestor-section-title">
            {activeTab === 'usuarios' ? <Users size={22} /> : <ClipboardList size={22} />}
            {activeTab === 'usuarios' ? 'Usuários e Bloqueios' : 'Homologação de Trocas'}
          </h2>
          <p className="gestor-section-desc">
            {activeTab === 'usuarios'
              ? 'Visualize e gerencie bloqueios de troca dos membros do setor.'
              : 'Homologue trocas, responda pedidos de revogação ou revogue solicitações ativas do setor.'}
          </p>

          <Tabs options={tabOptions} activeTab={activeTab} onChange={setActiveTab} />

          {/* Filtros condicionais */}
          {activeTab !== 'usuarios' && (
            <div className="gestor-filters">
              <div className="filter-group">
                <label htmlFor="mes-filtro">
                  Mês
                </label>
                <select
                  id="mes-filtro"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="filter-select"
                >
                  {mesOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="status-filtro">
                  Status
                </label>
                <select
                  id="status-filtro"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as StatusSolicitacao | '')}
                  className="filter-select"
                >
                  <option value="">Todos os status</option>
                  <option value="aguardando_cedente">Aguardando Cedente</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="recusado_cedente">Recusado pelo Cedente</option>
                  <option value="recusado_gestor">Recusado pelo Gestor</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="pedido_revogacao">Pedido de Revogação</option>
                  <option value="revogado">Revogado</option>
                </select>
              </div>
            </div>
          )}

          <div className="gestor-tab-content">
            {tabContent}
          </div>
        </section>
      </div>

      <div className="gestor-audit-bar">
        <History size={18} />
        <div>
          <strong>Auditoria de Escala</strong> — Cancelamentos e revogações ficam registrados com carimbo de data/hora. Atualizações em tempo real. Pedidos de revogação exigem sua decisão na aba dedicada.
        </div>
      </div>
    </Layout>
  )
}
