// Opiina — painel (protótipo). DADOS DE EXEMPLO, todos fictícios.
// Nada aqui vem de conta real. Prazos e datas são relativos a hoje, para sempre haver
// ocorrências vencidas, vencendo hoje e nos próximos dias.

window.OPIINA_DEMO = {
  empresa: 'Casa Exemplo',
  usuario: { nome: 'Ana Souza', primeiroNome: 'Ana', perfil: 'Administradora' },

  unidades: ['Centro', 'Shopping Norte', 'Orla'],

  // Perfis de acesso. Os 3 nomes são os do app atual (Administrador, Marketing, Gestor).
  // Marketing: definido pelo cliente (2026-10-13). Gestor: PROPOSTA, a confirmar.
  // "telas" = itens do menu que o perfil vê. Configurações completas só para quem tem 'configuracoes';
  // os outros veem só "Minha conta".
  perfis: {
    admin:     { nome: 'Administrador', pessoa: 'Administradora', descricao: 'Vê e configura tudo, inclusive usuários e integrações.',
                 telas: ['dashboard', 'ranking', 'ocorrencias', 'denuncias', 'feedbacks', 'pesquisas', 'clientes', 'premios', 'atendentes', 'configuracoes'] },
    marketing: { nome: 'Marketing', pessoa: 'Marketing', descricao: 'Feedbacks, pesquisas, clientes e prêmios, com os números do Dashboard e do Ranking.',
                 telas: ['dashboard', 'ranking', 'feedbacks', 'pesquisas', 'clientes', 'premios'] },
    gestor:    { nome: 'Gestor', pessoa: 'Gestor', descricao: 'Cuida do atendimento das unidades: ocorrências e números.', proposta: true,
                 // Atendentes: o gestor cadastra os das unidades dele (pedido do cliente, 2026-10-14)
                 telas: ['dashboard', 'ranking', 'ocorrencias', 'feedbacks', 'pesquisas', 'clientes', 'atendentes'] },
  },
  areas: [
    { id: 'dashboard', nome: 'Dashboard' }, { id: 'ranking', nome: 'Ranking' },
    // "ocorrencias" não é mais item do menu: é a permissão de TRATAR feedbacks (responsável, prazo, etapa, Kanban)
    { id: 'feedbacks', nome: 'Feedbacks' }, { id: 'ocorrencias', nome: 'Tratar feedbacks (responsável, prazo, Kanban)' },
    { id: 'denuncias', nome: 'Denúncias' }, { id: 'pesquisas', nome: 'Pesquisas' }, { id: 'clientes', nome: 'Clientes' }, { id: 'premios', nome: 'Prêmios' },
    { id: 'atendentes', nome: 'Atendentes (só das próprias unidades)' },
    { id: 'configuracoes', nome: 'Configurações' },
  ],

  // Usuários do painel (fictícios). status: ativo | convidado | inativo
  usuarios: [
    { nome: 'Ana Souza',    email: 'ana@casaexemplo.com.br',    perfil: 'admin',     unidades: 'todas',             status: 'ativo' },
    { nome: 'Marina Costa', email: 'marina@casaexemplo.com.br', perfil: 'marketing', unidades: 'todas',             status: 'ativo' },
    { nome: 'Bruno Lima',   email: 'bruno@casaexemplo.com.br',  perfil: 'gestor',    unidades: ['Centro', 'Orla'],  status: 'ativo' },
    { nome: 'Carla Mendes', email: 'carla@casaexemplo.com.br',  perfil: 'gestor',    unidades: ['Shopping Norte'],  status: 'convidado' },
  ],

  // Dados das unidades (Configurações › Unidades). Fictícios.
  unidadesDetalhe: [
    { nome: 'Centro',         cnpj: '00.000.000/0001-00', endereco: 'Rua Exemplo, 100 · Centro',      google: true,  fuso: 'America/Sao_Paulo' },
    { nome: 'Shopping Norte', cnpj: '00.000.000/0002-00', endereco: 'Av. Modelo, 2000 · Loja 214',     google: true,  fuso: 'America/Sao_Paulo' },
    { nome: 'Orla',           cnpj: '',                   endereco: 'Av. da Praia, 55',                google: false, fuso: 'America/Sao_Paulo' },
  ],
  responsaveis: ['Ana Souza', 'Bruno Lima', 'Carla Mendes'],
  // Atendentes por unidade (aparecem em "Quem te atendeu?" na pesquisa)
  atendentes: {
    'Centro':         ['Júlia', 'Heitor', 'Paula'],
    'Shopping Norte': ['Rafael', 'Diego', 'Lívia'],
    'Orla':           ['Sofia', 'Caio', 'Renan'],
  },

  // Base dos últimos 30 dias, por unidade. Percentuais em pontos (somam 100).
  // NPS = % promotores (9–10) − % detratores (0–6).
  resumo: {
    'Centro':         { respostas: 512, promotores: 68, passivos: 20, detratores: 12 },
    'Shopping Norte': { respostas: 431, promotores: 55, passivos: 24, detratores: 21 },
    'Orla':           { respostas: 305, promotores: 71, passivos: 19, detratores: 10 },
  },
  // Volume relativo de cada período (os percentuais variam pouco)
  periodos: {
    7:  { rotulo: 'Últimos 7 dias',  volume: 0.24, ajuste: 2 },
    30: { rotulo: 'Últimos 30 dias', volume: 1,    ajuste: 0 },
    90: { rotulo: 'Últimos 90 dias', volume: 2.85, ajuste: -3 },
    180: { rotulo: 'Últimos 6 meses', volume: 5.6, ajuste: -5 },    // só no Ranking
    365: { rotulo: 'Últimos 12 meses', volume: 11.2, ajuste: -7 },  // só no Ranking
  },

  // Ranking (base: últimos 30 dias). Tratamento dos detratores (nota 0–6), em % dos detratores:
  // comCaso = abriu ocorrência · resolvidos · noPrazo = resolvidos dentro do prazo.
  // primeiraAcao em horas, encerramento em dias (médias). elogios/reclamacoes: % dos comentários (IA).
  ranking: {
    'Centro':         { comCaso: 94, resolvidos: 81, noPrazo: 88, primeiraAcao: 5,  encerramento: 2.1, elogios: 58, reclamacoes: 27 },
    'Shopping Norte': { comCaso: 76, resolvidos: 57, noPrazo: 61, primeiraAcao: 14, encerramento: 3.9, elogios: 41, reclamacoes: 43 },
    'Orla':           { comCaso: 89, resolvidos: 78, noPrazo: 83, primeiraAcao: 7,  encerramento: 2.6, elogios: 62, reclamacoes: 21 },
  },
  // Ranking de atendentes (base: últimos 30 dias): respostas em que o cliente escolheu o atendente em
  // "Quem te atendeu?". promotores/detratores em % dessas respostas. elogios: % de comentários positivos (IA).
  atendentesRanking: {
    'Júlia':  { unidade: 'Centro',         avaliacoes: 148, promotores: 71, detratores: 13, elogios: 57 },
    'Heitor': { unidade: 'Centro',         avaliacoes: 121, promotores: 77, detratores: 6,  elogios: 66 },
    'Paula':  { unidade: 'Centro',         avaliacoes: 96,  promotores: 64, detratores: 15, elogios: 52 },
    'Rafael': { unidade: 'Shopping Norte', avaliacoes: 133, promotores: 46, detratores: 29, elogios: 34 },
    'Diego':  { unidade: 'Shopping Norte', avaliacoes: 117, promotores: 54, detratores: 22, elogios: 41 },
    'Lívia':  { unidade: 'Shopping Norte', avaliacoes: 88,  promotores: 66, detratores: 11, elogios: 58 },
    'Sofia':  { unidade: 'Orla',           avaliacoes: 102, promotores: 74, detratores: 9,  elogios: 63 },
    'Renan':  { unidade: 'Orla',           avaliacoes: 64,  promotores: 69, detratores: 12, elogios: 60 },
    'Caio':   { unidade: 'Orla',           avaliacoes: 5,   promotores: 80, detratores: 0,  elogios: 60, novo: true },   // começou este mês: poucas avaliações, fica fora da classificação
  },

  // NPS e respostas por mês (12 meses, do mais antigo ao mês atual)
  mensal: {
    'Centro':         { nps: [41, 43, 44, 46, 45, 48, 49, 50, 52, 53, 55, 56], respostas: [402, 418, 455, 430, 471, 466, 489, 495, 503, 498, 512, 260] },
    'Shopping Norte': { nps: [22, 25, 24, 23, 26, 27, 26, 28, 29, 31, 33, 34], respostas: [361, 340, 377, 392, 385, 401, 398, 412, 420, 427, 431, 214] },
    'Orla':           { nps: [44, 47, 49, 48, 51, 53, 52, 55, 57, 58, 60, 61], respostas: [198, 214, 240, 251, 266, 270, 282, 290, 294, 301, 305, 150] },
  },

  // Clientes: cadastros que vêm da identificação (opcional) na pesquisa ou de planilha importada.
  // nascimento: 'aaaa-mm-dd' ou null. ofertas: aceitou receber novidades (caixa separada, LGPD).
  // respostas: [dias a partir de hoje, nota 0–10, unidade]. ocorrencias: códigos ligados ao cliente. Tudo fictício.
  clientes: [
    { id: 'CL-214', nome: 'Renata Souza',    whatsapp: '(11) 90000-1201', email: '',                         nascimento: '1990-10-22', origem: 'pesquisa',  cadastro: -1,   ofertas: true,
      respostas: [[-1, 0, 'Centro'], [-48, 9, 'Centro']], ocorrencias: ['OC-1041'] },
    { id: 'CL-213', nome: 'Fernanda Rocha',  whatsapp: '',                 email: 'fernanda.exemplo@email.com', nascimento: '1985-03-09', origem: 'pesquisa',  cadastro: -2,   ofertas: false,
      respostas: [[-2, 3, 'Shopping Norte']], ocorrencias: ['OC-1046'] },
    { id: 'CL-212', nome: 'Gabriela Nunes',  whatsapp: '(11) 90000-1188', email: '',                         nascimento: '1998-10-30', origem: 'pesquisa',  cadastro: -3,   ofertas: true,
      respostas: [[-3, 10, 'Orla']], ocorrencias: [] },
    { id: 'CL-211', nome: 'Paulo Teixeira',  whatsapp: '(11) 90000-1175', email: '',                         nascimento: null,         origem: 'pesquisa',  cadastro: -4,   ofertas: false,
      respostas: [[-4, 1, 'Shopping Norte'], [-60, 7, 'Shopping Norte']], ocorrencias: ['OC-1043'] },
    { id: 'CL-210', nome: 'Marcos Pinto',    whatsapp: '(11) 90000-1162', email: 'marcos.exemplo@email.com', nascimento: '1979-11-04', origem: 'pesquisa',  cadastro: -5,   ofertas: true,
      respostas: [[-5, 4, 'Centro'], [-33, 8, 'Centro'], [-70, 9, 'Centro']], ocorrencias: ['OC-1047'] },
    { id: 'CL-209', nome: 'Juliana Prado',   whatsapp: '(11) 90000-1149', email: '',                         nascimento: '1993-10-15', origem: 'pesquisa',  cadastro: -8,   ofertas: true,
      respostas: [[-8, 10, 'Centro'], [-21, 9, 'Centro'], [-39, 10, 'Orla'], [-90, 9, 'Centro']], ocorrencias: [] },
    { id: 'CL-208', nome: 'Thiago Alves',    whatsapp: '(11) 90000-1136', email: '',                         nascimento: '1988-07-19', origem: 'pesquisa',  cadastro: -12,  ofertas: true,
      respostas: [[-3, 4, 'Orla'], [-12, 8, 'Orla']], ocorrencias: ['OC-1039'] },
    { id: 'CL-207', nome: 'Camila Freitas',  whatsapp: '',                 email: 'camila.exemplo@email.com', nascimento: null,         origem: 'pesquisa',  cadastro: -15,  ofertas: false,
      respostas: [[-6, 3, 'Shopping Norte'], [-15, 9, 'Shopping Norte']], ocorrencias: ['OC-1038'] },
    { id: 'CL-206', nome: 'Ricardo Lima',    whatsapp: '(11) 90000-1110', email: 'ricardo.exemplo@email.com', nascimento: '1975-11-27', origem: 'importado', cadastro: -30,  ofertas: true,
      respostas: [[-18, 9, 'Centro']], ocorrencias: [] },
    { id: 'CL-205', nome: 'Beatriz Ramos',   whatsapp: '(11) 90000-1097', email: '',                         nascimento: '2001-10-03', origem: 'importado', cadastro: -30,  ofertas: true,
      respostas: [], ocorrencias: [] },
    { id: 'CL-204', nome: 'Eduardo Lopes',   whatsapp: '(11) 90000-1084', email: '',                         nascimento: '1982-05-12', origem: 'pesquisa',  cadastro: -40,  ofertas: false,
      respostas: [[-9, 2, 'Centro'], [-40, 6, 'Centro']], ocorrencias: ['OC-1037'] },
    { id: 'CL-203', nome: 'Lúcia Martins',   whatsapp: '',                 email: 'lucia.exemplo@email.com',  nascimento: '1969-12-01', origem: 'pesquisa',  cadastro: -55,  ofertas: true,
      respostas: [[-1, 6, 'Centro'], [-55, 10, 'Centro']], ocorrencias: ['OC-1044'] },
    { id: 'CL-202', nome: 'Gustavo Nogueira', whatsapp: '(11) 90000-1058', email: '',                        nascimento: '1995-02-14', origem: 'pesquisa',  cadastro: -75,  ofertas: false,
      respostas: [[-7, 6, 'Shopping Norte'], [-75, 8, 'Shopping Norte']], ocorrencias: ['OC-1035'] },
    { id: 'CL-201', nome: 'Sofia Andrade',   whatsapp: '(11) 90000-1045', email: 'sofia.exemplo@email.com',  nascimento: '1991-08-08', origem: 'importado', cadastro: -120, ofertas: true,
      respostas: [[-27, 10, 'Orla'], [-64, 9, 'Orla'], [-101, 10, 'Orla']], ocorrencias: [] },
  ],

  // Denúncias (canal de ética para colaboradores). Situações e categorias iguais às do app atual.
  // criada: dias a partir de hoje. identificacao: null = anônima. Relatos fictícios.
  denunciaSituacoes: ['Recebida', 'Em análise', 'Em investigação', 'Aguardando informações', 'Concluída', 'Arquivada'],
  denunciaPrioridades: ['Baixa', 'Média', 'Alta', 'Crítica'],
  denunciaCategorias: ['Assédio moral', 'Assédio sexual', 'Discriminação', 'Racismo', 'Injúria racial', 'Homofobia', 'Transfobia',
    'Intolerância religiosa', 'Fraude', 'Corrupção', 'Conflito de interesses', 'Violação de políticas internas',
    'Segurança do trabalho', 'LGPD / privacidade', 'Conduta inadequada', 'Outro'],
  denuncias: [
    { id: 'DEN-1018', categoria: 'Assédio moral', unidade: 'Shopping Norte', criada: -1, identificacao: null, situacao: 'Recebida', prioridade: 'Alta',
      resumo: 'Gerente grita com a equipe na frente dos clientes',
      relato: 'No turno da noite, o gerente grita com os atendentes na frente dos clientes e ameaça cortar a folga de quem reclama. Aconteceu de novo no sábado.' },
    { id: 'DEN-1017', categoria: 'Segurança do trabalho', unidade: 'Centro', criada: -2, identificacao: { nome: 'Pedro A.', contato: 'pedro.exemplo@email.com' }, situacao: 'Em análise', prioridade: 'Média',
      resumo: 'Extintor da cozinha com validade vencida',
      relato: 'O extintor ao lado do fogão está com a validade vencida desde o mês passado. Já avisei o encarregado, mas nada mudou.' },
    { id: 'DEN-1016', categoria: 'Discriminação', unidade: 'Orla', criada: -4, identificacao: null, situacao: 'Em investigação', prioridade: 'Alta',
      resumo: 'Comentários sobre a aparência de uma colega',
      relato: 'Um colega do salão faz piadas frequentes sobre o cabelo e as roupas de uma atendente. Ela já pediu para parar.' },
    { id: 'DEN-1015', categoria: 'Fraude', unidade: 'Centro', criada: -6, identificacao: null, situacao: 'Aguardando informações', prioridade: 'Crítica',
      resumo: 'Descontos lançados em contas sem pedido do cliente',
      relato: 'Percebi descontos lançados no caixa em contas de clientes que não pediram desconto, sempre no fechamento da noite.' },
    { id: 'DEN-1014', categoria: 'Conduta inadequada', unidade: 'Shopping Norte', criada: -9, identificacao: { nome: 'Luana M.', contato: '(11) 90000-0000' }, situacao: 'Em análise', prioridade: 'Baixa',
      resumo: 'Fumo na área do estoque',
      relato: 'Funcionários fumam na porta do estoque, perto das caixas de papelão.' },
    { id: 'DEN-1012', categoria: 'Violação de políticas internas', unidade: 'Orla', criada: -21, identificacao: null, situacao: 'Concluída', prioridade: 'Média',
      resumo: 'Troca de turnos sem registro',
      relato: 'Trocas de turno combinadas por fora, sem registro no ponto.' },
    { id: 'DEN-1010', categoria: 'Assédio sexual', unidade: 'Centro', criada: -36, identificacao: null, situacao: 'Concluída', prioridade: 'Crítica',
      resumo: 'Investidas de um supervisor',
      relato: 'Um supervisor insiste em convites e mensagens pessoais para uma atendente, mesmo depois de ela recusar.' },
    { id: 'DEN-1009', categoria: 'Outro', unidade: null, criada: -52, identificacao: null, situacao: 'Arquivada', prioridade: 'Baixa',
      resumo: 'Sugestão sobre o uniforme',
      relato: 'O tecido do uniforme novo é muito quente para a cozinha.' },
  ],

  // NPS semanal (12 semanas, da mais antiga para a mais recente)
  tendencia: {
    'Centro':         [47, 49, 48, 51, 52, 51, 53, 52, 54, 55, 55, 56],
    'Shopping Norte': [27, 29, 26, 29, 30, 29, 28, 30, 31, 32, 33, 34],
    'Orla':           [51, 53, 52, 55, 55, 57, 56, 57, 58, 59, 60, 61],
  },

  // Temas que a IA encontrou nos comentários (30 dias, todas as unidades)
  temas: [
    { nome: 'Tempo de espera', total: 86, unidades: { 'Centro': 22, 'Shopping Norte': 48, 'Orla': 16 } },
    { nome: 'Atendimento',     total: 74, unidades: { 'Centro': 31, 'Shopping Norte': 25, 'Orla': 18 } },
    { nome: 'Comida',          total: 61, unidades: { 'Centro': 24, 'Shopping Norte': 17, 'Orla': 20 } },
    { nome: 'Preço',           total: 38, unidades: { 'Centro': 12, 'Shopping Norte': 15, 'Orla': 11 } },
    { nome: 'Limpeza',         total: 21, unidades: { 'Centro': 6,  'Shopping Norte': 11, 'Orla': 4 } },
  ],

  etapas: ['Nova', 'Visualizada', 'Em andamento', 'Aguardando cliente', 'Resolvida'],

  // Prêmios sorteados entre quem deixa o contato na pesquisa (exemplos; a aba Prêmios ainda não foi redesenhada)
  premios: [
    { id: 'PR-3', nome: 'Jantar para 2 pessoas', detalhe: 'Entrada, prato principal e sobremesa' },
    { id: 'PR-2', nome: 'Vale-consumo de R$ 150', detalhe: 'Para usar em qualquer unidade' },
    { id: 'PR-1', nome: 'Rodízio para 4 pessoas', detalhe: 'Bebidas à parte' },
  ],

  // Campanhas de prêmio (aba Prêmios). Modelo do app real ("Prêmios Muito Mais"): voucher em R$ para quem
  // responde a uma pesquisa, enviado por WhatsApp com código e link; 1 por cliente; validade em dias.
  // inicio/fim: dias a partir de hoje. pausada: interrompida antes do fim. Números fictícios.
  campanhas: [
    { id: 'CP-3', nome: 'NPS Outubro — R$ 15', pesquisa: 'PQ-12', valor: 15, validade: 30, inicio: -12, fim: 19, enviados: 128, resgatados: 54,
      mensagem: 'Obrigado por avaliar a Casa Exemplo! Seu voucher de {valor}: {codigo}\nResgate até a validade: {link}' },
    { id: 'CP-2', nome: 'Orla — volta do cliente', pesquisa: 'PQ-10', valor: 10, validade: 15, inicio: 5, fim: 35, enviados: 0, resgatados: 0,
      mensagem: 'Seu prêmio de {valor}: {codigo}\nResgate: {link}' },
    { id: 'CP-1', nome: 'NPS Setembro — R$ 10', pesquisa: 'PQ-11', valor: 10, validade: 30, inicio: -45, fim: -14, enviados: 302, resgatados: 117,
      mensagem: 'Seu prêmio de {valor}: {codigo}\nResgate: {link}' },
  ],

  // Pesquisas. status: publicada | rascunho | arquivada. criada, arquivada e sorteioEm: dias a partir de hoje;
  // hora: hora em que foi publicada (ou salva, no rascunho). unidades: cada uma tem o próprio link e QR Code.
  // Tipos das perguntas extras: texto | nota10 | polegar | estrelas | escolha
  pesquisas: [
    { id: 'PQ-12', nome: 'Pesquisa de satisfação', descricao: 'Conte como foi sua experiência.', unidades: ['Centro'], status: 'publicada', criada: -62, hora: '10:42', respostas: 512,
      atendente: true, identificacao: true, identificacaoObrigatoria: false,      perguntas: [{ titulo: 'O que poderíamos melhorar?', tipo: 'texto', obrigatoria: false, soDetratores: true }] },
    { id: 'PQ-11', nome: 'Pesquisa de satisfação', descricao: 'Conte como foi sua experiência.', unidades: ['Shopping Norte'], status: 'publicada', criada: -62, hora: '11:05', respostas: 431,
      atendente: true, identificacao: true, identificacaoObrigatoria: false,
      perguntas: [{ titulo: 'O que poderíamos melhorar?', tipo: 'texto', obrigatoria: false, soDetratores: true }] },
    { id: 'PQ-10', nome: 'Pesquisa de satisfação', descricao: 'Conte como foi sua experiência.', unidades: ['Orla'], status: 'publicada', criada: -40, hora: '09:18', respostas: 305,
      atendente: false, identificacao: true, identificacaoObrigatoria: false,
      perguntas: [
        { titulo: 'O que poderíamos melhorar?', tipo: 'texto', obrigatoria: false, soDetratores: true },
        { titulo: 'Como você avalia a comida?', tipo: 'estrelas', obrigatoria: true, soDetratores: false },
      ] },
    { id: 'PQ-09', nome: 'Delivery', descricao: 'Seu pedido chegou bem?', unidades: ['Orla', 'Centro'], status: 'rascunho', criada: -3, hora: '17:36', respostas: 0,
      atendente: false, identificacao: true, identificacaoObrigatoria: true,
      perguntas: [{ titulo: 'Como chegou o pedido?', tipo: 'escolha', opcoes: ['Quente e no prazo', 'Atrasado', 'Frio', 'Faltou item'], obrigatoria: true, soDetratores: false }] },
    { id: 'PQ-04', nome: 'Pesquisa de satisfação (versão antiga)', descricao: '', unidades: ['Centro'], status: 'arquivada', criada: -150, hora: '14:20', arquivada: -62, horaArquivada: '10:40', respostas: 1890,
      atendente: false, identificacao: false, identificacaoObrigatoria: false, perguntas: [] },
  ],

  // Feedbacks: respostas das pesquisas que NÃO viraram ocorrência (as que viraram vêm da lista de ocorrências).
  // dias: a partir de hoje. nota 0–10 (pesquisas publicadas de exemplo). sentimento (IA): elogio | neutro | reclamacao.
  // Sem comentário: sem tema e sem sentimento. Tudo fictício.
  respostas: [
    { dias: 0,   hora: '13:12', nota: 10, unidade: 'Centro',         atendente: 'Heitor', cliente: 'Juliana P.', tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'O Heitor foi super atencioso, indicou o prato do dia e acertou em cheio.' },
    { dias: 0,   hora: '12:40', nota: 9,  unidade: 'Orla',           atendente: 'Sofia',  cliente: 'Anônimo',    tema: 'Comida',          sentimento: 'elogio',     comentario: 'Moqueca maravilhosa e vista linda. Voltaremos!' },
    { dias: 0,   hora: '11:58', nota: 10, unidade: 'Shopping Norte', atendente: 'Lívia',  cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: -1,  hora: '21:15', nota: 8,  unidade: 'Centro',         atendente: 'Paula',  cliente: 'Ricardo L.', tema: 'Tempo de espera', sentimento: 'neutro',     comentario: 'Comida boa, mas o prato demorou um pouco mais que o normal.' },
    { dias: -1,  hora: '20:02', nota: 9,  unidade: 'Orla',           atendente: 'Renan',  cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: -1,  hora: '13:30', nota: 7,  unidade: 'Shopping Norte', atendente: 'Diego',  cliente: 'Anônimo',    tema: 'Preço',           sentimento: 'neutro',     comentario: 'Gostei, mas achei a sobremesa cara para o tamanho.' },
    { dias: -2,  hora: '22:10', nota: 10, unidade: 'Centro',         atendente: 'Júlia',  cliente: 'Lúcia M.',   tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'A Júlia lembrou do meu pedido da última vez. Me senti em casa.' },
    { dias: -2,  hora: '19:45', nota: 9,  unidade: 'Shopping Norte', atendente: 'Lívia',  cliente: 'Anônimo',    tema: 'Limpeza',         sentimento: 'elogio',     comentario: 'Banheiro limpinho e mesa arrumada rápido.' },
    { dias: -3,  hora: '14:05', nota: 8,  unidade: 'Orla',           atendente: '',       cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: -3,  hora: '12:50', nota: 10, unidade: 'Centro',         atendente: 'Heitor', cliente: 'Sofia A.',   tema: 'Comida',          sentimento: 'elogio',     comentario: 'Melhor feijoada da região, sem exagero.' },
    { dias: -4,  hora: '20:30', nota: 7,  unidade: 'Shopping Norte', atendente: 'Rafael', cliente: 'Anônimo',    tema: 'Tempo de espera', sentimento: 'reclamacao', comentario: 'Fila grande para pagar no caixa.' },
    { dias: -5,  hora: '13:22', nota: 9,  unidade: 'Orla',           atendente: 'Sofia',  cliente: 'Gabriela N.', tema: 'Atendimento',    sentimento: 'elogio',     comentario: 'Equipe simpática e rápida, mesmo com a casa cheia.' },
    { dias: -6,  hora: '21:40', nota: 8,  unidade: 'Centro',         atendente: 'Paula',  cliente: 'Anônimo',    tema: 'Preço',           sentimento: 'neutro',     comentario: 'Bom custo-benefício no almoço executivo.' },
    { dias: -7,  hora: '12:15', nota: 10, unidade: 'Shopping Norte', atendente: 'Lívia',  cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: -8,  hora: '20:55', nota: 9,  unidade: 'Centro',         atendente: 'Júlia',  cliente: 'Juliana P.', tema: 'Comida',          sentimento: 'elogio',     comentario: 'O risoto estava no ponto certo.' },
    { dias: -10, hora: '19:10', nota: 8,  unidade: 'Orla',           atendente: 'Caio',   cliente: 'Anônimo',    tema: 'Atendimento',     sentimento: 'neutro',     comentario: 'Atendimento ok. Poderiam oferecer a carta de vinhos.' },
    { dias: -12, hora: '13:48', nota: 10, unidade: 'Centro',         atendente: 'Heitor', cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: -14, hora: '21:05', nota: 9,  unidade: 'Shopping Norte', atendente: 'Diego',  cliente: 'Anônimo',    tema: 'Comida',          sentimento: 'elogio',     comentario: 'Hambúrguer muito bom e batata sequinha.' },
    { dias: -16, hora: '12:30', nota: 7,  unidade: 'Orla',           atendente: 'Renan',  cliente: 'Anônimo',    tema: 'Limpeza',         sentimento: 'reclamacao', comentario: 'Mesa demorou a ser limpa depois que sentamos.' },
    { dias: -18, hora: '20:20', nota: 10, unidade: 'Orla',           atendente: 'Sofia',  cliente: 'Anônimo',    tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'Comemoramos um aniversário e a equipe cantou parabéns. Amamos!' },
    { dias: -21, hora: '13:05', nota: 8,  unidade: 'Centro',         atendente: '',       cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: -24, hora: '19:50', nota: 9,  unidade: 'Shopping Norte', atendente: 'Lívia',  cliente: 'Anônimo',    tema: 'Tempo de espera', sentimento: 'elogio',     comentario: 'Pedido chegou rápido, mesmo no sábado.' },
    { dias: -27, hora: '12:44', nota: 6,  unidade: 'Centro',         atendente: 'Paula',  cliente: 'Anônimo',    tema: 'Preço',           sentimento: 'reclamacao', comentario: 'Aumentaram o preço do executivo e diminuíram a porção.' },
    { dias: -29, hora: '21:30', nota: 10, unidade: 'Orla',           atendente: 'Renan',  cliente: 'Anônimo',    tema: '',                sentimento: '',           comentario: '' },
    { dias: 0,   hora: '10:20', nota: 9,  unidade: 'Centro',         atendente: 'Júlia',  cliente: 'Anônimo',    tema: 'Comida',          sentimento: 'elogio',     comentario: 'Café da manhã caprichado, pão quentinho.' },
    { dias: -1,  hora: '12:35', nota: 10, unidade: 'Orla',           atendente: 'Sofia',  cliente: 'Thiago A.',  tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'A Sofia resolveu na hora quando meu pedido veio trocado. Nota 10.' },
    { dias: -2,  hora: '13:10', nota: 9,  unidade: 'Shopping Norte', atendente: 'Lívia',  cliente: 'Anônimo',    tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'Atendimento rápido no horário de almoço.' },
    { dias: -4,  hora: '21:20', nota: 10, unidade: 'Centro',         atendente: 'Heitor', cliente: 'Anônimo',    tema: 'Comida',          sentimento: 'elogio',     comentario: 'Picanha no ponto exato que pedi.' },
    { dias: -5,  hora: '20:15', nota: 9,  unidade: 'Orla',           atendente: 'Renan',  cliente: 'Anônimo',    tema: 'Limpeza',         sentimento: 'elogio',     comentario: 'Ambiente limpo e agradável, ótimo para ir com crianças.' },
    { dias: -6,  hora: '13:40', nota: 10, unidade: 'Shopping Norte', atendente: 'Diego',  cliente: 'Camila F.',  tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'O Diego explicou o cardápio com paciência para minha mãe.' },
    { dias: -9,  hora: '19:30', nota: 9,  unidade: 'Centro',         atendente: 'Paula',  cliente: 'Anônimo',    tema: 'Comida',          sentimento: 'elogio',     comentario: 'Sobremesa da casa é imperdível.' },
    { dias: -11, hora: '12:55', nota: 10, unidade: 'Orla',           atendente: 'Sofia',  cliente: 'Anônimo',    tema: 'Tempo de espera', sentimento: 'elogio',     comentario: 'Mesmo lotado, a comida chegou rápido.' },
    { dias: -13, hora: '20:40', nota: 9,  unidade: 'Shopping Norte', atendente: 'Lívia',  cliente: 'Anônimo',    tema: 'Comida',          sentimento: 'elogio',     comentario: 'Salada fresquinha e bem servida.' },
    { dias: -17, hora: '13:25', nota: 10, unidade: 'Centro',         atendente: 'Júlia',  cliente: 'Eduardo L.', tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'Voltei depois da reclamação da fila e dessa vez foi tudo perfeito.' },
    { dias: -20, hora: '21:10', nota: 9,  unidade: 'Orla',           atendente: 'Caio',   cliente: 'Anônimo',    tema: 'Atendimento',     sentimento: 'elogio',     comentario: 'Garçom novo muito educado.' },
    { dias: -25, hora: '12:20', nota: 10, unidade: 'Shopping Norte', atendente: 'Diego',  cliente: 'Anônimo',    tema: 'Preço',           sentimento: 'elogio',     comentario: 'O combo do almoço vale muito a pena.' },
  ],

  // prazo e criada: dias a partir de hoje (negativo = no passado)
  ocorrencias: [
    { id: 'OC-1048', nota: 2,  unidade: 'Shopping Norte', tema: 'Tempo de espera', etapa: 'Nova',               responsavel: null,          prazo: -1, criada: -3, cliente: 'Anônimo',         atendente: 'Rafael',
      comentario: 'Esperamos 50 minutos pelo prato principal e ninguém veio avisar do atraso.' },
    { id: 'OC-1047', nota: 4,  unidade: 'Centro',         tema: 'Atendimento',     etapa: 'Em andamento',       responsavel: 'Bruno Lima',  prazo: -2, criada: -5, cliente: 'Marcos P.',       atendente: 'Júlia',
      comentario: 'O garçom foi grosseiro quando pedimos para trocar a bebida.' },
    { id: 'OC-1046', nota: 3,  unidade: 'Shopping Norte', tema: 'Comida',          etapa: 'Visualizada',        responsavel: 'Carla Mendes', prazo: 0, criada: -2, cliente: 'Fernanda R.',     atendente: 'Rafael',
      comentario: 'A carne veio fria e passou do ponto pedido.' },
    { id: 'OC-1045', nota: 5,  unidade: 'Orla',           tema: 'Preço',           etapa: 'Nova',               responsavel: null,          prazo: 0, criada: -1, cliente: 'Anônimo',         atendente: null,
      comentario: 'A taxa de serviço veio cobrada duas vezes na conta.' },
    { id: 'OC-1044', nota: 6,  unidade: 'Centro',         tema: 'Limpeza',         etapa: 'Nova',               responsavel: 'Ana Souza',   prazo: 1, criada: -1, cliente: 'Lúcia M.',        atendente: null,
      comentario: 'O banheiro estava sem papel e com o chão molhado.' },
    { id: 'OC-1043', nota: 1,  unidade: 'Shopping Norte', tema: 'Atendimento',     etapa: 'Aguardando cliente', responsavel: 'Ana Souza',   prazo: 2, criada: -4, cliente: 'Paulo T.',        atendente: 'Diego',
      comentario: 'Pedido errado duas vezes. Pedi para falar com o gerente e não apareceu ninguém.' },
    { id: 'OC-1042', nota: 5,  unidade: 'Orla',           tema: 'Tempo de espera', etapa: 'Em andamento',       responsavel: 'Bruno Lima',  prazo: 3, criada: -2, cliente: 'Anônimo',         atendente: 'Sofia',
      comentario: 'Demorou para conseguir mesa mesmo com reserva.' },
    { id: 'OC-1041', nota: 0,  unidade: 'Centro',         tema: 'Comida',          etapa: 'Visualizada',        responsavel: null,          prazo: 4, criada: -1, cliente: 'Renata S.',       atendente: 'Júlia',
      comentario: 'Encontrei um fio de cabelo na salada. Muito decepcionada.' },
    { id: 'OC-1040', nota: 6,  unidade: 'Shopping Norte', tema: 'Preço',           etapa: 'Nova',               responsavel: null,          prazo: 6, criada: 0,  cliente: 'Anônimo',         atendente: null,
      comentario: 'Achei o rodízio caro pelo que foi servido.' },
    { id: 'OC-1039', nota: 4,  unidade: 'Orla',           tema: 'Atendimento',     etapa: 'Em andamento',       responsavel: 'Carla Mendes', prazo: 9, criada: -3, cliente: 'Thiago A.',       atendente: 'Sofia',
      comentario: 'Pedimos a conta três vezes até ela chegar.' },
    { id: 'OC-1038', nota: 3,  unidade: 'Shopping Norte', tema: 'Tempo de espera', etapa: 'Aguardando cliente', responsavel: 'Bruno Lima',  prazo: 5, criada: -6, cliente: 'Camila F.',       atendente: 'Diego',
      comentario: 'O delivery chegou 1 hora depois do previsto.' },
    { id: 'OC-1037', nota: 2,  unidade: 'Centro',         tema: 'Tempo de espera', etapa: 'Resolvida',          responsavel: 'Ana Souza',   prazo: -4, criada: -9, cliente: 'Eduardo L.',      atendente: 'Júlia',
      comentario: 'Fila enorme na entrada e ninguém organizando.' },
    { id: 'OC-1036', nota: 5,  unidade: 'Orla',           tema: 'Comida',          etapa: 'Resolvida',          responsavel: 'Carla Mendes', prazo: -2, criada: -8, cliente: 'Anônimo',         atendente: 'Sofia',
      comentario: 'A sobremesa que pedi tinha acabado e só avisaram depois de 20 minutos.' },
    { id: 'OC-1035', nota: 6,  unidade: 'Shopping Norte', tema: 'Limpeza',         etapa: 'Resolvida',          responsavel: 'Bruno Lima',  prazo: -1, criada: -7, cliente: 'Gustavo N.',      atendente: null,
      comentario: 'Mesa pegajosa quando sentamos.' },
  ],
};
