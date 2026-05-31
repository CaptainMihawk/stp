import { useEffect, useState, type ReactNode } from 'react'
import { ClipboardList, History, Clock } from 'lucide-react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { isStatusTerminal } from '../lib/solicitacaoRules'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { GestorRequestCard } from '../components/GestorRequestCard'
import { StatusPill } from '../components/StatusPill'
import * as solicitacoesService from '../services/solicitacoesService'

export function GestorPage() {
  const { profile } = useAuth()

  const [activeTab, setActiveTab] = useState<string>('pendentes')

  const [solicitacoes, setSolicitacoes] = useState<solicitacoesService.SolicitacaoListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  async function loadData() {
    if (!profile?.id) return
    setIsLoading(true)
    try {
      const data = await solicitacoesService.listarSolicitacoesComoGestor(profile.id)
      // Ordena da mais nova para a mais antiga
      data.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
      setSolicitacoes(data)
    } catch (err) {
      console.error('Erro ao buscar solicitações para o gestor:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.id) {
      void loadData()
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel('solicitacoes-gestor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        void loadData()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.id])

  const listPendentes = solicitacoes.filter((s) => s.status === 'pendente')
  const listRevogacao = solicitacoes.filter((s) => s.status === 'pedido_revogacao')
  const listAguardando = solicitacoes.filter((s) => s.status === 'aguardando_cedente')
  const listAprovadas = solicitacoes.filter((s) => s.status === 'aprovado')
  const listHistorico = solicitacoes.filter((s) => isStatusTerminal(s.status))

  // Badges for Gestor tabs — homologação mostra total que precisa de ação
  const totalPendentesAcao = listPendentes.length + listRevogacao.length
  const tabOptions: TabOption[] = [
    { id: 'pendentes', label: 'Homologação', icon: '📝', badge: totalPendentesAcao },
    { id: 'revogacao', label: 'Pedidos de Revogação', icon: '🔄', badge: listRevogacao.length },
    { id: 'aguardando', label: 'Aguardando Cedente', icon: '⏳', badge: listAguardando.length },
    { id: 'aprovadas', label: 'Aprovadas', icon: '✅' },
    { id: 'historico', label: 'Histórico', icon: '📜' },
  ]

  async function withLoading<T>(id: number, fn: () => Promise<T>) {
    setActionLoadingId(id)
    try {
      return await fn()
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
      <div className="grid two-columns">
        <section className="panel gestor-main-section">
          <h2 className="gestor-section-title">
            <ClipboardList size={22} />
            Homologação de Trocas
          </h2>
          <p className="gestor-section-desc">
            Homologue trocas, responda pedidos de revogação ou revogue solicitações ativas do setor.
          </p>

          <Tabs options={tabOptions} activeTab={activeTab} onChange={setActiveTab} />

          <div className="gestor-tab-content">
            {tabContent}
          </div>
        </section>

        <section className="panel gestor-audit-section">
          <div>
            <h2 className="gestor-section-title">
              <History size={20} />
              Auditoria de Escala
            </h2>
            <p className="gestor-section-desc">
              Cancelamentos e revogações também ficam registrados com carimbo de data/hora.
            </p>
            <div className="info-box gestor-audit-box">
              <Clock size={28} />
              <div>
                Atualizações em tempo real. Pedidos de revogação exigem sua decisão na aba dedicada.
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
