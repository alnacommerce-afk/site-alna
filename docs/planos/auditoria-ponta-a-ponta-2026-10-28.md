# Auditoria ponta a ponta e plano de ajuste por página (28/10/2026)

Status (atualizado em 28/10): **aplicados** — ocultar avaliações vazias, linha de devolução sob o botão de compra, faixa do topo e menu da loja no celular, menu hambúrguer e remoção do e-mail do menu na home. **Pendentes** — texto do tamanho 68x140 (admin), frete "a partir de R$ X" na home (decisão do dono), explicação da soma de descontos no atacado, ícones de divergência no admin do catálogo. Cada ajuste passa pela avaliação de peso e de velocidade antes de ser aplicado.

## Escopo e limites do teste

- **Testado:** home (alna.sale), loja (/loja), atacado, uma página de produto (Toalha Paris), carrinho com 1 item (depois removido), checkout (tela de dados, sem enviar), sobre, contato, política de trocas. Versão desktop e mobile (375 px).
- **Não testado:** envio de pedido e pagamento (não se finaliza compra de teste), validação de campos do checkout, e-mails transacionais, outras páginas de produto, cupons (aplicação e empilhamento), página "Minha conta", busca.
- **Não medido aqui:** velocidade real. As notas do PageSpeed celular são as de referência já registradas pelo dono (Home 99, Atacado 97, Checkout 96, Produto 94, Carrinho 91, Loja 81). A Loja é a mais lenta e entra como prioridade.

## Prioridade

1. **Loja (81)**: mais lenta e é a porta de entrada da maioria das compras.
2. **Produto**: onde a expectativa é formada; tem inconsistências que quebram confiança.
3. **Carrinho e checkout**: onde o frete aparece tarde demais.
4. **Home**: textos de frete e promoção sem valor claro.
5. **Atacado**: regra de desconto por volume precisa ficar clara e aplicável.

## Achados e plano por página

### Home (alna.sale)

| # | Achado | Efeito para o cliente | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| H1 | Faixa diz "Frete grátis acima do valor mínimo", sem o valor. A loja diz R$ 150. | Cliente não sabe se o próprio pedido qualifica; quebra a expectativa. | Trocar por "Frete grátis acima de R$ 150". | Nenhum (texto). |
| H2 | "Até 20% OFF em toda a loja" e "Garanta o desconto do mês" (outubro). Todos os produtos da loja mostram "20% OFF". | Se o preço de referência não é real, a promoção é enganosa. Se a promoção acaba em outubro, a página segue prometendo. | **Confirmar com o dono** (ver perguntas abaixo) antes de qualquer mudança. Verificar a validade da promoção. | Nenhum. |
| H3 | Mesma página não explica como 20% se combina com 5% do cupom de atacado e 4% do Pix. | Cliente não entende o total final. | Definir a regra de empilhamento e escrever em uma frase. | Nenhum. |
| H4 | Home é a página mais rápida (99), mas a meta de 0,5 s pede nova medição depois de qualquer mudança. | Velocidade é a base de tudo. | Não mexer sem medir. | Medir antes e depois. |

### Loja (/loja)

| # | Achado | Efeito | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| L1 | Pontuação 81 no PageSpeed, a mais baixa do site. | Lentidão antes do primeiro produto aparecer. | Revisar tamanho das imagens dos cards (carregar versão reduzida) e a ordem de carregamento. | **Reduz** peso. Exige medição. |
| L2 | No celular, o banner principal ocupa a tela inteira; o primeiro produto só aparece depois de rolar bastante. | Cliente chega e não vê produto. | Reduzir a altura do banner no celular, ou encurtar a imagem. | Reduz peso se a imagem for menor. |
| L3 | Cards não mostram faixa de frete nem sinal de compra em quantidade. | Comprador de volume não sabe que o site atende ele. | Incluir chamada curta no card ou no topo da listagem: "Compre em quantidade: 5% acima de R$ 250". | Texto. |
| L4 | Todos os 26 produtos têm selo "20% OFF". | Selo repetido perde força e reforça a dúvida de H2. | Ver H2 antes de mexer. | Nenhum. |
| L5 | Ordenação padrão "Popularidade". | Pode esconder produtos de maior ticket. | Testar ordenação por "maior valor" ou por categoria em destaque. | Nenhum. |

### Produto (exemplo: Toalha Paris)

| # | Achado | Efeito | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| P1 | Título diz "68x140cm" e "270g"; a descrição diz "65x130cm". | Cliente recebe um produto diferente do que espera. Risco de troca e reclamação. | Corrigir o texto da descrição para o tamanho real. | Texto. |
| P2 | Descrição diz "Disponível em diferentes cores", mas não há seletor de cor. | Cliente procura a cor e não acha. | Ou criar o seletor, ou tirar a frase. | Seletor adiciona peso; a frase não. |
| P3 | Seção "Avaliações de quem comprou" aparece vazia. | Título de prova social sem prova: passa desconfiança. | Ou exibir avaliações reais (quando existirem), ou ocultar a seção até ter avaliações. Nunca criar avaliação fictícia. | Ocultar não pesa. |
| P4 | "100 em estoque" aparece em todos os produtos. | Se for valor fixo, é informação falsa. | **Confirmar** com o dono se o número é o estoque real. | Nenhum. |
| P5 | No celular, o botão "Adicionar ao carrinho" fica abaixo de várias imagens e do preço. | Cliente precisa rolar para comprar. | Testar uma barra fixa de compra no rodapé (preço + botão). | Pequeno (JS e CSS). Medir. |
| P6 | Frete só aparece depois de informar o CEP. | Expectativa quebrada no fim. | Ver C2. | Ver C2. |
| P7 | Ícone de WhatsApp flutuante cobre parte do preço no celular. | Atrapalha leitura do preço. | Mover o ícone ou reduzir no celular. | Nenhum. |
| P8 | Selo "Compra 100% segura", "Nota fiscal", "7 dias para devolução" aparecem no topo, mas longe do botão. | Confiança fica longe da decisão. | Repetir o selo de troca perto do botão de compra. | Texto/ícone pequeno. |

### Atacado (/atacado)

| # | Achado | Efeito | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| A1 | Texto promete "Acompanhe a barra do frete grátis" e "use o cupom ALNA5%OFF". O cupom precisa ser digitado. | Cliente que não digita o código perde o desconto. | Mostrar no carrinho "Falta R$ X para 5% de desconto" e aplicar o cupom de forma visível. | Pequeno. |
| A2 | Página tem muito conteúdo (lista de categorias, perguntas, condições). | Página longa para quem só quer montar o pedido. | Manter, mas com o botão "Montar meu pedido" repetido no início de cada bloco. | Nenhum. |
| A3 | "Sem pedido mínimo" está correto, mas o R$ 250 aparece como meta. | Está alinhado com a decisão do dono. | Manter e cuidar de L3 e C3 para não parecer mínimo. | Nenhum. |

### Carrinho

| # | Achado | Efeito | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| C1 | Barra de frete grátis aparece corretamente ("Faltam R$ 131,86…"). | Ponto forte. | Manter. | Nenhum. |
| C2 | O total mostra "—" até o cliente informar o CEP. | Cliente vê o total incompleto e pode desistir. É a quebra de expectativa que o dono quer evitar. | Mostrar frete estimado já no carrinho, ou pedir CEP antes do checkout. | Pequeno. |
| C3 | Carrinho vazio mostra só "Ver produtos". | Desperdício de oportunidade. | Mostrar 3 a 4 produtos de maior venda, com preço. | Usa imagens existentes; medir. |
| C4 | Bloco "Salve seu carrinho" (e-mail e WhatsApp) fica antes do botão "Finalizar compra". | Pede dado antes do cliente ver o total. | Mover para depois do total, ou para a saída da página. | Nenhum. |

### Checkout

| # | Achado | Efeito | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| K1 | Formulário pede muitos campos de uma vez (nome, CPF/CNPJ, WhatsApp, e-mail, confirmação de e-mail, endereço completo). | Cansa; quem está "só testando" desiste. | Começar pelo CEP (preenche endereço e mostra frete), depois dados. Avaliar retirar a confirmação de e-mail. | Nenhum; reduz campos. |
| K2 | Resumo mostra "Frete —" e "Total —" até o CEP. | Mesma quebra de C2. | Ver C2. | Pequeno. |
| K3 | Com carrinho vazio, a página só mostra "Seu carrinho está vazio", sem link de volta. | Cliente fica sem saída. | Botão "Ver produtos". | Nenhum. |
| K4 | Não testado: validação de campos e envio. | Lacuna. | Testar com dados de teste em ambiente de teste, nunca em produção. | Nenhum. |

### Páginas institucionais (sobre, contato, trocas)

| # | Achado | Efeito | Ajuste proposto |
|---|---|---|---|
| I1 | Política de trocas é completa: 7 dias para arrependimento, 30 dias para defeito, frete de devolução por conta da loja. | **Ponto forte de confiança**, pouco visível. | Resumir os três pontos no produto e no carrinho (P8). |
| I2 | Contato oferece WhatsApp, e-mail e Instagram com horário. | Ponto forte. | Manter. |
| I3 | Rodapé: "Categorias: Em breve". | Parece página inacabada. | Remover ou preencher. |

### Mobile, global

| # | Achado | Efeito | Ajuste proposto | Peso / velocidade |
|---|---|---|---|---|
| M1 | Faixa do topo mostra duas mensagens sobrepostas ("Frete grátis acima de R$ 150" e "Frete para todo o Brasil"). | Texto ilegível. | Mostrar uma mensagem por vez, em rotação simples ou em uma linha. | Pequeno (CSS). |
| M2 | Menu "CONTATO" fica cortado na borda direita em 375 px. | Pouca visibilidade do menu. | Menu em três itens ou ícone de menu. | Nenhum. |
| M3 | Título do banner em cinza claro sobre fundo claro. | Contraste baixo; difícil de ler no celular. | Escurecer o título (verificar contraste mínimo). | Nenhum. |
| M4 | Página não tem rolagem horizontal (verificado: 375 px). | Ok. | Manter. | — |
| M5 | Imagens de produto vêm em 1200 px, mesmo nos cards e miniaturas. | Peso desnecessário no celular. | Servir versões menores por tamanho de tela. | **Reduz** peso. Medir. |

## Perguntas para o dono (antes de aplicar)

1. **O preço de referência "20% OFF" em todos os produtos é real?** E a promoção de outubro acaba quando?
2. **O 20% soma com o cupom de 5% do atacado e com o Pix de 4%?** Qual a regra?
3. **"100 em estoque" é o estoque real?**
4. **Existem avaliações reais de clientes?** Se não, a seção fica oculta até existirem.
5. **O tamanho certo da toalha é 68x140 ou 65x130?**
6. **Podemos mostrar o frete estimado já no carrinho** (ou pedir o CEP antes do checkout)?

## Ordem de execução (quando houver "ok")

1. Textos sem peso: H1, P1, P3 (ocultar), M1, M2, M3, K3, I3, C4.
2. Medição de base da Loja (81) e da Home antes de mexer em imagens (L1, M5).
3. Imagens e banner da Loja (L1, L2, M5), medindo PageSpeed antes e depois.
4. Carrinho e checkout: C2, C3, K1 (com teste de ponta a ponta em ambiente de teste).
5. Produto: P2, P4, P5, P8 após respostas do dono.
6. Atacado: A1 (cupom visível), depois da regra de empilhamento (H3).

Cada item fechado: registrar em `docs/DECISOES.md` no mesmo commit e atualizar `docs/PENDENCIAS.md`.
