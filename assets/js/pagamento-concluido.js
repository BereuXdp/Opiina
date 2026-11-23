// Opiina — confirmação do pagamento (protótipo). PLANOS e el() vêm de planos.js.
// Sem ?plan= válido, a página continua correta, só sem o nome e o preço do plano.

const chave = new URLSearchParams(location.search).get('plan');
const plano = Object.hasOwn(PLANOS, chave) ? PLANOS[chave] : null;
const resumo = document.querySelector('[data-plano-resumo]');

document.querySelector('[data-s="data"]').textContent =
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

if (plano) {
  document.querySelector('[data-texto]').textContent =
    `Seu plano ${plano.nome} está liberado. Cancele dentro de 7 dias e não paga nada.`;
  document.querySelector('[data-s="plano"]').textContent = `${plano.nome} · ${plano.preco} por mês`;
  document.querySelector('[data-linha-plano]').hidden = false;

  // Painel da marca (desktop): o plano pago, com os itens.
  resumo.append(el('p', 'plano-resumo__rotulo', 'Plano contratado'));
  resumo.append(el('p', 'plano-resumo__nome', plano.nome));
  const preco = el('p', 'plano-resumo__preco', plano.preco);
  preco.append(el('small', '', '/mês'));
  resumo.append(preco);
  resumo.append(el('p', 'plano-resumo__desc', plano.desc));
  resumo.append(el('p', 'plano-resumo__pilula', '7 dias grátis ativos'));
  const lista = el('ul', 'login__lista');
  plano.itens.forEach((item) => lista.append(el('li', '', item)));
  resumo.append(lista);
} else {
  resumo.append(el('p', 'plano-resumo__nome', 'Tudo pronto'));
  resumo.append(el('p', 'plano-resumo__desc', 'Seus 7 dias grátis começaram.'));
}

// Indicação de parceiro (2026-11-19): com o pagamento aprovado, a comissão do contador é liberada.
// No app, isso acontece no servidor, pelo aviso (webhook) da Stripe, não por esta página.
const indicacaoPaga = new URLSearchParams(location.search).get('ind');
if (indicacaoPaga && window.OpiinaParceiros) window.OpiinaParceiros.marcarPaga(indicacaoPaga);

// O título recebe o foco para o leitor de tela anunciar a confirmação.
document.querySelector('[data-sucesso-titulo]').focus();
