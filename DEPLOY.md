# Publicação do LORDES Painel

O projeto roda em uma única instância Node.js 24. O Docker Compose publica o site e a API no mesmo endereço HTTPS e guarda o banco JSON em um volume persistente. O Caddy obtém e renova os certificados automaticamente.

## VM Linux com Docker Compose

1. Aponte um hostname público para a VM. Libere as portas TCP 80 e 443 para o Caddy e mantenha a porta 3000 do painel na rede interna do Compose.
2. Copie `.env.example` para `.env`. Preencha `LORDES_HOST` com o hostname. Gere `SESSION_SECRET` com `openssl rand -hex 32`, guarde o valor e mantenha-o estável entre reinicializações.
3. Para verificação de e-mail e recuperação de senha, configure `RESEND_API_KEY` e `RESEND_FROM_EMAIL` com um remetente de domínio verificado no Resend.
4. Execute `docker compose up -d --build`. Confira `docker compose ps` e abra `https://SEU_HOST/api/v1/health`.

## Firebase Spark (sem cartão)

O painel também pode espelhar a persistência no Firestore sem adicionar o SDK pesado ao
servidor. No Firebase Console, crie um projeto no plano Spark, ative o Firestore em modo
produção e gere uma conta de serviço em **Configurações do projeto → Contas de serviço**.
Conceda a ela o papel `Cloud Datastore User`. O servidor espera somente o campo
`private_key`, convertido para base64 (não envie o JSON inteiro):

```sh
FIREBASE_PROJECT_ID="seu-projeto"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@seu-projeto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY_BASE64="$(jq -r .private_key service-account.json | base64 -w 0 | tr -d '\n')"
```

No PowerShell:

```powershell
$sa = Get-Content service-account.json -Raw | ConvertFrom-Json
$env:FIREBASE_PRIVATE_KEY_BASE64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($sa.private_key))
```

Na inicialização, o servidor mantém uma cópia local protegida e sincroniza usuários em
`lordes_users`, empresas em `lordes_tenants` e dados globais em `lordes_meta/state`.
Se o Firestore estiver vazio, o JSON local é enviado; se já houver dados, eles são
carregados para o processo. Sem as três variáveis, nada muda: o modo JSON continua ativo.

O endpoint `/api/v1/health` informa `persistence: "firestore-rest"` quando a conexão foi
configurada. O plano Spark não libera Cloud Functions; por isso a API continua rodando no
Node/Bonto ou em outro host gratuito, enquanto o Firestore serve como persistência.

Valide cadastro, login, geração do link da loja e captação de um orçamento com uma conta de teste. Reinicie o serviço `painel` e valide novamente o acesso à mesma empresa. Teste a entrega de e-mail com o domínio configurado.

## Persistência e cópia de segurança

O arquivo fica em `/app/.data/lordes-db.json`. Mantenha uma única réplica do serviço, com o mesmo volume `dados` a cada atualização. O comando `docker compose down -v` apaga o volume.

Para salvar uma cópia fora do volume, execute em um shell Linux:

```sh
umask 077
docker compose exec -T painel cat /app/.data/lordes-db.json > "lordes-db-$(date +%F-%H%M%S).json"
```

O arquivo contém dados financeiros e de autenticação. Guarde uma cópia protegida fora da VM e valide a restauração em um volume separado antes de operar com clientes reais.

## Outros provedores de contêiner

O `Dockerfile` também funciona sem Compose em uma plataforma com HTTPS gerenciado. Configure uma instância, porta 3000, segredo de sessão e um volume gravável pelo usuário `node` em `/app/.data`. Se o provedor montar o volume em outro caminho, defina `LORDES_DB_PATH` para apontar para o arquivo dentro desse volume.

`LORDES_BEHIND_REVERSE_PROXY=true` é adequado quando o app recebe tráfego exclusivamente de um único proxy que controla `X-Forwarded-For`, como o Caddy deste Compose. Em outras topologias, configure a confiança no proxy conforme a plataforma.

## Desenvolvimento local

Use `bun install --frozen-lockfile`, `npm run build` e `npm start` para executar a versão de produção no computador. Para desenvolvimento com Vite, use `npm run dev`.

## Reserva Render + failover Cloudflare

O arquivo `render.yaml` descreve uma instância Render Free para contingência. Ela usa o
Firestore como fonte compartilhada; o arquivo local em `/tmp` é apenas cache temporário.
Depois de conectar o repositório no Render, preencha os segredos marcados como `sync: false`.

O Worker em `cloudflare/failover-worker.ts` tenta o Bonto por 8 segundos e encaminha erros
ou timeouts para o Render. Configure o `SECONDARY_ORIGIN` com a URL real do serviço Render
antes de publicar com Wrangler. A primeira chamada ao Render pode demorar porque o plano
Free entra em suspensão quando fica ocioso.
