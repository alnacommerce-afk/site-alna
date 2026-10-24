# Diário do Vendedor

Acrescenta sempre; nunca apaga.

## 2026-10-16 — Computador HOME — implantação
- Funcionário criado no setor Vendas, com desenho aprovado pelo dono.
- Ainda não foi acionado. Teste pendente: sessão nova dentro de `C:\Users\Pichau\dev\site-alna`.

## 2026-10-16 — Computador HOME — pedido direcionado pelo gerente (planejamento; nada executado)
- Campanha de 27/10 com 2 cupons (recompra e novidades; 1 por e-mail): montar a regra e o texto. Backoffice cuida do código depois do ok.
- Carrinho de 24h: falta o dono dizer o que ajustar.
- Cupom de boas-vindas em 2%: monitorar e registrar a métrica.
- Pesquisa: anunciar ou não os 5%, depois da decisão do dono.

## 2026-10-24 — Computador HOME — conhecimento de Meta Ads (Frente A: atacado, WhatsApp, R$ 15/dia)
- Base: `docs/PLANO-META-ADS.md` (rascunho, ainda não commitado). Nada foi criado na Meta, nada publicado, nada gasto.
- Conectores disponíveis nesta sessão: não há conector de Google Ads nem de Meta Ads para gerenciar campanhas. Ads Studio gera criativos (com créditos e aprovação prévia). Zernio publica posts orgânicos, não anúncio pago.
- Fatos verificados no plano (24/10): Pixel da Meta não existe no site (só GA4). Cupom `ALNA5%OFF`: 5%, mínimo R$ 250, limite 10 usos, uso atual 0, sem validade. Feed Meta existe. 6 imagens prontas em `docs/modelos/meta-anuncios/`. Conta Meta: último registro 14/10, sem confirmação.

### Decisões pendentes do dono (uma de cada vez)
1. **Desconto no anúncio:** (a) colocar o código `ALNA5%OFF` no anúncio, ou (b) tirar o percentual e falar só em "condições de atacado". Recomendação do plano: (a), depois de resolver a decisão 2.
2. **Limite do cupom:** subir de 10 para 100 usos e colocar validade de 14 dias (igual ao teste). Mudança de cupom é do Vendedor, com o "ok" do dono.
3. **Pixel:** instalar depois da página pronta, com eventos de visualização, carrinho e compra. Pergunta extra: é preciso aviso de cookies para dados enviados à Meta? Não há banner de cookies no código. Requer o "ok" do dono.

### Estrutura da Frente A (proposta do plano)
- Um só conjunto de anúncios, público amplo (Brasil, 25 a 60 anos), posicionamento automático.
- Dois anúncios: carrossel (Cozinha, Toalhas, Roupas) e imagem única 4:5.
- Destino: WhatsApp comercial. Mensagem de origem: "Olá! Quero comprar em quantidade na ALNA (anúncio atacado)."
- Revisão no dia 14. Medida de sucesso: custo por conversa qualificada e pedidos atribuídos.
- Sem "sem juros", "garantido" ou "o mais barato".

### Google Ads
- Qualquer parte de Google Ads passa pelo Jurídico (regra de roteamento). Nada foi enviado.

### Decisões do dono (24/10)
1. **Desconto no anúncio:** opção (a). O anúncio leva o código `ALNA5%OFF`.
2. **Limite do cupom:** sem mudança agora. O dono aumenta conforme a demanda. Hoje: 10 usos, sem validade.
3. **Pixel:** o dono pediu a criação. A Meta gera o ID no Gerenciador de Eventos, então o ID tem que ser colado pelo dono em Admin > Configurações (campo "Meta Pixel ID"). O código já está pronto e só carrega com o ID preenchido. Pendente: resposta sobre aviso de cookies/privacidade antes de colar o ID.
