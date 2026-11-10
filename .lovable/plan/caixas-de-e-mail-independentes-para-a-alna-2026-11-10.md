# Caixas de e-mail independentes para a ALNA

## Recomendação
Usar Zoho Mail Lite com uma conta independente para cada endereço, começando pelos endereços solicitados: `contato@alna.sale` e `suporte@alna.sale`. Confirmar a lista completa antes da contratação.

Cada caixa terá mensagens, enviados e acesso separados. Será possível enviar, receber e responder com o próprio endereço pelo navegador ou aplicativo. Não usar endereços adicionais que compartilhem uma única caixa como substituto das caixas independentes.

## Custo previsto
Valor anterior de R$ 5 por usuário/mês NÃO confirmado (ver conferência abaixo; a página oficial traz R$ 56,25 para o Mail Lite e o painel de hospedagem citado em PENDENCIAS.md mostra R$ 6,25 anual). Confirmar preço final, periodicidade de cobrança e condições antes de contratar. A contratação e os pagamentos dependem do dono.

## Etapas
1. Confirmar quais endereços terão caixas próprias e quem terá acesso a cada um.
2. Contratar o plano após conferir o valor final. Não solicitar senhas no chat.
3. Verificar o domínio e criar todas as caixas antes de mudar o recebimento.
4. Conferir a configuração atual do domínio, os encaminhamentos existentes e o envio automático da loja. Se houver mensagens em outro serviço, definir sua cópia antes da troca.
5. Preparar os registros de e-mail exigidos pelo Zoho e apresentar as alterações ao dono antes de aplicá-las. Preservar os registros do site e do envio automático da loja.
6. Fazer a troca autorizada e testar cada caixa: receber de um endereço externo, enviar para ele e responder. Confirmar que o remetente corresponde à caixa usada e que os e-mails automáticos da loja continuam chegando.

## Benefícios e cuidados
- Mensagens e acessos separados por área, evitando misturar atendimento e contato comercial.
- Cada caixa contratada tem custo próprio.
- A troca mal feita pode interromper o recebimento ou prejudicar os e-mails automáticos; por isso as caixas devem existir antes da mudança.
- Sem imagens, scripts ou alterações no site: nenhum peso adicional no carregamento e nenhum armazenamento ou tráfego adicional no Supabase para essas caixas. As mensagens ficam no provedor de e-mail.

## Detalhes técnicos
- Revalidar a autoridade DNS e os registros atuais antes da execução; usar os valores exatos fornecidos para a conta Zoho contratada.
- Ajustar MX e autenticação SPF/DKIM conforme necessário, sem criar registros SPF duplicados e sem remover a autenticação do serviço de envio da loja.
- Nenhuma alteração de código, banco, políticas, chaves de API ou cofre faz parte deste plano.

## Conferência na fonte oficial (10/11/2026)
Confirmado na página oficial brasileira: planos Mail Premium (R$ 20 por usuário/mês, 50 GB) e Mail Lite listado a "R$ 56,25 por usuário/mês" com 5 GB ou 10 GB (texto ambíguo). O preço de R$ 5 citado acima NÃO foi confirmado: o valor de R$ 56,25 parece erro de página ou outro dado, e não há menção a cobrança anual. Não há menção a plano gratuito. Ação: confirmar o preço no checkout antes de qualquer contratação.

Confirmado no guia oficial do Cloudflare: registros MX `mx.zoho.com` (prioridade 10), `mx2.zoho.com` (20) e `mx3.zoho.com` (50 na página consultada; outra fonte cita 30, por isso conferir no próprio Admin Console, aba DNS Mapping). SPF: um único TXT na raiz (`v=spf1 include:zohomail.com ...`). DKIM: seletor criado no Admin Console e TXT com o valor gerado. Remover todos os MX antigos antes (o Zoho avisa que MX antigo gera perda de e-mails). Propagação: de 1 a 2 horas para o MX; de 4 a 48 horas para SPF/DKIM.

Correção: a página de "envio por endereço" consultada NÃO trata de endereços adicionais; ela só mostra a opção "Para respostas, enviar usando" (Configurações > Mail > Compose). A frase de que cada caixa "enviará com o próprio endereço" depende de haver caixa própria por endereço e ainda precisa de confirmação.

Em aberto (não confirmado nas fontes oficiais consultadas): (a) se um alias custa licença extra e quantos são permitidos (há 30 citados em material de marketing, 5 em fonte de terceiros, não confiável); (b) se uma "Caixa compartilhada" (grupo) consome licença e como responde. Esses dois pontos decidem se `contato@` e `suporte@` precisam de caixa própria ou se podem ser alias/caixa compartilhada, e devem ser checados antes da contratação.

## Fontes oficiais consultadas
- [Planos Zoho Mail (Brasil)](https://www.zoho.com/pt-br/mail/lp-zohomailbr.html)
- [Configuração de DNS no Cloudflare](https://www.zoho.com/mail/help/adminconsole/cloudflare.html)
- [Configurar Compose (respostas)](https://www.zoho.com/mail/help/compose.html)
- [Caixa compartilhada (Admin Console)](https://zoho.com/mail/help/adminconsole/collaborative-inbox-settings.html) (resultado de busca, não aberta)
- [Alias de e-mail (ajuda)](https://help.zoho.com/portal/kb/articles/how-do-i-add-an-email-alias) (resultado de busca, não aberta)

A aprovação autoriza preparar essa configuração, não contratar serviços pagos nem trocar registros sem a confirmação prevista acima.