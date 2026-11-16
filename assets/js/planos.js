// Opiina — planos exatamente como estão no site (preço, descrição e itens).
// Usado pelo cadastro (onboarding.js) e pela confirmação do pagamento (pagamento-concluido.js).
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
