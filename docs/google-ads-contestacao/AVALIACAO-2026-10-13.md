# Avaliação geral do caso Google Ads (13/10/2026, depois da 2ª recusa)

Objetivo: reunir tudo o que sabemos, separar **fato verificado**, **declaração do dono** e **hipótese**, e definir como a 3ª contestação deve ser feita para ser assertiva. Fontes: `STATUS.md`, `EVIDENCIAS.md`, prints do dono, `curl`/consultas do Claude, RDAP público.

## 1. O que o Google disse (fatos)
- Conta 635-244-4697 suspensa em 08/10/2026 03:27: "Práticas comerciais inaceitáveis: phishing". **Único problema listado:** "Página de destino não está funcionando — Campanha Alna | Utilidades Domésticas, Grupo de recursos 1".
- 1ª contestação (6452280642, 08/10) recusada em ~horas. 2ª (6452545358, 13/10 ~10:30) recusada em **~45 min** → provável análise automática. Os e-mails **não dão motivo**; dizem que a medida afeta "o proprietário da conta e qualquer conta vinculada atual ou futura".
- Política (oficial): o Google avalia "anúncio, site, contas e fontes externas"; reativa "só em circunstâncias convincentes"; antes de contestar, **contas vinculadas/relacionadas devem estar em conformidade**; a contestação deve ser "completa, exata e honesta".
- Agente de IA do suporte (13/10): não deu motivo; levantou a hipótese "login e pagamento em domínio novo" (e disse que pode estar errado). As páginas `/atacado` e `alna.sale/` **não têm** login nem pagamento (verificado por curl); só o link "Minha conta".

## 2. O que descobrimos hoje (fatos)
**2.1 Domínios — todos jovens (RDAP público, consulta de 13/10):**
| Domínio | Registrado em | Observação |
|---|---|---|
| alnacommerce.com | **17/12/2025** | marca antiga; 522 em http até 08/10 (corrigido) |
| alna.cc | **19/08/2026** | WordPress/Woo antigo; erro de certificado/403 até 13/10 (Hostnet corrigiu) |
| alna.sale | **20/09/2026** (18 dias antes da suspensão) | domínio atual da Home; a loja é `store.alna.sale`; "última alteração" 25/09 |
Wayback Machine: **nenhum registro** dos três (sem histórico público de reputação). *Inferência:* um conjunto de domínios muito novos, TLD pouco comum (.sale), com cartão digitado no checkout, é o padrão que classificadores automáticos de phishing penalizam. **Não confirmado** como causa.

**2.2 Conta 962-967-1605 (outra Conta do Google do sócio):**
- 3 campanhas Performance Max ("campanha das toalhas", "Vendas-Performance Max-1", "Campanha utensílios de cozinha"), desde **09/02/2026**, **R$ 89,93, 8.186 impressões, 143 cliques**; grupo de recursos com aviso **"Destino que não funciona"** (mesmo tipo do erro da 635); outra campanha "limitada pela política". Pausada hoje por prazo da verificação do anunciante.
- **Destino exato: desconhecido.** Pelo RDAP, `alna.cc` não existia em fev/2026 (registrado em 19/08/2026) → **só `alnacommerce.com` (17/12/2025) é compatível** com a memória do dono. Hipótese forte, não confirmada.
- O dono **removeu as 3 campanhas em 13/10 (~11:40)** sem ter salvo o URL final; os CSVs baixados não têm URLs.
- A 1ª contestação disse que as outras contas **não tinham Google Ads** (incorreto para a 962); a 2ª **não mencionou** as outras contas.
- **172-390-8582:** projeto de 2022 sem relação (simulado ANCORD via hotmart), cancelada, sem violação.

**2.3 O que já corrigimos (08–13/10):** pagador do Ads → LTDA (verificado pelo Google em 09/10); Asaas no CNPJ da LTDA; identidade no site (rodapé de todas as páginas, inclusive login/checkout); `alnacommerce.com` e `alna.cc` → 301 → alna.sale com HTTPS; Merchant Center antigo encerrado (08/10); **verificação do anunciante concluída** (13/10); `/atacado` 200 rápido para AdsBot/Googlebot (9/9); acesso automático a cada 5 min.

## 3. Hipóteses, em ordem de peso (com o que a favorece e o que a enfraquece)
1. **Conta vinculada 962 com destino quebrado + resposta incompleta na 1ª contestação.** A favor: print do Google ("Destino que não funciona" na 962), a frase "contas vinculadas atuais ou futuras", respostas anteriores inexatas. Contra: não prova "phishing". **Peso: alto** para explicar a recusa; é o que mais **podemos corrigir**.
2. **Cluster de domínios novos + coleta de dados (login/cartão) no domínio novo.** A favor: RDAP; hipótese do próprio suporte. Contra: sem prova; `/atacado` limpo. **Peso: médio-alto**; não dá para "desfazer" a idade do domínio, só mostrar legitimidade (identidade, HTTPS, políticas, CNPJ, histórico de pedidos reais).
3. **Falha momentânea da página em 08/10 03:27** (partida a frio). A favor: o texto do erro; criamos o acesso a cada 5 min depois. Contra: não reproduzida em 15/15 + 9/9 testes. **Peso: médio** (pode ter sido o gatilho inicial; hoje já não ocorre).
4. **Expansão do URL final no PMax da 635** (leva anúncios a páginas fora do `/atacado`, como a Home e telas de login) — explicaria por que a IA citou `alna.sale/`. Não verificado; só dá para desligar com a conta ativa. **Peso: baixo-médio.**
5. **Identidades divergentes** (pagador PF, Asaas em MEI de outra pessoa, site da LTDA) — era real até 09/10; já corrigido; o Google pode ter avaliado antes disso. **Peso: médio, já mitigado.**
6. **Textos do site** ("Parcele em até 12x sem juros" com taxa embutida; "Compra 100% segura") — risco de "afirmação enganosa"; não é phishing. **Peso: baixo para o caso, mas vale corrigir.**

## 4. Pontos fracos do que enviamos antes (para não repetir)
- 1ª: respondeu "Não" a outras contas com Google Ads (incorreto).
- 2ª: não mencionou as outras contas; falou em "domínios antigos corrigidos" mas não explicou a idade/transição dos domínios; chamou o `Search Console` de "limpo" só com data de 08/10.
- Ambas: pediam reanálise sem apresentar uma causa provável nem provas anexáveis (o formulário não tem anexo).

## 5. Como a 3ª contestação deve ser (assertiva = específica, verificável, completa)
1. **Abrir com a correção:** declarar as 3 contas, o que a 962 anunciou (3 campanhas, R$ 89,93, 9/02/2026), a remoção em 13/10, e que a 1ª contestação estava incorreta. (Texto pronto em `RASCUNHO-3a-contestacao.md`.)
2. **Linha do tempo dos domínios** (curta e factual): alnacommerce.com (loja anterior, desde dez/2025) e alna.cc (site antigo) → consolidados em alna.sale/store.alna.sale; os antigos hoje redirecionam com HTTPS. *Precisa do relato do dono (por que mudou, quando).*
3. **Dados de legitimidade verificáveis:** CNPJ ativo desde 03/09/2024; NF; políticas; contatos; Asaas no CNPJ da LTDA. **Atenção: pedidos.** O banco tem 9 pedidos (8 pagos/enviados/concluídos; 1º em 15/09/2026; total pago ≈ R$ 192), mas **a maioria é teste do próprio dono** (ex.: Pix de teste 79a722c7). **NÃO citar pedidos como prova de clientes**; se citar, dizer apenas "a loja está em operação desde setembro de 2026", sem número.
4. **Segurança da página de destino:** `/atacado` sem login/cartão; checkout só no fim e em HTTPS; cartão não armazenado.
5. **Pedido específico:** que a equipe indique **qual página/anúncio/conta** foi considerado phishing, para corrigirmos; oferecer documentos.
6. **Não dizer** o que não sabemos (destino da 962: "segundo a lembrança do sócio"; Search Console: só com a data do print).

## 6. Melhorias no site que reforçam o caso (a avaliar com o dono — nenhuma aplicada)
- **(a)** Bloco "Quem somos" no corpo de `/atacado` (razão social, CNPJ, endereço, contatos) — pequeno, sem efeito relevante na velocidade.
- **(b)** Corrigir "12x sem juros" para algo verdadeiro.
- **(c)** Ao reativar a conta: desligar a expansão do URL final no PMax; manter só `/atacado` como destino.
- **(d)** Longo prazo: avaliar checkout hospedado da Asaas (sem cartão no nosso domínio) — mudança grande; só se houver evidência de que é a causa.

## 7. O que falta (de quem) antes de enviar
| Item | Quem |
|---|---|
| Resposta do suporte do Google (motivo/revisão manual) | dono (chat/caso) |
| URL final das campanhas removidas (filtro "Removida" / Histórico de alterações) | dono (prints) |
| Relato dos domínios: quando começou a loja, qual era o site em fev/2026, por que migrou para alna.sale | dono (por escrito) |
| Confirmação de cada frase do rascunho 3a (inclusive "não se lembrava das campanhas") | dono |
| Prints de hoje: Search Console (Ações manuais, Segurança) + Navegação segura (store.alna.sale, alna.sale, alnacommerce.com, alna.cc) | dono |
| Dono dizer **quantos pedidos foram de clientes reais** (o banco não distingue teste de cliente) | dono |
| Decidir (a) e (b) do item 6 | dono ("ok, aplique") |
| Texto final + reverificação no dia | Claude |

## 8. Cadência sugerida
- **Hoje–14/10:** reunir os itens acima; falar com o suporte; decidir (a)/(b).
- **14–15/10:** se o suporte responder o motivo, ajustar o texto; **enviar a 3ª uma única vez**.
- Se o suporte não responder em ~2 dias úteis, enviar mesmo assim com o texto do rascunho (a correção das contas é informação nova real).
- Depois do envio: não mexer em nada; aguardar; lembrete já agendado em 16/10.
