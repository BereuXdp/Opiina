// Opiina — tela de login (protótipo). Sem dependências.
// Faz só a validação acessível dos campos. NÃO envia dados: no app real,
// o envio continua com o código de autenticação existente.
//
// Login de demonstração: rodando no computador (localhost) com o protótipo do painel (painel/) junto,
// qualquer e-mail válido + qualquer senha entram nele. E-mail e senha não são
// guardados nem enviados; só uma marca "entrou" fica na aba (sessionStorage).
// No servidor (VPS), mesmo com painel/ publicado na "Site online" (decisão do cliente, 2026-10-14),
// o "Entrar" NUNCA abre a demonstração: ela só abre pelo endereço próprio painel/index.html?demo=1.
// Assim, quem tenta entrar de verdade pelo site não cai num painel com dados fictícios.

const formulario = document.querySelector('[data-login]');
const status = formulario.querySelector('[data-status]');
const PAINEL = 'painel/index.html';
const LOCAL = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.localhost');

const temPainel = !LOCAL
  ? Promise.resolve(false)
  : fetch(PAINEL, { method: 'HEAD', cache: 'no-store' })
    .then((r) => r.ok)
    .catch(() => false);

temPainel.then((ok) => {
  const aviso = document.querySelector('[data-demo]');
  if (ok && aviso) aviso.hidden = false;
});

const regras = [
  { campo: formulario.email, erro: document.getElementById('email-erro') },
  { campo: formulario.senha, erro: document.getElementById('senha-erro') },
];

function validar({ campo, erro }) {
  const valido = campo.checkValidity();
  campo.setAttribute('aria-invalid', String(!valido));
  erro.hidden = valido;
  return valido;
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  status.textContent = '';
  const invalidos = regras.filter((regra) => !validar(regra));
  if (invalidos.length) {
    invalidos[0].campo.focus();
    return;
  }
  temPainel.then((ok) => {
    if (!ok) {
      status.textContent = 'Protótipo visual: no app, o acesso é feito pelo sistema do Opiina.';
      return;
    }
    try { sessionStorage.setItem('opiina-demo', '1'); } catch { /* sem armazenamento: o painel abre mesmo assim */ }
    status.textContent = 'Entrando…';
    location.href = PAINEL;
  });
});

// Depois do primeiro erro, a mensagem some assim que o campo fica válido.
regras.forEach((regra) => {
  regra.campo.addEventListener('input', () => {
    if (regra.campo.getAttribute('aria-invalid') === 'true') validar(regra);
  });
});

// ---------- Modal "Esqueci minha senha" ----------
// <dialog> nativo: prende o foco, fecha com Esc e devolve o foco ao link que abriu.
// Protótipo: não envia e-mail. A confirmação é neutra e não revela se o e-mail tem conta.
const modal = document.querySelector('[data-recuperacao]');
const abrir = document.querySelector('[data-abrir-recuperacao]');
const formRecuperacao = modal.querySelector('[data-form-recuperacao]');
const regraRecuperacao = { campo: formRecuperacao.email, erro: document.getElementById('recuperar-email-erro') };
const etapas = {
  pedido: modal.querySelector('[data-etapa="pedido"]'),
  enviado: modal.querySelector('[data-etapa="enviado"]'),
};

function mostrarEtapa(nome) {
  Object.entries(etapas).forEach(([chave, etapa]) => { etapa.hidden = chave !== nome; });
}

function voltarAoPedido() {
  mostrarEtapa('pedido');
  regraRecuperacao.campo.removeAttribute('aria-invalid');
  regraRecuperacao.erro.hidden = true;
}

if (typeof modal.showModal === 'function') {
  abrir.addEventListener('click', (evento) => {
    evento.preventDefault();
    voltarAoPedido();
    // Aproveita o e-mail já digitado no login, se for válido.
    const emailDoLogin = formulario.email;
    regraRecuperacao.campo.value = emailDoLogin.value && emailDoLogin.checkValidity() ? emailDoLogin.value : '';
    modal.showModal();
    regraRecuperacao.campo.focus();
  });
}

formRecuperacao.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!validar(regraRecuperacao)) {
    regraRecuperacao.campo.focus();
    return;
  }
  modal.querySelector('[data-email-enviado]').textContent = regraRecuperacao.campo.value;
  mostrarEtapa('enviado');
  modal.querySelector('[data-titulo-enviado]').focus();   // leitor de tela anuncia a confirmação
});

regraRecuperacao.campo.addEventListener('input', () => {
  if (regraRecuperacao.campo.getAttribute('aria-invalid') === 'true') validar(regraRecuperacao);
});

modal.querySelector('[data-tentar-de-novo]').addEventListener('click', () => {
  voltarAoPedido();
  regraRecuperacao.campo.select();
  regraRecuperacao.campo.focus();
});

modal.querySelectorAll('[data-fechar-recuperacao]').forEach((botao) => {
  botao.addEventListener('click', () => modal.close());
});

// Clique no fundo escurecido (fora do cartão) também fecha.
modal.addEventListener('click', (evento) => {
  if (evento.target !== modal) return;
  const caixa = modal.getBoundingClientRect();
  const dentro = evento.clientX >= caixa.left && evento.clientX <= caixa.right
    && evento.clientY >= caixa.top && evento.clientY <= caixa.bottom;
  if (!dentro) modal.close();
});

// Ao fechar, o foco volta ao link "Esqueci minha senha".
modal.addEventListener('close', () => abrir.focus());
