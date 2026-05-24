# Portly

App Expo/React Native com um `pi-server` para correr no Raspberry Pi.

## Configuracao local

1. Copia `.env.example` para `.env`.
2. Atualiza `EXPO_PUBLIC_PI_HOST` para o IP atual do Raspberry Pi.
3. Se precisares de override completo, ajusta `EXPO_PUBLIC_PI_HTTP_URL` e `EXPO_PUBLIC_PI_WS_URL`.

O acesso da app ao Raspberry Pi usa:

- HTTP em `3000`
- WebSocket em `3001`

Isto e separado do acesso SSH ao proprio Raspberry Pi.

## SSH para o Raspberry Pi

`ssh portly@portly` so funciona se o nome `portly` existir na tua rede ou no teu `~/.ssh/config`.

Exemplo de alias SSH:

```sshconfig
Host portly
  HostName 10.51.28.153
  User portly
```

Se `ssh portly@10.51.28.153` der timeout, o problema ja nao e o nome: e conectividade ou o servico SSH no Pi.

Checks uteis no Raspberry Pi:

```bash
hostname -I
sudo systemctl status ssh
sudo systemctl enable --now ssh
ss -tlnp | rg ':22 '
```

## Pi server

Para arrancar o servidor do Raspberry Pi neste repositorio:

```bash
npm run start:server
```

O servidor expõe `http://<pi-ip>:3000/status` e `ws://<pi-ip>:3001`.
