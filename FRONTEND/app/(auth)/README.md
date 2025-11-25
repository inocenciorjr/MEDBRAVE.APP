# Autenticação - MEDBRAVE

## Estrutura

Este diretório contém as páginas de autenticação do MEDBRAVE, organizadas em um route group `(auth)` do Next.js 13+.

### Páginas

- `/login` - Página de login para administradores

### Layout

O layout de autenticação (`layout.tsx`) é minimalista e não inclui sidebar ou header, focando apenas no formulário de autenticação.

## Design System

Todas as páginas de autenticação seguem o design system do MEDBRAVE Admin:

### Componentes Utilizados
- `AdminCard` - Card principal do formulário
- `AdminInput` - Campos de entrada com validação
- `AdminButton` - Botão de submit com loading state

### Cores e Estilos
- Background: `bg-background-light` / `bg-background-dark`
- Textos: `text-text-light-primary` / `text-text-dark-primary`
- Ícones: Material Symbols
- Fontes: Inter (font-inter)

## Fluxo de Autenticação

```
1. Usuário acessa /login
   ↓
2. Preenche email e senha
   ↓
3. Submit do formulário
   ↓
4. Supabase.auth.signInWithPassword()
   ↓
5. Se sucesso: redireciona para redirect param ou /admin
   Se erro: mostra mensagem de erro
```

## Parâmetros de URL

### redirect
Especifica para onde redirecionar após login bem-sucedido.

Exemplo: `/login?redirect=/admin/questions`

## Segurança

- Autenticação via Supabase Auth
- Tokens JWT armazenados de forma segura
- Verificação de role no backend
- Proteção contra CSRF
- Rate limiting no backend

## Próximas Funcionalidades

- [ ] Recuperação de senha
- [ ] Autenticação de dois fatores (2FA)
- [ ] Login com Google/Microsoft
- [ ] Registro de novos administradores
- [ ] Histórico de logins

## Desenvolvimento

Para testar localmente:

```bash
# Acessar página de login
http://localhost:3000/login

# Com redirect
http://localhost:3000/login?redirect=/admin/users
```

## Manutenção

Ao adicionar novas páginas de autenticação:

1. Criar dentro de `app/(auth)/`
2. Usar componentes do design system (`@/components/admin/ui`)
3. Seguir o padrão de layout minimalista
4. Documentar no README
