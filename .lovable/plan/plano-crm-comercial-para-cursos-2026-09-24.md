# Plano — CRM Comercial para Cursos

## Objetivo
Entregar um MVP interno realmente utilizável, em português do Brasil, cobrindo o fluxo completo do vendedor e uma base segura e configurável para administração e gestão.

## Entregas

### 1. Fundação, contas e segurança
- Ativar acesso por e-mail/senha e Google, com recuperação de senha.
- Criar perfis completos (nome, foto, telefone, cargo, equipe, gerente, entrada, status e preferências).
- Implementar papéis separados de perfis: Administrador, Gerente e Vendedor.
- Proteger dados no banco: vendedor acessa sua carteira; gerente, sua equipe; administrador, tudo.
- Registrar auditoria das ações críticas e preservar histórico com inativação em vez de exclusão física.

### 2. Cadastros comerciais configuráveis
- Áreas, cursos, preços, formas de pagamento, parcelamentos, descontos, campanhas e condições comerciais.
- Telas autorizadas para criar, editar, duplicar, ativar, desativar e ordenar esses registros.
- Nenhum curso, preço, desconto, etapa ou regra comercial será fixado no código.

### 3. Simulação e proposta
- Fluxo rápido: aluno → área → curso → pagamento → parcelamento → desconto.
- Busca e reaproveitamento por WhatsApp para evitar contatos duplicados.
- Cálculo instantâneo de preço, desconto, total e parcelas.
- Visualização limpa “Mostrar ao aluno”, otimizada para desktop e tablet.
- Criação da proposta com snapshot imutável dos valores e condições utilizados.
- Validade com timer ativo, pausado, concluído, cancelado ou expirado; eventos e ajustes registrados.
- Retornos separados do timer, com data, hora, observação e situação derivada do prazo.

### 4. CRM e atendimento
- Kanban com etapas carregadas do banco e administráveis.
- Movimentação de contatos com histórico automático.
- Página do aluno com informações, interesses, propostas, retornos, interações e linha do tempo.
- Dashboard do vendedor com indicadores e próximos retornos.

### 5. Gestão e liderança
- Dashboard de equipe e visão por vendedor.
- Gestão de vendedores e perfis.
- Transferência individual, em lote, da carteira inteira ou distribuição entre vendedores, preservando histórico e propostas.
- Relatórios operacionais essenciais para gerente e administrador.

### 6. Dados iniciais
- Inserir configuração e registros mínimos marcados como demonstração: estrutura de equipe, catálogo, condições, contatos e propostas.
- As contas de acesso reais serão criadas com segurança pela área de usuários; os registros demonstrativos não usarão credenciais fixas no código.

## Decisões funcionais adotadas
- Descontos serão de um único tipo por regra: percentual ou valor fixo.
- O preço específico da forma de pagamento prevalece sobre o valor-base; depois aplica-se o desconto autorizado.
- Parcelas serão arredondadas em centavos, com eventual diferença absorvida na última parcela.
- Desconto acima do limite ficará bloqueado neste MVP; a estrutura permitirá adicionar aprovação posteriormente.
- Permissões extras de gerente e limites de timer serão configurações do banco.
- Status atrasado de retorno e expirado de proposta serão calculados pelo prazo, sem processos recorrentes desnecessários.

## Direção visual
- Ferramenta comercial moderna e densa, com navegação lateral, superfícies claras, azul-petróleo como ação principal e coral para alertas.
- Tipografia objetiva, tabelas compactas, cards de indicadores e Kanban horizontal.
- Interface responsiva com prioridade para desktop e tablet, moeda BRL, datas DD/MM/AAAA e horário 24h.

## Critérios de validação
- Login, recuperação e saída funcionam; menus e dados respeitam o papel do usuário.
- O fluxo login → simulação → proposta → CRM → retorno funciona com dados persistidos.
- Mudanças futuras no catálogo não alteram propostas antigas.
- Transferências e mudanças críticas aparecem nos históricos e na auditoria.
- Rotas principais possuem metadados próprios; estados de carregamento, vazio, erro e confirmação estão cobertos.
- Revisão final em desktop e tablet, verificação de compilação, execução e segurança do banco.

## Detalhes técnicos
- TanStack Start + React, banco e autenticação do Lovable Cloud.
- Esquema relacional com UUIDs, índices, timestamps, políticas por papel e funções seguras para operações compostas.
- Papéis armazenados em tabela exclusiva; perfis não concedem privilégios.
- Lógica comercial crítica validada no servidor/banco, não apenas na interface.
- Rotas protegidas organizadas sob o bloqueio autenticado e acesso administrativo validado novamente nas operações sensíveis.
