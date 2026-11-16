// Opiina — confirmação do pagamento (protótipo). PLANOS e el() vêm de planos.js.
// Sem ?plan= válido, a página continua correta, só sem o nome e o preço do plano.

const chave = new URLSearchParams(location.search).get('plan');
const plano = Object.hasOwn(PLANOS, chave) ? PLANOS[chave] : null;
const resumo = document.querySelector('[data-plano-resumo]');

document.querySelector('[data-s="data"]').textContent =
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

if (plano) {
  document.querySelector('[data-texto]').textContent =
    `Seu plano ${plano.nome} está ativo. O painel do Opiina já está liberado para você.`;
  document.querySelector('[data-s="plano"]').textContent = `${plano.nome} · ${plano.preco} por mês`;
  document.querySelector('[data-linha-plano]').hidden = false;

  // Painel da marca (desktop): o plano pago, com os itens.
  resumo.append(el('p', 'plano-resumo__rotulo', 'Plano contratado'));
  resumo.append(el('p', 'plano-resumo__nome', plano.nome));
  const preco = el('p', 'plano-resumo__preco', plano.preco);
  preco.append(el('small', '', '/mês'));
  resumo.append(preco);
  resumo.append(el('p', 'plano-resumo__desc', plano.desc));
  resumo.append(el('p', 'plano-resumo__pilula', 'Pagamento confirmado'));
  const lista = el('ul', 'login__lista');
  plano.itens.forEach((item) => lista.append(el('li', '', item)));
  resumo.append(lista);
} else {
  resumo.append(el('p', 'plano-resumo__nome', 'Tudo pronto'));
  resumo.append(el('p', 'plano-resumo__desc', 'Seu pagamento foi confirmado.'));
}

// O título recebe o foco para o leitor de tela anunciar a confirmação.
document.querySelector('[data-sucesso-titulo]').focus();
