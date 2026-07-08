# Guia de Uso do Sistema E-STE

Manual operacional para gestores e instrutores

Versão: julho de 2026

## Apresentação

O E-STE é o sistema usado pela Seção de Treinamento e Ensino para organizar semanas, turmas, matérias, instrutores, horários, confirmações de QTS, relatórios de horas/aula, comunicações e backup das grades.

Este guia foi escrito para dois públicos:

- Instrutores, que usam o sistema para manter seus dados, selecionar matérias, preencher horários, confirmar a grade e solicitar ajustes à STE.
- Gestores, que usam o sistema para preparar a base de dados, aprovar pessoas, organizar turmas e semanas, alterar QTS, confirmar grades, emitir relatórios, enviar comunicações e administrar backups.

> **Atenção:** o sistema trabalha com dados reais da grade. Antes de excluir horários ou esvaziar grades, confira turma, semana e filtros selecionados.

## Acesso ao sistema

### Entrar no E-STE

1. Acesse o endereço do sistema: https://e-ste.vercel.app
2. Na tela de login, informe e-mail ou usuário.
3. Digite a senha cadastrada.
4. Clique em **Entrar**.

O mesmo login atende gestores e instrutores. O sistema identifica o perfil do usuário e exibe os menus adequados.

### Solicitar cadastro como instrutor

1. Na tela de login, clique em **Solicitar cadastro de instrutor**.
2. Preencha nome completo, nome que aparecerá na grade, e-mail, WhatsApp com DDD, senha e confirmação de senha.
3. Clique em **Enviar cadastro**.
4. Aguarde a aprovação de um gestor.

Depois da aprovação, o instrutor consegue entrar normalmente pelo login.

### Esqueci minha senha

1. Na tela de login, clique em **Esqueci minha senha**.
2. Informe o e-mail cadastrado e clique em **Enviar link de redefinição**.
3. Se o e-mail estiver cadastrado, um link de redefinição é enviado (válido por 1 hora).
4. Abra o e-mail e clique no link recebido.
5. Na tela de redefinição, informe a nova senha e a confirmação e clique em **Redefinir senha**.

> **Atenção:** por segurança, o sistema sempre mostra a mesma mensagem de confirmação no passo 2, mesmo que o e-mail informado não esteja cadastrado. Depois de redefinir a senha, os acessos já abertos em outros dispositivos são encerrados.

### Sair do sistema

Use o botão **Sair** no canto superior direito. Em computadores, o nome do usuário e o perfil aparecem na barra superior.

### Mensagens

O sino da barra superior abre a área de mensagens. Ali aparecem avisos gerados pelo sistema, como solicitações de auxiliares, alterações ou comunicações importantes.

- Mensagens não lidas ficam destacadas.
- Ao clicar no texto de uma mensagem, o sistema marca a mensagem como lida e leva diretamente para a tela relacionada ao assunto (por exemplo, uma solicitação de auxiliares abre em **Auxiliares pendentes**). Quando isso for possível, aparece o aviso **Clique para abrir**.
- Também é possível marcar uma mensagem como lida sem abrir a tela, usando o botão de marcar (ícone de check) ao lado do texto.
- Quando houver várias mensagens, use **Marcar todas**.

## Conceitos básicos

### Perfis

- **Instrutor:** preenche suas aulas, confirma horários, atualiza perfil, consulta grades e solicita ajustes à STE.
- **Gestor:** administra usuários, turmas, matérias, semanas, QTS, relatórios, comunicações e backup.

> **Gestor também pode lecionar:** um gestor pode selecionar matérias próprias em **Editar perfil gestor**, na mesma área usada pelos instrutores ("Matérias que também leciona"). Depois disso, o gestor aparece como opção de instrutor em **Preencher horários** e em **Modificar horários**, podendo preencher e confirmar suas próprias aulas normalmente.

### Turma

Representa uma turma do curso. Toda grade é lançada para uma turma específica.

### Matéria

Representa uma disciplina ou conteúdo. Cada matéria pode ter carga horária cadastrada e pode ser vinculada a uma ou mais turmas.

### Semana

Representa o período semanal usado na grade. A semana possui nome, data inicial e data final.

### QTS

É a grade semanal da turma. No sistema, o gestor pode modificar o QTS, confirmar o QTS e exportar PDF ou Excel.

### Hora/aula

No relatório de horas/aula, cada aula lançada conta como 1 hora/aula. A referência exibida no sistema é: 45 min = 1 hora/aula.

### Chefe da pasta

É o instrutor responsável por uma matéria. Cada matéria pode ter apenas um chefe de pasta. Essa configuração fica na tela de instrutores e gestores.

## Navegação geral

### Menu lateral

O menu lateral fica à esquerda. Em telas pequenas, use o botão da barra superior para abrir ou fechar o menu.

Áreas comuns ao instrutor e ao gestor:

- Preencher horários
- Visualizar horários
- Horas/aula
- Minhas matérias
- Editar perfil

Área exclusiva do gestor:

- Aprovar instrutores
- Cadastrar instrutor
- Alterar instrutores/gestores
- Cadastrar gestor
- Criar semanas
- Matérias por turma
- Modificar horários
- Auxiliares pendentes
- Carga horária
- Comunicações
- Banco e backup
- Editar perfil gestor

### Filtros principais

Muitas telas usam filtros parecidos:

- Mês
- Semana
- Turma
- Matéria
- Instrutor

Sempre confira esses filtros antes de salvar, exportar, confirmar ou excluir.

## Guia rápido do instrutor

### Primeiro acesso do instrutor

1. Solicite cadastro na tela pública ou receba um cadastro feito pelo gestor.
2. Aguarde a aprovação, caso tenha feito cadastro público.
3. Entre no sistema.
4. Acesse **Editar perfil** e confira seus dados.
5. Acesse **Minhas matérias** e selecione as matérias que leciona, se necessário.

> **Importante:** se uma matéria não aparecer para preenchimento, verifique se ela foi cadastrada pelo gestor, vinculada à turma e associada ao seu perfil.

### Atualizar perfil

1. Acesse **Editar perfil**.
2. Atualize nome completo, nome de aparição na grade, e-mail/login, WhatsApp ou senha.
3. Se desejar manter a senha atual, deixe os campos de nova senha e confirmação em branco.
4. Se digitar uma nova senha, repita-a no campo **Confirmar nova senha**. As duas precisam ser idênticas para salvar.
5. Clique em **Salvar alterações**.

O WhatsApp é usado para gerar links de aviso e contato. Informe o número com DDD.

### Selecionar matérias

1. Acesse **Minhas matérias**.
2. Marque as matérias que fazem parte do seu perfil.
3. Clique em **Salvar matérias**.

Essa seleção ajuda o sistema a mostrar somente as matérias compatíveis com o instrutor e a turma.

### Preencher horários

1. Acesse **Preencher horários**.
2. Selecione o mês, a semana e a turma.
3. Selecione a matéria.
4. Informe o local da instrução. Se deixar em branco, o sistema usa CAEBM.
5. Marque **Prova** se a aula for uma avaliação.
6. Na grade, clique em **+ preencher** no dia e horário desejado.

O sistema mostra a carga horária no formato `lançadas(CH total)`. Exemplo: `8(20)` significa 8 aulas lançadas de uma carga horária total de 20.

### Aulas pendentes de confirmação

Para instrutores, algumas aulas ficam pendentes até a confirmação.

- A aula só entra definitivamente na grade quando o instrutor confirma os horários da turma e semana.
- Se sair da página antes de confirmar, as aulas pendentes podem ser perdidas.
- O sistema avisa quando houver aulas aguardando confirmação.

### Confirmar horários

1. Depois de preencher as aulas, revise a grade.
2. Clique em **Confirmar horários desta turma/semana**.
3. Se houver aulas pendentes, o botão aparece como **Confirmar e gravar aulas desta turma/semana**.
4. Leia as mensagens de confirmação.

Depois da confirmação, as aulas já gravadas ficam bloqueadas para edição direta. Horários vazios continuam disponíveis para novo preenchimento.

> **Atenção:** depois de confirmar, alterações em aulas já lançadas devem ser solicitadas à STE.

### Remover aula antes da confirmação

Enquanto a aula ainda estiver editável, use **Remover aula** dentro da célula preenchida. O sistema pode pedir confirmação antes de remover.

### Alterar local ou marcar prova

Nas aulas do próprio instrutor, enquanto não estiverem bloqueadas:

- Edite o campo de local da instrução e clique em **Salvar**.
- Marque ou desmarque a opção **Prova**.

### Solicitar auxiliares

O instrutor pode informar a quantidade desejada de auxiliares tanto em uma aula ainda pendente (antes de confirmar) quanto em uma aula já gravada:

1. Localize a aula na grade.
2. Informe a quantidade no campo de auxiliares.
3. Clique em **Solicitar auxiliares**.

Se a aula ainda estiver pendente, o pedido é enviado automaticamente aos gestores no momento em que o instrutor confirmar os horários. Se a aula já estiver gravada, o pedido é enviado assim que o instrutor clicar em **Solicitar auxiliares**.

Em ambos os casos, o gestor recebe uma notificação e autoriza a quantidade em **Auxiliares pendentes**.

> **Atenção:** depois que a aula é confirmada, o instrutor não pode mais alterar a quantidade de auxiliares solicitados. Qualquer ajuste depois da confirmação precisa ser feito pelo gestor.

### Solicitar modificação à STE

Use esta tela quando precisar alterar algo após a confirmação ou quando houver uma situação que dependa da equipe gestora.

1. Acesse **Solicitar modificação STE**.
2. Selecione mês, turma e semana.
3. Descreva o que precisa ser alterado e o motivo.
4. Clique em **Enviar solicitação**.
5. Acompanhe a situação em **Minhas solicitações**.

Status possíveis:

- Pendente
- Aprovada
- Rejeitada

### Visualizar horários

1. Acesse **Visualizar horários**.
2. Selecione mês, semana e turma.
3. Consulte a grade.

Gestores podem exportar a visualização em PDF ou Excel. Instrutores usam a tela para consulta.

### Consultar horas/aula

1. Acesse **Horas/aula**.
2. Selecione o mês.
3. Consulte o total do mês.

Para instrutores, o sistema mostra o próprio total. Para gestores, mostra todos os instrutores.

### Falar com a STE

Nas telas de perfil e preenchimento de horários pode aparecer o botão **WhatsApp da STE**. Ele abre uma conversa com mensagem pronta, desde que o gestor tenha cadastrado o contato da STE.

## Guia rápido do gestor

### Fluxo recomendado de preparação

Para iniciar uma nova base ou novo período, siga esta ordem:

1. Cadastre matérias e cargas horárias em **Matérias por turma**.
2. Cadastre turmas em **Matérias por turma**.
3. Vincule as matérias às turmas.
4. Cadastre semanas em **Criar semanas**.
5. Cadastre ou aprove instrutores.
6. Associe matérias aos instrutores.
7. Defina chefes de pasta por matéria.
8. Cadastre o WhatsApp da STE no perfil gestor, se desejar liberar o contato rápido.
9. Acompanhe o preenchimento e faça ajustes em **Modificar horários**.

### Aprovar instrutores

1. Acesse **Aprovar instrutores**.
2. Confira nome, e-mail e nome que aparecerá na grade.
3. Clique em **Aprovar** para liberar acesso.
4. Clique em **Rejeitar** para remover uma solicitação indevida.

Cadastros feitos pelo link público entram como pendentes.

### Cadastrar instrutor pelo gestor

1. Acesse **Cadastrar instrutor**.
2. Preencha nome completo, nome na grade, e-mail/login, WhatsApp e senha.
3. Selecione as matérias que o instrutor leciona.
4. Clique em **Cadastrar instrutor**.

O instrutor cadastrado pelo gestor já entra aprovado.

### Cadastrar gestor

1. Acesse **Cadastrar gestor**.
2. Preencha nome, e-mail/login e senha.
3. Marque **Chefe STE** se esse gestor deve assinar como chefe da STE.
4. Salve o cadastro.

Somente gestores podem cadastrar outros gestores.

### Alterar instrutores e gestores

1. Acesse **Alterar instrutores/gestores**.
2. Clique no nome do instrutor para abrir as opções.
3. Atualize nome, nome na grade, e-mail ou WhatsApp.
4. Marque ou desmarque matérias.
5. Clique em **Salvar matérias** quando alterar as matérias.

Também é possível:

- Selecionar todas as matérias para um instrutor.
- Limpar todas as matérias.
- Excluir instrutor.

Na mesma tela, a lista **Gestores cadastrados** também é editável: clique no nome do gestor para abrir os campos de nome, nome na grade, e-mail, WhatsApp e o marcador **Chefe da STE**. É possível excluir um gestor por ali, exceto o gestor master e o próprio usuário logado.

### Definir chefe de pasta por matéria

Na tela **Alterar instrutores/gestores**, use a área **Chefia de pasta por matéria**.

1. Localize a matéria.
2. Escolha o instrutor responsável.
3. O sistema salva a chefia de pasta.

Só aparecem candidatos vinculados à matéria.

### Criar matérias

1. Acesse **Matérias por turma**.
2. Na área **Criar matéria**, informe o nome da matéria.
3. Informe a carga horária total, se houver.
4. Clique em **Criar**.

A carga horária é usada nos relatórios e nos indicadores de progresso da grade.

### Criar turmas

1. Acesse **Matérias por turma**.
2. Na área **Criar turma**, informe o nome.
3. Clique em **Criar**.

Depois, vincule as matérias correspondentes a essa turma.

### Vincular matérias às turmas

1. Ainda em **Matérias por turma**, vá até **Matérias por turma**.
2. Em cada turma, marque as matérias que pertencem a ela.
3. Desmarque as matérias que não devem aparecer naquela turma.

> **Exemplo:** marque APH na turma que possui APH e deixe desmarcada nas turmas que não terão essa matéria.

### Criar semanas

1. Acesse **Criar semanas**.
2. Informe o nome da semana. Exemplo: Semana 01.
3. Informe data inicial e data final.
4. Clique em **Criar**.

As semanas aparecem nos filtros de preenchimento, visualização, QTS e relatórios.

### Modificar horários e QTS

A tela **Modificar horários** é a principal área operacional do gestor.

1. Selecione mês, semana e turma.
2. Escolha o modo de inserção:
   - Aula
   - A DISPOSICAO DA ESFAO
   - A DISPOSICAO DA ESFAP
   - MISSAO DABM
   - FERIADO
   - Texto livre
3. Se o modo for **Aula**, selecione matéria, instrutor, local e prova, se necessário.
4. Clique em **+ inserir** em um horário livre ou **Substituir** em um horário preenchido.

O gestor consegue lançar aulas mesmo quando a carga horária já foi atingida, mas o relatório indicará excedente.

### Editar detalhes de uma aula

Na grade de **Modificar horários**, em uma aula existente:

- Use **Editar aula/prova** para alterar auxiliares autorizados, aula corrente, local, prova e observações internas.
- Use **Marcar prova** ou **Desmarcar prova** para alterar rapidamente a situação.
- Use **Avisar WhatsApp** para abrir uma mensagem pronta para o instrutor, quando houver WhatsApp cadastrado.

### Excluir aulas pelo gestor

Na tela **Modificar horários**, o botão **Excluir** marca a aula para exclusão pendente.

- A exclusão não é aplicada imediatamente.
- O sistema informa quantas exclusões estão pendentes.
- As exclusões só são gravadas quando o gestor clica em **Confirmar QTS**.
- É possível usar **Desfazer exclusões pendentes** antes da confirmação.

> **Atenção:** essa regra reduz risco de exclusões acidentais. Sempre revise a grade antes de confirmar o QTS.

### Confirmar QTS

1. Selecione mês, semana e turma.
2. Revise a grade.
3. Confira exclusões pendentes, se existirem.
4. Clique em **Confirmar QTS**.
5. O sistema gera o PDF do QTS.

Ao confirmar, o sistema também consolida exclusões pendentes e pode registrar mensagens aos instrutores envolvidos.

> **Atenção:** a numeração de aula de cada matéria (o número mostrado em "8(20)") é calculada automaticamente por padrão, mas pode ser sobrescrita manualmente em qualquer aula (campo "Aula corrente" em Editar aula/prova). Ao salvar um número manual, todas as aulas seguintes dessa matéria (em ordem cronológica na turma) são recalculadas automaticamente a partir desse número, mesmo que já tivessem um número manual definido antes. As aulas anteriores à editada nunca são alteradas. A carga horária total cadastrada da matéria (o "total" mostrado entre parênteses) nunca é alterada automaticamente.

### Exportar grade

Gestores podem exportar:

- PDF da grade.
- Excel da grade.
- PDF do QTS ao confirmar.

Os botões ficam em **Modificar horários** e **Visualizar horários**.

### Autorizar auxiliares

A tela **Auxiliares pendentes** reúne todas as aulas com pedido de auxiliares ainda não totalmente autorizado, feito por qualquer instrutor.

1. Acesse **Auxiliares pendentes**.
2. Confira turma, semana, dia, horário e matéria de cada pedido.
3. Informe a quantidade de auxiliares autorizada.
4. Clique em **Autorizar**.

Depois de autorizada a quantidade solicitada, a aula sai da lista de pendentes. Somente o gestor pode autorizar ou alterar auxiliares depois que a aula estiver confirmada.

### Acompanhar carga horária

1. Acesse **Carga horária**.
2. Selecione mês e turma, ou veja todas as turmas.
3. Confira carga cadastrada, aulas lançadas, saldo, progresso e excedentes.

Use esta tela para verificar se alguma matéria ultrapassou a carga horária planejada ou se ainda há saldo.

### Acompanhar horas/aula

1. Acesse **Horas/aula**.
2. Selecione o mês.
3. Confira o total geral e a distribuição por instrutor.

Esse relatório ajuda a acompanhar a carga mensal de cada instrutor.

### Comunicações

A tela **Comunicações** permite disparar e-mails, desde que o SMTP esteja configurado no ambiente do sistema.

Opções disponíveis:

- Disparar apoio por matéria: envia e-mail para todos os instrutores da matéria selecionada.
- Disparar somente para chefe da pasta: envia e-mail apenas para o chefe da pasta da matéria.

Para enviar:

1. Selecione a matéria.
2. Informe início e fim do período.
3. Escreva uma observação opcional.
4. Clique no botão de disparo.

> **Observação:** quando o e-mail automático estiver desativado, o sistema avisa que SMTP_HOST, SMTP_FROM, SMTP_USER e SMTP_PASS precisam estar configurados.

### Banco de dados e backup

A tela **Banco e backup** mostra:

- Uso atual do banco.
- Limite configurado.
- Total de horários, aulas, confirmações, solicitações, instrutores e gestores.

Para backup:

1. Acesse **Banco e backup**.
2. Clique em **Fazer backup das grades**.
3. Guarde o arquivo gerado.

Para esvaziar grades:

1. Gere um backup na mesma sessão.
2. Clique em **Esvaziar grades preenchidas**.
3. Confirme a ação.

Essa limpeza remove horários, confirmações e solicitações de modificação. Instrutores e gestores são mantidos.

> **Atenção:** use o esvaziamento somente quando realmente quiser limpar as grades preenchidas. O sistema exige backup antes de liberar a ação.

### Editar perfil do gestor

1. Acesse **Editar perfil gestor**.
2. Atualize nome, nome na grade, **e-mail/login**, WhatsApp e senha, se necessário.
3. Marque **Chefe da STE** quando aplicável.
4. Se também lecionar, selecione as matérias em **Matérias que também leciona**.
5. Cadastre o WhatsApp da STE para habilitar o botão de contato dos instrutores.

O e-mail cadastrado aqui é o mesmo usado para login. Ao trocar o e-mail, use o novo endereço no próximo acesso.

## Rotinas recomendadas

### Antes de abrir preenchimento aos instrutores

1. Confira se as semanas do período foram cadastradas.
2. Confira se as turmas foram cadastradas.
3. Confira se as matérias estão vinculadas às turmas corretas.
4. Confira se cada instrutor possui suas matérias associadas.
5. Confira se o contato da STE está atualizado.

### Durante o preenchimento

1. Acompanhe mensagens e solicitações.
2. Use **Visualizar horários** para consultar grades.
3. Use **Modificar horários** para ajustes necessários.
4. Use **Carga horária** para acompanhar saldo e excedente.

### Ao fechar a semana

1. Revise a grade em **Modificar horários**.
2. Resolva solicitações pendentes.
3. Confira auxiliares, provas e locais.
4. Clique em **Confirmar QTS**.
5. Guarde o PDF gerado.

### Periodicamente

1. Consulte **Horas/aula**.
2. Consulte **Banco e backup**.
3. Faça backup das grades quando necessário.
4. Revise usuários, matérias e chefias de pasta.

## Boas práticas

- Confira sempre mês, semana e turma antes de salvar.
- Use nomes de semana padronizados, como Semana 01, Semana 02.
- Mantenha o WhatsApp dos instrutores atualizado.
- Oriente instrutores a confirmar a grade antes de sair da tela.
- Use solicitações à STE para mudanças após confirmação.
- Faça backup antes de qualquer limpeza de grades.
- Evite excluir usuários sem verificar se ainda precisam acessar histórico ou relatórios.

## Problemas comuns

### A matéria não aparece para o instrutor

Verifique:

- A matéria foi cadastrada?
- A matéria está vinculada à turma?
- A matéria está associada ao instrutor?
- A carga horária já foi atingida? Instrutores podem ficar impedidos de lançar novas aulas quando a carga estiver completa.

### A semana não aparece no filtro

Verifique:

- A semana foi cadastrada?
- O mês selecionado no filtro corresponde à semana?
- A data inicial e final foram preenchidas corretamente?

### O instrutor não consegue editar uma aula

Possíveis motivos:

- A aula já foi confirmada.
- A aula pertence a outro instrutor.
- A alteração precisa ser feita pela STE.

### O botão de WhatsApp não aparece ou informa número ausente

Verifique:

- O WhatsApp do instrutor foi cadastrado?
- O WhatsApp da STE foi cadastrado pelo gestor?
- O número possui DDD?

### O e-mail automático está desativado

O sistema precisa de configuração SMTP no ambiente. Enquanto isso, use os avisos por WhatsApp ou comunique manualmente.

### O banco está perto do limite

1. Acesse **Banco e backup**.
2. Gere backup das grades.
3. Avalie se é o momento de esvaziar grades preenchidas.
4. Não exclua usuários por engano: limpeza de grades e exclusão de usuários são ações separadas.

## Checklist de treinamento

### Para instrutores

- Entrar no sistema.
- Atualizar perfil e WhatsApp.
- Selecionar matérias.
- Preencher aula na grade.
- Marcar prova.
- Informar local da instrução.
- Solicitar auxiliares.
- Confirmar horários.
- Abrir solicitação à STE.
- Consultar horas/aula.

### Para gestores

- Aprovar instrutor.
- Criar matéria com carga horária.
- Criar turma.
- Vincular matéria à turma.
- Criar semana.
- Associar matérias ao instrutor.
- Definir chefe de pasta.
- Modificar QTS.
- Confirmar QTS e gerar PDF.
- Exportar grade.
- Autorizar auxiliares pendentes.
- Consultar carga horária.
- Consultar horas/aula.
- Fazer backup.

## Encerramento

O E-STE centraliza a rotina de grade, confirmação, comunicação e acompanhamento da Seção de Treinamento e Ensino. Para um uso seguro, mantenha os cadastros atualizados, revise filtros antes de salvar e confirme o QTS somente após checagem da grade.
