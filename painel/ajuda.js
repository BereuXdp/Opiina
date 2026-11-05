/* Central de ajuda (pedido do cliente, 2026-11-05).
   Busca nos tutoriais, link direto (?d=id) e atalho para o tour do painel.
   Os tutoriais que o perfil não usa já saíram pelo data-precisa (painel.js). */
if ($('[data-ajuda]')) iniciarAjuda();

function iniciarAjuda() {
  const campo = $('#ajuda-q');
  const contagem = $('[data-ajuda-contagem]');
  const vazio = $('[data-ajuda-vazio]');
  const itens = $$('.ajuda-item');
  const grupos = $$('[data-ajuda-grupo]');
  // Busca sem acento e sem maiúsculas: "senha" acha "Senha", "integracao" acha "Integrações"
  const normal = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const textos = new Map(itens.map((d) => [d, normal(d.textContent)]));

  function filtrar() {
    const termos = normal(campo.value.trim()).split(/\s+/).filter(Boolean);
    let visiveis = 0;
    itens.forEach((d) => {
      const ok = termos.every((t) => textos.get(d).includes(t));
      d.hidden = !ok;
      if (ok) visiveis += 1;
      // Com busca, abre o primeiro que achou (um aberto por vez); sem busca, volta tudo fechado
      if (termos.length) d.open = ok && visiveis === 1;
    });
    grupos.forEach((g) => { g.hidden = !$$('.ajuda-item', g).some((d) => !d.hidden); });
    vazio.hidden = visiveis > 0;
    contagem.innerHTML = termos.length
      ? `<strong>${visiveis}</strong> ${visiveis === 1 ? 'tutorial encontrado' : 'tutoriais encontrados'}`
      : `<strong>${itens.length}</strong> tutoriais`;
  }
  campo.addEventListener('input', () => {
    if (!campo.value.trim()) itens.forEach((d) => { d.open = false; });
    filtrar();
  });
  filtrar();

  // Link direto para um tutorial: ajuda.html?d=conectar-google
  const pedido = new URLSearchParams(location.search).get('d');
  const alvo = pedido && document.getElementById(pedido);
  if (alvo?.classList.contains('ajuda-item')) {
    alvo.open = true;
    alvo.scrollIntoView({ block: 'start' });
    $('summary', alvo).focus({ preventScroll: true });
  }
  // Um tutorial aberto por vez (pedido do cliente, 2026-11-05): abrir um fecha o anterior.
  // Fecha no clique, antes de abrir, e compensa a rolagem: se o anterior estava acima, o clicado não "pula".
  itens.forEach((d) => $('summary', d).addEventListener('click', () => {
    if (d.open) return;   // este clique vai fechar o próprio tutorial
    const antes = d.getBoundingClientRect().top;
    itens.forEach((outro) => { if (outro !== d) outro.open = false; });
    const desvio = d.getBoundingClientRect().top - antes;
    if (desvio) scrollBy({ top: desvio, behavior: 'instant' });
  }));

  // Ao abrir um tutorial, o endereço guarda qual é (dá para mandar o link para alguém da equipe)
  itens.forEach((d) => d.addEventListener('toggle', () => {
    if (!d.open || campo.value.trim()) return;
    const url = new URL(location.href);
    url.searchParams.set('d', d.id);
    history.replaceState(null, '', url);
  }));

  // "Ver o tour do painel": o mesmo tour da primeira entrada
  $('[data-ajuda-tour]').addEventListener('click', () => iniciarTour({ automatico: false }));
}
