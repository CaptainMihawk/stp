# Admin Page Rework — Design Spec

**Data:** 2026-07-04
**Status:** Aprovado pelo usuário
**Escopo:** Rework completo da página de administração (UX, UI, decomposição de componentes)

---

## Problema

O `AdminPage.tsx` atual (1415 linhas) é um componente monolítico com 5 tabs, 25+ `useState`, e uma grid `1.5fr:1fr` que mistura forms e listas lado a lado sem hierarquia clara. O resultado é uma tela confusa, difícil de navegar e impossível de manter.

## Solução

Sidebar admin dedicada + 6 rotas separadas via react-router, com visual clean/profissional e decomposição completa em componentes menores.

---

## 1. Arquitetura de Rotas e Navegação

### Rotas

| Rota | Componente | Descrição |
|---|---|---|
| `/admin` | `AdminDashboard` | Cards de resumo + ações rápidas |
| `/admin/users` | `AdminUsers` | CRUD de usuários |
| `/admin/sectors` | `AdminSectors` | CRUD de setores + vínculos |
| `/admin/functions` | `AdminFunctions` | CRUD de funções profissionais |
| `/admin/settings` | `AdminSettings` | Configurações do sistema |
| `/admin/history` | `AdminHistory` | Auditoria global |

### Sidebar Admin

- **Posição:** Fixa à esquerda dentro do `app-shell`
- **Itens:** 6 com ícone lucide-react + label
  - `LayoutDashboard` → Dashboard
  - `Users` → Usuários
  - `Building2` → Setores
  - `Briefcase` → Funções
  - `Settings` → Configurações
  - `ScrollText` → Histórico
- **Desktop:** sidebar visível, largura ~220px
- **Mobile (`< 768px`):** sidebar colapsada, toggle hamburger, overlay slide-in
- **Estado ativo:** `primary` color + fundo sutil no item selecionado
- **Logout:** botão no rodapé da sidebar

### Hierarquia de Layout

```
app-shell
├── mobile-header (já existe)
├── sidebar (NOVA - admin, condicional a role === 'ADMIN')
│   ├── logo/branding
│   ├── nav items (6 rotas)
│   └── logout button
└── main-content
    └── page-content (max-width: 960px)
```

---

## 2. Dashboard (`/admin`)

### Cards de Resumo (grid 2-3 colunas desktop, 1 mobile)

| Card | Ícone | Dado | Ação |
|---|---|---|---|
| Usuários Ativos | `Users` | Contagem de profiles ativos | → `/admin/users` |
| Setores Ativos | `Building2` | Contagem de setores ativos | → `/admin/sectors` |
| Solicitações no Mês | `FileText` | Total do mês corrente | → `/admin/history` |
| Funções Cadastradas | `Briefcase` | Total de funções ativas | → `/admin/functions` |
| Setores sem Gestor | `AlertTriangle` | Setores com gestor = null (vermelho se > 0) | → `/admin/sectors` |
| Limite Mensal | `Settings` | Valor de `limite_solicitacoes_mensal` | → `/admin/settings` |

### Ações Rápidas

Botões abaixo dos cards:
- **Criar Usuário** → `/admin/users` com formulário aberto
- **Criar Setor** → `/admin/sectors` com formulário aberto
- **Vincular Membro** → `/admin/sectors` com formulário de vínculo aberto

### Dados

Lazy loading via:
- `listarUsuarios()` → filtra ativos, conta
- `listarSetores()` → conta ativos, identifica sem gestor
- `listarConfiguracoes()` → lê `limite_solicitacoes_mensal`
- `listarFuncoes()` → conta ativas
- `listarHistoricoAdmin(1, 100)` → conta solicitações do mês corrente (usa `pagination.total` como estimativa; endpoint não tem count dedicado)

### Visual

- Cards com `var(--panel-bg)`, `border-radius: 12px`, sombra sutil
- Ícone grande à esquerda, número + label à direita
- Hover: `transform: translateY(-2px)`

---

## 3. Páginas de Gestão

### Layout Padrão

```
┌─────────────────────────────────────┐
│ Header (título + ícone + botão     │
│         "Novo [item]" à direita)   │
├─────────────────────────────────────┤
│ Filtros (search + dropdowns)        │
├─────────────────────────────────────┤
│ Lista / Tabela                      │
├─────────────────────────────────────┤
│ Paginação (se aplicável)            │
└─────────────────────────────────────┘
```

Max-width: 960px, centralizado, padding 24px desktop / 16px mobile.

### 3a. Usuários (`/admin/users`)

**Header:** "Usuários" + `+ Novo Usuário`

**Formulário de criação:** Modal overlay (padrão `modal-overlay > modal-content` já existente):
- Matrícula, Nome Completo, Senha Inicial, Role (FUNCIONARIO/ADMIN)
- Se FUNCIONARIO: Setor (dropdown), Role no Setor (MEMBRO/GESTOR), Função (SearchableSelect)

**Filtros:** Search (nome/matrícula) + Role + Status (ativo/inativo)

**Paginação:** Server-side via API (`page`, `per_page`). O endpoint `listar_usuarios` já retorna metadata de paginação — o rework deve utilizá-lo corretamente (hoje o front carrega tudo numa lista flat).

**Tabela:**

| Coluna | Largura | Conteúdo |
|---|---|---|
| Matrícula | fixa | Bold |
| Nome | flex | Semibold |
| Role | fixa | Badge (ADMIN vermelho, FUNCIONARIO azul) |
| Setor(es) | flex | Tags com nomes |
| Status | fixa | Badge verde/cinza |
| Ações | fixa | Editar, Reset Senha, Ativar/Desativar |

**Ações:** Editar (modal), Reset Senha (modal), Desativar (ConfirmDialog com aviso)

### 3b. Setores (`/admin/sectors`)

**Header:** "Setores" + `+ Novo Setor`

**Formulário:** Dois cards lado a lado (desktop) ou empilhados (mobile):
- Card "Criar Setor": campo nome + botão criar
- Card "Vincular Membro": Setor (dropdown) → Membro (SearchableSelect) → Role → Função → botão vincular

**Lista de setores:** Cards em grid (2 colunas desktop, 1 mobile)

```
┌──────────────────────────┐
│ UTI          [Ativo badge]│
│ Gestor: João Silva        │
│ Membros: 8                │
│ [Editar] [Desativar]      │
└──────────────────────────┘
```

**Expansão de membros:** Tabela ao clicar no card:
Nome | Matrícula | Papel | Função | Status | Ação (desativar vínculo)

### 3c. Funções (`/admin/functions`)

**Header:** "Funções Profissionais" + `+ Nova Função`

**Formulário:** Código (auto-uppercase, máx 10) + Descrição

**Tabela:** Código | Descrição | Status | Ação (desativar)

**Aviso:** Banner se houver vínculos ativos ao desativar

---

## 4. Configurações e Histórico

### 4a. Configurações (`/admin/settings`)

**Layout:** Cards empilhados (não tabela)

```
┌──────────────────────────────────────┐
│ Limite de Solicitações Mensais       │
│ Controle quantas trocas cada         │
│ funcionário pode fazer por mês       │
│                                      │
│ [5]  ← input inline + salvar        │
│ Atualizado em: 01/06/2026 10:30      │
└──────────────────────────────────────┘
```

Cada card: título + descrição + input + botão salvar + timestamp.

### 4b. Histórico (`/admin/history`)

**Header:** "Auditoria de Solicitações"

**Filtros:** Search por ID + Status dropdown + Período

**Tabela:**

| Coluna | Conteúdo |
|---|---|
| Data/Hora | pt-BR formatado |
| Solicitação | `#42` |
| Setor | Nome |
| De → Para | Badge status antigo → novo |
| Responsável | Nome + matrícula |

**Paginação:** Server-side (`page`, `per_page`)

---

## 5. Decomposição de Componentes

### Estrutura de arquivos

```
src/
  components/
    admin/
      AdminLayout.tsx        — Sidebar + wrapper de rota
      AdminSidebar.tsx       — Navegação sidebar
      AdminDashboard.tsx     — Dashboard
      AdminUsers.tsx         — Página usuários
      AdminSectors.tsx       — Página setores
      AdminFunctions.tsx     — Página funções
      AdminSettings.tsx      — Página configurações
      AdminHistory.tsx       — Página histórico
      UserForm.tsx           — Form criar/editar usuário
      UserTable.tsx          — Tabela listagem usuários
      SectorCard.tsx         — Card setor
      SectorMembers.tsx      — Tabela membros do setor
      SectorLinkForm.tsx     — Form vincular membro
      FunctionForm.tsx       — Form criar função
      FunctionTable.tsx      — Tabela listagem funções
      ConfigCard.tsx         — Card configuração
      HistoryTable.tsx       — Tabela histórico
      StatCard.tsx           — Card métrica dashboard
  pages/
    AdminPage.tsx            — Redireciona para /admin (roateguard)
```

### Responsabilidades

| Componente | Estado Local | Props |
|---|---|---|
| `AdminLayout` | Nenhum | `children`, `profile` |
| `AdminSidebar` | Nenhum | `currentPath` |
| `AdminDashboard` | Loading states | — |
| `AdminUsers` | `users[]`, `searchTerm`, `roleFilter`, `statusFilter`, `showForm` | — |
| `UserForm` | Campos do form | `onSubmit`, `onCancel`, `initialData?` |
| `UserTable` | Nenhum | `users[]`, `onEdit`, `onResetPassword`, `onToggleActive` |
| `AdminSectors` | `setores[]`, `selectedSetorId`, `membros[]`, `showForm` | — |
| `SectorCard` | Nenhum | `setor`, `onEdit`, `onToggleActive`, `onViewMembers` |
| `SectorMembers` | Nenhum | `membros[]`, `onDeactivate` |
| `SectorLinkForm` | Campos do form | `setores[]`, `onSubmit` |
| `AdminFunctions` | `funcoes[]`, `showForm` | — |
| `FunctionForm` | Campos do form | `onSubmit` |
| `FunctionTable` | Nenhum | `funcoes[]`, `onDeactivate` |
| `AdminSettings` | `configs[]`, `editingKey` | — |
| `ConfigCard` | `editValue` | `config`, `onSave` |
| `AdminHistory` | `entries[]`, `page`, `totalPages`, `filters` | — |
| `HistoryTable` | Nenhum | `entries[]`, `pagination`, `onPageChange` |
| `StatCard` | Nenhum | `icon`, `label`, `value`, `href?`, `alert?` |

### Componentes reutilizados

- `ConfirmDialog` — existente, reutilizar
- `SearchableSelect` — existente, reutilizar
- `EmptyState` — existente, reutilizar
- `Toast` — existente, reutilizar
- **Novo:** `SkeletonRow` — loading para tabelas

### Serviços

Sem mudança — `adminService.ts` e `setoresService.ts` já expõem todas as funções necessárias.

---

## 6. Estilo Visual

### Diretriz

Visual clean e profissional, menos glassmorphism, mais whitespace, tipografia limpa.

### Específicos

- **Cards:** `var(--panel-bg)`, `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- **Inputs:** borda 1px `var(--border)`, `border-radius: 8px`, focus ring azul sutil
- **Badges:** `border-radius: 6px`, padding 2px 8px, font-size 0.75rem
- **Tabelas:** sem bordas externas, linhas separadas por `border-bottom: 1px solid var(--border)`
- **Headers:** `font-family: var(--font-heading)` (Outfit), peso 600
- **Espaçamento:** 24px desktop, 16px mobile entre seções
- **Transições:** `transition: all 0.15s ease` em interactive elements

### Tema

Manter suporte a light/dark via `stp-theme` no localStorage e variáveis CSS existentes.

---

## 7. Invariantes

- `role === 'ADMIN'` é requisito para acessar qualquer rota `/admin/*`
- Services e Edge Functions não são alterados
- `ConfirmDialog` existente é reutilizado (não duplicado)
- `Toast` para feedback em todas as mutações
- Loading states em todas as listas
- Empty states em todas as tabelas
- Mobile-first: tudo funciona em 320px+

## 8. Áreas Afetadas

| Área | Impacto |
|---|---|
| Frontend (rotas) | Novas rotas em `App.tsx`, roteamento admin |
| Frontend (componentes) | Novos componentes em `src/components/admin/` |
| Frontend (estilos) | Novos estilos admin em `styles.css` |
| Frontend (AdminPage) | Substituído por redirect + componentes |
| Backend | Nenhum |
| API | Nenhuma |
| Persistência | Nenhuma |
| Autenticação | Nenhuma (já existe role check) |

## 9. Risco de Regressão

- **Baixo** — mudança é puramente de UI/rotas
- Services existentes não são alterados
- Fluxo de dados (effects, chamadas API) permanece o mesmo
- Risco principal: quebra de navegação se rotas não forem configuradas corretamente no `App.tsx`
