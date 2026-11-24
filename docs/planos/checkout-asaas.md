# Plano: opção "Checkout da Asaas" (cartão na página da Asaas)

Data: 24/11/2026. Status: **plano, nada implementado ainda.**

## 1. Objetivo
Criar uma escolha no admin, em **Configurações > Configuração > Checkout**, com duas opções que se desmarcam entre si:
- **Checkout transparente** (padrão): é o checkout de hoje, sem nenhuma mudança.
- **Checkout da Asaas**: quando o cliente escolhe **cartão**, ele é levado para a página de pagamento da Asaas para digitar os dados do cartão. **Pix continua no nosso site**, como hoje.

Motivo: tirar o campo de número de cartão do nosso domínio (`store.alna.sale`), que é um domínio novo, como ajuste para a análise do Google Ads. Ver `docs/google-ads-contestacao/STATUS.md`.

## 2. Decisões já tomadas pelo dono
- Só o **cartão** vai para a página da Asaas (opção B).
- As taxas continuam vindo **pela API** (`asaas-fees`), como hoje.

## 3. Configuração (admin)
- **Onde:** `src/routes/admin/configuracoes.tsx`, nova seção "Configuração" (âncora `#configuracao`), e um item de menu em `src/components/admin/admin-shell.tsx` dentro de "Configurações".
- **Dados:** uma coluna nova em `site_settings`: `checkout_mode` (texto, `transparente` ou `asaas`, padrão `transparente`, com restrição de valores).
- **Permissão:** a tabela tem RLS ativo; leitura pública e escrita só do admin (conferido em 24/11). A coluna nova precisa de permissão de leitura para o público, como as outras (memória `feedback_grant_colunas_site_settings`), e isso deve ser testado com a chave pública antes de publicar.
- **Validação:** o servidor (checkout-create) lê o modo **do banco**, nunca do navegador.

## 4. Fluxo quando a opção "Asaas" está marcada
1. Cliente escolhe **cartão** no checkout (nosso site) e preenche entrega e CEP, como hoje.
2. O front chama `checkout-create` **sem enviar os dados do cartão**.
3. `checkout-create` cria o pedido e a cobrança na Asaas com `billingType` = `CREDIT_CARD` e o mesmo total que já calculamos (taxa da faixa de parcelas + R$ 0,49, lidas pela API).
4. A resposta traz a `invoiceUrl`. O front redireciona o cliente para ela (**mesma aba**, por padrão).
5. Na página da Asaas, o cliente digita o cartão e paga.
6. Volta para o nosso site pela `successUrl` (`/pedido/<id>`). **A confirmação real vem do webhook**, nunca da volta do cliente.

## 5. Parcelamento (ponto que precisa de decisão e teste)
A documentação da Asaas (lida em 24/11) **não mostra** campo para fixar o número de parcelas nem para repassar a taxa ao cliente. Ou seja:
- Se o cliente escolher parcelas na página da Asaas, **não conseguimos garantir** que a taxa dele seja a que calculamos para aquela quantidade de parcelas.
- Opções:
  - **1a. Só à vista na página da Asaas** (1x). A conta fica exata: total = (base + R$ 0,49) ÷ (1 − 1,99%).
  - **1b. Parcelado com o número de parcelas que o cliente escolhe nas nossas telas**, enviado para a Asaas como `installmentCount` junto com o total. A conta é a mesma da tabela de hoje, **se** a Asaas aceitar esse número na fatura. Precisa de teste.
  - **1c. Parcelado livre na página da Asaas**: a diferença de taxa fica com a loja. **Não recomendo.**

**Recomendação:** começar pela 1b, com teste; se a fatura não respeitar o número de parcelas, usar a 1a.

## 6. Pagamento confirmado e pedido
- A cobrança criada por nós tem o `externalReference` com o id do pedido. O webhook `asaas-webhook` já trata `PAYMENT_RECEIVED` e atualiza o pedido, como hoje para Pix e cartão.
- Não usar a `successUrl` para marcar o pedido como pago.
- Cobrança cancelada ou vencida: o pedido continua pendente, como já acontece hoje; os lembretes existentes continuam valendo.

## 7. Arquivos que mudam
| Arquivo | Mudança |
|---|---|
| `supabase/migrations/…_checkout_mode.sql` | coluna `checkout_mode` em `site_settings` (padrão `transparente`) |
| `src/routes/admin/configuracoes.tsx` | seção "Configuração" com duas opções exclusivas |
| `src/components/admin/admin-shell.tsx` | item "Configuração" no menu |
| `supabase/functions/checkout-create/index.ts` | se modo `asaas` e cartão: cria a cobrança e devolve `invoiceUrl`, sem dados de cartão |
| `src/routes/checkout.tsx` | se `invoiceUrl` vier na resposta, redireciona; Pix segue o fluxo atual |
| `src/lib/payment-fees.ts` | sem mudança de regra (taxas continuam da API) |

## 8. Testes antes de publicar
1. Com a opção **transparente**: nenhuma mudança de comportamento (conferir Pix e cartão, como hoje).
2. Com a opção **Asaas** (ambiente de teste, se houver): cartão leva à página da Asaas; Pix não muda.
3. **Com cobrança real pequena:** só com o seu ok, porque gera cobrança. Conferir: valor cobrado = total mostrado; valor líquido na Asaas = valor do anúncio + frete; pedido vira "pago" pelo webhook.
4. Conferir o parcelamento escolhido (1b) na fatura.
5. PageSpeed do checkout e tempo até a página da Asaas abrir (medir antes e depois).

## 9. Reversão
Voltar a opção para **transparente** no admin. Não precisa publicar nada: o padrão continua funcionando. A coluna nova pode ficar.

## 10. Critério de pronto
- Admin mostra duas opções exclusivas e salva.
- Com "transparente", nada muda.
- Com "Asaas", cartão vai para a página da Asaas, e o pedido fica pago após o webhook.
- Teste real com valores conferidos e aprovados por você.

## 11. Perguntas em aberto
1. Parcelamento: aceita a opção **1b** (testar) ou prefere **1a** (só à vista na Asaas)?
2. Aprova fazer **uma cobrança real pequena** para teste?
3. A página da Asaas abre na **mesma aba** (padrão deste plano) ou em **nova aba**?
