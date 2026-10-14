// Opiina — painel (protótipo): Clientes. Usa utilidades de painel.js ($, esc, quando, categoria, avisar, confirmar…).
// No app atual: busca + 4 botões de mesmo peso (modelo, importar CSV, exportar CSV, exportar PDF) e a lista.
// Aqui: resumo para o marketing, filtros (ofertas, aniversário), detalhe em gaveta, importar e exportar em gavetas.

const CHAVE_CL = 'opiina-demo-clientes';
const cl = {
  lista: (() => {
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CL));
      if (Array.isArray(salvo)) return salvo;
    } catch { /* sem armazenamento: usa os dados iniciais */ }
    return D.clientes.map((c) => ({ ...c }));
  })(),
  salvar() { try { sessionStorage.setItem(CHAVE_CL, JSON.stringify(this.lista)); } catch { /* ignora */ } },
};

// Resposta mais recente (respostas: [dias, nota, unidade])
const ultimaResposta = (c) => c.respostas.reduce((a, r) => (!a || r[0] > a[0] ? r : a), null);
const unidadeDo = (c) => ultimaResposta(c)?.[2] || null;
const mesDe = (c) => (c.nascimento ? Number(c.nascimento.slice(5, 7)) - 1 : null);
const aniversario = (c) => (c.nascimento ? `${c.nascimento.slice(8, 10)}/${c.nascimento.slice(5, 7)}` : null);
const MES_ATUAL = new Date().getMonth();
const MES_QUE_VEM = (MES_ATUAL + 1) % 12;
const nomeDoMes = (m) => new Date(2000, m, 1).toLocaleDateString('pt-BR', { month: 'long' });
const soDigitos = (t) => t.replace(/\D/g, '');

function baixarCsv(nome, linhas) {
  // ";" e BOM: o Excel em português abre com as colunas e os acentos certos
  const texto = '﻿' + linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if ($('[data-clientes]')) iniciarClientes();

function iniciarClientes() {
  const verOcorrencias = pode('ocorrencias');
  const form = $('[data-cl-filtros]');
  const padrao = { q: '', unidade: 'todas', ofertas: 'todos', aniversario: 'todos', origem: 'todas', ordem: 'recentes' };
  const params = new URLSearchParams(location.search);
  const estado = { ...padrao };
  Object.keys(padrao).forEach((k) => { if (params.get(k)) estado[k] = params.get(k); });
  D.unidades.forEach((u) => form.unidade.add(new Option(u, u)));
  $('#c-aniversario option[value="mes"]').textContent = `Em ${nomeDoMes(MES_ATUAL)}`;
  $('#c-aniversario option[value="proximo"]').textContent = `Em ${nomeDoMes(MES_QUE_VEM)}`;
  const aplicarNoForm = () => Object.keys(padrao).forEach((k) => { if (form[k]) form[k].value = estado[k]; });
  aplicarNoForm();

  // ----- Resumo -----
  function desenharResumo() {
    const total = cl.lista.length;
    const novos = cl.lista.filter((c) => c.cadastro >= -30).length;
    const ofertas = cl.lista.filter((c) => c.ofertas).length;
    const aniversariantes = cl.lista.filter((c) => mesDe(c) === MES_ATUAL).length;
    $('[data-cl-resumo]').innerHTML = `
      <article class="kpi"><p class="kpi__rotulo">Clientes cadastrados</p><p class="kpi__valor">${numero(total)}</p><p class="kpi__nota">${numero(novos)} nos últimos 30 dias</p></article>
      <article class="kpi"><p class="kpi__rotulo">Aceitam receber ofertas</p><p class="kpi__valor">${total ? Math.round((ofertas / total) * 100) : 0}%</p><p class="kpi__nota">${numero(ofertas)} de ${numero(total)} clientes</p></article>
      <article class="kpi"><a class="kpi__rotulo kpi__link" href="?aniversario=mes" data-cl-filtro-aniv>Aniversariantes de ${nomeDoMes(MES_ATUAL)}</a><p class="kpi__valor">${aniversariantes}</p><p class="kpi__nota">Ver quem são</p></article>
      <article class="kpi"><p class="kpi__rotulo">Sem resposta ainda</p><p class="kpi__valor">${cl.lista.filter((c) => !c.respostas.length).length}</p><p class="kpi__nota">Vieram por planilha</p></article>`;
  }

  // ----- Lista -----
  function filtrar() {
    const q = estado.q.trim().toLowerCase();
    const qDigitos = soDigitos(q);
    const ordens = {
      recentes: (a, b) => (ultimaResposta(b)?.[0] ?? -9999) - (ultimaResposta(a)?.[0] ?? -9999),
      nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
      respostas: (a, b) => b.respostas.length - a.respostas.length,
    };
    return cl.lista.filter((c) => {
      if (estado.unidade !== 'todas' && !c.respostas.some((r) => r[2] === estado.unidade)) return false;
      if (estado.ofertas === 'sim' && !c.ofertas) return false;
      if (estado.ofertas === 'nao' && c.ofertas) return false;
      if (estado.aniversario === 'mes' && mesDe(c) !== MES_ATUAL) return false;
      if (estado.aniversario === 'proximo' && mesDe(c) !== MES_QUE_VEM) return false;
      if (estado.origem !== 'todas' && c.origem !== estado.origem) return false;
      if (q && !`${c.nome} ${c.email}`.toLowerCase().includes(q) && !(qDigitos.length >= 3 && soDigitos(c.whatsapp).includes(qDigitos))) return false;
      return true;
    }).sort((a, b) => ordens[estado.ordem](a, b) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function htmlLinha(c) {
    const ultima = ultimaResposta(c);
    const aniv = aniversario(c);
    return `<tr>
      <td data-col="cliente"><button class="oc-abrir" type="button" data-cl-abrir="${c.id}" aria-haspopup="dialog">
        <span class="oc-abrir__texto">${esc(c.nome)}</span>
        <span class="oc-abrir__meta">${esc([c.whatsapp, c.email].filter(Boolean).join(' · '))}</span></button></td>
      <td data-col="unidade">${esc(unidadeDo(c) || '—')}</td>
      <td data-col="respostas"><span class="cl-respostas">${ultima ? `<span class="nota nota--${categoria(ultima[1])}"><span class="visualmente-oculto">Última nota </span>${ultima[1]}</span>` : ''}${c.respostas.length} ${c.respostas.length === 1 ? 'resposta' : 'respostas'}</span></td>
      <td data-col="ultima">${ultima ? `Respondeu ${quando(ultima[0])}` : '<span class="cl-mudo">Nenhuma ainda</span>'}</td>
      <td data-col="aniversario">${aniv ? `${icone('premios')}<span class="visualmente-oculto">Aniversário </span>${aniv}${mesDe(c) === MES_ATUAL ? '<span class="cl-selo">este mês</span>' : ''}` : '<span class="cl-mudo">Sem data de nascimento</span>'}</td>
      <td data-col="ofertas">${c.ofertas ? '<span class="cl-ofertas cl-ofertas--sim">Aceita ofertas</span>' : '<span class="cl-ofertas">Não aceita ofertas</span>'}</td>
    </tr>`;
  }

  let itensAtuais = [];
  function desenhar() {
    itensAtuais = filtrar();
    $('[data-cl-lista]').innerHTML = itensAtuais.map(htmlLinha).join('');
    $('[data-cl-vazio]').hidden = itensAtuais.length > 0;
    $('.cl-tabela').hidden = itensAtuais.length === 0;
    $('[data-cl-contagem]').innerHTML = `<strong>${itensAtuais.length}</strong> ${itensAtuais.length === 1 ? 'cliente' : 'clientes'}`;
    const p = new URLSearchParams();
    Object.keys(padrao).forEach((k) => { if (estado[k] !== padrao[k]) p.set(k, estado[k]); });
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
    desenharResumo();
  }

  form.addEventListener('input', (e) => {
    if (!e.target.name) return;
    estado[e.target.name] = e.target.value;
    desenhar();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('[data-cl-limpar]').addEventListener('click', () => {
    Object.assign(estado, padrao);
    aplicarNoForm();
    desenhar();
    form.q.focus();
  });
  // Cartão "Aniversariantes": aplica o filtro sem recarregar
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-cl-filtro-aniv]')) return;
    e.preventDefault();
    Object.assign(estado, padrao, { aniversario: 'mes' });
    aplicarNoForm();
    desenhar();
    $('[data-cl-contagem]').scrollIntoView({ block: 'center', behavior: semMovimento() ? 'auto' : 'smooth' });
  });

  // ----- Detalhe do cliente -----
  const gaveta = $('[data-cl-gaveta]');
  const gForm = $('[data-cl-form]', gaveta);
  const cg = (nome) => $(`[data-cg="${nome}"]`, gaveta);
  let atual = null;

  function campoErro(input, msg) {
    const erro = document.getElementById(`${input.id}-erro`);
    input.setAttribute('aria-invalid', String(Boolean(msg)));
    erro.hidden = !msg;
    erro.textContent = msg || '';
  }

  function abrir(id) {
    atual = cl.lista.find((c) => c.id === id);
    if (!atual) return;
    const c = atual;
    cg('desde').textContent = `Cliente desde ${dataCurta(diaRelativo(c.cadastro))}/${diaRelativo(c.cadastro).getFullYear()}`;
    cg('iniciais').textContent = iniciais(c.nome);
    cg('nome').textContent = c.nome;
    cg('origem').textContent = c.origem === 'pesquisa' ? 'Cadastrou-se ao responder uma pesquisa' : 'Entrou por planilha importada';
    const respostas = [...c.respostas].sort((a, b) => b[0] - a[0]);
    const ocs = c.ocorrencias.map((id) => ocorrencias.find((o) => o.id === id)).filter(Boolean);
    cg('conteudo').innerHTML = `
      <section class="rk-detalhe__bloco" aria-labelledby="cg-dados">
        <h3 id="cg-dados">Dados</h3>
        <div class="campo">
          <label for="cg-nome">Nome <span class="obrigatorio" aria-hidden="true">*</span></label>
          <input id="cg-nome" name="nome" type="text" autocomplete="off" required value="${esc(c.nome)}" aria-describedby="cg-nome-erro">
          <p class="campo__erro" id="cg-nome-erro" hidden></p>
        </div>
        <div class="campos-2">
          <div class="campo">
            <label for="cg-whatsapp">WhatsApp</label>
            <input id="cg-whatsapp" name="whatsapp" type="tel" inputmode="tel" autocomplete="off" value="${esc(c.whatsapp)}" placeholder="(00) 00000-0000" aria-describedby="cg-whatsapp-erro">
            <p class="campo__erro" id="cg-whatsapp-erro" hidden></p>
          </div>
          <div class="campo">
            <label for="cg-email">E-mail</label>
            <input id="cg-email" name="email" type="email" autocomplete="off" value="${esc(c.email)}" placeholder="nome@email.com" aria-describedby="cg-email-erro">
            <p class="campo__erro" id="cg-email-erro" hidden></p>
          </div>
        </div>
        <div class="campo cl-nascimento">
          <label for="cg-nascimento">Data de nascimento <span class="cl-mudo">(opcional)</span></label>
          <input id="cg-nascimento" name="nascimento" type="date" value="${c.nascimento || ''}" max="${new Date().toISOString().slice(0, 10)}">
        </div>
      </section>

      <section class="rk-detalhe__bloco" aria-labelledby="cg-ofertas">
        <h3 id="cg-ofertas">Ofertas e novidades</h3>
        <p class="cl-consentimento${c.ofertas ? ' cl-consentimento--sim' : ''}">${icone(c.ofertas ? 'ok' : 'cadeado')}<span>${c.ofertas
          ? `<strong>Aceita receber.</strong> Aceite dado ${c.origem === 'pesquisa' ? 'pelo próprio cliente, na pesquisa' : 'segundo a planilha importada'}.`
          : '<strong>Não aceita receber.</strong> Não inclua em campanhas. Só o próprio cliente pode dar esse aceite, na pesquisa.'}</span></p>
      </section>

      <section class="rk-detalhe__bloco" aria-labelledby="cg-respostas">
        <h3 id="cg-respostas">Respostas às pesquisas <span class="cl-mudo">(${respostas.length})</span></h3>
        ${respostas.length ? `<ul class="cl-historico">${respostas.map((r) => `
          <li><span class="nota nota--${categoria(r[1])}"><span class="visualmente-oculto">Nota </span>${r[1]}</span>
            <span>${esc(r[2])}</span><span class="cl-mudo">${dataCurta(diaRelativo(r[0]))} · ${quando(r[0])}</span></li>`).join('')}</ul>`
          : '<p class="cl-mudo">Ainda não respondeu nenhuma pesquisa.</p>'}
      </section>

      ${verOcorrencias && ocs.length ? `
      <section class="rk-detalhe__bloco" aria-labelledby="cg-ocs">
        <h3 id="cg-ocs">Ocorrências</h3>
        <ul class="cl-historico">${ocs.map((o) => `
          <li><a class="cl-oc" href="feedbacks.html?abrir=${o.id}"><span class="etapa etapa--${slug(o.etapa)}">${o.etapa}</span><span>${esc(o.comentario)}</span></a></li>`).join('')}</ul>
      </section>` : ''}

      <div class="gaveta__acoes cl-acoes">
        <button class="btn btn--perigo" type="button" data-cg-apagar>${icone('lixeira')}Apagar cadastro</button>
        <button class="btn btn--secundario" type="button" data-cg-fechar>Cancelar</button>
        <button class="btn btn--primario" type="submit">Salvar</button>
      </div>`;
    gaveta.showModal();
    cg('nome').focus();
  }

  document.addEventListener('click', (e) => {
    const gatilho = e.target.closest('[data-cl-abrir]');
    if (gatilho) abrir(gatilho.dataset.clAbrir);
  });
  gaveta.addEventListener('click', (e) => {
    if (e.target === gaveta || e.target.closest('[data-cg-fechar]')) gaveta.close();
    if (e.target.closest('[data-cg-apagar]')) apagar();
  });
  gaveta.addEventListener('close', () => { if (atual) $(`[data-cl-abrir="${atual.id}"]`)?.focus(); });

  gForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('#cg-nome'), whatsapp = $('#cg-whatsapp'), email = $('#cg-email');
    const digitos = soDigitos(whatsapp.value);
    const erros = [
      [nome, nome.value.trim() ? '' : 'Informe o nome.'],
      [whatsapp, whatsapp.value.trim() && (digitos.length < 10 || digitos.length > 11) ? 'Use DDD + número (10 ou 11 dígitos).' : ''],
      [email, email.value.trim() && !email.checkValidity() ? 'Confira o e-mail.' : ''],
    ];
    if (!whatsapp.value.trim() && !email.value.trim()) erros[1][1] = 'Informe o WhatsApp ou o e-mail.';
    erros.forEach(([campo, msg]) => campoErro(campo, msg));
    const primeiro = erros.find(([, msg]) => msg);
    if (primeiro) { primeiro[0].focus(); return; }
    Object.assign(atual, { nome: nome.value.trim(), whatsapp: whatsapp.value.trim(), email: email.value.trim(), nascimento: $('#cg-nascimento').value || null });
    cl.salvar();
    desenhar();
    gaveta.close();
    avisar(`Dados de ${atual.nome} salvos`);
  });

  async function apagar() {
    const c = atual;
    const sim = await confirmar({
      titulo: `Apagar o cadastro de ${c.nome}?`,
      texto: 'Use quando o cliente pedir para sair (direito garantido pela LGPD). <strong>Nome, contato e data de nascimento são apagados</strong> e não dá para desfazer. As notas continuam contando nos números, sem identificação.',
      botao: 'Apagar cadastro', perigo: true, icone: 'lixeira',
    });
    if (!sim) { $('[data-cg-apagar]', gaveta).focus(); return; }   // a gaveta continua aberta embaixo
    cl.lista = cl.lista.filter((x) => x !== c);
    cl.salvar();
    atual = null;
    gaveta.close();
    desenhar();
    avisar('Cadastro apagado');
    form.q.focus();
  }

  // ----- Importar -----
  const imp = $('[data-cl-imp]');
  const botaoImp = $('[data-cl-importar]');
  botaoImp.addEventListener('click', () => {
    $('[data-cl-imp-form]').reset();
    campoErro($('#ci-arquivo'), '');
    imp.showModal();
    $('#ci-titulo').focus();
  });
  imp.addEventListener('click', (e) => { if (e.target === imp || e.target.closest('[data-ci-fechar]')) imp.close(); });
  imp.addEventListener('close', () => botaoImp.focus());
  $('[data-ci-modelo]').addEventListener('click', () => {
    baixarCsv('modelo-clientes.csv', [
      ['Nome', 'WhatsApp', 'E-mail', 'Data de nascimento', 'Unidade', 'Aceita ofertas'],
      ['Maria Exemplo', '(11) 90000-0000', 'maria@email.com', '25/12/1990', D.unidades[0], 'sim'],
    ]);
    avisar('Modelo baixado');
  });
  $('[data-cl-imp-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const arquivo = $('#ci-arquivo');
    if (!arquivo.files.length) { campoErro(arquivo, 'Escolha o arquivo da planilha.'); arquivo.focus(); return; }
    imp.close();
    avisar('Protótipo: a planilha não foi lida nem enviada');
  });

  // ----- Exportar -----
  const exp = $('[data-cl-exp]');
  const expForm = $('[data-cl-exp-form]');
  const botaoExp = $('[data-cl-exportar]');
  const grupos = () => ({ lista: itensAtuais, ofertas: cl.lista.filter((c) => c.ofertas), todos: cl.lista });
  function atualizarExportar() {
    const g = grupos();
    Object.entries(g).forEach(([k, v]) => { $(`[data-ce="${k}"]`, exp).textContent = `${v.length} ${v.length === 1 ? 'cliente' : 'clientes'}`; });
    const escolhidos = g[expForm.quais.value];
    $('[data-ce-ok]').disabled = !escolhidos.length;
    $('[data-ce-aviso]').innerHTML = escolhidos.length
      ? `${icone('cadeado')}<span><strong>Dados pessoais.</strong> O arquivo terá nome, contato e data de nascimento. Guarde com cuidado e não compartilhe fora da empresa.</span>`
      : `${icone('alerta')}<span><strong>Nenhum cliente nesta opção.</strong> Escolha outra ou mude os filtros da lista.</span>`;
  }
  botaoExp.addEventListener('click', () => { atualizarExportar(); exp.showModal(); $('#ce-titulo').focus(); });
  expForm.addEventListener('change', atualizarExportar);
  exp.addEventListener('click', (e) => { if (e.target === exp || e.target.closest('[data-ce-fechar]')) exp.close(); });
  exp.addEventListener('close', () => botaoExp.focus());
  expForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const escolhidos = grupos()[expForm.quais.value];
    if (expForm.formato.value === 'pdf') { exp.close(); avisar('Protótipo: só a planilha (CSV) é gerada'); return; }
    baixarCsv('clientes-casa-exemplo.csv', [
      ['Nome', 'WhatsApp', 'E-mail', 'Data de nascimento', 'Unidade', 'Aceita ofertas', 'Respostas', 'Última nota'],
      ...escolhidos.map((c) => [c.nome, c.whatsapp, c.email, c.nascimento ? c.nascimento.split('-').reverse().join('/') : '',
        unidadeDo(c) || '', c.ofertas ? 'sim' : 'não', c.respostas.length, ultimaResposta(c)?.[1] ?? '']),
    ]);
    exp.close();
    avisar(`${escolhidos.length} ${escolhidos.length === 1 ? 'cliente exportado' : 'clientes exportados'}`);
  });

  desenhar();
  if (params.get('abrir')) abrir(params.get('abrir'));
}
