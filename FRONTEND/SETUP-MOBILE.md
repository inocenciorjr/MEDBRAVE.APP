# 📱 Configuração para Testar no Celular

## Problema
O celular não consegue acessar `localhost:5000` porque localhost se refere ao próprio dispositivo.

## Solução

### 1. Descubra o IP da sua máquina

**Windows:**
```bash
ipconfig
```
Procure por "Endereço IPv4" na seção da sua rede (WiFi ou Ethernet).
Exemplo: `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig
```
ou
```bash
ip addr show
```

### 2. Configure a variável de ambiente

Crie um arquivo `.env.local` na pasta `frontend/` com:

```env
NEXT_PUBLIC_API_URL=http://SEU_IP_AQUI:5000/api
```

Exemplo:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000/api
```

### 3. Configure o Backend para aceitar conexões externas

O backend precisa escutar em `0.0.0.0` ao invés de `localhost`.

No arquivo de configuração do backend, altere:
```javascript
// De:
app.listen(5000, 'localhost')

// Para:
app.listen(5000, '0.0.0.0')
```

### 4. Reinicie o Frontend

```bash
npm run dev
```

### 5. Acesse do celular

No celular, acesse:
```
http://SEU_IP_AQUI:3000
```

Exemplo:
```
http://192.168.1.100:3000
```

## ⚠️ Importante

- Certifique-se de que o celular está na **mesma rede WiFi** que o PC
- Desative o firewall temporariamente ou adicione exceções para as portas 3000 e 5000
- Não commite o arquivo `.env.local` (já está no .gitignore)

## 🚀 Para Produção

Quando for hospedar, configure:

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api
```
