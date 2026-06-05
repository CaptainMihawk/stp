# STP - Sistema de Troca de Plantão

## Ambiente de Desenvolvimento

Este projeto usa **Dev Containers** para garantir um ambiente de desenvolvimento isolado e consistente.

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/)
- [Extensão Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) (`ms-vscode-remote.remote-containers`)

### Como usar

1. Abra o projeto no VS Code
2. Pressione `F1` e selecione **Dev Containers: Reopen in Container**
3. Aguarde a construção do container (primeira vez pode levar alguns minutos)
4. O terminal abrirá automaticamente dentro do container com `npm install` já executado

### Comandos disponíveis

```bash
npm run dev       # Inicia o servidor de desenvolvimento (porta 5173)
npm run build     # Compila o projeto para produção
npm run lint      # Executa o linter
npm run preview   # Previsualiza a build de produção
npm run deploy    # Deploy para GitHub Pages
```

### Estrutura do Dev Container

- **Imagem base:** `mcr.microsoft.com/devcontainers/typescript-node:22` (Node.js 22 LTS)
- **Extensões VS Code:** ESLint, Prettier
- **Porta exposta:** 5173 (Vite Dev Server)
- **Volume:** `node_modules` em volume separado para performance

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_AUTH_DOMAIN=@stp.interno
```
