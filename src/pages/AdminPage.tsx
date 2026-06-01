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
  Shield, ShieldOff, Lock,
} from 'lucide-react'

export function AdminPage() {
  const { profile: adminProfile } = useAuth()
  const tabOptions: TabOption[] = [
    { id: 'usuarios', label: 'Usuários', icon: '👤' },
    { id: 'setores', label: 'Setores & Vínculos', icon: '🏢' },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
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

  // Configurações
  const [configuracoes, setConfiguracoes] = useState<adminService.Configuracao[]>([])
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const [editConfigChave, setEditConfigChave] = useState<string | null>(null)
  const [editConfigValor, setEditConfigValor] = useState('')

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

  // Auto-reload members if selected sector changes
  useEffect(() => {
    if (selectedSetorId) {
      void loadMembrosSetor(selectedSetorId)
    } else {
      setSelectedSetorMembros([])
    }
  }, [selectedSetorId])

  // Handle user creation
  async function handleCreateUser(e: React.SyntheticEvent) {
    e.preventDefault()
    setAlertMessage(null)
    setActionLoading(true)

    if (userForm.matricula.trim().length === 0 || userForm.nome_completo.trim().length === 0 || userForm.password.length < 6) {
      setAlertMessage({ text: 'Preencha todos os campos obrigatórios. A senha deve ter no mínimo 6 caracteres.', error: true })
      setActionLoading(false)
      return
    }

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