// Opiina — pesquisa pública (protótipo): o que o cliente vê ao abrir o link ou o QR Code da unidade.
// Mesmo visual da prévia do editor ("Como o cliente vê"), com o fluxo real (pedido do cliente, 2026-10-14):
// abre com o cadastro em pop-up (se a pesquisa pede contato) → perguntas → Enviar → "Obrigado".
// Independente do painel (sem login, sem menu, sempre claro). Nada é enviado.

const D = window.OPIINA_DEMO;
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icone = (nome) => `<svg class="icone" aria-hidden="true"><use href="icones.svg#${nome}"/></svg>`;
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const DETRATOR = { 10: 6, 5: 3 };   // nota máxima de detrator por escala (igual ao editor)

const raiz = $('[data-pub]');
const tela = $('[data-pub-tela]');
const pop = $('[data-pub-pop]');

// ----- Qual pesquisa e qual unidade (?p=pq-12&u=centro) -----
const params = new URLSearchParams(location.search);
const pesquisas = (() => {
  try { const s = JSON.parse(sessionStorage.getItem('opiina-demo-pesquisas')); if (Array.isArray(s)) return s; } catch { /* usa os exemplos */ }
  return D.pesquisas;
})();
const pesquisa = pesquisas.find((p) => p.id.toLowerCase() === (params.get('p') || '').toLowerCase());
const unidadesDa = (p) => p.unidades || (p.unidade ? [p.unidade] : []);
const unidade = pesquisa && (unidadesDa(pesquisa).find((u) => slug(u) === (params.get('u') || '').toLowerCase())
  || (!params.get('u') && unidadesDa(pesquisa).length === 1 ? unidadesDa(pesquisa)[0] : null));

function mensagem(icn, titulo, texto) {
  document.title = `${titulo} — ${D.empresa}`;
  raiz.innerHTML = `
    <div class="cli__marca"><img src="../assets/icons/logo-opiina-64.png" alt="">${esc(D.empresa)}</div>
    <div class="cli__fim">
      <span class="cli__fim-icone pub__aviso-icone" aria-hidden="true">${icone(icn)}</span>
      <h1 class="cli__titulo">${titulo}</h1>
      <p class="cli__desc">${texto}</p>
    </div>`;
}

if (!pesquisa || !unidade) {
  mensagem('alerta', 'Pesquisa não encontrada', 'Confira o link ou aponte a câmera de novo para o QR Code. Se não der certo, avise a equipe da casa.');
} else if (pesquisa.status === 'arquivada') {
  mensagem('relogio', 'Esta pesquisa foi encerrada', `A ${esc(D.empresa)} não está mais recebendo respostas por este link. Obrigado pelo interesse!`);
} else if (pesquisa.status !== 'publicada') {
  mensagem('relogio', 'Esta pesquisa ainda não está no ar', 'Ela ainda está sendo preparada. Tente de novo mais tarde.');
} else {
  iniciarPesquisa();
}

function iniciarPesquisa() {
  const p = pesquisa;
  const temNota = p.nps !== false;
  const escala = p.escala === 5 ? 5 : 10;
  const perguntas = p.perguntas.map((q, i) => ({ ...q, uid: i + 1, opcoes: (q.opcoes || []).filter((o) => o.trim()) }));
  const atendentes = D.atendentes[unidade] || [];
  document.title = `${p.nome} — ${D.empresa} ${unidade}`;

  // Com "Pedir nome e contato", a pesquisa já abre no cadastro
  const r = { tela: p.identificacao ? 'contato' : 'pesquisa', aviso: '', nota: null, atendente: '', resp: {}, falta: false,
    contato: { nome: '', contato: '', nascimento: '', aceite: false }, erros: {}, cadastrou: false };
  const respondida = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  const aparece = (q) => !(q.soDetratores && temNota && r.nota !== null && r.nota > DETRATOR[escala]);
  const opcao = (chave, valor, conteudo, marcado, extra = '') =>
    `<button type="button" class="cli__opcao" data-chave="${chave}" data-valor="${valor}" data-foco="${chave}-${valor}" aria-pressed="${marcado}"${extra}>${conteudo}</button>`;

  function htmlResposta(q) {
    const v = r.resp[q.uid];
    const k = `q${q.uid}`;
    const grupo = (classe, html) => `<div class="${classe}" role="group" aria-labelledby="t-${q.uid}">${html}</div>`;
    switch (q.tipo) {
      case 'nota10': return grupo('cli__escala cli__escala--10', Array.from({ length: 10 }, (_, n) => opcao(k, n + 1, n + 1, v === n + 1)).join(''));
      case 'polegar': return grupo('cli__polegares',
        opcao(k, 'sim', icone('polegar'), v === 'sim', ' aria-label="Gostei"') + opcao(k, 'nao', icone('polegar'), v === 'nao', ' aria-label="Não gostei"'));
      case 'estrelas': return grupo('cli__estrelas', [1, 2, 3, 4, 5].map((n) =>
        opcao(k, n, icone(v >= n ? 'estrela-cheia' : 'estrela'), v === n, ` aria-label="${n} estrela${n > 1 ? 's' : ''}"`)).join(''));
      case 'escolha': return grupo('cli__opcoes', q.opcoes.map((o, i) => opcao(k, i, esc(o), v === i)).join(''));
      default: return `<textarea class="cli__caixa" rows="3" data-texto="${q.uid}" aria-labelledby="t-${q.uid}" placeholder="Escreva aqui">${esc(v || '')}</textarea>`;
    }
  }
  const htmlFalta = (falta) => (falta ? '<p class="cli__erro">Responda esta pergunta.</p>' : '');

  function htmlPesquisa() {
    const faltaNota = r.falta && temNota && r.nota === null;
    return `
      <div class="cli__marca"><img src="../assets/icons/logo-opiina-64.png" alt="">${esc(D.empresa)} · ${esc(unidade)}</div>
      <div>
        <h1 class="cli__titulo">${esc(p.nome)}</h1>
        ${p.descricao?.trim() ? `<p class="cli__desc">${esc(p.descricao)}</p>` : ''}
      </div>
      ${temNota ? `<div class="cli__q${faltaNota ? ' cli__q--falta' : ''}">
        <p class="cli__q-titulo" id="t-nps">De 0 a ${escala}, o quanto você nos recomendaria a um amigo?<span class="obrigatorio" aria-label="obrigatória">*</span></p>
        <div class="cli__escala${escala === 5 ? ' cli__escala--6' : ''}" role="group" aria-labelledby="t-nps">${Array.from({ length: escala + 1 }, (_, n) => opcao('nps', n, n, r.nota === n)).join('')}</div>
        <div class="cli__escala-legenda" aria-hidden="true"><span>Nada provável</span><span>Muito provável</span></div>
        ${htmlFalta(faltaNota)}
      </div>` : ''}
      ${p.atendente && atendentes.length ? `<div class="cli__q"><label class="cli__q-titulo" for="atendente">Quem te atendeu? <span class="cli-pop__opcional">(opcional)</span></label>
        <select class="cli__campo" id="atendente" data-atendente><option value="">Escolha o atendente</option>${atendentes.map((a) => `<option${r.atendente === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}<option value="nao-lembro"${r.atendente === 'nao-lembro' ? ' selected' : ''}>Não lembro</option></select></div>` : ''}
      ${perguntas.filter(aparece).map((q) => {
        const falta = r.falta && q.obrigatoria && !respondida(r.resp[q.uid]);
        return `<div class="cli__q${falta ? ' cli__q--falta' : ''}">
          <p class="cli__q-titulo" id="t-${q.uid}">${esc(q.titulo)}${q.obrigatoria ? '<span class="obrigatorio" aria-label="obrigatória">*</span>' : ''}</p>
          ${htmlResposta(q)}
          ${htmlFalta(falta)}
        </div>`;
      }).join('')}
      ${r.falta ? '<p class="cli__erro cli__erro--geral" role="alert">Responda as perguntas marcadas com *.</p>' : ''}
      ${r.aviso ? `<p class="cli__aviso" role="status">${icone('ok')}${esc(r.aviso)}</p>` : ''}
      <button type="button" class="cli__enviar" data-acao="enviar" data-foco="enviar">Enviar</button>
      ${p.identificacao && !r.cadastrou ? '<button type="button" class="cli-pop__depois" data-acao="abrir-cadastro" data-foco="abrir-cadastro">Quero me cadastrar</button>' : ''}`;
  }

  // Cadastro, logo ao abrir. Opcional: "Responder sem cadastro" (ou tocar fora / Esc) vai para as perguntas.
  // Com "Tornar obrigatório": só segue com nome e contato (sem botão de pular).
  function htmlPop() {
    const obrigatorio = p.identificacaoObrigatoria;
    const c = r.contato;
    const erro = (campo) => (r.erros[campo] ? `<p class="cli__erro" id="${campo}-erro">${r.erros[campo]}</p>` : '');
    const invalido = (campo) => (r.erros[campo] ? ` aria-invalid="true" aria-describedby="${campo}-erro"` : '');
    return `
      <div class="cli-pop__fundo"${obrigatorio ? '' : ' data-acao="pular"'}></div>
      <div class="cli-pop__folha" role="dialog" aria-modal="true" aria-labelledby="pop-titulo" aria-describedby="pop-texto">
        <span class="cli-pop__selo${obrigatorio ? ' cli-pop__selo--obrigatorio' : ''}">${obrigatorio ? 'Obrigatório' : 'Opcional'}</span>
        <h2 class="cli-pop__titulo" id="pop-titulo" tabindex="-1">${obrigatorio ? 'Antes de começar, deixe seus dados' : 'Antes de começar: quer se cadastrar?'}</h2>
        <p class="cli-pop__texto" id="pop-texto">${obrigatorio
          ? `Para responder a pesquisa, a ${esc(D.empresa)} precisa do seu nome e contato. Depois, são só ${perguntas.length + (temNota ? 1 : 0) > 1 ? 'algumas perguntas rápidas' : 'uma pergunta rápida'}.`
          : '<strong>O cadastro é opcional</strong> e leva menos de 1 minuto. Se preferir, responda direto.'}</p>
        <div class="cli-pop__porque">
          <p class="cli-pop__porque-titulo">Por que se cadastrar?</p>
          <ul><li><span class="cli-pop__porque-icone cli-pop__porque-icone--premio" aria-hidden="true">${icone('premios')}</span>
            <span><strong>Prêmios para clientes cadastrados <span class="cli-pop__embreve">Em breve</span></strong>
            Quem se cadastra vai concorrer a prêmios da ${esc(D.empresa)}.</span></li></ul>
        </div>
        <div class="cli-pop__campo"><label for="c-nome">Nome</label>
          <input class="cli__campo" id="c-nome" data-contato="nome" autocomplete="name" value="${esc(c.nome)}"${invalido('nome')}>${erro('nome')}</div>
        <div class="cli-pop__campo"><label for="c-contato">WhatsApp ou e-mail</label>
          <input class="cli__campo" id="c-contato" data-contato="contato" autocomplete="tel" inputmode="email" value="${esc(c.contato)}"${invalido('contato')}>${erro('contato')}</div>
        <div class="cli-pop__campo"><label for="c-nascimento">Data de nascimento <span class="cli-pop__opcional">(opcional)</span></label>
          <input class="cli__campo" type="date" id="c-nascimento" data-contato="nascimento" autocomplete="bday" max="${hojeIso()}" value="${esc(c.nascimento)}"></div>
        <label class="cli__aceite"><input type="checkbox" data-contato="aceite"${c.aceite ? ' checked' : ''}>Aceito receber novidades e ofertas da ${esc(D.empresa)} (opcional)</label>
        <div class="cli-pop__acoes">
          <button type="button" class="cli__enviar" data-acao="cadastrar">${obrigatorio ? 'Continuar' : 'Cadastrar e responder'}</button>
          ${obrigatorio ? '' : '<button type="button" class="cli-pop__depois" data-acao="pular">Responder sem cadastro</button>'}
        </div>
      </div>`;
  }

  function htmlFim() {
    const nome = r.cadastrou ? r.contato.nome.trim().split(/\s+/)[0] : '';
    return `
      <div class="cli__marca"><img src="../assets/icons/logo-opiina-64.png" alt="">${esc(D.empresa)} · ${esc(unidade)}</div>
      <div class="cli__fim">
        <span class="cli__fim-icone" aria-hidden="true">${icone('ok')}</span>
        <h1 class="cli__titulo" tabindex="-1" data-fim>Obrigado${nome ? `, ${esc(nome)}` : ''}!</h1>
        <p class="cli__desc">Sua avaliação foi enviada${r.cadastrou ? ' e seu cadastro também' : ''}. Ela ajuda a ${esc(D.empresa)} a melhorar.</p>
        <p class="cli__desc">Pode fechar esta página.</p>
      </div>`;
  }

  function desenhar() {
    const foco = raiz.contains(document.activeElement) ? document.activeElement.dataset.foco : null;
    raiz.innerHTML = r.tela === 'fim' ? htmlFim() : htmlPesquisa();
    const comPop = r.tela === 'contato';
    pop.hidden = !comPop;
    pop.innerHTML = comPop ? htmlPop() : '';
    tela.inert = comPop;
    document.body.style.overflow = comPop ? 'hidden' : '';
    if (foco) raiz.querySelector(`[data-foco="${foco}"]`)?.focus();
  }

  function enviar() {
    const faltaNota = temNota && r.nota === null;
    const faltaExtra = perguntas.some((q) => aparece(q) && q.obrigatoria && !respondida(r.resp[q.uid]));
    if (faltaNota || faltaExtra) {
      r.falta = true;
      desenhar();
      const primeira = $('.cli__q--falta', raiz);
      primeira?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      $('button, textarea, select', primeira)?.focus();
      return;
    }
    r.falta = false;
    // Aqui a avaliação seria gravada, ligada ao cadastro (se houve). No protótipo, nada é enviado.
    terminar();
  }

  function cadastrar() {
    const c = r.contato;
    const contato = c.contato.trim();
    r.erros = {};
    if (!c.nome.trim()) r.erros.nome = 'Escreva seu nome.';
    if (!contato) r.erros.contato = 'Informe seu WhatsApp ou e-mail.';
    else if (!(/^\S+@\S+\.\S+$/.test(contato) || contato.replace(/\D/g, '').length >= 10)) r.erros.contato = 'Confira: e-mail (nome@exemplo.com) ou WhatsApp com DDD.';
    if (Object.keys(r.erros).length) {
      desenhar();
      $(`#c-${r.erros.nome ? 'nome' : 'contato'}`, pop).focus();
      return;
    }
    r.cadastrou = true;
    irParaPerguntas(`Cadastro feito, ${c.nome.trim().split(/\s+/)[0]}! Agora é só responder.`);
  }
  // Depois do cadastro (ou sem ele): as perguntas, com o foco no começo
  function irParaPerguntas(aviso = '') {
    r.tela = 'pesquisa';
    r.erros = {};
    r.aviso = aviso;
    desenhar();
    scrollTo(0, 0);
    $('button, textarea, select', raiz)?.focus();
  }
  function abrirCadastro() {
    r.tela = 'contato';
    desenhar();
    $('#pop-titulo', pop).focus();
  }
  function terminar() {
    r.tela = 'fim';
    desenhar();
    scrollTo(0, 0);
    $('[data-fim]', raiz).focus();
  }

  document.addEventListener('click', (e) => {
    const escolha = e.target.closest('[data-chave]');
    if (escolha) {
      const valor = Number.isNaN(Number(escolha.dataset.valor)) ? escolha.dataset.valor : Number(escolha.dataset.valor);
      if (escolha.dataset.chave === 'nps') r.nota = valor;
      else r.resp[escolha.dataset.chave.slice(1)] = valor;
      desenhar();
      return;
    }
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'enviar') enviar();
    if (acao === 'cadastrar') cadastrar();
    if (acao === 'pular') irParaPerguntas();
    if (acao === 'abrir-cadastro') abrirCadastro();
  });
  // Digitar não redesenha (não perde o foco nem o cursor)
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.texto) r.resp[t.dataset.texto] = t.value;
    if (t.matches('[data-atendente]')) r.atendente = t.value;
    if (t.dataset.contato) r.contato[t.dataset.contato] = t.type === 'checkbox' ? t.checked : t.value;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || r.tela !== 'contato' || p.identificacaoObrigatoria) return;
    irParaPerguntas();
  });

  desenhar();
  if (r.tela === 'contato') $('#pop-titulo', pop).focus();
}
