// Opiina — painel (protótipo): Ranking de unidades. Usa utilidades de painel.js ($, esc, numero, animarNumero…).
// No app atual: ~10 blocos e uma tabela de 17 colunas. Aqui: classificação, tratamento dos detratores e
// evolução mês a mês; o resto fica no detalhe de cada unidade (gaveta).

const MESES_NO_PERIODO = { 30: 1, 90: 3, 180: 6, 365: 12 };
const ORDENS = {
  nps:        { nome: 'NPS', rotulo: 'NPS', valor: (u) => u.nps, formato: String },
  respostas:  { nome: 'respostas', rotulo: 'respostas', valor: (u) => u.respostas, formato: numero },
  resolvidos: { nome: 'detratores resolvidos', rotulo: 'detratores resolvidos', valor: (u) => u.pctResolvidos, formato: (v) => `${v}%` },
  elogios:    { nome: 'elogios nos comentários', rotulo: 'elogios', valor: (u) => u.elogios, formato: (v) => `${v}%` },
};
const media = (lista) => lista.reduce((s, v) => s + v, 0) / lista.length;
const decimal = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// Números de uma unidade no período (mesma base do Dashboard: resumo × volume do período)
function numerosDaUnidade(nome, dias) {
  const r = D.resumo[nome], p = D.periodos[dias], x = D.ranking[nome];
  const respostas = Math.round(r.respostas * p.volume);
  const promotores = r.promotores + p.ajuste;
  const detratores = r.detratores - p.ajuste;
  // Variação: média dos meses do período contra os meses imediatamente anteriores (12 meses: sem comparação)
  const k = MESES_NO_PERIODO[dias], serie = D.mensal[nome].nps;
  const variacao = k < 12 ? Math.round(media(serie.slice(12 - k)) - media(serie.slice(12 - 2 * k, 12 - k))) : null;
  const qtdDetratores = Math.round((respostas * detratores) / 100);
  const resolvidos = Math.round((qtdDetratores * x.resolvidos) / 100);
  return {
    nome, respostas, promotores, detratores, passivos: 100 - promotores - detratores, nps: promotores - detratores, variacao,
    qtdDetratores, comCaso: Math.round((qtdDetratores * x.comCaso) / 100), resolvidos, noPrazo: Math.round((resolvidos * x.noPrazo) / 100),
    pctComCaso: x.comCaso, pctResolvidos: x.resolvidos, pctNoPrazo: x.noPrazo, primeiraAcao: x.primeiraAcao, encerramento: x.encerramento,
    elogios: x.elogios, reclamacoes: x.reclamacoes, neutros: 100 - x.elogios - x.reclamacoes,
    vencidas: abertas().filter((oc) => oc.unidade === nome && oc.prazo < 0).length,   // estado atual, não depende do período
  };
}

// Zonas do NPS mais usadas no Brasil
function zonaNps(v) {
  if (v >= 75) return 'excelencia';
  if (v >= 50) return 'qualidade';
  if (v >= 0) return 'aperfeicoamento';
  return 'critica';
}

if ($('[data-ranking]')) iniciarRanking();

function iniciarRanking() {
  const verOcorrencias = pode('ocorrencias');
  const form = $('[data-rk-filtros]');
  const params = new URLSearchParams(location.search);
  const estado = { periodo: 90, ordem: 'nps', medida: 'nps' };
  if (D.periodos[params.get('periodo')] && MESES_NO_PERIODO[params.get('periodo')]) estado.periodo = Number(params.get('periodo'));
  if (ORDENS[params.get('ordem')] && (params.get('ordem') !== 'resolvidos' || verOcorrencias)) estado.ordem = params.get('ordem');
  form.periodo.value = estado.periodo;
  form.ordem.value = estado.ordem;
  let unidades = [];

  // ----- Classificação: uma linha por unidade, criada uma vez. Ao reordenar, as linhas deslizam (FLIP) -----
  const lista = $('[data-rk-lista]');
  lista.innerHTML = D.unidades.map((u) => `
    <li class="rk-item" data-rk-item="${esc(u)}">
      <button class="rk-item__abrir" type="button" data-rk-abrir="${esc(u)}" aria-haspopup="dialog">
        <span class="rk-pos" data-pos></span>
        <span class="rk-item__corpo">
          <span class="rk-item__linha"><strong class="rk-item__nome">${esc(u)}</strong><span class="rk-item__meta" data-meta></span></span>
          <span class="rk-mix" aria-hidden="true"><span style="background:var(--promotor)"></span><span style="background:var(--passivo)"></span><span style="background:var(--detrator)"></span></span>
          <span class="rk-item__mix" data-mix></span>
        </span>
        <span class="rk-valor"><strong data-valor></strong><span class="rk-valor__rotulo" data-rotulo></span><span class="rk-valor__var" data-var></span></span>
      </button>
    </li>`).join('');

  let ordemAnterior = null;
  function desenharClassificacao() {
    const ordem = ORDENS[estado.ordem];
    const ordenadas = [...unidades].sort((a, b) => ordem.valor(b) - ordem.valor(a) || b.nps - a.nps);
    $('[data-rk-sub]').textContent = `Por ${ordem.nome}, do maior para o menor. Clique numa unidade para ver o detalhe.`;
    const antes = new Map($$('li', lista).map((li) => [li, li.getBoundingClientRect().top]));
    const abrindo = ordemAnterior === null;   // na abertura não há "antes" para deslizar
    const trocouMedida = !abrindo && ordemAnterior !== estado.ordem;

    ordenadas.forEach((u, i) => {
      const li = $(`[data-rk-item="${CSS.escape(u.nome)}"]`, lista);
      lista.append(li);
      li.dataset.posicao = i + 1;
      $('[data-pos]', li).innerHTML = `${i + 1}º<span class="visualmente-oculto"> lugar:</span>`;
      const meta = [
        estado.ordem !== 'nps' && `NPS ${u.nps}`,
        estado.ordem !== 'respostas' && `${numero(u.respostas)} respostas`,
        estado.ordem !== 'elogios' && `${u.elogios}% elogios`,
      ].filter(Boolean);
      $('[data-meta]', li).textContent = meta.join(' · ');
      $('[data-mix]', li).textContent = `${u.promotores}% promotores · ${u.passivos}% passivos · ${u.detratores}% detratores`;
      $$('.rk-mix span', li).forEach((s, j) => {
        const alvo = `${[u.promotores, u.passivos, u.detratores][j]}%`;
        animarLargura(s, s.style.width || '0%', alvo, abrindo ? 150 + i * 90 : 0);
      });
      const valor = $('[data-valor]', li);
      if (trocouMedida) delete valor.dataset.valor;   // outra medida: não conta a partir do número antigo
      animarNumero(valor, ordem.valor(u), { formato: ordem.formato });
      $('[data-rotulo]', li).textContent = ordem.rotulo;
      const variacao = $('[data-var]', li);
      variacao.hidden = estado.ordem !== 'nps' || u.variacao === null;
      if (u.variacao !== null) {
        variacao.className = `rk-valor__var ${u.variacao > 0 ? 'sobe' : u.variacao < 0 ? 'desce' : ''}`;
        variacao.innerHTML = u.variacao === 0 ? 'estável' : `${u.variacao > 0 ? '▲ +' : '▼ '}${u.variacao}<span class="visualmente-oculto"> em relação ao período anterior</span>`;
      }
    });
    ordemAnterior = estado.ordem;

    if (abrindo || semMovimento()) return;
    antes.forEach((topo, li) => {
      const desloca = topo - li.getBoundingClientRect().top;
      if (Math.abs(desloca) < 1) return;
      li.animate([{ transform: `translateY(${desloca}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    });
  }

  // ----- Ranking de atendentes: pela resposta a "Quem te atendeu?" -----
  // Com poucas avaliações o NPS oscila demais: quem tem menos de MINIMO fica fora da classificação (e é citado embaixo)
  const MINIMO = 20;
  const listaAt = $('[data-rk-atendentes]');
  const selAt = $('[data-rk-at-unidade]');
  D.unidades.forEach((u) => selAt.add(new Option(u, u)));
  if (D.unidades.includes(params.get('atendentes'))) selAt.value = params.get('atendentes');
  selAt.addEventListener('change', () => { desenharAtendentes(); atualizarEndereco(); });

  function desenharAtendentes() {
    const p = D.periodos[estado.periodo];
    const todos = Object.entries(D.atendentesRanking)
      .filter(([, a]) => selAt.value === 'todas' || a.unidade === selAt.value)
      .map(([nome, a]) => {
        const promotores = Math.min(100, a.promotores + p.ajuste);
        const detratores = Math.max(0, a.detratores - p.ajuste);
        return { nome, unidade: a.unidade, avaliacoes: a.novo ? a.avaliacoes : Math.round(a.avaliacoes * p.volume), promotores, detratores,
          passivos: 100 - promotores - detratores, nps: promotores - detratores, elogios: a.elogios };
      });
    const classificados = todos.filter((a) => a.avaliacoes >= MINIMO).sort((a, b) => b.nps - a.nps || b.avaliacoes - a.avaliacoes);
    const poucas = todos.filter((a) => a.avaliacoes < MINIMO);
    $('[data-rk-at-sub]').textContent = `Pelas respostas a "Quem te atendeu?" na pesquisa. Por NPS, do maior para o menor · ${p.rotulo}.`;
    listaAt.innerHTML = classificados.length ? classificados.map((a, i) => `
      <li class="rk-item" data-posicao="${i + 1}">
        <div class="rk-item__abrir rk-item__abrir--fixo">
          <span class="rk-pos">${i + 1}º<span class="visualmente-oculto"> lugar:</span></span>
          <span class="rk-item__corpo">
            <span class="rk-item__linha"><strong class="rk-item__nome">${esc(a.nome)}</strong><span class="rk-item__meta">${esc(a.unidade)} · ${numero(a.avaliacoes)} avaliações · ${a.elogios}% elogios</span></span>
            <span class="rk-mix" aria-hidden="true"><span style="width:${a.promotores}%;background:var(--promotor)"></span><span style="width:${a.passivos}%;background:var(--passivo)"></span><span style="width:${a.detratores}%;background:var(--detrator)"></span></span>
            <span class="rk-item__mix">${a.promotores}% promotores · ${a.passivos}% passivos · ${a.detratores}% detratores</span>
          </span>
          <span class="rk-valor"><strong>${a.nps}</strong><span class="rk-valor__rotulo">NPS</span></span>
        </div>
      </li>`).join('') : '<li class="vazio"><strong>Sem atendentes com avaliações suficientes</strong>Escolha um período maior ou outra unidade.</li>';
    const nota = $('[data-rk-poucas]');
    nota.hidden = !poucas.length;
    nota.textContent = `Com menos de ${MINIMO} avaliações no período, fica${poucas.length > 1 ? 'm' : ''} fora da classificação: ${poucas.map((a) => `${a.nome} (${a.avaliacoes})`).join(', ')}.`;
  }

  // ----- Tratamento dos detratores (só para quem vê Ocorrências) -----
  function desenharTratamento() {
    const funil = $('[data-rk-funil]');
    if (!funil) return;
    const soma = (campo) => unidades.reduce((s, u) => s + u[campo], 0);
    const det = soma('qtdDetratores'), comCaso = soma('comCaso'), resolvidos = soma('resolvidos'), noPrazo = soma('noPrazo');
    const ponderada = (campo) => unidades.reduce((s, u) => s + u[campo] * u.qtdDetratores, 0) / det;
    const pct = (n, de) => Math.round((n / de) * 100);
    const passos = [
      { nome: 'Detratores', n: det, pct: 100 },
      { nome: 'Viraram ocorrência', n: comCaso, pct: pct(comCaso, det) },
      { nome: 'Resolvidos', n: resolvidos, pct: pct(resolvidos, det) },
    ];
    const vencidas = soma('vencidas');
    funil.innerHTML = `
      <ol class="rk-funil__passos">${passos.map((p) => `
        <li><span class="rk-funil__nome">${p.nome}</span>
          <span class="rk-funil__trilho" aria-hidden="true"><span class="rk-funil__barra" style="width:${p.pct}%"></span></span>
          <span class="rk-funil__num"><strong>${numero(p.n)}</strong>${p.pct < 100 ? ` <span>(${p.pct}%)</span>` : ''}</span></li>`).join('')}
      </ol>
      <p class="rk-funil__alerta">${icone('alerta')}<span><strong>${numero(det - comCaso)} detratores sem tratamento</strong>: deram nota baixa e não viraram ocorrência.</span></p>
      <dl class="rk-tempos">
        <div><dt>1ª ação</dt><dd>${Math.round(ponderada('primeiraAcao'))} h <span>em média</span></dd></div>
        <div><dt>Encerramento</dt><dd>${decimal(ponderada('encerramento'))} dias <span>em média</span></dd></div>
        <div><dt>Resolvidos no prazo</dt><dd>${pct(noPrazo, resolvidos)}%</dd></div>
        <div><dt>Vencidas agora</dt><dd class="${vencidas ? 'rk-ruim' : ''}">${vencidas}</dd></div>
      </dl>`;

    const ruim = (v) => (v < 65 ? ' class="rk-ruim"' : '');
    $('[data-rk-tratamento]').innerHTML = [...unidades].sort((a, b) => b.pctResolvidos - a.pctResolvidos).map((u) => `
      <tr>
        <th scope="row">${esc(u.nome)}</th>
        <td class="num">${numero(u.qtdDetratores)}</td>
        <td class="num">${u.pctComCaso}%</td>
        <td class="num"><span${ruim(u.pctResolvidos)}>${u.pctResolvidos}%</span></td>
        <td class="num"><span${ruim(u.pctNoPrazo)}>${u.pctNoPrazo}%</span></td>
        <td class="num">${u.primeiraAcao} h</td>
        <td class="num">${u.vencidas
          ? `<a class="prazo prazo--vencido" href="feedbacks.html?acao=vencidas&unidade=${encodeURIComponent(u.nome)}">${u.vencidas}<span class="visualmente-oculto"> vencidas em ${esc(u.nome)}: ver</span></a>`
          : '0'}</td>
      </tr>`).join('');
  }

  // ----- Evolução mês a mês: mapa de cores (tabela de verdade, lida pelo leitor de tela) -----
  function nomeMes(atras) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - atras);
    return `${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${String(d.getFullYear()).slice(2)}`;
  }

  function desenharEvolucao() {
    const n = estado.periodo === 365 ? 12 : 6;
    const nps = estado.medida === 'nps';
    $('[data-rk-evolucao-sub]').textContent = `${n === 12 ? 'Últimos 12 meses' : 'Últimos 6 meses'}. O mês atual (*) vai até hoje.`;
    $('[data-rk-zonas]').hidden = !nps;
    $$('[data-rk-medida]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rkMedida === estado.medida)));
    const maior = Math.max(...D.unidades.flatMap((u) => D.mensal[u].respostas.slice(12 - n)));
    const meses = Array.from({ length: n }, (_, i) => n - 1 - i);
    $('[data-rk-mapa]').innerHTML = `
      <caption class="visualmente-oculto">${nps ? 'NPS' : 'Respostas'} por mês e unidade</caption>
      <thead><tr><th scope="col">Unidade</th>${meses.map((m) => `<th scope="col" class="num">${nomeMes(m)}${m === 0 ? '<span aria-hidden="true">*</span><span class="visualmente-oculto"> (até hoje)</span>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${D.unidades.map((u) => `<tr><th scope="row">${esc(u)}</th>${meses.map((m) => {
        const i = 11 - m;
        if (nps) {
          const v = D.mensal[u].nps[i];
          return `<td class="num"><span class="rk-cel rk-cel--${zonaNps(v)}">${v}</span></td>`;
        }
        const v = D.mensal[u].respostas[i];
        return `<td class="num"><span class="rk-cel" style="--forca:${Math.round((v / maior) * 32)}%">${numero(v)}</span></td>`;
      }).join('')}</tr>`).join('')}</tbody>`;
  }

  function desenhar() {
    unidades = D.unidades.map((u) => numerosDaUnidade(u, estado.periodo));
    desenharClassificacao();
    desenharAtendentes();
    desenharTratamento();
    desenharEvolucao();
    atualizarEndereco();
  }
  function atualizarEndereco() {
    const p = new URLSearchParams();
    if (estado.periodo !== 90) p.set('periodo', estado.periodo);
    if (estado.ordem !== 'nps') p.set('ordem', estado.ordem);
    if (selAt.value !== 'todas') p.set('atendentes', selAt.value);
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'periodo') estado.periodo = Number(e.target.value);
    if (e.target.name === 'ordem') estado.ordem = e.target.value;
    desenhar();
  });
  $$('[data-rk-medida]').forEach((b) => b.addEventListener('click', () => { estado.medida = b.dataset.rkMedida; desenharEvolucao(); }));

  // ----- Detalhe da unidade (gaveta) -----
  const gaveta = $('[data-rk-gaveta]');
  let aberta = null;

  function htmlSerie(nome) {
    const serie = D.mensal[nome].nps;
    const L = 480, A = 150, esq = 30, dir = 12, topo = 20, base = 26;
    const min = Math.floor((Math.min(...serie) - 5) / 10) * 10, max = Math.ceil((Math.max(...serie) + 5) / 10) * 10;
    const x = (i) => esq + (i * (L - esq - dir)) / (serie.length - 1);
    const y = (v) => topo + ((max - v) * (A - topo - base)) / (max - min);
    let svg = '';
    for (let v = min; v <= max; v += 10) {
      svg += `<line class="grafico__grade" x1="${esq}" x2="${L - dir}" y1="${y(v)}" y2="${y(v)}"/><text class="grafico__eixo" x="${esq - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    svg += `<text class="grafico__eixo" x="${x(0)}" y="${A - 4}">${nomeMes(11)}</text><text class="grafico__eixo" x="${x(11)}" y="${A - 4}" text-anchor="end">${nomeMes(0)}</text>`;
    svg += `<polyline class="grafico__linha" points="${serie.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`;
    svg += serie.map((v, i) => `<circle class="grafico__ponto${i === 11 ? ' grafico__ponto--fim' : ''}" cx="${x(i)}" cy="${y(v)}" r="${i === 11 ? 4.5 : 3}"/>`).join('');
    svg += `<text class="grafico__valor" x="${x(11)}" y="${y(serie[11]) - 10}" text-anchor="end">NPS ${serie[11]}</text>`;
    return `<svg class="grafico" viewBox="0 0 ${L} ${A}" role="img" aria-label="NPS por mês nos últimos 12 meses: ${serie.join(', ')}.">${svg}</svg>`;
  }

  function abrir(nome) {
    const u = unidades.find((x) => x.nome === nome);
    if (!u) return;
    aberta = nome;
    const li = $(`[data-rk-item="${CSS.escape(nome)}"]`, lista);
    $('[data-ru="posicao"]', gaveta).textContent = `${li.dataset.posicao}º de ${unidades.length} em ${ORDENS[estado.ordem].nome}`;
    $('[data-ru="nome"]', gaveta).textContent = nome;
    $('[data-ru="periodo"]', gaveta).textContent = D.periodos[estado.periodo].rotulo;
    const temas = D.temas
      .map((t) => ({ nome: t.nome, total: Math.round(t.unidades[nome] * D.periodos[estado.periodo].volume) }))
      .sort((a, b) => b.total - a.total).slice(0, 3);
    $('[data-ru="conteudo"]', gaveta).innerHTML = `
      <div class="rk-detalhe__numeros">
        <div><span>NPS</span><strong>${u.nps}</strong>${u.variacao !== null ? `<small class="${u.variacao > 0 ? 'sobe' : u.variacao < 0 ? 'desce' : ''}">${u.variacao === 0 ? 'estável' : `${u.variacao > 0 ? '▲ +' : '▼ '}${u.variacao}`}</small>` : ''}</div>
        <div><span>Respostas</span><strong>${numero(u.respostas)}</strong></div>
        <div><span>Elogios</span><strong>${u.elogios}%</strong><small>${u.reclamacoes}% reclamações · ${u.neutros}% neutros</small></div>
      </div>
      <section class="rk-detalhe__bloco" aria-labelledby="ru-mix">
        <h3 id="ru-mix">Como os clientes avaliam</h3>
        <div class="barra-nps" aria-hidden="true"><span style="width:${u.promotores}%;background:var(--promotor)"></span><span style="width:${u.passivos}%;background:var(--passivo)"></span><span style="width:${u.detratores}%;background:var(--detrator)"></span></div>
        <p class="cartao__sub">${u.promotores}% promotores · ${u.passivos}% passivos · ${u.detratores}% detratores</p>
      </section>
      <section class="rk-detalhe__bloco" aria-labelledby="ru-serie">
        <h3 id="ru-serie">NPS nos últimos 12 meses</h3>
        ${htmlSerie(nome)}
      </section>
      <section class="rk-detalhe__bloco" aria-labelledby="ru-temas">
        <h3 id="ru-temas">Temas mais citados <span class="selo-ia">${icone('ia')}IA</span></h3>
        <ol class="rk-temas">${temas.map((t) => `<li><span>${esc(t.nome)}</span><strong>${numero(t.total)}<span class="visualmente-oculto"> menções</span></strong></li>`).join('')}</ol>
      </section>
      ${verOcorrencias ? `
      <section class="rk-detalhe__bloco" aria-labelledby="ru-trat">
        <h3 id="ru-trat">Tratamento dos detratores</h3>
        <dl class="dados">
          <div><dt>Detratores</dt><dd>${numero(u.qtdDetratores)}</dd></div>
          <div><dt>Viraram ocorrência</dt><dd>${u.pctComCaso}%</dd></div>
          <div><dt>Resolvidos</dt><dd>${u.pctResolvidos}%</dd></div>
          <div><dt>No prazo</dt><dd>${u.pctNoPrazo}%</dd></div>
          <div><dt>1ª ação</dt><dd>${u.primeiraAcao} h em média</dd></div>
          <div><dt>Encerramento</dt><dd>${decimal(u.encerramento)} dias em média</dd></div>
        </dl>
        <a class="btn btn--secundario" href="feedbacks.html?acao=abertas&unidade=${encodeURIComponent(nome)}">Ver o que precisa de ação em ${esc(nome)}${u.vencidas ? ` <span class="nav__selo">${u.vencidas} vencida${u.vencidas > 1 ? 's' : ''}</span>` : ''}</a>
      </section>` : ''}`;
    gaveta.showModal();
    $('[data-ru="nome"]', gaveta).focus();
  }

  lista.addEventListener('click', (e) => {
    const gatilho = e.target.closest('[data-rk-abrir]');
    if (gatilho) abrir(gatilho.dataset.rkAbrir);
  });
  $('[data-ru-fechar]', gaveta).addEventListener('click', () => gaveta.close());
  gaveta.addEventListener('click', (e) => { if (e.target === gaveta) gaveta.close(); });
  gaveta.addEventListener('close', () => { if (aberta) $(`[data-rk-abrir="${CSS.escape(aberta)}"]`, lista)?.focus(); });

  desenhar();
}
