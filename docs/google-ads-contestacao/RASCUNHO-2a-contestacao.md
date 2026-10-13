# Rascunho — 2ª contestação do Google Ads (conta 635-244-4697)

Versão 2, de 13/10/2026 (alna.cc resolvido e verificado). **Não enviar antes de fechar o R7 (itens 3 e 4) e reverificar no dia.** Só pode haver UM envio: o Google
limita contestações e trata repetição sem fato novo como infundada. Escrever somente o que é verdade no dia do envio.

Fonte oficial do processo (conferida em 13/10/2026): support.google.com/google-ads/answer/9841640 e /answer/15936970.
- **Confirmado na fonte:** o envio é pela conta, no link **"Fale conosco" / "Contact Us"** do aviso de suspensão no topo da tela, que abre o formulário de contestação à direita; **uma contestação por vez**; se recusada, dá para contestar de novo pelo mesmo caminho; o Google pede para explicar como o negócio funciona, o que mudou recentemente e o histórico no Google Ads; "só reativa em circunstâncias convincentes" (ser completo, exato e honesto); **antes de contestar, todas as contas vinculadas (atuais ou antigas) e relacionadas devem estar de acordo com as políticas**; algumas contas precisam passar pela verificação do anunciante (3 falhas = sem contestação); prazo mínimo de 6 meses desde a suspensão.
- **Não consta na fonte (não afirmar):** a lista exata de campos do formulário; que "página fora do ar" sozinha causa "phishing" (a página de phishing só fala em tentar obter senha/cartão fingindo ser outra entidade).

## Texto sugerido (colar no campo de informações novas da contestação)

Olá. Esta contestação traz informações novas desde a anterior (enviada em 8 de outubro de 2026).

Quem somos: a conta pertence à ALNA COMMERCE LTDA, CNPJ 57.135.009/0001-27, empresa ativa desde 03/09/2024, com sede em R. Luiz Rafael Flor, 450, Nova Brasília, Brusque/SC, CEP 88.352-553. O sócio-administrador, Alexander dos Santos Machado, é o responsável pela conta. Vendemos utensílios de madeira para cozinha, toalhas e itens de cama, mesa e banho, com nota fiscal e entrega para todo o Brasil, no varejo e em atacado para revenda.

O que mudamos desde a primeira contestação:
1. O perfil de pagamentos do Google Ads agora está no nome da empresa (ALNA COMMERCE LTDA); antes estava em nome da pessoa física do sócio.
2. O recebimento dos pagamentos da loja passou para uma conta de pagamentos (Asaas) no CNPJ da própria empresa.
3. A razão social, o CNPJ e o endereço aparecem agora no rodapé de todas as páginas da loja, na página inicial e na página "Sobre". Contato: WhatsApp (51) 99491-1125 e contato@alna.sale.
4. Corrigimos dois domínios antigos da marca: alnacommerce.com (que apresentava falha de acesso) e alna.cc (que apresentava erro de certificado). Hoje ambos redirecionam para alna.sale, com HTTPS válido.
5. Encerramos uma conta antiga e duplicada do Google Merchant Center (criada para o domínio antigo da marca), mantendo apenas a conta ativa da loja, que usa o endereço store.alna.sale. O encerramento foi em 8 de outubro de 2026.
6. Passamos a verificar automaticamente, a cada 5 minutos, que a página de destino do anúncio responde normalmente.

Sobre o site: a página de destino do anúncio é https://store.alna.sale/atacado, uma página informativa de atacado, sem formulário e sem pedido de senha ou dados pessoais. O site usa HTTPS válido, e o Search Console não aponta ações manuais nem problemas de segurança. Os dados de pagamento são digitados somente no checkout, em HTTPS, e enviados à processadora de pagamentos; não os armazenamos. Pedimos o e-mail do cliente apenas para a compra (confirmação e acompanhamento do pedido) e, quando o próprio cliente aceita, para enviar cupom, novidades e lembrete de carrinho, sempre com link para cancelar. Políticas de privacidade, termos de uso e de troca e devolução estão publicadas e linkadas no rodapé.

[BLOCO R7 — escolher UM conforme as respostas do dono; se nenhuma outra conta tiver relação, **não incluir nada** e responder "Não" às perguntas do formulário sobre outras contas:]
 - (a) Se a 172-390-8582 existir só como conta cancelada, sem anúncios e sem violação: "Informamos também que o sócio possui uma conta de Google Ads antiga (172-390-8582) em outra Conta do Google, atualmente cancelada e sem anúncios em veiculação."
 - (b) Se qualquer uma das duas tiver violação, suspensão ou o mesmo perfil de pagamentos da 635: descrever exatamente o que existe (o dono informa), sem minimizar.
 - (c) **Caso atual da 962-967-1605** (perfil de pagamentos diferente, mas mesmo pagador pessoa física; pausada por verificação do anunciante; só incluir depois de o dono confirmar se ela chegou a veicular anúncios e para qual negócio): "Informamos também que o sócio possui outra conta de Google Ads (962-967-1605), em outra Conta do Google e com perfil de pagamentos distinto, atualmente pausada por prazo de verificação do anunciante, [sem nunca ter veiculado anúncios dos domínios da ALNA / DESCREVER O USO REAL]." (a 172-390-8582, se for só cancelada, entra pela opção (a).)

Pedimos a reanálise da conta, pois somos uma loja real e identificável, e corrigimos os pontos que podiam ter causado a classificação como "phishing" (página inacessível em alguns acessos, domínios antigos com erro e divergência entre a empresa, o site e o pagador). Ficamos à disposição para enviar qualquer documento, como o cartão do CNPJ.

## Fatos usados no texto e como foram verificados (13/10/2026)
| Linha do texto | Verificação |
|---|---|
| 1 pagador LTDA | Print do dono em 09/10 (Faturamento > Configurações) |
| 2 Asaas no CNPJ da LTDA | API Asaas em 09/10 (APPROVED) + pedidos pagos pelo webhook (inclusive 12/10) |
| 3 identidade no rodapé/Home/Sobre | `curl` 13/10: `store.alna.sale/sobre`, `/loja` (rodapé) e `alna.sale` mostram ALNA COMMERCE LTDA, CNPJ e endereço |
| 4 alna.cc e alnacommerce.com | `curl` 13/10: `http/https://alna.cc` → 301 → `www.alna.cc` → 301 → `alna.sale`; certificado CN=alna.cc válido até 17/11/2026; `alnacommerce.com` → 301 → `alna.sale` |
| 5 Merchant Center antigo | Palavra do dono (~19h de 08/10; sem comprovante) — usar só a data |
| 6 verificação a cada 5 min | cron `keep-warm-atacado` `*/5`, ativo, 288 execuções em 24 h |
| Destino `/atacado` | `curl` 13/10: 200 em 0,4–1,0 s para AdsBot, AdsBot-Mobile e Googlebot (9/9), sem `<form>` e sem campo de senha |
| Políticas linkadas | `/politica-de-privacidade`, `/termos-de-uso`, `/politica-de-troca-e-devolucao` respondem 200 e estão no rodapé |
| Search Console / Navegação segura | **Só verificado em 08/10 — o dono precisa mandar prints novos no dia do envio** |

## Checklist antes de enviar
- [ ] **R7 (3) e (4):** nas contas 172-390-8582 e 962-967-1605, anotar o ID do perfil de pagamentos (Faturamento > Configurações; comparar com 2160-7426-3129-2039) e ver se há faixa vermelha/violação. Escolher o bloco R7 do texto.
- [ ] No dia: prints do Search Console (Ações manuais e Problemas de segurança) e da Navegação segura (store.alna.sale, alna.sale, alnacommerce.com, alna.cc).
- [ ] No dia: conferir que a conta 635 continua "suspensa" e que a contestação de 8/10 consta como "recusada" (e se há novo aviso/pedido de verificação do anunciante).
- [ ] No dia: o Claude roda os comandos de reverificação do `STATUS.md` e atualiza a tabela acima.
- [ ] Cartão CNPJ à mão caso o Google peça.
- [ ] Enviar UMA vez, pela conta do dono, pelo link "Fale conosco" do aviso de suspensão; **não criar outra conta Google Ads**; não anunciar a ALNA por outra conta enquanto a 635 estiver suspensa.
