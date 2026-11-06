# Plano: botão "Veja todos os produtos" na Home (celular) — 06/11/2026

## 1. O que o cliente vê hoje (print do dono)
- Logo a seguir ao banner: a faixa branca "Frete grátis acima de R$ 150" e o rosa "20% OFF" disputam o olhar.
- O botão fica **abaixo** da foto, na borda da primeira tela. Quem rola pouco vê a faixa navy com "MÊS DE NOVEMBRO" e toma o botão por um título ou um banner.
- O botão já é verde com degradê e um pulso, mas o pulso é só uma sombra que muda de intensidade. Na tela pequena quase não se percebe.
- A cor verde é a mesma do selo "ALNA" logo acima. Sobre o azul-marinho, o verde tem contraste médio e some no conjunto.

## 2. O que a pesquisa mostra (com o nível de confiança)
| Tema | O que foi encontrado | Confiança |
|---|---|---|
| Cor do botão | Não há cor "campeã" universal. O que mais pesa é o **contraste** com o que está em volta, não o matiz. Um teste muito citado (vermelho vence verde em 34%) vem de blog de fornecedor e não tem fonte primária. | Baixa para números; alta para o princípio do contraste |
| Cegueira de banner | Usuários ignoram o que parece anúncio (retângulo, cor forte, texto grande). Um botão dentro de um bloco com cara de banner corre esse risco. Recomendação: botão com aparência de controle de site (formato de botão, sombra, rótulo claro). | Média (fontes são blogs de design; o estudo original da Nielsen Norman Group não foi confirmado) |
| Movimento (pulso) | Um elemento pulsando chama o olhar; mais de um já concorre entre si. Pulso lento e discreto é o recomendado. Respeitar quem pede menos movimento (já está no site). | Baixa (são práticas de fornecedores, sem teste publicado) |
| Setas e emoji | Seta ou "👉" ajudam a guiar o olhar, mas um rótulo em texto ("Toque para ver os produtos") é mais claro para quem nunca viu a loja. | Baixa (sem dados medidos) |
| Toque no celular | Área de toque de no mínimo 44 px de altura. Não existe "hover" no celular: o destaque tem de estar no visual, não no passar do dedo. | Alta (regra de usabilidade consolidada) |
| Gesto da modelo | Os braços abertos apontam para os selos, não para o botão. Um selo ou seta pode conduzir o olhar do selo até o botão. | Inferência de design (não medida) |

Fontes consultadas (busca de 06/11/2026): Optinmonster e Popupsmart sobre cor de botão de CTA; Tangence e Publir sobre cegueira de banner; Framer e Designful sobre animação de CTA. Quase tudo é de fornecedor; por isso o plano termina em teste A/B.

## 3. Opções avaliadas (peso, velocidade e risco)
Todas são CSS ou texto. Nenhuma adiciona imagem, script ou requisição; o peso da página não muda.

| Opção | Efeito esperado | Risco | Recomendação |
|---|---|---|---|
| A. Botão de largura total, 56 px de altura, rótulo em uma linha, seta "→" no próprio rótulo | Passa a parecer botão, não título | Baixo | **Aplicar** |
| B. Cor: manter verde OU trocar por amarelo da marca (#ffc61a) com texto navy | Amarelo sobre azul-marinho tem contraste alto e se destaca de todo o resto | Médio: muda a identidade do botão; é preciso testar | **Testar** (A/B) |
| C. Pulso: escala 1 → 1,03 com anel suave a cada 2,4 s, só neste botão | Chama o olhar sem parecer propaganda | Baixo; respeitar `prefers-reduced-motion` | **Aplicar** |
| D. Rótulo acima do botão: "Toque para ver os produtos" | Diz o que acontece ao toque | Nenhum | **Aplicar** |
| E. Seta apontando do selo "20% OFF" para o botão | Conduz o olhar | Médio: pode poluir a foto | **Não aplicar agora** |
| F. Botão sobre a foto (sobrepor o braço da modelo) | Fica mais visível | Alto: já foi rejeitado pelo dono (cobre o braço) | **Descartar** |
| G. Emoji 👉 no rótulo | Chama atenção | Baixo, mas pouco profissional em loja de utilidades | **Não aplicar** |

## 4. Recomendação combinada (para o dono aprovar)
1. Botão de largura total (até 320 px), 56 px de altura, rótulo "VEJA TODOS OS PRODUTOS →".
2. Rótulo de apoio acima: "Toque para ver os produtos".
3. Pulso lento e discreto, só neste botão.
4. Cor: verde mantido por enquanto; amarelo fica como teste A/B (ver seção 5).
5. Pink "20% OFF" e o selo "ALNA" não mudam, para não competir com o botão.

## 5. Como medir (sem chutar)
- Medir antes: taxa de clique no botão (evento de clique no GA4, que já existe na Home) por 7 dias.
- Depois: mesma medida por 7 dias com a versão aprovada.
- Teste A/B de cor (verde x amarelo): só com tráfego suficiente para comparar, dividindo visitantes de forma aleatória. Sem isso, a escolha é de gosto.
- Velocidade: medir o PageSpeed celular antes e depois (Home estava em 99). Esperado: nenhuma mudança relevante, porque nada novo é carregado.

## 6. Decisões do dono antes de aplicar
1. Cor: verde (atual) ou amarelo da marca como teste?
2. Pulso: aplicar a versão discreta da seção 4, item 3?
3. Rótulo de apoio "Toque para ver os produtos": sim ou não?

## 7. Feito nesta data
- Espaço entre o card "Frete grátis" e o selo "ALNA" no celular reduzido de ~96 px para ~51 px (cerca de metade). Só CSS: `.hero-img` a 432 px e `.badges` fixo em 278 px, no bloco `@media(max-width:639px)` de `home-cloudflare/index.html`. Os selos não se mexeram; a modelo continua visível.
