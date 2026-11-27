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

// Mesma lista e mesma chave do painel (denuncias.js, v2): se a aba ainda não tem, parte dos exemplos
const CHAVE_DEN = 'opiina-demo-denuncias-v2';
const ENCERRADAS = ['Concluída', 'Arquivada'];
function historicoInicial(d) {   // igual ao de denuncias.js (esta página não carrega painel.js)
  const h = [{ dias: d.criada, texto: `Recebida pelo canal (${d.identificacao ? 'identificada' : 'anônima'})` }];
  if (d.situacao !== 'Recebida') h.push({ dias: d.primeiraAnalise ?? Math.min(0, d.criada + 1), texto: 'Análise iniciada' });
  (d.mensagens || []).forEach((m) => h.push({ dias: m.dias, texto: m.de === 'equipe' ? 'Mensagem enviada a quem denunciou' : 'Quem denunciou respondeu pelo protocolo' }));
  if (ENCERRADAS.includes(d.situacao)) h.push({ dias: d.concluida ?? 0, texto: `${d.situacao}${d.desfecho ? `: ${d.desfecho}` : ''}` });
  else if (!['Recebida', 'Em análise'].includes(d.situacao)) h.push({ dias: Math.min(0, (d.primeiraAnalise ?? d.criada) + 1), texto: `Situação alterada para "${d.situacao}"` });
  return h.sort((a, b) => a.dias - b.dias);
}
function listaDoPainel() {
  try { const s = JSON.parse(sessionStorage.getItem(CHAVE_DEN)); if (Array.isArray(s) && s.length) return s; } catch { /* usa os exemplos */ }
  return D.denuncias.map((x) => ({ mensagens: [], ...x, historico: historicoInicial(x) }));
}
const salvarLista = (lista) => { try { sessionStorage.setItem(CHAVE_DEN, JSON.stringify(lista)); return true; } catch { return false; } };

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
    mensagens: [],
    historico: [{ dias: 0, texto: `Recebida pelo canal (${identificada ? 'identificada' : 'anônima'})` }],
  });
  salvarLista(lista);   // sem armazenamento: só mostra o protocolo

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
      <p class="cli__desc">Guarde este número: com ele você acompanha a denúncia e responde ao time responsável nesta mesma página, em "Acompanhe pelo protocolo".</p>
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

// ── Acompanhar pelo protocolo (2026-11-27) ──
// Quem denunciou (até anônimo) vê a situação e as mensagens do time e responde. Não mostra notas internas,
// prioridade, desfecho nem medidas: só o que o time escreveu para a pessoa.
const normalizar = (t) => String(t).toUpperCase().replace(/[^A-Z0-9]/g, '');
const textoDia = (dias) => (dias === 0 ? 'hoje' : dias === -1 ? 'ontem' : `há ${-dias} dias`);

function situacaoPublica(d) {
  const ultima = (d.mensagens || []).at(-1);
  if (d.situacao === 'Recebida') return ['Recebida', 'Sua denúncia chegou e ainda vai ser analisada pelo time responsável.'];
  if (d.situacao === 'Aguardando informações' && ultima?.de === 'equipe') return ['Aguardando sua resposta', 'O time responsável fez uma pergunta. Responda aqui embaixo; você não precisa se identificar.'];
  if (ENCERRADAS.includes(d.situacao)) return ['Encerrada', 'A apuração terminou. Por sigilo, as medidas tomadas não são detalhadas aqui.'];
  return ['Em apuração', 'O time responsável está apurando o que você relatou.'];
}

function mostrarAcompanhamento(id) {
  const lista = listaDoPainel();
  const d = lista.find((x) => x.id === id);
  const [rotulo, explica] = situacaoPublica(d);
  const encerrada = ENCERRADAS.includes(d.situacao);
  const msgs = d.mensagens || [];
  $('[data-canal]').innerHTML = `
    <div class="cli__marca"><img src="../assets/icons/logo-opiina-64.png" alt="">Casa Exemplo</div>
    <div class="canal__topo">
      <p class="canal__acomp-voltar"><a href="canal.html">← Voltar ao canal</a></p>
      <h1 class="cli__titulo" tabindex="-1" data-acomp-titulo>Sua denúncia</h1>
      <p class="cli__desc">Protocolo <strong>${esc(d.id)}</strong> · enviada ${textoDia(d.criada)}</p>
    </div>
    <div class="canal__situacao canal__situacao--${encerrada ? 'fim' : rotulo === 'Aguardando sua resposta' ? 'resposta' : 'andamento'}" role="status">
      <strong>${rotulo}</strong><span>${explica}</span>
    </div>
    <section class="canal__conversa" aria-labelledby="canal-conversa-t">
      <h2 id="canal-conversa-t" class="canal__conversa-t">Mensagens</h2>
      ${msgs.length ? `<ul class="den-mensagens canal__mensagens">${msgs.map((m) => `
        <li class="den-msg den-msg--${m.de === 'equipe' ? 'equipe' : 'denunciante'}">
          <span class="den-msg__quem">${m.de === 'equipe' ? 'Time responsável' : 'Você'} · ${textoDia(m.dias)}</span>
          <p>${esc(m.texto)}</p>
        </li>`).join('')}</ul>` : '<p class="cli__desc">Ainda não há mensagens. Se o time precisar de mais detalhes, a pergunta aparece aqui.</p>'}
      ${encerrada ? '<p class="cli__desc">Esta denúncia foi encerrada. Se aconteceu algo novo, faça uma nova denúncia pelo canal.</p>' : `
      <form class="den-msg-form" data-acomp-form novalidate>
        <div class="campo">
          <label for="a-resposta">${msgs.length ? 'Responder ao time responsável' : 'Acrescentar uma informação'}</label>
          <textarea id="a-resposta" name="resposta" rows="4" aria-describedby="a-resposta-dica a-resposta-erro"></textarea>
          <p class="campo__dica" id="a-resposta-dica">Se quiser continuar anônimo, não escreva seu nome nem detalhes que identifiquem você.</p>
          <p class="campo__erro" id="a-resposta-erro" hidden>Escreva a mensagem antes de enviar.</p>
        </div>
        <button class="cli__enviar" type="submit">Enviar mensagem</button>
      </form>`}
    </section>`;
  $('.pub__prototipo').innerHTML = 'Protótipo: a resposta vai para <a href="denuncias.html?aba=lista">Painel › Denúncias</a> (só neste navegador).';
  scrollTo(0, 0);
  $('[data-acomp-titulo]').focus();

  const f = $('[data-acomp-form]');
  if (!f) return;
  f.resposta.addEventListener('input', () => marcar(f.resposta, false));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = f.resposta.value.trim();
    if (marcar(f.resposta, !texto)) { f.resposta.focus(); return; }
    d.mensagens = [...msgs, { de: 'denunciante', dias: 0, texto }];
    d.historico = [...(d.historico || []), { dias: 0, texto: 'Quem denunciou respondeu pelo protocolo' }];
    salvarLista(lista);
    mostrarAcompanhamento(id);
    const aviso = document.createElement('p');
    aviso.className = 'canal__enviado'; aviso.setAttribute('role', 'status');
    aviso.textContent = 'Mensagem enviada ao time responsável.';
    $('.canal__conversa').prepend(aviso);
  });
}

const consulta = $('[data-canal-consulta]');
consulta.protocolo.addEventListener('input', () => marcar(consulta.protocolo, false));
consulta.addEventListener('submit', (e) => {
  e.preventDefault();
  const busca = normalizar(consulta.protocolo.value);
  const achada = busca && listaDoPainel().find((x) => normalizar(x.id) === busca);
  if (marcar(consulta.protocolo, !achada)) { consulta.protocolo.focus(); return; }
  mostrarAcompanhamento(achada.id);
});
