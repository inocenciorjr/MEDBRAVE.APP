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
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --omit=dev --ignore-scripts

# Copiar código fonte
COPY . .

# Build do TypeScript
RUN npm run build

# Expor porta
EXPOSE 3001

# Comando de start
CMD ["npm", "start"]
