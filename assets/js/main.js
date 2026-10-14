// Opiina — interações da home. Sem dependências.
// Tudo aqui é melhoria progressiva: sem JS, a página funciona e o conteúdo aparece.

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const raiz = document.documentElement;

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
