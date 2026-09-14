# Conectar domínio alnacommerce.com ao projeto

## Objetivo
Apontar o domínio `alnacommerce.com` (registrado na Hostnet) para o projeto Lovable, adicionando os registros DNS corretos no painel da Hostnet.

## Passos

1. **Reexibir o card de conexão do domínio**
   - Mostrar o card com os registros DNS exatos (A e TXT) fornecidos pela Lovable para `alnacommerce.com`.

2. **Orientar o preenchimento no painel da Hostnet**
   - Acessar a área de gerenciamento de DNS/Zona DNS do domínio `alnacommerce.com` (não a tela de nameservers).
   - Adicionar os registros indicados no card:
     - Registro A para o domínio raiz (`@`) apontando para o IP da Lovable.
     - Registro A para `www` apontando para o mesmo IP.
     - Registro TXT `_lovable` com o valor de verificação fornecido.
   - Salvar as alterações.

3. **Aguardar propagação e verificar status**
   - Aguardar a propagação DNS (pode levar até 72 horas, em geral muito menos).
   - Verificar o status do domínio no painel do projeto Lovable para confirmar quando estiver ativo.

## Notas
- Não alterar os nameservers do domínio, a menos que o usuário queira delegar o DNS inteiramente para outro provedor.
- Se o domínio usar proxy (Cloudflare), ativar a opção correspondente no card de conexão.
