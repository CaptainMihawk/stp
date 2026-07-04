export type Role = 'ADMIN' | 'FUNCIONARIO'

export type RoleSetor = 'MEMBRO' | 'GESTOR'

export type StatusSolicitacao =
  | 'aguardando_cedente'
  | 'pendente'
  | 'aprovado'
  | 'recusado_cedente'
  | 'recusado_gestor'
  | 'cancelado'
  | 'pedido_revogacao'
  | 'revogado'

export type Turno = 'SD' | 'SN' | 'M' | 'T' | 'MT' | 'P'

export interface Profile {
  id: string
  matricula: string
  nome_completo: string
  role: Role
  ativo: boolean
  criado_em: string
}

export interface Setor {
  id: number
  nome: string
  ativo: boolean
  criado_em: string
}

export interface ProfileSetor {
  profile_id: string
  setor_id: number
  role_setor: RoleSetor
  ativo: boolean
  criado_em: string
}

/** Vínculo ativo do usuário logado com um setor (sem profile_id redundante). */
export interface VinculoSetor {
  setor_id: number
  role_setor: RoleSetor
  funcao?: string
  ativo: boolean
  setor?: Setor
}

export interface TipoFuncao {
  codigo: string
  descricao: string
  ativo: boolean
  criado_em: string
}

export interface Solicitacao {
  id: number
  requisitante_id: string
  cedente_id: string
  gestor_responsavel_id: string
  setor_id: number | null
  data_requisitante: string     
  turno_requisitante: Turno
  data_cedente: string
  turno_cedente: Turno
  observacao: string | null
  status: StatusSolicitacao
  aprovacao: boolean | null      
  replica_gestor: string | null
  criado_em: string
  respondido_em: string | null
}

/** Bloqueio de troca mensal — impede usuário de participar como requisitante ou cedente. */
export interface BloqueioTrocaMes {
  id: number
  profile_id: string
  setor_id: number
  mes_referencia: string // formato YYYY-MM
  motivo: string | null
  bloqueado_por: string
  criado_em: string
  setor_nome?: string // opcional, para exibição
}