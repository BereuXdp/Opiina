// Opiina — painel (protótipo): Avaliações externas (Google, iFood, Tripadvisor, Reclame Aqui). Pedido do cliente, 2026-11-05.
// Usa utilidades de painel.js ($, $$, esc, icone, avisar, D…). Aqui só se veem as avaliações:
// conectar as plataformas fica em Configurações › Integrações (configuracoes.js), com o mesmo estado guardado.
// CACHE: as avaliações ficam guardadas e só são buscadas de novo quando o cache vence (AV_INTERVALO) ou quando
// alguém pede "Atualizar agora" (no máximo uma vez a cada AV_ESPERA). No protótipo, a "busca" é simulada e o cache
// fica no navegador (localStorage); no app, ele fica no servidor e uma rotina atualiza sozinha (ver specs/design.md).

const AV_CHAVE = 'opiina-demo-avaliacoes';
const AV_INTERVALO = 6 * 60 * 60 * 1000;   // atualização automática: a cada 6 horas
const AV_ESPERA = 15 * 60 * 1000;          // "Atualizar agora": no máximo a cada 15 minutos
const AV_POR_PAGINA = 12;
const AV_PLAT = Object.fromEntries(D.plataformas.map((p) => [p.id, p]));

// Instante (ms) de uma avaliação de exemplo: "dias" relativos a hoje + "hora"
function avInstante(a) {
  if (a.ts) return a.ts;
  const d = diaRelativo(a.dias);
  const [h, m] = (a.hora || '12:00').split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return Math.min(d.getTime(), Date.now() - 60e3);   // "hoje" nunca no futuro
}

// ----- Estado guardado (o "cache" da demonstração) -----
const av = (() => {
  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(AV_CHAVE)); } catch { /* sem armazenamento */ }
  if (salvo?.atualizadoEm) return salvo;
  const inicio = Date.now() - 47 * 60e3;   // a demonstração começa com o cache atualizado há 47 min
  return {
    atualizadoEm: inicio,
    porPlataforma: { google: inicio, ifood: inicio },
    conexoes: structuredClone(D.conexoes),
    extras: [],          // avaliações que chegaram nas atualizações da demonstração
  };
})();
const avSalvar = () => { try { localStorage.setItem(AV_CHAVE, JSON.stringify(av)); } catch { /* vale só nesta página */ } };

const avConectada = (plat, unidade) => (AV_PLAT[plat].porUnidade ? Boolean(av.conexoes[plat]?.[unidade]) : Boolean(av.conexoes[plat]?._empresa));
const avPlatConectada = (plat) => Object.keys(av.conexoes[plat] || {}).length > 0;
// Só aparecem as avaliações de plataformas (e unidades) conectadas
const avTodas = () => [...D.avaliacoes, ...av.extras]
  .map((a) => ({ ...a, ts: avInstante(a) }))
  .filter((a) => avConectada(a.plataforma, a.unidade));

function avQuando(ms) {
  const d = new Date(ms);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const dif = Math.round((hoje - dia) / 864e5);
  if (dif === 0) return `hoje às ${hora}`;
  if (dif === 1) return `ontem às ${hora}`;
  return `${dataCurta(d)} às ${hora}`;
}
function avHa(ms) {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60e3));
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h} h${min % 60 ? ` ${min % 60} min` : ''}`;
}
const avMedia = (lista) => {
  const comNota = lista.filter((a) => a.nota);
  return comNota.length ? comNota.reduce((s, a) => s + a.nota, 0) / comNota.length : null;
};
const avNum = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function avNotaHtml(a) {
  const p = AV_PLAT[a.plataforma];
  if (p.escala === 'reclamacao') {
    const ok = a.situacao === 'Respondida';
    return `<span class="av-recl${ok ? ' av-recl--ok' : ''}">Reclamação · ${esc(a.situacao)}</span>`;
  }
  const marca = p.escala === 'bolhas' ? 'av-bolhas' : 'av-estrelas';
  return `<span class="${marca}" role="img" aria-label="Nota ${a.nota} de 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= a.nota ? 'cheia' : ''}" aria-hidden="true"></i>`).join('')}</span>`;
}
const avSelo = (plat) => `<span class="av-sigla" style="--cor:${AV_PLAT[plat].cor}" aria-hidden="true">${AV_PLAT[plat].sigla}</span>`;

if ($('[data-avaliacoes]')) iniciarAvaliacoes();

function iniciarAvaliacoes() {
  const form = $('[data-av-filtros]');
  const padrao = { q: '', plataforma: 'todas', unidade: 'todas', nota: 'todas', periodo: '30', resposta: 'todas' };
  const params = new URLSearchParams(location.search);
  const estado = { ...padrao };
  Object.keys(padrao).forEach((k) => { if (params.get(k)) estado[k] = params.get(k); });
  D.plataformas.filter((p) => !p.emAnalise).forEach((p) => form.plataforma.add(new Option(p.nome, p.id)));
  D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
  Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
  let mostrando = AV_POR_PAGINA;
  let atualizando = false;

  // ----- Barra do cache -----
  function desenharCache() {
    const proxima = av.atualizadoEm + AV_INTERVALO;
    const liberaEm = av.atualizadoEm + AV_ESPERA;
    const espera = Date.now() < liberaEm;
    $('[data-av-cache]').innerHTML = `
      <span class="av-cache__icone" aria-hidden="true">${icone(atualizando ? 'relogio' : 'ok')}</span>
      <div class="av-cache__texto">
        <p><strong>${atualizando ? 'Buscando avaliações novas…' : `Atualizado ${avQuando(av.atualizadoEm)}`}</strong>${atualizando ? '' : ` <span>(${avHa(av.atualizadoEm)})</span>`}</p>
        <p class="av-cache__sub">As avaliações ficam guardadas e se atualizam sozinhas: Google e iFood a cada 6 horas, Tripadvisor uma vez por dia. Próxima atualização: ${avQuando(proxima)}.</p>
      </div>
      <div class="av-cache__acao">
        <button class="btn btn--secundario" type="button" data-av-atualizar${atualizando || espera ? ' disabled' : ''}${espera && !atualizando ? ` aria-describedby="av-espera"` : ''}>${atualizando ? 'Atualizando…' : 'Atualizar agora'}</button>
        ${espera && !atualizando ? `<span class="av-cache__espera" id="av-espera">Pode atualizar de novo às ${new Date(liberaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
      </div>
      <p class="av-cache__demo">Protótipo: <button type="button" class="teste-simular" data-av-vencer>simular 6 horas sem atualizar</button></p>`;
    $('[data-av-atualizar]').addEventListener('click', () => atualizar(false));
    $('[data-av-vencer]').addEventListener('click', () => {
      const atras = AV_INTERVALO + 60e3;
      av.atualizadoEm -= atras;
      Object.keys(av.porPlataforma).forEach((id) => { av.porPlataforma[id] -= atras; });
      avSalvar();
      location.reload();
    });
  }

  // Busca nas plataformas conectadas (simulada): traz as avaliações que ainda não estavam no cache
  function atualizar(automatica) {
    if (atualizando) return;
    atualizando = true;
    desenharCache();
    $('[data-av-lista]').setAttribute('aria-busy', 'true');
    setTimeout(() => {
      const ja = new Set(av.extras.map((a) => a.id));
      // Cada plataforma só é consultada quando o cache dela venceu (o Tripadvisor cobra por consulta: 1 vez por dia)
      const agora = Date.now();
      const limite = (p) => (automatica || p.horas >= 24 ? p.horas * 3600e3 : AV_ESPERA);   // o botão não fura o limite diário
      const vencida = (p) => !p.emAnalise && avPlatConectada(p.id) && agora - (av.porPlataforma[p.id] || 0) >= limite(p);
      const consultar = new Set(D.plataformas.filter(vencida).map((p) => p.id));
      const novas = D.avaliacoesNovas
        .filter((a) => !ja.has(a.id) && consultar.has(a.plataforma) && avConectada(a.plataforma, a.unidade))
        .slice(0, automatica ? 3 : 2)
        .map((a, i) => ({ ...a, ts: agora - (i + 1) * 7 * 60e3 }));
      av.extras.push(...novas);
      av.atualizadoEm = agora;
      consultar.forEach((id) => { av.porPlataforma[id] = agora; });
      avSalvar();
      atualizando = false;
      $('[data-av-lista]').removeAttribute('aria-busy');
      desenharTudo();
      avisar(novas.length ? `${novas.length} ${novas.length === 1 ? 'avaliação nova' : 'avaliações novas'}` : 'Nenhuma avaliação nova desde a última atualização');
      agendar();
    }, 1400);
  }

  // Enquanto a tela está aberta, a atualização automática acontece sozinha quando o cache vence
  let relogio = null;
  function agendar() {
    clearTimeout(relogio);
    const falta = av.atualizadoEm + AV_INTERVALO - Date.now();
    relogio = setTimeout(() => atualizar(true), Math.max(falta, 0));
  }
  // A cada minuto, os textos "há X min" e o botão (que libera depois da espera) se atualizam
  setInterval(() => { if (!atualizando) desenharCache(); }, 60e3);

  // ----- Cartões das plataformas -----
  function desenharPlataformas() {
    const todas = avTodas().filter((a) => a.ts >= Date.now() - 90 * 864e5);
    $('[data-av-plataformas]').innerHTML = D.plataformas.map((p) => {
      const ligada = avPlatConectada(p.id);
      const lista = todas.filter((a) => a.plataforma === p.id);
      const media = avMedia(lista);
      const unidades = p.porUnidade ? Object.keys(av.conexoes[p.id] || {}) : [];
      const onde = p.porUnidade ? (unidades.length === D.unidades.length ? 'Todas as unidades' : unidades.join(', ')) : 'Página da empresa';
      // Reclame Aqui: sem API pública confirmada (só via HugMe, pago). Fica visível, mas sem conexão.
      if (p.emAnalise) {
        return `<article class="cartao av-plat av-plat--off">
          <div class="av-plat__topo">${avSelo(p.id)}<h3>${p.nome}</h3><span class="selo-dev">Em análise</span></div>
          <p class="av-plat__onde">O Reclame Aqui não tem uma API pública para ler as reclamações. Estamos vendo como conectar.</p>
        </article>`;
      }
      // Aqui só se vê; conectar fica em Configurações › Integrações (cliente, 2026-11-05)
      return `<article class="cartao av-plat${ligada ? '' : ' av-plat--off'}">
        <div class="av-plat__topo">${avSelo(p.id)}<h3>${p.nome}</h3>
          <span class="av-plat__estado${ligada ? ' av-plat__estado--on' : ''}">${ligada ? 'Conectada' : 'Não conectada'}</span></div>
        ${ligada ? `
          <p class="av-plat__nota">${media ? avNum(media) : '–'}<small> de 5 · ${lista.length} em 90 dias</small></p>
          <p class="av-plat__onde">${esc(onde)}</p>
          <p class="av-plat__quando">Atualizada ${avQuando(av.porPlataforma[p.id] || av.atualizadoEm)} · ${p.horas === 24 ? '1 vez por dia' : `a cada ${p.horas} horas`}</p>`
        : '<p class="av-plat__onde">Ainda não conectada.</p>'}
      </article>`;
    }).join('');
  }

  // ----- Resumo + lista -----
  const noPeriodo = () => avTodas().filter((a) => a.ts >= Date.now() - Number(estado.periodo) * 864e5)
    .filter((a) => estado.unidade === 'todas' || a.unidade === estado.unidade || (!a.unidade && estado.unidade === 'todas'));

  function filtrar() {
    const q = estado.q.trim().toLowerCase();
    return noPeriodo().filter((a) => {
      if (estado.plataforma !== 'todas' && a.plataforma !== estado.plataforma) return false;
      if (estado.nota === 'baixas' && !(a.nota && a.nota <= 2)) return false;
      if (estado.nota === 'altas' && !(a.nota >= 4)) return false;
      if (estado.nota === '3' && a.nota !== 3) return false;
      if (estado.resposta === 'sem' && a.resposta) return false;
      if (estado.resposta === 'com' && !a.resposta) return false;
      if (q && !`${a.texto || ''} ${a.titulo || ''} ${a.autor}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.ts - a.ts);
  }

  function desenharResumo() {
    const lista = noPeriodo();
    const media = avMedia(lista);
    const baixas = lista.filter((a) => a.nota && a.nota <= 2).length;
    const semResposta = lista.filter((a) => !a.resposta).length;
    const per = `Últimos ${estado.periodo} dias`;
    $('[data-av-resumo]').innerHTML = `
      <article class="kpi"><p class="kpi__rotulo">Nota média</p><p class="kpi__valor">${media ? avNum(media) : '–'}<small>de 5</small></p><p class="kpi__nota">${per}, todas as plataformas com nota</p></article>
      <article class="kpi"><p class="kpi__rotulo">Avaliações</p><p class="kpi__valor">${lista.length}</p><p class="kpi__nota">${per}</p></article>
      <article class="kpi${baixas ? ' kpi--alerta' : ''}"><p class="kpi__rotulo"><a class="kpi__link" href="#" data-av-atalho="baixas">Notas baixas (1 e 2)</a></p><p class="kpi__valor">${baixas}</p><p class="kpi__nota">${baixas ? 'Clique para ver' : 'Nenhuma no período'}</p></article>
      <article class="kpi"><p class="kpi__rotulo"><a class="kpi__link" href="#" data-av-atalho="sem">Sem resposta da casa</a></p><p class="kpi__valor">${semResposta}</p><p class="kpi__nota">Respostas ficam na própria plataforma</p></article>`;
    $$('[data-av-atalho]').forEach((l) => l.addEventListener('click', (e) => {
      e.preventDefault();
      if (l.dataset.avAtalho === 'baixas') estado.nota = 'baixas'; else estado.resposta = 'sem';
      Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
      mostrando = AV_POR_PAGINA;
      sincronizarEndereco();
      desenharLista();
      $('[data-av-lista]').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  function htmlItem(a) {
    const p = AV_PLAT[a.plataforma];
    const nova = av.extras.some((x) => x.id === a.id) && a.ts > Date.now() - 864e5;
    return `<li class="cartao av-item">
      <div class="av-item__topo">
        ${avSelo(a.plataforma)}
        <span class="av-item__meta"><strong>${p.nome}</strong>${a.unidade ? ` · ${esc(a.unidade)}` : ''} · <time datetime="${new Date(a.ts).toISOString()}">${avQuando(a.ts)}</time></span>
        ${nova ? '<span class="av-novo">Nova</span>' : ''}
      </div>
      <div class="av-item__nota">${avNotaHtml(a)}<span class="av-item__autor">${esc(a.autor)}</span></div>
      ${a.titulo ? `<p class="av-item__titulo">${esc(a.titulo)}</p>` : ''}
      ${a.texto ? `<p class="av-item__texto">“${esc(a.texto)}”</p>` : '<p class="fb-item__sem">Só a nota, sem comentário</p>'}
      ${a.resposta ? `<div class="av-resposta"><span>Resposta da casa</span><p>${esc(a.resposta)}</p></div>` : ''}
      <button class="btn btn--fantasma av-item__ver" type="button" data-av-ver="${p.nome}">${icone('link')}Ver no ${p.nome}</button>
    </li>`;
  }

  function desenharLista() {
    const lista = filtrar();
    const n = lista.length;
    $('[data-av-contagem]').textContent = `${n} ${n === 1 ? 'avaliação' : 'avaliações'}`;
    $('[data-av-lista]').innerHTML = lista.slice(0, mostrando).map(htmlItem).join('');
    $('[data-av-vazio]').hidden = n > 0;
    $('[data-av-mais]').hidden = n <= mostrando;
    $$('[data-av-ver]').forEach((b) => b.addEventListener('click', () => avisar(`No app, abre esta avaliação no ${b.dataset.avVer}.`)));
  }

  function desenharTudo() { desenharCache(); desenharPlataformas(); desenharResumo(); desenharLista(); }

  function sincronizarEndereco() {
    const p = new URLSearchParams();
    Object.keys(padrao).forEach((k) => { if (estado[k] !== padrao[k]) p.set(k, estado[k]); });
    history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
  }
  form.addEventListener('input', () => {
    Object.keys(padrao).forEach((k) => { if (form[k]) estado[k] = form[k].value; });
    mostrando = AV_POR_PAGINA;
    sincronizarEndereco();
    desenharResumo();
    desenharLista();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('[data-av-limpar]').addEventListener('click', () => {
    Object.assign(estado, padrao);
    Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
    mostrando = AV_POR_PAGINA;
    sincronizarEndereco();
    desenharResumo();
    desenharLista();
  });
  $('[data-av-mais]').addEventListener('click', () => { mostrando += AV_POR_PAGINA; desenharLista(); });

  desenharTudo();
  // Cache vencido ao abrir a tela: atualiza na hora. Senão, agenda para quando vencer.
  if (Date.now() - av.atualizadoEm >= AV_INTERVALO) atualizar(true); else agendar();
}
