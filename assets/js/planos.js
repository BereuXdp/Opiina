// Opiina — planos exatamente como estão no site (preço, descrição e itens).
// Cliente, 2026-11-23: todos têm todas as funções; muda só unidades e usuários (Start 1/3 · Pro até 3/10 · Redes ilimitados).
// Usado pelo cadastro (onboarding.js) e pela confirmação do pagamento (pagamento-concluido.js).
const PLANOS = {
  start: {
    nome: 'Start', preco: 'R$ 147,00', desc: 'Para uma casa.',
    itens: ['1 unidade', '3 usuários', 'Todas as funções do Opiina'],
  },
  pro: {
    nome: 'Pro', preco: 'R$ 297,00', desc: 'Para quem tem até 3 casas.',
    itens: ['Até 3 unidades', '10 usuários', 'Todas as funções do Opiina'],
  },
  redes: {
    nome: 'Redes', preco: 'R$ 697,00', desc: 'Para a rede toda, sem limite.',
    itens: ['Unidades ilimitadas', 'Usuários ilimitados', 'Todas as funções do Opiina'],
  },
};

function el(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto) no.textContent = texto;
  return no;
}
