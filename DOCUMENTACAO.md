# Documentação Completa da Aplicação "Propósitos"

Bem-vindo(a) à documentação oficial da plataforma "Propósitos". Este guia detalha todas as funcionalidades disponíveis, tanto do ponto de vista do administrador quanto do casal.

---

## 1. Visão Geral

"Propósitos" é uma plataforma completa para planejamento de casamentos, projetada para ser gerenciada por um administrador central e utilizada por múltiplos casais (subcontas). A aplicação é dividida em duas grandes áreas:

-   **Painel do Administrador:** Para gerenciamento da plataforma, casamentos, usuários e configurações da IA.
-   **Painel do Casal:** O ambiente de trabalho para os noivos, colaboradores e convidados planejarem e interagirem com o casamento.

---

## 2. Painel do Administrador (Super Admin)

O Super Admin tem controle total sobre a plataforma. O primeiro usuário a se cadastrar no sistema é automaticamente promovido a Super Admin.

### 2.1. Acesso

-   Para acessar, navegue para `/admin/dashboard`.

### 2.2. Funcionalidades

#### **Dashboard**

-   **O que faz:** Exibe estatísticas rápidas, como o número total de usuários e casamentos na plataforma.

#### **Gerenciar Casamentos**

-   **O que faz:** Permite criar, editar, remover e popular subcontas de casamento com dados de exemplo.
-   **Como usar:**
    1.  **Criar:** Preencha os nomes do casal para criar uma nova subconta em branco.
    2.  **Popular com Dados:** Use o ícone de varinha mágica (`<Wand2 />`) para preencher a subconta com um conjunto completo de dados de exemplo (ideal para demonstrações).
    3.  **Editar/Remover:** Altere nomes ou remova permanentemente a subconta e todos os dados associados.

#### **Gerenciar Usuários**

-   **O que faz:** Permite convidar novos usuários, atribuir-lhes funções e associá-los a um ou mais casamentos.
-   **Como usar:**
    1.  **Convidar:** Registre o nome, e-mail e a função do novo usuário (Noiva, Noivo, Colaborador, Convidado). O usuário precisa se cadastrar na plataforma com o **mesmo e-mail** para ativar o acesso.
    2.  **Editar:** Altere a função de um usuário e atribua acesso a múltiplos casamentos.

#### **Gerenciar Prompts da IA**

-   **O que faz:** Permite editar as instruções (prompts) que definem a personalidade da IA para os noivos e para os convidados, customizando o tom e o comportamento do assistente.

---

## 3. Painel do Casal (Usuário Final)

### 3.1. Acesso e Navegação

1.  **Cadastro e Login:** O usuário se cadastra em `/signup` (idealmente com um e-mail convidado pelo admin) e acessa em `/login`.
2.  **Seleção de Casamento:** Se um usuário tiver acesso a múltiplos casamentos, um menu no topo da página permite alternar facilmente entre as subcontas.
3.  **Menu de Perfil:** No canto superior direito, o usuário pode acessar:
    -   **Meu Perfil:** Para alterar nome e foto.
    -   **Configurações:** Para editar detalhes do casamento (nomes do casal, data, local, etc.).
    -   **Integrações:** Para configurar Webhooks e gerar tokens de acesso.
    -   **Nossos Planos:** Para visualizar os planos de assinatura disponíveis.
    -   **Painel Admin:** (Apenas para Super Admin).

### 3.2. Módulos do Planejamento

#### **Painel Nupcial (Dashboard)**

-   Visão geral com contagem regressiva, foto de capa e resumos dos principais módulos.

#### **Planejador de Tarefas**

-   Organize todas as pendências em categorias e tarefas com checklists.

#### **Lista de Convidados**

-   Gerencie convidados, confirme presenças e organize as mesas.

#### **Controle Financeiro**

-   Acompanhe o orçamento, registre despesas e controle os gastos.

#### **Mural do Carinho (Presentes)**

-   Gerencie a lista de presentes e agradecimentos. Convidados podem marcar itens ou registrar presentes próprios.

#### **Agenda (Tempo de Amar)**

-   Um calendário compartilhado para marcar datas importantes, como reuniões com fornecedores.

#### **Votos de Casamento**

-   Escreva seus votos manualmente ou use o assistente de IA para gerar um rascunho emocionante e personalizado.

#### **Trilha Sonora do Amor**

-   Uma playlist colaborativa onde todos (incluindo convidados) podem sugerir e votar em músicas.

#### **Devocional do Casal**

-   Receba um devocional diário gerado por IA ou peça um sobre um tema específico.

#### **Linha do Tempo e Cápsula do Tempo**
-   **Linha do Tempo:** Conte a história visual do casal com momentos e fotos marcantes.
-   **Cápsula do Tempo:** Permita que amigos e familiares deixem mensagens e fotos surpresa que só serão reveladas no dia do casamento.

#### **Equipe e Convidados**

-   Convide pessoas para a equipe (cerimonialistas, pais) e defina suas permissões como "Colaborador" ou "Convidado".

#### **Propósitos AI (Chat)**

-   Um assistente de IA flutuante que responde a perguntas sobre os dados do seu casamento (ex: "Quantos convidados confirmaram?"). Para convidados, atua como uma anfitriã digital.

---

## 4. Funcionalidades Avançadas

### 4.1. Página de Planos

-   **O que faz:** Uma página de vendas sofisticada e inspiradora, projetada para apresentar os diferentes níveis de serviço da plataforma.
-   **Como acessar:** Através do link "Nossos Planos" no menu do perfil do usuário.
-   **Estrutura:**
    1.  **Carrossel Inspirador:** Um carrossel de imagens que conta a história da jornada do casal, desde o sonho até o legado.
    2.  **Planos Narrativos:** Três opções com nomes que se conectam à jornada do casamento:
        -   **O Sonho (Grátis):** O essencial para começar a planejar.
        -   **A Jornada (R$ 49,90/mês):** A experiência completa com todas as ferramentas de IA e colaboração.
        -   **O Legado (R$ 69,90/mês):** Para ir além e eternizar cada momento, com suporte prioritário e funcionalidades futuras.
    3.  **Comparativo Detalhado:** Uma tabela completa que explica cada funcionalidade e mostra em qual plano ela está disponível, facilitando a escolha do cliente.
    4.  **FAQ:** Uma seção de perguntas frequentes para tirar as dúvidas mais comuns sobre os planos e a plataforma.
    
### 4.2. Integrações & Webhooks

-   **O que faz:** Permite que a plataforma "Propósitos" envie notificações automáticas para outros serviços (como Zapier, Make.com, ou um sistema próprio) sempre que um evento importante acontece.
-   **Como acessar:** Através do link "Integrações" no menu do perfil do usuário.
-   **Funcionalidades:**
    1.  **Endpoints de Webhook (CRUD):** Crie, edite e remova múltiplos endpoints. Para cada um, é possível definir um nome, a URL de destino e quais eventos (ex: "Convidado Confirmou", "Tarefa Concluída") devem disparar a notificação.
    2.  **Ativar/Desativar:** Cada endpoint pode ser ativado ou desativado individualmente.
    3.  **Histórico de Disparos:** Monitore todos os envios para cada endpoint, incluindo a data, o evento, o status da resposta do servidor (ex: 200 OK) e o corpo da resposta para facilitar o debugging.
    4.  **Tokens de Acesso (API):** Gere tokens de acesso seguros para autenticar as requisições de webhook. O token é enviado no cabeçalho `Authorization: Bearer <token>` para que seu servidor possa verificar se a notificação é legítima.
