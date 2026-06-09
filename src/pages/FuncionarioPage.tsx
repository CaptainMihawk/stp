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
import { useToast } from '../components/Toast'
import { handleError } from '../lib/errors'
import { verificarBloqueioCriarSolicitacao } from '../lib/solicitacaoRules'
import * as solicitacoesService from '../services/solicitacoesService'
import * as setoresService from '../services/setoresService'
import { FileText, ArrowLeftRight, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

type PlantaoInput = {
  data: string
  turno: Turno | ''
}

export function FuncionarioPage() {
  const { profile, bloqueios } = useAuth()
  const toast = useToast()
  
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

  // Monthly limit
  const [contagemMes, setContagemMes] = useState<solicitacoesService.ContagemMes | null>(null)

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
      toast.error(handleError(err, { endpoint: 'setores', action: 'listar_setores' }))
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
      toast.error(handleError(err, { endpoint: 'setores', action: 'listar_membros_setor' }))
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
      const [minhasRes, recebidasRes] = await Promise.all([
        solicitacoesService.listarSolicitacoes('minhas'),
        solicitacoesService.listarSolicitacoes('cedente'),
      ])
      // Ordena da mais nova para a mais antiga
      const sortByDate = (a: solicitacoesService.SolicitacaoListItem, b: solicitacoesService.SolicitacaoListItem) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      setSolicitacoesMinhas(minhasRes.data.sort(sortByDate))
      setSolicitacoesRecebidas(recebidasRes.data.sort(sortByDate))
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'listar_solicitacoes' }))
    } finally {
      setIsLoadingList(false)
    }
  }

  // Load monthly usage count
  async function loadContagemMes() {
    try {
      const data = await solicitacoesService.contarSolicitacoesMes()
      setContagemMes(data)
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'contar_solicitacoes_mes' }))
      setContagemMes(null)
    }
  }

  // Fetch initial data
  useEffect(() => {
    if (profile?.id) {
      void loadSectors()
      void loadSolicitacoes()
      void loadContagemMes()
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

  // Realtime subscription — com debounce para evitar chamadas duplicadas
  useEffect(() => {
    if (!profile?.id) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel('solicitacoes-funcionario-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          void loadSolicitacoes()
          void loadContagemMes()
        }, 500)
      })
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [profile?.id])

  // Create solicitation
  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSetorId || !selectedCedenteId) {
      toast.warning('Selecione o setor e o colega com quem quer trocar.')
      return
    }

    if (!meuPlantao.data || !meuPlantao.turno || !plantaoDestino.data || !plantaoDestino.turno) {
      toast.warning('Preencha as datas e turnos de ambos os plantões.')
      return
    }

    if (meuPlantao.data === plantaoDestino.data && meuPlantao.turno === plantaoDestino.turno) {
      toast.warning('Não pode trocar o mesmo plantão (mesma data e mesmo turno) com um colega.')
      return
    }

    // Verificar bloqueios para o mês da solicitação (usando o mês do plantão do requisitante)
    const mesReferencia = meuPlantao.data.substring(0, 7) // YYYY-MM
    const cedenteSelecionado = membrosSetor.find(m => m.profile_id === selectedCedenteId)
    const cedenteBloqueadoMes = cedenteSelecionado?.bloqueado_mes ?? false
    
    const erroBloqueio = verificarBloqueioCriarSolicitacao(bloqueios, cedenteBloqueadoMes, mesReferencia)
    if (erroBloqueio) {
      toast.error(erroBloqueio)
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
      
      toast.success('Solicitação de troca enviada com sucesso!')
      void loadSolicitacoes()
      void loadContagemMes()
    } catch (err) {
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'criar_solicitacao' }))
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
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'cedente_responder' }))
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
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'cedente_responder' }))
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
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'cancelar_solicitacao' }))
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
      toast.error(handleError(err, { endpoint: 'solicitacoes', action: 'solicitar_revogacao' }))
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
        <section className="panel funcionario-form-section">
          <h2 className="funcionario-section-title">
            <ArrowLeftRight size={20} />
            Propor Nova Troca
          </h2>
          <p className="funcionario-section-desc">
            Preencha os dados e escolha um colega do mesmo setor.
          </p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="funcionario-selectores-row">
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

            {/* Warning if selected cedente is blocked for current month */}
            {selectedCedenteId && (() => {
              const cedente = membrosSetor.find(m => m.profile_id === selectedCedenteId)
              if (cedente?.bloqueado_mes) {
                return (
                  <div className="blocked-warning" key={cedente.profile_id}>
                    <AlertCircle size={16} />
                    <span>Este colega está bloqueado para trocas neste mês.</span>
                  </div>
                )
              }
              return null
            })()}

            {/* Requisitante Shift block */}
            <div className="plantao-block full-width">
              <TurnoSelect
                label="Seu Plantão (que você vai CEDER)"
                dateValue={meuPlantao.data}
                turnoValue={meuPlantao.turno}
                onDateChange={(data) => setMeuPlantao(prev => ({ ...prev, data }))}
                onTurnoChange={handleMeuTurnonChange}
              />
            </div>

            {/* Cedente Shift block with compatibility constraints */}
            <div className="plantao-block full-width">
              <TurnoSelect
                label="Plantão do Colega (que você quer RECEBER)"
                dateValue={plantaoDestino.data}
                turnoValue={plantaoDestino.turno}
                onDateChange={(data) => setPlantaoDestino(prev => ({ ...prev, data }))}
                onTurnoChange={(turno) => setPlantaoDestino(prev => ({ ...prev, turno }))}
                compatibleWith={meuPlantao.turno}
              />
            </div>

            <label className="full-width funcionario-obs-label">
              Observação (opcional)
              <textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Motivo pessoal, necessidade de ajuste de horário..."
              />
            </label>

            {/* Monthly limit indicator */}
            {contagemMes && (
              <div className={`info-box limite-mes ${contagemMes.utilizadas >= contagemMes.limite ? 'limite-atingido' : ''}`}>
                📊 Trocas neste mês: <strong>{contagemMes.utilizadas}</strong> de <strong>{contagemMes.limite}</strong>
                {contagemMes.utilizadas >= contagemMes.limite
                  ? ' — Limite atingido!'
                  : ` — ${contagemMes.limite - contagemMes.utilizadas} restante(s)`}
              </div>
            )}

            <button className="primary-button full-width" disabled={isSubmiting || (contagemMes !== null && contagemMes.utilizadas >= contagemMes.limite)}>
              {isSubmiting
                ? 'Enviando...'
                : contagemMes !== null && contagemMes.utilizadas >= contagemMes.limite
                  ? 'Limite mensal atingido'
                  : 'Enviar Proposta'}
            </button>
          </form>
        </section>

        {/* Right Side: Solicitations list (with tabs) */}
        <section className="panel funcionario-list-section">
          <div className="funcionario-list-header">
            <h2 className="funcionario-section-title">
              <FileText size={22} />
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

          <div className="funcionario-list-body">
            {isLoadingList ? (
              <div className="center-screen">Carregando solicitações...</div>
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