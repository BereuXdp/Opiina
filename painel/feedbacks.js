// Opiina — painel (protótipo): Feedbacks = todas as respostas das pesquisas, e o tratamento das que pedem ação.
// Decisão do cliente (2026-10-14): a aba Ocorrências saiu; responsável, prazo, etapa, anotação e Kanban
// ficam aqui, para quem tem a permissão de tratar ("ocorrencias" nos perfis). O Marketing só lê.
// Usa utilidades e o estado das ocorrências de painel.js ($, esc, ocorrencias, prazoInfo, htmlResponsavel…).

const POR_PAGINA = 15;
const NOMES_SENTIMENTO = { elogio: 'Elogio', reclamacao: 'Reclamação', neutro: 'Neutro' };
const ACOES_DE_PRAZO = ['abertas', 'vencidas', 'hoje', 'sem-responsavel', 'minhas'];

// Respostas = as de dados.js + as que pedem ação (objetos vivos da lista de ocorrências: a gaveta altera direto)
function todasAsRespostas() {
  const daOcorrencia = ocorrencias.map((oc) => {
    const n = Number(oc.id.replace(/\D/g, ''));
    return {
      dias: oc.criada, hora: `${String(11 + (n % 11)).padStart(2, '0')}:${String((n * 7) % 60).padStart(2, '0')}`,
      nota: oc.nota, unidade: oc.unidade, atendente: oc.atendente || '', cliente: oc.cliente,
      tema: oc.tema, sentimento: 'reclamacao', comentario: oc.comentario, ocorrencia: oc,
    };
  });
  const agora = Date.now();
  return [...D.respostas, ...daOcorrencia].map((r, i) => {
    const quando = diaRelativo(r.dias);
    const [h, m] = r.hora.split(':').map(Number);
    quando.setHours(h, m, 0, 0);
    if (quando > agora) quando.setTime(agora - (i + 1) * 23 * 60000);   // "hoje" nunca no futuro
    return { ...r, quando };
  }).sort((a, b) => b.quando - a.quando);
}

if ($('[data-feedbacks]')) iniciarFeedbacks();

function iniciarFeedbacks() {
  const podeTratar = pode('ocorrencias');
  const form = $('[data-fb-filtros]');
  const selPeriodo = $('[data-fb-periodo]');
  const padrao = { q: '', unidade: 'todas', nota: 'todas', tipo: 'todos', tema: 'todos', comentario: 'todos', periodo: '30', acao: 'todos', visao: 'lista' };
  const params = new URLSearchParams(location.search);
  const estado = { ...padrao };
  Object.keys(padrao).forEach((k) => { if (params.get(k)) estado[k] = params.get(k); });
  if (!['7', '30'].includes(estado.periodo)) estado.periodo = '30';
  if (!podeTratar) Object.assign(estado, { acao: 'todos', visao: 'lista' });   // o Marketing só lê
  D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
  D.temas.forEach((t) => form.tema.add(new Option(t.nome, t.nome)));
  const aplicarNoForm = () => {
    Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
    selPeriodo.value = estado.periodo;
  };
  aplicarNoForm();
  const respostas = todasAsRespostas();
  let mostrando = POR_PAGINA;

  const aberta = (oc) => oc && oc.etapa !== 'Resolvida';
  function passaAcao(r) {
    const oc = r.ocorrencia;
    switch (estado.acao) {
      case 'abertas': return aberta(oc);
      case 'vencidas': return aberta(oc) && oc.prazo < 0;
      case 'hoje': return aberta(oc) && oc.prazo === 0;
      case 'sem-responsavel': return aberta(oc) && !oc.responsavel;
      case 'minhas': return Boolean(oc) && oc.responsavel === EU;
      case 'resolvidas': return Boolean(oc) && oc.etapa === 'Resolvida';
      default: return true;
    }
  }

  // ignorarAcao: o Kanban mostra todas as etapas (as colunas já são o tratamento)
  function filtrar({ ignorarAcao = false } = {}) {
    const q = estado.q.trim().toLowerCase();
    const limite = -Number(estado.periodo) + 1;
    const porPrazo = !ignorarAcao && ACOES_DE_PRAZO.includes(estado.acao);
    const itens = respostas.filter((r) => {
      // O que ainda pede ação aparece mesmo se for mais antigo que o período
      if (r.dias < limite && !(porPrazo || (ignorarAcao && aberta(r.ocorrencia)))) return false;
      if (!ignorarAcao && !passaAcao(r)) return false;
      if (estado.unidade !== 'todas' && r.unidade !== estado.unidade) return false;
      if (estado.nota !== 'todas' && categoria(r.nota) !== estado.nota) return false;
      if (estado.tipo !== 'todos' && r.sentimento !== estado.tipo) return false;
      if (estado.tema !== 'todos' && r.tema !== estado.tema) return false;
      if (estado.comentario === 'com' && !r.comentario) return false;
      if (estado.comentario === 'sem' && r.comentario) return false;
      if (q && !`${r.comentario} ${r.cliente} ${r.atendente} ${r.unidade} ${r.ocorrencia?.id || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // Filtrando o que pede ação, o mais urgente vem primeiro (prazo); senão, o mais recente
    return porPrazo ? itens.sort((a, b) => a.ocorrencia.prazo - b.ocorrencia.prazo) : itens;
  }

  // ----- Resumo do período e da unidade -----
  function desenharResumo() {
    const limite = -Number(estado.periodo) + 1;
    const base = respostas.filter((r) => r.dias >= limite && (estado.unidade === 'todas' || r.unidade === estado.unidade));
    const comComentario = base.filter((r) => r.comentario);
    const classificadas = comComentario.filter((r) => r.sentimento);
    const pct = (n, de) => (de ? Math.round((n / de) * 100) : 0);
    const elogios = classificadas.filter((r) => r.sentimento === 'elogio').length;
    const reclamacoes = classificadas.filter((r) => r.sentimento === 'reclamacao').length;
    const atalho = (filtro, texto) => `<a class="kpi__rotulo kpi__link" href="?${filtro}" data-fb-atalho="${filtro}">${texto}</a>`;
    const abertasAgora = respostas.filter((r) => aberta(r.ocorrencia) && (estado.unidade === 'todas' || r.unidade === estado.unidade));
    const vencidas = abertasAgora.filter((r) => r.ocorrencia.prazo < 0).length;
    $('[data-fb-resumo]').innerHTML = `
      <article class="kpi"><p class="kpi__rotulo">Respostas</p><p class="kpi__valor">${numero(base.length)}</p><p class="kpi__nota">${estado.periodo === '7' ? 'Últimos 7 dias' : 'Últimos 30 dias'}${estado.unidade === 'todas' ? '' : ` · ${esc(estado.unidade)}`} · ${pct(comComentario.length, base.length)}% com comentário</p></article>
      <article class="kpi">${atalho('tipo=elogio', 'Elogios')}<p class="kpi__valor fb-kpi--elogio">${pct(elogios, classificadas.length)}%</p><p class="kpi__nota">${elogios} dos comentários</p></article>
      <article class="kpi">${atalho('tipo=reclamacao', 'Reclamações')}<p class="kpi__valor fb-kpi--reclamacao">${pct(reclamacoes, classificadas.length)}%</p><p class="kpi__nota">${reclamacoes} dos comentários</p></article>
      ${podeTratar
        ? `<article class="kpi${vencidas ? ' kpi--alerta' : ''}">${atalho('acao=abertas', 'Precisam de ação')}<p class="kpi__valor">${abertasAgora.length}</p><p class="kpi__nota">${vencidas ? `${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}. Resolva primeiro.` : 'Nenhuma fora do prazo'}</p></article>`
        : `<article class="kpi">${atalho('comentario=com', 'Com comentário')}<p class="kpi__valor">${pct(comComentario.length, base.length)}%</p><p class="kpi__nota">${comComentario.length} de ${base.length} respostas</p></article>`}`;
  }

  // ----- Lista -----
  function htmlTratamento(oc) {
    if (!podeTratar) return `<span class="fb-oc">${icone('ocorrencias')}${oc.etapa === 'Resolvida' ? 'Resolvido pela equipe' : 'Encaminhado à equipe'}</span>`;
    const p = prazoInfo(oc);
    return `<div class="fb-trat">
      <span class="etapa etapa--${slug(oc.etapa)}">${oc.etapa}</span>
      ${htmlResponsavel(oc.responsavel)}
      <span class="prazo ${p.classe}">${icone('relogio')}${p.texto}</span>
      <button class="btn btn--secundario fb-trat__abrir" type="button" data-abrir="${oc.id}" aria-haspopup="dialog">Tratar<span class="visualmente-oculto"> o feedback ${oc.id}</span></button>
    </div>`;
  }

  function htmlItem(r) {
    const oc = r.ocorrencia;
    const dataHora = `${dataCurta(r.quando)} às ${r.quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const meta = [esc(r.unidade), r.atendente ? `Atendente: ${esc(r.atendente)}` : '', esc(r.cliente),
      `<time datetime="${r.quando.toISOString()}" title="${quando(r.dias)}">${dataHora}</time>`, oc && podeTratar ? oc.id : ''].filter(Boolean);
    return `<li class="cartao fb-item${aberta(oc) && podeTratar ? ' fb-item--acao' : ''}">
      <span class="nota nota--${categoria(r.nota)}" aria-label="Nota ${r.nota} de 0 a 10">${r.nota}</span>
      <div class="fb-item__corpo">
        ${r.comentario ? `<p class="fb-item__texto">“${esc(r.comentario)}”</p>` : '<p class="fb-item__sem">Sem comentário: só a nota.</p>'}
        <p class="fb-item__meta">${meta.join('<span aria-hidden="true"> · </span>')}</p>
        ${r.tema || r.sentimento || (oc && !podeTratar) ? `<div class="fb-item__tags">
          ${r.sentimento ? `<span class="fb-tag fb-tag--${r.sentimento}">${NOMES_SENTIMENTO[r.sentimento]}</span>` : ''}
          ${r.tema ? `<span class="fb-tag">${esc(r.tema)}</span>` : ''}
          ${oc && !podeTratar ? htmlTratamento(oc) : ''}
        </div>` : ''}
        ${oc && podeTratar ? htmlTratamento(oc) : ''}
      </div>
    </li>`;
  }

  // ----- Kanban (só o que pede ou pediu ação; uma coluna por etapa) -----
  function htmlCartao(r) {
    const oc = r.ocorrencia;
    const p = prazoInfo(oc);
    return `<li><button class="oc-cartao" type="button" data-abrir="${oc.id}" aria-haspopup="dialog">
      <span class="oc-cartao__topo"><span class="nota nota--${categoria(oc.nota)}"><span class="visualmente-oculto">Nota </span>${oc.nota}</span><span class="oc-cartao__id">${oc.id}</span></span>
      <span class="oc-cartao__texto">${esc(oc.comentario)}</span>
      <span class="oc-cartao__meta"><span class="oc-cartao__unidade">${icone('loja')}${esc(oc.unidade)}</span><span class="prazo ${p.classe}">${icone('relogio')}${p.texto}</span></span>
      <span class="oc-cartao__meta">${htmlResponsavel(oc.responsavel)}</span>
    </button></li>`;
  }

  function desenhar({ manterPagina = false } = {}) {
    const kanban = podeTratar && estado.visao === 'kanban';
    $('[data-fb-visao-lista]').hidden = kanban;
    $('[data-fb-kanban]').hidden = !kanban;
    const campoAcao = $('#fb-acao')?.closest('.campo');
    if (campoAcao) campoAcao.hidden = kanban;   // no Kanban, as etapas são as colunas
    $$('[data-fb-visao]').forEach((a) => {
      if (a.dataset.fbVisao === (kanban ? 'kanban' : 'lista')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    let total;
    if (kanban) {
      const itens = filtrar({ ignorarAcao: true }).filter((r) => r.ocorrencia);
      total = itens.length;
      $('[data-fb-kanban]').innerHTML = D.etapas.map((etapa) => {
        const daEtapa = itens.filter((r) => r.ocorrencia.etapa === etapa).sort((a, b) => a.ocorrencia.prazo - b.ocorrencia.prazo);
        const id = `coluna-${slug(etapa)}`;
        return `<section class="coluna" aria-labelledby="${id}">
          <div class="coluna__topo"><h2 class="etapa etapa--${slug(etapa)}" id="${id}">${etapa}</h2><span class="coluna__total">${daEtapa.length}<span class="visualmente-oculto"> feedbacks</span></span></div>
          ${daEtapa.length ? `<ul class="coluna__lista">${daEtapa.map(htmlCartao).join('')}</ul>` : '<p class="coluna__vazia">Nada aqui</p>'}
        </section>`;
      }).join('');
    } else {
      if (!manterPagina) mostrando = POR_PAGINA;
      const itens = filtrar();
      total = itens.length;
      $('[data-fb-lista]').innerHTML = itens.slice(0, mostrando).map(htmlItem).join('');
      $('[data-fb-vazio]').hidden = itens.length > 0;
      const mais = $('[data-fb-mais]');
      mais.hidden = itens.length <= mostrando;
      mais.textContent = `Mostrar mais (${itens.length - mostrando} restantes)`;
    }
    $('[data-fb-contagem]').innerHTML = `<strong>${total}</strong> ${total === 1 ? 'feedback' : 'feedbacks'}${kanban ? ' que pedem ou pediram ação' : ''}`;
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
  selPeriodo.addEventListener('change', () => { estado.periodo = selPeriodo.value; desenhar(); });
  $('[data-fb-limpar]').addEventListener('click', () => {
    Object.assign(estado, padrao, { periodo: estado.periodo, visao: estado.visao });
    aplicarNoForm();
    desenhar();
    form.q.focus();
  });
  $('[data-fb-mais]').addEventListener('click', () => {
    const primeiroNovo = mostrando;
    mostrando += POR_PAGINA;
    desenhar({ manterPagina: true });
    const li = $$('[data-fb-lista] > li')[primeiroNovo];
    if (li) { li.setAttribute('tabindex', '-1'); li.focus(); }
  });
  // Lista | Kanban sem recarregar (o link funciona sem JS)
  $$('[data-fb-visao]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    estado.visao = a.dataset.fbVisao;
    desenhar();
  }));
  // Cartões do resumo: aplicam o filtro sem recarregar
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-fb-atalho]');
    if (!a) return;
    e.preventDefault();
    const [k, v] = a.dataset.fbAtalho.split('=');
    Object.assign(estado, padrao, { periodo: estado.periodo, unidade: estado.unidade, [k]: v });
    aplicarNoForm();
    desenhar();
  });

  // ----- Gaveta: tratar o feedback (etapa, responsável, anotação, histórico) -----
  const gaveta = $('[data-gaveta]');
  const gForm = $('[data-gaveta-form]', gaveta);
  let atual = null;
  D.etapas.forEach((e) => gForm.etapa.add(new Option(e, e)));
  gForm.responsavel.add(new Option('Sem responsável', ''));
  D.responsaveis.forEach((r) => gForm.responsavel.add(new Option(r === EU ? `${r} (você)` : r, r)));
  const g = (nome) => $(`[data-g="${nome}"]`, gaveta);

  function abrir(id) {
    if (!podeTratar) return;
    atual = ocorrencias.find((oc) => oc.id === id);
    if (!atual) return;
    const p = prazoInfo(atual);
    g('id').textContent = atual.id;
    const nota = g('nota');
    nota.className = `nota nota--${categoria(atual.nota)}`;
    nota.textContent = atual.nota;
    nota.setAttribute('aria-label', `Nota ${atual.nota} de 0 a 10`);
    g('comentario').textContent = `“${atual.comentario}”`;
    g('cliente').textContent = atual.cliente;
    g('unidade').textContent = atual.unidade;
    g('tema').textContent = atual.tema;
    g('atendente').textContent = atual.atendente || 'Não informado';
    g('recebida').textContent = `${dataCurta(diaRelativo(atual.criada))} (${quando(atual.criada)})`;
    const prazo = g('prazo');
    prazo.className = `prazo ${p.classe}`;
    prazo.textContent = p.texto;
    gForm.etapa.value = atual.etapa;
    gForm.responsavel.value = atual.responsavel || '';
    gForm.anotacao.value = '';
    g('historico').innerHTML = [...atual.historico].reverse()
      .map((h) => `<li>${esc(h.texto)}<span class="historico__quando">${quando(h.dias)}</span></li>`).join('');
    gaveta.showModal();
    g('comentario').focus();   // o leitor de tela começa pelo comentário
  }

  document.addEventListener('click', (e) => {
    const gatilho = e.target.closest('[data-abrir]');
    if (gatilho) abrir(gatilho.dataset.abrir);
  });
  $$('[data-gaveta-fechar]', gaveta).forEach((b) => b.addEventListener('click', () => gaveta.close()));
  gaveta.addEventListener('click', (e) => { if (e.target === gaveta) gaveta.close(); });
  gaveta.addEventListener('close', () => { if (atual) $(`[data-abrir="${atual.id}"]`)?.focus(); });

  gForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const mudancas = [];
    const etapa = gForm.etapa.value;
    const responsavel = gForm.responsavel.value || null;
    const anotacao = gForm.anotacao.value.trim();
    if (etapa !== atual.etapa) { mudancas.push(`Etapa alterada para "${etapa}"`); atual.etapa = etapa; }
    if (responsavel !== atual.responsavel) {
      mudancas.push(responsavel ? `Atribuída a ${responsavel}` : 'Responsável removido');
      atual.responsavel = responsavel;
    }
    if (anotacao) mudancas.push(`Anotação: ${anotacao}`);
    if (!mudancas.length) { gaveta.close(); return; }
    mudancas.forEach((texto) => atual.historico.push({ dias: 0, texto }));
    salvarOcorrencias();
    desenhar({ manterPagina: true });
    atualizarSeloVencidas();
    gaveta.close();
    avisar(`${atual.id} atualizado`);
  });

  desenhar();
  if (params.get('abrir')) abrir(params.get('abrir'));   // vindo do Dashboard, Clientes ou de um link antigo de Ocorrências
}
