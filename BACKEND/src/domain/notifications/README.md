# Módulo de Notificações

## Descrição

O módulo de Notificações implementa um sistema completo de gerenciamento de notificações para os usuários da plataforma MedPulse Academy. Ele permite o envio de notificações individuais ou em massa, através de diferentes canais (in-app, email, push), com suporte para prioridades, expiração e metadados adicionais.

## Funcionalidades Principais

- Gestão de notificações com diferentes tipos e prioridades
- Sistema de entrega em múltiplos canais (in-app, email, push)
- Marcação de leitura de notificações
- Gerenciamento de dispositivos para push notifications
- Envio de notificações em massa para grupos de usuários
- Suporte para expiração automática de notificações

## Componentes

### Tipos

- `NotificationType`: Enum com os tipos de notificação (SYSTEM, PAYMENT, USER, etc.)
- `NotificationPriority`: Enum com os níveis de prioridade (LOW, MEDIUM, HIGH, URGENT)
- `NotificationChannel`: Enum com os canais de entrega (IN_APP, EMAIL, PUSH, SMS)
- `Notification`: Interface principal que define a estrutura de uma notificação
- `Device`: Interface que define a estrutura de um dispositivo registrado para recebimento de push notifications

### Serviços

- `INotificationService`: Interface do serviço de notificações
- `IDeviceService`: Interface do serviço de dispositivos
- `FirebaseNotificationService`: Implementação do serviço de notificações usando Firebase
- `FirebaseDeviceService`: Implementação do serviço de dispositivos usando Firebase

### Controladores

- `NotificationController`: Gerencia as requisições HTTP relacionadas a notificações
- `DeviceController`: Gerencia as requisições HTTP relacionadas a dispositivos

### Rotas

- `/notifications`: Endpoints para gerenciamento de notificações
- `/devices`: Endpoints para gerenciamento de dispositivos

## Uso da API

### Endpoints de Notificações

#### Listar notificações do usuário
```
GET /notifications
```

#### Contar notificações não lidas
```
GET /notifications/unread/count
```

#### Obter notificação por ID
```
GET /notifications/:id
```

#### Marcar notificação como lida
```
PUT /notifications/:id/read
```

#### Marcar todas as notificações como lidas
```
PUT /notifications/read-all
```

#### Excluir notificação
```
DELETE /notifications/:id
```

#### Excluir todas as notificações
```
DELETE /notifications
```

#### Criar notificação
```
POST /notifications
{
  "userId": "user123",
  "type": "SYSTEM",
  "title": "Bem-vindo ao MedPulse Academy",
  "message": "Obrigado por se juntar à nossa plataforma!",
  "priority": "MEDIUM",
  "actionUrl": "https://medpulse.academy/welcome",
  "channels": ["IN_APP", "EMAIL"]
}
```

#### Enviar notificação em massa (Admin)
```
POST /notifications/bulk
{
  "userIds": ["user123", "user456", "user789"],
  "type": "SYSTEM",
  "title": "Novidade na plataforma",
  "message": "Novo módulo de revisão disponível!",
  "priority": "MEDIUM",
  "actionUrl": "https://medpulse.academy/novidades"
}
```

### Endpoints de Dispositivos

#### Registrar dispositivo
```
POST /devices
{
  "deviceType": "android",
  "deviceModel": "Pixel 6",
  "deviceName": "John's Phone",
  "osVersion": "Android 12",
  "fcmToken": "xyz123..."
}
```

#### Listar dispositivos do usuário
```
GET /devices/my
```

#### Obter dispositivo por ID
```
GET /devices/:id
```

#### Atualizar dispositivo
```
PUT /devices/:id
{
  "deviceName": "Novo nome",
  "osVersion": "Android 13"
}
```

#### Atualizar token do dispositivo
```
PUT /devices/:id/token
{
  "fcmToken": "abc123..."
}
```

#### Excluir dispositivo
```
DELETE /devices/:id
```

## Integração com Outros Módulos

O módulo de Notificações é utilizado por vários outros módulos da plataforma para enviar notificações aos usuários:

- **Módulo de Pagamento**: Notifica sobre pagamentos, faturas e renovações
- **Módulo de Conteúdo**: Notifica sobre novos conteúdos e atualizações
- **Módulo de Mentoria**: Notifica sobre sessões agendadas e mensagens
- **Módulo de Simulados**: Notifica sobre resultados e novos simulados disponíveis
- **Módulo de Revisão**: Notifica sobre revisões programadas

## Configuração

As notificações push são configuradas através do Firebase Cloud Messaging (FCM). Para habilitar as notificações push:

1. Adicione as credenciais do Firebase no arquivo de configuração
2. Configure os serviços de notificação para utilizar o FCM
3. Implemente a lógica de registro de dispositivos no aplicativo cliente

## Limitações

- Push notifications estão disponíveis apenas para dispositivos Android e iOS registrados
- Notificações SMS requerem configuração adicional de um provedor de SMS 