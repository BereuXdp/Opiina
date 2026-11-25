// Opiina — painel (protótipo): Avaliações externas (Google, iFood, Tripadvisor). Pedido do cliente, 2026-11-05.
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

// Estados guardados antes de 2026-11-25 tinham o Tripadvisor desconectado: liga uma vez as páginas de exemplo
// (depois disso, se a pessoa remover em Configurações, fica removido). Mesma regra em configuracoes.js.
function avLigarTripadvisor(s) {
  if (s.tripadvisorDemo) return s;
  s.tripadvisorDemo = true;
  if (!Object.keys(s.conexoes?.tripadvisor || {}).length) {
    s.conexoes = { ...s.conexoes, tripadvisor: structuredClone(D.conexoes.tripadvisor) };
    if (s.contas) s.contas.tripadvisor = Object.entries(D.conexoes.tripadvisor).map(([u, link], i) => ({ id: `t-${i}`, nome: link, unidades: [u] }));
    s.porPlataforma = { ...s.porPlataforma, tripadvisor: s.atualizadoEm };
  }
  try { localStorage.setItem('opiina-demo-avaliacoes', JSON.stringify(s)); } catch { /* vale só nesta página */ }
  return s;
}

// ----- Estado guardado (o "cache" da demonstração) -----
const av = (() => {
  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(AV_CHAVE)); } catch { /* sem armazenamento */ }
  if (salvo?.atualizadoEm) return avLigarTripadvisor(salvo);
  const inicio = Date.now() - 47 * 60e3;   // a demonstração começa com o cache atualizado há 47 min
  return {
    atualizadoEm: inicio,
    porPlataforma: { google: inicio, ifood: inicio, tripadvisor: inicio },
    tripadvisorDemo: true,
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

// Estrelas de uma média (preenche a fração da última estrela)
function avEstrelasMedia(m) {
  return `<span class="av-estrelas av-estrelas--media" role="img" aria-label="Nota média ${avNum(m)} de 5">${[1, 2, 3, 4, 5]
    .map((i) => `<i style="--p:${Math.round(Math.max(0, Math.min(1, m - (i - 1))) * 100)}%" aria-hidden="true"></i>`).join('')}</span>`;
}
const avHora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
// Título do grupo do dia na lista: Hoje · Ontem · "sábado, 22/11" (até 6 dias) · "15/11"
function avDia(ms) {
  const d = new Date(ms);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const dif = Math.round((hoje - dia) / 864e5);
  if (dif === 0) return 'Hoje';
  if (dif === 1) return 'Ontem';
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return dif < 7 ? `${semana[0].toUpperCase()}${semana.slice(1)}, ${dataCurta(d)}` : dataCurta(d);
}
const avPlural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

if ($('[data-avaliacoes]')) iniciarAvaliacoes();

function iniciarAvaliacoes() {
  const form = $('[data-av-filtros]');
  const padrao = { q: '', plataforma: 'todas', unidade: 'todas', nota: 'todas', periodo: '30', resposta: 'todas' };
  const params = new URLSearchParams(location.search);
  const estado = { ...padrao };
  Object.keys(padrao).forEach((k) => { if (params.get(k)) estado[k] = params.get(k); });
  // Plataforma em abas (rádios): Todas + só as conectadas, com a contagem
  const abas = D.plataformas.filter((p) => !p.emAnalise && avPlatConectada(p.id));
  if (estado.plataforma !== 'todas' && !abas.some((p) => p.id === estado.plataforma)) estado.plataforma = 'todas';
  $('[data-av-chips]').insertAdjacentHTML('beforeend', [
    `<label class="av-aba"><input type="radio" name="plataforma" value="todas">Todas <b data-av-qtd="todas"></b></label>`,
    ...abas.map((p) => `<label class="av-aba"><input type="radio" name="plataforma" value="${p.id}">${p.nome} <b data-av-qtd="${p.id}"></b></label>`),
  ].join(''));
  D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
  const preencherForm = () => Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
  preencherForm();
  let mostrando = AV_POR_PAGINA;
  let atualizando = false;

  // ----- Status do cache (ao lado do título) -----
  function desenharCache() {
    const proxima = av.atualizadoEm + AV_INTERVALO;
    const liberaEm = av.atualizadoEm + AV_ESPERA;
    const espera = Date.now() < liberaEm;
    $('[data-av-cache]').innerHTML = `
      <p class="av-sinc__texto"><span class="av-sinc__ponto${atualizando ? ' av-sinc__ponto--busca' : ''}" aria-hidden="true"></span>
        ${atualizando ? 'Buscando avaliações novas…' : `Atualizado ${avHa(av.atualizadoEm)} <span class="av-sinc__sub">· próxima ${avQuando(proxima)}</span>`}</p>
      <button class="btn btn--secundario av-sinc__btn" type="button" data-av-atualizar${atualizando || espera ? ' disabled' : ''}${espera && !atualizando ? ` aria-describedby="av-espera"` : ''}>${atualizando ? 'Atualizando…' : 'Atualizar agora'}</button>
      ${espera && !atualizando ? `<span class="av-sinc__espera" id="av-espera">Pode atualizar de novo às ${avHora(liberaEm)}</span>` : ''}`;
    $('[data-av-atualizar]').addEventListener('click', () => atualizar(false));
  }
  $('[data-av-vencer]').addEventListener('click', () => {
    const atras = AV_INTERVALO + 60e3;
    av.atualizadoEm -= atras;
    Object.keys(av.porPlataforma).forEach((id) => { av.porPlataforma[id] -= atras; });
    avSalvar();
    location.reload();
  });

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

  // ----- Recortes -----
  const daUnidade = (a) => estado.unidade === 'todas' || a.unidade === estado.unidade;
  const noPeriodo = () => avTodas().filter((a) => a.ts >= Date.now() - Number(estado.periodo) * 864e5).filter(daUnidade);
  function filtrar({ ignorarPlataforma = false } = {}) {
    const q = estado.q.trim().toLowerCase();
    return noPeriodo().filter((a) => {
      if (!ignorarPlataforma && estado.plataforma !== 'todas' && a.plataforma !== estado.plataforma) return false;
      if (estado.nota === 'baixas' && !(a.nota && a.nota <= 2)) return false;
      if (estado.nota === 'altas' && !(a.nota >= 4)) return false;
      if (estado.nota === '3' && a.nota !== 3) return false;
      if (estado.resposta === 'sem' && a.resposta) return false;
      if (estado.resposta === 'com' && !a.resposta) return false;
      if (q && !`${a.texto || ''} ${a.titulo || ''} ${a.autor}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.ts - a.ts);
  }

  // ----- Resumo: nota média · distribuição · o que pede atenção -----
  function desenharResumo() {
    // Segue os filtros do topo: período, unidade e plataforma (nota, resposta e busca valem só para a lista)
    const lista = noPeriodo().filter((a) => estado.plataforma === 'todas' || a.plataforma === estado.plataforma);
    const media = avMedia(lista);
    const comNota = lista.filter((a) => a.nota);
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, qtd: comNota.filter((a) => a.nota === n).length }));
    const maior = Math.max(1, ...dist.map((d) => d.qtd));
    const baixas = lista.filter((a) => a.nota && a.nota <= 2).length;
    const sem = lista.filter((a) => !a.resposta).length;
    const onde = `${estado.plataforma !== 'todas' ? ` no ${AV_PLAT[estado.plataforma].nome}` : ''}${estado.unidade !== 'todas' ? ` · ${esc(estado.unidade)}` : ''}`;
    $('[data-av-resumo]').innerHTML = `
      <div class="av-geral__media">
        <p class="av-rotulo">Nota média</p>
        <p class="av-geral__valor">${media ? avNum(media) : '–'}<small>de 5</small></p>
        ${media ? avEstrelasMedia(media) : ''}
        <p class="av-geral__nota">${avPlural(lista.length, 'avaliação', 'avaliações')} nos últimos ${estado.periodo} dias${onde}</p>
      </div>
      <div class="av-geral__dist">
        <p class="av-rotulo" id="av-dist-titulo">Notas</p>
        <ul class="av-dist" aria-labelledby="av-dist-titulo">${dist.map((d) => `
          <li><span class="visualmente-oculto">${d.n} ${d.n === 1 ? 'estrela' : 'estrelas'}: ${avPlural(d.qtd, 'avaliação', 'avaliações')}</span>
            <span class="av-dist__n" aria-hidden="true">${d.n}<i></i></span>
            <span class="av-dist__barra" aria-hidden="true"><i class="${d.n <= 2 ? 'baixa' : ''}" style="--w:${Math.round((d.qtd / maior) * 100)}%"></i></span>
            <span class="av-dist__qtd" aria-hidden="true">${d.qtd}</span></li>`).join('')}
        </ul>
      </div>
      <div class="av-geral__atencao">
        <p class="av-rotulo">Pede atenção</p>
        <a class="av-atencao${baixas ? ' av-atencao--alerta' : ''}" href="#" data-av-atalho="baixas"><strong>${baixas}</strong><span>${baixas === 1 ? 'nota baixa' : 'notas baixas'} (1 e 2)</span>${icone('seta')}</a>
        <a class="av-atencao" href="#" data-av-atalho="sem"><strong>${sem}</strong><span>sem resposta da casa</span>${icone('seta')}</a>
      </div>`;
  }
  $('[data-av-resumo]').addEventListener('click', (e) => {
    const l = e.target.closest('[data-av-atalho]');
    if (!l) return;
    e.preventDefault();
    if (l.dataset.avAtalho === 'baixas') estado.nota = 'baixas'; else estado.resposta = 'sem';
    preencherForm();
    mostrando = AV_POR_PAGINA;
    sincronizarEndereco();
    desenharLista();
    $('#av-lista-titulo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  // ----- Nota de cada plataforma (linha embaixo do resumo) -----
  function desenharPlataformas() {
    const todas = avTodas().filter((a) => a.ts >= Date.now() - 90 * 864e5);
    $('[data-av-plataformas]').innerHTML = D.plataformas.map((p) => {
      const ligada = avPlatConectada(p.id);
      const lista = todas.filter((a) => a.plataforma === p.id);
      const media = avMedia(lista);
      const unidades = Object.keys(av.conexoes[p.id] || {});
      const onde = unidades.length === D.unidades.length ? 'Todas as unidades' : unidades.join(', ');
      const freq = p.horas === 24 ? '1 vez por dia' : `a cada ${p.horas} horas`;
      // Aqui só se vê; conectar fica em Configurações › Integrações (cliente, 2026-11-05)
      return `<li class="av-plat${ligada ? '' : ' av-plat--off'}"${ligada ? ` title="${esc(onde)} · atualiza ${freq}"` : ''}>
        ${avSelo(p.id)}
        <div class="av-plat__texto">
          <p class="av-plat__nome">${p.nome}${ligada ? ` <strong>${media ? avNum(media) : '–'}</strong>${media ? avEstrelasMedia(media) : ''}` : ''}</p>
          <p class="av-plat__sub">${ligada ? `${avPlural(lista.length, 'avaliação', 'avaliações')} em 90 dias<span class="visualmente-oculto"> · ${esc(onde)} · atualiza ${freq}</span>` : 'Não conectada'}</p>
        </div>
      </li>`;
    }).join('');
  }

  // ----- O que dizem no Google: resumo do próprio Google por unidade conectada -----
  function desenharResumosGoogle() {
    const unidades = Object.keys(av.conexoes.google || {}).filter((u) => D.resumosGoogle?.[u]);
    $('[data-av-resumos-secao]').hidden = !unidades.length;
    $('[data-av-resumos]').innerHTML = unidades.map((u, i) => {
      const r = D.resumosGoogle[u];
      return `<article class="cartao av-resumo">
        <div class="av-resumo__topo"><h3>${esc(u)}</h3>
          <p class="av-resumo__nota"><strong>${avNum(r.nota)}</strong>${avEstrelasMedia(r.nota)}<span>${numero(r.total)} no Google</span></p></div>
        ${r.texto ? `
          <p class="av-resumo__texto" id="av-resumo-${i}">${esc(r.texto)}</p>
          <button class="av-resumo__mais" type="button" aria-expanded="false" aria-controls="av-resumo-${i}" data-av-ler>Ler tudo</button>
          <p class="av-resumo__fonte">Resumo feito com o Gemini · Google Maps · <a href="#" data-av-google>Ver no Google</a></p>`
        : '<p class="av-resumo__vazio">O Google ainda não tem um resumo das avaliações desta unidade.</p>'}
      </article>`;
    }).join('');
    $$('[data-av-ler]').forEach((b) => b.addEventListener('click', () => {
      const aberto = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(aberto));
      b.closest('.av-resumo').classList.toggle('av-resumo--aberto', aberto);
      b.textContent = aberto ? 'Mostrar menos' : 'Ler tudo';
    }));
    $$('[data-av-google]').forEach((l) => l.addEventListener('click', (e) => { e.preventDefault(); avisar('No app, abre as avaliações da unidade no Google.'); }));
  }

  // ----- Lista: cada avaliação com o texto à vista -----
  function htmlCard(a) {
    const p = AV_PLAT[a.plataforma];
    const nova = av.extras.some((x) => x.id === a.id) && a.ts > Date.now() - 864e5;
    const baixa = a.nota && a.nota <= 2;
    return `<li class="av-card${baixa ? ' av-card--baixa' : ''}">
      <div class="av-card__topo">
        ${avSelo(a.plataforma)}
        <p class="av-card__quem"><strong>${esc(a.autor)}</strong><span>${p.nome}${a.unidade ? ` · ${esc(a.unidade)}` : ''}</span></p>
        <p class="av-card__quando">${nova ? '<span class="av-novo">Nova</span>' : ''}<time datetime="${new Date(a.ts).toISOString()}">${avQuando(a.ts)}</time></p>
      </div>
      <div class="av-card__nota">${avNotaHtml(a)}${baixa && !a.resposta ? '<span class="av-tag-alerta">Sem resposta da casa</span>' : ''}</div>
      ${a.titulo ? `<p class="av-item__titulo">${esc(a.titulo)}</p>` : ''}
      ${a.texto ? `<p class="av-card__texto">${esc(a.texto)}</p>` : '<p class="av-card__sem">Só a nota, sem comentário</p>'}
      ${a.resposta ? `<div class="av-resposta"><span>Resposta da casa</span><p>${esc(a.resposta)}</p></div>` : ''}
      <button class="av-card__ver" type="button" data-av-ver="${p.nome}">Ver no ${p.nome}${icone('seta')}</button>
    </li>`;
  }

  function desenharLista() {
    const semPlat = filtrar({ ignorarPlataforma: true });
    $$('[data-av-qtd]').forEach((b) => {
      const id = b.dataset.avQtd;
      b.textContent = id === 'todas' ? semPlat.length : semPlat.filter((a) => a.plataforma === id).length;
    });
    const lista = filtrar();
    const n = lista.length;
    $('[data-av-contagem]').textContent = avPlural(n, 'avaliação', 'avaliações');
    $('[data-av-lista]').innerHTML = lista.slice(0, mostrando).map(htmlCard).join('');
    $('[data-av-vazio]').hidden = n > 0;
    $('[data-av-mais]').hidden = n <= mostrando;
    const filtrando = Object.keys(padrao).some((k) => estado[k] !== padrao[k]);
    $('[data-av-limpar]').hidden = !filtrando;
  }
  $('[data-av-lista]').addEventListener('click', (e) => {
    const ver = e.target.closest('[data-av-ver]');
    if (ver) avisar(`No app, abre esta avaliação no ${ver.dataset.avVer}.`);
  });

  function desenharTudo() { desenharCache(); desenharResumo(); desenharPlataformas(); desenharResumosGoogle(); desenharLista(); }

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
    preencherForm();
    mostrando = AV_POR_PAGINA;
    sincronizarEndereco();
    desenharResumo();
    desenharLista();
    form.q.focus();
  });
  $('[data-av-mais]').addEventListener('click', () => { mostrando += AV_POR_PAGINA; desenharLista(); });

  desenharTudo();
  // Cache vencido ao abrir a tela: atualiza na hora. Senão, agenda para quando vencer.
  if (Date.now() - av.atualizadoEm >= AV_INTERVALO) atualizar(true); else agendar();
}
