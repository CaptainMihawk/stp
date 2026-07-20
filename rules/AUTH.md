Visão geral

Toda autenticação do sistema usa o Supabase Auth com JWT. O ADMIN é o único responsável por criar e gerenciar usuários — não existe auto-cadastro.

---

# Criar Usuários
Endpoint: `/functions/v1/create-user`

**Quem pode usar:** ADMIN

```
POST /functions/v1/create-user
Authorization: Bearer <jwt-do-admin>
Content-Type: application/json
```

**Body**

```json
{
  "matricula": "12345",
  "nome_completo": "Maria Lima da Silva",
  "password": "senha123",
  "role": "FUNCIONARIO",
  "setor_id": 1,
  "role_setor": "MEMBRO",
  "funcao": "ENFA"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `matricula` | ✅ | 4–12 caracteres. Usada para gerar o email de login |
| `nome_completo` | ✅ | 10–64 caracteres |
| `password` | ✅ | Senha inicial definida pelo ADMIN |
| `role` | ✅ | Role global: `ADMIN` ou `FUNCIONARIO` |
| `setor_id` | ⚪ opcional | ID do setor para vínculo imediato |
| `role_setor` | ⚪ opcional | `MEMBRO` ou `GESTOR` — obrigatório se `setor_id` for enviado |
| `funcao` | ⚪ opcional | Código da função profissional. Só válido junto com `setor_id`. Deve existir em `tipos_funcao` ativo. |

**Regras de negócio**

- Apenas ADMIN pode chamar este endpoint.
- A matrícula é normalizada para UPPERCASE antes de salvar.
- O email de login é gerado automaticamente: `{matricula.toLowerCase()}@stp.interno`.
- `setor_id` e `role_setor` devem ser enviados juntos ou nenhum dos dois.
- Se o vínculo com setor falhar, o usuário criado no Auth é removido (rollback).
- `role` global e `role_setor` são **independentes**: um `FUNCIONARIO` pode ser `GESTOR` de um setor.
- `funcao` é obrigatoriamente acompanhada de `setor_id` → erro `INVALID_PAYLOAD` caso contrário.
- Código de `funcao` inválido ou inativo → erro `FUNCAO_INVALIDA`.

**Response 201**

```json
{
  "success": true,
  "user_id": "uuid",
  "email": "12345@stp.interno",
  "setor": { "setor_id": 1, "role_setor": "MEMBRO", "funcao": "ENFA" }
}
```

`setor` é `null` quando nenhum vínculo foi criado.

---

# Login

Endpoint: `/functions/v1/login`

```
POST /functions/v1/login
Content-Type: application/json
```

**Body**

```json
{
  "matricula": "12345",
  "password": "senha123"
}
```

O login usa um endpoint customizado que resolve o email real do usuário internamente — não monte o email no cliente. Isso garante que mudanças de matrícula não quebrem o acesso.

**Regras de negócio**

- Matrícula é case-insensitive: `mat01`, `MAT01` e `Mat01` são equivalentes.
- Após 10 tentativas com falha em 15 minutos, a conta é bloqueada por 15 minutos → erro `TOO_MANY_REQUESTS`.
- Tentativas com matrícula inexistente também contam para o bloqueio (evita enumeração).
- Usuário inativo retorna `USER_INACTIVE` mesmo com credenciais corretas.

**Response 200**

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "matricula": "12345",
    "nome_completo": "Maria Lima da Silva",
    "role": "FUNCIONARIO"
  }
}
```

O `access_token` deve ser enviado no header `Authorization: Bearer <token>` em todas as chamadas às Edge Functions.

---

# Roles

### Role global — `profiles.role`

Define o nível de acesso administrativo do usuário no sistema.

| Role | Descrição |
| --- | --- |
| `ADMIN` | Gerencia usuários, setores e vínculos. Acesso total. |
| `FUNCIONARIO` | Usuário padrão do sistema. |

### Role de setor — `profiles_setores.role_setor`

Define o papel do usuário **dentro de um setor específico**.

| Role | Descrição |
| --- | --- |
| `GESTOR` | Responde pelas solicitações de troca do setor. |
| `MEMBRO` | Pode criar e participar de solicitações de troca. |

Um usuário pode ser `GESTOR` em um setor e `MEMBRO` em outro simultaneamente.

### Função profissional — `profiles_setores.funcao`

Define a função institucional do usuário dentro de um setor específico. Gerenciada via tabela `tipos_funcao`.

- É independente de `role` e `role_setor`.
- Um usuário pode ter funções diferentes em setores diferentes.
- Usada para validar compatibilidade em trocas: apenas trocas entre profissionais da mesma função são permitidas (quando ambos possuem função definida).
- Gerenciada pelo ADMIN via actions `criar_funcao`, `listar_funcoes` e `desativar_funcao` em `/admin`.

---

# Vincular usuário a setor após criação

Se o usuário foi criado sem setor, o ADMIN pode vinculá-lo depois via `/functions/v1/setores` com `action: vincular_membro`. Verifique o fluxo para mais informações.

---

# Erros

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
| `FUNCAO_INVALIDA` | 400 | Código não existe em `tipos_funcao` ou está inativo |
| `INTERNAL_ERROR` | 500 | Erro ao salvar perfil ou vínculo (com rollback) |
| `INVALID_CREDENTIALS` | 401 | Matrícula ou senha inválidos |
| `USER_INACTIVE` | 403 | Conta desativada |
| `TOO_MANY_REQUESTS` | 429 | Limite de tentativas atingido |
