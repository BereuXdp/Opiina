// Opiina — painel (protótipo): Prêmios.
// Campanhas de voucher em R$ para quem responde a uma pesquisa (modelo do app real, "Prêmios Muito Mais"):
// valor fixo, validade em dias, início e fim, mensagem de WhatsApp com {valor}, {codigo} e {link},
// 1 voucher por cliente. Usa as utilidades de painel.js. Nada é enviado: fica guardado na aba.

const CHAVE_PR = 'opiina-demo-premios';
const STATUS_CAMPANHA = {
  ativa: ['Ativa', 'publicada'],
  pausada: ['Pausada', 'rascunho'],
  agendada: ['Agendada', 'agendada'],
  encerrada: ['Encerrada', 'arquivada'],
};
const real = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function lerSessao(chave) {
  try { return JSON.parse(sessionStorage.getItem(chave)); } catch { return null; }
}
const campanhas = (() => {
  const salvo = lerSessao(CHAVE_PR);
  return Array.isArray(salvo) ? salvo : structuredClone(D.campanhas);
})();
const salvarCampanhas = () => { try { sessionStorage.setItem(CHAVE_PR, JSON.stringify(campanhas)); } catch { /* ignora */ } };

// Dados de outras telas (mesma aba): pesquisas publicadas, CNPJ das unidades, integração Muito Mais
const pesquisasSalvas = () => lerSessao('opiina-demo-pesquisas') || D.pesquisas;
const configSalva = () => lerSessao('opiina-demo-config');
const unidadesSalvas = () => configSalva()?.unidades || D.unidadesDetalhe;
const muitoMaisConectada = () => configSalva()?.muitoMais?.conectado ?? true;
const pesquisaDe = (c) => pesquisasSalvas().find((p) => p.id === c.pesquisa);
const cnpjDa = (unidade) => unidadesSalvas().find((u) => u.nome === unidade)?.cnpj || '';
// Pesquisa pode valer para várias unidades (um link por unidade). Antigas: "unidade" (uma só).
const unidadesDaPesquisa = (p) => p?.unidades || (p?.unidade ? [p.unidade] : []);
const semCnpjNa = (p) => unidadesDaPesquisa(p).filter((u) => !cnpjDa(u));

function statusDa(c) {
  if (c.encerrada || c.fim < 0) return 'encerrada';
  if (c.inicio > 0) return 'agendada';
  return c.pausada ? 'pausada' : 'ativa';
}
const isoDeDias = (dias) => {
  const d = diaRelativo(dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diasDeIso = (iso) => Math.round((new Date(`${iso}T12:00`) - diaRelativo(0)) / 864e5);
// Mensagem com valores de exemplo, para a prévia do WhatsApp
const mensagemExemplo = (texto, valor) => esc(texto)
  .replaceAll('{valor}', `<strong>${real(Number(valor) || 0)}</strong>`)
  .replaceAll('{codigo}', '<strong>OPI-7K2Q</strong>')
  .replaceAll('{link}', '<span class="zap__link">link de resgate</span>')
  .replaceAll('\n', '<br>');

if ($('[data-premios]')) iniciarPremios();

function iniciarPremios() {
  let filtro = new URLSearchParams(location.search).get('status') || 'todas';
  const lista = $('[data-campanhas]');

  // ----- Aviso: sem a Muito Mais não há vouchers -----
  const aviso = $('[data-sem-integracao]');
  if (!muitoMaisConectada()) {
    aviso.hidden = false;
    aviso.innerHTML = `${icone('plug')}<div><strong>A Muito Mais não está conectada</strong>
      <p>É ela que gera os vouchers. Sem a conexão, as campanhas não enviam prêmios.</p></div>
      ${pode('configuracoes')
        ? '<a class="btn btn--secundario" href="configuracoes.html?aba=integracoes">Conectar em Integrações</a>'
        : '<p class="mudo">Peça a um administrador para conectar em Configurações › Integrações.</p>'}`;
  }

  // ----- Resumo -----
  function desenharResumo() {
    const ativas = campanhas.filter((c) => statusDa(c) === 'ativa').length;
    const enviados = campanhas.reduce((s, c) => s + c.enviados, 0);
    const resgatados = campanhas.reduce((s, c) => s + c.resgatados, 0);
    const valorResgatado = campanhas.reduce((s, c) => s + c.resgatados * c.valor, 0);
    const taxa = enviados ? Math.round((resgatados / enviados) * 100) : 0;
    $('[data-resumo]').innerHTML = `
      <article class="kpi"><p class="kpi__rotulo">Campanhas ativas</p><p class="kpi__valor">${ativas}</p></article>
      <article class="kpi"><p class="kpi__rotulo">Vouchers enviados</p><p class="kpi__valor">${numero(enviados)}</p><p class="kpi__nota">Em todas as campanhas</p></article>
      <article class="kpi"><p class="kpi__rotulo">Resgatados</p><p class="kpi__valor">${taxa}%</p><p class="kpi__nota">${numero(resgatados)} de ${numero(enviados)} vouchers</p></article>
      <article class="kpi"><p class="kpi__rotulo">Valor resgatado</p><p class="kpi__valor">${real(valorResgatado)}</p><p class="kpi__nota">Soma dos vouchers usados</p></article>`;
  }

  // ----- Cartões -----
  function periodo(c, st) {
    const de = dataCurta(diaRelativo(c.inicio));
    const ate = dataCurta(diaRelativo(c.fim));
    if (st === 'agendada') return `${de} a ${ate} · começa em ${c.inicio} ${c.inicio === 1 ? 'dia' : 'dias'}`;
    if (st === 'encerrada') return `${de} a ${ate} · encerrada`;
    return `${de} a ${ate} · ${c.fim === 0 ? 'termina hoje' : `termina em ${c.fim} ${c.fim === 1 ? 'dia' : 'dias'}`}`;
  }
  function cartao(c) {
    const st = statusDa(c);
    const [rotulo, classe] = STATUS_CAMPANHA[st];
    const p = pesquisaDe(c);
    const unidade = unidadesDaPesquisa(p).join(', ') || '—';
    const faltam = st !== 'encerrada' && p ? semCnpjNa(p) : [];
    const semCnpj = faltam.length > 0;
    const taxa = c.enviados ? Math.round((c.resgatados / c.enviados) * 100) : 0;
    let acoes;
    if (st === 'ativa') acoes = `
      <button class="btn btn--secundario" type="button" data-acao="editar" data-id="${c.id}">${icone('editar')}Editar</button>
      <button class="btn btn--secundario" type="button" data-acao="pausar" data-id="${c.id}">Pausar</button>
      <button class="btn btn--perigo" type="button" data-acao="encerrar" data-id="${c.id}">Encerrar</button>`;
    else if (st === 'pausada') acoes = `
      <button class="btn btn--primario" type="button" data-acao="retomar" data-id="${c.id}">Retomar</button>
      <button class="btn btn--secundario" type="button" data-acao="editar" data-id="${c.id}">${icone('editar')}Editar</button>
      <button class="btn btn--perigo" type="button" data-acao="encerrar" data-id="${c.id}">Encerrar</button>`;
    else if (st === 'agendada') acoes = `
      <button class="btn btn--secundario" type="button" data-acao="editar" data-id="${c.id}">${icone('editar')}Editar</button>
      <button class="btn btn--perigo" type="button" data-acao="cancelar" data-id="${c.id}">Cancelar campanha</button>`;
    else acoes = `<button class="btn btn--secundario" type="button" data-acao="modelo" data-id="${c.id}">${icone('mais')}Usar como modelo</button>`;

    const numeros = st === 'agendada'
      ? `<div class="pq-cartao__numero"><span>Ainda não começou. Os vouchers saem a partir de ${dataCurta(diaRelativo(c.inicio))}.</span></div>`
      : `<div class="pr-numeros">
          <p><strong>${numero(c.enviados)}</strong> enviados · <strong>${numero(c.resgatados)}</strong> resgatados</p>
          <div class="pr-barra" role="img" aria-label="${taxa}% dos vouchers resgatados"><span style="width:${taxa}%"></span></div>
          <p class="mudo">${taxa}% de resgate · ${real(c.resgatados * c.valor)} em vouchers usados</p>
        </div>`;
    return `<li><article class="cartao pq-cartao" aria-labelledby="cp-${c.id}">
      <div class="pq-cartao__topo"><span class="status status--${classe}">${rotulo}</span><span class="pq-cartao__id">${c.id}</span></div>
      <div>
        <h2 class="pq-cartao__nome" id="cp-${c.id}">${esc(c.nome)}</h2>
        <p class="pq-cartao__meta">
          <span>${icone('premios')}${real(c.valor)} por cliente · vale ${c.validade} dias</span>
          <span>${icone('pesquisas')}${p ? `${esc(p.nome)} · ${esc(unidade)}` : 'Pesquisa removida'}</span>
          <span>${icone('relogio')}${periodo(c, st)}</span>
        </p>
      </div>
      ${semCnpj ? `<p class="pr-alerta" role="note">${icone('alerta')}<span>${esc(faltam.join(', '))} ${faltam.length > 1 ? 'não têm' : 'não tem'} CNPJ cadastrado: os vouchers não são gerados ${faltam.length > 1 ? 'nelas' : 'nela'}.${pode('configuracoes') ? ' <a class="link-texto" href="configuracoes.html?aba=unidades">Cadastrar CNPJ</a>' : ' Peça a um administrador.'}</span></p>` : ''}
      ${numeros}
      <div class="pq-cartao__acoes">${acoes}</div>
    </article></li>`;
  }

  function desenhar() {
    const ordem = { ativa: 0, pausada: 1, agendada: 2, encerrada: 3 };
    const naFiltro = (c) => filtro === 'todas' || statusDa(c) === filtro || (filtro === 'ativa' && statusDa(c) === 'pausada');
    const itens = campanhas.filter(naFiltro).sort((a, b) => ordem[statusDa(a)] - ordem[statusDa(b)] || b.inicio - a.inicio);
    lista.innerHTML = itens.map(cartao).join('');
    $('[data-campanhas-vazio]').hidden = itens.length > 0;
    $$('[data-filtro]').forEach((b) => {
      const f = b.dataset.filtro;
      b.setAttribute('aria-pressed', String(f === filtro));
      $('.alternar__total', b).textContent = f === 'todas' ? campanhas.length : campanhas.filter((c) => statusDa(c) === f || (f === 'ativa' && statusDa(c) === 'pausada')).length;
    });
    desenharResumo();
  }

  $$('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    history.replaceState(null, '', filtro === 'todas' ? location.pathname : `?status=${filtro}`);
    desenhar();
  }));

  lista.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-acao]');
    if (!botao) return;
    const c = campanhas.find((x) => x.id === botao.dataset.id);
    const acao = botao.dataset.acao;
    if (acao === 'editar') return abrirCampanha(c);
    if (acao === 'modelo') return abrirCampanha({ ...c, id: null, nome: `${c.nome} (cópia)`, inicio: 0, fim: 30, enviados: 0, resgatados: 0, encerrada: false, pausada: false });
    if (acao === 'pausar' || acao === 'retomar') {
      c.pausada = acao === 'pausar';
      salvarCampanhas();
      desenhar();
      $(`[data-acao="${c.pausada ? 'retomar' : 'pausar'}"][data-id="${c.id}"]`)?.focus();
      return avisar(c.pausada ? `${c.nome}: pausada. Novos clientes não recebem voucher até você retomar.` : `${c.nome}: ativa de novo`);
    }
    if (acao === 'encerrar' || acao === 'cancelar') {
      const cancelar = acao === 'cancelar';
      const ok = await confirmar({
        titulo: cancelar ? 'Cancelar esta campanha?' : 'Encerrar esta campanha?',
        texto: cancelar
          ? `<strong>${esc(c.nome)}</strong> ainda não começou e será apagada.`
          : `<strong>${esc(c.nome)}</strong> para de enviar vouchers agora. Os números até aqui continuam no histórico. Não dá para reabrir; para repetir, use "Usar como modelo".`,
        botao: cancelar ? 'Cancelar campanha' : 'Encerrar', perigo: true, icone: 'alerta',
      });
      $('[data-confirmar]').close();
      if (!ok) return botao.focus();
      if (cancelar) campanhas.splice(campanhas.indexOf(c), 1); else c.encerrada = true;
      salvarCampanhas();
      desenhar();
      $('[data-nova-campanha]').focus();
      avisar(cancelar ? 'Campanha cancelada' : `${c.nome}: encerrada`);
    }
  });

  // ----- Gaveta: nova campanha / editar -----
  const gaveta = $('[data-pr-gaveta]');
  const form = $('[data-pr-form]');
  let emEdicao = null;
  let focoAntes = null;

  function fechar() { gaveta.close(); focoAntes?.focus(); }
  $$('[data-pr-fechar]').forEach((b) => b.addEventListener('click', fechar));
  gaveta.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); });
  gaveta.addEventListener('click', (e) => {
    if (e.target !== gaveta) return;
    const r = gaveta.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fechar();
  });

  function campo(id, rotulo, html, { dica = '', erro = '' } = {}) {
    return `<div class="campo">
      <label for="${id}">${rotulo}</label>${html}
      ${dica ? `<p class="campo__dica" id="${id}-dica">${dica}</p>` : ''}
      <p class="campo__erro" id="${id}-erro" hidden>${erro}</p>
    </div>`;
  }

  function abrirCampanha(c) {
    const nova = !c?.id;
    const base = c || { nome: '', pesquisa: '', valor: 10, validade: 30, inicio: 0, fim: 30, enviados: 0, resgatados: 0,
      mensagem: 'Obrigado por avaliar a ' + D.empresa + '! Seu voucher de {valor}: {codigo}\nResgate: {link}' };
    const travado = !nova && base.enviados > 0;   // já enviou vouchers: pesquisa e valor não mudam
    const publicadas = pesquisasSalvas().filter((p) => p.status === 'publicada' || p.id === base.pesquisa);
    emEdicao = nova ? null : c;
    focoAntes = document.activeElement;
    $('[data-pr-titulo]').textContent = nova ? 'Nova campanha' : `Editar ${base.nome}`;
    const iniciado = !nova && base.inicio <= 0;
    $('[data-pr-campos]').innerHTML = `
      ${campo('pr-nome', 'Nome da campanha <span class="obrigatorio" aria-hidden="true">*</span>',
        `<input id="pr-nome" value="${esc(base.nome)}" required placeholder="Ex.: NPS Novembro — R$ 10" aria-describedby="pr-nome-dica pr-nome-erro">`,
        { dica: 'Só a equipe vê. O cliente recebe a mensagem abaixo.', erro: 'Dê um nome para a campanha.' })}
      ${campo('pr-pesquisa', 'Pesquisa <span class="obrigatorio" aria-hidden="true">*</span>',
        `<select id="pr-pesquisa" aria-describedby="pr-pesquisa-dica pr-pesquisa-erro"${travado ? ' disabled' : ''}>
          <option value="">Escolha a pesquisa</option>
          ${publicadas.map((p) => `<option value="${p.id}"${p.id === base.pesquisa ? ' selected' : ''}>${esc(p.nome)} · ${esc(unidadesDaPesquisa(p).join(', '))}</option>`).join('')}
        </select>`,
        { dica: travado ? 'Não muda depois que a campanha enviou vouchers.' : 'Quem responder a esta pesquisa recebe o voucher.', erro: 'Escolha a pesquisa.' })}
      <p class="pr-unidade" data-pr-unidade aria-live="polite"></p>
      <div class="campos-2 pr-campos-2">
        ${campo('pr-valor', 'Valor do voucher <span class="obrigatorio" aria-hidden="true">*</span>',
          `<span class="pr-moeda"><span aria-hidden="true">R$</span><input id="pr-valor" inputmode="decimal" value="${String(base.valor).replace('.', ',')}" aria-describedby="pr-valor-erro"${travado ? ' disabled' : ''}></span>`,
          { erro: 'Informe um valor maior que zero.' })}
        ${campo('pr-validade', 'Validade (dias) <span class="obrigatorio" aria-hidden="true">*</span>',
          `<input id="pr-validade" type="number" min="1" max="365" value="${base.validade}" aria-describedby="pr-validade-dica pr-validade-erro">`,
          { dica: 'Conta a partir do envio.', erro: 'De 1 a 365 dias.' })}
        ${campo('pr-inicio', 'Começa em <span class="obrigatorio" aria-hidden="true">*</span>',
          `<input id="pr-inicio" type="date" value="${isoDeDias(base.inicio)}" aria-describedby="pr-inicio-erro"${iniciado ? ' disabled' : ` min="${isoDeDias(0)}"`}>`,
          { erro: 'Escolha hoje ou uma data futura.' })}
        ${campo('pr-fim', 'Termina em <span class="obrigatorio" aria-hidden="true">*</span>',
          `<input id="pr-fim" type="date" value="${isoDeDias(base.fim)}" aria-describedby="pr-fim-erro">`,
          { erro: 'A data final precisa ser depois do início.' })}
      </div>
      <div class="campo">
        <label for="pr-mensagem">Mensagem do WhatsApp <span class="obrigatorio" aria-hidden="true">*</span></label>
        <div class="pr-inserir" role="group" aria-label="Inserir na mensagem">
          <span>Inserir:</span>
          <button type="button" class="pr-chip" data-inserir="{valor}">Valor</button>
          <button type="button" class="pr-chip" data-inserir="{codigo}">Código do voucher</button>
          <button type="button" class="pr-chip" data-inserir="{link}">Link de resgate</button>
        </div>
        <textarea id="pr-mensagem" rows="4" aria-describedby="pr-mensagem-dica pr-mensagem-erro">${esc(base.mensagem)}</textarea>
        <p class="campo__dica" id="pr-mensagem-dica">Os itens entre chaves viram o valor, o código e o link de cada cliente.</p>
        <p class="campo__erro" id="pr-mensagem-erro" hidden>A mensagem precisa ter o código do voucher ({codigo}).</p>
      </div>
      <div class="zap" aria-label="Prévia da mensagem no WhatsApp">
        <p class="zap__rotulo">${icone('celular')}Como o cliente recebe</p>
        <p class="zap__balao" data-pr-previa></p>
      </div>
      <p class="cfg-info">${icone('cadeado')}<span><strong>1 voucher por cliente</strong> em cada campanha. Esse limite é fixo.</span></p>`;
    $('[data-pr-ok]').textContent = nova ? 'Criar e ativar' : 'Salvar';
    atualizarFormulario();
    gaveta.showModal();
    $('#pr-nome').focus();
  }

  // Unidade/CNPJ da pesquisa escolhida, prévia da mensagem e texto do botão (ativar ou agendar)
  function atualizarFormulario() {
    const p = pesquisasSalvas().find((x) => x.id === $('#pr-pesquisa').value);
    const caixa = $('[data-pr-unidade]');
    if (!p) caixa.innerHTML = '';
    else {
      const unidades = unidadesDaPesquisa(p);
      const faltam = semCnpjNa(p);
      caixa.innerHTML = !faltam.length
        ? `${icone('loja')}<span>${unidades.length > 1 ? 'Unidades' : 'Unidade'} <strong>${esc(unidades.join(', '))}</strong>${unidades.length === 1 ? ` · CNPJ ${esc(cnpjDa(unidades[0]))}` : ''}. O voucher é ligado à unidade de cada resposta na Muito Mais, pelo CNPJ.</span>`
        : `${icone('alerta')}<span><strong>${esc(faltam.join(', '))} ${faltam.length > 1 ? 'não têm' : 'não tem'} CNPJ.</strong> Sem ele, a Muito Mais não gera os vouchers ${faltam.length > 1 ? 'dessas unidades' : 'dessa unidade'}. Cadastre em Configurações › Unidades.</span>`;
      caixa.classList.toggle('pr-unidade--alerta', faltam.length > 0);
    }
    $('[data-pr-previa]').innerHTML = mensagemExemplo($('#pr-mensagem').value, $('#pr-valor').value.replace(',', '.'));
    if (!emEdicao) $('[data-pr-ok]').textContent = diasDeIso($('#pr-inicio').value) > 0 ? 'Agendar campanha' : 'Criar e ativar';
  }
  form.addEventListener('input', (e) => {
    if (e.target.matches('[aria-invalid="true"]')) {
      e.target.removeAttribute('aria-invalid');
      const erro = document.getElementById(`${e.target.id}-erro`);
      if (erro) erro.hidden = true;
    }
    atualizarFormulario();
  });
  form.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-inserir]');
    if (!chip) return;
    const area = $('#pr-mensagem');
    const [a, b] = [area.selectionStart, area.selectionEnd];
    area.setRangeText(chip.dataset.inserir, a, b, 'end');
    area.focus();
    atualizarFormulario();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = Number($('#pr-valor').value.replace(/\./g, '').replace(',', '.'));
    const validade = Number($('#pr-validade').value);
    const inicio = diasDeIso($('#pr-inicio').value);
    const fim = diasDeIso($('#pr-fim').value);
    const regras = [
      ['pr-nome', !$('#pr-nome').value.trim()],
      ['pr-pesquisa', !$('#pr-pesquisa').value],
      ['pr-valor', !(valor > 0)],
      ['pr-validade', !(validade >= 1 && validade <= 365)],
      ['pr-inicio', !$('#pr-inicio').disabled && (Number.isNaN(inicio) || inicio < 0)],
      ['pr-fim', Number.isNaN(fim) || fim <= inicio],
      ['pr-mensagem', !$('#pr-mensagem').value.includes('{codigo}')],
    ];
    let primeiro = null;
    regras.forEach(([id, erro]) => {
      const el = document.getElementById(id);
      if (erro) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      document.getElementById(`${id}-erro`).hidden = !erro;
      if (erro && !primeiro) primeiro = el;
    });
    if (primeiro) { primeiro.focus(); return; }

    const dados = { nome: $('#pr-nome').value.trim(), pesquisa: $('#pr-pesquisa').value, valor, validade, inicio, fim, mensagem: $('#pr-mensagem').value };
    if (emEdicao) Object.assign(emEdicao, dados);
    else {
      const id = `CP-${Math.max(0, ...campanhas.map((c) => Number(c.id.slice(3)))) + 1}`;
      campanhas.push({ id, ...dados, enviados: 0, resgatados: 0 });
    }
    salvarCampanhas();
    gaveta.close();
    desenhar();
    $('[data-nova-campanha]').focus();
    avisar(emEdicao ? `${dados.nome}: alterações salvas` : inicio > 0 ? `${dados.nome}: agendada para ${dataCurta(diaRelativo(inicio))}` : `${dados.nome}: ativa (protótipo: nada é enviado)`);
  });

  $('[data-nova-campanha]').addEventListener('click', () => abrirCampanha(null));
  desenhar();
}
