# Fluxo do Sistema de Troca de Plantão

A troca de plantão segue esta ordem:

`criar_solicitacao` → `aguardando_cedente` → `cedente_responder` → `pendente` → `gestor_responder` → `aprovado` ou `recusado_gestor`

Se o cedente recusar, o fluxo termina em `recusado_cedente`.

Cancelamento e revogação podem ocorrer em qualquer ponto do fluxo ativo.

# Solicitações
Endpoint: /functions/v1/solicitacoes

```
POST /functions/v1/solicitacoes
Authorization: Bearer <jwt>
Content-Type: application/json
```

Todas as operações usam o mesmo endpoint. O comportamento é definido pelo campo `action`.

## criar_solicitacao

**Quem pode usar:** requisitante

**Body**

```json
{
  "action": "criar_solicitacao",
  "cedente_id": "uuid",
  "setor_id": 1,
  "observacao": "texto opcional",
  "data_requisitante": "2026-06-01",
  "turno_requisitante": "SD",
  "data_cedente": "2026-06-03",
  "turno_cedente": "SN"
}
```

**Turnos disponíveis**

| Turno | Horário | Carga |
| --- | --- | --- |
| `SD` | 07h–19h | 12h |
| `SN` | 19h–07h | 12h |
| `M` | 07h–13h | 6h |
| `T` | 13h–19h | 6h |
| `MT` | 07h–16h / 08h–17h | 9h |
| `P` | 07h–07h | 24h |

**Compatibilidade de turnos**

| Grupo | Turnos compatíveis |
| --- | --- |
| 12h | `SD` ↔︎ `SN` |
| 6h | `M` ↔︎ `T` (e entre iguais) |
| 9h | `MT` ↔︎ `MT` |
| 24h | `P` ↔︎ `P` |

**Regras de negócio**

- O requisitante não pode solicitar troca com ele mesmo.
- O cedente precisa existir e estar ativo.
- O `setor_id` enviado deve pertencer a um setor com `ativo = true`.
- Verifica que o requisitante possui vínculo ativo no `setor_id` enviado.
- `gestor_responsavel_id` é resolvido automaticamente pelo backend: busca o `profile_id` com `role_setor = 'GESTOR'` e `ativo = true` no setor → se não encontrar, retorna erro `SETOR_SEM_GESTOR`.
- `turno_requisitante` e `turno_cedente` devem pertencer ao mesmo grupo de carga horária → se divergir, retorna erro `TURNOS_INCOMPATIVEIS`.
- A solicitação nasce com status `aguardando_cedente`.
- O limite mensal é compartilhado: conta todas as solicitações do mês onde o usuário aparece como `requisitante_id` **ou** `cedente_id`, com status diferente de `cancelado`, `recusado_cedente` ou `recusado_gestor`. Se o total atingir `limite_solicitacoes_mensal` (configurável via `/admin`, padrão 5), retorna erro `LIMITE_MENSAL`.
- O mês de referência do bloqueio é derivado de `data_requisitante`. Se o **requisitante** estiver bloqueado neste setor e mês, retorna erro `USUARIO_BLOQUEADO_MES`. Se o **cedente** estiver bloqueado, também retorna `USUARIO_BLOQUEADO_MES` — com mensagem distinta indicando que o problema é o cedente.
- Se o requisitante possuir `funcao` definida no vínculo do setor, o backend busca a `funcao` do cedente no mesmo setor. Se ambas forem não-nulas e divergirem, retorna erro `FUNCAO_INCOMPATIVEL`. Vínculos sem função cadastrada são ignorados na validação.
- `funcao` é derivada automaticamente do vínculo do requisitante e salva na solicitação — sem campo no body.

**Response 201**

```json
{ "id": 42, "status": "aguardando_cedente" }
```

## cedente_responder

**Quem pode usar:** cedente

**Body**

```json
{
  "action": "cedente_responder",
  "solicitacao_id": 42,
  "aceitar": true
}
```

**Regras de negócio**

- Apenas o cedente da solicitação pode responder.
- Só é permitido responder quando o status for `aguardando_cedente`.
- Se `aceitar = true`, o status vira `pendente`.
- Se `aceitar = false`, o status vira `recusado_cedente`.

**Response 200**

```json
{ "status": "pendente" }
```

ou

```json
{ "status": "recusado_cedente" }
```

## gestor_responder

**Quem pode usar:** gestor responsável

**Body**

```json
{
  "action": "gestor_responder",
  "solicitacao_id": 42,
  "aprovar": true,
  "replica_gestor": "texto opcional"
}
```

**Regras de negócio**

- Apenas o gestor responsável pode responder.
- O gestor só pode responder quando o status for `pendente`.
- Se `aprovar = true`, o status vira `aprovado`, `aprovacao = true` e `respondido_em = now()`.
- Se `aprovar = false`, o status vira `recusado_gestor`, `aprovacao = false` e `respondido_em = now()`.

**Response 200**

```json
{ "status": "aprovado" }
```

ou

```json
{ "status": "recusado_gestor" }
```

## cancelar_solicitacao

**Quem pode usar:** requisitante

**Body**

```json
{
  "action": "cancelar_solicitacao",
  "solicitacao_id": 42
}
```

**Regras de negócio**

- Apenas o requisitante pode cancelar.
- Só é permitido enquanto o status for `aguardando_cedente`.
- Sem necessidade de justificativa.

**Response 200**

```json
{ "status": "cancelado" }
```

## solicitar_revogacao

**Quem pode usar:** requisitante ou cedente

**Body**

```json
{
  "action": "solicitar_revogacao",
  "solicitacao_id": 42,
  "justificativa": "Confundi as datas visualizadas"
}
```

**Regras de negócio**

- Requisitante pode solicitar a partir de `pendente` ou `aprovado`.
- Cedente pode solicitar a partir de `pendente` ou `aprovado`.
- `justificativa` é obrigatória.
- O status anterior é salvo internamente para permitir reversão pelo gestor.
- O status vira `pedido_revogacao`.

**Response 200**

```json
{ "status": "pedido_revogacao" }
```

## responder_revogacao

**Quem pode usar:** gestor responsável

**Body**

```json
{
  "action": "responder_revogacao",
  "solicitacao_id": 42,
  "aceitar": true
}
```

**Regras de negócio**

- Apenas o gestor responsável pode responder.
- Só é permitido quando o status for `pedido_revogacao`.
- Se `aceitar = true`, o status vira `revogado`.
- Se `aceitar = false`, o status volta ao status anterior à solicitação de revogação.

**Response 200**

```json
{ "status": "revogado" }
```

ou

```json
{ "status": "pendente" }
```

## revogar_solicitacao

**Quem pode usar:** gestor responsável

**Body**

```json
{
  "action": "revogar_solicitacao",
  "solicitacao_id": 42,
  "justificativa": "texto opcional"
}
```

**Regras de negócio**

- Apenas o gestor responsável pode revogar.
- Pode ser usado em qualquer status ativo (`aguardando_cedente`, `pendente`, `aprovado`, `pedido_revogacao`).
- Justificativa é opcional.

**Response 200**

```json
{ "status": "revogado" }
```

## listar_solicitacoes

**Quem pode usar:** usuário autenticado

**Body**

```json
{
  "action": "listar_solicitacoes",
  "filtro": "minhas",
  "page": 1,
  "per_page": 20
}
```

**Filtros**

| Filtro | Retorno |
| --- | --- |
| `minhas` | solicitações onde o usuário é o requisitante |
| `cedente` | solicitações onde o usuário é o cedente |
| `pendentes_gestor` | solicitações do gestor com status `pendente` |
| `pedidos_revogacao` | solicitações do gestor com status `pedido_revogacao` |

`page` e `per_page` são opcionais (padrão: page = 1, per_page = 20, máximo per_page = 100).

**Response 200**

```json
{
  "data": [{
    "id": 42,
    "status": "pendente",
    "funcao": "ENFA",
    "requisitante": { "nome_completo": "...", "matricula": "..." },
    "cedente": { "nome_completo": "...", "matricula": "..." },
    "setor": { "id": 1, "nome": "UTI" },
    "observacao": "...",
    "data_requisitante": "2026-06-01",
    "turno_requisitante": "SD",
    "data_cedente": "2026-06-03",
    "turno_cedente": "SN",
    "justificativa_revogacao": null,
    "criado_em": "2026-05-28T21:00:00Z"
  }],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

## contar_solicitacoes_mes

**Quem pode usar:** usuário autenticado

**Body**

```json
{
  "action": "contar_solicitacoes_mes"
}
```

**Regras de negócio**

- Conta todas as solicitações do mês corrente onde o usuário aparece como `requisitante_id` ou `cedente_id`.
- Exclui status `cancelado`, `recusado_cedente` e `recusado_gestor`.
- Retorna também o limite configurado e o mês de referência.

**Response 200**

```json
{
  "utilizadas": 3,
  "limite": 5,
  "mes_referencia": "2026-06"
}
```

## listar_meus_dados

**Quem pode usar:** usuário autenticado

**Body**

```json
{
  "action": "listar_meus_dados"
}
```

**Regras de negócio**

- Retorna o profile do usuário logado e seus vínculos ativos em setores.
- Vínculos inativos não são retornados.
- Retorna também `bloqueios`: array com os bloqueios ativos do mês corrente do usuário logado. Array vazio `[]` se não houver bloqueio.

**Response 200**

```json
{
  "profile": {
    "id": "uuid",
    "matricula": "MAT001",
    "nome_completo": "João Silva",
    "role": "FUNCIONARIO",
    "ativo": true,
    "criado_em": "2026-05-01T00:00:00Z"
  },
  "vinculos": [{
    "setor_id": 1,
    "role_setor": "MEMBRO",
    "funcao": "ENFA",
    "ativo": true,
    "setor": { "id": 1, "nome": "UTI" }
  }],
  "bloqueios": [
    {
      "setor_id": 1,
      "setor_nome": "UTI",
      "mes_referencia": "2026-06",
      "motivo": "Excesso de trocas no período"
    }
  ]
}
```

## listar_solicitacoes_gestor

**Quem pode usar:** gestor responsável

**Body**

```json
{
  "action": "listar_solicitacoes_gestor",
  "status": "aprovado",
  "mes": "2026-06",
  "page": 1,
  "per_page": 20
}
```

**Regras de negócio**

- Retorna todas as solicitações onde o usuário logado é o `gestor_responsavel_id`.
- Ordenado por `criado_em` decrescente.
- `page` e `per_page` são opcionais (padrão: page = 1, per_page = 20, máximo per_page = 100).
- Inclui `aprovacao`, `replica_gestor` e `respondido_em`.
- `status` é opcional — filtra por status específico. Valores aceitos: `aguardando_cedente`, `pendente`, `aprovado`, `recusado_cedente`, `recusado_gestor`, `cancelado`, `pedido_revogacao`, `revogado`.
- `mes` é opcional — formato `YYYY-MM` (ex: `"2026-06"`), filtra por `criado_em`. Os dois filtros são independentes e combináveis.
- Cada item retorna `bloqueado_mes` no objeto `requisitante` e `cedente`, indicando se o usuário está bloqueado neste setor no mês corrente.
- Restrito a usuários com role_setor = 'GESTOR' ativo em algum setor. Retorna 403 FORBIDDEN caso contrário.

**Response 200**

```json
{
  "data": [{
    "id": 42,
    "status": "aprovado",
    "funcao": "ENFA",
    "requisitante": { "id": "uuid", "nome_completo": "...", "matricula": "...", "bloqueado_mes": false },
    "cedente": { "id": "uuid", "nome_completo": "...", "matricula": "...", "bloqueado_mes": true },
    "setor": { "id": 1, "nome": "UTI" },
    "observacao": "...",
    "data_requisitante": "2026-06-01",
    "turno_requisitante": "SD",
    "data_cedente": "2026-06-03",
    "turno_cedente": "SN",
    "justificativa_revogacao": null,
    "aprovacao": true,
    "replica_gestor": null,
    "respondido_em": "2026-06-01T12:00:00Z",
    "criado_em": "2026-05-28T21:00:00Z"
  }],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 10,
    "total_pages": 1
  },
  "counts": {
    "pendente": 3,
    "pedido_revogacao": 2
  }
}
```

## listar_historico_solicitacao

**Quem pode usar:** gestor responsável

**Body**

```json
{
  "action": "listar_historico_solicitacao",
  "solicitacao_id": 42,
  "mes": "2026-06",
  "page": 1,
  "per_page": 50
}
```

**Regras de negócio**

- Apenas o gestor responsável da solicitação pode consultar.
- `page` e `per_page` são opcionais (padrão: `page = 1`, `per_page = 50`, máximo `per_page = 100`).
- Ordenado por `alterado_em` decrescente.
- `mes` é opcional — formato `YYYY-MM` (ex: `"2026-06"`), filtra os registros do histórico por `alterado_em`.

**Response 200**

```json
{
  "data": [{
    "id": 1,
    "status_anterior": "aguardando_cedente",
    "status_novo": "pendente",
    "alterado_em": "2026-06-01T18:00:00Z",
    "alterado_por_profile": { "nome_completo": "Maria Lima", "matricula": "MAT002" }
  }],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 3,
    "total_pages": 1
  }
}
```

## bloquear_usuario_mes

**Quem pode usar:** ADMIN ou GESTOR ativo do setor

**Body**

```json
{
  "action": "bloquear_usuario_mes",
  "profile_id": "uuid",
  "setor_id": 1,
  "mes_referencia": "2026-06",
  "motivo": "texto opcional"
}
```

**Regras de negócio**

- ADMIN pode bloquear em qualquer setor.
- GESTOR só pode bloquear usuários do seu próprio setor (onde possui `role_setor = 'GESTOR'` e `ativo = true`).
- Não é possível bloquear a si mesmo → erro `SELF_REQUEST`.
- O usuário alvo precisa ter vínculo ativo no setor → erro `NOT_FOUND` caso contrário.
- `mes_referencia` deve estar no formato `YYYY-MM`.
- Se já existir bloqueio para o mesmo `(profile_id, setor_id, mes_referencia)` → erro `CONFLICT`.
- `motivo` é opcional.

**Response 200**

```json
{
  "success": true,
  "profile_id": "uuid",
  "setor_id": 1,
  "mes_referencia": "2026-06"
}
```

## desbloquear_usuario_mes

**Quem pode usar:** ADMIN ou GESTOR ativo do setor

**Body**

```json
{
  "action": "desbloquear_usuario_mes",
  "profile_id": "uuid",
  "setor_id": 1,
  "mes_referencia": "2026-06"
}
```

**Regras de negócio**

- ADMIN pode desbloquear em qualquer setor.
- GESTOR só pode desbloquear usuários do seu próprio setor.
- Se o bloqueio não existir → erro `NOT_FOUND`.

**Response 200**

```json
{
  "success": true,
  "profile_id": "uuid",
  "setor_id": 1,
  "mes_referencia": "2026-06"
}
```

---

# Setores
Endpoint: /functions/v1/setores

```
POST /functions/v1/setores
Authorization: Bearer <jwt>
Content-Type: application/json
```

Mesmo padrão da `solicitacoes` — único endpoint com `action` no body.

## criar_setor

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "criar_setor",
  "nome": "UTI"
}
```

**Regras de negócio**

- Somente ADMIN pode criar setores.
- Nome deve ser único.
- Nasce com `ativo = true` e sem gestor.

**Response 201**

```json
{ "id": 1, "nome": "UTI", "ativo": true }
```

## editar_setor

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "editar_setor",
  "setor_id": 1,
  "nome": "Novo Nome"
}
```

**Regras de negócio**

- Somente ADMIN.
- Nome deve ser único — erro `CONFLICT` se já estiver em uso por outro setor.
- Não afeta membros, vínculos ou status `ativo`.

**Response 200**

```json
{ "id": 1, "nome": "Novo Nome", "ativo": true }
```

## desativar_setor

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "desativar_setor",
  "setor_id": 1
}
```

**Regras de negócio**

- Somente ADMIN.
- Define `setores.ativo = false` e desativa todos os vínculos `profiles_setores` do setor automaticamente.
- Bloqueia novas solicitações neste setor (`SETOR_SEM_GESTOR` não se aplica — o setor já não passa na validação `ativo = true`).
- Solicitações já existentes não são afetadas.
- Erro `INVALID_STATUS` se o setor já estiver inativo.

**Response 200**

```json
{ "setor_id": 1, "ativo": false }
```

## reativar_setor

**Quem pode usar:** ADMIN

**Body**

```json
{ "action": "reativar_setor", "setor_id": 1 }
```

**Regras de negócio**

- Somente ADMIN.
- Reativa apenas o setor — vínculos de membros devem ser reativados separadamente via `vincular_membro`.
- Erro `INVALID_STATUS` se o setor já estiver ativo.

**Response 200**

```json
{ "setor_id": 1, "ativo": true }
```

## vincular_membro

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "vincular_membro",
  "profile_id": "uuid",
  "setor_id": 1,
  "role_setor": "MEMBRO",
  "funcao": "ENFA"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `profile_id` | ✅ | UUID do usuário |
| `setor_id` | ✅ | ID do setor |
| `role_setor` | ✅ | `MEMBRO` ou `GESTOR` |
| `funcao` | ⚪ opcional | Código da função profissional. Deve existir em `tipos_funcao` ativo. |

**Regras de negócio**

- Somente ADMIN.
- Se `role_setor = 'GESTOR'`: valida que não existe outro gestor ativo no setor → erro `SETOR_GESTOR_DUPLICADO`.
- Se o vínculo já existir com `ativo = false`: reativa em vez de inserir duplicata.
- Código de `funcao` inválido ou inativo → erro `FUNCAO_INVALIDA`.

**Response 201**

```json
{ "profile_id": "uuid", "setor_id": 1, "role_setor": "GESTOR", "funcao": "ENFA", "ativo": true }
```

## desativar_membro

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "desativar_membro",
  "profile_id": "uuid",
  "setor_id": 1
}
```

**Regras de negócio**

- Somente ADMIN.
- Faz `ativo = false` no vínculo, não deleta.
- Histórico preservado.

**Response 200**

```json
{ "profile_id": "uuid", "setor_id": 1, "ativo": false }
```

## listar_setores

**Quem pode usar:** qualquer usuário autenticado

**Body**

```json
{
  "action": "listar_setores"
}
```

**Regras de negócio**

- ADMIN vê todos os setores (ativos e inativos).
- GESTOR e MEMBRO veem apenas os setores onde possuem vínculo ativo.

**Response 200**

```json
[{
  "id": 1,
  "nome": "UTI",
  "ativo": true,
  "gestor": { "nome_completo": "João Silva", "matricula": "MAT001" },
  "total_membros": 8
}]
```

## listar_membros_setor

**Quem pode usar:** ADMIN e membros do setor

**Body**

```json
{
  "action": "listar_membros_setor",
  "setor_id": 1
}
```

**Regras de negócio**

- ADMIN vê qualquer setor.
- Qualquer membro com vínculo ativo no setor pode listar.
- Usuários sem vínculo no setor não têm acesso.
- Retorna `bloqueado_mes` e `bloqueio` por membro, com base no mês corrente. `bloqueio` é `null` quando `bloqueado_mes = false`.

**Response 200**

```json
[{
  "profile_id": "uuid",
  "nome_completo": "Maria Lima",
  "matricula": "MAT002",
  "role_setor": "MEMBRO",
  "funcao": "ENFA",
  "ativo": true,
  "bloqueado_mes": true,
  "bloqueio": {
    "mes_referencia": "2026-06",
    "motivo": "Excesso de trocas no período"
  }
}]
```

---

# ADMIN
Endpoint: /functions/v1/admin

```
POST /functions/v1/admin
Authorization: Bearer <jwt>
Content-Type: application/json
```

Exclusivo para usuários com `role = 'ADMIN'`. Concentra operações privilegiadas de gerenciamento de usuários, configurações e funções profissionais.

## listar_usuarios

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "listar_usuarios",
  "page": 1,
  "per_page": 20,
  "ativo": true,
  "role": "FUNCIONARIO"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `page` | ⚪ opcional | Número da página. Padrão: `1` |
| `per_page` | ⚪ opcional | Itens por página. Padrão: `20`, máximo: `100` |
| `ativo` | ⚪ opcional | Filtra por status do usuário: `true` ou `false` |
| `role` | ⚪ opcional | Filtra por role global: `"ADMIN"`, `"GESTOR"` ou `"FUNCIONARIO"` |

**Regras de negócio**

- Somente ADMIN.
- Retorna todos os profiles com email e último login vindos do auth.
- Não expõe `encrypted_password` nem tokens internos.
- `ativo` e `role` são independentes e combináveis.
- Sem filtros, retorna todos os usuários paginados.

**Response 200**

```json
{
  "data": [{
    "id": "uuid",
    "nome_completo": "João Silva",
    "matricula": "MAT001",
    "role": "FUNCIONARIO",
    "ativo": true,
    "email": "joao@stp.interno",
    "ultimo_login": "2026-06-01T10:00:00Z",
    "criado_em": "2026-05-01T00:00:00Z"
  }],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 85
  }
}
```

## resetar_senha

**Body**

```json
{
  "action": "resetar_senha",
  "profile_id": "uuid",
  "nova_senha": "senha123"
}
```

**Regras de negócio**

- Somente ADMIN.
- `nova_senha` obrigatória, mínimo 6 caracteres.
- Senha definida diretamente via Auth Admin API — sem envio de email.
- O usuário pode trocar a senha no próximo login.
- Após o reset bem-sucedido, todas as sessões ativas do usuário são revogadas automaticamente.

**Response 200**

```json
{ "success": true }
```

## ativar_usuario

**Body**

```json
{
  "action": "ativar_usuario",
  "profile_id": "uuid"
}
```

**Regras de negócio**

- Somente ADMIN.
- Define `profiles.ativo = true`.
- Não afeta vínculos de setor (devem ser reativados separadamente via `setores`).

**Response 200**

```json
{ "profile_id": "uuid", "ativo": true }
```

## desativar_usuario

**Body**

```json
{
  "action": "desativar_usuario",
  "profile_id": "uuid"
}
```

**Regras de negócio**

- Somente ADMIN.
- Define `profiles.ativo = false`.
- Admin não pode desativar a si mesmo → erro `SELF_DEACTIVATION`.
- Desativa também todos os vínculos profiles_setores do usuário automaticamente.
- Se o usuário era GESTOR de algum setor, a resposta inclui `aviso` e `setores_sem_gestor` — os setores afetados ficam sem gestor ativo e novas solicitações nesses setores serão bloqueadas até que um novo gestor seja vinculado.
- Não deleta o usuário — histórico de solicitações preservado.

**Response 200 — sem aviso**

```json
{ "profile_id": "uuid", "ativo": false }
```

**Response 200 — com aviso (usuário era gestor)**

```json
{
  "profile_id": "uuid",
  "ativo": false,
  "aviso": "Usuário era gestor de setor(es) que agora ficaram sem gestor ativo.",
  "setores_sem_gestor": [
    { "setor_id": 1, "nome": "UTI" }
  ]
}
```

## editar_usuario

**Body**

```json
{
  "action": "editar_usuario",
  "profile_id": "uuid",
  "nome_completo": "Novo Nome",
  "matricula": "MAT999",
  "setor_id": 1,
  "funcao": "TEC"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `profile_id` | ✅ | UUID do usuário a editar |
| `nome_completo` | ⚪ opcional | 10–64 caracteres |
| `matricula` | ⚪ opcional | 4–12 caracteres |
| `setor_id` | ⚪ opcional | Obrigatório quando `funcao` é enviado |
| `funcao` | ⚪ opcional | Código da função. `setor_id` obrigatório. Vínculo deve existir e estar ativo. |

**Regras de negócio**

- Somente ADMIN.
- Ao menos um campo (`nome_completo`, `matricula` ou `funcao`) deve ser informado.
- Matrícula deve ser única — erro `MATRICULA_DUPLICADA` se já estiver em uso por outro usuário.
- Matrícula é normalizada para UPPERCASE e deve ter entre 4 e 12 caracteres.
- Ao alterar a matrícula, o email no sistema de autenticação é sincronizado automaticamente para `{nova_matricula.toLowerCase()}@stp.interno`.
- Não afeta vínculos de setor, senha ou status `ativo` (exceto `funcao` via `setor_id`).
- `funcao` exige `setor_id` → erro `INVALID_PAYLOAD` caso contrário.
- Código de `funcao` inválido ou inativo → erro `FUNCAO_INVALIDA`.
- Vínculo inexistente ou inativo ao atualizar `funcao` → erro `NOT_FOUND`.

**Response 200**

```json
{
  "id": "uuid",
  "matricula": "MAT999",
  "nome_completo": "Novo Nome",
  "role": "FUNCIONARIO",
  "ativo": true
}
```

## listar_configuracoes

**Body**

```json
{ "action": "listar_configuracoes" }
```

**Regras de negócio**

- Somente ADMIN.
- Retorna todas as linhas da tabela `configuracoes`.

**Response 200**

```json
[{
  "chave": "limite_solicitacoes_mensal",
  "valor": "5",
  "descricao": "Limite de solicitações por funcionário por mês",
  "atualizado_em": "2026-06-01T10:00:00Z"
}]
```

## atualizar_configuracao

**Body**

```json
{
  "action": "atualizar_configuracao",
  "chave": "limite_solicitacoes_mensal",
  "valor": "10"
}
```

**Regras de negócio**

- Somente ADMIN.
- Só permite atualizar chaves que já existem — não cria novas chaves.
- `valor` é sempre string; a função que consome converte para o tipo correto.
- Atualiza `atualizado_em = now()`.

**Response 200**

```json
{
  "chave": "limite_solicitacoes_mensal",
  "valor": "10",
  "atualizado_em": "2026-06-01T10:30:00Z"
}
```

## listar_historico_admin

**Body**

```json
{
  "action": "listar_historico_admin",
  "page": 1,
  "per_page": 50
}
```

**Regras de negócio**

- Somente ADMIN.
- Retorna todo o histórico de mudanças de status de todas as solicitações.
- `page` e `per_page` são opcionais (padrão: `page = 1`, `per_page = 50`, máximo `per_page = 100`).
- Ordenado por `alterado_em` decrescente.

**Response 200**

```json
{
  "data": [{
    "id": 1,
    "status_anterior": "aguardando_cedente",
    "status_novo": "pendente",
    "alterado_em": "2026-06-01T18:00:00Z",
    "solicitacao": { "id": 42, "setor": { "nome": "UTI" } },
    "alterado_por_profile": { "nome_completo": "Maria Lima", "matricula": "MAT002" }
  }],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 10,
    "total_pages": 1
  }
}
```

## criar_funcao

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "criar_funcao",
  "codigo": "ENFA",
  "descricao": "Enfermeiro(a)"
}
```

**Regras de negócio**

- Somente ADMIN.
- `codigo` normalizado para UPPERCASE, 2–10 caracteres.
- `descricao` obrigatória.
- Erro `FUNCAO_DUPLICADA` se o código já existir.

**Response 201**

```json
{
  "codigo": "ENFA",
  "descricao": "Enfermeiro(a)",
  "ativo": true,
  "criado_em": "2026-07-04T00:00:00Z"
}
```

## listar_funcoes

**Quem pode usar:** ADMIN

**Body**

```json
{ "action": "listar_funcoes" }
```

**Regras de negócio**

- Somente ADMIN.
- Retorna todas as funções ordenadas por `codigo`, incluindo inativas.

**Response 200**

```json
[{
  "codigo": "ENFA",
  "descricao": "Enfermeiro(a)",
  "ativo": true,
  "criado_em": "2026-07-04T00:00:00Z"
}]
```

## desativar_funcao

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "desativar_funcao",
  "codigo": "ENFA"
}
```

**Regras de negócio**

- Somente ADMIN.
- Não bloqueia a operação mesmo se houver vínculos ativos usando a função.
- Retorna `aviso` e `vinculos_ativos` quando houver vínculos afetados — o ADMIN deve revisá-los manualmente.
- Erro `NOT_FOUND` se o código não existir.
- Erro `INVALID_STATUS` se a função já estiver inativa.

**Response 200 — sem vínculos afetados**

```json
{ "codigo": "ENFA", "ativo": false }
```

**Response 200 — com aviso**

```json
{
  "codigo": "ENFA",
  "ativo": false,
  "aviso": "3 vínculo(s) ativo(s) ainda usam esta função. Revise os vínculos manualmente.",
  "vinculos_ativos": 3
}
```
## reativar_funcao

**Quem pode usar:** ADMIN

**Body:**
```json
{ "action": "reativar_funcao", "codigo": "ENFA" }
```

**Regras de negócio**
- Somente ADMIN.
- `codigo` normalizado para UPPERCASE antes da busca.
- Se a função não existir → erro `NOT_FOUND`.
- Se a função já estiver ativa → erro `INVALID_STATUS`.
- Define `ativo = true`.

**Response `200`:**
```json
{ "codigo": "ENFA", "descricao": "Enfermagem A", "ativo": true }
```
## editar_funcao

**Quem pode usar:** ADMIN

```json
{
  "action": "editar_funcao",
  "codigo": "ENFA",
  "descricao": "Novo texto"
}
```

**Regras de negócio**
- Somente ADMIN.
- `codigo` normalizado para UPPERCASE antes da busca.
- `descricao` obrigatória.
- Se a função não existir → erro `NOT_FOUND`.
- `descricao` já em uso por outro `codigo` → erro `FUNCAO_DUPLICADA`.
- Reenviar a mesma descrição existente não dispara erro.
- Não afeta `ativo`, `criado_em` nem vínculos.

**Response 200**
```json
{ "codigo": "ENFA", "descricao": "Novo texto", "ativo": true }
```
## `atribuir_funcao_massa`

**Quem pode usar:** ADMIN

**Body:**
```json
{
  "action": "atribuir_funcao_massa",
  "profile_ids": ["uuid1", "uuid2", "uuid3"],
  "setor_id": 1,
  "funcao": "ENFA"
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `profile_ids` | ✅ | Array de UUIDs dos usuários |
| `setor_id` | ✅ | ID do setor onde os vínculos serão atualizados |
| `funcao` | ✅ | Código da função profissional. Deve existir em `tipos_funcao` e estar ativo. |

**Regras de negócio**
- Somente ADMIN.
- `funcao` deve existir em `tipos_funcao` com `ativo = true` → erro `FUNCAO_INVALIDA`.
- `setor_id` deve corresponder a um setor com `ativo = true` → erro `NOT_FOUND`.
- Apenas vínculos com `ativo = true` no setor são atualizados.
- Usuários sem vínculo ativo no setor são ignorados com aviso — não geram erro.
- Se nenhum dos `profile_ids` possuir vínculo ativo no setor → erro `NOT_FOUND`.

**Response 200 — todos atualizados:**
```json
{
  "atualizados": 3,
  "setor_id": 1,
  "funcao": "ENFA"
}
```

**Response 200 — com usuários ignorados:**
```json
{
  "atualizados": 2,
  "setor_id": 1,
  "funcao": "ENFA",
  "aviso": "1 usuário(s) ignorado(s) por não possuírem vínculo ativo neste setor.",
  "sem_vinculo": ["uuid3"]
}
```

---

# Histórico de Solicitações
Tabela interna: `solicitacoes_historico`

Toda mudança de status em uma solicitação é registrada automaticamente via trigger de banco. Não há endpoint público para escrita — o histórico é gerenciado exclusivamente pelo backend.

## Estrutura

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | bigint | identificador do registro |
| `solicitacao_id` | bigint | referência à solicitação |
| `status_anterior` | status_solicitacao | status antes da mudança (`null` na criação) |
| `status_novo` | status_solicitacao | status após a mudança |
| `alterado_por` | uuid | `profile_id` de quem executou a ação |
| `alterado_em` | timestamptz | momento da mudança |

## Regras

- Preenchido automaticamente pelo trigger `trg_log_status_solicitacao` a cada `UPDATE` na tabela `solicitacoes`.
- `alterado_por` é populado via coluna `updated_by` da solicitação, que as Edge Functions preenchem com o `user.id` do token JWT.
- Acesso direto bloqueado por RLS — leitura disponível apenas via `SERVICE_ROLE_KEY`.

---

# Bloqueios de Troca
Tabela interna: `bloqueios_troca_mes`

Controla usuários impedidos de participar de trocas (como requisitante ou cedente) em um setor específico durante um mês.

## Estrutura

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | bigint | identificador do registro |
| `profile_id` | uuid | usuário bloqueado |
| `setor_id` | int | setor onde o bloqueio se aplica |
| `mes_referencia` | text | mês no formato `YYYY-MM` |
| `motivo` | text | justificativa (opcional) |
| `bloqueado_por` | uuid | `profile_id` de quem aplicou o bloqueio |
| `criado_em` | timestamptz | momento do bloqueio |

## Regras

- Unique constraint em `(profile_id, setor_id, mes_referencia)` — um bloqueio por pessoa por setor por mês.
- O bloqueio impede o usuário de aparecer como **requisitante ou cedente** em novas solicitações naquele setor e mês.
- Bloqueios não afetam solicitações já existentes.
- O mês de referência é derivado de `data_requisitante` no momento da criação da solicitação.
- Gerenciado via actions `bloquear_usuario_mes` e `desbloquear_usuario_mes` em `/functions/v1/solicitacoes`.

---

# Funções Profissionais
Tabela: `tipos_funcao`

Representa as funções institucionais que os profissionais exercem nos setores (ex: Enfermeiro, Técnico de Enfermagem, Recepcionista).

## Estrutura

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `codigo` | text (PK) | Código da função em UPPERCASE (ex: `ENFA`, `TEC`) |
| `descricao` | text | Nome descritivo da função |
| `ativo` | boolean | Se a função pode ser usada em novos vínculos |
| `criado_em` | timestamptz | Data de criação |

## Regras

- Gerenciada exclusivamente pelo ADMIN via actions `criar_funcao`, `listar_funcoes` e `desativar_funcao`.
- Vinculada a `profiles_setores.funcao` e `solicitacoes.funcao`.
- Desativar uma função não remove vínculos existentes — apenas impede novos usos.
- A validação de compatibilidade em trocas considera apenas funções ativas e não-nulas.

---

# Erros padrão

```json
{
  "error": "mensagem legível",
  "code": "CODIGO_INTERNO"
}
```

| Código | HTTP | Uso |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | token ausente ou inválido |
| `FORBIDDEN` | 403 | usuário não pode executar a ação |
| `INVALID_STATUS` | 422 | status atual não permite a operação |
| `NOT_FOUND` | 404 | solicitação ou recurso não encontrado |
| `INVALID_PAYLOAD` | 400 | body inválido |
| `SELF_REQUEST` | 400 | requisitante e cedente são a mesma pessoa |
| `SETOR_SEM_GESTOR` | 422 | setor não possui gestor ativo |
| `SETOR_GESTOR_DUPLICADO` | 409 | já existe um gestor ativo neste setor |
| `TURNOS_INCOMPATIVEIS` | 422 | turnos com cargas horárias diferentes |
| `CONFLICT` | 409 | nome de setor duplicado / bloqueio já existente |
| `LIMITE_MENSAL` | 422 | usuário atingiu o limite de solicitações do mês |
| `SELF_DEACTIVATION` | 403 | admin tentou desativar a si mesmo |
| `MATRICULA_DUPLICADA` | 409 | matrícula já está em uso por outro usuário |
| `USUARIO_BLOQUEADO_MES` | 422 | requisitante ou cedente está bloqueado para trocas neste mês neste setor |
| `FUNCAO_INCOMPATIVEL` | 422 | requisitante e cedente têm funções diferentes no setor |
| `FUNCAO_INVALIDA` | 400 | código não existe em `tipos_funcao` ou está inativo |
| `FUNCAO_DUPLICADA` | 409 | código já existe em `tipos_funcao` |
| `FUNCAO_DUPLICADA` | 409 | código **ou descrição** já existe em `tipos_funcao` |

---

# Status

| Status | Significado |
| --- | --- |
| `aguardando_cedente` | Solicitação criada e aguardando resposta do cedente |
| `pendente` | Cedente aceitou e agora aguarda o gestor |
| `aprovado` | Gestor aprovou a troca |
| `recusado_cedente` | Cedente recusou a troca |
| `recusado_gestor` | Gestor recusou a troca |
| `cancelado` | Requisitante cancelou antes do cedente responder |
| `pedido_revogacao` | Requisitante ou cedente solicitou cancelamento ao gestor |
| `revogado` | Gestor revogou a solicitação |
