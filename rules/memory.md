# STP — Memória de Contexto do Projeto

> **Propósito:** Fonte densa de contexto para sessões futuras.
> **Atualize ao final de cada sessão** sempre que descobrir novo padrão, decisão de arquitetura ou correção de comportamento.

---

## Stack

- **React 19** + TypeScript 6 + Vite 8
- **Supabase** (Auth + Edge Functions + Realtime + RLS)
- **react-router-dom 7** (SPA, sem loaders/actions — tudo em useEffect)
- **lucide-react** (ícones)
- **gh-pages** (deploy: `npm run deploy` → base `/stp/`)
- CSS puro (design system em `styles.css`, sem framework CSS)
- **`src/lib/useActivityLog.ts`** — Hook React com `useSyncExternalStore` → `{ entries, clear }`.
- **Integração automática**: `errors.ts` (handleError/logSuccess) e `Toast.tsx` (addToast) já disparam para o activityLog.
- **`ActivityLogPanel`** — Componente global no `Layout.tsx`. Botão FAB no canto inferior direito. Painel lateral (slide-in) com filtros por nível e lista detalhada.
- **Estilos**: `.activity-log-fab`, `.activity-log-panel`, `.activity-log-entry`, etc. em `styles.css`.

## Estrutura

```
src/
  components/     — UI reutilizável (Layout, Sidebar, Tabs, RequestCard, etc.)
  contexts/       — AuthContext, ThemeContext, PortalViewContext
  pages/          — LoginPage, AdminPage, FuncionarioPage, GestorPage, StaffPortal, PasswordPanel
  services/       — callEdgeFunction wrapper + adminService, setoresService, solicitacoesService
  lib/            — types.ts, supabase.ts, turnos.ts, solicitacaoRules.ts, sessionExpiry.ts
rules/            — Fluxo.md (API), AUTH.md (auth), memory.md (este)
```

## Auth & Roles

- Login via matrícula: `{matricula}@stp.interno` (config `VITE_AUTH_DOMAIN`)
- **Role global** (`profiles.role`): `ADMIN | FUNCIONARIO` — controle de acesso a páginas
- **Role de setor** (`profiles_setores.role_setor`): `GESTOR | MEMBRO` — papel operacional DENTRO do setor
- São **independentes**: FUNCIONARIO pode ser GESTOR de um setor (define `isGestorSetor`)
- ADMIN → `AdminPage`; demais → `StaffPortal` (que decide entre `FuncionarioPage` ou `GestorPage` baseado em `isGestorSetor`)
- `ProtectedArea` em `App.tsx`: se `profile.role === 'ADMIN'` → `<AdminPage />`, senão → `<StaffPortal />`
- `StaffPortal`: se `!isGestorSetor` → `FuncionarioPage`, senão → `PortalViewProvider` com toggle `funcionario`/`gestor`
- Senha: mínimo **6 caracteres** no front, **8 caracteres** no admin reset
- `SessionExpiryHint`: tick a cada 30s, mostra tempo restante do JWT

## Fluxo de Solicitações

```
criar_solicitacao → aguardando_cedente → cedente_responder → pendente → gestor_responder → aprovado/recusado_gestor
                                        ↘ recusado_cedente
Cancelamento: só em aguardando_cedente, só requisitante
Revogação: gestor revoga direto; req/cedente pedem → gestor responde
```

### Status terminais (não mudam mais)
`recusado_cedente | recusado_gestor | cancelado | revogado`

### Regras de negócio (front-end em `solicitacaoRules.ts`)
- `podeCancelar`: requisitante + `aguardando_cedente`
- `podeSolicitarRevogacao`: req/cedente + (`pendente` | `aprovado`)
- `podeGestorHomologar`: `pendente`
- `podeGestorResponderRevogacao`: `pedido_revogacao`
- `podeGestorRevogar`: qualquer status ativo (`aguardando_cedente`, `pendente`, `aprovado`, `pedido_revogacao`)

### Turnos e compatibilidade
| Grupo | Turnos |
|-------|--------|
| 12h | SD ↔ SN |
| 6h | M ↔ T (e entre iguais) |
| 9h | MT ↔ MT |
| 24h | P ↔ P |

`TurnoSelect` filtra turnos compatíveis automaticamente quando `compatibleWith` é passado.

## Serviços & Edge Functions

- **Único endpoint por domínio**: `POST /functions/v1/{solicitacoes|setores|admin|create-user}` com `action` no body
- `callEdgeFunction`: helper que injeta JWT + anon key query param (CORS workaround)
  - Retry automático (2x) para `readOnly: true` — evita executar escrita 2x
  - Timeout de 8s via AbortController
- **Listagem de colegas**: usa `listar_membros_setor` (edge function bypassa RLS) — funcionários não têm SELECT direto na tabela
- `listarSolicitacoesComoGestor`: retorna TODAS as solicitações do gestor (sem filtro de status)

## Padrões de Código

- **Data fetching**: `useEffect` + `async` functions declaradas dentro do componente (não react-router loaders)
- **Realtime**: `supabase.channel('...').on('postgres_changes', ...)` com **debounce de 500ms** para evitar chamadas duplicadas
- **Loading states**: `actionLoadingId` (number | null) para ações individuais; booleans para listas
- **Formatação data**: `formatDate` (ISO → DD/MM/AAAA) e `formatDateTime` (pt-BR locale) duplicadas em FuncionarioPage e GestorPage
- **Participant ID**: `p.id ?? p.profile_id ?? ''` — edge function retorna `id` ou `profile_id` dependendo do endpoint
- **Filtro mensal**: nativo no front-end (filter por `criado_em`), não no backend
- **Admin histórico**: carregado sob demanda (só quando aba é acessada); trata erro 400 como "não implementado"
- **Alertas**: `alertMessage` único com `{ text, error }` — sobrescreve, sem pilha (substituído por Toast + ConfirmDialog)
- **ConfirmDialog**: `src/components/ConfirmDialog.tsx` — substitui `window.confirm()` em toda a app. Props: `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `confirmClass`, `loading`, `onConfirm`, `onCancel`. Usa `role="alertdialog"`, fecha com Escape, overlay com animação. Estilos em `styles.css` (`.confirm-overlay`, `.confirm-dialog`, etc.)
- **AdminPage**: usa `confirmState` unificado para 4 confirmações (desativar usuário, desativar setor, reativar setor, desativar vínculo)
- **RequestCard**: usa `cancelConfirmOpen` local para cancelar solicitação
- **Editar usuário**: modal inline na tabela de usuários (✏️); envia só campos alterados; trata `MATRICULA_DUPLICADA`
- **Editar/desativar setor**: botões ✏️/🗑️ nos cards de setor; modal inline para edição; confirm dialog para desativar
- **Validação de campos**: `validateUserFields()` compartilhada (matrícula 4–12, nome 10–64) — usada em criar e editar usuário

## Configurações

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_DOMAIN` (default `@stp.interno`)
- `base: '/stp/'` no vite.config (gh-pages)
- `limite_solicitacoes_mensal`: configurável via admin (padrão 5)
- `noUnusedLocals` + `noUnusedParameters` no tsconfig (strict)
- ESLint: `set-state-in-effect` desligado (padrão do app)

## CSS / Design System

- Variáveis CSS em `:root` + `.dark` (light/dark via `stp-theme` no localStorage)
- Fontes: Inter (body) + Outfit (headings) — Google Fonts
- Glassmorphism sutil (`.glass-bg`, `--glass-blur`)
- Layout: `app-shell` (mobile header + sidebar drawer + main content)
- Sidebar: overlay + slide-in em mobile, fixa em desktop
- Login: gradiente radial + glow effects

## Build / Deploy

```bash
npm run build    # tsc -b && vite build — sempre rodar antes de entregar alterações
npm run deploy   # build + gh-pages -d dist -t
```

## Convenções

- Nomes de arquivos: PascalCase para componentes, camelCase para lib/services
- Serviços exportam funções nomeadas (não default)
- Tipos em `types.ts`; interfaces específicas de serviço co-localizadas
- `error-box` / `info-box` para feedback visual
- `primary-button` para CTAs
