# Fix: Corrigir labels "Função" → "Perfil" para role_setor

## Contexto

Após implementação das funções profissionais, dois selects de `role_setor` (MEMBRO/GESTOR) estão incorretamente rotulados como "Função no Setor". A terminologia correta:

- **Perfil** = alocação no sistema (ADMIN/FUNCIONARIO/GESTOR) E papel no setor (MEMBRO/GESTOR)
- **Função** = função profissional (ENFA, TEC, etc.) — vem de `tipos_funcao` no backend

A tabela de membros e os cards já estão corretos — apenas os 2 formulários de label errado.

## Tarefa

### Task 1: Corrigir label no form de criar usuário

**File:** `src/pages/AdminPage.tsx` ~linha 702

Trocar:
```tsx
Função no Setor
```
Por:
```tsx
Perfil no Setor
```

### Task 2: Corrigir label no form de vincular membro

**File:** `src/pages/AdminPage.tsx` ~linha 768

Trocar:
```tsx
Função no Setor
```
Por:
```tsx
Perfil no Setor
```

## Validação

- `npx tsc --noEmit` deve passar sem erros
- `npm run build` deve compilar
- Verificar que não há mais labels "Função" aplicados a `role_setor` em nenhum componente
