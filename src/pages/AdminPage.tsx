import React, { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { SearchableSelect } from '../components/SearchableSelect'
import { useAuth } from '../contexts/AuthContext'
import type { Role, RoleSetor } from '../lib/types'
import * as adminService from '../services/adminService'
import * as setoresService from '../services/setoresService'
import {
  UserPlus, FolderPlus, Link, Users, Folder, UserX,
  Hash, User, Key, Building2, BadgeCheck, BadgeX,
  Shield, ShieldOff, Lock, Pencil, Trash2,
} from 'lucide-react'

export function AdminPage() {
  const { profile: adminProfile } = useAuth()
  const tabOptions: TabOption[] = [
    { id: 'usuarios', label: 'Usuários', icon: '👤' },
    { id: 'setores', label: 'Setores & Vínculos', icon: '🏢' },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
    { id: 'historico', label: 'Histórico', icon: '📜' },
  ]
  const [activeTab, setActiveTab] = useState<string>('usuarios')

  // Core Data States
  const [users, setUsers] = useState<adminService.AdminUsuario[]>([])
  const [setores, setSetores] = useState<setoresService.SetorListItem[]>([])
  const [selectedSetorId, setSelectedSetorId] = useState<number | null>(null)
  const [selectedSetorMembros, setSelectedSetorMembros] = useState<setoresService.MembroSetor[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('todas')

  // Reset password modal
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; nome: string } | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Edit user modal
  const [editUserTarget, setEditUserTarget] = useState<{ id: string; nome: string; matricula: string } | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editMatricula, setEditMatricula] = useState('')

  // Edit sector modal
  const [editSetorTarget, setEditSetorTarget] = useState<{ id: number; nome: string } | null>(null)
  const [editSetorNome, setEditSetorNome] = useState('')

  // Configurações
  const [configuracoes, setConfiguracoes] = useState<adminService.Configuracao[]>([])
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const [editConfigChave, setEditConfigChave] = useState<string | null>(null)
  const [editConfigValor, setEditConfigValor] = useState('')

  // Histórico (carregado sob demanda)
  const [historico, setHistorico] = useState<adminService.AdminHistoricoItem[]>([])
  const [isHistoricoLoading, setIsHistoricoLoading] = useState(false)
  const [historicoPage, setHistoricoPage] = useState(1)
  const [historicoPagination, setHistoricoPagination] = useState<{ total: number; total_pages: number } | null>(null)
  const [historicoFilter, setHistoricoFilter] = useState('')

  // Form inputs
  const [userForm, setUserForm] = useState<adminService.CreateUserPayload>({
    matricula: '',
    nome_completo: '',
    password: '',
    role: 'FUNCIONARIO',
    setor_id: undefined,
    role_setor: undefined
  })
  
  const [setorNome, setSetorNome] = useState('')
  
  // Link association inputs
  const [linkSetorId, setLinkSetorId] = useState('')
  const [linkProfileId, setLinkProfileId] = useState('')
  const [linkRoleSetor, setLinkRoleSetor] = useState<'MEMBRO' | 'GESTOR'>('MEMBRO')

  // Loaders
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [isSetoresLoading, setIsSetoresLoading] = useState(false)
  const [isMembrosLoading, setIsMembrosLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Status Alerts
  const [alertMessage, setAlertMessage] = useState<{ text: string; error: boolean } | null>(null)

  // Load users list via Edge Function
  async function loadUsers() {
    setIsUsersLoading(true)
    try {
      const data = await adminService.listarUsuarios()
      setUsers(data)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setIsUsersLoading(false)
    }
  }

  // Filtered users based on search + role filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchTerm ||
        u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.matricula.toLowerCase().includes(searchTerm.toLowerCase())
      const matchRole = roleFilter === 'todas' || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, searchTerm, roleFilter])

  // --- Admin user actions ---

  async function handleAtivarUsuario(profileId: string) {
    setActionLoadingId(profileId)
    try {
      await adminService.ativarUsuario(profileId)
      setAlertMessage({ text: 'Usuário ativado com sucesso.', error: false })
      void loadUsers()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao ativar usuário.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDesativarUsuario(profileId: string) {
    if (!window.confirm('Tem certeza de que deseja desativar este usuário? O histórico de solicitações será preservado.')) return
    setActionLoadingId(profileId)
    try {
      await adminService.desativarUsuario(profileId)
      setAlertMessage({ text: 'Usuário desativado com sucesso.', error: false })
      void loadUsers()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao desativar usuário.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleResetarSenha() {
    if (!resetPasswordTarget || resetPasswordValue.length < 8) {
      setAlertMessage({ text: 'A senha deve ter no mínimo 8 caracteres.', error: true })
      return
    }
    setActionLoadingId(resetPasswordTarget.id)
    try {
      await adminService.resetarSenha({
        profile_id: resetPasswordTarget.id,
        nova_senha: resetPasswordValue,
      })
      setAlertMessage({ text: `Senha de ${resetPasswordTarget.nome} redefinida com sucesso.`, error: false })
      setResetPasswordTarget(null)
      setResetPasswordValue('')
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao resetar senha.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleEditarUsuario() {
    if (!editUserTarget) return
    const nome = editNome.trim()
    const matricula = editMatricula.trim()
    const nomeAlterado = nome !== editUserTarget.nome
    const matriculaAlterada = matricula !== editUserTarget.matricula
    if (!nomeAlterado && !matriculaAlterada) {
      setAlertMessage({ text: 'Nenhum campo foi alterado.', error: true })
      return
    }
    // Validações conforme Fluxo.md / AUTH.md: matrícula 4–12, nome 12–64
    const validationError = validateUserFields(matricula, nome)
    if (validationError) {
      setAlertMessage({ text: validationError, error: true })
      return
    }
    setActionLoadingId(editUserTarget.id)
    try {
      await adminService.editarUsuario({
        profile_id: editUserTarget.id,
        ...(nomeAlterado ? { nome_completo: editNome.trim() } : {}),
        ...(matriculaAlterada ? { matricula: editMatricula.trim() } : {}),
      })
      setAlertMessage({ text: 'Usuário atualizado com sucesso.', error: false })
      setEditUserTarget(null)
      void loadUsers()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao editar usuário.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleEditarSetor() {
    if (!editSetorTarget) return
    const nome = editSetorNome.trim()
    if (!nome) {
      setAlertMessage({ text: 'O nome do setor não pode ficar vazio.', error: true })
      return
    }
    if (nome === editSetorTarget.nome) {
      setAlertMessage({ text: 'Nenhum campo foi alterado.', error: true })
      return
    }
    setActionLoadingId(`setor-${editSetorTarget.id}`)
    try {
      await setoresService.editarSetor(editSetorTarget.id, nome)
      setAlertMessage({ text: 'Setor atualizado com sucesso.', error: false })
      setEditSetorTarget(null)
      void loadSetores()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao editar setor.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDesativarSetor(setorId: number, nome: string) {
    if (!window.confirm(`Tem certeza que deseja desativar o setor "${nome}"? Todos os vínculos de membros serão desativados automaticamente.`)) return
    setActionLoadingId(`setor-${setorId}`)
    try {
      await setoresService.desativarSetor(setorId)
      setAlertMessage({ text: `Setor "${nome}" desativado com sucesso.`, error: false })
      if (selectedSetorId === setorId) {
        setSelectedSetorId(null)
        setSelectedSetorMembros([])
      }
      void loadSetores()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao desativar setor.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  async function loadSetores() {
    setIsSetoresLoading(true)
    try {
      const data = await setoresService.listarSetores()
      setSetores(data)
    } catch (err) {
      console.error('Erro ao carregar setores:', err)
    } finally {
      setIsSetoresLoading(false)
    }
  }

  // Load configurações
  async function loadConfiguracoes() {
    setIsConfigLoading(true)
    try {
      const data = await adminService.listarConfiguracoes()
      setConfiguracoes(data)
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setIsConfigLoading(false)
    }
  }

  async function handleAtualizarConfig(chave: string) {
    if (!editConfigValor.trim()) return
    setActionLoadingId(`config-${chave}`)
    try {
      await adminService.atualizarConfiguracao(chave, editConfigValor.trim())
      setAlertMessage({ text: 'Configuração atualizada com sucesso.', error: false })
      setEditConfigChave(null)
      setEditConfigValor('')
      void loadConfiguracoes()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao atualizar configuração.', error: true })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Load histórico (carregado sob demanda)
  async function loadHistorico(page = 1) {
    setIsHistoricoLoading(true)
    try {
      const response = await adminService.listarHistoricoAdmin(page)
      setHistorico(response.data)
      setHistoricoPagination(response.pagination)
      setHistoricoPage(page)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      // Erro de action inválida (400) = não implementada, outros erros são temporários
      if (message.includes('inválida') || message.includes('not found')) {
        console.warn('Histórico indisponível — ação listar_historico_admin não implementada no backend.')
      } else {
        console.warn('Erro ao carregar histórico:', message)
      }
      setHistorico([])
      setHistoricoPagination(null)
    } finally {
      setIsHistoricoLoading(false)
    }
  }

  // Load members of a specific sector
  async function loadMembrosSetor(setorId: number) {
    setIsMembrosLoading(true)
    try {
      const data = await setoresService.listarMembrosSetor(setorId)
      setSelectedSetorMembros(data)
    } catch (err) {
      console.error('Erro ao carregar membros do setor:', err)
      setSelectedSetorMembros([])
    } finally {
      setIsMembrosLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    void loadUsers()
    void loadSetores()
    void loadConfiguracoes()
  }, [])

  // Load histórico apenas quando a aba for acessada
  useEffect(() => {
    if (activeTab === 'historico') {
      void loadHistorico()
    }
  }, [activeTab])
  useEffect(() => {
    if (selectedSetorId) {
      void loadMembrosSetor(selectedSetorId)
    } else {
      setSelectedSetorMembros([])
    }
  }, [selectedSetorId])

  // --- Validações de campos (AUTH.md / Fluxo.md) ---
  // matrícula: 4–12 caracteres | nome_completo: 10–64 caracteres
  function validateUserFields(matricula: string, nome: string): string | null {
    if (matricula.length < 4 || matricula.length > 12) {
      return 'Matrícula deve ter entre 4 e 12 caracteres.'
    }
    if (nome.length < 10 || nome.length > 64) {
      return 'Nome completo deve ter entre 10 e 64 caracteres.'
    }
    return null
  }

  // Handle user creation
  async function handleCreateUser(e: React.SyntheticEvent) {
    e.preventDefault()
    setAlertMessage(null)

    // Validações conforme AUTH.md: matrícula 4–12, nome 12–64, senha mín 6
    const matricula = userForm.matricula.trim()
    const nome = userForm.nome_completo.trim()
    const validationError = validateUserFields(matricula, nome)
    if (validationError) {
      setAlertMessage({ text: validationError, error: true })
      return
    }
    if (userForm.password.length < 6) {
      setAlertMessage({ text: 'A senha deve ter no mínimo 6 caracteres.', error: true })
      return
    }

    setActionLoading(true)
    try {
      await adminService.createUser({
        matricula: userForm.matricula.trim(),
        nome_completo: userForm.nome_completo.trim(),
        password: userForm.password,
        role: userForm.role,
        setor_id: userForm.setor_id ? Number(userForm.setor_id) : undefined,
        role_setor: userForm.setor_id ? userForm.role_setor : undefined
      })

      setUserForm({
        matricula: '',
        nome_completo: '',
        password: '',
        role: 'FUNCIONARIO',
        setor_id: undefined,
        role_setor: undefined
      })

      setAlertMessage({ text: 'Usuário criado com sucesso.', error: false })
      void loadUsers()
      void loadSetores()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao criar usuário.', error: true })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle sector creation
  async function handleCreateSetor(e: React.SyntheticEvent) {
    e.preventDefault()
    setAlertMessage(null)
    setActionLoading(true)

    if (setorNome.trim().length === 0) {
      setAlertMessage({ text: 'Nome do setor é obrigatório.', error: true })
      setActionLoading(false)
      return
    }

    try {
      await setoresService.criarSetor(setorNome.trim())
      setSetorNome('')
      setAlertMessage({ text: 'Setor criado com sucesso.', error: false })
      void loadSetores()
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao criar setor.', error: true })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle linking members
  async function handleVincularMembro(e: React.SyntheticEvent) {
    e.preventDefault()
    setAlertMessage(null)
    setActionLoading(true)

    if (!linkSetorId || !linkProfileId) {
      setAlertMessage({ text: 'Selecione o setor e o membro para vincular.', error: true })
      setActionLoading(false)
      return
    }

    try {
      await setoresService.vincularMembro({
        profile_id: linkProfileId,
        setor_id: Number(linkSetorId),
        role_setor: linkRoleSetor
      })

      setLinkProfileId('')
      setAlertMessage({ text: 'Vínculo adicionado com sucesso.', error: false })
      void loadSetores()
      if (selectedSetorId === Number(linkSetorId)) {
        void loadMembrosSetor(Number(linkSetorId))
      }
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao vincular membro.', error: true })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle soft deleting/deactivating a link
  async function handleDesativarMembro(profileId: string, setorId: number) {
    if (!window.confirm('Tem certeza de que deseja desativar este vínculo? O histórico de trocas será preservado.')) return
    
    setAlertMessage(null)
    try {
      await setoresService.desativarMembro(profileId, setorId)
      setAlertMessage({ text: 'Vínculo desativado com sucesso.', error: false })
      void loadSetores()
      if (selectedSetorId === setorId) {
        void loadMembrosSetor(setorId)
      }
    } catch (err) {
      setAlertMessage({ text: err instanceof Error ? err.message : 'Erro ao desativar vínculo.', error: true })
    }
  }

  const staffUsers = users.filter((u) => u.role === 'FUNCIONARIO' || u.role === 'GESTOR')

  const staffUserOptions = useMemo(
    () =>
      staffUsers.map((u) => ({
        value: u.id,
        label: u.nome_completo,
        hint: `Mat. ${u.matricula} · ${u.role}`,
        searchText: `${u.nome_completo} ${u.matricula} ${u.role}`,
      })),
    [staffUsers],
  )

  return (
    <Layout title="Administração">
      <div className="grid two-columns">
        {/* Left: Forms */}
        <div className="admin-forms">
          <section className="panel">
            <Tabs
              options={tabOptions}
              activeTab={activeTab}
              onChange={(tab) => { setActiveTab(tab); setAlertMessage(null) }}
            />
          </section>

          {activeTab === 'usuarios' && (
            <section className="panel">
              <h3 className="admin-section-title">
                <UserPlus size={16} />
                Novo Usuário
              </h3>
              <p className="admin-section-desc">
                Cria credenciais com alocação opcional a um setor.
              </p>

              <form className="form-grid" onSubmit={handleCreateUser}>
                <div className="form-row">
                  <label>
                    <Hash size={12} />
                    Matrícula
                    <input required value={userForm.matricula} onChange={(e) => setUserForm(prev => ({ ...prev, matricula: e.target.value }))} placeholder="ex: 2026101" />
                  </label>
                  <label>
                    <User size={12} />
                    Perfil
                    <select value={userForm.role} onChange={(e) => { const r = e.target.value as Role; setUserForm(prev => ({ ...prev, role: r, setor_id: undefined, role_setor: undefined })) }}>
                      <option value="FUNCIONARIO">FUNCIONÁRIO</option>
                      <option value="GESTOR">GESTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                </div>

                <label>
                  <User size={12} />
                  Nome Completo
                  <input required value={userForm.nome_completo} onChange={(e) => setUserForm(prev => ({ ...prev, nome_completo: e.target.value }))} placeholder="Nome completo" />
                </label>

                <label>
                  <Key size={12} />
                  Senha Inicial
                  <input required type="password" value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                </label>

                {(userForm.role === 'FUNCIONARIO' || userForm.role === 'GESTOR') && (
                  <div className="form-section">
                    <span className="form-section-label">⚡ Alocação de Setor</span>
                    <div className="form-row">
                      <label>
                        Setor
                        <select value={userForm.setor_id ?? ''} onChange={(e) => { const val = e.target.value; setUserForm(prev => ({ ...prev, setor_id: val ? Number(val) : undefined, role_setor: val ? (userForm.role === 'GESTOR' ? 'GESTOR' : 'MEMBRO') : undefined })) }}>
                          <option value="">Não vincular</option>
                          {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                        </select>
                      </label>
                      {userForm.setor_id && (
                        <label>
                          Função
                          <select value={userForm.role_setor ?? 'MEMBRO'} onChange={(e) => setUserForm(prev => ({ ...prev, role_setor: e.target.value as RoleSetor }))}>
                            <option value="MEMBRO">MEMBRO</option>
                            <option value="GESTOR">GESTOR</option>
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>}

                <button className="primary-button full-width" disabled={actionLoading}>
                  {actionLoading ? 'Criando...' : 'Criar Usuário'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'setores' && (
            <div className="admin-forms">
              <section className="panel">
                <h3 className="admin-section-title">
                  <FolderPlus size={16} />
                  Novo Setor
                </h3>
                <p className="admin-section-desc">
                  Crie setores físicos ou administrativos.
                </p>
                <form className="form-grid" onSubmit={handleCreateSetor}>
                  <label>
                    <Building2 size={12} />
                    Nome do Setor
                    <input required value={setorNome} onChange={(e) => setSetorNome(e.target.value)} placeholder="Ex: UTI Adulto, Pronto Socorro" />
                  </label>
                  {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>}
                  <button className="primary-button full-width" disabled={actionLoading}>{actionLoading ? 'Criando...' : 'Adicionar Setor'}</button>
                </form>
              </section>

              <section className="panel">
                <h3 className="admin-section-title">
                  <Link size={16} />
                  Vincular Membro
                </h3>
                <p className="admin-section-desc">
                  Estabeleça vínculo a um setor.
                </p>
                <form className="form-grid" onSubmit={handleVincularMembro}>
                  <label>
                    <Building2 size={12} />
                    Setor
                    <select required value={linkSetorId} onChange={(e) => setLinkSetorId(e.target.value)}>
                      <option value="">Selecione...</option>
                      {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome} {s.ativo ? '' : '(Inativo)'}</option>))}
                    </select>
                  </label>
                  <div className="form-row">
                    <SearchableSelect label="Colaborador" value={linkProfileId} onChange={setLinkProfileId} options={staffUserOptions} placeholder="Selecione..." searchPlaceholder="Buscar por nome ou matrícula..." required emptyMessage="Nenhum colaborador cadastrado" />
                    <label>Função<select value={linkRoleSetor} onChange={(e) => setLinkRoleSetor(e.target.value as RoleSetor)}><option value="MEMBRO">MEMBRO</option><option value="GESTOR">GESTOR</option></select></label>
                  </div>
                  {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>}
                  <button className="primary-button full-width" disabled={actionLoading}>{actionLoading ? 'Vinculando...' : 'Registrar Vínculo'}</button>
                </form>
              </section>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <section className="panel">
              {isConfigLoading ? (
                <div className="center-screen">Carregando...</div>
              ) : configuracoes.length === 0 ? (
                <EmptyState title="Nenhuma configuração" description="As configurações são gerenciadas pelo backend." />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Variável</th>
                        <th>Valor</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {configuracoes.map((c) => (
                        <tr key={c.chave}>
                          <td><code>{c.chave}</code></td>
                          <td>
                            {editConfigChave === c.chave ? (
                              <input
                                type="text"
                                className="config-edit-input"
                                value={editConfigValor}
                                onChange={(e) => setEditConfigValor(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span className="config-valor">{c.valor}</span>
                            )}
                          </td>
                          <td>
                            {editConfigChave === c.chave ? (
                              <div className="admin-actions-cell">
                                <button
                                  type="button"
                                  className="success-button btn-sm"
                                  onClick={() => handleAtualizarConfig(c.chave)}
                                  disabled={actionLoadingId === `config-${c.chave}` || !editConfigValor.trim()}
                                >
                                  {actionLoadingId === `config-${c.chave}` ? 'Salvando...' : 'Salvar'}
                                </button>
                                <button
                                  type="button"
                                  className="ghost-button btn-sm"
                                  onClick={() => { setEditConfigChave(null); setEditConfigValor('') }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="ghost-button btn-sm"
                                onClick={() => { setEditConfigChave(c.chave); setEditConfigValor(c.valor) }}
                                title="Editar"
                              >
                                ✏️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'historico' && (
            <section className="panel">
              <h3 className="admin-section-title">
                <span>📜</span> Histórico de Solicitações
              </h3>
              <p className="admin-section-desc">
                Registro cronológico de todas as mudanças de status.
              </p>

              {isHistoricoLoading ? (
                <div className="center-screen">Carregando...</div>
              ) : historico.length === 0 && !historicoFilter ? (
                <EmptyState title="Nenhum registro" description="O histórico será preenchido automaticamente conforme as solicitações forem alteradas." />
              ) : (
                <>
                  {/* Filtro por solicitação */}
                  <div className="admin-filters-row">
                    <input
                      type="number"
                      className="admin-search-input"
                      placeholder="Filtrar por solicitação #..."
                      value={historicoFilter}
                      onChange={(e) => setHistoricoFilter(e.target.value)}
                    />
                    {historicoFilter && (
                      <button
                        type="button"
                        className="ghost-button btn-sm"
                        onClick={() => { setHistoricoFilter(''); loadHistorico(1) }}
                      >
                        Limpar filtro
                      </button>
                    )}
                  </div>

                  {historico.length === 0 ? (
                    <EmptyState title="Nenhum registro encontrado" description="Nenhum histórico para esta solicitação." />
                  ) : (
                    <>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Solicitação</th>
                              <th>Setor</th>
                              <th>Anterior</th>
                              <th>Novo</th>
                              <th>Responsável</th>
                              <th>Data/Hora</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historico
                              .filter((h) => !historicoFilter || String(h.solicitacao.id) === historicoFilter)
                              .map((h) => (
                                <tr key={h.id}>
                                  <td>#{h.solicitacao.id}</td>
                                  <td>{h.solicitacao.setor.nome}</td>
                                  <td>{h.status_anterior ? <span className="badge badge-muted">{h.status_anterior}</span> : <span className="text-muted">—</span>}</td>
                                  <td><span className={`status-pill ${h.status_novo === 'aprovado' || h.status_novo === 'revogado' ? 'approved' : h.status_novo === 'recusado_cedente' || h.status_novo === 'recusado_gestor' || h.status_novo === 'cancelado' ? 'rejected' : 'pending'}`}>{h.status_novo}</span></td>
                                  <td>{h.alterado_por_profile.nome_completo}</td>
                                  <td className="td-date">{new Date(h.alterado_em).toLocaleString('pt-BR')}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {historicoPagination && historicoPagination.total_pages > 1 && (
                        <div className="pagination-row">
                          <button
                            type="button"
                            className="ghost-button btn-sm"
                            disabled={historicoPage <= 1}
                            onClick={() => loadHistorico(historicoPage - 1)}
                          >
                            ← Anterior
                          </button>
                          <span className="pagination-info">
                            Página {historicoPage} de {historicoPagination.total_pages} ({historicoPagination.total} registros)
                          </span>
                          <button
                            type="button"
                            className="ghost-button btn-sm"
                            disabled={historicoPage >= historicoPagination.total_pages}
                            onClick={() => loadHistorico(historicoPage + 1)}
                          >
                            Próxima →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          )}
        </div>

        {/* Right: Lists */}
        <div className="admin-lists">
          {activeTab === 'usuarios' && (
            <section className="panel admin-table-section">
              <h3 className="admin-section-title">
                <Users size={16} />
                Contas Operacionais
              </h3>

              {/* Filters */}
              <div className="admin-filters-row">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Buscar por nome ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="admin-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="todas">Todos os perfis</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="GESTOR">GESTOR</option>
                  <option value="FUNCIONARIO">FUNCIONÁRIO</option>
                </select>
              </div>

              {isUsersLoading ? (
                <div className="center-screen">Carregando...</div>
              ) : filteredUsers.length === 0 ? (
                <EmptyState title="Nenhum usuário encontrado" description={searchTerm || roleFilter !== 'todas' ? 'Tente ajustar os filtros.' : 'Use o formulário ao lado para cadastrar.'} />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Matrícula</th>
                        <th>Nome</th>
                        <th>Acesso</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="td-matricula" data-label="Matrícula">{u.matricula}</td>
                          <td data-label="Nome">{u.nome_completo}</td>
                          <td data-label="Acesso"><span className="badge">{u.role}</span></td>
                          <td data-label="Status">{u.ativo ? <BadgeCheck size={16} className="icon-success" /> : <BadgeX size={16} className="icon-danger" />}</td>
                          <td data-label="Ações">
                            <div className="admin-actions-cell">
                              {u.ativo ? (
                                <button
                                  type="button"
                                  className="ghost-button btn-sm"
                                  onClick={() => handleDesativarUsuario(u.id)}
                                  disabled={actionLoadingId === u.id || u.id === adminProfile?.id}
                                  title={u.id === adminProfile?.id ? 'Não pode desativar a si mesmo' : 'Desativar usuário'}
                                >
                                  <ShieldOff size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="ghost-button btn-sm"
                                  onClick={() => handleAtivarUsuario(u.id)}
                                  disabled={actionLoadingId === u.id}
                                  title="Reativar usuário"
                                >
                                  <Shield size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="ghost-button btn-sm"
                                onClick={() => setResetPasswordTarget({ id: u.id, nome: u.nome_completo })}
                                disabled={actionLoadingId === u.id}
                                title="Resetar senha"
                              >
                                <Lock size={14} />
                              </button>
                              <button
                                type="button"
                                className="ghost-button btn-sm"
                                onClick={() => {
                                  setEditUserTarget({ id: u.id, nome: u.nome_completo, matricula: u.matricula })
                                  setEditNome(u.nome_completo)
                                  setEditMatricula(u.matricula)
                                }}
                                disabled={actionLoadingId === u.id}
                                title="Editar usuário"
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'setores' && (
            <div className="admin-lists">
              <section className="panel admin-table-section">
                <h3 className="admin-section-title">
                  <Folder size={16} />
                  Setores Ativos
                </h3>
                {isSetoresLoading ? (
                  <div className="center-screen">Carregando...</div>
                ) : setores.length === 0 ? (
                  <EmptyState title="Nenhum setor" description="Cadastre setores para prosseguir." />
                ) : (
                  <div className="request-list">
                    {setores.map((s) => (
                      <div key={s.id} className="request-card setor-card">
                        <div className="setor-card-header">
                          <span className="setor-card-name">{s.nome}</span>
                          <span className={`status-pill ${s.ativo ? 'approved' : 'rejected'}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <div className="setor-card-meta">
                          <span>ID #{s.id}</span>
                          <span>Gestor: {s.gestor ? s.gestor.nome_completo : '—'}</span>
                          <span>{s.total_membros} membro(s)</span>
                        </div>
                        <div className="setor-card-actions">
                          <button
                            type="button"
                            className="ghost-button btn-sm"
                            onClick={() => {
                              setEditSetorTarget({ id: s.id, nome: s.nome })
                              setEditSetorNome(s.nome)
                            }}
                            disabled={actionLoadingId === `setor-${s.id}`}
                            title="Editar setor"
                          >
                            <Pencil size={14} />
                          </button>
                          {s.ativo && (
                            <button
                              type="button"
                              className="ghost-button btn-sm"
                              onClick={() => handleDesativarSetor(s.id, s.nome)}
                              disabled={actionLoadingId === `setor-${s.id}`}
                              title="Desativar setor"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel admin-table-section">
                <h3 className="admin-section-title">
                  <Users size={16} />
                  Membros do Setor
                </h3>
                <p className="admin-section-desc">
                  Selecione um setor para gerenciar vínculos.
                </p>
                <select value={selectedSetorId ?? ''} onChange={(e) => setSelectedSetorId(e.target.value ? Number(e.target.value) : null)} className="setor-select">
                  <option value="">Selecione um setor...</option>
                  {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome} ({s.total_membros})</option>))}
                </select>
                {selectedSetorId ? (
                  isMembrosLoading ? (
                    <div className="center-screen">Carregando...</div>
                  ) : selectedSetorMembros.length === 0 ? (
                    <EmptyState title="Sem membros" description="Vincule membros pelo formulário ao lado." icon="👥" />
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Matrícula</th>
                            <th>Função</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSetorMembros.map((m) => (
                            <tr key={m.profile_id} className={m.ativo ? '' : 'inativo'}>
                              <td className="td-nome" data-label="Nome">{m.nome_completo}</td>
                              <td data-label="Matrícula">{m.matricula}</td>
                              <td data-label="Função"><span className="badge">{m.role_setor}</span></td>
                              <td data-label="Status">{m.ativo ? <BadgeCheck size={14} className="icon-success" /> : <BadgeX size={14} className="icon-danger" />}</td>
                              <td data-label="Ação">
                                {m.ativo ? (
                                  <button type="button" className="danger-button btn-sm" onClick={() => handleDesativarMembro(m.profile_id, selectedSetorId)} title="Desativar Vínculo">
                                    <UserX size={12} />
                                  </button>
                                ) : (
                                  <span className="inativo-label">Inativo</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <EmptyState title="Aguardando seleção" description="Selecione um setor acima." icon="🏢" />
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Edit Sector Modal */}
      {editSetorTarget && (
        <div className="modal-overlay" onClick={() => { setEditSetorTarget(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Editar Setor</h3>
            <p className="modal-desc">
              Alterar nome de <strong>{editSetorTarget.nome}</strong>
            </p>
            <div className="modal-form">
              <label>
                Nome do setor
                <input
                  type="text"
                  value={editSetorNome}
                  onChange={(e) => setEditSetorNome(e.target.value)}
                  placeholder="Nome do setor"
                  autoFocus
                />
              </label>
              {alertMessage && (
                <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setEditSetorTarget(null); setAlertMessage(null) }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => { setAlertMessage(null); void handleEditarSetor() }}
                  disabled={actionLoadingId === `setor-${editSetorTarget.id}`}
                >
                  {actionLoadingId === `setor-${editSetorTarget.id}` ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUserTarget && (
        <div className="modal-overlay" onClick={() => { setEditUserTarget(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Editar Usuário</h3>
            <p className="modal-desc">
              Alterar dados de <strong>{editUserTarget.nome}</strong>
            </p>
            <div className="modal-form">
              <label>
                Nome completo
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome completo"
                  autoFocus
                />
              </label>
              <label>
                Matrícula
                <input
                  type="text"
                  value={editMatricula}
                  onChange={(e) => setEditMatricula(e.target.value)}
                  placeholder="Matrícula"
                />
              </label>
              {alertMessage && (
                <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setEditUserTarget(null); setAlertMessage(null) }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => { setAlertMessage(null); void handleEditarUsuario() }}
                  disabled={actionLoadingId === editUserTarget.id}
                >
                  {actionLoadingId === editUserTarget.id ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <div className="modal-overlay" onClick={() => { setResetPasswordTarget(null); setResetPasswordValue('') }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Redefinir Senha</h3>
            <p className="modal-desc">
              Nova senha para <strong>{resetPasswordTarget.nome}</strong>
            </p>
            <div className="modal-form">
              <label>
                Nova senha
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setResetPasswordTarget(null); setResetPasswordValue('') }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleResetarSenha}
                  disabled={actionLoadingId === resetPasswordTarget.id || resetPasswordValue.length < 8}
                >
                  {actionLoadingId === resetPasswordTarget.id ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}