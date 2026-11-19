// Opiina — painel do parceiro (contador), protótipo — 2026-11-19. Sem dependências.
// Base: ../assets/js/parceiros.js (conta, cupom, indicações, saques). QR Code: qrcode.js (usa esc(), definido aqui).
// Abas por ?aba= (inicio | indicacoes | divulgar | saques | afiliado). Sem conta criada, abre uma conta DE EXEMPLO.

const P = window.OpiinaParceiros;
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ---------- Conta: a criada em contadores.html ou a de exemplo ----------
// Entrou com o e-mail de exemplo (ou não há conta neste navegador): conta de exemplo.
const contaReal = P.sessao() === 'demo' ? null : P.conta();
const DEMO = !contaReal;
let conta = contaReal || {
  nome: 'Ana Souza', escritorio: 'Souza Contabilidade', email: 'ana@souzacontabil.com.br', telefone: '(85) 99999-0000',
  cupom: 'SOUZA27', pix: { tipo: 'E-mail', chave: 'ana@souzacontabil.com.br' },
};

// Dados de exemplo (fictícios), só na conta de exemplo
const EXEMPLOS_IND = DEMO ? [
  { empresa: 'Padaria Pão Dourado', plano: 'start', data: diasAtras(52), situacao: 'pagou' },
  { empresa: 'Clínica Bem Viver', plano: 'pro', data: diasAtras(38), situacao: 'pagou' },
  { empresa: 'Rede Sabor da Terra', plano: 'redes', data: diasAtras(27), situacao: 'pagou' },
  { empresa: 'Loja Ponto Certo', plano: 'start', data: diasAtras(19), situacao: 'cancelou' },
  { empresa: 'Academia Movimento', plano: 'pro', data: diasAtras(9), situacao: 'pagou' },
  { empresa: 'Salão Bella Arte', plano: 'start', data: diasAtras(4), situacao: 'cadastrou' },
  { empresa: 'Bar do Porto', plano: 'pro', data: diasAtras(1), situacao: 'cadastrou' },
] : [];
const EXEMPLOS_SAQUE = DEMO ? [{ valor: 220, pix: 'E-mail · ana@souzacontabil.com.br', data: diasAtras(30), situacao: 'pago' }] : [];

function indicacoes() {
  const locais = P.indicacoes().filter((i) => i.cupom === conta.cupom);
  return [...EXEMPLOS_IND, ...locais].sort((a, b) => b.data.localeCompare(a.data));
}
// Na conta de exemplo, os saques pedidos ficam só nesta visita (não se misturam com uma conta real criada depois).
const saquesDaVisita = [];
const saques = () => [...EXEMPLOS_SAQUE, ...(DEMO ? saquesDaVisita : P.saques())].sort((a, b) => b.data.localeCompare(a.data));
function pedirSaque(pedido) {
  if (DEMO) saquesDaVisita.push({ ...pedido, data: new Date().toISOString(), situacao: 'solicitado' });
  else P.solicitarSaque(pedido);
}
const comissao = (i) => (i.situacao === 'pagou' ? P.comissaoDe(i.plano) : 0);

function numeros() {
  const lista = indicacoes();
  const pagas = lista.filter((i) => i.situacao === 'pagou');
  const gerado = pagas.reduce((soma, i) => soma + comissao(i), 0);
  const pedidos = saques();
  const sacado = pedidos.reduce((soma, s) => soma + s.valor, 0);
  return {
    usos: lista.length,
    pagas: pagas.length,
    aguardando: lista.filter((i) => i.situacao === 'cadastrou').length,
    conversao: lista.length ? Math.round((pagas.length / lista.length) * 100) : 0,
    gerado,
    saldo: Math.max(0, Math.round((gerado - sacado) * 100) / 100),
    recebido: pedidos.filter((s) => s.situacao === 'pago').reduce((soma, s) => soma + s.valor, 0),
    emAnalise: pedidos.filter((s) => s.situacao === 'solicitado').reduce((soma, s) => soma + s.valor, 0),
  };
}

const SITUACAO = {
  cadastrou: { texto: 'Aguardando pagamento', classe: 'etapa--em-andamento' },
  pagou: { texto: 'Pagou', classe: 'etapa--resolvida' },
  cancelou: { texto: 'Cancelou', classe: 'etapa--cancelou' },
};
const selo = (situacao) => `<span class="etapa ${SITUACAO[situacao].classe}">${SITUACAO[situacao].texto}</span>`;

const linkIndicacao = () => new URL(`../onboarding.html?cupom=${encodeURIComponent(conta.cupom)}`, location.href).href;
const regraComissao = () => `${P.REGRAS.comissaoPercentual}% da 1ª mensalidade do plano${P.REGRAS.definidas ? '' : ' (exemplo)'}`;

// ---------- Aviso rápido ----------
const toast = $('[data-toast]');
let tempoToast;
function avisar(texto) {
  toast.textContent = texto;
  toast.removeAttribute('data-oculto');
  clearTimeout(tempoToast);
  tempoToast = setTimeout(() => toast.setAttribute('data-oculto', ''), 2600);
}
async function copiar(texto, rotulo) {
  try { await navigator.clipboard.writeText(texto); avisar(`${rotulo} copiado.`); } catch { avisar('Não deu pra copiar. Selecione e copie.'); }
}

// ---------- Cabeçalho, conta e aviso ----------
function montarConta() {
  $('[data-conta-nome]').textContent = conta.nome;
  $('[data-conta-escritorio]').textContent = conta.escritorio;
  $('[data-conta-iniciais]').textContent = conta.nome.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  $('[data-ola]').textContent = `Olá, ${conta.nome.split(/\s+/)[0]}!`;
  $$('[data-cupom]').forEach((el) => { el.textContent = conta.cupom; });
  $('[data-desconto-texto]').textContent = P.REGRAS.descontoCupom ? ` (${P.REGRAS.descontoCupom})` : '';
  $('[data-regra-comissao]').textContent = regraComissao();
  $('[data-link-campo]').value = linkIndicacao();
  const mensagemWhats = `Oi! Com o meu cupom ${conta.cupom} você tem desconto no Opiina: ${linkIndicacao()}`;
  $$('[data-whats-link]').forEach((a) => { a.href = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`; });

  const partes = [];
  if (DEMO) partes.push('Protótipo com uma conta e dados de exemplo.');
  else partes.push('Protótipo: seus dados ficam só neste navegador.');
  if (!P.REGRAS.definidas) partes.push(`O percentual da comissão (${P.REGRAS.comissaoPercentual}%) e o desconto do cupom ainda serão definidos pelo Opiina.`);
  $('[data-aviso-texto]').textContent = partes.join(' ');
}

// ---------- Início ----------
function montarInicio() {
  const n = numeros();
  const kpi = (rotulo, valor, nota, extra = '', aba = '') => `
    <div class="kpi ${extra}">
      ${aba ? `<a class="kpi__link kpi__rotulo" href="?aba=${aba}" data-ir="${aba}">${rotulo}</a>` : `<span class="kpi__rotulo">${rotulo}</span>`}
      <span class="kpi__valor">${valor}</span>
      <span class="kpi__nota">${nota}</span>
    </div>`;
  $('[data-kpis]').innerHTML = [
    kpi('Usos do cupom', n.usos, 'empresas que se cadastraram com ele', '', 'indicacoes'),
    kpi('Assinaturas pagas', n.pagas, n.aguardando ? `${n.aguardando} aguardando pagamento` : 'nenhuma aguardando pagamento', '', 'indicacoes'),
    kpi('Conversão', `${n.conversao}%`, 'dos cadastros viraram assinatura'),
    kpi('Saldo disponível', P.dinheiro(n.saldo), `${P.dinheiro(n.gerado)} em comissões no total`, 'kpi--saldo', 'saques'),
  ].join('');

  const ultimas = indicacoes().slice(0, 5);
  $('[data-ultimas]').innerHTML = ultimas.length
    ? ultimas.map((i) => `<li><span class="lista-ind__empresa">${esc(i.empresa)}</span>${selo(i.situacao)}<span class="lista-ind__meta">${P.NOMES_PLANO[i.plano]} · ${dataBR(i.data)}</span></li>`).join('')
    : '<li class="vazio">Ninguém usou seu cupom ainda. Comece mandando seu link pelo WhatsApp.</li>';

  $('[data-boas-vindas]').hidden = !new URLSearchParams(location.search).has('novo');
}

// ---------- Indicações ----------
let filtro = 'todas';
function montarIndicacoes() {
  const lista = indicacoes();
  $$('[data-qtd]').forEach((el) => {
    const chave = el.dataset.qtd;
    el.textContent = chave === 'todas' ? lista.length : lista.filter((i) => i.situacao === chave).length;
  });
  const visiveis = filtro === 'todas' ? lista : lista.filter((i) => i.situacao === filtro);
  $('[data-tabela-ind]').innerHTML = visiveis.map((i) => `
    <tr>
      <th scope="row">${esc(i.empresa)}</th>
      <td>${P.NOMES_PLANO[i.plano]}</td>
      <td>${dataBR(i.data)}</td>
      <td>${selo(i.situacao)}</td>
      <td class="num">${i.situacao === 'pagou' ? P.dinheiro(comissao(i)) : `<span class="sem-comissao">${i.situacao === 'cadastrou' ? 'após o pagamento' : '—'}</span>`}</td>
    </tr>`).join('');
  $('[data-vazio-ind]').hidden = visiveis.length > 0;
  $('.tabela', $('[data-aba="indicacoes"]')).hidden = visiveis.length === 0;
}
$$('[data-filtro]').forEach((botao) => botao.addEventListener('click', () => {
  filtro = botao.dataset.filtro;
  $$('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
  montarIndicacoes();
}));

// ---------- Divulgar ----------
function montarDivulgar() {
  const link = linkIndicacao();
  $('[data-qr]').innerHTML = qrSvg(link, { rotulo: `QR Code do link de indicação com o cupom ${conta.cupom}` });
  const mensagens = [
    { titulo: 'WhatsApp — curta', texto: `Oi! Tô indicando o Opiina pros meus clientes. Ele ajuda a ouvir o que o cliente acha do atendimento (pesquisa NPS) e organiza as reclamações num painel, pra equipe resolver.\n\nCom o meu cupom ${conta.cupom} você tem desconto na assinatura: ${link}` },
    { titulo: 'E-mail', texto: `Assunto: Uma ferramenta pra ouvir seus clientes\n\nOlá! Queria te indicar o Opiina. Com ele, você manda uma pesquisa rápida pros seus clientes, vê a nota e o comentário no mesmo lugar e acompanha cada reclamação até resolver.\n\nUse o cupom ${conta.cupom} no cadastro e ganhe desconto: ${link}\n\nAbraço,\n${conta.nome} — ${conta.escritorio}` },
    { titulo: 'Para quem tem mais de uma unidade', texto: `Pra quem tem mais de uma unidade, o Opiina mostra as unidades lado a lado, com ranking e métricas de cada uma, sem planilha no fim do mês.\n\nCadastre com o meu cupom ${conta.cupom} e ganhe desconto: ${link}` },
  ];
  $('[data-mensagens]').innerHTML = mensagens.map((m, i) => `
    <li class="mensagem">
      <h3>${esc(m.titulo)}</h3>
      <p id="msg-${i}">${esc(m.texto)}</p>
      <div class="mensagem__acoes">
        <button class="btn btn--secundario" type="button" data-copiar-msg="${i}"><svg class="icone" aria-hidden="true"><use href="#p-copiar"/></svg>Copiar</button>
        ${i === 1 ? '' : `<a class="btn btn--secundario" href="https://wa.me/?text=${encodeURIComponent(m.texto)}" target="_blank" rel="noopener"><svg class="icone" aria-hidden="true"><use href="#p-whats"/></svg>WhatsApp</a>`}
      </div>
    </li>`).join('');
  $$('[data-copiar-msg]').forEach((b) => b.addEventListener('click', () => copiar(mensagens[b.dataset.copiarMsg].texto, 'Texto')));
}
$('[data-baixar-qr]').addEventListener('click', () => baixarQr(linkIndicacao(), `qrcode-opiina-${conta.cupom}.png`));

// ---------- Saques ----------
const pixTexto = () => (conta.pix ? `${conta.pix.tipo} · ${conta.pix.chave}` : '');
function montarSaques() {
  const n = numeros();
  $('[data-saldo]').textContent = P.dinheiro(n.saldo);
  $('[data-saldo-pix]').innerHTML = conta.pix
    ? `Chave PIX salva: <strong>${esc(pixTexto())}</strong>`
    : 'Você informa a chave PIX na hora de pedir o saque.';
  // A chave PIX agora é informada (e pode ser salva) no próprio pedido de saque.
  $('[data-abrir-saque]').disabled = n.saldo <= 0;
  $('[data-kpis-saque]').innerHTML = [
    ['Comissões geradas', P.dinheiro(n.gerado), `${n.pagas} assinatura${n.pagas === 1 ? '' : 's'} paga${n.pagas === 1 ? '' : 's'}`],
    ['Saques em análise', P.dinheiro(n.emAnalise), 'pedidos aguardando o Opiina'],
    ['Já recebido', P.dinheiro(n.recebido), 'saques pagos por PIX'],
  ].map(([r, v, nota]) => `<div class="kpi"><span class="kpi__rotulo">${r}</span><span class="kpi__valor">${v}</span><span class="kpi__nota">${nota}</span></div>`).join('');

  const lista = saques();
  $('[data-tabela-saques]').innerHTML = lista.map((s) => `
    <tr>
      <td>${dataBR(s.data)}</td>
      <td>${esc(s.pix)}</td>
      <td><span class="etapa ${s.situacao === 'pago' ? 'etapa--pago' : 'etapa--solicitado'}">${s.situacao === 'pago' ? 'Pago' : 'Em análise'}</span></td>
      <td class="num">${P.dinheiro(s.valor)}</td>
    </tr>`).join('');
  $('[data-vazio-saques]').hidden = lista.length > 0;
  $('.tabela', $('[data-aba="saques"]')).hidden = lista.length === 0;
}

const dialogo = $('[data-dialogo-saque]');
const campoValor = $('#saque-valor');
const erroValor = $('#saque-erro');
const lerValor = (texto) => Number(String(texto).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
$('[data-abrir-saque]').addEventListener('click', () => {
  const { saldo } = numeros();
  $('[data-saque-disponivel]').textContent = P.dinheiro(saldo);
  campoValor.value = saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  campoValor.removeAttribute('aria-invalid');
  erroValor.hidden = true;
  // Chave PIX: vem com a salva; sem chave salva, o campo vem vazio.
  campoPixTipo.value = conta.pix?.tipo || 'CPF';
  campoPixChave.value = conta.pix?.chave || '';
  campoPixChave.removeAttribute('aria-invalid');
  erroPix.hidden = true;
  salvarPix.checked = true;
  dialogo.showModal();
  campoValor.select();
});
const campoPixTipo = $('#saque-pix-tipo');
const campoPixChave = $('#saque-pix-chave');
const erroPix = $('#saque-pix-erro');
const salvarPix = $('[data-salvar-pix]');
campoPixChave.addEventListener('input', () => {
  if (campoPixChave.getAttribute('aria-invalid') === 'true' && campoPixChave.value.trim()) {
    campoPixChave.removeAttribute('aria-invalid');
    erroPix.hidden = true;
  }
});
$('[data-fechar-saque]').addEventListener('click', () => dialogo.close());
$('[data-form-saque]').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const { saldo } = numeros();
  const valor = Math.round(lerValor(campoValor.value) * 100) / 100;
  let erro = '';
  if (!valor || valor <= 0) erro = 'Informe um valor maior que zero.';
  else if (valor > saldo) erro = `O valor passa do saldo disponível (${P.dinheiro(saldo)}).`;
  erroValor.textContent = erro;
  erroValor.hidden = !erro;
  campoValor.setAttribute('aria-invalid', String(Boolean(erro)));
  if (erro) { campoValor.focus(); return; }

  const pix = { tipo: campoPixTipo.value, chave: campoPixChave.value.trim() };
  campoPixChave.setAttribute('aria-invalid', String(!pix.chave));
  erroPix.hidden = Boolean(pix.chave);
  if (!pix.chave) { campoPixChave.focus(); return; }

  const salvou = salvarPix.checked;
  if (salvou) {
    conta = { ...conta, pix };
    if (!DEMO) P.salvarConta({ pix });
  }
  pedirSaque({ valor, pix: `${pix.tipo} · ${pix.chave}` });
  dialogo.close();
  montarTudo();
  avisar(`Saque de ${P.dinheiro(valor)} solicitado.${salvou ? ' Chave PIX salva.' : ''}`);
});

// ---------- Área do afiliado ----------
function montarAfiliado() {
  const dados = $('[data-form-dados]');
  ['nome', 'escritorio', 'email', 'telefone'].forEach((c) => { dados.elements[c].value = conta[c] || ''; });
  const pix = $('[data-form-pix]');
  if (conta.pix) { pix.elements.tipo.value = conta.pix.tipo; pix.elements.chave.value = conta.pix.chave; }
  $('[data-regras]').innerHTML = [
    `Seu cupom: <strong>${esc(conta.cupom)}</strong>. Quem usa no cadastro do Opiina ganha desconto${P.REGRAS.descontoCupom ? ` de ${esc(P.REGRAS.descontoCupom)}` : '<span class="a-definir">desconto a definir</span>'}.`,
    `Comissão única por cliente indicado que pagar o plano: ${P.REGRAS.comissaoPercentual}% da 1ª mensalidade${P.REGRAS.definidas ? '' : '<span class="a-definir">valor de exemplo</span>'}.`,
    'A comissão entra no saldo quando o pagamento do cliente é aprovado.',
    'O saque é pedido no painel e pago por PIX, depois da conferência do Opiina<span class="a-definir">prazo a definir</span>.',
  ].map((r) => `<li><span>${r}</span></li>`).join('');
}
function salvar(form, mudanca, mensagem) {
  conta = { ...conta, ...mudanca };
  if (!DEMO) P.salvarConta(mudanca);
  montarTudo();
  avisar(DEMO ? `${mensagem} (só nesta visita: conta de exemplo).` : mensagem);
}
$('[data-form-dados]').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const f = evento.target;
  const obrigatorios = ['nome', 'escritorio', 'email'].map((c) => f.elements[c]);
  const invalido = obrigatorios.find((c) => !c.value.trim() || !c.checkValidity());
  obrigatorios.forEach((c) => c.setAttribute('aria-invalid', String(!c.value.trim() || !c.checkValidity())));
  if (invalido) { invalido.focus(); return; }
  salvar(f, { nome: f.elements.nome.value.trim(), escritorio: f.elements.escritorio.value.trim(), email: f.elements.email.value.trim(), telefone: f.elements.telefone.value.trim() }, 'Dados salvos.');
});
$('[data-form-pix]').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const f = evento.target;
  const chave = f.elements.chave.value.trim();
  f.elements.chave.setAttribute('aria-invalid', String(!chave));
  $('#pix-erro').hidden = Boolean(chave);
  if (!chave) { f.elements.chave.focus(); return; }
  salvar(f, { pix: { tipo: f.elements.tipo.value, chave } }, 'Chave PIX salva.');
});

// ---------- Abas ----------
const ABAS = ['inicio', 'indicacoes', 'divulgar', 'saques', 'afiliado'];
function irPara(aba, { foco = true, historico = true } = {}) {
  if (!ABAS.includes(aba)) aba = 'inicio';
  $$('[data-aba]').forEach((s) => { s.hidden = s.dataset.aba !== aba; });
  $$('[data-aba-link]').forEach((a) => {
    if (a.dataset.abaLink === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (historico) {
    const url = new URL(location.href);
    url.searchParams.set('aba', aba);
    if (aba !== 'inicio') url.searchParams.delete('novo');
    history.pushState({ aba }, '', url);
  }
  const titulos = { inicio: 'Painel do parceiro', indicacoes: 'Indicações', divulgar: 'Divulgar', saques: 'Saques', afiliado: 'Área do afiliado' };
  document.title = `${titulos[aba]} — Opiina`;
  fecharMenu();
  window.scrollTo(0, 0);
  if (foco) $(`[data-aba="${aba}"] .cabeca__titulo`).focus({ preventScroll: true });
}
document.addEventListener('click', (evento) => {
  const link = evento.target.closest('[data-aba-link], [data-ir]');
  if (!link || evento.metaKey || evento.ctrlKey) return;
  evento.preventDefault();
  irPara(link.dataset.abaLink || link.dataset.ir);
});
window.addEventListener('popstate', () => irPara(new URLSearchParams(location.search).get('aba'), { historico: false }));

// ---------- Copiar (cupom e link) ----------
$$('[data-copiar]').forEach((botao) => botao.addEventListener('click', () => {
  if (botao.dataset.copiar === 'cupom') copiar(conta.cupom, 'Cupom');
  else copiar(linkIndicacao(), 'Link');
}));

// ---------- Menu no celular ----------
const lateral = $('[data-lateral]');
const botaoMenu = $('[data-menu-abrir]');
function fecharMenu() {
  if (!lateral.hasAttribute('data-aberto')) return;
  lateral.removeAttribute('data-aberto');
  botaoMenu.setAttribute('aria-expanded', 'false');
}
botaoMenu.addEventListener('click', () => {
  lateral.setAttribute('data-aberto', '');
  botaoMenu.setAttribute('aria-expanded', 'true');
  $('[data-menu-fechar]').focus();
});
$('[data-menu-fechar]').addEventListener('click', () => { fecharMenu(); botaoMenu.focus(); });
$('[data-menu-fundo]').addEventListener('click', fecharMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lateral.hasAttribute('data-aberto')) { fecharMenu(); botaoMenu.focus(); } });

// ---------- Modo escuro (mesma chave do painel do Opiina) ----------
const botaoTema = $('[data-tema-botao]');
function aplicarTema(escuro) {
  if (escuro) document.documentElement.dataset.tema = 'escuro'; else delete document.documentElement.dataset.tema;
  botaoTema.setAttribute('aria-pressed', String(escuro));
  $('use', botaoTema).setAttribute('href', `icones.svg#${escuro ? 'sol' : 'lua'}`);
}
aplicarTema(document.documentElement.dataset.tema === 'escuro');
botaoTema.addEventListener('click', () => {
  const escuro = document.documentElement.dataset.tema !== 'escuro';
  aplicarTema(escuro);
  try { localStorage.setItem('opiina-tema', escuro ? 'escuro' : 'claro'); } catch { /* ignora */ }
});

// ---------- Sair ----------
$('[data-sair]').addEventListener('click', () => {
  P.sair();
  location.href = '../parceiro-entrar.html';
});

// ---------- Início ----------
function montarTudo() {
  montarConta();
  montarInicio();
  montarIndicacoes();
  montarDivulgar();
  montarSaques();
  montarAfiliado();
}
montarTudo();
irPara(new URLSearchParams(location.search).get('aba') || 'inicio', { foco: false, historico: false });
