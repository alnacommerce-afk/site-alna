# Google Ads — contestação da suspensão (pasta de trabalho)

Conta **635-244-4697** (informacoes.asm@gmail.com), campanha Performance Max "Alna | Utilidades Domésticas" (atacado, destino
`https://store.alna.sale/atacado`). Suspensa em 08/10/2026 03:27 por "Práticas comerciais inaceitáveis: phishing".

Como a contestação está sendo preparada **por partes**, enquanto o dono espera respostas de terceiros (Hostnet, Google), tudo fica aqui,
no repositório, para qualquer sessão (em qualquer máquina) continuar de onde parou.

## Arquivos
| Arquivo | Para que serve |
|---|---|
| `STATUS.md` | **Painel de situação**: o que já está feito, o que falta, quem faz, como verificar e a regra de "pode abrir". Atualizar SEMPRE. |
| `RASCUNHO-2a-contestacao.md` | Texto da 2ª contestação (com `[CONFIRMAR]` onde falta fato) e checklist de envio. |
| `EVIDENCIAS.md` | Fatos verificados, com data, de onde veio (print do dono, comando, API) e como reverificar. |

## Protocolo para o Claude — quando o dono informar QUALQUER coisa sobre a contestação
1. Ler `STATUS.md` (e `RASCUNHO-2a-contestacao.md`).
2. Registrar a informação nova no `STATUS.md` (status do item + linha no histórico) e, se for um fato, em `EVIDENCIAS.md`.
3. Reverificar o que dá para verificar sozinho (comandos no fim do `STATUS.md`): domínios, páginas, `/atacado` com AdsBot, certificados.
4. Responder ao dono no formato fixo:
   - **"Ainda falta:"** lista curta do que bloqueia (com quem está a ação), **ou**
   - **"Temos tudo: pode abrir a contestação."** — só quando todos os itens *bloqueantes* estiverem FEITO. Nesse caso entregar o texto
     final (sem colchetes) para ele colar.
5. Nunca enviar nada pelo dono, nunca criar conta Google Ads nova, nunca afirmar no texto algo que não esteja FEITO e verificado.
6. Só pode haver **UMA** contestação por vez: várias sem correção são marcadas como infundadas e limitam novos envios.
7. Se o dono mudar algo no site (publicar), conferir ao vivo antes de declarar o item FEITO ("publiquei, confere se subiu").
8. Commit + push + espelho no Drive a cada atualização (regra do projeto).
