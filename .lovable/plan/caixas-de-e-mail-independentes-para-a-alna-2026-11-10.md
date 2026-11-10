# Caixas de e-mail independentes para a ALNA

## Recomendação
Usar Zoho Mail Lite com uma conta independente para cada endereço, começando pelos endereços solicitados: `contato@alna.sale` e `suporte@alna.sale`. Confirmar a lista completa antes da contratação.

Cada caixa terá mensagens, enviados e acesso separados. Será possível enviar, receber e responder com o próprio endereço pelo navegador ou aplicativo. Não usar endereços adicionais que compartilhem uma única caixa como substituto das caixas independentes.

## Custo previsto
A página brasileira consultada anuncia o Mail Lite de 5 GB a R$ 5 por usuário/mês. Duas contas seriam uma referência de R$ 10/mês; confirmar preço final, periodicidade de cobrança e condições antes de contratar. A contratação e os pagamentos dependem do dono.

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

## Fontes oficiais consultadas
- [Plano Mail Lite no Brasil](https://www.zoho.com/pt-br/mail/lp-zohomailbr.html)
- [Contas e endereços adicionais](https://www.zoho.com/pt-br/mail/email-accounts.html)
- [Envio por endereço e respostas](https://www.zoho.com/mail/help/compose.html)

A aprovação autoriza preparar essa configuração, não contratar serviços pagos nem trocar registros sem a confirmação prevista acima.