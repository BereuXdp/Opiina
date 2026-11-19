// Opiina — programa de parceria para contadores (protótipo, 2026-11-19). Sem dependências.
// Base comum: conta do parceiro, cupom, indicações e saques. Usado por contadores.js (cadastro),
// onboarding.js (cupom no cadastro do cliente), pagamento-concluido.js (libera a comissão) e painel/parceiro.js.
// PROTÓTIPO: tudo fica no navegador (localStorage). No app, isso vem do servidor.
window.OpiinaParceiros = (() => {
  // Regras do programa. Confirmado pelo cliente: o cupom dá desconto ao cliente indicado e a comissão é
  // única, um percentual da 1ª mensalidade. Os NÚMEROS ainda não foram definidos: enquanto "definidas" for
  // false, o painel usa o percentual abaixo só como exemplo e mostra o aviso.
  const REGRAS = {
    definidas: false,
    comissaoPercentual: 50,          // EXEMPLO — trocar pelo valor real e marcar definidas: true
    descontoCupom: null,             // ex.: '10% na 1ª mensalidade' — null mostra "a definir"
  };
  const PRECOS = { start: 147, pro: 297, redes: 697 };
  const NOMES_PLANO = { start: 'Start', pro: 'Pro', redes: 'Redes' };

  const CHAVES = { conta: 'opiina-parceiro', indicacoes: 'opiina-parceiro-indicacoes', saques: 'opiina-parceiro-saques' };

  const ler = (chave, padrao) => {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
  };
  const gravar = (chave, valor) => {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento: segue sem guardar */ }
  };

  // Cupom: primeira palavra do escritório (ou do nome) em maiúsculas + 2 dígitos. No app, o servidor garante que é único.
  function gerarCupom(base) {
    const palavra = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
      .split(/[^A-Z0-9]+/).find((p) => p.length >= 3 && !['CONTABILIDADE', 'CONTABIL', 'ESCRITORIO', 'ASSESSORIA'].includes(p)) || 'PARCEIRO';
    return `${palavra.slice(0, 10)}${Math.floor(10 + Math.random() * 90)}`;
  }

  const normalizarCupom = (texto) => String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  const cupomValido = (texto) => /^[A-Z0-9]{4,20}$/.test(normalizarCupom(texto));

  function criarConta(dados) {
    const conta = { ...dados, cupom: gerarCupom(dados.escritorio || dados.nome), criadoEm: new Date().toISOString(), pix: null };
    gravar(CHAVES.conta, conta);
    gravar(CHAVES.saques, []);   // conta nova começa sem saques (as indicações são filtradas pelo cupom)
    entrar('conta');              // quem acabou de se cadastrar já entra no painel
    return conta;
  }
  const conta = () => ler(CHAVES.conta, null);
  const salvarConta = (dados) => gravar(CHAVES.conta, { ...conta(), ...dados });

  // Sessão (2026-11-19): o painel do parceiro só abre depois do login (parceiro-entrar.html) ou do cadastro.
  // 'conta' = a conta criada neste navegador; 'demo' = a conta de exemplo. Fica só na aba (sessionStorage).
  // No app, a sessão é do servidor (cookie), e a senha é conferida lá.
  const CHAVE_SESSAO = 'opiina-parceiro-sessao';
  const EMAIL_DEMO = 'ana@souzacontabil.com.br';
  const sessao = () => { try { return sessionStorage.getItem(CHAVE_SESSAO); } catch { return null; } };
  const entrar = (tipo) => { try { sessionStorage.setItem(CHAVE_SESSAO, tipo); } catch { /* ignora */ } };
  const sair = () => { try { sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* ignora */ } };
  // Protótipo (pedido do cliente, 2026-11-19: "acessar o painel com qualquer coisa"): qualquer e-mail e senha entram.
  // O e-mail da conta criada neste navegador abre essa conta; qualquer outro abre a conta de exemplo.
  function login(email) {
    const e = String(email).trim().toLowerCase();
    const c = conta();
    return c && e && c.email.trim().toLowerCase() === e ? 'conta' : 'demo';
  }

  // Indicações registradas pelo cadastro do cliente (onboarding) com cupom
  const indicacoes = () => ler(CHAVES.indicacoes, []);
  function registrarIndicacao({ cupom, empresa, plano }) {
    const lista = indicacoes();
    const nova = { id: `i${Date.now()}`, cupom: normalizarCupom(cupom), empresa, plano, data: new Date().toISOString(), situacao: 'cadastrou' };
    lista.push(nova);
    gravar(CHAVES.indicacoes, lista);
    return nova;
  }
  function marcarPaga(id) {
    const lista = indicacoes();
    const item = lista.find((i) => i.id === id);
    if (!item) return;
    item.situacao = 'pagou';
    item.pagoEm = new Date().toISOString();
    gravar(CHAVES.indicacoes, lista);
  }

  const saques = () => ler(CHAVES.saques, []);
  function solicitarSaque({ valor, pix }) {
    const lista = saques();
    lista.push({ id: `s${Date.now()}`, valor, pix, data: new Date().toISOString(), situacao: 'solicitado' });
    gravar(CHAVES.saques, lista);
  }

  const comissaoDe = (plano) => Math.round((PRECOS[plano] || 0) * REGRAS.comissaoPercentual) / 100;
  const dinheiro = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return {
    REGRAS, PRECOS, NOMES_PLANO,
    conta, criarConta, salvarConta,
    sessao, entrar, sair, login, EMAIL_DEMO,
    indicacoes, registrarIndicacao, marcarPaga,
    saques, solicitarSaque,
    normalizarCupom, cupomValido, comissaoDe, dinheiro,
  };
})();
