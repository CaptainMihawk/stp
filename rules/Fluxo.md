A troca de plantão segue esta ordem:

`criar_solicitacao` → `aguardando_cedente` → `cedente_responder` → `pendente` → `gestor_responder` → `aprovado` ou `recusado_gestor`

Se o cedente recusar, o fluxo termina em `recusado_cedente`.

Cancelamento e revogação podem ocorrer em qualquer ponto do fluxo ativo.

---
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

- Requisitante pode solicitar a partir de `aguardando_cedente`, `pendente` ou `aprovado`.
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
|`page` e `per_page` | são opcionais (padrão: page = 1, per_page = 20, máximo per_page = 100).

**Response 200**

```json
{
  "data": [{
    "id": 42,
    "status": "pendente",
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
    "ativo": true,
    "setor": { "id": 1, "nome": "UTI" }
  }]
}
```


## listar_solicitacoes_gestor

**Quem pode usar:** gestor responsável

**Body**

```json
{
  "action": "listar_solicitacoes_gestor",
  "page": 1,
  "per_page": 20
}
```

**Regras de negócio**

- Retorna todas as solicitações onde o usuário logado é o `gestor_responsavel_id`.
- Sem filtro de status — retorna todos os estados (ativo, encerrado, revogado).
- Ordenado por `criado_em` decrescente.
- `page`e `per_page` são opcionais (padrão: page = 1, per_page = 20, máximo per_page = 100).
- Inclui `aprovacao`, `replica_gestor` e `respondido_em`.

**Response 200**

```json
{
  "data": [{
    "id": 42,
    "status": "aprovado",
    "requisitante": { "nome_completo": "...", "matricula": "..." },
    "cedente": { "nome_completo": "...", "matricula": "..." },
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
  "page": 1,
  "per_page": 50
}
```

**Regras de negócio**

- Apenas o gestor responsável da solicitação pode consultar.
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


---
# Setores
Endpoint: /functions/v1/setores

```
POST /functions/v1/setores
Authorization: Bearer <jwt>
Content-Type: application/json
```

Mesmo padrão da `solicitacoes` — único endpoint com `action` no body.

### criar_setor

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

### vincular_membro

**Quem pode usar:** ADMIN

**Body**

```json
{
  "action": "vincular_membro",
  "profile_id": "uuid",
  "setor_id": 1,
  "role_setor": "MEMBRO"
}
```

**Regras de negócio**

- Somente ADMIN.
- Se `role_setor = 'GESTOR'`: valida que não existe outro gestor ativo no setor → erro `SETOR_GESTOR_DUPLICADO`.
- Se o vínculo já existir com `ativo = false`: reativa em vez de inserir duplicata.

**Response 201**

```json
{ "profile_id": "uuid", "setor_id": 1, "role_setor": "GESTOR", "ativo": true }
```

### desativar_membro

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

### listar_setores

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

### listar_membros_setor

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

**Response 200**

```json
[{
  "profile_id": "uuid",
  "nome_completo": "Maria Lima",
  "matricula": "MAT002",
  "role_setor": "MEMBRO",
  "ativo": true
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

Exclusivo para usuários com `role = 'ADMIN'`. Concentra operações privilegiadas de gerenciamento de usuários e configurações.

### listar_usuarios

**Body**

```json
{ "action": "listar_usuarios" }
```

**Regras de negócio**

- Somente ADMIN.
- Retorna todos os profiles com email e último login vindos do auth.
- Não expõe `encrypted_password` nem tokens internos.

**Response 200**

```json
[{
  "id": "uuid",
  "nome_completo": "João Silva",
  "matricula": "MAT001",
  "role": "FUNCIONARIO",
  "ativo": true,
  "email": "joao@stp.interno",
  "ultimo_login": "2026-06-01T10:00:00Z",
  "criado_em": "2026-05-01T00:00:00Z"
}]
```

### resetar_senha

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
- `nova_senha` obrigatória, mínimo 8 caracteres.
- Senha definida diretamente via Auth Admin API — sem envio de email.
- O usuário pode trocar a senha no próximo login.

**Response 200**

```json
{ "success": true }
```

### ativar_usuario

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

### desativar_usuario

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
- Não deleta o usuário — histórico de solicitações preservado.

**Response 200**

```json
{ "profile_id": "uuid", "ativo": false }
```

### listar_configuracoes

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

### atualizar_configuracao

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

### listar_historico_admin

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
| `CONFLICT` | 409 | nome de setor duplicado |
| `LIMITE_MENSAL` | 422 | usuário atingiu o limite de solicitações do mês |
| `SELF_DEACTIVATION` | 403 | admin tentou desativar a si mesmo |

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