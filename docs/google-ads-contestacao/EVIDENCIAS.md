# Evidências — contestação do Google Ads

Cada linha: o fato, quando, de onde veio e como reverificar. Prints do dono ficam nas conversas (não estão no repositório): descrever aqui o que mostravam.

| Fato | Data | Origem | Reverificar |
|---|---|---|---|
| Conta 635-244-4697 suspensa por "phishing"; único problema: "Página de destino não está funcionando" (grupo de recursos 1) | 08/10/2026 03:27 | E-mail/painel do Google Ads | Painel do Ads |
| 1ª contestação 6452280642 recusada ("ainda viola as políticas") | 08/10/2026 11:57 | E-mail do Google | — |
| `store.alna.sale/atacado` respondeu 200 a AdsBot/Googlebot/Mediapartners em 15/15 testes, 0,4–1,0 s (a 1ª de uma série às vezes ~3 s) | 08/10/2026 | curl com user agents do Google | Comandos do `STATUS.md` |
| Search Console `alna.sale`: sem ações manuais e sem problemas de segurança; Navegação segura limpa em store.alna.sale, alna.sale e alnacommerce.com | 08/10/2026 | Prints do dono | Search Console; transparencyreport.google.com/safe-browsing/search |
| `http://alnacommerce.com` dava 522 após ~19 s; corrigido com "Always Use HTTPS" no Cloudflare; hoje 301 em ~0,06–0,1 s | 08–09/10/2026 | curl; ação do dono | curl |
| ALNA COMMERCE LTDA, CNPJ 57.135.009/0001-27, ME, aberta em 03/09/2024, sócio-administrador Alexander dos Santos Machado, sede R. Luiz Rafael Flor, 450 (apto no complemento, NÃO publicado), Nova Brasília, Brusque/SC, CEP 88.352-553 | emitido 10/03/2026 | Cartão CNPJ (PDF do dono) | Cartão CNPJ |
| Identidade da empresa publicada no rodapé da loja, `/contato`, `/sobre` e na Home | 08/10/2026 | Commits a890b43 / 605e8d6; dono publicou | `curl https://store.alna.sale/sobre` |
| Conta Asaas ativa: ALNA COMMERCE LTDA, CNPJ 57135009000127, LIMITED, situação APPROVED; Pix de teste R$ 20,26 pago em ~1 min pelo webhook novo | 09/10/2026 | API Asaas `GET /v3/myAccount/commercialInfo` (leitura) + banco | Admin > Conexões; tabela `orders` |
| Pagador do Google Ads trocado para ALNA COMMERCE LTDA (perfil de pagamentos 2160-7426-3129-2039, pós-pagamento) | 09/10/2026 | Print do dono | Google Ads > Faturamento > Configurações |
| `www.alna.cc` → 301 → https://alna.sale/ (Hostnet); `/wp-admin` mantido (302 para login); MX/SPF intactos | 09/10/2026 | Resposta da Hostnet + curl | Comandos do `STATUS.md` |
| `http://alna.cc` = 403 e `https://alna.cc` = erro de certificado (`*.f1.k8.com.br`, SEC_E_WRONG_PRINCIPAL), apex resolve para 45.55.107.236 / 104.156.247.183 / 108.61.89.136 | 09/10/2026 ~13:40 | curl/openssl | Comandos do `STATUS.md` |
| Merchant Center: 2 contas — antiga "Alnacommerce" 5722404568 (subconta, loja alnacommerce.com não verificada, nome sem LTDA, e-mail Gmail) e ativa "Alna" 5856969666 (store.alna.sale). A antiga foi encerrada pelo dono (~19h de 08/10, sem comprovante) | 08–09/10/2026 | Prints do dono | Perfil do Chrome da conta antiga |
| O Merchant Center antigo mostrava aviso "Problema com sua conta do Google Ads ()" (ID vazio): estava ligado a algum Google Ads. Dono: "a princípio não" há outra conta de Google Ads | 09/10/2026 | Print do dono | ads.google.com no outro perfil |
| Checkout coleta dados de cartão só para enviá-los à Asaas (não são gravados na tabela `orders`) | 09/10/2026 | Leitura de `supabase/functions/checkout-create` | Código |
| Pop-up de boas-vindas só na `/loja`, só após carga + 8 s + interação humana; e-mail opcional, com consentimento explícito; não está na `/atacado` | 09/10/2026 | Código e teste ao vivo | `src/lib/marketing/welcome-popup.ts` |
| Outra Conta do Google do dono (aleqs.santos@gmail.com) tem a conta de Google Ads **172-390-8582** com status **"Cancelado"** (lista de contas do Google Ads) | 09/10/2026 | Print do dono | ads.google.com no perfil dessa Conta do Google |
| Conta do Google informacoes.asm@gmail.com ("Alna Store") lista só a conta de Google Ads 635-244-4697 | 09/10/2026 | Print do dono | ads.google.com nesse perfil |
| Conta do Google asm.express.logistica@gmail.com ("Alna Commerce") lista a conta de Google Ads **962-967-1605** (status não aparece no print) | 09/10/2026 | Print do dono | ads.google.com nesse perfil |
