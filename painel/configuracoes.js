// Opiina — painel (protótipo): Configurações.
// Abas: Empresa · Unidades · Atendentes · Usuários e perfis · Integrações · Minha conta.
// Quem não é administrador vê só "Minha conta". Usa as utilidades de painel.js
// ($, $$, esc, icone, avisar, confirmar, iniciais, slug, D, perfil, pode). Nada é enviado:
// as alterações ficam guardadas na aba (sessionStorage).

const CHAVE_CFG = 'opiina-demo-config';
const FUSOS = [
  ['America/Sao_Paulo', 'Brasília (GMT−3)'],
  ['America/Manaus', 'Manaus (GMT−4)'],
  ['America/Rio_Branco', 'Rio Branco (GMT−5)'],
  ['America/Noronha', 'Fernando de Noronha (GMT−2)'],
];
const SITUACAO_USUARIO = {
  ativo: ['Ativo', 'publicada'],
  convidado: ['Convite enviado', 'rascunho'],
  inativo: ['Desativado', 'arquivada'],
};
const emailValido = (v) => /^\S+@\S+\.\S+$/.test(v);

function estadoInicial() {
  const cargos = ['Garçom', 'Atendente', 'Caixa'];
  return {
    empresa: {
      fantasia: D.empresa, razao: 'Casa Exemplo Restaurantes Ltda', documento: '', segmento: 'Restaurante',
      email: 'contato@casaexemplo.com.br', telefone: '',
    },
    unidades: D.unidadesDetalhe.map((u) => ({ ...u, google: u.google ? `https://g.page/r/exemplo-${slug(u.nome)}` : '' })),
    atendentes: Object.entries(D.atendentes).flatMap(([unidade, nomes]) =>
      nomes.map((nome, i) => ({ id: `${slug(unidade)}-${i}`, nome, unidade, cargo: cargos[i % 3], codigo: '', ativo: true }))),
    usuarios: structuredClone(D.usuarios),
    muitoMais: { conectado: true, vouchers: [] },   // conectada: a aba Prêmios tem campanhas de exemplo
  };
}
function carregarCfg() {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CFG));
    if (salvo?.empresa) return salvo;
  } catch { /* sem armazenamento: usa os exemplos */ }
  return estadoInicial();
}
const cfg = carregarCfg();
const salvarCfg = () => { try { sessionStorage.setItem(CHAVE_CFG, JSON.stringify(cfg)); } catch { /* ignora */ } };

// ----- Erros de campo (rótulo + aria-invalid + mensagem ligada por aria-describedby) -----
function marcarErro(campo, erro, texto) {
  campo.toggleAttribute('aria-invalid', erro);
  if (erro) campo.setAttribute('aria-invalid', 'true');
  const p = document.getElementById(`${campo.id}-erro`);
  if (p) { p.hidden = !erro; if (texto) p.textContent = texto; }
  return erro;
}
// regras: [campo, inválido?, texto opcional]. Marca todos e põe o foco no primeiro com erro.
function validar(regras) {
  let primeiro = null;
  regras.forEach(([campo, invalido, texto]) => { if (marcarErro(campo, invalido, texto) && !primeiro) primeiro = campo; });
  primeiro?.focus();
  return !primeiro;
}
document.addEventListener('input', (e) => {
  if (e.target.matches?.('[aria-invalid="true"]')) marcarErro(e.target, false);
});

function iniciarConfig() {
  const ehAdmin = pode('configuracoes');
  const veAtendentes = pode('atendentes');   // o Gestor: só os atendentes das unidades dele
  const ABAS = ehAdmin ? ['empresa', 'unidades', 'atendentes', 'usuarios', 'integracoes', 'conta']
    : veAtendentes ? ['atendentes', 'conta'] : ['conta'];
  const nav = $('[data-cfg-nav]');

  if (!ehAdmin && veAtendentes) {
    // Gestor (pedido do cliente, 2026-10-14): Atendentes das unidades dele + Minha conta
    $$('a[data-aba-link]', nav).forEach((a) => { if (!ABAS.includes(a.dataset.abaLink)) a.remove(); });
    $('[data-cfg-desc]').textContent = 'Os atendentes das suas unidades e os seus dados de acesso.';
  } else if (!ehAdmin) {
    // Perfis sem as Configurações completas (pedido do cliente, 2026-10-14): o item Configurações aparece
    // no menu, mas só com os dados da própria conta (nome, e-mail, celular e senha)
    nav.remove();
    $('.cfg').classList.add('cfg--so-conta');
    $('[data-cfg-desc]').textContent = 'Seus dados de acesso: nome, e-mail, celular e senha. As configurações da empresa ficam com o administrador.';
  }

  // ----- Abas (?aba=…): links comuns; o JS troca sem recarregar e guarda no histórico -----
  $$('[data-aba] h2').forEach((h) => h.setAttribute('tabindex', '-1'));
  function mostrarAba(aba, { foco = false, historico = true } = {}) {
    if (!ABAS.includes(aba)) aba = ABAS[0];
    $$('[data-aba]').forEach((s) => { s.hidden = s.dataset.aba !== aba; });
    $$('a[data-aba-link]', nav || document.createElement('i')).forEach((a) => {
      if (a.dataset.abaLink === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (historico && new URLSearchParams(location.search).get('aba') !== aba) history.pushState(null, '', `?aba=${aba}`);
    if (foco) $(`[data-aba="${aba}"] h2`)?.focus();
  }
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-aba-link]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    mostrarAba(link.dataset.abaLink, { foco: true });
  });
  window.addEventListener('popstate', () => mostrarAba(new URLSearchParams(location.search).get('aba'), { historico: false }));
  mostrarAba(new URLSearchParams(location.search).get('aba'), { historico: false });

  if (ehAdmin) {
    iniciarEmpresa();
    desenharUnidades();
    iniciarAtendentes();
    desenharUsuarios();
    desenharMatriz();
    desenharIntegracoes();
  } else if (veAtendentes) {
    iniciarAtendentes();
  }
  iniciarConta();
}

// =====================================================================
// Gaveta de edição (uma só, montada para cada caso)
// =====================================================================
const gaveta = $('[data-cfg-gaveta]');
const gavetaForm = $('[data-cfg-gaveta-form]');
let aoSalvarGaveta = null;
let focoAntesGaveta = null;

function abrirGaveta({ titulo, campos, botao = 'Salvar', salvar }) {
  $('[data-cg-titulo]').textContent = titulo;
  $('[data-cg-campos]').innerHTML = campos;
  $('[data-cg-ok]').textContent = botao;
  aoSalvarGaveta = salvar;
  focoAntesGaveta = document.activeElement;
  gaveta.showModal();
  $('input:not([type=hidden]):not([disabled]), select', gavetaForm)?.focus();
}
function fecharGaveta() {
  gaveta.close();
  focoAntesGaveta?.focus();
}
if (gaveta) {
  $$('[data-cg-fechar]').forEach((b) => b.addEventListener('click', fecharGaveta));
  gaveta.addEventListener('cancel', (e) => { e.preventDefault(); fecharGaveta(); });
  // Clique no fundo escurecido (fora da gaveta) fecha
  gaveta.addEventListener('click', (e) => {
    if (e.target !== gaveta) return;
    const r = gaveta.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fecharGaveta();
  });
  gavetaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (aoSalvarGaveta?.() !== false) fecharGaveta();
  });
}

// Peças de formulário para a gaveta
function htmlCampo({ id, rotulo, tipo = 'text', valor = '', obrigatorio = false, dica = '', erro = '', extra = '' }) {
  const descr = [dica && `${id}-dica`, `${id}-erro`].filter(Boolean).join(' ');
  return `<div class="campo">
    <label for="${id}">${rotulo}${obrigatorio ? ' <span class="obrigatorio" aria-hidden="true">*</span>' : ' <span class="opcional">(opcional)</span>'}</label>
    <input id="${id}" type="${tipo}" value="${esc(valor)}"${obrigatorio ? ' required' : ''} aria-describedby="${descr}" ${extra}>
    ${dica ? `<p class="campo__dica" id="${id}-dica">${dica}</p>` : ''}
    <p class="campo__erro" id="${id}-erro" hidden>${erro}</p>
  </div>`;
}
function htmlSelect({ id, rotulo, opcoes, valor }) {
  return `<div class="campo">
    <label for="${id}">${rotulo}</label>
    <select id="${id}">${opcoes.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
  </div>`;
}
const valorDe = (id) => document.getElementById(id).value.trim();
const situacao = (texto, tipo) => `<span class="status status--${tipo}">${texto}</span>`;

// =====================================================================
// Busca por CNPJ (OpenCNPJ: dados públicos da Receita Federal, sem chave — https://opencnpj.org/#api)
// O CNPJ digitado vai para api.opencnpj.org. A pessoa confere o que achamos e escolhe o que preencher.
// =====================================================================
const limparCnpj = (t) => t.toUpperCase().replace(/[^0-9A-Z]/g, '');
// Dígitos verificadores (vale também para o CNPJ alfanumérico: cada caractere vale o código ASCII − 48)
function cnpjValido(texto) {
  const c = limparCnpj(texto);
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
const formatarCnpj = (t) => { const c = limparCnpj(t); return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`; };

async function consultarCnpj(cnpj) {
  const ctrl = new AbortController();
  const tempo = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`https://api.opencnpj.org/${limparCnpj(cnpj)}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (r.status === 404) return { erro: 'Não achamos esse CNPJ na Receita Federal. Confira os números.' };
    if (r.status === 429) return { erro: 'Muitas consultas seguidas. Espere um pouco e tente de novo, ou preencha à mão.' };
    if (!r.ok) throw new Error(r.status);
    return { dados: await r.json() };
  } catch {
    return { erro: 'Não deu para consultar agora (sem conexão ou serviço fora do ar). Tente de novo ou preencha à mão.' };
  } finally {
    clearTimeout(tempo);
  }
}

// A Receita guarda tudo em maiúsculas e sem acento: "CASA DO PAO LTDA" → "Casa do Pao Ltda"
const nomeLegivel = (t) => (t || '').trim().replace(/\s+/g, ' ').toLowerCase()
  .replace(/\S+/g, (p, i) => (i > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(p) ? p : p[0].toUpperCase() + p.slice(1)))
  .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii)\b/g, (s) => s.toUpperCase())   // números romanos ("Torre II")
  .replace(/\b(Me|Epp|Sa|Eireli)$/, (s) => s.toUpperCase());   // sufixos de tipo de empresa no fim do nome
function telefoneDe(d) {
  const t = (d.telefones || []).find((x) => !x.is_fax) || (d.telefones || [])[0];
  if (!t?.numero) return '';
  const n = t.numero;
  return `(${t.ddd}) ${n.length === 9 ? `${n.slice(0, 5)}-${n.slice(5)}` : `${n.slice(0, 4)}-${n.slice(4)}`}`;
}
function enderecoDe(d) {
  const rua = [d.tipo_logradouro && !d.logradouro?.startsWith(d.tipo_logradouro) ? d.tipo_logradouro : '', d.logradouro].filter(Boolean).join(' ');
  return [
    rua && `${nomeLegivel(rua)}${d.numero ? `, ${d.numero === 'SN' ? 's/n' : d.numero}` : ''}`,
    d.complemento && nomeLegivel(d.complemento),
    d.bairro && nomeLegivel(d.bairro),
    d.municipio && `${nomeLegivel(d.municipio)}/${d.uf}`,
  ].filter(Boolean).join(' · ');
}
// Segmento a partir do CNAE principal (só os que existem na lista do cadastro)
const SEGMENTO_POR_CNAE = { 5611201: 'Restaurante', 5611204: 'Bar', 5611205: 'Bar', 5611203: 'Cafeteria', 1091102: 'Padaria', 4721102: 'Padaria' };

// campos: [{ rotulo, alvo: elemento, valor: (dados) => texto, substituir: marca mesmo se o campo já tiver valor }]
function ligarBuscaCnpj(id, campos) {
  const input = document.getElementById(id);
  const botao = $(`[data-cnpj-buscar="${id}"]`);
  const caixa = $(`[data-cnpj-resultado="${id}"]`);
  const status = $(`[data-cnpj-status="${id}"]`);
  if (!input || !botao) return;
  let achados = [];

  async function buscar() {
    const texto = input.value.trim();
    const digitos = texto.replace(/\D/g, '');
    if (!texto) return marcarErro(input, true, 'Digite o CNPJ para buscar.') && input.focus();
    if (digitos.length === 11 && digitos === limparCnpj(texto)) return marcarErro(input, true, 'A busca funciona só com CNPJ. Com CPF, preencha os dados à mão.') && input.focus();
    if (!cnpjValido(texto)) return marcarErro(input, true, 'Confira o CNPJ: são 14 caracteres e os 2 últimos não batem.') && input.focus();
    marcarErro(input, false);
    input.value = formatarCnpj(texto);
    const textoBotao = botao.innerHTML;
    botao.innerHTML = 'Buscando…';
    botao.setAttribute('aria-busy', 'true');
    botao.disabled = true;
    status.textContent = 'Buscando os dados do CNPJ…';
    const { dados, erro } = await consultarCnpj(texto);
    botao.innerHTML = textoBotao;
    botao.removeAttribute('aria-busy');
    botao.disabled = false;
    caixa.hidden = false;
    if (erro) {
      caixa.innerHTML = `<p class="cnpj-resultado__erro">${icone('alerta')}<span>${erro}</span></p>`;
      status.textContent = erro;
      return;
    }
    achados = campos.map((c) => ({ ...c, novo: c.valor(dados) || '' })).filter((c) => c.novo);
    const ativa = dados.situacao_cadastral === 'Ativa';
    const atualizado = dados.updated_at ? new Date(dados.updated_at).toLocaleDateString('pt-BR') : '';
    caixa.innerHTML = `
      <div class="cnpj-resultado__topo">
        <strong>${esc(dados.razao_social || 'Empresa encontrada')}</strong>
        <span class="status status--${ativa ? 'publicada' : 'rascunho'}">${esc(dados.situacao_cadastral || 'Situação não informada')} na Receita</span>
      </div>
      ${ativa ? '' : `<p class="cnpj-resultado__erro">${icone('alerta')}<span>Este CNPJ não está ativo. Confira se é o certo antes de usar.</span></p>`}
      ${achados.length ? `
      <fieldset class="cnpj-resultado__campos">
        <legend>Escolha o que preencher</legend>
        ${achados.map((c, i) => {
          const atual = c.alvo.value.trim();
          const igual = atual.toLowerCase() === c.novo.toLowerCase();
          const marcado = !igual && (!atual || c.substituir);
          return `<label class="cnpj-opcao${igual ? ' cnpj-opcao--igual' : ''}">
            <input type="checkbox" data-cnpj-i="${i}"${marcado ? ' checked' : ''}${igual ? ' disabled' : ''}>
            <span><span class="cnpj-opcao__rotulo">${esc(c.rotulo)}${igual ? ' · já está assim' : atual ? ' · substitui o atual' : ''}</span>${esc(c.novo)}</span>
          </label>`;
        }).join('')}
      </fieldset>
      <div class="cnpj-resultado__acoes">
        <button class="btn btn--primario" type="button" data-cnpj-aplicar>Preencher marcados</button>
        <button class="btn btn--fantasma" type="button" data-cnpj-fechar>Agora não</button>
      </div>` : '<p class="mudo">A Receita não tem outros dados para preencher.</p>'}
      <p class="cnpj-resultado__fonte">Fonte: OpenCNPJ, dados públicos da Receita Federal${atualizado ? ` (atualizados em ${atualizado})` : ''}.</p>`;
    status.textContent = `Encontrado: ${dados.razao_social}. ${achados.length} dados para conferir.`;
    $('input:not(:disabled)', caixa)?.focus();
  }

  botao.addEventListener('click', buscar);
  // Enter no campo busca (em vez de enviar o formulário)
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } });
  // Trocou o CNPJ: o resultado antigo deixa de valer
  input.addEventListener('input', () => { caixa.hidden = true; });
  caixa.addEventListener('click', (e) => {
    if (e.target.closest('[data-cnpj-fechar]')) { caixa.hidden = true; input.focus(); return; }
    if (!e.target.closest('[data-cnpj-aplicar]')) return;
    const escolhidos = $$('input[data-cnpj-i]:checked', caixa).map((cx) => achados[cx.dataset.cnpjI]);
    escolhidos.forEach((c) => {
      c.alvo.value = c.novo;
      c.alvo.dispatchEvent(new Event('input', { bubbles: true }));   // marca "alterações não salvas"
      c.alvo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    caixa.hidden = true;
    const texto = escolhidos.length
      ? `${escolhidos.length} ${escolhidos.length === 1 ? 'campo preenchido' : 'campos preenchidos'} com os dados da Receita. Confira e salve.`
      : 'Nada foi preenchido.';
    status.textContent = texto;
    avisar(texto);
    (escolhidos[0]?.alvo || input).focus();
  });
}

// =====================================================================
// Empresa
// =====================================================================
function iniciarEmpresa() {
  const form = $('[data-form-empresa]');
  const status = $('[data-empresa-status]');
  const descartar = $('[data-empresa-descartar]');
  let alterado = false;

  function preencher() {
    Object.entries(cfg.empresa).forEach(([nome, valor]) => { if (form.elements[nome]) form.elements[nome].value = valor; });
  }
  function marcarAlterado(sim) {
    alterado = sim;
    descartar.hidden = !sim;
    status.textContent = sim ? 'Alterações não salvas' : '';
  }
  preencher();
  const el = form.elements;
  ligarBuscaCnpj('e-documento', [
    { rotulo: 'Razão social', alvo: el.razao, valor: (d) => d.razao_social, substituir: true },
    { rotulo: 'Nome fantasia', alvo: el.fantasia, valor: (d) => nomeLegivel(d.nome_fantasia) },   // o nome da marca costuma ser outro: só marca se estiver vazio
    { rotulo: 'E-mail de contato', alvo: el.email, valor: (d) => (d.email || '').toLowerCase() },
    { rotulo: 'Telefone', alvo: el.telefone, valor: telefoneDe },
    { rotulo: 'Segmento', alvo: el.segmento, valor: (d) => SEGMENTO_POR_CNAE[d.cnae_principal] || '', substituir: true },
  ]);

  form.addEventListener('input', (e) => { if (!e.target.matches('[data-cnpj-i]')) marcarAlterado(true); });
  descartar.addEventListener('click', () => {
    preencher();
    $$('[aria-invalid]', form).forEach((c) => marcarErro(c, false));
    marcarAlterado(false);
    status.textContent = 'Alterações descartadas';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const ok = validar([
      [form.elements.fantasia, !form.elements.fantasia.value.trim()],
      [form.elements.email, Boolean(email) && !emailValido(email)],
    ]);
    if (!ok) { status.textContent = 'Corrija o item destacado para salvar.'; return; }
    Object.keys(cfg.empresa).forEach((nome) => { if (form.elements[nome]) cfg.empresa[nome] = form.elements[nome].value.trim(); });
    salvarCfg();
    marcarAlterado(false);
    avisar('Dados da empresa salvos');
  });
  // Sair da aba com alterações: avisa na barra (não perde o que foi digitado, a aba só esconde)
  window.addEventListener('beforeunload', (e) => { if (alterado) e.preventDefault(); });
}

// =====================================================================
// Unidades
// =====================================================================
function desenharUnidades() {
  $('[data-lista-unidades]').innerHTML = cfg.unidades.map((u, i) => `
    <tr>
      <th scope="row">${esc(u.nome)}</th>
      <td>${u.cnpj ? esc(u.cnpj) : '<span class="mudo">Sem CNPJ</span>'}</td>
      <td>${u.endereco ? esc(u.endereco) : '<span class="mudo">—</span>'}</td>
      <td>${u.google ? situacao('Com link', 'publicada') : situacao('Sem link', 'arquivada')}</td>
      <td class="cfg-tabela__acoes"><button class="btn btn--fantasma" type="button" data-editar-unidade="${i}">${icone('editar')}Editar<span class="visualmente-oculto"> ${esc(u.nome)}</span></button></td>
    </tr>`).join('');
}
function abrirUnidade(i) {
  const nova = i === undefined;
  const u = nova ? { nome: '', cnpj: '', endereco: '', google: '', fuso: 'America/Sao_Paulo' } : cfg.unidades[i];
  abrirGaveta({
    titulo: nova ? 'Nova unidade' : `Editar ${u.nome}`,
    botao: nova ? 'Criar unidade' : 'Salvar',
    campos: `
      ${htmlCampo({ id: 'u-nome', rotulo: 'Nome da unidade', valor: u.nome, obrigatorio: true, erro: 'Escreva o nome da unidade.' })}
      <div class="campo cnpj-campo">
        <label for="u-cnpj">CNPJ <span class="opcional">(opcional)</span></label>
        <div class="cnpj-linha">
          <input id="u-cnpj" type="text" autocomplete="off" value="${esc(u.cnpj)}" placeholder="00.000.000/0000-00" aria-describedby="u-cnpj-dica u-cnpj-erro">
          <button class="btn btn--secundario" type="button" data-cnpj-buscar="u-cnpj">${icone('busca')}Buscar</button>
        </div>
        <p class="campo__dica" id="u-cnpj-dica">Necessário para gerar vouchers da Muito Mais. Com ele, buscamos o endereço na Receita Federal.</p>
        <p class="campo__erro" id="u-cnpj-erro" hidden></p>
        <div class="cnpj-resultado" data-cnpj-resultado="u-cnpj" hidden></div>
        <p class="visualmente-oculto" role="status" data-cnpj-status="u-cnpj"></p>
      </div>
      ${htmlCampo({ id: 'u-endereco', rotulo: 'Endereço', valor: u.endereco })}
      ${htmlCampo({ id: 'u-google', rotulo: 'Link do Google', tipo: 'url', valor: u.google, dica: 'Endereço da página da unidade no Google.', erro: 'Confira o link: ele começa com https://', extra: 'placeholder="https://"' })}
      ${htmlSelect({ id: 'u-fuso', rotulo: 'Fuso horário', opcoes: FUSOS, valor: u.fuso })}`,
    salvar() {
      const cnpj = valorDe('u-cnpj');
      if (cnpj && cnpj !== u.cnpj && !cnpjValido(cnpj)) return validar([[document.getElementById('u-cnpj'), true, 'Confira o CNPJ: são 14 caracteres e os 2 últimos não batem.']]);
      const nome = valorDe('u-nome');
      const google = valorDe('u-google');
      const repetido = cfg.unidades.some((x, j) => j !== i && x.nome.toLowerCase() === nome.toLowerCase());
      const ok = validar([
        [document.getElementById('u-nome'), !nome || repetido, repetido ? 'Já existe uma unidade com esse nome.' : 'Escreva o nome da unidade.'],
        [document.getElementById('u-google'), Boolean(google) && !/^https?:\/\/\S+\.\S+/.test(google)],
      ]);
      if (!ok) return false;
      const dados = { nome, cnpj: cnpj && cnpjValido(cnpj) ? formatarCnpj(cnpj) : cnpj, endereco: valorDe('u-endereco'), google, fuso: valorDe('u-fuso') };
      if (nova) cfg.unidades.push(dados); else cfg.unidades[i] = dados;
      salvarCfg();
      desenharUnidades();
      desenharIntegracoes();
      avisar(nova ? `Unidade ${nome} criada` : `Unidade ${nome} atualizada`);
    },
  });
  ligarBuscaCnpj('u-cnpj', [
    { rotulo: 'Endereço', alvo: document.getElementById('u-endereco'), valor: enderecoDe, substituir: true },
    { rotulo: 'Nome da unidade', alvo: document.getElementById('u-nome'), valor: (d) => nomeLegivel(d.nome_fantasia) },   // só marca se estiver vazio
  ]);
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-nova-unidade]')) abrirUnidade();
  const editar = e.target.closest('[data-editar-unidade]');
  if (editar) abrirUnidade(Number(editar.dataset.editarUnidade));
});

// =====================================================================
// Atendentes
// =====================================================================
const filtroAtend = { q: '', unidade: 'todas' };
// Unidades que a pessoa pode mexer: o Administrador, todas; o Gestor, só as dele (cadastro em Usuários)
function minhasUnidades() {
  const minhas = pode('configuracoes') ? 'todas' : (cfg.usuarios[INDICE_EU]?.unidades ?? 'todas');
  return cfg.unidades.map((u) => u.nome).filter((n) => minhas === 'todas' || minhas.includes(n));
}
function iniciarAtendentes() {
  const sel = $('[data-a-unidade]');
  const unidades = minhasUnidades();
  unidades.forEach((u) => sel.add(new Option(u, u)));
  if (!pode('configuracoes')) {
    sel.options[0].textContent = unidades.length > 1 ? 'Minhas unidades' : unidades[0];
    const escopo = $('[data-a-escopo]');
    escopo.hidden = false;
    escopo.innerHTML = `${icone('cadeado')}<span>Você vê e edita só os atendentes de <strong>${esc(unidades.join(' e '))}</strong>, as unidades do seu acesso.</span>`;
  }
  sel.addEventListener('change', () => { filtroAtend.unidade = sel.value; desenharAtendentes(); });
  $('[data-a-busca]').addEventListener('input', (e) => { filtroAtend.q = e.target.value.trim().toLowerCase(); desenharAtendentes(); });
  desenharAtendentes();
}
function desenharAtendentes() {
  const minhas = minhasUnidades();
  const lista = cfg.atendentes.filter((a) => minhas.includes(a.unidade)
    && (filtroAtend.unidade === 'todas' || a.unidade === filtroAtend.unidade)
    && (!filtroAtend.q || `${a.nome} ${a.cargo}`.toLowerCase().includes(filtroAtend.q)));
  $('[data-a-contagem]').innerHTML = `<strong>${lista.length}</strong> ${lista.length === 1 ? 'atendente' : 'atendentes'}`;
  $('[data-lista-atendentes]').innerHTML = lista.length ? lista.map((a) => `
    <tr${a.ativo ? '' : ' class="cfg-tabela__inativo"'}>
      <th scope="row">${esc(a.nome)}</th>
      <td>${esc(a.unidade)}</td>
      <td>${a.cargo ? esc(a.cargo) : '<span class="mudo">—</span>'}</td>
      <td>${a.ativo ? situacao('Ativo', 'publicada') : situacao('Desativado', 'arquivada')}</td>
      <td class="cfg-tabela__acoes">
        <button class="btn btn--fantasma" type="button" data-editar-atendente="${a.id}">${icone('editar')}Editar<span class="visualmente-oculto"> ${esc(a.nome)}</span></button>
        <button class="btn btn--fantasma" type="button" data-alternar-atendente="${a.id}">${a.ativo ? 'Desativar' : 'Reativar'}<span class="visualmente-oculto"> ${esc(a.nome)}</span></button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="5" class="vazio"><strong>Nenhum atendente aqui</strong><br>Mude a busca ou a unidade.</td></tr>';
}
function abrirAtendente(id) {
  const novo = !id;
  const minhas = minhasUnidades();
  const a = novo ? { nome: '', unidade: filtroAtend.unidade === 'todas' ? minhas[0] : filtroAtend.unidade, cargo: '', codigo: '' } : cfg.atendentes.find((x) => x.id === id);
  if (!a || !minhas.includes(a.unidade)) return;   // atendente de outra unidade: fora do acesso
  abrirGaveta({
    titulo: novo ? 'Novo atendente' : `Editar ${a.nome}`,
    botao: novo ? 'Adicionar' : 'Salvar',
    campos: `
      ${htmlSelect({ id: 'at-unidade', rotulo: 'Unidade', opcoes: minhas.map((u) => [u, u]), valor: a.unidade })}
      ${htmlCampo({ id: 'at-nome', rotulo: 'Nome', valor: a.nome, obrigatorio: true, dica: 'Como o cliente vai ver na pesquisa.', erro: 'Escreva o nome do atendente.' })}
      ${htmlCampo({ id: 'at-cargo', rotulo: 'Cargo', valor: a.cargo, extra: 'placeholder="Ex.: Garçom"' })}
      ${htmlCampo({ id: 'at-codigo', rotulo: 'Código', valor: a.codigo, dica: 'Matrícula ou código interno, se a casa usar.' })}`,
    salvar() {
      const nome = valorDe('at-nome');
      if (!validar([[document.getElementById('at-nome'), !nome]])) return false;
      const dados = { nome, unidade: valorDe('at-unidade'), cargo: valorDe('at-cargo'), codigo: valorDe('at-codigo') };
      if (novo) cfg.atendentes.unshift({ id: `at-${Date.now()}`, ativo: true, ...dados }); else Object.assign(a, dados);
      salvarCfg();
      desenharAtendentes();
      avisar(novo ? `${nome} adicionado(a) em ${dados.unidade}` : `${nome} atualizado(a)`);
    },
  });
}
function abrirImportar() {
  abrirGaveta({
    titulo: 'Importar planilha de atendentes',
    botao: 'Importar',
    campos: `
      <p class="cfg-info">${icone('lista')}<span>Use uma planilha CSV com as colunas <strong>Nome</strong> (obrigatória), <strong>Código</strong> e <strong>Cargo</strong>. Uma pessoa por linha.</span></p>
      ${htmlSelect({ id: 'im-unidade', rotulo: 'Unidade dos atendentes', opcoes: minhasUnidades().map((u) => [u, u]), valor: minhasUnidades()[0] })}
      <div class="campo">
        <label for="im-arquivo">Arquivo CSV</label>
        <input id="im-arquivo" type="file" accept=".csv,text/csv" aria-describedby="im-arquivo-erro">
        <p class="campo__erro" id="im-arquivo-erro" hidden>Escolha o arquivo da planilha.</p>
      </div>`,
    salvar() {
      const arquivo = document.getElementById('im-arquivo');
      if (!validar([[arquivo, !arquivo.files.length]])) return false;
      avisar('Protótipo: a planilha não foi lida nem enviada');
    },
  });
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-novo-atendente]')) abrirAtendente();
  if (e.target.closest('[data-importar]')) abrirImportar();
  const editar = e.target.closest('[data-editar-atendente]');
  if (editar) abrirAtendente(editar.dataset.editarAtendente);
  const alternar = e.target.closest('[data-alternar-atendente]');
  if (alternar) {
    const a = cfg.atendentes.find((x) => x.id === alternar.dataset.alternarAtendente);
    if (!a || !minhasUnidades().includes(a.unidade)) return;
    a.ativo = !a.ativo;
    salvarCfg();
    desenharAtendentes();
    $(`[data-alternar-atendente="${a.id}"]`)?.focus();
    avisar(a.ativo ? `${a.nome} voltou a aparecer na pesquisa` : `${a.nome} não aparece mais na pesquisa`);
  }
});

// =====================================================================
// Usuários e perfis
// =====================================================================
const nomesDasAreas = (p) => D.areas.filter((a) => p.telas.includes(a.id)).map((a) => a.nome).join(', ');
const textoUnidades = (u) => (u === 'todas' ? 'Todas' : u.join(', '));

function desenharUsuarios() {
  $('[data-lista-usuarios]').innerHTML = cfg.usuarios.map((u, i) => {
    const eu = i === INDICE_EU;
    const [rotulo, tipo] = SITUACAO_USUARIO[u.status];
    const acoes = [`<button class="btn btn--fantasma" type="button" data-editar-usuario="${i}">${icone('editar')}Editar<span class="visualmente-oculto"> ${esc(u.nome)}</span></button>`];
    if (u.status === 'inativo') acoes.push(`<button class="btn btn--fantasma" type="button" data-reativar-usuario="${i}">Reativar<span class="visualmente-oculto"> ${esc(u.nome)}</span></button>`);
    return `<tr${u.status === 'inativo' ? ' class="cfg-tabela__inativo"' : ''}>
      <th scope="row"><span class="pessoa"><span class="avatar avatar--p" aria-hidden="true">${iniciais(u.nome)}</span>
        <span class="pessoa__texto"><span>${esc(u.nome)}${eu ? ' <span class="mudo">(você)</span>' : ''}</span><small>${esc(u.email)}</small></span></span></th>
      <td><span class="selo-perfil selo-perfil--${u.perfil}">${esc(D.perfis[u.perfil].nome)}</span></td>
      <td>${esc(textoUnidades(u.unidades))}</td>
      <td><span class="cfg-situacao">${situacao(rotulo, tipo)}${u.status === 'convidado'
        ? `<button class="link-texto cfg-situacao__link" type="button" data-reenviar="${i}">Reenviar convite<span class="visualmente-oculto"> para ${esc(u.nome)}</span></button>` : ''}</span></td>
      <td class="cfg-tabela__acoes">${acoes.join('')}</td>
    </tr>`;
  }).join('');
}

function desenharMatriz() {
  const perfis = Object.values(D.perfis);
  $('[data-matriz]').innerHTML = `
    <thead><tr><th scope="col">Área</th>${perfis.map((p) => `<th scope="col" class="matriz__perfil">${esc(p.nome)}${p.proposta ? '<small>proposta, a confirmar</small>' : ''}</th>`).join('')}</tr></thead>
    <tbody>${D.areas.map((a) => `<tr><th scope="row">${esc(a.nome)}</th>${perfis.map((p) => {
      if (p.telas.includes(a.id)) return `<td class="matriz__sim">${icone('ok')}<span class="visualmente-oculto">Vê</span></td>`;
      if (a.id === 'configuracoes') return '<td class="matriz__parcial">Só os próprios dados: nome, e-mail, celular e senha</td>';
      return '<td class="matriz__nao"><span aria-hidden="true">—</span><span class="visualmente-oculto">Não vê</span></td>';
    }).join('')}</tr>`).join('')}</tbody>`;
}

function abrirUsuario(i) {
  const novo = i === undefined;
  const u = novo ? { nome: '', email: '', telefone: '', perfil: 'marketing', unidades: 'todas' } : cfg.usuarios[i];
  const eu = !novo && i === INDICE_EU;
  const todas = u.unidades === 'todas';
  abrirGaveta({
    titulo: novo ? 'Convidar usuário' : `Editar ${u.nome}`,
    botao: novo ? 'Enviar convite' : 'Salvar',
    campos: `
      ${htmlCampo({ id: 'us-nome', rotulo: 'Nome', valor: u.nome, obrigatorio: true, erro: 'Escreva o nome da pessoa.', extra: 'autocomplete="off"' })}
      ${htmlCampo({ id: 'us-email', rotulo: 'E-mail', tipo: 'email', valor: u.email, obrigatorio: true, erro: 'Confira o e-mail.', extra: `autocomplete="off"${!novo && u.status !== 'convidado' ? ' readonly' : ''}`,
        dica: !novo && u.status !== 'convidado' ? 'É o login da pessoa. Não muda depois que o convite é aceito.' : '' })}
      ${htmlCampo({ id: 'us-telefone', rotulo: 'Telefone', tipo: 'tel', valor: u.telefone || '', extra: 'autocomplete="off" placeholder="(00) 00000-0000"' })}
      <fieldset class="perfis-op">
        <legend>Perfil</legend>
        ${eu ? '<p class="campo__dica">Você não pode mudar o próprio perfil. Peça a outro administrador.</p>' : ''}
        ${Object.entries(D.perfis).map(([id, p]) => `
          <label class="perfil-op"><input type="radio" name="us-perfil" value="${id}"${u.perfil === id ? ' checked' : ''}${eu ? ' disabled' : ''}>
            <span class="perfil-op__texto"><strong>${esc(p.nome)}${p.proposta ? ' <span class="selo-dev">Proposta</span>' : ''}</strong>
            <span>${esc(p.descricao)}</span>
            <small>Vê: ${esc(nomesDasAreas(p))}</small></span></label>`).join('')}
      </fieldset>
      <fieldset class="unidades-op" aria-describedby="us-unidades-erro">
        <legend>Acesso às unidades</legend>
        <label class="marcar"><input type="checkbox" data-us-todas${todas ? ' checked' : ''}><span>Todas as unidades <span class="mudo">(inclui as que forem criadas depois)</span></span></label>
        ${cfg.unidades.map((x) => `<label class="marcar marcar--sub"><input type="checkbox" name="us-unidade" value="${esc(x.nome)}"${todas || u.unidades.includes(x.nome) ? ' checked' : ''}${todas ? ' disabled' : ''}>${esc(x.nome)}</label>`).join('')}
        <p class="campo__erro" id="us-unidades-erro" hidden>Escolha pelo menos uma unidade.</p>
      </fieldset>
      ${novo ? `<p class="cfg-info">${icone('cadeado')}<span>A pessoa recebe um e-mail com um link para <strong>criar a própria senha</strong>. Ninguém define a senha de outra pessoa.</span></p>` : ''}
      ${!novo && !eu && u.status !== 'inativo' ? `<div class="cfg-perigo">
        <p><strong>Desativar acesso</strong>A pessoa deixa de entrar no painel. Dá para reativar depois.</p>
        <button class="btn btn--perigo" type="button" data-desativar-usuario="${i}">Desativar</button>
      </div>` : ''}`,
    salvar() {
      const nome = valorDe('us-nome');
      const email = valorDe('us-email');
      const repetido = cfg.usuarios.some((x, j) => j !== i && x.email.toLowerCase() === email.toLowerCase());
      const marcadasTodas = $('[data-us-todas]', gavetaForm).checked;
      const unidades = marcadasTodas ? 'todas' : $$('[name="us-unidade"]:checked', gavetaForm).map((c) => c.value);
      const erroUnidades = unidades !== 'todas' && !unidades.length;
      $('#us-unidades-erro').hidden = !erroUnidades;
      const ok = validar([
        [document.getElementById('us-nome'), !nome],
        [document.getElementById('us-email'), !emailValido(email) || repetido, repetido ? 'Já existe um usuário com esse e-mail.' : 'Confira o e-mail.'],
      ]);
      if (!ok) return false;
      if (erroUnidades) { $('[data-us-todas]', gavetaForm).focus(); return false; }
      const perfilEscolhido = $('[name="us-perfil"]:checked', gavetaForm).value;
      const dados = { nome, email, telefone: valorDe('us-telefone'), perfil: perfilEscolhido, unidades };
      if (novo) cfg.usuarios.push({ ...dados, status: 'convidado' }); else Object.assign(u, dados);
      salvarCfg();
      desenharUsuarios();
      avisar(novo ? `Convite enviado para ${email} (protótipo: nenhum e-mail sai daqui)` : `${nome} atualizado(a)`);
    },
  });
}
// "Todas as unidades" liga/desliga as caixas de cada unidade
gavetaForm?.addEventListener('change', (e) => {
  if (!e.target.matches('[data-us-todas]')) return;
  $$('[name="us-unidade"]', gavetaForm).forEach((c) => { c.disabled = e.target.checked; if (e.target.checked) c.checked = true; });
  $('#us-unidades-erro').hidden = true;
});
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-convidar]')) abrirUsuario();
  const editar = e.target.closest('[data-editar-usuario]');
  if (editar) abrirUsuario(Number(editar.dataset.editarUsuario));
  const reenviar = e.target.closest('[data-reenviar]');
  if (reenviar) avisar(`Convite reenviado para ${cfg.usuarios[reenviar.dataset.reenviar].email} (protótipo)`);
  const reativar = e.target.closest('[data-reativar-usuario]');
  if (reativar) {
    const u = cfg.usuarios[reativar.dataset.reativarUsuario];
    u.status = 'ativo';
    salvarCfg();
    desenharUsuarios();
    avisar(`${u.nome} voltou a ter acesso`);
  }
  const desativar = e.target.closest('[data-desativar-usuario]');
  if (desativar) {
    const i = Number(desativar.dataset.desativarUsuario);
    const u = cfg.usuarios[i];
    const sim = await confirmar({
      titulo: `Desativar ${u.nome}?`,
      texto: 'A pessoa perde o acesso ao painel na hora. O histórico dela continua guardado, e dá para reativar depois.',
      botao: 'Desativar', perigo: true, icone: 'cadeado',
    });
    $('[data-confirmar]').close();
    if (!sim) { $(`[data-desativar-usuario="${i}"]`)?.focus(); return; }
    u.status = 'inativo';
    salvarCfg();
    desenharUsuarios();
    gaveta.close();
    $(`[data-reativar-usuario="${i}"]`)?.focus();
    avisar(`${u.nome} foi desativado(a)`);
  }
});

// =====================================================================
// Integrações
// =====================================================================
function desenharIntegracoes() {
  const caixa = $('[data-muitomais]');
  if (!caixa) return;
  const mm = cfg.muitoMais;
  caixa.innerHTML = `
    <div class="cfg__topo">
      <div><h3 class="cartao__titulo">Muito Mais ${mm.conectado ? situacao('Conectado', 'publicada') : situacao('Desconectado', 'arquivada')}</h3>
      <p class="cartao__sub">Liga a conta Muito Mais ao Opiina para gerar vouchers por unidade.</p></div>
      ${mm.conectado ? '<button class="btn btn--perigo" type="button" data-mm-desconectar>Desconectar</button>' : ''}
    </div>
    ${mm.conectado ? `
      <form class="cfg__linha" data-mm-voucher novalidate>
        ${htmlSelect({ id: 'mm-unidade', rotulo: 'Unidade', opcoes: cfg.unidades.map((u) => [u.nome, u.nome]), valor: cfg.unidades[0].nome })}
        <button class="btn btn--primario" type="submit">Gerar voucher</button>
      </form>
      <p class="campo__erro" id="mm-unidade-erro" role="alert" hidden></p>
      <p class="campo__dica">O voucher é ligado à unidade pelo CNPJ dela.</p>
      ${mm.vouchers.length ? `<ul class="cfg-vouchers">${mm.vouchers.map((v) => `<li>${icone('premios')}<span><strong>${esc(v.unidade)}</strong> · voucher ativo</span></li>`).join('')}</ul>` : '<p class="mudo">Nenhum voucher ativo.</p>'}`
    : `
      <form class="cfg__linha" data-mm-conectar novalidate>
        <div class="campo">
          <label for="mm-chave">Chave de API da Muito Mais</label>
          <input id="mm-chave" type="password" autocomplete="off" aria-describedby="mm-chave-dica mm-chave-erro">
          <p class="campo__dica" id="mm-chave-dica">Copie a chave na sua conta Muito Mais. Depois de salva, ela não aparece mais aqui.</p>
          <p class="campo__erro" id="mm-chave-erro" hidden>Cole a chave de API.</p>
        </div>
        <button class="btn btn--primario" type="submit">Conectar</button>
      </form>`}`;

  const comLink = cfg.unidades.filter((u) => u.google);
  const semLink = cfg.unidades.filter((u) => !u.google);
  $('[data-google-resumo]').innerHTML = `<strong>${comLink.length} de ${cfg.unidades.length}</strong> unidades com link do Google.${semLink.length ? ` Falta: ${semLink.map((u) => esc(u.nome)).join(', ')}.` : ''}`;
}
document.addEventListener('submit', (e) => {
  if (e.target.matches('[data-mm-conectar]')) {
    e.preventDefault();
    const chave = document.getElementById('mm-chave');
    if (!validar([[chave, !chave.value.trim()]])) return;
    cfg.muitoMais.conectado = true;   // a chave não é guardada no protótipo
    salvarCfg();
    desenharIntegracoes();
    $('[data-muitomais] h3').setAttribute('tabindex', '-1');
    $('[data-muitomais] h3').focus();
    avisar('Muito Mais conectada (protótipo)');
  }
  if (e.target.matches('[data-mm-voucher]')) {
    e.preventDefault();
    const nome = document.getElementById('mm-unidade').value;
    const unidade = cfg.unidades.find((u) => u.nome === nome);
    const erro = document.getElementById('mm-unidade-erro');
    if (!unidade.cnpj) {
      erro.innerHTML = `A unidade ${esc(nome)} não tem CNPJ. Cadastre em <a class="link-texto" href="?aba=unidades" data-aba-link="unidades">Unidades</a> e volte aqui.`;
      erro.hidden = false;
      return;
    }
    if (!cfg.muitoMais.vouchers.some((v) => v.unidade === nome)) cfg.muitoMais.vouchers.push({ unidade: nome });
    salvarCfg();
    desenharIntegracoes();
    avisar(`Voucher gerado para ${nome} (protótipo)`);
  }
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-mm-desconectar]')) return;
  const sim = await confirmar({
    titulo: 'Desconectar a Muito Mais?',
    texto: 'Os vouchers deixam de funcionar até a conta ser conectada de novo.',
    botao: 'Desconectar', perigo: true, icone: 'plug',
  });
  $('[data-confirmar]').close();
  if (!sim) return;
  cfg.muitoMais = { conectado: false, vouchers: [] };
  salvarCfg();
  desenharIntegracoes();
  document.getElementById('mm-chave')?.focus();
  avisar('Muito Mais desconectada');
});

// =====================================================================
// Minha conta (todos os perfis)
// =====================================================================
// Cada pessoa muda o próprio nome, e-mail, celular e senha. Trocar o e-mail (que é o login)
// pede a senha atual e só vale depois de confirmar pelo link enviado ao novo endereço.
function iniciarConta() {
  const eu = cfg.usuarios[INDICE_EU];
  const dados = $('[data-form-dados]');
  const confirmaEmail = $('[data-confirma-email]');
  const pendente = $('[data-email-pendente]');

  function preencher() {
    dados.elements.nome.value = eu.nome;
    dados.elements.email.value = eu.email;
    dados.elements.telefone.value = eu.telefone || '';
    dados.elements.senhaEmail.value = '';
    confirmaEmail.hidden = true;
    pendente.hidden = !eu.emailPendente;
    if (eu.emailPendente) $('[data-email-pendente-texto]').innerHTML = `Troca para <strong>${esc(eu.emailPendente)}</strong> aguardando confirmação. Abra o link que enviamos para esse endereço.`;
  }
  preencher();
  $('[data-meu-perfil]').textContent = D.perfis[eu.perfil].nome;
  $('[data-meu-acesso]').textContent = `Vê: ${nomesDasAreas(D.perfis[eu.perfil])}. Unidades: ${textoUnidades(eu.unidades)}.`;

  // A senha só é pedida quando o e-mail muda
  dados.elements.email.addEventListener('input', () => {
    confirmaEmail.hidden = dados.elements.email.value.trim().toLowerCase() === eu.email.toLowerCase();
  });
  $('[data-cancelar-email]').addEventListener('click', () => {
    delete eu.emailPendente;
    salvarCfg();
    preencher();
    dados.elements.email.focus();
    avisar('Troca de e-mail cancelada');
  });

  dados.addEventListener('submit', (e) => {
    e.preventDefault();
    const { nome, email, telefone, senhaEmail } = dados.elements;
    const novoEmail = email.value.trim();
    const mudouEmail = novoEmail.toLowerCase() !== eu.email.toLowerCase();
    const digitos = telefone.value.replace(/\D/g, '');
    const emUso = mudouEmail && cfg.usuarios.some((u, j) => j !== INDICE_EU && u.email.toLowerCase() === novoEmail.toLowerCase());
    const ok = validar([
      [nome, !nome.value.trim()],
      [email, !emailValido(novoEmail) || emUso, emUso ? 'Esse e-mail já é de outro usuário.' : 'Confira o e-mail (ex.: nome@empresa.com.br).'],
      [telefone, Boolean(digitos) && (digitos.length < 10 || digitos.length > 11)],
      [senhaEmail, mudouEmail && !senhaEmail.value],
    ]);
    if (!ok) return;
    eu.nome = nome.value.trim();
    eu.telefone = telefone.value.trim();
    if (mudouEmail) eu.emailPendente = novoEmail;
    salvarCfg();
    // Nome novo também no rodapé do menu
    $('.conta__nome').textContent = eu.nome;
    $('.conta .avatar').textContent = iniciais(eu.nome);
    preencher();
    avisar(mudouEmail ? `Enviamos um link para ${novoEmail}. O e-mail muda depois que você confirmar (protótipo).` : 'Seus dados foram salvos');
  });

  const senha = $('[data-form-senha]');
  $('[data-senha-usuario]').value = eu.email;
  senha.addEventListener('submit', (e) => {
    e.preventDefault();
    const { atual, nova, confirma } = senha.elements;
    const ok = validar([
      [atual, !atual.value],
      [nova, nova.value.length < 8],
      [confirma, !confirma.value || confirma.value !== nova.value],
    ]);
    if (!ok) return;
    senha.reset();
    avisar('Senha trocada (protótipo: nada foi salvo)');
  });
}

// Começa depois de tudo declarado (as funções usam constantes definidas acima)
if ($('[data-config]')) iniciarConfig();
