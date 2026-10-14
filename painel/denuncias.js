// Opiina — painel (protótipo): Denúncias. Usa utilidades de painel.js ($, esc, quando, avisar…).
// Lista primeiro (no app atual o link e o QR Code ficam no topo); "Divulgar o canal" abre numa gaveta.

const CHAVE_DEN = 'opiina-demo-denuncias';
const SITUACOES_ABERTAS = ['Recebida', 'Em análise', 'Em investigação', 'Aguardando informações'];
const PESO_PRIORIDADE = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };

const den = {
  lista: (() => {
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE_DEN));
      if (Array.isArray(salvo) && salvo.length) return salvo;
    } catch { /* sem armazenamento: usa os dados iniciais */ }
    return D.denuncias.map((d) => ({
      ...d,
      historico: [
        { dias: d.criada, texto: `Recebida pelo canal (${d.identificacao ? 'identificada' : 'anônima'})` },
        ...(d.situacao !== 'Recebida' ? [{ dias: Math.min(0, d.criada + 1), texto: `Situação alterada para "${d.situacao}"` }] : []),
      ],
    }));
  })(),
  salvar() { try { sessionStorage.setItem(CHAVE_DEN, JSON.stringify(this.lista)); } catch { /* ignora */ } },
};
const aberta = (d) => SITUACOES_ABERTAS.includes(d.situacao);
const htmlSituacao = (s) => `<span class="etapa den-sit--${slug(s)}">${s}</span>`;
const htmlPrioridade = (p) => `<span class="den-prio den-prio--${slug(p)}"><span class="visualmente-oculto">Prioridade </span>${p}</span>`;
const htmlIdent = (d) => d.identificacao
  ? `<span class="den-ident">${icone('pessoa')}Identificada</span>`
  : `<span class="den-ident den-ident--anonima">${icone('cadeado')}Anônima</span>`;

if ($('[data-denuncias]')) iniciarDenuncias();

function iniciarDenuncias() {
  const form = $('[data-den-filtros]');
  const padrao = { q: '', situacao: 'abertas', prioridade: 'todas', categoria: 'todas', unidade: 'todas', ident: 'todas' };
  const params = new URLSearchParams(location.search);
  const estado = { ...padrao };
  Object.keys(padrao).forEach((k) => { if (params.get(k)) estado[k] = params.get(k); });

  D.denunciaSituacoes.forEach((s) => form.situacao.add(new Option(s, s)));
  [...D.denunciaPrioridades].reverse().forEach((p) => form.prioridade.add(new Option(p, p)));
  D.denunciaCategorias.forEach((c) => form.categoria.add(new Option(c, c)));
  D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
  Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });

  // ----- Resumo: o que pede ação primeiro -----
  function desenharResumo() {
    const abertas = den.lista.filter(aberta);
    const novas = abertas.filter((d) => d.situacao === 'Recebida').length;
    const graves = abertas.filter((d) => d.prioridade === 'Alta' || d.prioridade === 'Crítica').length;
    const concluidas = den.lista.filter((d) => d.situacao === 'Concluída' && d.criada >= -90).length;
    $('[data-den-resumo]').innerHTML = `
      <article class="kpi"><p class="kpi__rotulo">Novas</p><p class="kpi__valor">${novas}</p><p class="kpi__nota">Ainda sem análise</p></article>
      <article class="kpi"><p class="kpi__rotulo">Em andamento</p><p class="kpi__valor">${abertas.length - novas}</p><p class="kpi__nota">Em análise, investigação ou aguardando informações</p></article>
      <article class="kpi${graves ? ' kpi--alerta' : ''}"><p class="kpi__rotulo">Prioridade alta ou crítica</p><p class="kpi__valor">${graves}</p><p class="kpi__nota">${graves ? 'Em aberto. Trate primeiro.' : 'Nenhuma em aberto'}</p></article>
      <article class="kpi"><p class="kpi__rotulo">Concluídas</p><p class="kpi__valor">${concluidas}</p><p class="kpi__nota">Nos últimos 90 dias</p></article>`;
  }

  // ----- Lista -----
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
    // Em aberto primeiro; depois a mais grave; depois a mais recente
    }).sort((a, b) => aberta(b) - aberta(a) || PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] || b.criada - a.criada);
  }

  function htmlLinha(d) {
    return `<tr>
      <td data-col="nota">${htmlPrioridade(d.prioridade)}</td>
      <td data-col="comentario"><button class="oc-abrir" type="button" data-den-abrir="${d.id}" aria-haspopup="dialog">
        <span class="oc-abrir__texto">${esc(d.resumo)}</span>
        <span class="oc-abrir__meta">${d.id} · ${esc(d.categoria)} · ${quando(d.criada)}</span></button></td>
      <td data-col="unidade">${esc(d.unidade || 'Não informada')}</td>
      <td data-col="etapa">${htmlSituacao(d.situacao)}</td>
      <td data-col="responsavel">${htmlIdent(d)}</td>
    </tr>`;
  }

  function desenhar() {
    const itens = filtrar();
    $('[data-den-lista]').innerHTML = itens.map(htmlLinha).join('');
    $('[data-den-vazio]').hidden = itens.length > 0;
    $('.den-tabela').hidden = itens.length === 0;
    $('[data-den-contagem]').innerHTML = `<strong>${itens.length}</strong> ${itens.length === 1 ? 'denúncia' : 'denúncias'}`;
    // Filtros no endereço (dá para voltar ao mesmo recorte)
    const p = new URLSearchParams();
    Object.keys(padrao).forEach((k) => { if (estado[k] !== padrao[k]) p.set(k, estado[k]); });
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
    desenharResumo();
  }

  form.addEventListener('input', (e) => {
    if (!e.target.name) return;
    estado[e.target.name] = e.target.value;
    desenhar();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('[data-den-limpar]').addEventListener('click', () => {
    Object.assign(estado, padrao);
    Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
    desenhar();
    form.q.focus();
  });

  // ----- Gaveta de detalhe -----
  const gaveta = $('[data-den-gaveta]');
  const gForm = $('[data-dg-form]', gaveta);
  const campo = (nome) => $(`[data-dg="${nome}"]`, gaveta);
  D.denunciaSituacoes.forEach((s) => gForm.situacao.add(new Option(s, s)));
  [...D.denunciaPrioridades].reverse().forEach((p) => gForm.prioridade.add(new Option(p, p)));
  let atual = null;

  function abrir(id) {
    atual = den.lista.find((d) => d.id === id);
    if (!atual) return;
    campo('id').textContent = atual.id;
    campo('prioridade').innerHTML = htmlPrioridade(atual.prioridade);
    campo('situacao').innerHTML = htmlSituacao(atual.situacao);
    campo('resumo').textContent = atual.resumo;
    campo('relato').textContent = atual.relato;
    campo('categoria').textContent = atual.categoria;
    campo('unidade').textContent = atual.unidade || 'Não informada';
    campo('recebida').textContent = `${dataCurta(diaRelativo(atual.criada))} (${quando(atual.criada)})`;
    campo('identificacao').innerHTML = atual.identificacao
      ? `${esc(atual.identificacao.nome)}<span class="den-contato">${esc(atual.identificacao.contato)}</span>`
      : 'Anônima';
    campo('aviso-anonima').hidden = Boolean(atual.identificacao);
    gForm.situacao.value = atual.situacao;
    gForm.prioridade.value = atual.prioridade;
    gForm.anotacao.value = '';
    campo('historico').innerHTML = [...atual.historico].reverse()
      .map((h) => `<li>${esc(h.texto)}<span class="historico__quando">${quando(h.dias)}</span></li>`).join('');
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
    const mudancas = [];
    const { situacao, prioridade } = gForm;
    const anotacao = gForm.anotacao.value.trim();
    if (situacao.value !== atual.situacao) { mudancas.push(`Situação alterada para "${situacao.value}"`); atual.situacao = situacao.value; }
    if (prioridade.value !== atual.prioridade) { mudancas.push(`Prioridade alterada para ${prioridade.value}`); atual.prioridade = prioridade.value; }
    if (anotacao) mudancas.push(`Anotação: ${anotacao}`);
    if (!mudancas.length) { gaveta.close(); return; }
    mudancas.forEach((texto) => atual.historico.push({ dias: 0, texto }));
    den.salvar();
    desenhar();
    gaveta.close();
    avisar(`${atual.id} atualizada`);
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

  desenhar();
  if (params.get('abrir')) abrir(params.get('abrir'));
}
