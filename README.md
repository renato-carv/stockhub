# StockHub

Sistema completo de gestão de estoque com assistente de IA integrado, desenvolvido como projeto de portfólio e aprendizado.

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-e0234e?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)

## Screenshots

<details>
<summary>Landing Page</summary>

![Landing](docs/screenshots/landing.jpeg)
</details>

<details>
<summary>Dashboard</summary>

![Dashboard](docs/screenshots/dashboard.jpeg)
</details>

<details>
<summary>Produtos</summary>

![Produtos](docs/screenshots/products.jpeg)
</details>

<details>
<summary>Movimentações</summary>

![Movimentações](docs/screenshots/movements.jpeg)
</details>

<details>
<summary>Chat com IA (Hubi)</summary>

![Chat](docs/screenshots/chat.jpeg)
</details>

## Funcionalidades

- **Dashboard** - Visão geral com métricas, alertas de estoque baixo, atividade recente e resumo financeiro
- **Produtos** - CRUD completo com importação/exportação em massa (Excel), código de barras, SKU e controle de estoque mínimo/máximo
- **Movimentações** - Registro de entradas, saídas e ajustes com rastreabilidade (estoque anterior/novo) e histórico por usuário
- **Categorias** - Organização de produtos com cores e importação/exportação
- **Relatórios** - Análise ABC, tendências de estoque e exportação em PDF/Excel
- **Chat com IA (Hubi)** - Assistente inteligente com streaming em tempo real que consulta dados do seu estoque
- **Equipes** - Multi-tenancy com organizações, equipes e controle de permissões (Owner/Admin/Member)
- **Autenticação** - Login com e-mail/senha, Google e GitHub, com refresh token automático
- **Dark mode** - Tema claro e escuro

## Stack

### Frontend

- **Angular 21** - Standalone Components + Signals
- **TypeScript 5.9**
- **Chart.js** - Gráficos e visualizações
- **ngx-markdown** - Renderização de markdown nas respostas da IA
- **Lucide** - Biblioteca de ícones
- **xlsx / file-saver** - Exportação de planilhas

### Backend

- **NestJS** - Framework Node.js
- **Prisma ORM** - Acesso ao banco de dados
- **PostgreSQL** - Banco de dados relacional
- **Server-Sent Events (SSE)** - Streaming de respostas da IA

## Como rodar

### Pre-requisitos

- Node.js 18+
- npm
- PostgreSQL
- Backend ([stockhub-api](link-do-repo-backend)) rodando em `http://localhost:4000`

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/stockhub.git

# Instale as dependências
cd stockhub
npm install

# Inicie o servidor de desenvolvimento
npm start
```

A aplicação estará disponível em `http://localhost:4200`.

### Build

```bash
npm run build
```

## Arquitetura

```
src/app/
├── core/
│   ├── services/          # Serviços (auth, product, chat, etc.)
│   ├── interceptors/      # Interceptor HTTP com refresh token
│   └── guards/            # Guards de rota (auth, guest, team-admin)
├── features/
│   ├── landing/           # Landing page
│   ├── login/             # Login
│   ├── register/          # Registro
│   ├── home/              # Dashboard
│   ├── product/           # Gestão de produtos
│   ├── category/          # Categorias
│   ├── movement/          # Movimentações de estoque
│   ├── reports/           # Relatórios
│   ├── chat/              # Chat com IA
│   ├── team/              # Gestão de equipes
│   └── settings/          # Configurações
├── shared/components/     # Componentes reutilizáveis
└── layout/                # Layout principal (sidebar + header)
```

## Licenca

Este projeto foi desenvolvido para fins de aprendizado e portfólio.
