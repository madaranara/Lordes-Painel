# Documentação do Produto — Gestor Financeiro SaaS + Site

Pacote "Site + Gestor Financeiro" para pequenas e médias empresas brasileiras

## 1. Visão geral

### 1.1 O que é

Um SaaS de gestão financeira simples e visual, vendido em pacote com a criação do site da empresa. O cliente recebe dois ativos: o **site** (vitrine, captação de clientes) e o **gestor financeiro** (painel com números, métricas e KPIs do negócio).

### 1.2 Problema

A maioria dos pequenos empresários brasileiros:

- controla o dinheiro em caderno, planilha ou na cabeça;
- mistura finanças pessoais com as da empresa;
- não sabe quanto lucra de verdade, nem quanto precisa vender para fechar o mês;
- descobre o problema de caixa só quando o dinheiro já acabou;
- acha ERP grande demais, caro e complicado.

### 1.3 Solução

Um painel que responde, em segundos, as perguntas que o dono faz todo dia:

- Quanto entrou e quanto saiu este mês?
- Estou no lucro ou no prejuízo?
- Quanto tenho a receber e a pagar nos próximos 30 dias?
- Qual produto/serviço dá mais margem?
- Quanto preciso vender para pagar as contas?

### 1.4 Proposta de valor da oferta combinada

> **"Um bom site para trazer clientes + um painel financeiro para você saber o que fazer com o dinheiro que eles trazem."**

O site gera receita; o gestor mostra para onde ela vai. Vendidos juntos, o cliente enxerga o negócio ponta a ponta (do visitante ao lucro) e o fornecedor ganha recorrência mensal além do projeto único.

### 1.5 Objetivos de negócio

- Transformar projeto único (site) em **receita recorrente (MRR)**.
- Aumentar o ticket médio por cliente e reduzir churn do site (cliente com painel financeiro raramente cancela).
- Criar um diferencial claro frente a quem vende apenas sites.

---

## 2. Público-alvo e personas

### 2.1 Segmentos prioritários

- Prestadores de serviço (gesso e pintura, reformas, oficinas, estética, clínicas pequenas)
- Comércio local (lojas, hamburguerias, headshops, varejo em geral)
- Profissionais autônomos e MEIs com faturamento recorrente
- Pequenas empresas de 1 a 15 funcionários

### 2.2 Persona 1 — O dono operador

- 30 a 50 anos, toca a operação no dia a dia.
- Usa WhatsApp para tudo; pouco tempo para ferramentas complexas.
- Dor: "Vendo bastante, mas não sobra dinheiro."
- Precisa de: lançamento rápido pelo celular, visão clara de caixa.

### 2.3 Persona 2 — O empreendedor em crescimento

- Já tem equipe e começa a abrir novas frentes (nova cidade, nova loja).
- Dor: "Não sei qual unidade/serviço dá lucro."
- Precisa de: metas, comparativos, DRE simples, múltiplas unidades.

### 2.4 Persona 3 — O contador/parceiro

- Recebe dados do cliente e quer menos retrabalho.
- Precisa de: exportação organizada, acesso somente leitura ao painel.

---

## 3. Escopo do produto

### 3.1 MVP (versão 1.0 — vender e validar)

- Cadastro e login seguro (e-mail e senha, recuperação de senha)
- Cadastro da empresa (CNPJ/CPF, regime, categorias padrão)
- Contas financeiras (caixa, banco, carteira digital)
- Lançamentos: receitas e despesas, com categoria, data, forma de pagamento e anexo
- Contas a pagar e a receber com vencimento, status e alertas
- Despesas e receitas recorrentes
- Dashboard com KPIs principais
- Fluxo de caixa (realizado e projetado)
- DRE simplificado mensal
- Relatórios exportáveis (PDF e planilha)
- Metas mensais (faturamento e lucro)
- Perfis de acesso: dono, financeiro, somente leitura (contador)

### 3.2 Versão 1.5 — retenção

- Importação de extrato bancário (OFX/CSV) com conciliação assistida
- Cobrança por Pix e link de pagamento
- Lembretes automáticos por WhatsApp e e-mail (vencimentos, contas atrasadas)
- Cadastro de clientes e fornecedores
- Centro de custo / unidades
- Resumo semanal automático por WhatsApp

### 3.3 Versão 2.0 — expansão

- Open Finance (conexão bancária automática)
- Emissão ou integração com notas fiscais (NFS-e / NF-e) via parceiro
- Precificação e margem por produto/serviço
- Integração com o site: formulário de orçamento vira lead e depois venda
- Multiempresa e multiunidade avançado
- Painel do contador com várias empresas
- Insights com IA (explicações em linguagem simples, alertas de anomalias)

### 3.4 Fora do escopo (por enquanto)

- Folha de pagamento completa e eSocial
- Contabilidade fiscal completa (apuração de impostos)
- Emissão de boletos bancários próprios
- Estoque avançado

---

## 4. Requisitos funcionais

### 4.1 Autenticação e contas

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário se cadastra com nome, e-mail e senha, e confirma o e-mail |
| RF-02 | Login com sessão segura e opção de autenticação em dois fatores (2FA) |
| RF-03 | Recuperação de senha por e-mail |
| RF-04 | Cada empresa é um *tenant* isolado; usuários pertencem a uma ou mais empresas |
| RF-05 | Perfis de acesso: Proprietário, Financeiro, Somente leitura |

### 4.2 Lançamentos financeiros

| ID | Requisito |
| --- | --- |
| RF-10 | Criar, editar e excluir (com soft delete) receitas e despesas |
| RF-11 | Campos: valor, data de competência, data de vencimento, data de pagamento, categoria, subcategoria, conta, cliente/fornecedor, forma de pagamento, observação, anexo |
| RF-12 | Status: previsto, pago/recebido, atrasado, cancelado |
| RF-13 | Lançamentos parcelados (ex.: 3x) gerando parcelas individuais |
| RF-14 | Lançamentos recorrentes (mensal, semanal, anual) com geração automática |
| RF-15 | Transferência entre contas sem impactar receita/despesa |
| RF-16 | Lançamento rápido pelo celular em no máximo 3 toques (valor, categoria, salvar) |
| RF-17 | Histórico de alterações (quem mudou o quê e quando) |

### 4.3 Contas a pagar e a receber

| ID | Requisito |
| --- | --- |
| RF-20 | Listagem com filtros por período, status, categoria, cliente/fornecedor |
| RF-21 | Marcar como pago/recebido com data e conta de baixa; baixa parcial |
| RF-22 | Alertas de vencimento (hoje, amanhã, atrasadas) no painel, e-mail e WhatsApp |
| RF-23 | Cálculo de juros e multa opcional para contas a receber atrasadas |

### 4.4 Dashboard

| ID | Requisito |
| --- | --- |
| RF-30 | Cartões de KPIs com comparação ao período anterior (variação em % e seta) |
| RF-31 | Filtro de período: hoje, 7 dias, mês atual, mês anterior, trimestre, ano, personalizado |
| RF-32 | Gráficos: receitas x despesas, fluxo de caixa acumulado, despesas por categoria, receitas por origem |
| RF-33 | Semáforo de saúde financeira (verde, amarelo, vermelho) com explicação em uma frase |
| RF-34 | Painel carrega em até 2 segundos para até 10 mil lançamentos |

### 4.5 Relatórios

| ID | Requisito |
| --- | --- |
| RF-40 | DRE simplificado (receita bruta, deduções, custos, despesas, resultado) |
| RF-41 | Fluxo de caixa diário/semanal/mensal, realizado e projetado |
| RF-42 | Relatório por categoria, cliente, fornecedor e centro de custo |
| RF-43 | Exportação em PDF e XLSX/CSV |
| RF-44 | Envio automático mensal do relatório ao dono e ao contador |

### 4.6 Metas

| ID | Requisito |
| --- | --- |
| RF-50 | Definir meta de faturamento, lucro e limite de despesas por mês |
| RF-51 | Barra de progresso no dashboard com ritmo necessário por dia |

---

## 5. KPIs e métricas do painel

Esta é a parte central do produto: os números que o empresário precisa ver. Todas as fórmulas devem ficar visíveis no app (ícone "?" explicando em linguagem simples).

### 5.1 KPIs essenciais (aparecem na tela inicial)

| KPI | Fórmula | Pergunta que responde |
| --- | --- | --- |
| Faturamento do mês | Soma das receitas do período | Quanto vendi? |
| Despesas do mês | Soma das despesas do período | Quanto gastei? |
| Resultado (lucro/prejuízo) | Receitas − Despesas | Sobrou dinheiro? |
| Margem líquida | Resultado ÷ Receitas × 100 | De cada R$ 100 vendidos, quanto sobra? |
| Saldo em caixa hoje | Soma dos saldos das contas | Quanto tenho agora? |
| A receber (30 dias) | Receitas previstas não recebidas | Quanto vai entrar? |
| A pagar (30 dias) | Despesas previstas não pagas | Quanto vou ter que pagar? |
| Saldo projetado (30 dias) | Saldo atual + a receber − a pagar | Vou ficar no azul ou no vermelho? |

### 5.2 KPIs de saúde do negócio

| KPI | Fórmula | Uso |
| --- | --- | --- |
| Ponto de equilíbrio | Custos fixos ÷ margem de contribuição % | Quanto preciso vender para não ter prejuízo |
| Margem de contribuição | (Receita − custos variáveis) ÷ Receita | Quanto cada venda ajuda a pagar os custos fixos |
| Custos fixos mensais | Soma das despesas marcadas como fixas | Peso da estrutura |
| Runway (fôlego de caixa) | Saldo em caixa ÷ média de despesas mensais | Por quantos meses o caixa aguenta |
| Inadimplência | A receber atrasado ÷ Total a receber × 100 | Tamanho do calote |
| Prazo médio de recebimento | Média de dias entre venda e recebimento | Velocidade do dinheiro |
| Prazo médio de pagamento | Média de dias entre compra e pagamento | Folga com fornecedores |
| Variação mês a mês | (Mês atual − mês anterior) ÷ mês anterior | Crescimento ou queda |

### 5.3 KPIs comerciais

| KPI | Fórmula | Uso |
| --- | --- | --- |
| Ticket médio | Receita ÷ nº de vendas | Valor médio por cliente |
| Nº de vendas / atendimentos | Contagem de receitas | Volume |
| Receita por cliente (top 10) | Soma por cliente | Concentração e clientes-chave |
| Receita por produto/serviço | Soma por item | O que realmente vende |
| Margem por produto/serviço | (Preço − custo) ÷ Preço | O que realmente dá lucro |
| Custo de aquisição (CAC) | Gasto com marketing ÷ novos clientes | Vale a pena anunciar? |
| Retorno do marketing | Receita atribuída ÷ gasto em marketing | Integração site + financeiro |

### 5.4 KPIs de recorrência (para negócios com assinatura/contrato)

- MRR (receita recorrente mensal)
- Churn de clientes e de receita
- LTV (valor do cliente ao longo do tempo)
- Receita recorrente vs. avulsa

### 5.5 Semáforo de saúde financeira

Regra inicial (ajustável por segmento):

- **Verde:** saldo projetado positivo, margem líquida acima de 10% e inadimplência abaixo de 5%.
- **Amarelo:** saldo projetado positivo, mas margem entre 0% e 10%, ou inadimplência entre 5% e 15%.
- **Vermelho:** saldo projetado negativo nos próximos 30 dias, margem negativa ou inadimplência acima de 15%.

O painel sempre acompanha o semáforo de uma frase em português simples, por exemplo: "Atenção: em 12 dias suas contas a pagar passam o dinheiro em caixa."

### 5.6 Alertas inteligentes

- Despesa de uma categoria 30% acima da média dos últimos 3 meses
- Conta a pagar vencendo em 3 dias com saldo insuficiente
- Cliente com mais de 15 dias de atraso
- Meta mensal com menos de 70% do ritmo esperado na metade do mês
- Saldo projetado negativo nos próximos 30 dias

---

## 6. Experiência do usuário (UX)

### 6.1 Princípios

- **Mobile first:** o dono usa o celular. Lançar uma venda ou despesa deve ser mais rápido que anotar no caderno.
- **Linguagem simples:** sem jargão contábil na tela principal ("Quanto sobrou" ao lado de "Resultado").
- **Números em primeiro lugar:** abrir o app e ver a situação em 5 segundos.
- **Poucos cliques:** tarefas frequentes em até 3 toques.
- **Confiança visual:** verde e vermelho consistentes, valores em R$ com formatação brasileira.

### 6.2 Mapa de telas

1. Login / cadastro / recuperação
2. Onboarding guiado (empresa, contas, categorias, saldo inicial)
3. **Início (dashboard):** semáforo, KPIs principais, gráfico do mês, próximos vencimentos
4. Lançamentos (lista + botão rápido "+")
5. Contas a pagar / a receber
6. Fluxo de caixa (realizado x projetado)
7. Relatórios (DRE, categorias, clientes)
8. Metas
9. Clientes e fornecedores
10. Contas e categorias
11. Configurações (empresa, usuários, notificações, plano)
12. Central de ajuda

### 6.3 Onboarding (meta: primeiro valor em 10 minutos)

1. Nome da empresa e segmento (já aplica categorias padrão do segmento)
2. Contas financeiras e saldo inicial
3. Importar planilha ou lançar as 5 últimas movimentações
4. Definir meta do mês
5. Ver o dashboard preenchido pela primeira vez

### 6.4 Categorias padrão por segmento

Pré-configurar planos de contas para facilitar: serviços (materiais, mão de obra, combustível, ferramentas), comércio (mercadorias, aluguel, taxas de maquininha, embalagens), alimentação (insumos, delivery, taxas de plataforma), e um plano genérico. O cliente pode editar tudo.

---

## 7. Arquitetura técnica

### 7.1 Visão geral

Aplicação web responsiva (PWA) com API própria e banco relacional, arquitetura **multi-tenant** com isolamento lógico por empresa.

### 7.2 Stack sugerida

| Camada | Opção recomendada | Observação |
| --- | --- | --- |
| Frontend | Next.js (React) + TypeScript + Tailwind | PWA instalável no celular |
| Gráficos | Recharts ou Chart.js | Leves e responsivos |
| Backend | Node.js (NestJS ou Fastify) ou Next.js API routes | Mantém a stack única em TypeScript |
| Banco de dados | PostgreSQL | Transações, integridade e relatórios |
| ORM | Prisma ou Drizzle | Migrações versionadas |
| Autenticação | Auth.js, Clerk ou Supabase Auth | Evita reinventar segurança |
| Filas/jobs | BullMQ + Redis (ou cron do provedor) | Recorrências, alertas, relatórios |
| Armazenamento | S3 compatível (anexos, PDFs) | Com URLs assinadas |
| E-mail | Resend, Amazon SES ou similar | Transacional |
| WhatsApp | API oficial (Meta Cloud API) ou provedor homologado | Lembretes e resumos |
| Pagamentos do SaaS | Asaas, Pagar.me, Stripe ou Mercado Pago | Assinatura recorrente, Pix e cartão |
| Hospedagem | Vercel + Supabase/Neon, ou VPS com Docker | Começar simples, escalar depois |
| Observabilidade | Sentry + logs estruturados + uptime monitor | Detectar erro antes do cliente |

### 7.3 Multi-tenancy

- Todas as tabelas de negócio possuem `empresa_id`.
- Toda consulta é filtrada por `empresa_id` no servidor (nunca confiar no cliente).
- No PostgreSQL, usar **Row Level Security (RLS)** como segunda camada de proteção.
- Testes automatizados que garantem que um tenant jamais enxerga dados de outro.

### 7.4 Modelo de dados (principais entidades)

**empresa**

- id, razao\_social, nome\_fantasia, documento (CNPJ/CPF), segmento, regime\_tributario, plano, status, criado\_em

**usuario**

- id, nome, email, senha\_hash, 2fa\_ativo, ultimo\_acesso

**membro\_empresa**

- usuario\_id, empresa\_id, papel (proprietario, financeiro, leitura)

**conta\_financeira**

- id, empresa\_id, nome, tipo (caixa, banco, carteira, cartao), saldo\_inicial, ativa

**categoria**

- id, empresa\_id, nome, tipo (receita, despesa), natureza (fixa, variavel), categoria\_pai\_id, grupo\_dre

**pessoa** (clientes e fornecedores)

- id, empresa\_id, tipo, nome, documento, telefone, email

**lancamento**

- id, empresa\_id, tipo (receita, despesa, transferencia), valor, data\_competencia, data\_vencimento, data\_pagamento, status, categoria\_id, conta\_id, pessoa\_id, forma\_pagamento, descricao, anexo\_url, recorrencia\_id, parcela\_numero, parcela\_total, criado\_por, criado\_em, excluido\_em

**recorrencia**

- id, empresa\_id, frequencia, proxima\_data, data\_fim, modelo\_lancamento (JSON)

**meta**

- id, empresa\_id, mes\_referencia, tipo (faturamento, lucro, limite\_despesa), valor

**alerta / notificacao**

- id, empresa\_id, tipo, canal, mensagem, enviada\_em, lida\_em

**auditoria**

- id, empresa\_id, usuario\_id, entidade, entidade\_id, acao, antes (JSON), depois (JSON), criado\_em

**assinatura** (cobrança do próprio SaaS)

- id, empresa\_id, plano, status, ciclo, proxima\_cobranca, gateway\_id

### 7.5 Cálculo dos KPIs

- Consultas agregadas em SQL com índices em `(empresa_id, data_competencia)` e `(empresa_id, status, data_vencimento)`.
- Views ou *materialized views* para dashboards pesados, atualizadas por job.
- Cache curto (30 a 60 segundos) dos KPIs do dashboard.
- Valores monetários **sempre em centavos (inteiro)** ou `NUMERIC(14,2)`; nunca `float`.

### 7.6 API (exemplos de endpoints)

- `POST /auth/login`, `POST /auth/register`
- `GET /dashboard?de=&ate=` — KPIs consolidados
- `GET/POST/PATCH/DELETE /lancamentos`
- `POST /lancamentos/{id}/baixar`
- `GET /fluxo-caixa?de=&ate=&modo=realizado|projetado`
- `GET /relatorios/dre?mes=`
- `GET/POST /contas`, `/categorias`, `/pessoas`, `/metas`
- `GET /exportar/{tipo}?formato=pdf|xlsx`
- Webhooks: `POST /webhooks/pagamento`, `POST /webhooks/whatsapp`

Padrão REST, JSON, paginação por cursor, versionamento (`/v1`) e idempotência nas operações de pagamento.

---

## 8. Integração com o site (diferencial da oferta)

### 8.1 Níveis de integração

**Nível 1 (MVP) — Entrega conjunta**

- Mesmo login e mesma marca (cores, logo) no site e no painel.
- Subdomínio do cliente: `app.empresadocliente.com.br`.

**Nível 2 — Leads no financeiro**

- Formulário de orçamento do site cria um "lead" no painel.
- Lead aprovado vira receita prevista (conta a receber).

**Nível 3 — Marketing e retorno**

- Origem do cliente (Google, Instagram, indicação) registrada na venda.
- KPIs de CAC e retorno por canal.
- Pixel/UTM do site conectados à receita real.

### 8.2 White-label

O painel deve aceitar personalização por cliente: logo, cores e nome do produto. Isso reforça que o gestor "faz parte" da identidade da empresa.

---

## 9. Segurança, privacidade e conformidade

### 9.1 Segurança

- HTTPS obrigatório (TLS 1.2+), HSTS.
- Senhas com hash forte (Argon2id ou bcrypt); nunca armazenar em texto.
- 2FA opcional (TOTP), incentivado para o proprietário.
- Proteção contra OWASP Top 10: injeção, XSS, CSRF, quebra de controle de acesso.
- Limite de tentativas de login (rate limiting) e bloqueio temporário.
- Anexos privados com URL assinada e expiração.
- Backups automáticos diários, retenção de 30 dias e teste de restauração mensal.
- Segredos em variáveis de ambiente / cofre, nunca no código.
- Log de auditoria de ações sensíveis.

### 9.2 LGPD

- Base legal: execução de contrato.
- Política de privacidade e termos de uso claros, aceite registrado.
- Direitos do titular: exportar e excluir dados da conta pelo próprio painel.
- Minimização: coletar só o necessário.
- Definir o papel das partes: o cliente é **controlador** dos dados de seus clientes finais; o SaaS é **operador**. Formalizar em contrato (DPA).
- Plano de resposta a incidentes e canal de contato do encarregado (DPO).
- Dados hospedados com provedor que ofereça garantias adequadas; preferir região Brasil (São Paulo) quando possível.

### 9.3 Aviso importante

O produto é uma ferramenta de **gestão**, não substitui contador nem emite obrigações fiscais. Deixar isso claro nos termos de uso e na interface. Valide os termos jurídicos com um advogado antes do lançamento.

---

## 10. Planos e precificação

Valores são sugestões iniciais para validar no mercado.

### 10.1 Estrutura do pacote

| Item | Descrição | Cobrança |
| --- | --- | --- |
| Criação do site | Projeto único (landing page ou site institucional) | Pagamento único |
| Gestor financeiro | Assinatura mensal do painel | Recorrente |
| Hospedagem e manutenção do site | Opcional, pode vir dentro do plano | Recorrente |

### 10.2 Planos do gestor

|  | Essencial | Profissional | Premium |
| --- | --- | --- | --- |
| Preço sugerido/mês | R$ 49 a 79 | R$ 99 a 149 | R$ 199 a 299 |
| Empresas/unidades | 1 | 1 a 3 | até 10 |
| Usuários | 2 | 5 | 15 |
| Lançamentos | ilimitados | ilimitados | ilimitados |
| Dashboard e KPIs essenciais | Sim | Sim | Sim |
| DRE e fluxo projetado | Básico | Completo | Completo |
| Metas e alertas por e-mail | Sim | Sim | Sim |
| Alertas por WhatsApp | Não | Sim | Sim |
| Importação de extrato (OFX) | Não | Sim | Sim |
| Cobrança por Pix | Não | Sim | Sim |
| Acesso do contador | Não | Sim | Sim |
| Integração com leads do site | Não | Não | Sim |
| White-label | Não | Não | Sim |
| Suporte | E-mail | E-mail + WhatsApp | Prioritário |

### 10.3 Oferta de entrada (para fechar junto com o site)

- **Site + 3 meses do plano Profissional grátis** (o gestor entra como bônus de valor).
- Após o teste, a cobrança recorrente começa automaticamente, com aviso prévio.
- Desconto de 15% a 20% no plano anual pago à vista.

### 10.4 Princípios de preço

- Cobrar por **valor** (decisões melhores), não por quantidade de lançamentos.
- Manter o plano de entrada acessível para facilitar a venda junto com o site.
- Evitar taxa de setup separada: embutir no valor do site.

### 10.5 Economia unitária (referência)

- Meta de margem bruta do SaaS: acima de 80%.
- Custo de infraestrutura por cliente: baixo (poucos reais/mês no início).
- Payback do custo de aquisição: menos de 3 meses, pois o cliente já entra pelo site.
- Meta de churn mensal: abaixo de 3%.

---

## 11. Go-to-market: como vender o pacote

### 11.1 Posicionamento

> "Seu site traz clientes. Seu painel mostra se você está lucrando com eles."

Não vender "software financeiro"; vender **clareza e controle**: "saber quanto você realmente ganha".

### 11.2 Roteiro comercial (processo de venda)

1. **Diagnóstico rápido (15 min):** perguntar como controla o dinheiro hoje, quanto fatura, se sabe o lucro.
2. **Dor:** "Se eu te perguntar o lucro do mês passado, você sabe responder com exatidão?"
3. **Demonstração:** abrir o painel com dados de exemplo do segmento dele.
4. **Oferta:** site + gestor, com bônus de 3 meses.
5. **Fechamento:** proposta em uma página, contrato digital, entrada de 50% do site.
6. **Onboarding:** configurar o painel junto com o cliente na entrega do site.

### 11.3 Materiais necessários

- Demo com dados fictícios por segmento (serviços, comércio, alimentação)
- Apresentação curta de 8 a 10 slides
- Proposta comercial padrão em PDF
- Vídeo de 2 minutos mostrando o painel
- Página de vendas do pacote (a própria landing page do produto)
- Casos de uso e prints antes/depois (planilha bagunçada x painel)

### 11.4 Canais

- Base atual de clientes de site e marketing (upsell do gestor)
- Prospecção ativa no WhatsApp e Instagram em segmentos locais
- Parcerias com contadores (indicação com comissão recorrente)
- Conteúdo: posts e vídeos curtos sobre "3 números que todo dono precisa saber"
- Indicação de clientes satisfeitos com bônus de desconto

### 11.5 Objeções comuns e respostas

| Objeção | Resposta |
| --- | --- |
| "Já uso planilha" | A planilha não avisa vencimentos, não projeta caixa e não cabe no bolso do celular; migramos seus dados |
| "Não tenho tempo" | Lançar leva 10 segundos; o painel economiza horas no fim do mês |
| "É caro" | Menos que um café por dia; um único boleto esquecido já custa mais |
| "Meu contador faz isso" | O contador olha o passado fiscal; o painel mostra o presente e o futuro do caixa |
| "Não entendo de finanças" | O painel traduz tudo em frases simples e semáforo |

### 11.4 Retenção e expansão

- Resumo semanal no WhatsApp ("Sua semana em 5 números") mantém o hábito.
- Revisão trimestral gratuita dos números com o cliente.
- Upsell para plano superior ao ativar WhatsApp, Pix e contador.
- Upsell de serviços: tráfego pago, redes sociais, novas páginas.

---

## 12. Roadmap de desenvolvimento

| Fase | Prazo estimado | Entregas |
| --- | --- | --- |
| 0. Descoberta | 1 a 2 semanas | Entrevistar 5 a 10 empresários, validar dores, fechar escopo do MVP, protótipo no Figma |
| 1. Fundação | 2 a 3 semanas | Infra, autenticação, multi-tenant, banco, CI/CD, design system |
| 2. Núcleo financeiro | 3 a 4 semanas | Contas, categorias, lançamentos, recorrência, contas a pagar/receber |
| 3. Painel e KPIs | 2 a 3 semanas | Dashboard, fluxo de caixa, DRE, metas, semáforo |
| 4. Relatórios e alertas | 2 semanas | PDF/XLSX, e-mails, alertas de vencimento |
| 5. Cobrança do SaaS | 1 a 2 semanas | Planos, assinatura recorrente, trial, bloqueio por inadimplência |
| 6. Beta fechado | 3 a 4 semanas | 5 a 10 clientes reais, correções, ajustes de UX |
| 7. Lançamento | 1 semana | Página de vendas, material comercial, suporte |
| 8. Versão 1.5 | 6 a 8 semanas | OFX, Pix, WhatsApp, clientes/fornecedores, centros de custo |

Total até o MVP vendável: cerca de **12 a 16 semanas** com um desenvolvedor focado. Para vender antes, usar um protótipo navegável e pré-venda para os primeiros clientes de site.

### 12.1 Estratégia para acelerar

- Usar backend-as-a-service (Supabase) e componentes prontos (shadcn/ui) para reduzir tempo.
- Começar com 1 segmento (ex.: prestadores de serviço) e categorias prontas para ele.
- Pré-vender o pacote para 3 a 5 clientes enquanto desenvolve.
- Lançar o MVP apenas com o essencial: lançamentos, dashboard e contas a pagar/receber.

---

## 13. Qualidade e testes

- Testes unitários nas fórmulas de KPI (casos com valores conhecidos).
- Testes de integração nos endpoints críticos (lançamento, baixa, recorrência).
- Testes de isolamento entre tenants a cada deploy.
- Testes end-to-end do fluxo principal (cadastro, primeiro lançamento, dashboard).
- Dados de teste realistas por segmento.
- Ambiente de homologação separado da produção.
- Checklist de lançamento: backup testado, monitoramento ativo, termos publicados, e-mail transacional validado.

---

## 14. Operação e suporte

- Canal de suporte via WhatsApp e e-mail, com resposta em até 1 dia útil (Essencial) e 4 horas úteis (Premium).
- Central de ajuda com artigos curtos e vídeos de 1 a 2 minutos.
- Base de conhecimento por segmento ("como controlar caixa na minha oficina").
- Canal de feedback dentro do painel e roteiro de melhorias mensais.
- Política de cancelamento simples, com exportação dos dados do cliente.

---

## 15. Métricas do próprio SaaS

Acompanhar semanalmente:

- **MRR** e crescimento mensal
- **Churn** (clientes e receita)
- **Taxa de conversão do trial** para pago
- **Ativação:** % de clientes que fazem 10 lançamentos na primeira semana
- **Uso semanal:** % de clientes que abrem o painel toda semana
- **Taxa de anexo** (quantos site vendidos também levam o gestor)
- **CAC e LTV**
- **NPS** e tempo médio de resposta do suporte

Meta de referência para o primeiro ano: 30 a 50% dos clientes de site contratando o gestor.

---

## 16. Riscos e mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Cliente não usa o painel (esquece de lançar) | Churn alto | Lançamento rápido, lembretes no WhatsApp, importação de extrato, revisão trimestral |
| Concorrência de apps conhecidos (Conta Azul, Nibo, Omie, planilhas) | Dificuldade de venda isolada | Vender como pacote com o site, foco em simplicidade e KPIs, não em ERP |
| Dados financeiros sensíveis vazarem | Dano grave de reputação e jurídico | Isolamento multi-tenant, RLS, criptografia, auditoria, backups |
| Escopo crescer demais | Atraso | MVP enxuto, roadmap por fases, dizer "não" a recursos de ERP |
| Dependência de APIs de terceiros (WhatsApp, Open Finance) | Custos e instabilidade | Camadas de abstração, plano B por e-mail |
| Inadimplência dos próprios clientes do SaaS | Receita irregular | Cobrança automática por Pix/cartão, bloqueio gradual |
| Suporte consumir todo o tempo | Perda de foco | Onboarding bom, central de ajuda, automação |
| Questões legais (LGPD, termos) | Risco regulatório | Revisão jurídica, contratos claros, DPA |

---

## 17. Checklist de lançamento do MVP

- [ ] Escopo do MVP fechado e protótipo validado com 5 empresários
- [ ] Autenticação, multi-tenant e RLS funcionando e testados
- [ ] Lançamentos, recorrência, contas a pagar e a receber
- [ ] Dashboard com os 8 KPIs essenciais e semáforo
- [ ] Fluxo de caixa e DRE simplificado
- [ ] Exportação em PDF e planilha
- [ ] Alertas por e-mail de vencimento
- [ ] Cobrança recorrente do SaaS configurada
- [ ] Termos de uso, política de privacidade e aceite
- [ ] Backup automático e monitoramento de erros
- [ ] Demo por segmento e página de vendas
- [ ] Roteiro comercial e proposta em PDF
- [ ] Beta com 5 a 10 clientes reais concluído

---

## 18. Próximos passos recomendados

1. Escolher o **segmento inicial** (por exemplo, prestadores de serviço como gesso/pintura e reformas).
2. Montar o **protótipo navegável** do dashboard (é o que vende).
3. Fechar a **oferta e os preços** e testar com 3 a 5 clientes atuais de site.
4. Desenvolver o **MVP** seguindo as fases 1 a 5.
5. Rodar o **beta fechado**, medir ativação e ajustar.
6. Lançar o pacote oficialmente e iniciar a prospecção.

> Posso detalhar na sequência: o modelo de dados em SQL, as telas em wireframe, o roteiro de vendas completo em script de WhatsApp ou a proposta comercial em PDF.
