# AUTH

## Visão geral

Toda autenticação do sistema usa o Supabase Auth com JWT. O ADMIN é o único responsável por criar e gerenciar usuários — não existe auto-cadastro.

---

## Endpoint: `/functions/v1/create-user`

**Quem pode usar:** ADMIN

```
POST /functions/v1/create-user
Authorization: Bearer <jwt-do-admin>
Content-Type: application/json
```

### Body

```json
{
  "matricula": "12345",
  "nome_completo": "Maria Lima da Silva",
  "password": "senha123",
  "role": "FUNCIONARIO",
  "setor_id": 1,
  "role_setor": "MEMBRO"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `matricula` | ✅ | 4–12 caracteres. Usada para gerar o email de login |
| `nome_completo` | ✅ | 15–64 caracteres |
| `password` | ✅ | Senha inicial definida pelo ADMIN |
| `role` | ✅ | Role global: `ADMIN`, `GESTOR` ou `FUNCIONARIO` |
| `setor_id` | ⚪ opcional | ID do setor para vínculo imediato |
| `role_setor` | ⚪ opcional | `MEMBRO` ou `GESTOR` — obrigatório se `setor_id` for enviado |

**Regras de negócio**

- Apenas ADMIN pode chamar este endpoint.
- O email de login é gerado automaticamente: `{matricula}@stp.interno`.
- `setor_id` e `role_setor` devem ser enviados juntos ou nenhum dos dois.
- Se `role_setor = 'GESTOR'`: valida que não existe outro gestor ativo no setor → erro `SETOR_GESTOR_DUPLICADO`.
- Se o vínculo com setor falhar, o usuário criado no Auth é removido (rollback).
- `role` global e `role_setor` são **independentes**: um `FUNCIONARIO` pode ser `GESTOR` de um setor.

**Response 201**

```json
{
  "success": true,
  "user_id": "uuid",
  "email": "12345@stp.interno",
  "setor": { "setor_id": 1, "role_setor": "MEMBRO" }
}
```

`setor` é `null` quando nenhum vínculo foi criado.

---

## Login

O login é feito diretamente pelo cliente Supabase — sem endpoint customizado.

```jsx
const { data, error } = await supabase.auth.signInWithPassword({
  email: `${matricula}@stp.interno`,
  password: senha
})

const jwt = data.session.access_token
```

O JWT retornado deve ser enviado no header `Authorization: Bearer <jwt>` em todas as chamadas às Edge Functions.

---

## Roles

### Role global — `profiles.role`

Define o nível de acesso administrativo do usuário no sistema.

| Role | Descrição |
| --- | --- |
| `ADMIN` | Gerencia usuários, setores e vínculos. Acesso total. |
| `GESTOR` | ~~Role informativo — o papel operacional de gestor é definido por `role_setor`.~~ |
| `FUNCIONARIO` | Usuário padrão do sistema. |

### Role de setor — `profiles_setores.role_setor`

Define o papel do usuário **dentro de um setor específico**.

| Role | Descrição |
| --- | --- |
| `GESTOR` | Responde pelas solicitações de troca do setor. |
| `MEMBRO` | Pode criar e participar de solicitações de troca. |

Um usuário pode ser `GESTOR` em um setor e `MEMBRO` em outro simultaneamente.

---

## Vincular usuário a setor após criação

Se o usuário foi criado sem setor, o ADMIN pode vinculá-lo depois via `/functions/v1/setores` com `action: vincular_membro`.  Verifique o link abaixo para detalhes.

[STP](https://app.notion.com/p/STP-36e9a164745580efa39bee437afb1790?pvs=21)

---

## Erros

```json
{
  "error": "mensagem legível",
  "code": "CODIGO_INTERNO"
}
```

| Código | HTTP | Uso |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | Token ausente ou inválido |
| `FORBIDDEN` | 403 | Chamador não é ADMIN |
| `INVALID_PAYLOAD` | 400 | Campo inválido ou ausente |
| `CONFLICT` | 409 | Matrícula já cadastrada |
| `SETOR_GESTOR_DUPLICADO` | 409 | Já existe gestor ativo no setor |
| `INTERNAL_ERROR` | 500 | Erro ao salvar perfil ou vínculo (com rollback) |