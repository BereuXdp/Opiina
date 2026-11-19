// Opiina — login do parceiro (protótipo, 2026-11-19).
// login.js valida os campos e cuida do modal de senha; quando está tudo válido, avisa com o evento "login-valido".
// PROTÓTIPO: entra com qualquer coisa (pedido do cliente, 2026-11-19). No app, a senha é conferida no servidor
// e o erro deve ser neutro ("E-mail ou senha incorretos."), sem dizer se o e-mail tem conta.
(() => {
  const P = window.OpiinaParceiros;
  const form = document.querySelector('[data-login="parceiro"]');
  const aviso = form.querySelector('[data-status]');

  // Já tem sessão aberta nesta aba: vai direto para o painel.
  if (P.sessao()) location.replace('painel/parceiro.html');

  form.addEventListener('login-valido', () => {
    const tipo = P.login(form.email.value);
    if (!tipo) {
      aviso.textContent = 'E-mail ou senha incorretos.';
      aviso.classList.add('formulario__status--erro');
      form.email.focus();
      return;
    }
    P.entrar(tipo);
    aviso.classList.remove('formulario__status--erro');
    aviso.textContent = 'Entrando…';
    location.href = 'painel/parceiro.html';
  });
})();
