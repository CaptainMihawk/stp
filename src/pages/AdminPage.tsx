import React, { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { SearchableSelect } from '../components/SearchableSelect'
import { supabase } from '../lib/supabase'
import type { Profile, Role, RoleSetor } from '../lib/types'
import * as adminService from '../services/adminService'
import * as setoresService from '../services/setoresService'
import {
  UserPlus, FolderPlus, Link, Users, Folder, UserX,
  Hash, User, Key, Building2, BadgeCheck, BadgeX,
} from 'lucide-react'

export function AdminPage() {
  const tabOptions: TabOption[] = [
    { id: 'usuarios', label: 'Usuários', icon: '👤' },
    { id: 'setores', label: 'Setores & Vínculos', icon: '🏢' },
  ]
  const [activeTab, setActiveTab] = useState<string>('usuarios')

  // Core Data States
  const [users, setUsers] = useState<Profile[]>([])
  const [setores, setSetores] = useState<setoresService.SetorListItem[]>([])
  const [selectedSetorId, setSelectedSetorId] = useState<number | null>(null)
  const [selectedSetorMembros, setSelectedSetorMembros] = useState<setoresService.MembroSetor[]>([])

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

  // Load users list
  async function loadUsers() {
    setIsUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('criado_em', { ascending: false })
      if (error) throw error
      setUsers(data ?? [])
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setIsUsersLoading(false)
    }
  }

  // Load sectors list
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <section className="panel" style={{ padding: '12px 16px' }}>
            <Tabs
              options={tabOptions}
              activeTab={activeTab}
              onChange={(tab) => { setActiveTab(tab); setAlertMessage(null) }}
            />
          </section>

          {activeTab === 'usuarios' && (
            <section className="panel" style={{ padding: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '4px' }}>
                <UserPlus size={16} style={{ color: 'var(--primary)' }} />
                Novo Usuário
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '14px' }}>
                Cria credenciais com alocação opcional a um setor.
              </p>

              <form className="form-grid" onSubmit={handleCreateUser} style={{ gap: '10px' }}>
                <div className="form-row">
                  <label style={{ flex: 1 }}>
                    <Hash size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Matrícula
                    <input required value={userForm.matricula} onChange={(e) => setUserForm(prev => ({ ...prev, matricula: e.target.value }))} placeholder="ex: 2026101" />
                  </label>
                  <label style={{ flex: 1 }}>
                    <User size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Perfil
                    <select value={userForm.role} onChange={(e) => { const r = e.target.value as Role; setUserForm(prev => ({ ...prev, role: r, setor_id: undefined, role_setor: undefined })) }}>
                      <option value="FUNCIONARIO">FUNCIONÁRIO</option>
                      <option value="GESTOR">GESTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                </div>

                <label>
                  <User size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Nome Completo
                  <input required value={userForm.nome_completo} onChange={(e) => setUserForm(prev => ({ ...prev, nome_completo: e.target.value }))} placeholder="Nome completo" />
                </label>

                <label>
                  <Key size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Senha Inicial
                  <input required type="password" value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                </label>

                {(userForm.role === 'FUNCIONARIO' || userForm.role === 'GESTOR') && (
                  <div className="form-section">
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-strong)', textTransform: 'uppercase' }}>⚡ Alocação de Setor</span>
                    <div className="form-row">
                      <label style={{ flex: 1 }}>
                        Setor
                        <select value={userForm.setor_id ?? ''} onChange={(e) => { const val = e.target.value; setUserForm(prev => ({ ...prev, setor_id: val ? Number(val) : undefined, role_setor: val ? (userForm.role === 'GESTOR' ? 'GESTOR' : 'MEMBRO') : undefined })) }}>
                          <option value="">Não vincular</option>
                          {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                        </select>
                      </label>
                      {userForm.setor_id && (
                        <label style={{ flex: 1 }}>
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

                {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'} style={{ fontSize: '0.8rem', padding: '8px 12px' }}>{alertMessage.text}</div>}

                <button className="primary-button full-width" disabled={actionLoading} style={{ padding: '10px' }}>
                  {actionLoading ? 'Criando...' : 'Criar Usuário'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'setores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <section className="panel" style={{ padding: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '4px' }}>
                  <FolderPlus size={16} style={{ color: 'var(--primary)' }} />
                  Novo Setor
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '14px' }}>
                  Crie setores físicos ou administrativos.
                </p>
                <form className="form-grid" onSubmit={handleCreateSetor} style={{ gap: '10px' }}>
                  <label>
                    <Building2 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Nome do Setor
                    <input required value={setorNome} onChange={(e) => setSetorNome(e.target.value)} placeholder="Ex: UTI Adulto, Pronto Socorro" />
                  </label>
                  {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'} style={{ fontSize: '0.8rem', padding: '8px 12px' }}>{alertMessage.text}</div>}
                  <button className="primary-button full-width" disabled={actionLoading} style={{ padding: '10px' }}>{actionLoading ? 'Criando...' : 'Adicionar Setor'}</button>
                </form>
              </section>

              <section className="panel" style={{ padding: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '4px' }}>
                  <Link size={16} style={{ color: 'var(--primary)' }} />
                  Vincular Membro
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '14px' }}>
                  Estabeleça vínculo a um setor.
                </p>
                <form className="form-grid" onSubmit={handleVincularMembro} style={{ gap: '10px' }}>
                  <label>
                    <Building2 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
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
                  {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'} style={{ fontSize: '0.8rem', padding: '8px 12px' }}>{alertMessage.text}</div>}
                  <button className="primary-button full-width" disabled={actionLoading} style={{ padding: '10px' }}>{actionLoading ? 'Vinculando...' : 'Registrar Vínculo'}</button>
                </form>
              </section>
            </div>
          )}
        </div>

        {/* Right: Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'usuarios' && (
            <section className="panel" style={{ padding: '16px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '12px' }}>
                <Users size={16} style={{ color: 'var(--primary)' }} />
                Contas Operacionais
              </h3>
              {isUsersLoading ? (
                <div className="center-screen" style={{ minHeight: '60px' }}>Carregando...</div>
              ) : users.length === 0 ? (
                <EmptyState title="Nenhum usuário" description="Use o formulário ao lado para cadastrar." />
              ) : (
                <div className="table-wrap" style={{ fontSize: '0.8rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Matrícula</th>
                        <th>Nome</th>
                        <th>Acesso</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 700, fontSize: '0.78rem' }}>{u.matricula}</td>
                          <td style={{ fontSize: '0.8rem' }}>{u.nome_completo}</td>
                          <td><span className="badge" style={{ fontSize: '0.6rem' }}>{u.role}</span></td>
                          <td>{u.ativo ? <BadgeCheck size={16} style={{ color: 'var(--success-strong)', verticalAlign: 'middle' }} /> : <BadgeX size={16} style={{ color: 'var(--danger-strong)', verticalAlign: 'middle' }} />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'setores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <section className="panel" style={{ padding: '16px', maxHeight: '50vh', overflowY: 'auto' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '12px' }}>
                  <Folder size={16} style={{ color: 'var(--primary)' }} />
                  Setores Ativos
                </h3>
                {isSetoresLoading ? (
                  <div className="center-screen" style={{ minHeight: '60px' }}>Carregando...</div>
                ) : setores.length === 0 ? (
                  <EmptyState title="Nenhum setor" description="Cadastre setores para prosseguir." />
                ) : (
                  <div className="request-list" style={{ gap: '8px' }}>
                    {setores.map((s) => (
                      <div key={s.id} className="request-card" style={{ padding: '10px 12px', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.nome}</span>
                          <span className={`status-pill ${s.ativo ? 'approved' : 'rejected'}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--muted)' }}>
                          <span>ID #{s.id}</span>
                          <span>Gestor: {s.gestor ? s.gestor.nome_completo : '—'}</span>
                          <span>{s.total_membros} membro(s)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel" style={{ padding: '16px', maxHeight: '50vh', overflowY: 'auto' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '4px' }}>
                  <Users size={16} style={{ color: 'var(--primary)' }} />
                  Membros do Setor
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '12px' }}>
                  Selecione um setor para gerenciar vínculos.
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <select value={selectedSetorId ?? ''} onChange={(e) => setSelectedSetorId(e.target.value ? Number(e.target.value) : null)} style={{ fontSize: '0.8rem' }}>
                    <option value="">Selecione um setor...</option>
                    {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome} ({s.total_membros})</option>))}
                  </select>
                </div>
                {selectedSetorId ? (
                  isMembrosLoading ? (
                    <div className="center-screen" style={{ minHeight: '60px' }}>Carregando...</div>
                  ) : selectedSetorMembros.length === 0 ? (
                    <EmptyState title="Sem membros" description="Vincule membros pelo formulário ao lado." icon="👥" />
                  ) : (
                    <div className="table-wrap animate-slide-down" style={{ fontSize: '0.78rem' }}>
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
                            <tr key={m.profile_id} style={{ opacity: m.ativo ? 1 : 0.5 }}>
                              <td style={{ fontWeight: 600, fontSize: '0.78rem' }}>{m.nome_completo}</td>
                              <td style={{ fontSize: '0.75rem' }}>{m.matricula}</td>
                              <td><span className="badge" style={{ fontSize: '0.6rem' }}>{m.role_setor}</span></td>
                              <td>{m.ativo ? <BadgeCheck size={14} style={{ color: 'var(--success-strong)', verticalAlign: 'middle' }} /> : <BadgeX size={14} style={{ color: 'var(--danger-strong)', verticalAlign: 'middle' }} />}</td>
                              <td>
                                {m.ativo ? (
                                  <button type="button" className="danger-button" style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleDesativarMembro(m.profile_id, selectedSetorId)} title="Desativar Vínculo">
                                    <UserX size={12} />
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>Inativo</span>
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
    </Layout>
  )
}