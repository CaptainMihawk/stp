# Fluxo

A troca de plantão segue esta ordem:

`criar_solicitacao` → `aguardando_cedente` → `cedente_responder` → `pendente` → `gestor_responder` → `aprovado` ou `recusado_gestor`

Se o cedente recusar, o fluxo termina em `recusado_cedente`.

Cancelamento e revogação podem ocorrer em qualquer ponto do fluxo ativo.

## Status

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

---

## Endpoint: /functions/v1/solicitacoes

```
POST /functions/v1/solicitacoes
Authorization: Bearer <jwt>
Content-Type: application/json
```

Todas as operações usam o mesmo endpoint. O comportamento é definido pelo campo `action`.

### criar_solicitacao

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
- Verifica que o requisitante possui vínculo ativo no `setor_id` enviado.
- `gestor_responsavel_id` é resolvido automaticamente pelo backend: busca o `profile_id` com `role_setor = 'GESTOR'` e `ativo = true` no setor → se não encontrar, retorna erro `SETOR_SEM_GESTOR`.
- `turno_requisitante` e `turno_cedente` devem pertencer ao mesmo grupo de carga horária → se divergir, retorna erro `TURNOS_INCOMPATIVEIS`.
- A solicitação nasce com status `aguardando_cedente`.

**Response 201**

```json
{ "id": 42, "status": "aguardando_cedente" }
```

### cedente_responder

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

### gestor_responder

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

### cancelar_solicitacao

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

### solicitar_revogacao

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

### responder_revogacao

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

### revogar_solicitacao

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

### listar_solicitacoes

**Quem pode usar:** usuário autenticado

**Body**

```json
{
  "action": "listar_solicitacoes",
  "filtro": "minhas"
}
```

**Filtros**

| Filtro | Retorno |
| --- | --- |
| `minhas` | solicitações onde o usuário é o requisitante |
| `cedente` | solicitações onde o usuário é o cedente |
| `pendentes_gestor` | solicitações do gestor com status `pendente` |
| `pedidos_revogacao` | solicitações do gestor com status `pedido_revogacao` |

**Response 200**

```json
[{
  "id": 42,
  "status": "pendente",
  "requisitante": { "nome_completo": "...", "matricula": "..." },
  "cedente": { "nome_completo": "...", "matricula": "..." },
  "observacao": "...",
  "data_requisitante": "2026-06-01",
  "turno_requisitante": "SD",
  "data_cedente": "2026-06-03",
  "turno_cedente": "SN",
  "justificativa_revogacao": null,
  "criado_em": "2026-05-28T21:00:00Z"
}]
```

---

## Endpoint: /functions/v1/setores

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

**Quem pode usar:** ADMIN e GESTOR do setor

**Body**

```json
{
  "action": "listar_membros_setor",
  "setor_id": 1
}
```

**Regras de negócio**

- ADMIN vê qualquer setor.
- GESTOR só vê membros do próprio setor.
- MEMBRO não tem acesso.

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

## Erros padrão

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
| `NOT_FOUND` | 404 | solicitação não encontrada |
| `INVALID_PAYLOAD` | 400 | body inválido |
| `SELF_REQUEST` | 400 | requisitante e cedente são a mesma pessoa |
| `SETOR_SEM_GESTOR` | 422 | setor não possui gestor ativo |
| `SETOR_GESTOR_DUPLICADO` | 409 | já existe um gestor ativo neste setor |
| `TURNOS_INCOMPATIVEIS` | 422 | turnos com cargas horárias diferentes |
| `CONFLICT` | 409 | nome de setor duplicado |