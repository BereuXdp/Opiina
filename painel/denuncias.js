// Opiina — painel (protótipo): Denúncias. Usa utilidades de painel.js ($, esc, quando, avisar…).
// 2026-11-27 (cliente: "faça um dashboard dele também, com mais funções; é o carro-chefe do Opiina"):
// Visão geral (indicadores) e Lista; prazo por prioridade; exportar relatório sem nomes nem relatos;
// desfecho obrigatório ao encerrar; conversa com quem denunciou pelo protocolo (também anônima).

// v2: a lista de exemplo cresceu (24 casos com datas, desfecho e mensagens); a chave nova evita a lista antiga da aba
const CHAVE_DEN = 'opiina-demo-denuncias-v2';
const SITUACOES_ABERTAS = ['Recebida', 'Em análise', 'Em investigação', 'Aguardando informações'];
const SITUACOES_ENCERRADAS = ['Concluída', 'Arquivada'];
const PESO_PRIORIDADE = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };

function historicoInicial(d) {
  const h = [{ dias: d.criada, texto: `Recebida pelo canal (${d.identificacao ? 'identificada' : 'anônima'})` }];
  if (d.situacao !== 'Recebida') h.push({ dias: d.primeiraAnalise ?? Math.min(0, d.criada + 1), texto: 'Análise iniciada' });
  (d.mensagens || []).forEach((m) => h.push({ dias: m.dias, texto: m.de === 'equipe' ? 'Mensagem enviada a quem denunciou' : 'Quem denunciou respondeu pelo protocolo' }));
  if (SITUACOES_ENCERRADAS.includes(d.situacao)) h.push({ dias: d.concluida ?? 0, texto: `${d.situacao}${d.desfecho ? `: ${d.desfecho}` : ''}` });
  else if (!['Recebida', 'Em análise'].includes(d.situacao)) h.push({ dias: Math.min(0, (d.primeiraAnalise ?? d.criada) + 1), texto: `Situação alterada para "${d.situacao}"` });
  return h.sort((a, b) => a.dias - b.dias);
}

const den = {
  lista: (() => {
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE_DEN));
      if (Array.isArray(salvo) && salvo.length) return salvo;
    } catch { /* sem armazenamento: usa os dados iniciais */ }
    return D.denuncias.map((d) => ({ mensagens: [], ...d, historico: historicoInicial(d) }));
  })(),
  salvar() { try { sessionStorage.setItem(CHAVE_DEN, JSON.stringify(this.lista)); } catch { /* ignora */ } },
};
const aberta = (d) => SITUACOES_ABERTAS.includes(d.situacao);
const htmlSituacao = (s) => `<span class="etapa den-sit--${slug(s)}">${s}</span>`;
const htmlPrioridade = (p) => `<span class="den-prio den-prio--${slug(p)}"><span class="visualmente-oculto">Prioridade </span>${p}</span>`;
const htmlIdent = (d) => d.identificacao
  ? `<span class="den-ident">${icone('pessoa')}Identificada</span>`
  : `<span class="den-ident den-ident--anonima">${icone('cadeado')}Anônima</span>`;

// Prazo para concluir, contado do recebimento (dias por prioridade em dados.js; proposta do protótipo)
function prazoDen(d) {
  if (!aberta(d)) return { texto: d.concluida != null ? `Encerrada ${quando(d.concluida)}` : 'Encerrada', classe: '', atrasada: false, restante: Infinity };
  const restante = d.criada + (D.denunciaPrazos[d.prioridade] || 30);
  if (restante < 0) return { texto: `Atrasada há ${-restante} ${-restante === 1 ? 'dia' : 'dias'}`, classe: 'prazo--vencido', atrasada: true, restante };
  if (restante === 0) return { texto: 'Vence hoje', classe: 'prazo--hoje', atrasada: false, restante };
  return { texto: `Vence em ${restante} ${restante === 1 ? 'dia' : 'dias'}`, classe: restante <= 2 ? 'prazo--hoje' : '', atrasada: false, restante };
}
const htmlPrazo = (d) => { const p = prazoDen(d); return `<span class="prazo ${p.classe}">${aberta(d) ? icone('relogio') : ''}${p.texto}</span>`; };
const media = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const textoDias = (n) => (n == null ? '—' : n < 0.5 ? 'No mesmo dia' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${n === 1 ? 'dia' : 'dias'}`);

if ($('[data-denuncias]')) iniciarDenuncias();

function iniciarDenuncias() {
  const form = $('[data-den-filtros]');
  const padrao = { q: '', situacao: 'abertas', prioridade: 'todas', categoria: 'todas', unidade: 'todas', ident: 'todas' };
  const params = new URLSearchParams(location.search);
  const estado = { ...padrao };
  Object.keys(padrao).forEach((k) => { if (params.get(k)) estado[k] = params.get(k); });

  // ----- Abas: Visão geral (padrão) e Lista. Filtro ou "abrir" no endereço levam direto à Lista -----
  const aba = params.get('aba') === 'lista' || params.get('abrir') || Object.keys(padrao).some((k) => params.get(k)) ? 'lista' : 'visao';
  $$('[data-den-aba]').forEach((el) => { el.hidden = el.dataset.denAba !== aba; });
  $$('[data-den-so]').forEach((el) => { el.hidden = el.dataset.denSo !== aba; });
  $$('[data-den-aba-link]').forEach((a) => { if (a.dataset.denAbaLink === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });

  D.denunciaSituacoes.forEach((s) => form.situacao.add(new Option(s, s)));
  [...D.denunciaPrioridades].reverse().forEach((p) => form.prioridade.add(new Option(p, p)));
  D.denunciaCategorias.forEach((c) => form.categoria.add(new Option(c, c)));
  D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
  Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });

  // =====================================================================
  // Visão geral
  // =====================================================================
  const seletorPeriodo = $('[data-den-periodo]');
  if (['90', '180', '365'].includes(params.get('periodo'))) seletorPeriodo.value = params.get('periodo');

  function desenharVisao() {
    const dias = Number(seletorPeriodo.value);
    const noPeriodo = den.lista.filter((d) => d.criada >= -dias);
    const abertas = den.lista.filter(aberta);
    const novas = abertas.filter((d) => d.situacao === 'Recebida').length;
    const graves = abertas.filter((d) => d.prioridade === 'Alta' || d.prioridade === 'Crítica').length;
    const atrasadas = abertas.filter((d) => prazoDen(d).atrasada).length;
    const concluidas = noPeriodo.filter((d) => d.situacao === 'Concluída' && d.concluida != null);
    const tConcluir = media(concluidas.map((d) => d.concluida - d.criada));
    const anonimas = noPeriodo.filter((d) => !d.identificacao).length;
    const pctAnon = noPeriodo.length ? Math.round((anonimas / noPeriodo.length) * 100) : 0;

    // Estrutura da referência do cliente (2026-11-27): 4 números (o primeiro em destaque) + gráfico do mês
    const kpi = (rotulo, valor, nota, mod = '') => `<article class="kpi den-kpi${mod}"><p class="kpi__rotulo">${rotulo}</p><p class="kpi__valor">${valor}</p><p class="kpi__nota">${nota}</p></article>`;
    $('[data-den-kpis]').innerHTML = [
      kpi('Em aberto', abertas.length, 'Casos ainda não encerrados', ' den-kpi--destaque'),
      kpi('Graves em aberto', graves, 'Prioridade alta ou crítica', graves ? ' den-kpi--alerta' : ''),
      kpi('Atrasadas', atrasadas, atrasadas ? 'Passaram do prazo' : 'Todas dentro do prazo', atrasadas ? ' den-kpi--alerta' : ''),
      kpi('Tempo para concluir', `<span class="den-kpi-tempo">${textoDias(tConcluir)}</span>`, 'Média dos casos concluídos'),
    ].join('');

    // Dois destaques em frase, cada um leva à lista filtrada
    const aguardando = abertas.filter((d) => d.situacao === 'Aguardando informações').length;
    const destaque = (chave, n, unidade, frase) => {
      const el = $(`[data-den-destaque="${chave}"]`);
      el.innerHTML = `<span class="den-destaque__icone" aria-hidden="true">${icone(chave === 'novas' ? 'alerta' : 'pessoa')}</span>
        <span class="den-destaque__num"><strong>${n}</strong> ${unidade}</span>
        <span class="den-destaque__frase">${frase}</span>
        <span class="den-destaque__seta" aria-hidden="true">${icone('seta')}</span>`;
    };
    destaque('novas', novas, novas === 1 ? 'nova' : 'novas', novas ? `${novas === 1 ? 'Denúncia ainda espera' : 'Denúncias ainda esperam'} a primeira análise.` : 'Nenhuma denúncia esperando a primeira análise.');
    destaque('aguardando', aguardando, aguardando === 1 ? 'aguardando' : 'aguardando', aguardando ? `${aguardando === 1 ? 'Caso espera' : 'Casos esperam'} resposta de quem denunciou.` : 'Nenhum caso esperando resposta de quem denunciou.');

    // Precisa de atenção: atrasadas, depois as mais graves, depois o prazo mais curto
    const atencao = [...abertas].sort((a, b) => prazoDen(b).atrasada - prazoDen(a).atrasada
      || PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] || prazoDen(a).restante - prazoDen(b).restante).slice(0, 5);
    $('[data-den-atencao]').innerHTML = atencao.map((d) => `<li>
      <a class="den-atencao__item" href="denuncias.html?aba=lista&amp;abrir=${encodeURIComponent(d.id)}">
        ${htmlPrioridade(d.prioridade)}
        <span class="den-atencao__texto">${esc(d.resumo)}<span>${esc(d.id)} · ${esc(d.unidade || 'Unidade não informada')} · ${esc(d.categoria)}</span></span>
        ${htmlPrazo(d)}
      </a></li>`).join('');
    $('[data-den-atencao-vazio]').hidden = atencao.length > 0;

    $('[data-den-periodo-texto]').textContent = `${noPeriodo.length} no período · ${pctAnon}% anônimas`;

    // Por mês: uma coluna por mês, uma cor só, com linhas de grade
    const meses = Math.round(dias / 30);
    const hoje = new Date();
    const cols = Array.from({ length: meses }, (_, i) => {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1 - i), 1);
      const total = noPeriodo.filter((d) => { const dt = diaRelativo(d.criada); return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth(); }).length;
      return { ref, total };
    });
    const maiorMes = Math.max(1, ...cols.map((c) => c.total));
    $('[data-den-meses]').innerHTML = cols.map((c) => {
      const nome = c.ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const nomeLongo = c.ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return `<div class="den-coluna" role="img" aria-label="${nomeLongo}: ${c.total} ${c.total === 1 ? 'denúncia' : 'denúncias'}">
        <span class="den-coluna__area"><span class="den-coluna__pilha" style="height:${(c.total / maiorMes) * 100}%"><span class="den-coluna__total">${c.total}</span></span></span>
        <span class="den-coluna__mes">${nome}</span>
      </div>`;
    }).join('');

    // Por categoria: rosca com as 4 que mais aparecem + "Outras"
    const CORES = ['#2563EB', '#7038F8', '#0EA5A4', '#F59E0B', '#94A3B8'];
    const ordenadas = D.denunciaCategorias.map((c) => [c, noPeriodo.filter((d) => d.categoria === c).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
    const fatias = ordenadas.slice(0, 4);
    const resto = ordenadas.slice(4).reduce((s, [, n]) => s + n, 0);
    if (resto) fatias.push(['Outras', resto]);
    const total = noPeriodo.length || 1;
    let acum = 0;
    $('[data-den-rosca]').style.background = fatias.length
      ? `conic-gradient(${fatias.map(([, n], i) => { const de = acum; acum += (n / total) * 100; return `${CORES[i]} ${de}% ${acum}%`; }).join(', ')})`
      : 'var(--bg-suave)';
    $('[data-den-categorias]').innerHTML = fatias.length
      ? fatias.map(([nome, n], i) => `<li><span class="den-rosca-legenda__cor" style="background:${CORES[i]}"></span><span class="den-rosca-legenda__nome">${esc(nome)}</span><span class="den-rosca-legenda__n">${n} · ${Math.round((n / total) * 100)}%</span></li>`).join('')
      : '<li class="den-sem">Nenhuma denúncia no período.</li>';

    if (aba === 'visao') {
      const p = new URLSearchParams();
      if (seletorPeriodo.value !== '180') p.set('periodo', seletorPeriodo.value);
      history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
    }
  }
  seletorPeriodo.addEventListener('change', desenharVisao);

  // =====================================================================
  // Lista
  // =====================================================================
  function filtrar() {
    const q = estado.q.trim().toLowerCase();
    return den.lista.filter((d) => {
      if (estado.situacao === 'abertas' && !aberta(d)) return false;
      if (!['abertas', 'todas'].includes(estado.situacao) && d.situacao !== estado.situacao) return false;
      if (estado.prioridade !== 'todas' && d.prioridade !== estado.prioridade) return false;
      if (estado.categoria !== 'todas' && d.categoria !== estado.categoria) return false;
      if (estado.unidade !== 'todas' && d.unidade !== estado.unidade) return false;
      if (estado.ident === 'anonima' && d.identificacao) return false;
      if (estado.ident === 'identificada' && !d.identificacao) return false;
      if (q && !`${d.id} ${d.resumo} ${d.relato} ${d.categoria}`.toLowerCase().includes(q)) return false;
      return true;
    // Em aberto primeiro; atrasadas; a mais grave; a mais recente
    }).sort((a, b) => aberta(b) - aberta(a) || prazoDen(b).atrasada - prazoDen(a).atrasada
      || PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] || b.criada - a.criada);
  }

  function htmlLinha(d) {
    const msgs = (d.mensagens || []).length;
    return `<tr>
      <td data-col="nota">${htmlPrioridade(d.prioridade)}</td>
      <td data-col="comentario"><button class="oc-abrir" type="button" data-den-abrir="${d.id}" aria-haspopup="dialog">
        <span class="oc-abrir__texto">${esc(d.resumo)}</span>
        <span class="oc-abrir__meta">${d.id} · ${esc(d.categoria)} · ${quando(d.criada)}${msgs ? ` · ${msgs} ${msgs === 1 ? 'mensagem' : 'mensagens'}` : ''}</span></button></td>
      <td data-col="unidade">${esc(d.unidade || 'Não informada')}</td>
      <td data-col="etapa">${htmlSituacao(d.situacao)}</td>
      <td data-col="prazo">${htmlPrazo(d)}</td>
      <td data-col="responsavel">${htmlIdent(d)}</td>
    </tr>`;
  }

  function desenharSituacoes() {
    const cartoes = [['abertas', 'Em aberto'], ...SITUACOES_ABERTAS.map((s) => [s, s])];
    $('[data-den-situacoes]').innerHTML = cartoes.map(([valor, nome]) => {
      const n = valor === 'abertas' ? den.lista.filter(aberta).length : den.lista.filter((d) => d.situacao === valor).length;
      return `<button type="button" class="den-situacao den-situacao--${slug(nome)}" data-den-sit="${esc(valor)}" aria-pressed="${estado.situacao === valor}">
        <span class="den-situacao__nome">${nome}</span><span class="den-situacao__n">${n}</span></button>`;
    }).join('');
  }

  function desenharLista() {
    desenharSituacoes();
    const itens = filtrar();
    $('[data-den-lista]').innerHTML = itens.map(htmlLinha).join('');
    $('[data-den-vazio]').hidden = itens.length > 0;
    $('.den-tabela').hidden = itens.length === 0;
    $('[data-den-contagem]').innerHTML = `<strong>${itens.length}</strong> ${itens.length === 1 ? 'denúncia' : 'denúncias'}`;
    $('[data-den-exportar]').disabled = itens.length === 0;
    if (aba === 'lista') {
      // Filtros no endereço (dá para voltar ao mesmo recorte)
      const p = new URLSearchParams({ aba: 'lista' });
      Object.keys(padrao).forEach((k) => { if (estado[k] !== padrao[k]) p.set(k, estado[k]); });
      history.replaceState(null, '', `?${p}`);
    }
  }

  const desenharTudo = () => { desenharVisao(); desenharLista(); };

  form.addEventListener('input', (e) => {
    if (!e.target.name) return;
    estado[e.target.name] = e.target.value;
    desenharLista();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('[data-den-situacoes]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-den-sit]');
    if (!b) return;
    estado.situacao = form.situacao.value = b.dataset.denSit;
    desenharLista();
  });
  $('[data-den-limpar]').addEventListener('click', () => {
    Object.assign(estado, padrao);
    Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
    desenharLista();
    form.q.focus();
  });

  // ----- Exportar relatório (CSV para Excel/Planilhas): sem nomes, contatos nem relatos -----
  $('[data-den-exportar]').addEventListener('click', () => {
    const itens = filtrar();
    const dataLonga = (dias) => diaRelativo(dias).toLocaleDateString('pt-BR');
    const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      ['Protocolo', 'Recebida em', 'Categoria', 'Unidade', 'Prioridade', 'Situação', 'Prazo', 'Identificação', 'Desfecho', 'Encerrada em'],
      ...itens.map((d) => [d.id, dataLonga(d.criada), d.categoria, d.unidade || 'Não informada', d.prioridade, d.situacao,
        aberta(d) ? prazoDen(d).texto : '', d.identificacao ? 'Identificada' : 'Anônima', d.desfecho || '', d.concluida != null ? dataLonga(d.concluida) : '']),
    ];
    const csv = `﻿${linhas.map((l) => l.map(celula).join(';')).join('\r\n')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `denuncias-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    avisar(`Relatório com ${itens.length} ${itens.length === 1 ? 'denúncia' : 'denúncias'} baixado (sem nomes nem relatos)`);
  });

  // =====================================================================
  // Gaveta de detalhe
  // =====================================================================
  const gaveta = $('[data-den-gaveta]');
  const gForm = $('[data-dg-form]', gaveta);
  const msgForm = $('[data-dg-msg-form]', gaveta);
  const campo = (nome) => $(`[data-dg="${nome}"]`, gaveta);
  D.denunciaSituacoes.forEach((s) => gForm.situacao.add(new Option(s, s)));
  [...D.denunciaPrioridades].reverse().forEach((p) => gForm.prioridade.add(new Option(p, p)));
  D.denunciaDesfechos.forEach((x) => gForm.desfecho.add(new Option(x, x)));
  const blocoEncerrar = $('[data-dg-encerrar]', gaveta);
  const erroDesfecho = $('#dg-desfecho-erro');
  const mostrarEncerrar = () => { blocoEncerrar.hidden = !SITUACOES_ENCERRADAS.includes(gForm.situacao.value); };
  gForm.situacao.addEventListener('change', mostrarEncerrar);
  gForm.desfecho.addEventListener('change', () => { erroDesfecho.hidden = true; gForm.desfecho.removeAttribute('aria-invalid'); });
  let atual = null;

  function preencher(d) {
    campo('id').textContent = d.id;
    campo('prioridade').innerHTML = htmlPrioridade(d.prioridade);
    campo('situacao').innerHTML = htmlSituacao(d.situacao);
    campo('resumo').textContent = d.resumo;
    campo('relato').textContent = d.relato;
    campo('categoria').textContent = d.categoria;
    campo('unidade').textContent = d.unidade || 'Não informada';
    campo('recebida').textContent = `${dataCurta(diaRelativo(d.criada))} (${quando(d.criada)})`;
    campo('prazo').innerHTML = htmlPrazo(d);
    campo('identificacao').innerHTML = d.identificacao
      ? `${esc(d.identificacao.nome)}<span class="den-contato">${esc(d.identificacao.contato)}</span>`
      : 'Anônima';
    campo('aviso-anonima').hidden = Boolean(d.identificacao);
    campo('desfecho-bloco').hidden = !d.desfecho;
    campo('desfecho').textContent = d.desfecho || '';
    campo('medidas').textContent = d.medidas || '';
    campo('medidas').hidden = !d.medidas;
    gForm.situacao.value = d.situacao;
    gForm.prioridade.value = d.prioridade;
    gForm.desfecho.value = d.desfecho || '';
    gForm.medidas.value = d.medidas || '';
    gForm.anotacao.value = '';
    erroDesfecho.hidden = true;
    gForm.desfecho.removeAttribute('aria-invalid');
    mostrarEncerrar();
    const msgs = d.mensagens || [];
    campo('mensagens').innerHTML = msgs.length
      ? msgs.map((m) => `<li class="den-msg den-msg--${m.de === 'equipe' ? 'equipe' : 'denunciante'}">
          <span class="den-msg__quem">${m.de === 'equipe' ? 'Equipe responsável' : 'Quem denunciou'}</span>
          <p>${esc(m.texto)}</p>
          <span class="den-msg__quando">${quando(m.dias)}</span></li>`).join('')
      : '<li class="den-msg-vazio">Nenhuma mensagem ainda.</li>';
    msgForm.hidden = !aberta(d);
    campo('historico').innerHTML = [...d.historico].reverse()
      .map((h) => `<li>${esc(h.texto)}<span class="historico__quando">${quando(h.dias)}</span></li>`).join('');
  }

  function abrir(id) {
    atual = den.lista.find((d) => d.id === id);
    if (!atual) return;
    preencher(atual);
    msgForm.mensagem.value = '';
    gaveta.showModal();
    campo('resumo').focus();
  }

  document.addEventListener('click', (e) => {
    const gatilho = e.target.closest('[data-den-abrir]');
    if (gatilho) abrir(gatilho.dataset.denAbrir);
  });
  $$('[data-dg-fechar]', gaveta).forEach((b) => b.addEventListener('click', () => gaveta.close()));
  gaveta.addEventListener('click', (e) => { if (e.target === gaveta) gaveta.close(); });
  gaveta.addEventListener('close', () => {
    const alvo = atual && $(`[data-den-abrir="${atual.id}"]`);
    if (alvo) alvo.focus();
  });

  gForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { situacao, prioridade, desfecho } = gForm;
    const encerrando = SITUACOES_ENCERRADAS.includes(situacao.value);
    if (encerrando && !desfecho.value) {
      erroDesfecho.hidden = false;
      desfecho.setAttribute('aria-invalid', 'true');
      desfecho.focus();
      return;
    }
    const mudancas = [];
    const anotacao = gForm.anotacao.value.trim();
    const medidas = gForm.medidas.value.trim();
    if (situacao.value !== atual.situacao) {
      if (atual.situacao === 'Recebida' && atual.primeiraAnalise == null) atual.primeiraAnalise = 0;
      if (encerrando) atual.concluida = 0;
      if (!encerrando && SITUACOES_ENCERRADAS.includes(atual.situacao)) { delete atual.concluida; delete atual.desfecho; mudancas.push('Reaberta'); }
      mudancas.push(`Situação alterada para "${situacao.value}"`);
      atual.situacao = situacao.value;
    }
    if (encerrando && desfecho.value !== atual.desfecho) { mudancas.push(`Desfecho: ${desfecho.value}`); atual.desfecho = desfecho.value; }
    if (encerrando && medidas !== (atual.medidas || '')) { if (medidas) mudancas.push('Medidas tomadas registradas'); atual.medidas = medidas; }
    if (prioridade.value !== atual.prioridade) { mudancas.push(`Prioridade alterada para ${prioridade.value}`); atual.prioridade = prioridade.value; }
    if (anotacao) mudancas.push(`Anotação: ${anotacao}`);
    if (!mudancas.length) { gaveta.close(); return; }
    mudancas.forEach((texto) => atual.historico.push({ dias: 0, texto }));
    den.salvar();
    desenharTudo();
    gaveta.close();
    avisar(`${atual.id} atualizada`);
  });

  // Mensagem para quem denunciou (lida e respondida pelo canal, com o protocolo)
  msgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = msgForm.mensagem.value.trim();
    const erro = $('#dg-mensagem-erro');
    erro.hidden = Boolean(texto);
    if (!texto) { msgForm.mensagem.setAttribute('aria-invalid', 'true'); msgForm.mensagem.focus(); return; }
    msgForm.mensagem.removeAttribute('aria-invalid');
    atual.mensagens = [...(atual.mensagens || []), { de: 'equipe', dias: 0, texto }];
    atual.historico.push({ dias: 0, texto: 'Mensagem enviada a quem denunciou' });
    if (msgForm.aguardar.checked && aberta(atual) && atual.situacao !== 'Aguardando informações') {
      if (atual.situacao === 'Recebida' && atual.primeiraAnalise == null) atual.primeiraAnalise = 0;
      atual.situacao = 'Aguardando informações';
      atual.historico.push({ dias: 0, texto: 'Situação alterada para "Aguardando informações"' });
    }
    den.salvar();
    desenharTudo();
    preencher(atual);
    msgForm.mensagem.value = '';
    avisar('Mensagem enviada. Quem denunciou vê ao consultar o protocolo.');
  });

  // ----- Divulgar o canal -----
  const divulgar = $('[data-divulgar-gaveta]');
  const botaoDivulgar = $('[data-divulgar]');
  botaoDivulgar.addEventListener('click', () => { divulgar.showModal(); $('#dv-titulo').focus(); });
  $('[data-dv-fechar]', divulgar).addEventListener('click', () => divulgar.close());
  divulgar.addEventListener('click', (e) => { if (e.target === divulgar) divulgar.close(); });
  divulgar.addEventListener('close', () => botaoDivulgar.focus());
  $('[data-dv-copiar]', divulgar).addEventListener('click', async () => {
    const campoLink = $('[data-dv-link]', divulgar);
    try { await navigator.clipboard.writeText(campoLink.value); avisar('Link do canal copiado'); }
    catch { campoLink.select(); avisar('Selecione e copie o link (Ctrl+C)'); }
  });
  // QR Code do link do canal (gerado no navegador por qrcode.js)
  const linkCanal = $('[data-dv-link]', divulgar).value;
  $('[data-dv-qr]', divulgar).innerHTML = qrSvg(linkCanal, { rotulo: 'QR Code do canal de denúncias' });
  $('[data-dv-baixar]', divulgar).addEventListener('click', () => { baixarQr(linkCanal, 'qrcode-canal-de-denuncias.png'); avisar('QR Code baixado'); });

  desenharTudo();
  if (params.get('abrir')) abrir(params.get('abrir'));
}
