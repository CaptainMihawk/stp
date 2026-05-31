import React, { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { PasswordPanel } from './PasswordPanel'
import { Tabs, type TabOption } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { SearchableSelect } from '../components/SearchableSelect'
import { supabase } from '../lib/supabase'
import type { Profile, Role, RoleSetor } from '../lib/types'
import * as adminService from '../services/adminService'
import * as setoresService from '../services/setoresService'
import { UserPlus, FolderPlus, Link, Users, Folder, ShieldCheck, UserX } from 'lucide-react'

export function AdminPage() {
  // Tab configuration
  const tabOptions: TabOption[] = [
    { id: 'usuarios', label: 'Gestão de Usuários', icon: '👤' },
    { id: 'setores', label: 'Gestão de Setores', icon: '🏢' },
    { id: 'vinculos', label: 'Vínculos de Equipe', icon: '🔗' },
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

      // Reset
      setUserForm({
        matricula: '',
        nome_completo: '',
        password: '',
        role: 'FUNCIONARIO',
        setor_id: undefined,
        role_setor: undefined
      })

      setAlertMessage({ text: 'Usuário criado com sucesso no banco de dados e autenticação.', error: false })
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
      setAlertMessage({ text: 'Setor operacional criado com sucesso.', error: false })
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
      setAlertMessage({ text: 'Vínculo de equipe adicionado com sucesso.', error: false })
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
    <Layout title="Painel do Administrador">
      <div className="grid two-columns">
        {/* Left Side: Creation Forms & Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Navigation tabs */}
          <section className="panel" style={{ padding: '20px 24px' }}>
            <h3 style={{ marginBottom: '14px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
              Painel Administrativo
            </h3>
            <Tabs
              options={tabOptions}
              activeTab={activeTab}
              onChange={(tab) => {
                setActiveTab(tab)
                setAlertMessage(null)
              }}
            />
          </section>

          {/* Form blocks based on active tab */}
          {activeTab === 'usuarios' && (
            <section className="panel animate-slide-down">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} style={{ color: 'var(--primary)' }} />
                Novo Usuário Coletivo
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.825rem', margin: '4px 0 20px' }}>
                Cria credenciais operacionais. O email interno será gerado automaticamente.
              </p>

              <form className="form-grid" onSubmit={handleCreateUser}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label>
                    Matrícula
                    <input
                      required
                      value={userForm.matricula}
                      onChange={(e) => setUserForm(prev => ({ ...prev, matricula: e.target.value }))}
                      placeholder="ex: 2026101"
                    />
                  </label>

                  <label>
                    Perfil de Acesso
                    <select
                      value={userForm.role}
                      onChange={(e) => {
                        const r = e.target.value as Role
                        setUserForm(prev => ({ ...prev, role: r, setor_id: undefined, role_setor: undefined }))
                      }}
                    >
                      <option value="FUNCIONARIO">FUNCIONÁRIO</option>
                      <option value="GESTOR">GESTOR DE SETOR</option>
                      <option value="ADMIN">ADMINISTRADOR</option>
                    </select>
                  </label>
                </div>

                <label>
                  Nome Completo
                  <input
                    required
                    value={userForm.nome_completo}
                    onChange={(e) => setUserForm(prev => ({ ...prev, nome_completo: e.target.value }))}
                    placeholder="Nome completo do colaborador"
                  />
                </label>

                <label>
                  Senha Inicial
                  <input
                    required
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>

                {/* Instant sector allocation if desired */}
                {(userForm.role === 'FUNCIONARIO' || userForm.role === 'GESTOR') && (
                  <div
                    style={{
                      background: 'var(--primary-soft)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-strong)', textTransform: 'uppercase' }}>
                      ⚡ Alocação Instantânea de Setor
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <label>
                        Vincular ao Setor
                        <select
                          value={userForm.setor_id ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setUserForm(prev => ({
                              ...prev,
                              setor_id: val ? Number(val) : undefined,
                              role_setor: val ? (userForm.role === 'GESTOR' ? 'GESTOR' : 'MEMBRO') : undefined
                            }))
                          }}
                        >
                          <option value="">Não vincular agora</option>
                          {setores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome}
                            </option>
                          ))}
                        </select>
                      </label>

                      {userForm.setor_id && (
                        <label>
                          Função no Setor
                          <select
                            value={userForm.role_setor ?? 'MEMBRO'}
                            onChange={(e) =>
                              setUserForm(prev => ({
                                ...prev,
                                role_setor: e.target.value as RoleSetor,
                              }))
                            }
                          >
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
                  {actionLoading ? 'Processando...' : 'Criar Colaborador'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'setores' && (
            <section className="panel animate-slide-down">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} style={{ color: 'var(--primary)' }} />
                Novo Setor Operacional
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.825rem', margin: '4px 0 20px' }}>
                Crie um novo setor físico ou administrativo para enquadrar trocas de plantões.
              </p>

              <form className="form-grid" onSubmit={handleCreateSetor}>
                <label>
                  Nome do Setor
                  <input
                    required
                    value={setorNome}
                    onChange={(e) => setSetorNome(e.target.value)}
                    placeholder="Ex: UTI Adulto, Pronto Socorro, Pediatria"
                  />
                </label>

                {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>}

                <button className="primary-button" disabled={actionLoading}>
                  {actionLoading ? 'Criando...' : 'Adicionar Setor'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'vinculos' && (
            <section className="panel animate-slide-down">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link size={20} style={{ color: 'var(--primary)' }} />
                Vincular Membro ao Setor
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.825rem', margin: '4px 0 20px' }}>
                Estabeleça o vínculo ativo de um funcionário ou gestor a um determinado setor de atuação.
              </p>

              <form className="form-grid" onSubmit={handleVincularMembro}>
                <label>
                  Selecione o Setor
                  <select required value={linkSetorId} onChange={(e) => setLinkSetorId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} {s.ativo ? '' : '(Inativo)'}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <SearchableSelect
                    label="Colaborador"
                    value={linkProfileId}
                    onChange={setLinkProfileId}
                    options={staffUserOptions}
                    placeholder="Selecione o colaborador..."
                    searchPlaceholder="Buscar por nome ou matrícula..."
                    required
                    emptyMessage="Nenhum colaborador cadastrado"
                  />

                  <label>
                    Função no Setor
                    <select
                      value={linkRoleSetor}
                      onChange={(e) => setLinkRoleSetor(e.target.value as RoleSetor)}
                    >
                      <option value="MEMBRO">MEMBRO</option>
                      <option value="GESTOR">GESTOR DO SETOR</option>
                    </select>
                  </label>
                </div>

                {alertMessage && <div className={alertMessage.error ? 'error-box' : 'info-box'}>{alertMessage.text}</div>}

                <button className="primary-button full-width" disabled={actionLoading}>
                  {actionLoading ? 'Salvando Vínculo...' : 'Registrar Vínculo Operacional'}
                </button>
              </form>
            </section>
          )}

          <PasswordPanel adminMode />
        </div>

        {/* Right Side: Informational Lists */}
        <div>
          {activeTab === 'usuarios' && (
            <section className="panel" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} />
                Contas Operacionais
              </h2>
              {isUsersLoading ? (
                <div>Buscando colaboradores...</div>
              ) : users.length === 0 ? (
                <EmptyState title="Nenhum usuário cadastrado" description="Use o painel para cadastrar colaboradores." />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Matrícula</th>
                        <th>Nome Completo</th>
                        <th>Acesso</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 700 }}>{u.matricula}</td>
                          <td>{u.nome_completo}</td>
                          <td>
                            <span className="badge" style={{ fontSize: '0.65rem' }}>{u.role}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${u.ativo ? 'approved' : 'rejected'}`} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </span>
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
            <section className="panel" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Folder size={20} style={{ color: 'var(--primary)' }} />
                Setores Ativos
              </h2>
              {isSetoresLoading ? (
                <div>Buscando setores...</div>
              ) : setores.length === 0 ? (
                <EmptyState title="Nenhum setor operacional" description="Cadastre setores operacionais para prosseguir." />
              ) : (
                <div className="request-list">
                  {setores.map((s) => (
                    <article className="request-card" key={s.id} style={{ padding: '16px' }}>
                      <div className="request-head" style={{ paddingBottom: '8px', borderBottom: '0' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem' }}>{s.nome}</h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Código ID: #{s.id}</span>
                        </div>
                        <span className={`status-pill ${s.ativo ? 'approved' : 'rejected'}`}>
                          {s.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="request-details" style={{ gridTemplateColumns: '1fr', gap: '8px', padding: '10px 12px' }}>
                        <p style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <span>Gestor Atual:</span>
                          <strong>{s.gestor ? `${s.gestor.nome_completo} (${s.gestor.matricula})` : '⚠️ Sem Gestor'}</strong>
                        </p>
                        <p style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <span>Total de Membros:</span>
                          <strong>{s.total_membros} integrados</strong>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'vinculos' && (
            <section className="panel" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} />
                Visualizar Membros do Setor
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.825rem', marginBottom: '20px' }}>
                Selecione um setor abaixo para gerenciar a lista de membros e desativar vínculos.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label>
                  Escolha o Setor Operacional
                  <select
                    value={selectedSetorId ?? ''}
                    onChange={(e) => setSelectedSetorId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecione um setor...</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} ({s.total_membros} membros)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedSetorId ? (
                isMembrosLoading ? (
                  <div>Buscando membros vinculados...</div>
                ) : selectedSetorMembros.length === 0 ? (
                  <EmptyState
                    title="Setor Sem Membros Vinculados"
                    description="Utilize o formulário de Vínculos de Equipe para alocar membros a este setor."
                    icon="👥"
                  />
                ) : (
                  <div className="table-wrap animate-slide-down">
                    <table>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Matrícula</th>
                          <th>Função</th>
                          <th>Estado</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSetorMembros.map((m) => (
                          <tr key={m.profile_id} style={{ opacity: m.ativo ? 1 : 0.5 }}>
                            <td style={{ fontWeight: 600 }}>{m.nome_completo}</td>
                            <td>{m.matricula}</td>
                            <td>
                              <span className="badge" style={{ fontSize: '0.65rem' }}>{m.role_setor}</span>
                            </td>
                            <td>
                              <span className={`status-pill ${m.ativo ? 'approved' : 'rejected'}`} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
                                {m.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td>
                              {m.ativo ? (
                                <button
                                  type="button"
                                  className="danger-button"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                                  onClick={() => handleDesativarMembro(m.profile_id, selectedSetorId)}
                                  title="Desativar Vínculo"
                                >
                                  <UserX size={13} />
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>Inativo</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <EmptyState
                  title="Aguardando Seleção"
                  description="Selecione um setor operacional acima para listar e desativar membros."
                  icon="🏢"
                />
              )}
            </section>
          )}
        </div>

      </div>
    </Layout>
  )
}