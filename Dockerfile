# Use Node.js 20 Alpine
FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files do BACKEND
COPY BACKEND/package.json BACKEND/package-lock.json ./

# Instalar dependências
RUN npm ci --ignore-scripts

# Copiar código fonte do BACKEND
COPY BACKEND/ .

# Build do TypeScript
RUN npm run build

# Remover dependências de dev
RUN npm prune --production

# Expor porta
EXPOSE 3001

# Comando de start
CMD ["npm", "start"]
