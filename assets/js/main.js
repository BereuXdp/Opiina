// Opiina — interações da home. Sem dependências.
// Tudo aqui é melhoria progressiva: sem JS, a página funciona e o conteúdo aparece.

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const raiz = document.documentElement;

// ---------- Ao atualizar a página, volta sempre para o início (pedido do cliente, 2026-11-17) ----------
// Só no "atualizar": quem chega por um link com âncora (ex.: login → index.html#planos) continua indo para a seção.
const foiAtualizada = performance.getEntriesByType('navigation')[0]?.type === 'reload';
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (foiAtualizada) {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
}

// ---------- Menu em tela cheia (celular): foco preso, Esc fecha ----------
const menuBotao = document.querySelector('[data-menu-botao]');
const nav = document.querySelector('[data-nav]');
const fundo = document.querySelector('[data-menu-fundo]');
const telaPequena = window.matchMedia('(max-width: 900px)');

function menuAberto() {
  return document.body.classList.contains('menu-aberto');
}

function definirMenu(aberto, { devolverFoco = true } = {}) {
  document.body.classList.toggle('menu-aberto', aberto);
  menuBotao.setAttribute('aria-expanded', String(aberto));
  menuBotao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  if (aberto) {
    nav.querySelector('a').focus();
    document.addEventListener('keydown', teclaNoMenu);
  } else {
    document.removeEventListener('keydown', teclaNoMenu);
    if (devolverFoco) menuBotao.focus();
  }
}

function teclaNoMenu(evento) {
  if (evento.key === 'Escape') {
    definirMenu(false);
    return;
  }
  if (evento.key !== 'Tab') return;
  const itens = [menuBotao, ...nav.querySelectorAll('a')];
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

menuBotao.addEventListener('click', () => definirMenu(!menuAberto()));
fundo.addEventListener('click', () => definirMenu(false));
nav.addEventListener('click', (evento) => {
  if (menuAberto() && evento.target.closest('a')) definirMenu(false, { devolverFoco: false });
});
telaPequena.addEventListener('change', (mq) => {
  if (!mq.matches && menuAberto()) definirMenu(false, { devolverFoco: false });
});

// ---------- Animações de rolagem ----------
// Com a Motion (motion.dev, versão JS): revelação com mola, progresso com mola, hero ligado ao scroll,
// título que acende palavra por palavra e parallax nas fotos.
// Sem a Motion (CDN fora do ar), cai na versão em JS puro. Com movimento reduzido, nada disso roda.
const Motion = window.Motion;
const temMotion = Boolean(Motion && Motion.animate && Motion.scroll && Motion.inView);

// Só anima de entrada o que está abaixo da tela no carregamento, com a aba visível e sem âncora.
// Assim nenhum conteúdo fica preso invisível se o observador não disparar.
function pendentesDeRevelar() {
  if (document.hidden || location.hash) return [];
  const alturaTela = window.innerHeight;
  return [...document.querySelectorAll('.revelar')].filter((el) => el.getBoundingClientRect().top >= alturaTela);
}

function mostrarPendentesSeAbaOcultar(aoOcultar) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    document.querySelectorAll('.revelar--pendente').forEach((el) => el.classList.remove('revelar--pendente'));
    aoOcultar();
  }, { once: true });
}

// Envolve cada palavra do título num <span class="palavra">, preservando <em> e espaços.
function dividirEmPalavras(titulo) {
  const palavras = [];
  const textos = [];
  const percurso = document.createTreeWalker(titulo, NodeFilter.SHOW_TEXT);
  while (percurso.nextNode()) textos.push(percurso.currentNode);
  textos.forEach((no) => {
    const fragmento = document.createDocumentFragment();
    no.textContent.split(/(\s+)/).forEach((parte) => {
      if (!parte) return;
      if (/^\s+$/.test(parte)) {
        fragmento.append(parte);
        return;
      }
      const span = document.createElement('span');
      span.className = 'palavra';
      span.textContent = parte;
      palavras.push(span);
      fragmento.append(span);
    });
    no.replaceWith(fragmento);
  });
  return palavras;
}

if (!reduzirMovimento && temMotion) {
  const { animate, scroll, inView } = Motion;
  const mola = { type: 'spring', stiffness: 110, damping: 20 };
  raiz.classList.add('com-motion');

  // 1. Revelação ao rolar (scroll-triggered): mola, em cascata pelo --d de cada elemento.
  const paradas = pendentesDeRevelar().map((el) => {
    el.classList.add('revelar--pendente');
    const atraso = parseFloat(el.style.getPropertyValue('--d')) || 0;
    return inView(el, () => {
      if (!el.classList.contains('revelar--pendente')) return;
      el.classList.remove('revelar--pendente');
      animate(el, { opacity: [0, 1], transform: ['translateY(28px)', 'translateY(0px)'] }, { ...mola, delay: atraso });
    }, { amount: .15 });
  });
  mostrarPendentesSeAbaOcultar(() => paradas.forEach((parar) => parar()));

  // 2. Ligada ao scroll (scroll-linked): barra de progresso suavizada com mola…
  const barra = document.querySelector('[data-progresso]');
  let animacaoBarra = null;
  scroll((progresso) => {
    animacaoBarra?.stop();
    animacaoBarra = animate(barra, { transform: `scaleX(${progresso})` }, { type: 'spring', stiffness: 120, damping: 30, restDelta: .001 });
  });

  // …e o Scroll Zoom Hero: com o hero preso na tela, o fundo cresce, desfoca e esmaece;
  // o texto e a faixa de fatos recuam e somem. Tudo ligado à rolagem do topo (CSS: .com-motion .topo).
  const topo = document.querySelector('[data-topo]');
  // A faixa vai até o topo sair da tela: enquanto está preso, o fundo já cresce e desfoca com o texto legível;
  // o restante acontece enquanto a próxima seção entra — sem tela em branco no meio.
  const faixaDoTopo = { target: topo, offset: ['start start', 'end start'] };
  scroll(
    animate(document.querySelector('[data-topo-fundo]'),
      { transform: ['scale(1)', 'scale(1.8)'], filter: ['blur(0px)', 'blur(28px)'], opacity: [1, 0] }, { ease: 'linear' }),
    faixaDoTopo
  );
  scroll(
    animate(document.querySelector('[data-hero-copy]'),
      { opacity: [1, 1, 0], transform: ['translateY(0px) scale(1)', 'translateY(-40px) scale(.96)', 'translateY(-90px) scale(.92)'] },
      { ease: 'linear', times: [0, .35, 1] }),
    faixaDoTopo
  );
  scroll(
    animate(document.querySelector('.fatos'), { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(24px)'] }, { ease: 'linear' }),
    { target: topo, offset: ['start start', '0.35 start'] }
  );

  // 3. Palavras acendendo conforme o título atravessa a tela.
  document.querySelectorAll('[data-palavras]').forEach((titulo) => {
    const palavras = dividirEmPalavras(titulo);
    titulo.classList.add('palavras-prontas');
    scroll((progresso) => {
      palavras.forEach((palavra, i) => {
        const acesa = Math.min(Math.max(progresso * palavras.length - i, 0), 1);
        palavra.style.opacity = (.15 + .85 * acesa).toFixed(3);
      });
    }, { target: titulo, offset: ['start 0.9', 'start 0.35'] });
  });

  // 4. Parallax nas fotos: a imagem anda mais devagar que a moldura (que corta o excesso).
  document.querySelectorAll('.demo__foto img, .publico__foto img').forEach((img) => {
    scroll(
      animate(img, { transform: ['translateY(-5%) scale(1.12)', 'translateY(5%) scale(1.12)'] }, { ease: 'linear' }),
      { target: img.parentElement, offset: ['start end', 'end start'] }
    );
  });
} else if (!reduzirMovimento) {
  // Sem a Motion: progresso e hero via variáveis CSS, revelação via IntersectionObserver.
  let agendado = false;
  const aoRolar = () => {
    const y = window.scrollY;
    const total = raiz.scrollHeight - window.innerHeight;
    raiz.style.setProperty('--s', Math.min(y, 700));
    raiz.style.setProperty('--p', total > 0 ? (y / total).toFixed(4) : 0);
    agendado = false;
  };
  window.addEventListener('scroll', () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(aoRolar);
  }, { passive: true });
  aoRolar();

  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.remove('revelar--pendente');
        observador.unobserve(entrada.target);
      });
    }, { threshold: .15 });
    pendentesDeRevelar().forEach((el) => {
      el.classList.add('revelar--pendente');
      observador.observe(el);
    });
    mostrarPendentesSeAbaOcultar(() => observador.disconnect());
  }
}

// ---------- Benefícios: etapas com imagem, guiadas pela rolagem (2026-11-17) ----------
// Computador (> 900px e tela com altura suficiente): lista + palco ficam presos no meio da tela e cada trecho
// de rolagem abre a etapa seguinte (1, 2, 3…). Cada título vira botão que rola até a sua etapa.
// Celular, tela baixa ou sem JS: tudo aberto, um embaixo do outro (a rolagem já segue a ordem).
const vitrine = document.querySelector('[data-vitrine]');
if (vitrine) {
  const itens = [...vitrine.querySelectorAll('.vitrine__item')];
  const titulos = itens.map((item) => item.querySelector('.vitrine__titulo'));
  const paineis = itens.map((item) => item.querySelector('.vitrine__painel'));
  const telas = itens.map((item) => item.querySelector('.vitrine__tela'));
  const nota = vitrine.parentElement.querySelector('.vitrine__nota');
  const telaLarga = window.matchMedia('(min-width: 901px) and (min-height: 600px)');

  // Estrutura do modo rolagem, montada uma vez
  const fixo = document.createElement('div'); fixo.className = 'vitrine__fixo';
  const lista = document.createElement('div'); lista.className = 'vitrine__lista';
  const palco = document.createElement('div'); palco.className = 'vitrine__palco';
  const andamento = document.createElement('div'); andamento.className = 'vitrine__andamento'; andamento.setAttribute('aria-hidden', 'true');
  andamento.innerHTML = itens.map(() => '<span></span>').join('');
  const tracos = [...andamento.children];
  const botoes = titulos.map((titulo, i) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.setAttribute('aria-controls', paineis[i].id = `vp-${i + 1}`);
    botao.addEventListener('click', () => irPara(i));
    return botao;
  });

  let ativo = -1;
  let rolagem = false;

  const abrir = (indice) => {
    if (indice === ativo) return;
    ativo = indice;
    itens.forEach((item, i) => {
      const esse = i === indice;
      item.classList.toggle('vitrine__item--aberto', esse);
      botoes[i].setAttribute('aria-expanded', String(esse));
      telas[i].classList.toggle('vitrine__tela--ativa', esse);
      tracos[i].classList.toggle('ativo', esse);
    });
  };

  // Quanto da seção já foi rolado (0 a 1) → etapa
  const trecho = () => vitrine.offsetHeight - fixo.offsetHeight;
  const topoFixo = () => parseFloat(getComputedStyle(vitrine).getPropertyValue('--fixo-topo')) || 96;
  const conferir = () => {
    if (!rolagem) return;
    const andado = topoFixo() - vitrine.getBoundingClientRect().top;
    const progresso = Math.min(Math.max(andado / trecho(), 0), 0.9999);
    abrir(Math.floor(progresso * itens.length));
  };
  function irPara(i) {
    const inicio = vitrine.getBoundingClientRect().top + window.scrollY - topoFixo();
    window.scrollTo({ top: inicio + trecho() * (i + 0.5) / itens.length, behavior: reduzirMovimento ? 'auto' : 'smooth' });
  }

  // Centraliza o bloco preso na altura da tela e reserva a altura da seção
  // (mede com cada etapa aberta e fica com a maior altura, para nada pular durante a rolagem)
  const medir = () => {
    const atual = ativo;
    fixo.style.minHeight = '';
    let maior = 0;
    itens.forEach((_, i) => { abrir(i); maior = Math.max(maior, fixo.offsetHeight); });
    ativo = -1;
    abrir(Math.max(atual, 0));
    fixo.style.minHeight = `${maior}px`;
    vitrine.style.setProperty('--fixo-altura', `${maior}px`);
    vitrine.style.setProperty('--fixo-topo', `${Math.max(24, (window.innerHeight - maior) / 2)}px`);
  };

  const montar = () => {
    rolagem = telaLarga.matches;
    if (rolagem) {
      titulos.forEach((titulo, i) => { botoes[i].append(...titulo.childNodes); titulo.append(botoes[i]); });
      telas.forEach((tela) => palco.append(tela));
      lista.append(...itens);
      fixo.append(lista, palco, andamento);
      if (nota) fixo.append(nota);
      vitrine.append(fixo);
      vitrine.classList.add('vitrine--rolagem');
      ativo = -1;
      medir();
      conferir();
      if (ativo < 0) abrir(0);
    } else {
      vitrine.classList.remove('vitrine--rolagem');
      titulos.forEach((titulo, i) => { if (botoes[i].parentNode === titulo) titulo.replaceChildren(...botoes[i].childNodes); });
      telas.forEach((tela, i) => paineis[i].append(tela));
      vitrine.replaceChildren(...itens);
      if (nota) vitrine.after(nota);
      itens.forEach((item) => item.classList.remove('vitrine__item--aberto'));
      vitrine.style.removeProperty('--fixo-altura');
      fixo.style.minHeight = '';
      ativo = -1;
    }
  };

  let agendado = false;
  window.addEventListener('scroll', () => {
    if (agendado || !rolagem) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; conferir(); });
  }, { passive: true });
  window.addEventListener('resize', () => { if (rolagem) { medir(); conferir(); } });
  telaLarga.addEventListener('change', montar);
  montar();
}

// ---------- Voltar ao início ----------
// Aparece quando o topo (hero) já saiu da maior parte da tela; leva de volta e põe o foco no título.
const voltarTopo = document.querySelector('[data-voltar-topo]');
const topoDaPagina = document.querySelector('[data-topo]');
let conferindoVoltar = false;

function conferirVoltar() {
  const longeDoTopo = topoDaPagina.getBoundingClientRect().bottom < window.innerHeight * 0.5;
  // Oculto usa visibility: hidden, que também o tira do teclado e do leitor de tela.
  voltarTopo.classList.toggle('voltar-topo--oculto', !longeDoTopo);
  conferindoVoltar = false;
}

window.addEventListener('scroll', () => {
  if (conferindoVoltar) return;
  conferindoVoltar = true;
  requestAnimationFrame(conferirVoltar);
}, { passive: true });
conferirVoltar();

voltarTopo.addEventListener('click', (evento) => {
  evento.preventDefault();
  // Vai ao topo da página (o hero fica preso no topo durante o efeito de zoom, então rolar até ele não basta).
  window.scrollTo({ top: 0, behavior: reduzirMovimento ? 'auto' : 'smooth' });
  history.replaceState(null, '', '#inicio');
  document.getElementById('hero-titulo').focus({ preventScroll: true });
});

// ---------- Ano no rodapé ----------
document.querySelector('[data-ano]').textContent = new Date().getFullYear();
