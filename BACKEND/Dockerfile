# Use Node.js 20 Alpine (leve e rápido)
FROM node:20-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package.json package-lock.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm ci --ignore-scripts

# Copiar código fonte
COPY . .

# Build do TypeScript
RUN npm run build

# Remover dependências de dev após o build
RUN npm prune --production

# Expor porta
EXPOSE 3001

# Comando de start
CMD ["npm", "start"]
