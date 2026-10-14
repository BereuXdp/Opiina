// Opiina — onboarding (protótipo). Sem dependências.
// Escolha do plano (pré-marcada por ?plan=start|pro|redes), resumo do plano no painel,
// sugestão do endereço do painel e validação acessível. NÃO envia dados.

// Planos exatamente como estão no site (preço, descrição e itens).
const PLANOS = {
  start: {
    nome: 'Start', preco: 'R$ 147,00', desc: 'NPS e ocorrências para a sua unidade.',
    itens: ['Pesquisa NPS', 'Ocorrências', '1 unidade'],
  },
  pro: {
    nome: 'Pro', preco: 'R$ 297,00', desc: 'NPS, dashboard e Kanban para a sua unidade.',
    itens: ['Pesquisa NPS', 'Ocorrências', 'Dashboard', 'Kanban de atendimento', '5 usuários', '1 unidade'],
  },
  redes: {
    nome: 'Redes', preco: 'R$ 697,00', desc: 'NPS e atendimento em todas as suas unidades.',
    itens: ['Pesquisa NPS', 'Ocorrências', 'Dashboard', 'Kanban de atendimento', 'Métricas por unidade', 'Unidades ilimitadas', '20 usuários'],
  },
};

function el(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto) no.textContent = texto;
  return no;
}

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
    resumo.append(el('p', 'plano-resumo__desc', 'Start e Pro para uma unidade. Redes para todas as suas unidades.'));
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
  if (invalidos.length) {
    invalidos[0].campo.focus();
    return;
  }
  status.textContent = 'Protótipo visual: no app, a conta é criada pelo sistema do Opiina.';
});

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
