// Opiina — canal de denúncias público (protótipo): o que a equipe abre pelo link ou QR Code do canal.
// Formulário → protocolo. Sem login. A denúncia não sai do navegador: entra na lista de Denúncias
// do painel só nesta aba (sessionStorage "opiina-demo-denuncias", o mesmo do painel).

const D = window.OPIINA_DEMO;
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icone = (nome) => `<svg class="icone" aria-hidden="true"><use href="icones.svg#${nome}"/></svg>`;

const form = $('[data-canal-form]');
D.denunciaCategorias.forEach((c) => form.categoria.add(new Option(c, c)));
D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
form.quando.max = new Date().toISOString().slice(0, 10);

// Anônimo ou identificado: os campos de nome e contato só aparecem no segundo
const dados = $('[data-canal-dados]');
form.addEventListener('change', (e) => {
  if (e.target.name !== 'ident') return;
  dados.hidden = form.ident.value !== 'identificada';
  if (!dados.hidden) form.nome.focus();
});

function marcar(campo, erro) {
  if (erro) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
  document.getElementById(`${campo.id}-erro`).hidden = !erro;
  return erro;
}
form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) marcar(e.target, false); });

// Protocolo no formato do app atual: DEN + data + 3 caracteres (ex.: DEN20261014-4F2)
function protocolo() {
  const d = new Date();
  const data = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `DEN${data}-${Math.floor(Math.random() * 4096).toString(16).toUpperCase().padStart(3, '0')}`;
}

// Mesma lista do painel (denuncias.js): se a aba ainda não tem, parte dos exemplos
function listaDoPainel() {
  try { const s = JSON.parse(sessionStorage.getItem('opiina-demo-denuncias')); if (Array.isArray(s)) return s; } catch { /* usa os exemplos */ }
  return D.denuncias.map((x) => ({
    ...x,
    historico: [
      { dias: x.criada, texto: `Recebida pelo canal (${x.identificacao ? 'identificada' : 'anônima'})` },
      ...(x.situacao !== 'Recebida' ? [{ dias: Math.min(0, x.criada + 1), texto: `Situação alterada para "${x.situacao}"` }] : []),
    ],
  }));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const identificada = form.ident.value === 'identificada';
  const contato = form.contato.value.trim();
  const erros = [
    marcar(form.categoria, !form.categoria.value),
    marcar(form.resumo, !form.resumo.value.trim()),
    marcar(form.relato, form.relato.value.trim().length < 20),
    identificada && marcar(form.nome, !form.nome.value.trim()),
    identificada && marcar(form.contato, !(/^\S+@\S+\.\S+$/.test(contato) || contato.replace(/\D/g, '').length >= 10)),
  ];
  const aviso = $('[data-canal-erro]');
  const n = erros.filter(Boolean).length;
  aviso.hidden = !n;
  aviso.textContent = n ? `Confira ${n === 1 ? 'o campo destacado' : `os ${n} campos destacados`}.` : '';
  if (n) { $('[aria-invalid]', form).focus(); return; }

  const numero = protocolo();
  const quando = form.quando.value ? new Date(`${form.quando.value}T12:00`).toLocaleDateString('pt-BR') : '';
  const lista = listaDoPainel();
  lista.unshift({
    id: numero, categoria: form.categoria.value, unidade: form.unidade.value || null, criada: 0,
    identificacao: identificada ? { nome: form.nome.value.trim(), contato } : null,
    situacao: 'Recebida', prioridade: 'Média',   // a prioridade é revista pelo time responsável
    resumo: form.resumo.value.trim(),
    relato: `${form.relato.value.trim()}${quando ? `\n\nQuando aconteceu: ${quando}.` : ''}`,
    historico: [{ dias: 0, texto: `Recebida pelo canal (${identificada ? 'identificada' : 'anônima'})` }],
  });
  try { sessionStorage.setItem('opiina-demo-denuncias', JSON.stringify(lista)); } catch { /* sem armazenamento: só mostra o protocolo */ }

  // Confirmação com o protocolo
  $('[data-canal]').innerHTML = `
    <div class="cli__marca"><img src="../assets/icons/logo-opiina-64.png" alt="">Casa Exemplo</div>
    <div class="cli__fim canal__fim">
      <span class="cli__fim-icone" aria-hidden="true">${icone('ok')}</span>
      <h1 class="cli__titulo" tabindex="-1" data-fim>Denúncia enviada</h1>
      <p class="cli__desc">${identificada ? 'O time responsável pode falar com você pelo contato que deixou.' : 'Ela foi enviada <strong>sem seu nome e sem contato</strong>.'}</p>
      <div class="canal__protocolo">
        <span>Protocolo</span>
        <strong data-protocolo>${numero}</strong>
        <button class="btn btn--secundario" type="button" data-copiar>${icone('link')}Copiar protocolo</button>
      </div>
      <p class="cli__desc">Guarde este número: ele identifica sua denúncia se você precisar falar sobre ela.</p>
      <p class="cli__desc">Obrigado por avisar. Pode fechar esta página.</p>
    </div>`;
  // Só no protótipo: atalho para ver a denúncia chegando no painel (mesma aba)
  $('.pub__prototipo').innerHTML = 'Protótipo: a denúncia foi para <a href="denuncias.html">Painel › Denúncias</a> (só neste navegador).';
  scrollTo(0, 0);
  $('[data-fim]').focus();
  $('[data-copiar]').addEventListener('click', async (ev) => {
    const b = ev.currentTarget;
    try { await navigator.clipboard.writeText(numero); b.lastChild.textContent = 'Protocolo copiado'; }
    catch { getSelection().selectAllChildren($('[data-protocolo]')); b.lastChild.textContent = 'Selecionado: copie com Ctrl+C'; }
  });
});
