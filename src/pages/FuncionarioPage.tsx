import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Turno } from '../lib/types'
import { PasswordPanel } from './PasswordPanel'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { RequestCard } from '../components/RequestCard'
import { TurnoSelect } from '../components/TurnoSelect'
import * as solicitacoesService from '../services/solicitacoesService'
import * as setoresService from '../services/setoresService'
import { FileText, ArrowLeftRight } from 'lucide-react'

type PlantaoInput = {
  data: string
  turno: Turno | ''
}

export function FuncionarioPage() {
  const { profile } = useAuth()
  
  // Tabs config
  const tabOptions: TabOption[] = [
    { id: 'minhas', label: 'Minhas Solicitações', icon: '📤' },
    { id: 'recebidas', label: 'Solicitações Recebidas', icon: '📥' },
  ]
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
      const data = await setoresService.listarColegasSetor(setorId, profile?.id ?? '')
      setMembrosSetor(data)
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
      setSolicitacoesMinhas(minhas)
      setSolicitacoesRecebidas(recebidas)
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
        <section className="panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ArrowLeftRight size={22} style={{ color: 'var(--primary)' }} />
            Propor Nova Troca
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Preencha os dados e escolha um colega do mesmo setor. O gestor homologará a troca automaticamente após o aceite do colega.
          </p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label>
                Seu Setor Ativo
                <select
                  required
                  value={selectedSetorId}
                  onChange={(e) => setSelectedSetorId(e.target.value)}
                  disabled={isLoadingSectores}
                >
                  {isLoadingSectores ? (
                    <option>Carregando setores...</option>
                  ) : meusSetores.length === 0 ? (
                    <option value="">Sem setores vinculados</option>
                  ) : (
                    meusSetores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label>
                Com quem quer trocar?
                <select
                  required
                  value={selectedCedenteId}
                  onChange={(e) => setSelectedCedenteId(e.target.value)}
                  disabled={isLoadingMembros || !selectedSetorId}
                >
                  <option value="">Selecione o colega</option>
                  {membrosSetor.map((m) => (
                    <option key={m.profile_id} value={m.profile_id}>
                      {m.nome_completo} ({m.matricula})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Requisitante Shift block */}
            <div className="plantao-block full-width">
              <TurnoSelect
                label="Seu Plantão (Que você vai CEDER)"
                dateValue={meuPlantao.data}
                turnoValue={meuPlantao.turno}
                onDateChange={(data) => setMeuPlantao(prev => ({ ...prev, data }))}
                onTurnoChange={handleMeuTurnonChange}
              />
            </div>

            {/* Cedente Shift block with compatibility constraints */}
            <div className="plantao-block full-width">
              <TurnoSelect
                label="Plantão do Colega (Que você quer RECEBER)"
                dateValue={plantaoDestino.data}
                turnoValue={plantaoDestino.turno}
                onDateChange={(data) => setPlantaoDestino(prev => ({ ...prev, data }))}
                onTurnoChange={(turno) => setPlantaoDestino(prev => ({ ...prev, turno }))}
                compatibleWith={meuPlantao.turno}
              />
            </div>

            <label className="full-width">
              Observação (Opcional)
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Motivo pessoal, necessidade de ajuste de horário..."
              />
            </label>

            {formError && <div className="error-box">{formError}</div>}
            {formSuccess && <div className="info-box">{formSuccess}</div>}

            <button className="primary-button full-width" disabled={isSubmiting}>
              {isSubmiting ? 'Enviando Proposta...' : 'Enviar Proposta de Troca'}
            </button>
          </form>
        </section>

        {/* Right Side: Solicitations list (with tabs) */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={22} style={{ color: 'var(--primary)' }} />
            Fluxo de Trocas
          </h2>

          <Tabs
            options={tabOptions}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
            {isLoadingList ? (
              <div className="center-screen" style={{ minHeight: '100px' }}>Carregando solicitações...</div>
            ) : activeTab === 'minhas' ? (
              solicitacoesMinhas.length === 0 ? (
                <EmptyState
                  title="Nenhuma proposta enviada"
                  description="Preencha o formulário ao lado para propor sua primeira troca de plantão."
                  icon="📤"
                />
              ) : (
                <div className="request-list">
                  {solicitacoesMinhas.map((item) => (
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
            ) : solicitacoesRecebidas.length === 0 ? (
              <EmptyState
                title="Nenhuma proposta recebida"
                description="Quando algum colega propuser uma troca de plantão com você, ela aparecerá aqui."
                icon="📥"
              />
            ) : (
              <div className="request-list">
                {solicitacoesRecebidas.map((item) => (
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

          <div style={{ marginTop: '24px' }}>
            <PasswordPanel />
          </div>
        </section>
      </div>
    </Layout>
  )
}