// Suporte da Dev+ (protótipo; a Dev+ desenvolve o Opiina): abrir chamado (suporte.html) e consultar a ordem de serviço (suporte-consulta.html).
// Páginas públicas, sem login: servem também para quem não consegue entrar no sistema.
// Nada é enviado: os chamados ficam neste navegador (localStorage "opiina-demo-suporte"), para a consulta
// funcionar em outra aba. Do painel, o link chega com ?de=painel e já preenche os dados da conta.

const D = window.OPIINA_DEMO;
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icone = (nome) => `<svg class="icone" aria-hidden="true"><use href="icones.svg#${nome}"/></svg>`;

const CHAVE = 'opiina-demo-suporte';
const CHAVE_ULTIMO = 'opiina-demo-suporte-ultimo';   // OS recém-aberta: a consulta já abre nela (sessionStorage, nada no endereço)
const TIPOS = ['Dúvida de uso', 'Erro ou algo que não funciona', 'Acesso e senha', 'Plano e cobrança', 'Sugestão'];
const AREAS = ['Login e acesso', 'Dashboard', 'Ranking', 'Feedbacks', 'Denúncias', 'Pesquisas', 'Link ou QR Code da pesquisa', 'Clientes', 'Configurações'];
// Etapas do chamado, na ordem. A cor segue as etapas das ocorrências (classes .etapa--*).
const ETAPAS = [
  { nome: 'Recebido',        classe: 'nova',               texto: 'Seu chamado chegou à equipe de suporte.' },
  { nome: 'Em análise',      classe: 'visualizada',        texto: 'A equipe está entendendo o problema e localizando sua conta.' },
  { nome: 'Em atendimento',  classe: 'em-andamento',       texto: 'A equipe está trabalhando na solução.' },
  { nome: 'Aguardando você', classe: 'aguardando-cliente', texto: 'A equipe precisa de uma informação sua para continuar.' },
  { nome: 'Resolvido',       classe: 'resolvida',          texto: 'O chamado foi resolvido.' },
];
const etapa = (nome) => ETAPAS.find((e) => e.nome === nome) || ETAPAS[0];

const limpar = (t) => String(t).replace(/\D/g, '');
const normalizar = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const emailValido = (v) => /^\S+@\S+\.\S+$/.test(v);
function cnpjValido(texto) {
  const c = String(texto).toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base) => {
    let soma = 0, peso = 2;
    for (let i = base.length - 1; i >= 0; i--) { soma += (base.charCodeAt(i) - 48) * peso; peso = peso === 9 ? 2 : peso + 1; }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = dv(c.slice(0, 12));
  return c.slice(12) === `${d1}${dv(c.slice(0, 12) + d1)}`;
}
function mascaraCnpj(campo) {
  campo.addEventListener('input', () => {
    const c = limpar(campo.value).slice(0, 14);
    const partes = [c.slice(0, 2), c.slice(2, 5), c.slice(5, 8)].filter(Boolean).join('.');
    campo.value = c.length > 8 ? `${partes}/${c.slice(8, 12)}${c.length > 12 ? `-${c.slice(12)}` : ''}` : partes;
  });
}
const dataHora = (ms) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

// Chamado de exemplo (fictício), para a consulta ter algo a mostrar com todas as etapas
function exemplo() {
  const agora = Date.now(), h = 3600e3;
  const em = (horas) => agora - horas * h;
  const criado = em(4 * 24 + 5);
  const d = new Date(criado);
  const data = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return {
    os: `OS${data}-7K2Q`, sistema: 'Opiina', exemplo: true,
    nome: 'Ana Souza', email: 'ana@casaexemplo.com.br', painel: 'casaexemplo',
    empresa: 'Casa Exemplo', cnpj: '00.000.000/0001-00', unidade: 'Orla',
    telefone: '(00) 90000-0000', canal: 'WhatsApp', horario: 'Tarde',
    tipo: 'Erro ou algo que não funciona', area: 'Link ou QR Code da pesquisa', impacto: 'Atrapalha',
    resumo: 'O QR Code da unidade Orla não abre a pesquisa',
    descricao: 'Imprimimos o QR Code da pesquisa da Orla e, ao apontar a câmera, o celular mostra "página não encontrada". O link copiado funciona.',
    etapa: 'Aguardando você', criado,
    historico: [
      { quando: criado, quem: 'sistema', texto: 'Chamado aberto pelo formulário de suporte.', etapa: 'Recebido' },
      { quando: em(4 * 24 + 4), quem: 'sistema', texto: 'A equipe começou a analisar o chamado.', etapa: 'Em análise' },
      { quando: em(3 * 24 + 1), quem: 'equipe', texto: 'Localizamos sua conta e estamos verificando o link gravado no QR Code da Orla.', etapa: 'Em atendimento' },
      { quando: em(20), quem: 'equipe', texto: 'Pode nos dizer se o QR Code foi baixado antes ou depois do dia 10? Se puder, responda aqui embaixo com a data da impressão.', etapa: 'Aguardando você' },
    ],
  };
}

function carregar() {
  let lista = null;
  try { lista = JSON.parse(localStorage.getItem(CHAVE)); } catch { /* sem armazenamento */ }
  if (!Array.isArray(lista)) lista = [];
  if (!lista.some((c) => c.exemplo)) lista.push(exemplo());
  return lista;
}
function salvar(lista) { try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* sem armazenamento: vale só nesta página */ } }

function numeroOS() {
  const d = new Date();
  const data = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const letras = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // sem I e O, que confundem com 1 e 0
  let fim = '';
  for (let i = 0; i < 4; i++) fim += letras[Math.floor(Math.random() * letras.length)];
  return `OS${data}-${fim}`;
}

function marcar(campo, erro) {
  if (erro) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
  const msg = document.getElementById(`${campo.id}-erro`);
  if (msg) msg.hidden = !erro;
  return erro;
}
function avisoGeral(form, n) {
  const aviso = $('[data-sup-erro]');
  aviso.hidden = !n;
  aviso.textContent = n ? `Confira ${n === 1 ? 'o campo destacado' : `os ${n} campos destacados`}.` : '';
  if (n) $('[aria-invalid]', form).focus();
  return n;
}

// Vindo do painel (?de=painel): link de volta e dados da conta já preenchidos
// Fora do painel (cópia no repositório da Dev+, sem dados.js), D não existe e nada é preenchido.
const doPainel = Boolean(D) && new URLSearchParams(location.search).get('de') === 'painel';
function dadosDoPainel() {
  let perfilId = 'admin', cfg = null;
  try { perfilId = sessionStorage.getItem('opiina-demo-perfil') || 'admin'; } catch { /* usa admin */ }
  try { cfg = JSON.parse(sessionStorage.getItem('opiina-demo-config')); } catch { /* usa os exemplos */ }
  const i = Math.max(0, D.usuarios.findIndex((u) => u.perfil === perfilId));
  const usuario = cfg?.usuarios?.[i] || D.usuarios[i];
  const documento = cfg?.empresa?.documento || '';
  return {
    nome: usuario.nome, email: usuario.email, painel: 'casaexemplo',
    empresa: cfg?.empresa?.fantasia || D.empresa,
    cnpj: cnpjValido(documento) ? documento : '',
    telefone: usuario.telefone || '',
  };
}
if (doPainel) {
  $('[data-sup-painel]').hidden = false;
  document.querySelectorAll('a[href^="suporte"]').forEach((a) => { a.href += '?de=painel'; });
}

// ======================= Abrir chamado =======================
const form = $('[data-sup-form]');
if (form) {
  TIPOS.forEach((t) => form.tipo.add(new Option(t, t)));
  AREAS.forEach((a) => form.area.add(new Option(a, a)));
  mascaraCnpj(form.cnpj);
  form.painel.addEventListener('input', () => { form.painel.value = form.painel.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); });
  if (doPainel) {
    const p = dadosDoPainel();
    ['nome', 'email', 'painel', 'empresa', 'cnpj', 'telefone'].forEach((k) => { if (p[k]) form[k].value = p[k]; });
  }
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) marcar(e.target, false); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const erros = [
      marcar(form.nome, !form.nome.value.trim()),
      marcar(form.email, !emailValido(form.email.value.trim())),
      marcar(form.empresa, !form.empresa.value.trim()),
      marcar(form.cnpj, !cnpjValido(form.cnpj.value)),
      marcar(form.telefone, limpar(form.telefone.value).length < 10),
      marcar(form.tipo, !form.tipo.value),
      marcar(form.resumo, !form.resumo.value.trim()),
      marcar(form.descricao, form.descricao.value.trim().length < 20),
    ];
    if (avisoGeral(form, erros.filter(Boolean).length)) return;

    const v = (k) => form[k].value.trim();
    const agora = Date.now();
    const chamado = {
      os: numeroOS(), sistema: v('sistema'),
      nome: v('nome'), email: v('email').toLowerCase(), painel: v('painel'),
      empresa: v('empresa'), cnpj: v('cnpj'), unidade: v('unidade'),
      telefone: v('telefone'), canal: form.canal.value, horario: v('horario'),
      tipo: v('tipo'), area: v('area'), impacto: form.impacto.value,
      resumo: v('resumo'), descricao: v('descricao'),
      etapa: 'Recebido', criado: agora,
      historico: [{ quando: agora, quem: 'sistema', texto: 'Chamado aberto pelo formulário de suporte.', etapa: 'Recebido' }],
    };
    const lista = carregar();
    lista.unshift(chamado);
    salvar(lista);
    try { sessionStorage.setItem(CHAVE_ULTIMO, chamado.os); } catch { /* ignora */ }

    const linkConsulta = `suporte-consulta.html${doPainel ? '?de=painel' : ''}`;
    $('[data-sup]').innerHTML = `
      <div class="sup__topo-links">
        <div class="dev__marca"><img src="../assets/icons/logo-devmais.png" alt="Dev+" width="385" height="96"><span>Suporte</span></div>
        ${doPainel ? '<a class="sup__voltar" href="index.html">Voltar ao painel</a>' : ''}
      </div>
      <div class="cli__fim canal__fim">
        <span class="cli__fim-icone" aria-hidden="true">${icone('ok')}</span>
        <h1 class="cli__titulo" tabindex="-1" data-fim>Chamado aberto</h1>
        <p class="cli__desc">Recebemos seu pedido sobre <strong>${esc(chamado.resumo)}</strong>.</p>
        <div class="canal__protocolo">
          <span>Ordem de serviço</span>
          <strong data-protocolo>${chamado.os}</strong>
          <button class="btn btn--secundario" type="button" data-copiar>${icone('link')}Copiar número</button>
        </div>
        <p class="cli__desc">Guarde este número. Para consultar, você vai precisar dele, do seu nome, do e-mail <strong>${esc(chamado.email)}</strong> e do CNPJ da empresa.</p>
        <p class="cli__desc">A equipe vai falar com você por <strong>${esc(chamado.canal)}</strong>${chamado.horario ? `, de ${esc(chamado.horario.toLowerCase())}` : ''}.</p>
        <a class="cli__enviar sup__acompanhar" href="${linkConsulta}">Acompanhar este chamado</a>
      </div>`;
    scrollTo(0, 0);
    $('[data-fim]').focus();
    $('[data-copiar]').addEventListener('click', async (ev) => {
      const b = ev.currentTarget;
      try { await navigator.clipboard.writeText(chamado.os); b.lastChild.textContent = 'Número copiado'; }
      catch { getSelection().selectAllChildren($('[data-protocolo]')); b.lastChild.textContent = 'Selecionado: copie com Ctrl+C'; }
    });
  });
}

// ======================= Consultar ordem de serviço =======================
const consulta = $('[data-sup-consulta]');
if (consulta) {
  const resultado = $('[data-sup-resultado]');
  mascaraCnpj(consulta.cnpj);
  consulta.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) marcar(e.target, false); });

  const preencher = (c) => {
    consulta.os.value = c.os; consulta.nome.value = c.nome; consulta.email.value = c.email; consulta.cnpj.value = c.cnpj;
  };
  $('[data-sup-exemplo]').addEventListener('click', () => {
    preencher(carregar().find((c) => c.exemplo));
    consulta.querySelectorAll('[aria-invalid]').forEach((c) => marcar(c, false));
    $('[data-sup-erro]').hidden = true;
    consulta.os.focus();
  });
  if (doPainel) {
    const p = dadosDoPainel();
    consulta.nome.value = p.nome; consulta.email.value = p.email; consulta.cnpj.value = p.cnpj;
  }

  // Quem acabou de abrir o chamado chega direto nele
  let ultimo = null;
  try { ultimo = sessionStorage.getItem(CHAVE_ULTIMO); } catch { /* ignora */ }
  const recente = ultimo && carregar().find((c) => c.os === ultimo);
  if (recente) { preencher(recente); mostrar(recente.os, false); }

  consulta.addEventListener('submit', (e) => {
    e.preventDefault();
    const erros = [
      marcar(consulta.os, !consulta.os.value.trim()),
      marcar(consulta.nome, !consulta.nome.value.trim()),
      marcar(consulta.email, !emailValido(consulta.email.value.trim())),
      marcar(consulta.cnpj, limpar(consulta.cnpj.value).length !== 14),
    ];
    if (avisoGeral(consulta, erros.filter(Boolean).length)) return;

    const os = consulta.os.value.toUpperCase().replace(/\s/g, '').replace(/^(OS)?-?/, 'OS');
    const achado = carregar().find((c) => c.os === os
      && c.sistema === consulta.sistema.value
      && normalizar(c.nome) === normalizar(consulta.nome.value)
      && c.email.toLowerCase() === consulta.email.value.trim().toLowerCase()
      && limpar(c.cnpj) === limpar(consulta.cnpj.value));
    if (!achado) {
      // Mensagem única de propósito: não diz qual dado não bateu (ninguém descobre dados de outro chamado)
      const aviso = $('[data-sup-erro]');
      aviso.hidden = false;
      aviso.textContent = 'Não encontramos um chamado com esses dados. Confira o número da ordem de serviço, o nome, o e-mail e o CNPJ, que precisam ser os mesmos usados ao abrir.';
      return;
    }
    mostrar(achado.os, true);
  });

  function mostrar(os, focar) {
    const lista = carregar();
    const c = lista.find((x) => x.os === os);
    const atual = ETAPAS.indexOf(etapa(c.etapa));
    const resolvido = c.etapa === 'Resolvido';
    consulta.hidden = true;
    resultado.hidden = false;
    $('[data-sup-titulo]').textContent = `Ordem de serviço ${c.os}`;
    document.title = `${c.os} — Suporte Dev+`;
    $('.canal__topo .cli__desc').textContent = c.resumo;

    resultado.innerHTML = `
      <div class="sup__situacao">
        <span class="etapa etapa--${etapa(c.etapa).classe}">${esc(c.etapa)}</span>
        <p>${esc(etapa(c.etapa).texto)}</p>
      </div>

      <ol class="sup__etapas" aria-label="Etapas do chamado">
        ${ETAPAS.map((e, i) => `<li class="${i < atual ? 'sup__etapa--feita' : i === atual ? 'sup__etapa--atual' : ''}"${i === atual ? ' aria-current="step"' : ''}>
          <span class="sup__bolinha" aria-hidden="true">${i < atual ? icone('ok') : ''}</span>${esc(e.nome)}</li>`).join('')}
      </ol>

      ${c.etapa === 'Aguardando você' ? `<p class="sup__pedido">${icone('alerta')}<span><strong>A equipe precisa de você.</strong> Leia a última mensagem e responda abaixo.</span></p>` : ''}

      <section class="sup__bloco" aria-labelledby="sup-historico">
        <h2 class="sup__titulo" id="sup-historico">Andamento</h2>
        <ol class="sup__historico">
          ${[...c.historico].reverse().map((h) => `<li class="sup__evento sup__evento--${h.quem}">
            <span class="sup__quem">${h.quem === 'equipe' ? 'Suporte Dev+' : h.quem === 'voce' ? 'Você' : 'Sistema'}</span>
            <time datetime="${new Date(h.quando).toISOString()}">${dataHora(h.quando)}</time>
            <p>${esc(h.texto)}</p>
          </li>`).join('')}
        </ol>
      </section>

      <form class="sup__responder" data-sup-responder novalidate>
        <div class="campo">
          <label for="r-texto">${resolvido ? 'O problema voltou?' : 'Adicionar informação ao chamado'}</label>
          <textarea id="r-texto" name="texto" rows="3" aria-describedby="r-texto-dica r-texto-erro" placeholder="${resolvido ? 'Conte o que aconteceu de novo: o chamado volta para a equipe.' : 'Responda à equipe ou acrescente um detalhe.'}"></textarea>
          <p class="campo__dica" id="r-texto-dica">Nunca escreva sua senha.</p>
          <p class="campo__erro" id="r-texto-erro" hidden>Escreva a mensagem antes de enviar.</p>
        </div>
        <button class="btn btn--primario" type="submit">${resolvido ? 'Reabrir chamado' : 'Enviar ao suporte'}</button>
      </form>

      <details class="sup__dados">
        <summary>Dados do chamado</summary>
        <dl>
          <div><dt>Sistema</dt><dd>${esc(c.sistema)}${c.painel ? ` · ${esc(c.painel)}.opiina.com` : ''}</dd></div>
          <div><dt>Aberto em</dt><dd>${dataHora(c.criado)}</dd></div>
          <div><dt>Quem abriu</dt><dd>${esc(c.nome)} · ${esc(c.email)}</dd></div>
          <div><dt>Empresa</dt><dd>${esc(c.empresa)} · CNPJ ${esc(c.cnpj)}${c.unidade ? ` · Unidade ${esc(c.unidade)}` : ''}</dd></div>
          <div><dt>Contato</dt><dd>${esc(c.telefone)} · prefere ${esc(c.canal)}${c.horario ? `, de ${esc(c.horario.toLowerCase())}` : ''}</dd></div>
          <div><dt>Tipo</dt><dd>${esc(c.tipo)}${c.area ? ` · ${esc(c.area)}` : ''} · ${esc(c.impacto)}</dd></div>
          <div><dt>Descrição</dt><dd class="sup__descricao">${esc(c.descricao)}</dd></div>
        </dl>
      </details>

      <div class="sup__acoes">
        <button class="btn btn--secundario" type="button" data-sup-outra>Consultar outro chamado</button>
        <a class="btn btn--fantasma" href="suporte.html${doPainel ? '?de=painel' : ''}">Abrir novo chamado</a>
      </div>

      ${resolvido ? '' : `<p class="sup__simular">Protótipo: <button type="button" data-sup-simular>simular o próximo passo da equipe</button></p>`}`;

    // Responder / reabrir: entra no andamento e devolve o chamado para a equipe
    const resp = $('[data-sup-responder]');
    resp.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const texto = resp.texto.value.trim();
      if (marcar(resp.texto, !texto)) { resp.texto.focus(); return; }
      const nova = resolvido ? 'Em análise' : c.etapa === 'Aguardando você' ? 'Em atendimento' : c.etapa;
      c.historico.push({ quando: Date.now(), quem: 'voce', texto, etapa: nova });
      if (nova !== c.etapa) c.historico.push({ quando: Date.now(), quem: 'sistema', texto: resolvido ? 'Chamado reaberto: voltou para a equipe.' : 'Resposta recebida: o chamado voltou para a equipe.', etapa: nova });
      c.etapa = nova;
      salvar(lista);
      mostrar(c.os, true);
    });
    resp.texto.addEventListener('input', () => marcar(resp.texto, false));

    $('[data-sup-outra]').addEventListener('click', () => {
      try { sessionStorage.removeItem(CHAVE_ULTIMO); } catch { /* ignora */ }
      resultado.hidden = true;
      resultado.innerHTML = '';
      consulta.hidden = false;
      consulta.os.value = '';
      $('[data-sup-erro]').hidden = true;
      $('[data-sup-titulo]').textContent = 'Consultar ordem de serviço';
      $('.canal__topo .cli__desc').textContent = 'Veja em que etapa está o seu chamado e o que o suporte da Dev+ respondeu.';
      document.title = 'Consultar chamado — Dev+';
      consulta.os.focus();
    });

    // Só no protótipo: anda uma etapa, com uma mensagem da equipe, para ver a consulta mudando
    $('[data-sup-simular]')?.addEventListener('click', () => {
      const proxima = c.etapa === 'Aguardando você' ? 'Em atendimento' : c.etapa === 'Em atendimento' ? 'Resolvido' : ETAPAS[atual + 1].nome;
      const falas = {
        'Em análise': ['sistema', 'A equipe começou a analisar o chamado.'],
        'Em atendimento': ['equipe', 'Obrigado pelas informações. Estamos trabalhando na solução.'],
        Resolvido: ['equipe', 'Corrigimos o problema. Se algo voltar a acontecer, responda aqui que o chamado é reaberto.'],
      };
      const [quem, texto] = falas[proxima];
      c.historico.push({ quando: Date.now(), quem, texto, etapa: proxima });
      c.etapa = proxima;
      salvar(lista);
      mostrar(c.os, true);
    });

    if (focar) { scrollTo(0, 0); $('[data-sup-titulo]').focus(); }
  }
}
