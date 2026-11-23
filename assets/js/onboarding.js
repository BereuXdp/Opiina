// Opiina — onboarding (protótipo). Sem dependências.
// Escolha do plano (pré-marcada por ?plan=start|pro|redes), resumo do plano no painel,
// sugestão do endereço do painel e validação acessível. NÃO envia dados.
// PLANOS e el() vêm de planos.js (carregado antes).

// ---------- Escolha do plano ----------
const opcoesPlano = [...document.querySelectorAll('[data-plano-opcao]')];
const gradePlanos = document.querySelector('.planos-escolha');
const erroPlano = document.getElementById('plano-erro');
const resumo = document.querySelector('[data-plano-resumo]');

function planoEscolhido() {
  const marcado = opcoesPlano.find((opcao) => opcao.checked);
  return marcado ? marcado.value : null;
}

// Painel azul (desktop): mostra o plano marcado, com os itens, ou pede a escolha.
function montarResumo() {
  const chave = planoEscolhido();
  const plano = PLANOS[chave];
  resumo.replaceChildren();
  const trocar = el('a', 'plano-resumo__trocar', plano ? 'Trocar plano' : 'Escolher plano');
  trocar.href = '#escolha-plano';
  trocar.addEventListener('click', (evento) => {
    evento.preventDefault();
    document.getElementById('escolha-plano').scrollIntoView({ behavior: 'smooth', block: 'center' });
    (opcoesPlano.find((opcao) => opcao.checked) || opcoesPlano[0]).focus({ preventScroll: true });
  });

  if (!plano) {
    resumo.append(el('p', 'plano-resumo__rotulo', 'Plano'));
    resumo.append(el('p', 'plano-resumo__nome', 'Escolha seu plano'));
    resumo.append(el('p', 'plano-resumo__desc', 'Todos os planos têm todas as funções. Muda o número de unidades e de usuários.'));
    resumo.append(trocar);
    return;
  }
  resumo.append(el('p', 'plano-resumo__rotulo', 'Plano selecionado'));
  resumo.append(el('p', 'plano-resumo__nome', plano.nome));
  const preco = el('p', 'plano-resumo__preco', plano.preco);
  preco.append(el('small', '', '/mês'));
  resumo.append(preco);
  resumo.append(el('p', 'plano-resumo__desc', plano.desc));
  const lista = el('ul', 'login__lista');
  plano.itens.forEach((item) => lista.append(el('li', '', item)));
  resumo.append(lista);
  resumo.append(trocar);
}

function validarPlano() {
  const valido = Boolean(planoEscolhido());
  erroPlano.hidden = valido;
  if (valido) gradePlanos.removeAttribute('data-invalido');
  else gradePlanos.dataset.invalido = 'true';
  return valido;
}

// Pré-marca o plano vindo do link (ex.: "Começar com o Pro" na home).
const planoDoLink = new URLSearchParams(location.search).get('plan');
const opcaoDoLink = opcoesPlano.find((opcao) => opcao.value === planoDoLink);
if (opcaoDoLink) opcaoDoLink.checked = true;

opcoesPlano.forEach((opcao) => opcao.addEventListener('change', () => {
  montarResumo();
  if (!erroPlano.hidden) validarPlano();
  // Mantém o endereço da página coerente com a escolha (recarregar não perde o plano).
  const url = new URL(location.href);
  url.searchParams.set('plan', opcao.value);
  history.replaceState(null, '', url);
}));

montarResumo();

// ---------- Endereço do painel ----------
// Sugere o endereço a partir do nome fantasia até a pessoa editar o campo por conta própria.
const fantasia = document.querySelector('[data-fantasia]');
const subdominio = document.querySelector('[data-subdominio]');
const endereco = document.querySelector('[data-endereco]');
let editadoAMao = false;

function paraEndereco(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function atualizarEndereco() {
  endereco.textContent = `${subdominio.value || subdominio.placeholder}.opiina.com`;
}

fantasia.addEventListener('input', () => {
  if (editadoAMao) return;
  subdominio.value = paraEndereco(fantasia.value);
  atualizarEndereco();
});
// Enquanto a pessoa digita: só letras minúsculas, números e hífen (o hífen final é permitido até ela continuar).
function limparEndereco(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 63);
}

subdominio.addEventListener('input', () => {
  editadoAMao = subdominio.value !== '';
  subdominio.value = limparEndereco(subdominio.value);
  atualizarEndereco();
});
// Ao sair do campo, tira o hífen que tenha sobrado no fim.
subdominio.addEventListener('blur', () => {
  subdominio.value = subdominio.value.replace(/-+$/, '');
  atualizarEndereco();
});
atualizarEndereco();

// ---------- Cupom de parceiro (2026-11-19) ----------
// Vem do link de indicação do contador (?cupom=). No protótipo, qualquer código de 4 a 20 letras/números vale;
// no app, o servidor confere se o cupom existe e aplica o desconto no Checkout da Stripe.
const campoCupom = document.querySelector('[data-cupom]');
const dicaCupom = document.querySelector('[data-cupom-dica]');
const erroCupom = document.getElementById('cupom-erro');
const textoDicaCupom = dicaCupom.textContent;
const parceiros = window.OpiinaParceiros;

function mostrarCupom() {
  const codigo = parceiros.normalizarCupom(campoCupom.value);
  const aplicado = parceiros.cupomValido(codigo);
  dicaCupom.textContent = aplicado ? `Cupom ${codigo} aplicado. O desconto aparece no pagamento.` : textoDicaCupom;
  dicaCupom.classList.toggle('campo__dica--ok', aplicado);
}
function validarCupom() {
  const valido = !campoCupom.value.trim() || parceiros.cupomValido(campoCupom.value);
  campoCupom.setAttribute('aria-invalid', String(!valido));
  erroCupom.hidden = valido;
  return valido;
}
const cupomDoLink = new URLSearchParams(location.search).get('cupom');
if (cupomDoLink) campoCupom.value = parceiros.normalizarCupom(cupomDoLink);
mostrarCupom();
campoCupom.addEventListener('input', () => {
  mostrarCupom();
  if (campoCupom.getAttribute('aria-invalid') === 'true') validarCupom();
});
campoCupom.addEventListener('blur', () => { if (campoCupom.value) validarCupom(); });

// ---------- Validação acessível (sem envio) ----------
const formulario = document.querySelector('[data-onboarding]');
const status = formulario.querySelector('[data-status]');
const regras = ['email-empresa', 'admin-email', 'admin-senha'].map((id) => ({
  campo: document.getElementById(id),
  erro: document.getElementById(`${id}-erro`),
}));

function validar({ campo, erro }) {
  const valido = campo.checkValidity();
  campo.setAttribute('aria-invalid', String(!valido));
  erro.hidden = valido;
  return valido;
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  status.textContent = '';
  const planoOk = validarPlano();
  const invalidos = regras.filter((regra) => !validar(regra));
  if (!planoOk) {
    document.getElementById('escolha-plano').scrollIntoView({ block: 'center' });
    opcoesPlano[0].focus({ preventScroll: true });
    return;
  }
  if (!validarCupom()) {
    campoCupom.focus();
    return;
  }
  if (invalidos.length) {
    // O e-mail da empresa fica no bloco "Mais dados": abre antes de levar o foco até lá
    invalidos[0].campo.closest('details')?.setAttribute('open', '');
    invalidos[0].campo.focus();
    return;
  }
  mostrarSucesso();
});

// ---------- Tela de sucesso (no mesmo cartão; o painel da marca continua com o plano) ----------
function mostrarSucesso() {
  const valor = (id) => document.getElementById(id).value.trim();
  const plano = PLANOS[opcoesPlano.find((o) => o.checked).value];
  const nome = valor('admin-nome').split(/\s+/)[0];
  const empresa = valor('fantasia') || valor('razao');
  const sucesso = document.querySelector('[data-sucesso]');
  const preencher = (chave, texto) => { sucesso.querySelector(`[data-s="${chave}"]`).textContent = texto; };

  const texto = sucesso.querySelector('[data-sucesso-texto]');
  texto.textContent = `${nome ? `${nome}, a` : 'A'} conta${empresa ? ` de ${empresa}` : ''} no Opiina foi criada. Agora é só cadastrar o pagamento: os primeiros 7 dias são grátis.`;
  preencher('plano', `${plano.nome} · ${plano.preco} por mês`);
  preencher('endereco', endereco.textContent);
  // Protótipo: o botão simula a volta da Stripe com o pagamento aprovado.
  // No app, ele abre o Checkout da Stripe, e o success_url aponta para pagamento-concluido.
  const chavePlano = opcoesPlano.find((o) => o.checked).value;
  const pagar = new URL('pagamento-concluido.html', location.href);
  pagar.searchParams.set('plan', chavePlano);
  // Com cupom: a indicação vai para o painel do parceiro como "Cadastrou"; o pagamento a marca como paga.
  const cupom = parceiros.normalizarCupom(campoCupom.value);
  sucesso.querySelector('[data-linha-cupom]').hidden = !cupom;
  if (cupom) {
    preencher('cupom', `${cupom} · desconto no pagamento`);
    const indicacao = parceiros.registrarIndicacao({ cupom, empresa: empresa || 'Empresa sem nome', plano: chavePlano });
    pagar.searchParams.set('ind', indicacao.id);
  }
  sucesso.querySelector('[data-pagar]').href = pagar.pathname.split('/').pop() + pagar.search;
  preencher('email', valor('admin-email'));
  preencher('unidade', valor('unidade-nome') || 'Unidade 1');

  document.querySelectorAll('.onb__cartao > .login__titulo, .onb__cartao > .login__sub, [data-onboarding], .onb__entrar').forEach((el) => { el.hidden = true; });
  sucesso.hidden = false;
  document.title = 'Conta criada — Opiina';
  window.scrollTo(0, 0);
  sucesso.querySelector('[data-sucesso-titulo]').focus();
}

regras.forEach((regra) => {
  regra.campo.addEventListener('input', () => {
    if (regra.campo.getAttribute('aria-invalid') === 'true') validar(regra);
  });
});

// Ao limpar o formulário, volta tudo ao estado inicial (sugestão de endereço, erros).
formulario.addEventListener('reset', () => {
  requestAnimationFrame(() => {
    editadoAMao = false;
    atualizarEndereco();
    regras.forEach(({ campo, erro }) => { campo.removeAttribute('aria-invalid'); erro.hidden = true; });
    erroPlano.hidden = true;
    gradePlanos.removeAttribute('data-invalido');
    montarResumo();
    status.textContent = '';
  });
});
