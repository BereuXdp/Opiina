// Opiina — painel (protótipo). Sem dependências. Dados fictícios em dados.js.
// Estrutura: utilidades → estado das ocorrências → menu → Dashboard → Ocorrências.

const D = window.OPIINA_DEMO;

// Perfil de acesso da demonstração ("Ver como", no rodapé do menu). Guardado na aba.
// Cada perfil entra como um usuário de exemplo dele (Administrador → Ana, Marketing → Marina, Gestor → Bruno).
const CHAVE_PERFIL = 'opiina-demo-perfil';
// ?perfil=marketing no endereço também escolhe o perfil (útil para compartilhar e testar).
const perfilId = (() => {
  try {
    const daUrl = new URLSearchParams(location.search).get('perfil');
    if (D.perfis[daUrl]) sessionStorage.setItem(CHAVE_PERFIL, daUrl);
    const p = sessionStorage.getItem(CHAVE_PERFIL);
    return D.perfis[p] ? p : 'admin';
  } catch { return 'admin'; }
})();
const perfil = D.perfis[perfilId];
const pode = (tela) => perfil.telas.includes(tela);
// EU = nome original do usuário de exemplo: é a "identidade" (responsável nas ocorrências, "(você)").
// O nome mostrado pode ter sido trocado em Minha conta (guardado com as Configurações).
const EU = D.usuarios.find((x) => x.perfil === perfilId).nome;
const INDICE_EU = D.usuarios.findIndex((x) => x.nome === EU);
{
  let nome = EU;
  try { nome = JSON.parse(sessionStorage.getItem('opiina-demo-config'))?.usuarios?.[INDICE_EU]?.nome || EU; } catch { /* usa o original */ }
  D.usuario = { nome, primeiroNome: nome.split(' ')[0], perfil: perfil.pessoa };
}

// ---------- Utilidades ----------
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const numero = (n) => n.toLocaleString('pt-BR');
const iniciais = (nome) => nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const slug = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');

function categoria(nota) {
  if (nota <= 6) return 'detrator';
  if (nota <= 8) return 'passivo';
  return 'promotor';
}

function diaRelativo(dias) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}
const dataCurta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

function quando(dias) {
  if (dias === 0) return 'hoje';
  if (dias === -1) return 'ontem';
  return `há ${-dias} dias`;
}

function prazoInfo(oc) {
  if (oc.etapa === 'Resolvida') return { texto: 'Resolvida', classe: '' };
  if (oc.prazo < 0) return { texto: `Venceu há ${-oc.prazo} ${oc.prazo === -1 ? 'dia' : 'dias'}`, classe: 'prazo--vencido' };
  if (oc.prazo === 0) return { texto: 'Vence hoje', classe: 'prazo--hoje' };
  if (oc.prazo === 1) return { texto: 'Vence amanhã', classe: '' };
  return { texto: `Vence em ${dataCurta(diaRelativo(oc.prazo))}`, classe: '' };
}

// ---------- Movimento ----------
// Com "reduzir movimento" (ou aba oculta, onde o requestAnimationFrame fica parado), tudo vai direto ao valor final.
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden;
// Desacelera no fim. O progresso é limitado a 0–1: o tempo do primeiro quadro pode vir
// um pouco ANTES do performance.now() de quando a animação foi marcada (daria valor negativo).
const suavizar = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

// Conta do valor anterior (ou 0) até o novo
function animarNumero(el, alvo, { formato = String, duracao = 800, atraso = 0 } = {}) {
  const de = Number(el.dataset.valor ?? 0);
  el.dataset.valor = alvo;
  cancelAnimationFrame(el._quadro);
  clearTimeout(el._espera);
  if (semMovimento() || de === alvo) { el.textContent = formato(alvo); return; }
  el.textContent = formato(de);
  el._espera = setTimeout(() => {
    const inicio = performance.now();
    const passo = (agora) => {
      const p = (agora - inicio) / duracao;
      el.textContent = formato(Math.round(de + (alvo - de) * suavizar(p)));
      if (p < 1) el._quadro = requestAnimationFrame(passo);
    };
    el._quadro = requestAnimationFrame(passo);
  }, atraso);
}

// Barras: vão da largura anterior até a nova com a animação nativa do navegador (element.animate)
function animarLargura(el, de, para, atraso = 0) {
  el.style.width = para;
  if (semMovimento() || de === para) return;
  el.getAnimations().forEach((a) => a.cancel());
  el.animate([{ width: de }, { width: para }], { duration: 750, delay: atraso, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
}

const icone = (nome) =>`<svg class="icone" aria-hidden="true"><use href="icones.svg#${nome}"/></svg>`;

function htmlResponsavel(nome) {
  if (!nome) return `<span class="responsavel responsavel--vazio"><span class="avatar avatar--p avatar--vazio" aria-hidden="true">?</span>Sem responsável</span>`;
  return `<span class="responsavel"><span class="avatar avatar--p" aria-hidden="true">${iniciais(nome)}</span>${esc(nome === EU ? `${nome} (você)` : nome)}</span>`;
}

const toast = $('[data-toast]');
let toastTempo;
function avisar(texto) {
  if (!toast) return;
  toast.textContent = texto;
  toast.removeAttribute('data-oculto');
  clearTimeout(toastTempo);
  toastTempo = setTimeout(() => toast.setAttribute('data-oculto', ''), 3200);
}

// Confirmação reutilizável (<dialog data-confirmar>): devolve true se a pessoa confirmar
// "exigir": texto de uma caixa que precisa ser marcada antes de liberar o botão (ações que destroem dados)
function confirmar({ titulo, texto, botao, perigo = false, icone: nomeIcone = 'alerta', exigir = '', botaoVoltar = 'Cancelar' }) {
  const dlg = $('[data-confirmar]');
  $('[data-c="titulo"]', dlg).textContent = titulo;
  $('[data-c="texto"]', dlg).innerHTML = texto;
  const ok = $('[data-c="ok"]', dlg);
  ok.textContent = botao;
  ok.className = `btn ${perigo ? 'btn--perigo-solido' : 'btn--primario'}`;
  let caixaExigir = $('[data-c="exigir"]', dlg);
  if (!caixaExigir) {
    caixaExigir = document.createElement('label');
    caixaExigir.className = 'confirmar__exigir';
    caixaExigir.dataset.c = 'exigir';
    caixaExigir.innerHTML = '<input type="checkbox"><span></span>';
    $('.confirmar__acoes', dlg).before(caixaExigir);
    $('input', caixaExigir).addEventListener('change', (e) => { ok.disabled = !e.target.checked; });
  }
  caixaExigir.hidden = !exigir;
  $('span', caixaExigir).textContent = exigir;
  $('input', caixaExigir).checked = false;
  ok.disabled = Boolean(exigir);
  const caixa = $('[data-c="icone"]', dlg);
  caixa.className = `confirmar__icone${perigo ? ' confirmar__icone--perigo' : ''}`;
  caixa.innerHTML = icone(nomeIcone);
  dlg.returnValue = '';
  dlg.showModal();
  const cancelar = $('[data-c="cancelar"]', dlg);
  cancelar.textContent = botaoVoltar;
  cancelar.focus();   // o padrão seguro fica com o foco
  // Responde ao clique nos botões (e ao Esc/fechar), sem depender só do evento "close",
  // que alguns navegadores atrasam em aba oculta. "feito" garante uma resposta só.
  return new Promise((resolver) => {
    let feito = false;
    const fim = (sim) => { if (!feito) { feito = true; resolver(sim); } };
    ok.onclick = () => { if (!ok.disabled) fim(true); };
    cancelar.onclick = () => fim(false);
    dlg.addEventListener('cancel', () => fim(false), { once: true });
    dlg.addEventListener('close', () => fim(dlg.returnValue === 'ok'), { once: true });
  });
}

// ---------- Estado das ocorrências ----------
// As mudanças feitas na gaveta ficam guardadas na aba (sessionStorage),
// para o Dashboard e as Ocorrências mostrarem o mesmo estado.
const CHAVE_OC = 'opiina-demo-ocorrencias';

function historicoInicial(oc) {
  const h = [{ dias: oc.criada, texto: `Resposta recebida pela pesquisa (nota ${oc.nota})` }];
  if (oc.responsavel) h.push({ dias: oc.criada, texto: `Atribuída a ${oc.responsavel}` });
  if (oc.etapa !== 'Nova') h.push({ dias: Math.min(0, oc.criada + 1), texto: `Etapa alterada para "${oc.etapa}"` });
  return h;
}

function carregarOcorrencias() {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_OC));
    if (Array.isArray(salvo) && salvo.length) return salvo;
  } catch { /* sem armazenamento: usa os dados iniciais */ }
  return D.ocorrencias.map((oc) => ({ ...oc, historico: historicoInicial(oc) }));
}
function salvarOcorrencias() {
  try { sessionStorage.setItem(CHAVE_OC, JSON.stringify(ocorrencias)); } catch { /* ignora */ }
}
const ocorrencias = carregarOcorrencias();
const abertas = () => ocorrencias.filter((oc) => oc.etapa !== 'Resolvida');

// ---------- Menu lateral ----------
const lateral = $('[data-lateral]');
const abrirMenu = $('[data-menu-abrir]');
const fecharMenu = $('[data-menu-fechar]');
const fundoMenu = $('[data-menu-fundo]');
const foraDoMenu = $$('[data-fora-do-menu]');
const telaMovel = matchMedia('(max-width: 1023px)');

function menuAberto(aberto) {
  lateral.toggleAttribute('data-aberto', aberto);
  abrirMenu.setAttribute('aria-expanded', String(aberto));
  foraDoMenu.forEach((el) => { el.inert = aberto; });
  document.body.style.overflow = aberto ? 'hidden' : '';
  if (aberto) ($('[aria-current="page"]', lateral) || $('.nav__item', lateral)).focus();
  else abrirMenu.focus();
}
abrirMenu?.addEventListener('click', () => menuAberto(true));
fecharMenu?.addEventListener('click', () => menuAberto(false));
fundoMenu?.addEventListener('click', () => menuAberto(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lateral?.hasAttribute('data-aberto')) menuAberto(false);
});
telaMovel.addEventListener('change', () => { if (!telaMovel.matches && lateral.hasAttribute('data-aberto')) menuAberto(false); });

// Item ativo: pela página (data-tela no body) ou, na tela "em breve", pelo ?tela=
const telaAtual = document.body.dataset.tela === 'breve'
  ? new URLSearchParams(location.search).get('tela')
  : document.body.dataset.tela;
const itemDoMenu = telaAtual === 'integracoes' ? 'configuracoes' : telaAtual;   // Integrações fica dentro de Configurações
$$('[data-nav]').forEach((item) => {
  if (item.dataset.nav === itemDoMenu) item.setAttribute('aria-current', 'page');
});

// ---------- Acesso por perfil ----------
// Menu: sai o que o perfil não vê (e o grupo que ficar vazio). Configurações fica para todos:
// quem não configura a empresa entra direto nos próprios dados (nome, e-mail, celular e senha).
$$('[data-nav]').forEach((item) => {
  if (item.dataset.nav === 'configuracoes' && !pode('configuracoes')) item.href = `configuracoes.html?aba=${pode('atendentes') ? 'atendentes' : 'conta'}`;
  else if (!pode(item.dataset.nav)) item.remove();
});
$$('.nav__grupo').forEach((grupo) => { if (!$('.nav__item', grupo)) grupo.remove(); });
// Prêmios ainda em desenvolvimento (decisão do cliente): selo no item do menu
$('[data-nav="premios"]')?.insertAdjacentHTML('beforeend', '<span class="visualmente-oculto">, </span><span class="selo-dev nav__dev">Em desenvolvimento</span>');
// Partes de outras telas (ex.: cartões de ocorrências no Dashboard) somem junto com a tela
$$('[data-precisa]').forEach((el) => { if (!pode(el.dataset.precisa)) el.remove(); });

// Rodapé do menu: quem está usando + "Ver como" (só na demonstração)
const conta = $('.conta');
if (conta) {
  $('.avatar', conta).textContent = iniciais(D.usuario.nome);
  const texto = $('.conta__texto', conta);
  texto.outerHTML = `<a class="conta__texto" href="configuracoes.html?aba=conta" title="Minha conta">
    <span class="conta__nome">${esc(D.usuario.nome)}</span><span class="conta__perfil">${esc(D.usuario.perfil)}</span></a>`;
  conta.insertAdjacentHTML('beforebegin', `
    <div class="ver-como">
      <label for="ver-como">Ver como <span>(demonstração)</span></label>
      <select id="ver-como">${Object.entries(D.perfis).map(([id, p]) => `<option value="${id}"${id === perfilId ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
    </div>`);
  // Modo escuro: chave no rodapé do menu. Sem escolha guardada, segue o tema do sistema.
  $('.ver-como').insertAdjacentHTML('beforebegin', `
    <button class="tema" type="button" aria-pressed="false" data-tema-botao>
      <span class="tema__icone" aria-hidden="true">${icone('lua')}</span>Modo escuro<span class="tema__chave" aria-hidden="true"></span>
    </button>`);
  const botaoTema = $('[data-tema-botao]');
  const raiz = document.documentElement;
  const sistemaEscuro = matchMedia('(prefers-color-scheme: dark)');
  function aplicarTema(escuro) {
    if (escuro) raiz.dataset.tema = 'escuro'; else delete raiz.dataset.tema;
    botaoTema.setAttribute('aria-pressed', String(escuro));
    $('.tema__icone', botaoTema).innerHTML = icone(escuro ? 'sol' : 'lua');
  }
  aplicarTema(raiz.dataset.tema === 'escuro');
  botaoTema.addEventListener('click', () => {
    const escuro = raiz.dataset.tema !== 'escuro';
    aplicarTema(escuro);
    try { localStorage.setItem('opiina-tema', escuro ? 'escuro' : 'claro'); } catch { /* ignora */ }
  });
  sistemaEscuro.addEventListener('change', (e) => {
    let escolha = null;
    try { escolha = localStorage.getItem('opiina-tema'); } catch { /* ignora */ }
    if (!escolha) aplicarTema(e.matches);
  });

  $('#ver-como').addEventListener('change', (e) => {
    try { sessionStorage.setItem(CHAVE_PERFIL, e.target.value); } catch { /* ignora */ }
    location.reload();
  });
}

// Tela que o perfil não vê (link guardado, endereço digitado): aviso no lugar do conteúdo
const semAcesso = telaAtual && telaAtual !== 'configuracoes' && telaAtual !== 'integracoes' && D.perfis.admin.telas.includes(telaAtual) && !pode(telaAtual);
if (semAcesso) {
  const nome = D.areas.find((a) => a.id === telaAtual)?.nome || 'esta tela';
  // Troca o elemento inteiro (não só o conteúdo): ele leva junto as marcas data-* que iniciam a tela
  const conteudo = document.createElement('div');
  conteudo.className = 'principal__conteudo';
  $('.principal__conteudo').replaceWith(conteudo);
  conteudo.innerHTML = `
    <section class="cartao breve">
      <span class="breve__icone" aria-hidden="true">${icone('cadeado')}</span>
      <h1 class="cabeca__titulo">Sem acesso a ${esc(nome)}</h1>
      <p>O perfil <strong>${esc(perfil.nome)}</strong> não inclui esta área. Se você precisa dela, peça a um administrador para mudar seu perfil.</p>
      <a class="btn btn--primario" href="index.html">Ir para o Dashboard</a>
    </section>`;
  document.title = `Sem acesso — Opiina`;
}

function atualizarSeloVencidas() {
  const selo = $('[data-selo-vencidas]');
  if (!selo) return;
  // O selo fica no item Feedbacks; só para quem trata (o Marketing não vê prazos)
  const total = pode('ocorrencias') ? abertas().filter((oc) => oc.prazo < 0).length : 0;
  selo.hidden = !total;
  // Leitor de tela: "Ocorrências, 2 vencidas" (e não "Ocorrências2")
  selo.innerHTML = `<span aria-hidden="true">${total}</span><span class="visualmente-oculto">, ${total} ${total === 1 ? 'vencida' : 'vencidas'}</span>`;
}
atualizarSeloVencidas();

// Sair: encerra a sessão de demonstração
$$('[data-sair]').forEach((link) => link.addEventListener('click', () => {
  try { sessionStorage.removeItem('opiina-demo'); sessionStorage.removeItem(CHAVE_OC); } catch { /* ignora */ }
}));

// Tela "em breve": mostra o nome da tela pedida
const nomesTelas = { ranking: 'Ranking', denuncias: 'Denúncias', pesquisas: 'Pesquisas', clientes: 'Clientes', premios: 'Prêmios', configuracoes: 'Configurações', integracoes: 'Integrações' };
const tituloBreve = $('[data-breve-titulo]');
if (tituloBreve && nomesTelas[telaAtual]) {
  tituloBreve.textContent = nomesTelas[telaAtual];
  document.title = `${nomesTelas[telaAtual]} — Opiina`;
  // Prêmios: a ideia ainda está em desenvolvimento (decisão do cliente). O protótipo feito fica em premios.html, fora do menu.
  if (telaAtual === 'premios') {
    tituloBreve.insertAdjacentHTML('beforeend', ' <span class="selo-dev">Em desenvolvimento</span>');
    $('.breve p').textContent = 'Os prêmios para clientes ainda estão sendo definidos. Esta área chega quando a ideia estiver pronta.';
    $('.breve__icone').innerHTML = icone('premios');
  }
}

// ---------- Dashboard ----------
const dash = $('[data-dashboard]');
if (dash) iniciarDashboard();

function iniciarDashboard() {
  const filtros = { unidade: 'todas', periodo: 30 };
  const verOcorrencias = pode('ocorrencias');
  const selUnidade = $('#filtro-unidade');
  const selPeriodo = $('#filtro-periodo');

  const hora = new Date().getHours();
  $('[data-saudacao]').textContent = `${hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}, ${D.usuario.primeiroNome}`;

  D.unidades.forEach((u) => selUnidade.add(new Option(u, u)));
  selUnidade.addEventListener('change', () => { filtros.unidade = selUnidade.value; desenhar(); });
  selPeriodo.addEventListener('change', () => { filtros.periodo = Number(selPeriodo.value); desenhar(); });

  // Na abertura, cada número começa a contar quando o cartão dele entra (mesma cascata do CSS)
  let abrindo = true;
  const atrasoDoCartao = (el) => (abrindo ? Number(el.closest('[style*="--ordem"]')?.style.getPropertyValue('--ordem') || 0) * 70 + 250 : 0);

  function desenhar() {
    const unidades = filtros.unidade === 'todas' ? D.unidades : [filtros.unidade];
    const periodo = D.periodos[filtros.periodo];
    const nomeUnidade = filtros.unidade === 'todas' ? 'Todas as unidades' : filtros.unidade;
    const contexto = $('[data-contexto]');
    contexto.textContent = `${periodo.rotulo} · ${nomeUnidade}`;
    if (!abrindo) {   // reinicia o destaque a cada troca
      contexto.classList.remove('contexto--mudou');
      void contexto.offsetWidth;
      contexto.classList.add('contexto--mudou');
    }

    // Números por unidade no período
    const porUnidade = D.unidades.map((u) => {
      const r = D.resumo[u];
      const respostas = Math.round(r.respostas * periodo.volume);
      const promotores = r.promotores + periodo.ajuste;
      const detratores = r.detratores - periodo.ajuste;
      return { nome: u, respostas, promotores, passivos: 100 - promotores - detratores, detratores, nps: promotores - detratores };
    });
    const escolhidas = porUnidade.filter((u) => unidades.includes(u.nome));
    const respostas = escolhidas.reduce((s, u) => s + u.respostas, 0);
    const media = (campo) => escolhidas.reduce((s, u) => s + u[campo] * u.respostas, 0) / respostas;
    const pct = { promotores: Math.round(media('promotores')), detratores: Math.round(media('detratores')) };
    pct.passivos = 100 - pct.promotores - pct.detratores;
    const nps = pct.promotores - pct.detratores;

    // Tendência semanal (média ponderada pelas respostas)
    const pesos = escolhidas.map((u) => D.resumo[u.nome].respostas);
    const serie = D.tendencia[D.unidades[0]].map((_, i) => Math.round(
      escolhidas.reduce((s, u, j) => s + D.tendencia[u.nome][i] * pesos[j], 0) / pesos.reduce((a, b) => a + b, 0)
    ));
    const variacao = serie[serie.length - 1] - serie[serie.length - 5];

    const ocs = abertas().filter((oc) => unidades.includes(oc.unidade));
    const vencidas = ocs.filter((oc) => oc.prazo < 0);
    const qsUnidade = filtros.unidade === 'todas' ? '' : `&unidade=${encodeURIComponent(filtros.unidade)}`;

    // Indicadores
    const kpi = (nome, valor, formato) => {
      const el = $(`[data-kpi="${nome}"]`);
      animarNumero(el, valor, { formato, atraso: atrasoDoCartao(el) });
    };
    kpi('nps', nps);
    kpi('respostas', respostas, numero);
    $('[data-kpi="nps-nota"]').innerHTML = variacao === 0
      ? 'Estável nas últimas 4 semanas'
      : `<strong class="${variacao > 0 ? 'sobe' : 'desce'}">${variacao > 0 ? '▲ +' : '▼ '}${variacao}</strong> nas últimas 4 semanas`;
    $('[data-kpi="respostas-nota"]').textContent = `${pct.promotores}% deram nota 9 ou 10`;
    // Cartões de ocorrências: só para perfis que veem Ocorrências (o Marketing não vê)
    if (verOcorrencias) {
      kpi('abertas', ocs.length);
      kpi('vencidas', vencidas.length);
      $('[data-kpi="abertas-nota"]').textContent = `${ocs.filter((oc) => !oc.responsavel).length} sem responsável`;
      $('[data-kpi="vencidas-nota"]').textContent = vencidas.length ? 'Passaram do prazo. Resolva primeiro.' : 'Nenhuma fora do prazo';
      $('[data-kpi-cartao="vencidas"]').classList.toggle('kpi--alerta', vencidas.length > 0);
      $('[data-kpi-link="abertas"]').href = `feedbacks.html?acao=abertas${qsUnidade}`;
      $('[data-kpi-link="vencidas"]').href = `feedbacks.html?acao=vencidas${qsUnidade}`;
    }
    $('[data-kpi-link="nps"]').href = `ranking.html?periodo=${filtros.periodo}`;
    $('[data-kpi-link="respostas"]').href = `feedbacks.html?periodo=${filtros.periodo === 7 ? 7 : 30}${qsUnidade}`;

    desenharTendencia(serie);
    desenharDistribuicao(nps, pct, respostas);
    desenharAtencao(ocs);
    desenharTemas(unidades);
    desenharUnidades(porUnidade);
    abrindo = false;
  }

  // ----- Gráfico: desenha na abertura; nas trocas, a curva se transforma até a nova -----
  const grafico = $('[data-grafico-tendencia]');
  let serieAtual = null;
  let quadroGrafico;
  const limites = (serie) => ({
    min: Math.floor((Math.min(...serie) - 6) / 10) * 10,
    max: Math.ceil((Math.max(...serie) + 6) / 10) * 10,
  });

  function desenharTendencia(serie) {
    const ultimo = serie[serie.length - 1];
    grafico.setAttribute('aria-label', `NPS por semana nas últimas 12 semanas: ${serie.join(', ')}. Começa em ${serie[0]} e está em ${ultimo}.`);
    const de = serieAtual;
    serieAtual = serie;
    cancelAnimationFrame(quadroGrafico);
    if (!de || semMovimento()) {
      grafico.classList.toggle('grafico--entrada', !de && !semMovimento());
      pintarTendencia(serie, limites(serie));
      return;
    }
    grafico.classList.remove('grafico--entrada');
    const limDe = limites(de), limPara = limites(serie);
    const inicio = performance.now();
    const passo = (agora) => {
      const p = suavizar((agora - inicio) / 700);
      const meio = (a, b) => a + (b - a) * p;
      const terminou = p >= 1;
      // No último quadro, os pontos "saltam" em sequência e o ponto da semana atual pulsa
      pintarTendencia(
        serie.map((v, i) => meio(de[i], v)),
        { min: meio(limDe.min, limPara.min), max: meio(limDe.max, limPara.max) },
        { atualizado: terminou },
      );
      if (!terminou) quadroGrafico = requestAnimationFrame(passo);
    };
    quadroGrafico = requestAnimationFrame(passo);
  }

  function pintarTendencia(serie, { min, max }, { atualizado = false } = {}) {
    const L = 640, A = 230, esq = 36, dir = 16, topo = 22, base = 30;
    const x = (i) => esq + (i * (L - esq - dir)) / (serie.length - 1);
    const y = (v) => topo + ((max - v) * (A - topo - base)) / (max - min);
    let svg = '';
    // Durante a transformação os limites são fracionários: as linhas de grade ficam nas dezenas
    for (let v = Math.ceil(min / 10) * 10; v <= max + 0.01; v += 10) {
      svg += `<line class="grafico__grade" x1="${esq}" x2="${L - dir}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `<text class="grafico__eixo" x="${esq - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    serie.forEach((_, i) => {
      if (i % 2 === 1 || i > serie.length - 3) return;   // o fim do eixo é "Esta semana"
      svg += `<text class="grafico__eixo" x="${x(i)}" y="${A - 6}" text-anchor="middle">${dataCurta(diaRelativo(-7 * (serie.length - 1 - i)))}</text>`;
    });
    svg += `<text class="grafico__eixo" x="${x(serie.length - 1)}" y="${A - 6}" text-anchor="end">Esta semana</text>`;
    const pontos = serie.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    svg += `<defs><linearGradient id="area-nps" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2563EB" stop-opacity=".18"/><stop offset="1" stop-color="#2563EB" stop-opacity="0"/></linearGradient></defs>`;
    svg += `<polygon class="grafico__area" fill="url(#area-nps)" points="${x(0)},${A - base} ${pontos} ${x(serie.length - 1)},${A - base}"/>`;
    svg += `<polyline class="grafico__linha" pathLength="1" points="${pontos}"/>`;   // pathLength: a animação de desenhar usa 0→1
    const ultimo = serie[serie.length - 1];
    if (atualizado) svg += `<circle class="grafico__pulso" cx="${x(serie.length - 1)}" cy="${y(ultimo)}" r="5"/>`;
    serie.forEach((v, i) => {
      const fim = i === serie.length - 1;
      const classes = `grafico__ponto${fim ? ' grafico__ponto--fim' : ''}${atualizado ? ' grafico__ponto--pula' : ''}`;
      svg += `<circle class="${classes}" style="--i: ${i}" cx="${x(i)}" cy="${y(v)}" r="${fim ? 5 : 3.5}"/>`;
    });
    svg += `<text class="grafico__valor" x="${x(serie.length - 1)}" y="${y(ultimo) - 12}" text-anchor="end">NPS ${Math.round(ultimo)}</text>`;
    grafico.innerHTML = svg;
  }

  // ----- Distribuição: as 3 faixas são criadas uma vez e só mudam de largura -----
  const faixas = [
    { chave: 'promotores', nome: 'Promotores', faixa: '9–10', cor: 'var(--promotor)' },
    { chave: 'passivos', nome: 'Passivos', faixa: '7–8', cor: 'var(--passivo)' },
    { chave: 'detratores', nome: 'Detratores', faixa: '0–6', cor: 'var(--detrator)' },
  ];
  const barraNps = $('[data-dist-barra]');
  barraNps.innerHTML = faixas.map((f) => `<span style="background:${f.cor}"></span>`).join('');
  // Legenda criada uma vez: só os números mudam (e contam do valor anterior ao novo)
  const legenda = $('[data-dist-legenda]');
  legenda.innerHTML = faixas.map((f) => `
    <li><span class="legenda__cor" style="background:${f.cor}" aria-hidden="true"></span>
      <span>${f.nome} <span class="legenda__faixa">(nota ${f.faixa})</span></span>
      <span class="legenda__valor"><span data-pct="${f.chave}">0</span>% · <span data-qtd="${f.chave}">0</span></span></li>`).join('');

  function desenharDistribuicao(nps, pct, respostas) {
    const numeroNps = $('[data-dist-nps]');
    animarNumero(numeroNps, nps, { atraso: atrasoDoCartao(numeroNps) });
    const atraso = atrasoDoCartao(barraNps);
    faixas.forEach((f, i) => {
      const s = $$('span', barraNps)[i];
      animarLargura(s, s.style.width || '0%', `${pct[f.chave]}%`, abrindo ? atraso + i * 120 : 0);   // abre em sequência; nas trocas, parte da largura anterior
      animarNumero($(`[data-pct="${f.chave}"]`, legenda), pct[f.chave], { atraso: abrindo ? atraso + i * 120 : 0 });
      animarNumero($(`[data-qtd="${f.chave}"]`, legenda), Math.round(respostas * pct[f.chave] / 100), { formato: numero, atraso: abrindo ? atraso + i * 120 : 0 });
    });
  }

  function desenharAtencao(ocs) {
    const lista = $('[data-atencao]');
    if (!lista) return;   // perfil sem Ocorrências: o cartão não existe
    const urgentes = ocs
      .filter((oc) => oc.prazo <= 0 || !oc.responsavel)
      .sort((a, b) => a.prazo - b.prazo)
      .slice(0, 4);
    if (!urgentes.length) {
      lista.innerHTML = `<li class="vazio"><strong>Tudo em dia</strong>Nenhuma ocorrência vencida ou sem responsável.</li>`;
      return;
    }
    lista.innerHTML = urgentes.map((oc) => {
      const p = prazoInfo(oc);
      return `<li><a class="atencao__item" href="feedbacks.html?abrir=${oc.id}">
        <span class="nota nota--${categoria(oc.nota)}" aria-label="Nota ${oc.nota}">${oc.nota}</span>
        <span class="atencao__texto">${esc(oc.comentario)}</span>
        <span class="atencao__meta"><span class="prazo ${p.classe}">${icone('relogio')}${p.texto}</span><span>${esc(oc.unidade)}</span>${oc.responsavel ? '' : '<span>Sem responsável</span>'}</span>
      </a></li>`;
    }).join('');
  }

  // ----- Temas: uma linha por tema, criada uma vez. Quando a ordem muda, as linhas deslizam
  // até a nova posição (técnica FLIP: mede antes, reordena, anima a diferença) -----
  const listaTemas = $('[data-temas]');
  listaTemas.innerHTML = D.temas.map((t) => `
    <li data-tema="${esc(t.nome)}"><span class="temas__nome">${esc(t.nome)}</span>
      <span class="temas__trilho" aria-hidden="true"><span class="temas__barra"></span></span>
      <span class="temas__total"><span data-total>0</span><span class="visualmente-oculto"> menções</span></span></li>`).join('');

  function desenharTemas(unidades) {
    const temas = D.temas
      .map((t) => ({ nome: t.nome, total: unidades.reduce((s, u) => s + t.unidades[u], 0) }))
      .sort((a, b) => b.total - a.total);
    const maior = temas[0].total;
    const linhas = $$('li', listaTemas);
    const antes = new Map(linhas.map((li) => [li, li.getBoundingClientRect().top]));
    const atraso = abrindo ? atrasoDoCartao(listaTemas) : 0;

    temas.forEach((t, i) => {
      const li = $(`[data-tema="${t.nome}"]`, listaTemas);
      listaTemas.append(li);   // reordena (move o elemento, não recria)
      const barra = $('.temas__barra', li);
      animarLargura(barra, barra.style.width || '0%', `${(t.total / maior) * 100}%`, atraso + (abrindo ? i * 40 : 0));
      animarNumero($('[data-total]', li), t.total, { atraso });
    });

    if (abrindo || semMovimento()) return;
    linhas.forEach((li) => {
      const desloca = antes.get(li) - li.getBoundingClientRect().top;
      if (Math.abs(desloca) < 1) return;
      li.animate([{ transform: `translateY(${desloca}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    });
  }

  function desenharUnidades(porUnidade) {
    const corpo = $('[data-tabela-unidades]');
    corpo.innerHTML = [...porUnidade].sort((a, b) => b.nps - a.nps).map((u) => {
      const abertasUnidade = abertas().filter((oc) => oc.unidade === u.nome).length;
      const destaque = filtros.unidade === u.nome ? ' data-destaque' : '';
      return `<tr${destaque}>
        <th scope="row">${esc(u.nome)}</th>
        <td class="num"><span data-conta="respostas" data-de="${anterior[u.nome]?.respostas ?? 0}" data-alvo="${u.respostas}">${numero(u.respostas)}</span></td>
        <td class="num"><strong data-conta="nps" data-de="${anterior[u.nome]?.nps ?? 0}" data-alvo="${u.nps}">${u.nps}</strong><span class="mini-barra" aria-hidden="true"><span data-unidade-barra="${esc(u.nome)}" data-largura="${Math.max(u.nps, 0)}%"></span></span></td>
        <td class="num">${u.promotores}%</td>
        <td class="num">${u.detratores}%</td>
        ${verOcorrencias ? `<td class="num"><a class="cartao__link" style="margin:0;min-height:0" href="feedbacks.html?acao=abertas&unidade=${encodeURIComponent(u.nome)}">${abertasUnidade}<span class="visualmente-oculto"> ocorrências abertas em ${esc(u.nome)}</span></a></td>` : ''}
      </tr>`;
    }).join('');
    // As barras partem da largura que tinham antes da troca (na abertura, de 0)
    const atraso = abrindo ? atrasoDoCartao(corpo) : 0;
    $$('[data-unidade-barra]', corpo).forEach((b) => {
      const de = anterior[b.dataset.unidadeBarra]?.nps ?? 0;
      animarLargura(b, `${Math.max(de, 0)}%`, b.dataset.largura, atraso);
    });
    // Respostas e NPS contam do valor anterior ao novo
    $$('[data-conta]', corpo).forEach((el) => {
      el.dataset.valor = el.dataset.de;
      animarNumero(el, Number(el.dataset.alvo), { formato: el.dataset.conta === 'respostas' ? numero : String, atraso });
    });
    porUnidade.forEach((u) => { anterior[u.nome] = { nps: u.nps, respostas: u.respostas }; });
  }
  const anterior = {};

  desenhar();
}
