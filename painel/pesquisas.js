// Opiina — painel (protótipo): Pesquisas (lista) e Nova pesquisa (editor com prévia).
// Usa as utilidades de painel.js ($, $$, esc, icone, avisar, quando, dataCurta, diaRelativo).
// As pesquisas ficam guardadas na aba (sessionStorage); nada é enviado.

const CHAVE_PQ = 'opiina-demo-pesquisas';
const NOMES_STATUS = { publicada: 'Publicada', rascunho: 'Rascunho', arquivada: 'Arquivada' };
const TIPOS = [
  { valor: 'texto', nome: 'Texto livre', icone: 'texto' },
  { valor: 'nota10', nome: 'Nota de 1 a 10', icone: 'nota10' },
  { valor: 'polegar', nome: 'Gostei / não gostei', icone: 'polegar' },
  { valor: 'estrelas', nome: 'Estrelas (1 a 5)', icone: 'estrela' },
  { valor: 'escolha', nome: 'Escolha única', icone: 'escolha' },
];
// Escala da pergunta 1. A de 0 a 5 é PROPOSTA (a confirmar com a equipe do app): mesma proporção da de 0 a 10.
const ESCALAS = {
  10: { detrator: 6, dica: '9 e 10 = promotores · 7 e 8 = passivos · 0 a 6 = detratores (abrem ocorrência automaticamente).' },
  5: { detrator: 3, dica: '5 = promotor · 4 = passivo · 0 a 3 = detratores (abrem ocorrência automaticamente).' },
};
const perguntaNps = (escala) => `De 0 a ${escala}, o quanto você nos recomendaria a um amigo?`;
// A nota de recomendação é opcional (nps: false). Pesquisas antigas, sem o campo, têm a nota.
function contarPerguntas(p) {
  const n = p.perguntas.length + (p.nps === false ? 0 : 1);
  return `${n} ${n === 1 ? 'pergunta' : 'perguntas'}`;
}

// Uma pesquisa pode valer para várias unidades; cada unidade tem o próprio link (e QR Code).
// Pesquisas antigas guardadas na aba ainda têm "unidade" (uma só).
const unidadesDe = (p) => p.unidades || (p.unidade ? [p.unidade] : []);
const nomesUnidades = (p) => {
  const u = unidadesDe(p);
  return u.length === D.unidades.length && u.length > 1 ? 'Todas as unidades' : u.join(', ');
};
const linkDa = (p, unidade) => `https://casaexemplo.opiina.com/pesquisa/${p.id.toLowerCase()}-${slug(unidade)}`;   // endereço fictício

// Data e hora de cada momento (pedido do cliente, 2026-10-14): criada, editada, publicada, arquivada (ms).
// Os exemplos trazem dias relativos + hora; o que é feito na aba guarda o momento exato.
function momento(dias, hora = '12:00') {
  const d = diaRelativo(dias);
  const [h, m] = hora.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
function comDatas(p) {
  if (p.datas) return p;
  const base = momento(p.criada ?? 0, p.hora);
  p.datas = {
    criada: base, editada: base,
    publicada: p.status === 'rascunho' ? null : base,
    arquivada: p.status === 'arquivada' ? momento(p.arquivada ?? p.criada, p.horaArquivada ?? p.hora) : null,
  };
  return p;
}
const dataHora = (ms) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
// "Publicada em 13/08/2026 às 10:42" (o "há X dias" fica na dica, ao passar o mouse)
function htmlQuando(rotulo, ms) {
  const dias = Math.round((new Date(ms).setHours(12, 0, 0, 0) - diaRelativo(0).getTime()) / 864e5);
  return `<time datetime="${new Date(ms).toISOString()}" title="${quando(dias)}">${rotulo} em ${dataHora(ms)}</time>`;
}
// Momento mais recente (para ordenar a lista)
const ultimoMomento = (p) => Math.max(...Object.values(p.datas).filter(Boolean));

function carregarPesquisas() {
  let lista = null;
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_PQ));
    if (Array.isArray(salvo)) lista = salvo;
  } catch { /* sem armazenamento: usa os exemplos */ }
  return (lista || structuredClone(D.pesquisas)).map(comDatas);
}
function salvarPesquisas(lista) {
  try { sessionStorage.setItem(CHAVE_PQ, JSON.stringify(lista)); } catch { /* ignora */ }
}
const pesquisas = carregarPesquisas();
const proximoId = () => `PQ-${String(Math.max(0, ...pesquisas.map((p) => Number(p.id.slice(3)))) + 1).padStart(2, '0')}`;


// =====================================================================
// Lista
// =====================================================================
const telaLista = $('[data-pesquisas]');
if (telaLista) iniciarLista();

function iniciarLista() {
  const params = new URLSearchParams(location.search);
  let filtro = params.get('status') || 'todas';
  const grade = $('[data-pq-lista]');
  const vazio = $('[data-pq-vazio]');
  const ordem = { rascunho: 0, publicada: 1, arquivada: 2 };

  function cartao(p) {
    const meta = `
      <span>${icone('loja')}${esc(nomesUnidades(p) || 'Sem unidade')}</span>
      <span>${icone('pesquisas')}${contarPerguntas(p)}${p.nps === false ? ' · sem nota NPS' : p.escala === 5 ? ' · nota de 0 a 5' : ''}</span>
      ${p.status === 'rascunho'
        ? `<span>${icone('relogio')}${htmlQuando('Salvo', p.datas.editada)}</span>`
        : `<span>${icone('relogio')}${htmlQuando('Publicada', p.datas.publicada)}</span>`}
      ${p.status === 'arquivada' ? `<span>${icone('arquivar')}${htmlQuando('Arquivada', p.datas.arquivada)}</span>` : ''}
      ${p.status === 'rascunho' ? '' : `<span>${icone('cadeado')}Não pode ser editada</span>`}
      ${p.premio ? `<span>${icone('premios')}Sorteio: ${esc(D.premios.find((x) => x.id === p.premioId)?.nome || '—')}${p.sorteioEm > 0 ? ` em ${dataCurta(diaRelativo(p.sorteioEm))}` : ''}</span>` : ''}`;
    let acoes = '';
    const unidades = unidadesDe(p);
    const varias = unidades.length > 1;
    // Publicada: as unidades viram botões (abrem o pop-up "Links" já nela) e "Links" abre na primeira
    const links = p.status === 'publicada' ? `
      <div class="pq-unidades" aria-label="Link e QR Code por unidade">${unidades.map((u) => `
        <button class="pq-unidade" type="button" data-acao="links" data-id="${p.id}" data-unidade="${esc(u)}" aria-haspopup="dialog">${icone('qr')}${esc(u)}<span class="visualmente-oculto">: link e QR Code</span></button>`).join('')}
      </div>` : '';
    if (p.status === 'publicada') {
      acoes = `
        <button class="btn btn--primario" type="button" data-acao="links" data-id="${p.id}" aria-haspopup="dialog">${icone('link')}Links${varias ? ` (${unidades.length})` : ''}</button>
        <button class="btn btn--secundario" type="button" data-acao="arquivar" data-id="${p.id}">${icone('arquivar')}Arquivar</button>
        <button class="btn btn--perigo btn--icone" type="button" data-acao="apagar" data-id="${p.id}" aria-label="Apagar ${esc(p.nome)} (${esc(nomesUnidades(p))})" title="Apagar">${icone('lixeira')}</button>`;
    } else if (p.status === 'rascunho') {
      acoes = `
        <a class="btn btn--primario" href="pesquisa-nova.html?rascunho=${p.id}">${icone('editar')}Continuar editando</a>
        <button class="btn btn--perigo btn--icone" type="button" data-acao="apagar" data-id="${p.id}" aria-label="Apagar rascunho ${esc(p.nome)}" title="Apagar">${icone('lixeira')}</button>`;
    } else {
      acoes = `
        <button class="btn btn--secundario" type="button" data-acao="restaurar" data-id="${p.id}">Restaurar</button>
        <button class="btn btn--perigo btn--icone" type="button" data-acao="apagar" data-id="${p.id}" aria-label="Apagar ${esc(p.nome)}" title="Apagar">${icone('lixeira')}</button>`;
    }
    const numero = p.status === 'rascunho'
      ? `<div class="pq-cartao__numero"><span>Ainda não publicada: sem link para os clientes.${varias ? ` Ao publicar, cada unidade ganha o próprio link (${unidades.length} links).` : ''}</span></div>`
      : `<div class="pq-cartao__numero"><strong>${p.respostas.toLocaleString('pt-BR')}</strong><span>${p.respostas === 1 ? 'resposta' : 'respostas'}${varias ? ` nas ${unidades.length} unidades` : ''}</span></div>${links}`;
    return `<li><article class="cartao pq-cartao"${params.get('nova') === p.id ? ' data-novo' : ''} aria-labelledby="pq-${p.id}">
      <div class="pq-cartao__topo"><span class="status status--${p.status}">${NOMES_STATUS[p.status]}</span><span class="pq-cartao__id">${p.id}</span></div>
      <div><h2 class="pq-cartao__nome" id="pq-${p.id}">${esc(p.nome)}</h2><p class="pq-cartao__meta">${meta}</p></div>
      ${numero}
      <div class="pq-cartao__acoes">${acoes}</div>
    </article></li>`;
  }

  function desenhar() {
    const itens = pesquisas
      .filter((p) => filtro === 'todas' || p.status === filtro)
      .sort((a, b) => ordem[a.status] - ordem[b.status] || ultimoMomento(b) - ultimoMomento(a));
    grade.innerHTML = itens.map(cartao).join('');
    vazio.hidden = itens.length > 0;
    $$('[data-filtro]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro));
      const total = b.dataset.filtro === 'todas' ? pesquisas.length : pesquisas.filter((p) => p.status === b.dataset.filtro).length;
      $('.alternar__total', b).textContent = total;
    });
  }

  $$('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    const p = new URLSearchParams();
    if (filtro !== 'todas') p.set('status', filtro);
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
    desenhar();
  }));

  grade.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-acao]');
    if (!botao) return;
    const p = pesquisas.find((x) => x.id === botao.dataset.id);
    const acao = botao.dataset.acao;

    if (acao === 'links') {
      const unidades = unidadesDe(p);
      abrirLinks({
        titulo: 'Links da pesquisa',
        sub: `${p.nome} (${p.id}). ${unidades.length > 1 ? 'Cada unidade tem o próprio link e QR Code.' : `Leva direto à pesquisa de ${unidades[0]}.`}`,
        itens: unidades.map((u) => ({ nome: u, link: linkDa(p, u), arquivo: `qrcode-${p.id.toLowerCase()}-${slug(u)}.png`,
          abrir: `responder.html?p=${p.id.toLowerCase()}&u=${slug(u)}` })),   // página do cliente neste protótipo
        inicial: Math.max(0, unidades.indexOf(botao.dataset.unidade)),
      });
      return;
    }
    if (acao === 'arquivar') {
      const ok = await confirmar({
        titulo: 'Arquivar esta pesquisa?',
        texto: `<strong>${esc(p.nome)}</strong> (${esc(nomesUnidades(p))}) para de receber respostas e o link deixa de funcionar.${p.respostas ? ` As ${p.respostas.toLocaleString('pt-BR')} respostas continuam guardadas.` : ''} Dá para restaurar depois.`,
        botao: 'Arquivar', icone: 'arquivar',
      });
      if (!ok) return botao.focus();
      p.status = 'arquivada';
      p.datas.arquivada = Date.now();
      avisar('Pesquisa arquivada');
    }
    if (acao === 'restaurar') {
      p.status = 'publicada';
      p.datas.arquivada = null;   // volta ao ar; a data de publicação continua a original
      avisar('Pesquisa restaurada: o link volta a funcionar');
    }
    if (acao === 'apagar') {
      const respostas = p.respostas.toLocaleString('pt-BR');
      const noAr = p.status === 'publicada' ? ' O link para de funcionar na hora.' : '';
      const ok = await confirmar({
        titulo: p.status === 'rascunho' ? 'Apagar este rascunho?' : 'Apagar esta pesquisa?',
        texto: p.status === 'rascunho'
          ? `<strong>${esc(p.nome)}</strong> será apagado. Não dá para desfazer.`
          : p.respostas
            ? `<strong>${esc(p.nome)}</strong> (${esc(nomesUnidades(p))}) e as <strong>${respostas} respostas</strong> dela serão apagadas.${noAr} Não dá para desfazer.${p.status === 'publicada' ? ' Para só tirar do ar e guardar as respostas, use "Arquivar".' : ''}`
            : `<strong>${esc(p.nome)}</strong> (${esc(nomesUnidades(p))}) será apagada.${noAr} Não dá para desfazer.`,
        botao: 'Apagar', perigo: true, icone: 'lixeira',
        // Com respostas, a pessoa precisa marcar que entende a perda
        exigir: p.status !== 'rascunho' && p.respostas ? `Entendo que as ${respostas} respostas serão apagadas` : '',
      });
      if (!ok) return botao.focus();
      pesquisas.splice(pesquisas.indexOf(p), 1);
      avisar(p.status === 'rascunho' ? 'Rascunho apagado' : 'Pesquisa apagada');
    }
    salvarPesquisas(pesquisas);
    desenhar();
    $('[data-nova]').focus();   // o cartão pode ter saído do filtro: o foco vai para um lugar estável
  });

  desenhar();
  const mensagens = { publicada: 'Pesquisa publicada. Copie o link para começar a receber respostas.', rascunho: 'Rascunho salvo', apagada: 'Rascunho apagado' };
  if (mensagens[params.get('msg')]) {
    avisar(mensagens[params.get('msg')]);
    $('[data-novo]')?.scrollIntoView({ block: 'center' });
    params.delete('msg'); params.delete('nova');
    history.replaceState(null, '', params.toString() ? `?${params}` : location.pathname);
  }
}

// =====================================================================
// Nova pesquisa (editor + prévia)
// =====================================================================
const telaEditor = $('[data-editor]');
if (telaEditor) iniciarEditor();

function iniciarEditor() {
  const params = new URLSearchParams(location.search);
  const form = $('[data-editor-form]');
  const listaPerguntas = $('[data-perguntas]');
  const previa = $('[data-previa]');
  let uid = 0;
  let alterado = false;

  // Só rascunho se edita (pedido do cliente, 2026-10-14). Depois de publicada não há caminho para mexer:
  // nem pelo endereço (?rascunho=PQ-12) nem por "nova versão" (?base=, retirada a pedido do cliente).
  const pedida = pesquisas.find((p) => p.id === (params.get('rascunho') || params.get('base')));
  if (pedida && pedida.status !== 'rascunho') {
    const publicada = pedida.status === 'publicada';
    telaEditor.innerHTML = `
      <section class="cartao breve">
        <span class="breve__icone" aria-hidden="true">${icone('cadeado')}</span>
        <h1 class="cabeca__titulo">Esta pesquisa ${publicada ? 'já foi publicada' : 'está arquivada'} e não pode ser editada</h1>
        <p><strong>${esc(pedida.nome)}</strong> (${esc(nomesUnidades(pedida))}), publicada em ${dataHora(pedida.datas.publicada)}${pedida.datas.arquivada ? ` e arquivada em ${dataHora(pedida.datas.arquivada)}` : ''}. Só rascunhos podem ser editados: assim todas as respostas de uma pesquisa são às mesmas perguntas.${publicada ? ' Se precisar de outras perguntas, crie uma pesquisa nova.' : ''}</p>
        <div class="breve__acoes">
          ${publicada ? `<a class="btn btn--primario" href="pesquisa-nova.html">${icone('mais')}Nova pesquisa</a>` : ''}
          <a class="btn btn--secundario" href="pesquisas.html">Voltar para Pesquisas</a>
        </div>
      </section>`;
    document.title = `Pesquisa ${publicada ? 'publicada' : 'arquivada'} — Opiina`;
    return;
  }

  // Estado inicial: nova, continuação de rascunho ou nova versão de uma publicada
  const origem = pesquisas.find((p) => p.id === (params.get('rascunho') || params.get('base')));
  const ehRascunho = Boolean(params.get('rascunho') && origem);
  const ehNovaVersao = Boolean(params.get('base') && origem);
  const estado = origem
    ? structuredClone(origem)
    : { nome: '', descricao: '', unidades: [], atendente: true, identificacao: true, identificacaoObrigatoria: false, perguntas: [] };
  estado.unidades = unidadesDe(estado);
  delete estado.unidade;
  if (!ehRascunho) estado.id = proximoId();
  estado.escala = 5;   // escala única: 0 a 5 (a pedido do cliente); nova versão de uma pesquisa 0–10 também passa a 0–5
  estado.nps = estado.nps !== false;
  const notaDetrator = () => ESCALAS[estado.escala].detrator;
  let inicio = 2;   // número da 1ª pergunta extra: 2 com a nota, 1 sem ela
  estado.perguntas.forEach((q) => { q.uid = ++uid; q.opcoes = q.opcoes || ['', '']; });

  if (ehRascunho) {
    $('[data-sub-pagina]').innerHTML = `Rascunho criado em ${dataHora(origem.datas.criada)}${origem.datas.editada !== origem.datas.criada ? ` · salvo pela última vez em ${dataHora(origem.datas.editada)}` : ''}. Pode ser editado até ser publicado.`;
    $('[data-titulo-pagina]').textContent = 'Editar rascunho';
    $('[data-trilha-atual]').textContent = 'Rascunho';
    document.title = 'Editar rascunho — Opiina';
  } else if (origem) {
    $('[data-titulo-pagina]').textContent = 'Nova versão';
    $('[data-trilha-atual]').textContent = 'Nova versão';
    $('[data-sub-pagina]').textContent = `Baseada em "${origem.nome}" (${nomesUnidades(origem)}). A versão atual continua no ar até você publicar esta; aí ela é arquivada.`;
    document.title = 'Nova versão — Opiina';
  }

  // Campos fixos
  form.nome.value = estado.nome;
  form.descricao.value = estado.descricao;

  // Unidades: caixas de marcar (uma ou mais). Cada unidade marcada = um link próprio ao publicar.
  const caixasUnidades = $('[data-unidades-opcoes]');
  caixasUnidades.innerHTML = D.unidades.map((u) => `
    <label class="unidade-opcao"><input type="checkbox" name="unidades" value="${esc(u)}"${estado.unidades.includes(u) ? ' checked' : ''}><span>${icone('loja')}${esc(u)}</span></label>`).join('');
  const marcarTodas = $('[data-marcar-todas]');
  const selPrevia = $('[data-previa-unidade]');
  let unidadePrevia = estado.unidades[0] || '';
  function atualizarUnidades() {
    const todas = estado.unidades.length === D.unidades.length;
    marcarTodas.textContent = todas ? 'Desmarcar todas' : 'Marcar todas';
    // Links que cada unidade vai ganhar (a pesquisa ainda não tem link: aparece ao publicar)
    const caixaLinks = $('[data-unidades-links]');
    caixaLinks.hidden = !estado.unidades.length;
    caixaLinks.innerHTML = `<p class="unidades-links__titulo">${estado.unidades.length === 1 ? 'Link' : `${estado.unidades.length} links`} ao publicar:</p>
      <ul>${estado.unidades.map((u) => `<li><span>${esc(u)}</span><code>${esc(linkDa(estado, u).replace('https://', ''))}</code></li>`).join('')}</ul>`;
    // Prévia: com várias unidades, escolhe qual mostrar
    if (!estado.unidades.includes(unidadePrevia)) unidadePrevia = estado.unidades[0] || '';
    $('[data-previa-unidade-campo]').hidden = estado.unidades.length < 2;
    selPrevia.innerHTML = estado.unidades.map((u) => `<option${u === unidadePrevia ? ' selected' : ''}>${esc(u)}</option>`).join('');
  }
  atualizarUnidades();
  marcarTodas.addEventListener('click', () => {
    const marcar = estado.unidades.length !== D.unidades.length;
    $$('input', caixasUnidades).forEach((c) => { c.checked = marcar; });
    caixasUnidades.dispatchEvent(new Event('input', { bubbles: true }));
  });
  selPrevia.addEventListener('change', () => { unidadePrevia = selPrevia.value; cli.atendente = ''; desenharPrevia(); });
  form.atendente.checked = estado.atendente;
  form.identificacao.checked = estado.identificacao;
  form.identificacaoObrigatoria.checked = estado.identificacaoObrigatoria;
  D.premios.forEach((p) => form.premioId.add(new Option(p.nome, p.id)));
  // Sorteio em desenvolvimento: a chave fica desativada e nenhuma pesquisa sai com prêmio.
  // Para liberar, trocar para true e tirar o "disabled" da chave em pesquisa-nova.html.
  const SORTEIO_LIBERADO = false;
  if (!SORTEIO_LIBERADO) estado.premio = false;
  form.premio.checked = Boolean(estado.premio);
  form.premioId.value = estado.premioId || D.premios[0].id;
  estado.premioId = form.premioId.value;
  // Data do sorteio: guardada em dias a partir de hoje (como "criada"); o campo usa aaaa-mm-dd
  const isoDe = (dias) => { const d = diaRelativo(dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const diasAte = (iso) => iso ? Math.round((new Date(`${iso}T12:00`) - diaRelativo(0)) / 864e5) : null;
  form.sorteioData.min = isoDe(1);
  form.sorteioData.value = isoDe(estado.sorteioEm > 0 ? estado.sorteioEm : 30);
  estado.sorteioEm = diasAte(form.sorteioData.value);

  function ajustarIdentificacao() {
    // "Obrigar" e "prêmio" só fazem sentido se a identificação for pedida
    const pede = form.identificacao.checked;
    form.identificacaoObrigatoria.disabled = !pede;
    form.premio.disabled = !pede || !SORTEIO_LIBERADO;
    if (!pede) { form.identificacaoObrigatoria.checked = false; form.premio.checked = false; }
    $('[data-campo-premio]').hidden = !form.premio.checked;
  }
  ajustarIdentificacao();

  // Nota de recomendação ligada/desligada
  function ajustarNps() {
    inicio = estado.nps ? 2 : 1;
    $('[data-nps-corpo]').hidden = !estado.nps;
    $('[data-sem-nps]').hidden = estado.nps;
    $('[data-bloco-nps]').classList.toggle('pergunta--desligada', !estado.nps);
  }
  function atualizarSubPerguntas() {
    $('[data-sub-perguntas]').textContent = estado.nps
      ? `${contarPerguntas(estado)}. A primeira é a nota de recomendação (NPS).`
      : `${contarPerguntas(estado)}, sem nota de recomendação.`;
  }
  form.nps.checked = estado.nps;
  ajustarNps();

  // ----- Perguntas extras -----
  function htmlPergunta(q, i) {
    const total = estado.perguntas.length;
    const tipos = TIPOS.map((t) => `
      <label class="tipo"><input type="radio" name="tipo-${q.uid}" value="${t.valor}"${q.tipo === t.valor ? ' checked' : ''} data-campo="tipo">${icone(t.icone)}${t.nome}</label>`).join('');
    const opcoes = q.tipo !== 'escolha' ? '' : `
      <div class="campo">
        <span class="campo__rotulo" id="op-rotulo-${q.uid}">Opções de resposta</span>
        <div class="opcoes" role="group" aria-labelledby="op-rotulo-${q.uid}">
          ${q.opcoes.map((o, j) => `
            <div class="opcao"><span class="opcao__marca" aria-hidden="true"></span>
              <input type="text" value="${esc(o)}" placeholder="Opção ${j + 1}" aria-label="Opção ${j + 1}" data-campo="opcao" data-j="${j}"${q.erroOpcoes ? ` aria-invalid="true" aria-describedby="op-erro-${q.uid}"` : ''}>
              <button class="botao-icone" type="button" aria-label="Remover opção ${j + 1}" data-remover-opcao="${j}"${q.opcoes.length <= 2 ? ' disabled' : ''}>${icone('fechar')}</button></div>`).join('')}
        </div>
        ${q.erroOpcoes ? `<p class="campo__erro" id="op-erro-${q.uid}">Preencha pelo menos 2 opções.</p>` : ''}
        <button class="btn btn--fantasma" type="button" data-adicionar-opcao style="justify-self:start">${icone('mais')}Adicionar opção</button>
      </div>`;
    return `<div class="pergunta" data-uid="${q.uid}"${q.entrou ? ' data-entrou' : ''}>
      <div class="pergunta__topo">
        <span class="pergunta__num" aria-hidden="true">${i + inicio}</span>
        <h3 class="pergunta__rotulo">Pergunta ${i + inicio}</h3>
        <div class="pergunta__ferramentas">
          <button class="botao-icone" type="button" data-mover="-1" aria-label="Subir pergunta ${i + inicio}"${i === 0 ? ' disabled' : ''}>${icone('cima')}</button>
          <button class="botao-icone" type="button" data-mover="1" aria-label="Descer pergunta ${i + inicio}"${i === total - 1 ? ' disabled' : ''}>${icone('baixo')}</button>
          <button class="botao-icone" type="button" data-remover aria-label="Remover pergunta ${i + inicio}">${icone('lixeira')}</button>
        </div>
      </div>
      <div class="campo">
        <label for="titulo-${q.uid}">Pergunta <span class="obrigatorio" aria-hidden="true">*</span></label>
        <input id="titulo-${q.uid}" type="text" value="${esc(q.titulo)}" placeholder="Ex.: O que poderíamos melhorar?" data-campo="titulo" required${q.erroTitulo ? ` aria-invalid="true" aria-describedby="titulo-${q.uid}-erro"` : ''}>
        ${q.erroTitulo ? `<p class="campo__erro" id="titulo-${q.uid}-erro">Escreva a pergunta.</p>` : ''}
      </div>
      <fieldset class="tipos"><legend>Tipo de resposta</legend>${tipos}</fieldset>
      ${opcoes}
      <div class="chaves chaves--linha">
        <label class="chave"><input type="checkbox" data-campo="obrigatoria"${q.obrigatoria ? ' checked' : ''}><span class="chave__texto">Resposta obrigatória</span></label>
        <label class="chave"><input type="checkbox" data-campo="soDetratores"${q.soDetratores && estado.nps ? ' checked' : ''}${estado.nps ? '' : ' disabled'}><span class="chave__texto">Só para quem der nota 0 a ${notaDetrator()}${estado.nps ? '' : '<small>Precisa da nota de recomendação</small>'}</span></label>
      </div>
    </div>`;
  }

  function desenharPerguntas(focar) {
    listaPerguntas.innerHTML = estado.perguntas.map(htmlPergunta).join('');
    estado.perguntas.forEach((q) => { delete q.entrou; });
    atualizarSubPerguntas();
    if (focar) $(focar)?.focus();
  }

  const perguntaDo = (el) => estado.perguntas.find((q) => q.uid === Number(el.closest('[data-uid]').dataset.uid));

  listaPerguntas.addEventListener('input', (e) => {
    const campo = e.target.dataset.campo;
    if (!campo) return;
    const q = perguntaDo(e.target);
    if (campo === 'titulo') {
      q.titulo = e.target.value;
      if (q.erroTitulo && q.titulo.trim()) { delete q.erroTitulo; limparErro(e.target); }
    }
    if (campo === 'opcao') q.opcoes[Number(e.target.dataset.j)] = e.target.value;
    if (campo === 'obrigatoria' || campo === 'soDetratores') q[campo] = e.target.checked;
    if (campo === 'tipo') {
      q.tipo = e.target.value;
      delete q.erroOpcoes;
      desenharPerguntas(`[data-uid="${q.uid}"] input[value="${q.tipo}"]`);   // mostra/esconde as opções
    }
    marcarAlterado();
  });

  listaPerguntas.addEventListener('click', (e) => {
    const alvo = e.target.closest('button');
    if (!alvo || !alvo.closest('[data-uid]')) return;
    const q = perguntaDo(alvo);
    const i = estado.perguntas.indexOf(q);
    if (alvo.hasAttribute('data-mover')) {
      const passo = Number(alvo.dataset.mover);
      estado.perguntas.splice(i, 1);
      estado.perguntas.splice(i + passo, 0, q);
      // O foco segue a pergunta; se o botão ficou desativado (chegou na ponta), vai para o outro
      const outro = passo < 0 ? 1 : -1;
      const fim = i + passo === 0 || i + passo === estado.perguntas.length - 1;
      desenharPerguntas(`[data-uid="${q.uid}"] [data-mover="${fim ? outro : passo}"]`);
      avisar(`Pergunta movida para a posição ${i + passo + inicio}`);
    } else if (alvo.hasAttribute('data-remover')) {
      estado.perguntas.splice(i, 1);
      desenharPerguntas('[data-adicionar]');
      avisar('Pergunta removida');
    } else if (alvo.hasAttribute('data-adicionar-opcao')) {
      q.opcoes.push('');
      desenharPerguntas(`[data-uid="${q.uid}"] [data-j="${q.opcoes.length - 1}"]`);
    } else if (alvo.hasAttribute('data-remover-opcao')) {
      q.opcoes.splice(Number(alvo.dataset.removerOpcao), 1);
      desenharPerguntas(`[data-uid="${q.uid}"] [data-adicionar-opcao]`);
    } else return;
    marcarAlterado();
  });

  function adicionarPergunta(titulo = '') {
    const q = { uid: ++uid, titulo, tipo: 'texto', obrigatoria: false, soDetratores: false, opcoes: ['', ''], entrou: true };
    estado.perguntas.push(q);
    desenharPerguntas(`#titulo-${q.uid}`);
    marcarAlterado();
  }
  $('[data-adicionar]').addEventListener('click', () => adicionarPergunta());
  $$('[data-sugestao]').forEach((b) => b.addEventListener('click', () => adicionarPergunta(b.textContent.trim())));

  // ----- Campos fixos e chaves -----
  form.addEventListener('input', (e) => {
    const nome = e.target.name || (e.target === caixasUnidades ? 'unidades' : '');
    if (!nome) return;
    if (nome === 'unidades') {
      estado.unidades = $$('input:checked', caixasUnidades).map((c) => c.value);   // na ordem do cadastro
      if (estado.unidades.length) $('#unidades-erro').hidden = true;
      atualizarUnidades();
    }
    if (['nome', 'descricao'].includes(nome)) {
      estado[nome] = e.target.value;
      if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) limparErro(e.target);
    }
    if (nome === 'nps') {
      estado.nps = e.target.checked;
      ajustarNps();
      desenharPerguntas();   // renumera e liga/desliga "Só para quem der nota baixa"
    }
    if (nome === 'sorteioData') {
      estado.sorteioEm = diasAte(form.sorteioData.value);
      if (estado.sorteioEm > 0) limparErro(form.sorteioData);
    }
    if (['atendente', 'identificacao', 'identificacaoObrigatoria', 'premio', 'premioId'].includes(nome)) {
      ajustarIdentificacao();
      estado.atendente = form.atendente.checked;
      estado.identificacao = form.identificacao.checked;
      estado.identificacaoObrigatoria = form.identificacaoObrigatoria.checked;
      estado.premio = form.premio.checked;
      estado.premioId = form.premioId.value;
    }
    marcarAlterado();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  // ----- Prévia interativa (como o cliente vê) -----
  // Dá para responder como o cliente: escolher nota, digitar, enviar e se cadastrar no pop-up.
  // As respostas ficam só na prévia (objeto "cli"): não entram na pesquisa nem são enviadas.
  const celular = $('.celular');
  const telaPrevia = $('.celular__tela');
  const pop = $('[data-previa-pop]');
  const verCadastro = $('[data-ver-cadastro]');
  let previaAnterior = new Set();
  const novoCliente = () => ({ tela: 'pesquisa', nota: null, atendente: '', resp: {}, falta: false,
    contato: { nome: '', contato: '', nascimento: '', aceite: false }, erros: {}, cadastrou: false });
  // Como na pesquisa real: com "Pedir nome e contato", começa pelo cadastro (pedido do cliente, 2026-10-14)
  const inicioPrevia = () => ({ ...novoCliente(), tela: estado.identificacao ? 'contato' : 'pesquisa' });
  let cli = inicioPrevia();
  const respondida = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  // Pergunta "só para nota baixa": some quando o cliente dá uma nota acima do limite
  const aparece = (q) => !(q.soDetratores && estado.nps && cli.nota !== null && cli.nota > notaDetrator());
  const atendentes = () => D.atendentes[unidadePrevia || D.unidades[0]];

  // Botão de resposta: data-foco devolve o foco ao mesmo botão depois de redesenhar
  const opcao = (chave, valor, conteudo, marcado, extra = '') =>
    `<button type="button" class="cli__opcao" data-chave="${chave}" data-valor="${valor}" data-foco="${chave}-${valor}" aria-pressed="${marcado}"${extra}>${conteudo}</button>`;

  function htmlResposta(q) {
    const v = cli.resp[q.uid];
    const k = `q${q.uid}`;
    const grupo = (classe, html) => `<div class="${classe}" role="group" aria-labelledby="cli-t-${q.uid}">${html}</div>`;
    switch (q.tipo) {
      case 'nota10': return grupo('cli__escala cli__escala--10', Array.from({ length: 10 }, (_, n) => opcao(k, n + 1, n + 1, v === n + 1)).join(''));
      case 'polegar': return grupo('cli__polegares',
        opcao(k, 'sim', icone('polegar'), v === 'sim', ' aria-label="Gostei"') + opcao(k, 'nao', icone('polegar'), v === 'nao', ' aria-label="Não gostei"'));
      case 'estrelas': return grupo('cli__estrelas', [1, 2, 3, 4, 5].map((n) =>
        opcao(k, n, icone(v >= n ? 'estrela-cheia' : 'estrela'), v === n, ` aria-label="${n} estrela${n > 1 ? 's' : ''}"`)).join(''));
      case 'escolha': {
        const opcoes = q.opcoes.filter((o) => o.trim());
        return grupo('cli__opcoes', (opcoes.length ? opcoes : ['Opção 1', 'Opção 2']).map((o, i) => opcao(k, i, esc(o), v === i)).join(''));
      }
      default: return `<textarea class="cli__caixa" rows="3" data-texto="${q.uid}" aria-labelledby="cli-t-${q.uid}" placeholder="Escreva aqui">${esc(v || '')}</textarea>`;
    }
  }

  const htmlFalta = (falta) => falta ? '<p class="cli__erro">Responda esta pergunta.</p>' : '';

  function htmlPesquisa() {
    const faltaNota = cli.falta && estado.nps && cli.nota === null;
    const extras = estado.perguntas.filter(aparece).map((q) => {
      const falta = cli.falta && q.obrigatoria && !respondida(cli.resp[q.uid]);
      return `
      <div class="cli__q${falta ? ' cli__q--falta' : ''}"${previaAnterior.has(q.uid) ? '' : ' data-novo'}>
        ${q.soDetratores && estado.nps ? `<span class="cli__condicao">Só aparece para notas de 0 a ${notaDetrator()}</span>` : ''}
        <p class="cli__q-titulo" id="cli-t-${q.uid}">${q.titulo.trim() ? esc(q.titulo) : '<span class="cli__vazio">Sua pergunta aparece aqui</span>'}${q.obrigatoria ? '<span class="obrigatorio" aria-label="obrigatória">*</span>' : ''}</p>
        ${htmlResposta(q)}
        ${htmlFalta(falta)}
      </div>`;
    }).join('');
    previaAnterior = new Set(estado.perguntas.map((q) => q.uid));
    return `
      <div class="cli__marca"><img src="../assets/icons/logo-opiina-64.png" alt="">${esc(D.empresa)}${unidadePrevia ? ` · ${esc(unidadePrevia)}` : ''}</div>
      <div>
        <p class="cli__titulo">${estado.nome.trim() ? esc(estado.nome) : '<span class="cli__vazio">Nome da pesquisa</span>'}</p>
        ${estado.descricao.trim() ? `<p class="cli__desc">${esc(estado.descricao)}</p>` : ''}
      </div>
      ${estado.nps ? `<div class="cli__q${faltaNota ? ' cli__q--falta' : ''}">
        <p class="cli__q-titulo" id="cli-t-nps">${perguntaNps(estado.escala)}<span class="obrigatorio" aria-label="obrigatória">*</span></p>
        <div class="cli__escala${estado.escala === 5 ? ' cli__escala--6' : ''}" role="group" aria-labelledby="cli-t-nps">${Array.from({ length: estado.escala + 1 }, (_, n) => opcao('nps', n, n, cli.nota === n)).join('')}</div>
        <div class="cli__escala-legenda" aria-hidden="true"><span>Nada provável</span><span>Muito provável</span></div>
        ${htmlFalta(faltaNota)}
      </div>` : ''}
      ${estado.atendente ? `<div class="cli__q"><label class="cli__q-titulo" for="cli-atendente">Quem te atendeu? <span class="cli-pop__opcional">(opcional)</span></label>
        <select class="cli__campo" id="cli-atendente" data-atendente><option value="">Escolha o atendente</option>${atendentes().map((a) => `<option${cli.atendente === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}<option value="nao-lembro"${cli.atendente === 'nao-lembro' ? ' selected' : ''}>Não lembro</option></select></div>` : ''}
      ${extras}
      ${cli.falta ? '<p class="cli__erro cli__erro--geral" role="alert">Responda as perguntas marcadas com *.</p>' : ''}
      ${cli.aviso ? `<p class="cli__aviso" role="status">${icone('ok')}${esc(cli.aviso)}</p>` : ''}
      <button type="button" class="cli__enviar" data-cli="enviar" data-foco="enviar">Enviar</button>
      ${estado.identificacao && !cli.cadastrou ? '<button type="button" class="cli-pop__depois" data-cli="ver-cadastro" data-foco="ver-cadastro">Quero me cadastrar</button>' : ''}`;
  }

  // Pop-up de cadastro: abre junto com a pesquisa (antes das perguntas). Opcional por padrão;
  // obrigatório com "Tornar obrigatório" (sem botão de pular). O aceite de ofertas é separado e opcional (LGPD).
  // Na prévia, qualquer saída (Cadastrar, Responder sem cadastro, clicar fora, Esc) leva às perguntas.
  function htmlPop() {
    const obrigatorio = estado.identificacaoObrigatoria;
    const premio = estado.premio && D.premios.find((p) => p.id === estado.premioId);
    const data = estado.sorteioEm > 0 ? diaRelativo(estado.sorteioEm).toLocaleDateString('pt-BR') : null;
    const c = cli.contato;
    const erro = (campo) => cli.erros[campo] ? `<p class="cli__erro" id="cli-${campo}-erro">${cli.erros[campo]}</p>` : '';
    const invalido = (campo) => cli.erros[campo] ? ` aria-invalid="true" aria-describedby="cli-${campo}-erro"` : '';
    return `
      <div class="cli-pop__fundo" data-cli="voltar"></div>
      <div class="cli-pop__folha" role="dialog" aria-modal="true" aria-labelledby="cli-pop-titulo" aria-describedby="cli-pop-texto">
        <span class="cli-pop__selo${obrigatorio ? ' cli-pop__selo--obrigatorio' : ''}">${obrigatorio ? 'Obrigatório' : 'Opcional'}</span>
        <h3 class="cli-pop__titulo" id="cli-pop-titulo" tabindex="-1">${obrigatorio ? 'Antes de começar, deixe seus dados' : 'Antes de começar: quer se cadastrar?'}</h3>
        <p class="cli-pop__texto" id="cli-pop-texto">${obrigatorio
          ? `Para responder a pesquisa, a ${esc(D.empresa)} precisa do seu nome e contato.`
          : '<strong>O cadastro é opcional</strong> e leva menos de 1 minuto. Se preferir, responda direto.'}</p>
        ${premio ? `<div class="cli__premio"><span class="cli__premio-rotulo">${icone('premios')}Concorra a</span><strong>${esc(premio.nome)}</strong><span>${esc(premio.detalhe)}${data ? ` · Sorteio em ${data}` : ''}</span></div>` : ''}
        ${premio ? '' : `<div class="cli-pop__porque">
          <p class="cli-pop__porque-titulo">Por que se cadastrar?</p>
          <ul>
            <li><span class="cli-pop__porque-icone cli-pop__porque-icone--premio" aria-hidden="true">${icone('premios')}</span>
              <span><strong>Prêmios para clientes cadastrados <span class="cli-pop__embreve">Em breve</span></strong>
              Quem se cadastra vai concorrer a prêmios da ${esc(D.empresa)}.</span></li>
          </ul>
        </div>`}
        <div class="cli-pop__campo"><label for="cli-nome">Nome</label>
          <input class="cli__campo" id="cli-nome" data-contato="nome" autocomplete="name" value="${esc(c.nome)}"${invalido('nome')}>${erro('nome')}</div>
        <div class="cli-pop__campo"><label for="cli-contato">WhatsApp ou e-mail</label>
          <input class="cli__campo" id="cli-contato" data-contato="contato" value="${esc(c.contato)}"${invalido('contato')}>${erro('contato')}</div>
        <div class="cli-pop__campo"><label for="cli-nascimento">Data de nascimento <span class="cli-pop__opcional">(opcional)</span></label>
          <input class="cli__campo" type="date" id="cli-nascimento" data-contato="nascimento" autocomplete="bday" max="${isoDe(0)}" value="${esc(c.nascimento)}"></div>
        <label class="cli__aceite"><input type="checkbox" data-contato="aceite"${c.aceite ? ' checked' : ''}>Aceito receber novidades e ofertas da ${esc(D.empresa)} (opcional)</label>
        <div class="cli-pop__acoes">
          <button type="button" class="cli__enviar" data-cli="cadastrar">${obrigatorio ? 'Continuar' : 'Cadastrar e responder'}</button>
          ${obrigatorio ? '' : '<button type="button" class="cli-pop__depois" data-cli="agora-nao">Responder sem cadastro</button>'}
        </div>
      </div>`;
  }

  function htmlFim() {
    const nome = cli.cadastrou ? cli.contato.nome.trim().split(/\s+/)[0] : '';
    return `
      <div class="cli__fim">
        <span class="cli__fim-icone" aria-hidden="true">${icone('ok')}</span>
        <h3 class="cli__titulo" tabindex="-1" data-fim>Obrigado${nome ? `, ${esc(nome)}` : ''}!</h3>
        <p class="cli__desc">Sua avaliação foi enviada.${cli.cadastrou ? ' Seu cadastro também.' : ''}</p>
        <button type="button" class="cli-pop__depois" data-cli="refazer">Responder de novo</button>
      </div>`;
  }

  function desenharPrevia() {
    const foco = celular.contains(document.activeElement) ? document.activeElement.dataset.foco : null;
    if (cli.tela === 'contato' && !estado.identificacao) cli.tela = 'pesquisa';   // desligou "Pedir nome e contato"
    previa.innerHTML = cli.tela === 'fim' ? htmlFim() : htmlPesquisa();
    const comPop = cli.tela === 'contato';
    pop.hidden = !comPop;
    pop.innerHTML = comPop ? htmlPop() : '';
    telaPrevia.inert = comPop;
    // Atalho "Ver pop-up de cadastro": só funciona se a pesquisa pede contato
    verCadastro.disabled = !estado.identificacao;
    $('[data-ver-cadastro-dica]').hidden = estado.identificacao;
    if (foco) previa.querySelector(`[data-foco="${foco}"]`)?.focus();
  }

  // Envio da prévia: confere as obrigatórias e abre o cadastro (se a pesquisa pede contato)
  function enviarPrevia() {
    const faltaNota = estado.nps && cli.nota === null;
    const faltaExtra = estado.perguntas.some((q) => aparece(q) && q.obrigatoria && !respondida(cli.resp[q.uid]));
    if (faltaNota || faltaExtra) {
      cli.falta = true;
      desenharPrevia();
      const primeira = $('.cli__q--falta', previa);
      primeira?.scrollIntoView({ block: 'center' });
      $('button, textarea, select', primeira)?.focus();
      return;
    }
    cli.falta = false;
    cli.aviso = '';
    cli.tela = 'fim';   // o cadastro já foi oferecido na abertura
    desenharPrevia();
    $('[data-fim]', previa)?.focus();
  }

  function cadastrarPrevia() {
    const c = cli.contato;
    const contato = c.contato.trim();
    cli.erros = {};
    if (!c.nome.trim()) cli.erros.nome = 'Escreva seu nome.';
    if (!contato) cli.erros.contato = 'Informe seu WhatsApp ou e-mail.';
    else if (!(/^\S+@\S+\.\S+$/.test(contato) || contato.replace(/\D/g, '').length >= 10)) cli.erros.contato = 'Confira: e-mail (nome@exemplo.com) ou WhatsApp com DDD.';
    if (Object.keys(cli.erros).length) {
      desenharPrevia();
      $(`#cli-${cli.erros.nome ? 'nome' : 'contato'}`, pop).focus();
      return;
    }
    cli.cadastrou = true;
    voltarPerguntas(`Cadastro feito, ${c.nome.trim().split(/\s+/)[0]}! Agora é só responder. (teste)`);
  }

  // Fechar o pop-up (Cadastrar, Agora não, clicar fora ou Esc): volta para as perguntas,
  // com as respostas mantidas (pedido do cliente: a prévia não vai para o "Obrigado").
  function voltarPerguntas(aviso = '') {
    cli.tela = 'pesquisa';
    cli.erros = {};
    cli.aviso = aviso;
    desenharPrevia();
    telaPrevia.scrollTop = 0;
    $('button, textarea, select', previa)?.focus();   // começo das perguntas
  }

  celular.addEventListener('click', (e) => {
    const escolha = e.target.closest('[data-chave]');
    if (escolha) {
      const valor = Number.isNaN(Number(escolha.dataset.valor)) ? escolha.dataset.valor : Number(escolha.dataset.valor);
      if (escolha.dataset.chave === 'nps') cli.nota = valor;
      else cli.resp[escolha.dataset.chave.slice(1)] = valor;
      desenharPrevia();
      return;
    }
    const acao = e.target.closest('[data-cli]')?.dataset.cli;
    if (acao === 'enviar') enviarPrevia();
    if (acao === 'cadastrar') cadastrarPrevia();
    if (acao === 'agora-nao' || acao === 'voltar') voltarPerguntas();
    if (acao === 'refazer') {
      cli = inicioPrevia();
      desenharPrevia();
      (cli.tela === 'contato' ? $('#cli-pop-titulo', pop) : $('button, textarea, select', previa))?.focus();
    }
    if (acao === 'ver-cadastro') verCadastro.click();
  });
  // Atalho: abre o cadastro direto, sem precisar responder a pesquisa
  verCadastro.addEventListener('click', () => {
    cli.falta = false;
    cli.erros = {};
    cli.aviso = '';
    cli.tela = 'contato';
    desenharPrevia();
    $('#cli-pop-titulo', pop).focus();
  });
  // Digitar não redesenha a prévia (não perde o foco nem o cursor)
  celular.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.texto) cli.resp[t.dataset.texto] = t.value;
    if (t.matches('[data-atendente]')) cli.atendente = t.value;
    if (t.dataset.contato) cli.contato[t.dataset.contato] = t.type === 'checkbox' ? t.checked : t.value;
  });
  pop.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    voltarPerguntas();
  });

  // ----- Estado "alterado" e barra de ações -----
  const statusBarra = $('[data-barra-status]');
  function marcarAlterado() {
    alterado = true;
    statusBarra.textContent = 'Alterações não salvas';
    if (cli.tela === 'fim') { cli.tela = 'pesquisa'; telaPrevia.scrollTop = 0; }   // mudou a pesquisa depois do "Obrigado": volta às perguntas (as respostas ficam)
    desenharPrevia();
  }

  // ----- Validação -----
  function limparErro(campo) {
    campo.removeAttribute('aria-invalid');
    const erro = document.getElementById(`${campo.id}-erro`);
    if (erro) erro.hidden = true;
  }
  function marcarErro(campo) {
    campo.setAttribute('aria-invalid', 'true');
    const erro = document.getElementById(`${campo.id}-erro`);
    if (erro) erro.hidden = false;
  }
  function validar({ completo }) {
    let primeiro = null;
    const falhou = (el) => { primeiro = primeiro || el; };
    if (!estado.nome.trim()) { marcarErro(form.nome); falhou(form.nome); }
    if (completo) {
      if (!estado.unidades.length) { $('#unidades-erro').hidden = false; falhou($('input', caixasUnidades)); }
      if (estado.identificacao && estado.premio && !(estado.sorteioEm > 0)) { marcarErro(form.sorteioData); falhou(form.sorteioData); }
      estado.perguntas.forEach((q) => {
        q.erroTitulo = !q.titulo.trim();
        q.erroOpcoes = q.tipo === 'escolha' && q.opcoes.filter((o) => o.trim()).length < 2;
        if (!q.erroTitulo) delete q.erroTitulo;
        if (!q.erroOpcoes) delete q.erroOpcoes;
      });
      desenharPerguntas();
      const q = estado.perguntas.find((x) => x.erroTitulo || x.erroOpcoes);
      if (q) falhou($(q.erroTitulo ? `#titulo-${q.uid}` : `[data-uid="${q.uid}"] [data-j]`));
    }
    // Sem a nota e sem perguntas extras, a pesquisa ficaria vazia
    const vazia = completo && !estado.nps && !estado.perguntas.length;
    if (vazia && !primeiro) {
      statusBarra.textContent = 'Adicione pelo menos uma pergunta ou volte a incluir a nota de recomendação.';
      const botao = $('[data-adicionar]');
      botao.focus();
      botao.scrollIntoView({ block: 'center' });
      return false;
    }
    if (primeiro) {
      const n = $$('.campo__erro:not([hidden])', form).length + (vazia ? 1 : 0);   // conta erros, não campos (as opções são vários campos e um erro só)
      statusBarra.textContent = `Corrija ${n === 1 ? 'o item destacado' : `os ${n} itens destacados`} para continuar.`;
      primeiro.focus();
      primeiro.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    return !primeiro;
  }

  function guardar(status) {
    const registro = {
      id: estado.id, nome: estado.nome.trim(), descricao: estado.descricao.trim(), unidades: [...estado.unidades],
      status, criada: 0, respostas: 0, escala: estado.escala,
      datas: {
        criada: ehRascunho ? origem.datas.criada : Date.now(),
        editada: Date.now(),
        publicada: status === 'publicada' ? Date.now() : null,
        arquivada: null,
      },
      premio: estado.identificacao && estado.premio, premioId: estado.premioId, sorteioEm: estado.sorteioEm,
      nps: estado.nps, atendente: estado.atendente, identificacao: estado.identificacao, identificacaoObrigatoria: estado.identificacaoObrigatoria,
      perguntas: estado.perguntas.map(({ titulo, tipo, obrigatoria, soDetratores, opcoes }) => ({
        titulo: titulo.trim(), tipo, obrigatoria, soDetratores: soDetratores && estado.nps,...(tipo === 'escolha' ? { opcoes: opcoes.filter((o) => o.trim()) } : {}),
      })),
    };
    const i = pesquisas.findIndex((p) => p.id === registro.id);
    if (i >= 0) pesquisas[i] = registro; else pesquisas.push(registro);
    // Nova versão publicada substitui a anterior: a antiga é arquivada (respostas guardadas)
    if (status === 'publicada' && ehNovaVersao && origem.status === 'publicada') origem.status = 'arquivada';
    salvarPesquisas(pesquisas);
    alterado = false;
    location.href = `pesquisas.html?nova=${registro.id}&msg=${status}`;
  }

  $('[data-salvar-rascunho]').addEventListener('click', () => {
    if (validar({ completo: false })) guardar('rascunho');
  });
  // Publicar: aviso de que não dá mais para editar + resumo para revisar. O botão só libera
  // depois de marcar "Revisei" (pedido do cliente, 2026-10-14). "Voltar e revisar" leva ao começo do formulário.
  $('[data-publicar]').addEventListener('click', async () => {
    if (!validar({ completo: true })) return;
    const linha = (rotulo, valor) => `<span class="revisar__item"><span>${rotulo}</span><strong>${valor}</strong></span>`;
    const ok = await confirmar({
      titulo: 'Tem certeza de que já pode publicar?',
      texto: `Depois de publicada, <strong>a pesquisa não pode mais ser editada</strong>. Revise antes, inclusive na prévia "Como o cliente vê":
        <span class="revisar">
          ${linha('Nome', esc(estado.nome.trim()))}
          ${linha(estado.unidades.length > 1 ? 'Unidades' : 'Unidade', `${esc(estado.unidades.join(', '))}${estado.unidades.length > 1 ? ` (${estado.unidades.length} links, um por unidade)` : ''}`)}
          ${linha('Perguntas', `${contarPerguntas(estado)}${estado.nps ? ', com nota de 0 a 5' : ', sem nota de recomendação'}`)}
          ${linha('Atendente', estado.atendente ? 'Pergunta "Quem te atendeu?"' : 'Não pergunta')}
          ${linha('Contato do cliente', estado.identificacao ? (estado.identificacaoObrigatoria ? 'Pede, obrigatório' : 'Pede, opcional') : 'Não pede')}
        </span>${ehNovaVersao && origem.status === 'publicada' ? ' A versão anterior será arquivada (as respostas dela continuam guardadas).' : ''}`,
      botao: 'Publicar', icone: 'alerta', botaoVoltar: 'Voltar e revisar',
      exigir: 'Revisei a pesquisa e a prévia. Está tudo certo.',
    });
    if (ok) return guardar('publicada');
    // Voltar e revisar: começo do formulário, com o recado na barra
    statusBarra.textContent = 'Revise as 3 etapas e a prévia ao lado. Quando estiver tudo certo, clique em Publicar.';
    const topo = $('#p1');
    topo.setAttribute('tabindex', '-1');
    topo.focus();
    topo.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // Apagar o rascunho de dentro do editor
  const apagarRascunho = $('[data-apagar-rascunho]');
  apagarRascunho.hidden = !ehRascunho;
  apagarRascunho.addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: 'Apagar este rascunho?',
      texto: `<strong>${esc(origem.nome)}</strong> será apagado. Não dá para desfazer.`,
      botao: 'Apagar', perigo: true, icone: 'lixeira',
    });
    if (!ok) return apagarRascunho.focus();
    pesquisas.splice(pesquisas.indexOf(origem), 1);
    salvarPesquisas(pesquisas);
    alterado = false;
    location.href = 'pesquisas.html?msg=apagada';
  });

  $('[data-cancelar]').addEventListener('click', async (e) => {
    if (!alterado) return;   // nada a perder: segue o link
    e.preventDefault();
    const destino = e.currentTarget.href;   // lido antes do await (depois dele, currentTarget fica vazio)
    const ok = await confirmar({
      titulo: 'Sair sem salvar?',
      texto: 'As alterações desta pesquisa serão perdidas. Para guardar e continuar depois, use "Salvar rascunho".',
      botao: 'Sair sem salvar', perigo: true,
    });
    if (ok) { alterado = false; location.href = destino; }
    else $('[data-cancelar]').focus();
  });

  desenharPerguntas();
  desenharPrevia();
}
