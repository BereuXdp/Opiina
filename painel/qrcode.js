// Opiina — painel (protótipo): gerador de QR Code em JS puro (sem biblioteca), conforme a ISO/IEC 18004.
// Modo byte (UTF-8), correção de erro nível M (~15%), versões 1 a 20 (links de até ~330 caracteres).
// Estrutura baseada no algoritmo de referência (blocos Reed-Solomon, máscaras e pontuação da norma).
// Uso: qrSvg(texto) → <svg>; qrPng(texto, px) → data URL; abrirLinks({...}) → pop-up com unidades, link e QR.

const QR = (() => {
  // Nível M: códigos de correção por bloco e nº de blocos, versões 1–20 (índice 0 não usado)
  const ECC_POR_BLOCO = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const BLOCOS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const FORMATO_M = 0;   // bits do nível M no campo de formato

  const bit = (x, i) => ((x >>> i) & 1) !== 0;

  function modulosDeDados(v) {   // módulos livres para dados + correção
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  const palavrasDeDados = (v) => Math.floor(modulosDeDados(v) / 8) - ECC_POR_BLOCO[v] * BLOCOS[v];

  // Aritmética no corpo GF(256), polinômio 0x11D
  function mult(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function divisor(grau) {
    const r = new Array(grau).fill(0);
    r[grau - 1] = 1;
    let raiz = 1;
    for (let i = 0; i < grau; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = mult(r[j], raiz);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      raiz = mult(raiz, 0x02);
    }
    return r;
  }
  function resto(dados, div) {
    const r = div.map(() => 0);
    for (const b of dados) {
      const fator = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => { r[i] ^= mult(c, fator); });
    }
    return r;
  }

  function matriz(texto) {
    const bytes = [...new TextEncoder().encode(texto)];
    // Menor versão em que o texto cabe
    let v = 1;
    const bitsContagem = (ver) => (ver <= 9 ? 8 : 16);
    while (v <= 20 && 4 + bitsContagem(v) + bytes.length * 8 > palavrasDeDados(v) * 8) v++;
    if (v > 20) throw new Error('Texto longo demais para o QR Code');

    // Dados: modo byte (0100) + contagem + bytes + terminador + preenchimento
    const bits = [];
    const poe = (valor, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
    poe(0b0100, 4);
    poe(bytes.length, bitsContagem(v));
    bytes.forEach((b) => poe(b, 8));
    const capacidade = palavrasDeDados(v) * 8;
    poe(0, Math.min(4, capacidade - bits.length));
    poe(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xEC; bits.length < capacidade; pad ^= 0xEC ^ 0x11) poe(pad, 8);
    const dados = [];
    for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

    // Divide em blocos, calcula a correção de cada um e intercala
    const nBlocos = BLOCOS[v], eccLen = ECC_POR_BLOCO[v];
    const total = Math.floor(modulosDeDados(v) / 8);
    const curtos = nBlocos - (total % nBlocos);
    const tamCurto = Math.floor(total / nBlocos);
    const div = divisor(eccLen);
    const blocos = [];
    for (let i = 0, k = 0; i < nBlocos; i++) {
      const d = dados.slice(k, k + tamCurto - eccLen + (i < curtos ? 0 : 1));
      k += d.length;
      const ecc = resto(d, div);
      if (i < curtos) d.push(0);
      blocos.push(d.concat(ecc));
    }
    const palavras = [];
    for (let i = 0; i < blocos[0].length; i++) {
      blocos.forEach((b, j) => { if (i !== tamCurto - eccLen || j >= curtos) palavras.push(b[i]); });
    }

    // Matriz: padrões fixos (localizadores, alinhamento, sincronismo, formato, versão)
    const n = v * 4 + 17;
    const m = Array.from({ length: n }, () => new Array(n).fill(false));
    const fixo = Array.from({ length: n }, () => new Array(n).fill(false));
    const poeFixo = (x, y, escuro) => { m[y][x] = escuro; fixo[y][x] = true; };

    for (let i = 0; i < n; i++) { poeFixo(6, i, i % 2 === 0); poeFixo(i, 6, i % 2 === 0); }
    [[3, 3], [n - 4, 3], [3, n - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) poeFixo(x, y, d !== 2 && d !== 4);
      }
    });
    if (v > 1) {
      const qtd = Math.floor(v / 7) + 2;
      const passo = Math.ceil((v * 4 + 4) / (qtd * 2 - 2)) * 2;
      const pos = [6];
      for (let p = n - 7; pos.length < qtd; p -= passo) pos.splice(1, 0, p);
      pos.forEach((a, i) => pos.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === qtd - 1) || (i === qtd - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poeFixo(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    function formato(mascara) {
      const d = (FORMATO_M << 3) | mascara;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) poeFixo(8, i, bit(b, i));
      poeFixo(8, 7, bit(b, 6));
      poeFixo(8, 8, bit(b, 7));
      poeFixo(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) poeFixo(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) poeFixo(n - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) poeFixo(8, n - 15 + i, bit(b, i));
      poeFixo(8, n - 8, true);   // módulo escuro fixo
    }
    formato(0);   // reserva a área (o valor certo entra depois de escolher a máscara)
    if (v >= 7) {
      let r = v;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) {
        const a = n - 11 + (i % 3), c = Math.floor(i / 3);
        poeFixo(a, c, bit(b, i));
        poeFixo(c, a, bit(b, i));
      }
    }

    // Dados em zigue-zague, de baixo para cima, em colunas duplas da direita para a esquerda
    let i = 0;
    for (let dir = n - 1; dir >= 1; dir -= 2) {
      if (dir === 6) dir = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = dir - j;
          const sobe = ((dir + 1) & 2) === 0;
          const y = sobe ? n - 1 - vert : vert;
          if (!fixo[y][x] && i < palavras.length * 8) {
            m[y][x] = bit(palavras[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }

    // Máscaras: aplica cada uma, pontua (regras da norma) e fica com a de menor penalidade
    const MASCARAS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];
    const mascarar = (k) => {
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fixo[y][x] && MASCARAS[k](x, y)) m[y][x] = !m[y][x];
    };
    const PADRAO = [1, 0, 1, 1, 1, 0, 1];
    function penalidade() {
      let p = 0;
      const linha = (get) => {
        let corrida = 1;
        for (let k = 1; k <= n; k++) {
          if (k < n && get(k) === get(k - 1)) corrida++;
          else { if (corrida >= 5) p += corrida - 2; corrida = 1; }
        }
        // Padrão parecido com o localizador (1:1:3:1:1) com 4 claros de um lado
        for (let k = 0; k + 7 <= n; k++) {
          if (!PADRAO.every((b, t) => Number(get(k + t)) === b)) continue;
          const claro = (a, b) => { for (let t = a; t < b; t++) if (t >= 0 && t < n && get(t)) return false; return true; };
          if (claro(k - 4, k) || claro(k + 7, k + 11)) p += 40;
        }
      };
      for (let y = 0; y < n; y++) linha((x) => m[y][x]);
      for (let x = 0; x < n; x++) linha((y) => m[y][x]);
      let escuros = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (m[y][x]) escuros++;
        if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      }
      p += (Math.ceil(Math.abs(escuros * 20 - n * n * 10) / (n * n)) - 1) * 10;
      return p;
    }
    let melhor = 0, menor = Infinity;
    for (let k = 0; k < 8; k++) {
      mascarar(k);
      formato(k);
      const p = penalidade();
      if (p < menor) { menor = p; melhor = k; }
      mascarar(k);   // desfaz (a máscara é um "ou exclusivo")
    }
    mascarar(melhor);
    formato(melhor);
    return m;
  }

  return { matriz };
})();

// SVG nítido em qualquer tamanho. Sempre escuro sobre branco (o leitor precisa do contraste), também no modo escuro.
function qrSvg(texto, { margem = 4, rotulo = 'QR Code' } = {}) {
  const m = QR.matriz(texto);
  const n = m.length + margem * 2;
  let caminho = '';
  m.forEach((linha, y) => linha.forEach((escuro, x) => { if (escuro) caminho += `M${x + margem} ${y + margem}h1v1h-1z`; }));
  return `<svg class="qr" viewBox="0 0 ${n} ${n}" role="img" aria-label="${esc(rotulo)}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${caminho}" fill="#000"/></svg>`;
}

// PNG para baixar e imprimir (cada módulo com o mesmo nº de pixels, sem borrar)
function qrPng(texto, tamanho = 1024, margem = 4) {
  const m = QR.matriz(texto);
  const escala = Math.max(1, Math.floor(tamanho / (m.length + margem * 2)));
  const lado = (m.length + margem * 2) * escala;
  const canvas = Object.assign(document.createElement('canvas'), { width: lado, height: lado });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lado, lado);
  ctx.fillStyle = '#000';
  m.forEach((linha, y) => linha.forEach((escuro, x) => { if (escuro) ctx.fillRect((x + margem) * escala, (y + margem) * escala, escala, escala); }));
  return canvas.toDataURL('image/png');
}

function baixarQr(texto, arquivo) {
  const a = Object.assign(document.createElement('a'), { href: qrPng(texto), download: arquivo });
  document.body.append(a);
  a.click();
  a.remove();
}

// Pop-up "Links": escolhe a unidade (quando há mais de uma) e mostra o link com "Copiar link",
// o QR Code e "Baixar imagem". itens: [{ nome, link, arquivo, abrir? }]. Montado no primeiro uso.
function abrirLinks({ titulo, sub = '', itens, inicial = 0 }) {
  let dlg = document.querySelector('[data-qr-janela]');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'confirmar qr-janela';
    dlg.dataset.qrJanela = '';
    dlg.setAttribute('aria-labelledby', 'qr-titulo');
    dlg.innerHTML = `
      <div class="qr-janela__topo">
        <div><h2 id="qr-titulo" data-qr="titulo"></h2><p data-qr="sub"></p></div>
        <button class="botao-icone" type="button" aria-label="Fechar" data-qr-fechar>${icone('fechar')}</button>
      </div>
      <div class="qr-janela__unidades" role="group" aria-label="Unidade" data-qr="unidades"></div>
      <div class="qr-janela__codigo" data-qr="codigo"></div>
      <div class="qr-janela__copiar">
        <label class="visualmente-oculto" for="qr-link">Link</label>
        <input id="qr-link" type="text" readonly data-qr="link">
        <button class="btn btn--primario" type="button" data-qr-copiar>${icone('link')}Copiar link</button>
      </div>
      <p class="qr-janela__dica">Teste o QR Code com a câmera do celular antes de imprimir. Para mesas e balcão, imprima com pelo menos 3 cm de lado.</p>
      <div class="confirmar__acoes">
        <a class="btn btn--fantasma" data-qr-abrir target="_blank" rel="noopener" hidden>Abrir a pesquisa<span class="visualmente-oculto"> (nova aba)</span></a>
        <button class="btn btn--secundario" type="button" data-qr-baixar>Baixar QR Code (PNG)</button>
      </div>`;
    document.body.append(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-qr-fechar]')) dlg.close();
      const unidade = e.target.closest('[data-qr-unidade]');
      if (unidade) dlg._mostrar(Number(unidade.dataset.qrUnidade));
    });
    dlg.addEventListener('close', () => dlg._volta?.focus());
  }
  const q = (nome) => dlg.querySelector(`[data-qr="${nome}"]`);
  q('titulo').textContent = titulo;
  q('sub').textContent = sub;
  const grupo = q('unidades');
  grupo.hidden = itens.length < 2;
  grupo.innerHTML = itens.map((it, i) => `<button type="button" class="qr-janela__unidade" data-qr-unidade="${i}" aria-pressed="false">${icone('loja')}${esc(it.nome)}</button>`).join('');
  dlg._mostrar = (i) => {
    const it = itens[i];
    grupo.querySelectorAll('[data-qr-unidade]').forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    q('codigo').innerHTML = qrSvg(it.link, { rotulo: `QR Code de ${it.nome}` });
    q('link').value = it.link;
    const abrir = dlg.querySelector('[data-qr-abrir]');   // protótipo: abre a página da pesquisa deste projeto
    abrir.hidden = !it.abrir;
    if (it.abrir) abrir.href = it.abrir;
    dlg.querySelector('[data-qr-baixar]').onclick = () => { baixarQr(it.link, it.arquivo); avisar(`QR Code de ${it.nome} baixado`); };
    dlg.querySelector('[data-qr-copiar]').onclick = async () => {
      try { await navigator.clipboard.writeText(it.link); avisar(`Link de ${it.nome} copiado`); }
      catch { q('link').select(); avisar('Selecione e copie o link (Ctrl+C)'); }
    };
  };
  dlg._mostrar(inicial);
  dlg._volta = document.activeElement;
  dlg.showModal();
  (itens.length > 1 ? grupo.querySelector('[aria-pressed="true"]') : dlg.querySelector('[data-qr-copiar]')).focus();
}
