import { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Turno } from '../lib/types'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { RequestCard } from '../components/RequestCard'
import { SearchableSelect } from '../components/SearchableSelect'
import { TurnoSelect } from '../components/TurnoSelect'
import * as solicitacoesService from '../services/solicitacoesService'
import * as setoresService from '../services/setoresService'
import { FileText, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'

type PlantaoInput = {
  data: string
  turno: Turno | ''
}

export function FuncionarioPage() {
  const { profile } = useAuth()
  
  // Tabs config
  const [activeTab, setActiveTab] = useState<string>('minhas')

  // UI state
  const [meusSetores, setMeusSetores] = useState<setoresService.SetorListItem[]>([])
  const [membrosSetor, setMembrosSetor] = useState<setoresService.MembroSetor[]>([])
  const [solicitacoesMinhas, setSolicitacoesMinhas] = useState<solicitacoesService.SolicitacaoListItem[]>([])
  const [solicitacoesRecebidas, setSolicitacoesRecebidas] = useState<solicitacoesService.SolicitacaoListItem[]>([])

  // Loading states
  const [isLoadingSectores, setIsLoadingSectores] = useState(false)
  const [isLoadingMembros, setIsLoadingMembros] = useState(false)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isSubmiting, setIsSubmiting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  
  // Feedback alerts
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Month filter — default to current month (June 2026)
  const now = new Date()
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth()) // 0-indexed

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  function goToPrevMonth() {
    if (filterMonth === 0) {
      setFilterYear(y => y - 1)
      setFilterMonth(11)
    } else {
      setFilterMonth(m => m - 1)
    }
  }

  function goToNextMonth() {
    if (filterMonth === 11) {
      setFilterYear(y => y + 1)
      setFilterMonth(0)
    } else {
      setFilterMonth(m => m + 1)
    }
  }

  const isNextMonthFuture =
    filterYear > now.getFullYear() ||
    (filterYear === now.getFullYear() && filterMonth > now.getMonth() + 1)

  // Also block going before January 2026 (app start)
  const isPrevMonthPast =
    filterYear < 2026 || (filterYear === 2026 && filterMonth < 0)

  // Filter solicitations by selected month (based on criado_em)
  function filterByMonth(items: solicitacoesService.SolicitacaoListItem[]) {
    return items.filter((item) => {
      const d = new Date(item.criado_em)
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth
    })
  }

  const filteredMinhas = useMemo(() => filterByMonth(solicitacoesMinhas), [solicitacoesMinhas, filterYear, filterMonth])
  const filteredRecebidas = useMemo(() => filterByMonth(solicitacoesRecebidas), [solicitacoesRecebidas, filterYear, filterMonth])

  // Badge de notificação para solicitações recebidas não respondidas
  const solicitacoesPendentes = useMemo(
    () => solicitacoesRecebidas.filter((s) => s.status === 'aguardando_cedente').length,
    [solicitacoesRecebidas],
  )
  const tabOptions: TabOption[] = [
    { id: 'minhas', label: 'Minhas Solicitações', icon: '📤' },
    { id: 'recebidas', label: 'Solicitações Recebidas', icon: '📥', badge: solicitacoesPendentes },
  ]

  // Form State
  const [selectedSetorId, setSelectedSetorId] = useState<string>('')
  const [selectedCedenteId, setSelectedCedenteId] = useState<string>('')
  const [meuPlantao, setMeuPlantao] = useState<PlantaoInput>({ data: '', turno: '' })
  const [plantaoDestino, setPlantaoDestino] = useState<PlantaoInput>({ data: '', turno: '' })
  const [observacao, setObservacao] = useState('')

  // Load user active sectors
  async function loadSectors() {
    if (!profile?.id) return
    setIsLoadingSectores(true)
    try {
      const data = await setoresService.listarSetores()
      setMeusSetores(data)
      if (data.length > 0) {
        setSelectedSetorId(String(data[0].id))
      }
    } catch (err) {
      console.error('Erro ao listar setores do funcionário:', err)
    } finally {
      setIsLoadingSectores(false)
    }
  }

  // Load colleagues in selected sector
  async function loadMembros(setorId: number) {
    setIsLoadingMembros(true)
    try {
      const data = await setoresService.listarColegasSetor(setorId)
      // Filtra o próprio usuário da lista (edge function retorna todos)
      setMembrosSetor(data.filter((m) => m.profile_id !== profile?.id))
      setSelectedCedenteId('')
    } catch (err) {
      console.error('Erro ao listar membros do setor:', err)
      setMembrosSetor([])
    } finally {
      setIsLoadingMembros(false)
    }
  }

  // Load solicitations lists based on user context
  async function loadSolicitacoes() {
    if (!profile?.id) return
    setIsLoadingList(true)
    try {
      const [minhas, recebidas] = await Promise.all([
        solicitacoesService.listarSolicitacoes('minhas'),
        solicitacoesService.listarSolicitacoes('cedente'),
      ])
      // Ordena da mais nova para a mais antiga
      const sortByDate = (a: solicitacoesService.SolicitacaoListItem, b: solicitacoesService.SolicitacaoListItem) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      setSolicitacoesMinhas(minhas.sort(sortByDate))
      setSolicitacoesRecebidas(recebidas.sort(sortByDate))
    } catch (err) {
      console.error('Erro ao listar solicitações:', err)
    } finally {
      setIsLoadingList(false)
    }
  }

  // Fetch initial data
  useEffect(() => {
    if (profile?.id) {
      void loadSectors()
      void loadSolicitacoes()
    }
  }, [profile?.id])

  // Load colleagues when selected sector changes
  useEffect(() => {
    if (selectedSetorId) {
      void loadMembros(Number(selectedSetorId))
    } else {
      setMembrosSetor([])
    }
  }, [selectedSetorId])

  // Realtime subscription (using "ping" to refresh lists securely)
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel('solicitacoes-funcionario-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        void loadSolicitacoes()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.id])

  // Create solicitation
  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!selectedSetorId || !selectedCedenteId) {
      setFormError('Selecione o setor e o colega com quem quer trocar.')
      return
    }

    if (!meuPlantao.data || !meuPlantao.turno || !plantaoDestino.data || !plantaoDestino.turno) {
      setFormError('Preencha as datas e turnos de ambos os plantões.')
      return
    }

    if (meuPlantao.data === plantaoDestino.data && meuPlantao.turno === plantaoDestino.turno) {
      setFormError('Não pode trocar o mesmo plantão (mesma data e mesmo turno) com um colega.')
      return
    }

    setIsSubmiting(true)
    try {
      await solicitacoesService.criarSolicitacao({
        cedente_id: selectedCedenteId,
        setor_id: Number(selectedSetorId),
        data_requisitante: meuPlantao.data,
        turno_requisitante: meuPlantao.turno as Turno,
        data_cedente: plantaoDestino.data,
        turno_cedente: plantaoDestino.turno as Turno,
        observacao: observacao.trim() || undefined,
      })

      // Reset form
      setMeuPlantao({ data: '', turno: '' })
      setPlantaoDestino({ data: '', turno: '' })
      setObservacao('')
      setSelectedCedenteId('')
      
      setFormSuccess('Solicitação de troca enviada com sucesso!')
      void loadSolicitacoes()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar solicitação de troca.')
    } finally {
      setIsSubmiting(false)
    }
  }

  // Handle Cedente Accept proposal
  async function handleAcceptSolicitacao(id: number) {
    setActionLoadingId(id)
    try {
      await solicitacoesService.cedenteResponder(id, true)
      void loadSolicitacoes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao aceitar a solicitação.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Cedente Reject proposal
  async function handleRejectSolicitacao(id: number) {
    setActionLoadingId(id)
    try {
      await solicitacoesService.cedenteResponder(id, false)
      void loadSolicitacoes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao recusar a solicitação.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleCancelSolicitacao(id: number) {
    setActionLoadingId(id)
    try {
      await solicitacoesService.cancelarSolicitacao(id)
      void loadSolicitacoes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cancelar a solicitação.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleSolicitarRevogacao(id: number, justificativa: string) {
    setActionLoadingId(id)
    try {
      await solicitacoesService.solicitarRevogacao(id, justificativa)
      void loadSolicitacoes()
    } catch (err) {
      throw err
    } finally {
      setActionLoadingId(null)
    }
  }

  // Watch for first turn selection and automatically enforce compatibility
  const handleMeuTurnonChange = (turno: Turno | '') => {
    setMeuPlantao(prev => ({ ...prev, turno }))
    // Clear compatible target turn if it becomes incompatible
    setPlantaoDestino(prev => ({ ...prev, turno: '' }))
  }

  return (
    <Layout title="Portal do Funcionário">
      <div className="grid two-columns">
        {/* Left Side: Create Exchange Form */}
        <section className="panel" style={{ height: 'fit-content' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '1.1rem' }}>
            <ArrowLeftRight size={20} style={{ color: 'var(--primary)' }} />
            Propor Nova Troca
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
            Preencha os dados e escolha um colega do mesmo setor.
          </p>

          <form className="form-grid" onSubmit={handleSubmit} style={{ gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <SearchableSelect
                label="Seu Setor Ativo"
                value={selectedSetorId}
                onChange={setSelectedSetorId}
                options={meusSetores.map((s) => ({
                  value: String(s.id),
                  label: s.nome,
                }))}
                placeholder={isLoadingSectores ? 'Carregando setores...' : 'Selecione o setor'}
                disabled={isLoadingSectores || meusSetores.length === 0}
                emptyMessage="Sem setores vinculados"
              />

              <SearchableSelect
                label="Com quem quer trocar?"
                value={selectedCedenteId}
                onChange={setSelectedCedenteId}
                options={membrosSetor.map((m) => ({
                  value: m.profile_id,
                  label: m.nome_completo,
                  hint: m.matricula,
                  searchText: `${m.nome_completo} ${m.matricula} ${m.matricula}`,
                }))}
                placeholder={isLoadingMembros || !selectedSetorId ? 'Selecione um setor primeiro' : 'Buscar colega...'}
                disabled={isLoadingMembros || !selectedSetorId || membrosSetor.length === 0}
                searchPlaceholder="Buscar por nome ou matrícula..."
                noResultsMessage="Nenhum colega encontrado para esta busca"
              />
            </div>

            {/* Requisitante Shift block */}
            <div className="plantao-block full-width" style={{ padding: '12px' }}>
              <TurnoSelect
                label="Seu Plantão (que você vai CEDER)"
                dateValue={meuPlantao.data}
                turnoValue={meuPlantao.turno}
                onDateChange={(data) => setMeuPlantao(prev => ({ ...prev, data }))}
                onTurnoChange={handleMeuTurnonChange}
              />
            </div>

            {/* Cedente Shift block with compatibility constraints */}
            <div className="plantao-block full-width" style={{ padding: '12px' }}>
              <TurnoSelect
                label="Plantão do Colega (que você quer RECEBER)"
                dateValue={plantaoDestino.data}
                turnoValue={plantaoDestino.turno}
                onDateChange={(data) => setPlantaoDestino(prev => ({ ...prev, data }))}
                onTurnoChange={(turno) => setPlantaoDestino(prev => ({ ...prev, turno }))}
                compatibleWith={meuPlantao.turno}
              />
            </div>

            <label className="full-width" style={{ fontSize: '0.85rem' }}>
              Observação (opcional)
              <textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Motivo pessoal, necessidade de ajuste de horário..."
              />
            </label>

            {formError && <div className="error-box" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>{formError}</div>}
            {formSuccess && <div className="info-box" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>{formSuccess}</div>}

            <button className="primary-button full-width" disabled={isSubmiting} style={{ padding: '10px' }}>
              {isSubmiting ? 'Enviando...' : 'Enviar Proposta'}
            </button>
          </form>
        </section>

        {/* Right Side: Solicitations list (with tabs) */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={22} style={{ color: 'var(--primary)' }} />
              Fluxo de Trocas
            </h2>
            <div className="month-navigator">
              <button type="button" className="month-nav-btn" onClick={goToPrevMonth} disabled={isPrevMonthPast} title="Mês anterior">
                <ChevronLeft size={16} />
              </button>
              <span className="month-label">{monthNames[filterMonth]} {filterYear}</span>
              <button
                type="button"
                className="month-nav-btn"
                onClick={goToNextMonth}
                disabled={isNextMonthFuture}
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <Tabs
            options={tabOptions}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
            {isLoadingList ? (
              <div className="center-screen" style={{ minHeight: '100px' }}>Carregando solicitações...</div>
            ) : activeTab === 'minhas' ? (
              filteredMinhas.length === 0 ? (
                <EmptyState
                  title="Nenhuma proposta neste mês"
                  description="Nenhuma solicitação encontrada para o período selecionado."
                  icon="📤"
                />
              ) : (
                <div className="request-list">
                  {filteredMinhas.map((item) => (
                    <RequestCard
                      key={item.id}
                      item={item}
                      currentUserId={profile?.id ?? ''}
                      onCancel={handleCancelSolicitacao}
                      onRequestRevogation={handleSolicitarRevogacao}
                      isActionLoading={actionLoadingId === item.id}
                    />
                  ))}
                </div>
              )
            ) : filteredRecebidas.length === 0 ? (
              <EmptyState
                title="Nenhuma proposta recebida neste mês"
                description="Nenhuma solicitação recebida encontrada para o período selecionado."
                icon="📥"
              />
            ) : (
              <div className="request-list">
                {filteredRecebidas.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    currentUserId={profile?.id ?? ''}
                    onAccept={handleAcceptSolicitacao}
                    onReject={handleRejectSolicitacao}
                    onRequestRevogation={handleSolicitarRevogacao}
                    isActionLoading={actionLoadingId === item.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}