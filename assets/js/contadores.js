// Opiina — landing page para contadores (2026-11-19). Complementa main.js.
// Escopo próprio (IIFE): os scripts clássicos dividem o escopo global com main.js.
(() => {
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Faixa de logos: duplica o trilho e põe para andar em loop ----------
  const trilho = document.querySelector('[data-faixa]');
  if (trilho && !semMovimento) {
    [...trilho.children].forEach((item) => {
      const copia = item.cloneNode(true);
      copia.setAttribute('aria-hidden', 'true');
      trilho.append(copia);
    });
    trilho.parentElement.classList.add('faixa--anda');
  }

  // ---------- Palavra que troca no título (restaurante? loja? clínica?…) ----------
  // Só visual: o título tem a frase completa para leitor de tela. Com movimento reduzido, fica parada na primeira.
  const giro = document.querySelector('[data-giro]');
  if (giro && !semMovimento) {
    const palavras = [...giro.children];
    let atual = 0;
    setInterval(() => {
      if (document.hidden) return;
      const saindo = palavras[atual];
      atual = (atual + 1) % palavras.length;
      saindo.classList.remove('giro__palavra--ativa');
      saindo.classList.add('giro__palavra--saindo');
      palavras[atual].classList.remove('giro__palavra--saindo');
      palavras[atual].classList.add('giro__palavra--ativa');
      setTimeout(() => saindo.classList.remove('giro__palavra--saindo'), 600);
    }, 2200);
  }

  // ---------- Formulário de parceria ----------
  // PROTÓTIPO: valida e mostra a confirmação, mas não envia nada.
  // Para publicar de verdade, trocar o corpo de enviar() pela chamada real (API do app, formulário de e-mail etc.).
  const form = document.querySelector('[data-form-parceria]');
  if (!form) return;
  const sucesso = document.querySelector('[data-sucesso]');

  const regras = {
    nome: (v) => (v.trim().length >= 2 ? '' : 'Informe seu nome.'),
    escritorio: (v) => (v.trim().length >= 2 ? '' : 'Informe o nome do escritório.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Informe um e-mail válido, como voce@escritorio.com.br.'),
    telefone: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Informe o WhatsApp com DDD.'),
    senha: (v) => (v.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'),
  };

  const mostrarErro = (campo, mensagem) => {
    const erro = document.getElementById(`${campo.id}-erro`);
    campo.setAttribute('aria-invalid', String(Boolean(mensagem)));
    erro.textContent = mensagem;
    erro.hidden = !mensagem;
  };

  const validar = (campo) => {
    const regra = regras[campo.name];
    if (!regra) return true;
    const mensagem = regra(campo.value);
    mostrarErro(campo, mensagem);
    return !mensagem;
  };

  // Máscara simples de telefone: (00) 00000-0000
  const telefone = form.elements.telefone;
  telefone.addEventListener('input', () => {
    const d = telefone.value.replace(/\D/g, '').slice(0, 11);
    let v = d;
    if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    telefone.value = v;
  });

  // Valida ao sair do campo; depois do primeiro erro, corrige enquanto digita
  Object.keys(regras).forEach((nome) => {
    const campo = form.elements[nome];
    campo.addEventListener('blur', () => { if (campo.value) validar(campo); });
    campo.addEventListener('input', () => { if (campo.getAttribute('aria-invalid') === 'true') validar(campo); });
  });

  // PROTÓTIPO: cria a conta no navegador (parceiros.js) e gera o cupom. A senha não é guardada.
  // No app, este envio cria a conta no servidor, que gera o cupom único e devolve.
  const P = window.OpiinaParceiros;

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const campos = Object.keys(regras).map((nome) => form.elements[nome]);
    const invalidos = campos.filter((campo) => !validar(campo));
    if (invalidos.length) {
      invalidos[0].focus();
      return;
    }
    const formulario = new FormData(form);
    const { senha, ...dados } = { ...Object.fromEntries(formulario), nichos: formulario.getAll('nichos') };
    const conta = P.criarConta({ ...dados, nome: dados.nome.trim(), escritorio: dados.escritorio.trim() });
    document.querySelector('[data-sucesso-nome]').textContent = conta.nome.split(/\s+/)[0];
    document.querySelector('[data-sucesso-cupom]').textContent = conta.cupom;
    form.hidden = true;
    sucesso.hidden = false;
    document.querySelector('[data-sucesso-titulo]').focus();
  });

  const copiar = document.querySelector('[data-copiar-cupom]');
  copiar?.addEventListener('click', async () => {
    const cupom = document.querySelector('[data-sucesso-cupom]').textContent;
    try { await navigator.clipboard.writeText(cupom); copiar.textContent = 'Copiado!'; } catch { copiar.textContent = 'Selecione e copie'; }
    setTimeout(() => { copiar.textContent = 'Copiar'; }, 2000);
  });
})();
