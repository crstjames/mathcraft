// All art is generated in code: block textures, item icons and characters.
window.BQ = window.BQ || {};

BQ.T = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COAL_ORE: 4, IRON_ORE: 5, LOG: 6, LEAVES: 7,
  PLANKS: 8, BEDROCK: 9, OBSIDIAN: 10, COBBLE: 11, IRON_BARS: 12, CRAFTING_TABLE: 13,
  PORTAL: 14, GOLD_ORE: 15, DIAMOND_ORE: 16, TALL_GRASS: 17, FLOWER_RED: 18,
  FLOWER_YELLOW: 19, TORCH: 20, LAVA: 21, FURNACE: 22, BOOKSHELF: 23,
};

// Blocks the player collides with (foreground layer only).
BQ.SOLID = new Set([
  BQ.T.GRASS, BQ.T.DIRT, BQ.T.STONE, BQ.T.COAL_ORE, BQ.T.IRON_ORE, BQ.T.PLANKS,
  BQ.T.BEDROCK, BQ.T.OBSIDIAN, BQ.T.COBBLE, BQ.T.IRON_BARS, BQ.T.GOLD_ORE, BQ.T.DIAMOND_ORE,
]);

// Blocks that send the player back to the checkpoint when touched.
BQ.HAZARD = new Set([BQ.T.LAVA]);

// Background blocks drawn darker so caves read as "behind" the player.
BQ.BG_DARK = new Set([BQ.T.STONE, BQ.T.DIRT, BQ.T.COBBLE, BQ.T.COAL_ORE, BQ.T.IRON_ORE, BQ.T.PLANKS]);

BQ.Art = (() => {
  const T = BQ.T;

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function px(g, x, y, col) {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  }

  function noise(g, r, cols, x0 = 0, y0 = 0, w = 16, h = 16) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) px(g, x, y, cols[Math.floor(r() * cols.length)]);
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c + amt)));
    const r = f(n >> 16), gg = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
  }

  // ---------- Block textures (16x16) ----------
  const STONE = ['#7d7d7d', '#8a8a8a', '#737373', '#828282', '#6e6e6e'];
  const DIRT = ['#866043', '#79553a', '#96704d', '#6b4a30'];
  const PLANK = ['#b8945f', '#ae8a56', '#c29d67'];

  // `perSpot` controls how chunky the ore clusters are (bigger = easier to spot and count).
  function oreTex(seed, cols, perSpot = 4) {
    const c = canvas(16, 16), g = c.getContext('2d'), r = rng(seed);
    noise(g, r, STONE);
    const spots = [[3, 3], [10, 2], [6, 8], [12, 10], [2, 12], [9, 13]];
    spots.forEach(([sx, sy]) => {
      for (let i = 0; i < perSpot; i++) {
        const x = sx + Math.floor(r() * 3), y = sy + Math.floor(r() * 2);
        px(g, x, y, cols[Math.floor(r() * cols.length)]);
      }
    });
    return c;
  }

  const makers = {
    [T.DIRT]: () => { const c = canvas(16, 16), g = c.getContext('2d'); noise(g, rng(2), DIRT); return c; },
    [T.GRASS]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(1);
      noise(g, r, DIRT);
      const GR = ['#5d9b3b', '#6aab44', '#4f8a31', '#78b84f'];
      for (let x = 0; x < 16; x++) {
        const h = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.25 ? 1 : 0);
        for (let y = 0; y < h; y++) px(g, x, y, GR[Math.floor(r() * GR.length)]);
      }
      return c;
    },
    [T.STONE]: () => { const c = canvas(16, 16), g = c.getContext('2d'); noise(g, rng(3), STONE); return c; },
    [T.COAL_ORE]: () => oreTex(4, ['#2b2b2b', '#1c1c1c', '#3a3a3a']),
    [T.IRON_ORE]: () => oreTex(5, ['#d8af93', '#c5957a', '#e3c0a6']),
    [T.GOLD_ORE]: () => oreTex(6, ['#fcee4b', '#e8c42a', '#fff58f']),
    [T.DIAMOND_ORE]: () => oreTex(7, ['#5decf5', '#3cc7d0', '#a1fbe8', '#1f9aa3', '#5decf5'], 9),
    [T.LOG]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(8);
      for (let x = 0; x < 16; x++)
        for (let y = 0; y < 16; y++) {
          const dark = x % 4 === 0 || (x % 4 === 2 && r() < 0.3);
          px(g, x, y, dark ? '#4d3920' : (r() < 0.5 ? '#6b5132' : '#7a5c39'));
        }
      return c;
    },
    [T.LEAVES]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(9);
      noise(g, r, ['#3f7d25', '#4a8f2c', '#356b1f', '#2a5518', '#57a035']);
      return c;
    },
    [T.PLANKS]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(10);
      noise(g, r, PLANK);
      g.fillStyle = '#7a5f3a';
      [3, 7, 11, 15].forEach(y => g.fillRect(0, y, 16, 1));
      [[4, 0], [12, 4], [2, 8], [9, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 3));
      return c;
    },
    [T.BEDROCK]: () => { const c = canvas(16, 16), g = c.getContext('2d'); noise(g, rng(11), ['#555', '#333', '#222', '#777', '#444']); return c; },
    [T.OBSIDIAN]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(12);
      noise(g, r, ['#140f1f', '#1e1530', '#2b1f45', '#0b0812', '#1a1228']);
      for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), '#4a3478');
      return c;
    },
    [T.COBBLE]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(13);
      noise(g, r, ['#7a7a7a', '#9a9a9a', '#8a8a8a']);
      g.fillStyle = '#555';
      [[0, 4, 7, 1], [7, 0, 1, 5], [8, 6, 8, 1], [4, 10, 1, 6], [0, 11, 8, 1], [11, 7, 1, 9], [12, 12, 4, 1]]
        .forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      return c;
    },
    [T.IRON_BARS]: () => {
      const c = canvas(16, 16), g = c.getContext('2d');
      g.fillStyle = 'rgba(40,40,40,0.35)';
      g.fillRect(0, 0, 16, 16);
      [1, 5, 9, 13].forEach(x => {
        g.fillStyle = '#5a5a5a'; g.fillRect(x, 0, 2, 16);
        g.fillStyle = '#c9c9c9'; g.fillRect(x, 0, 1, 16);
      });
      g.fillStyle = '#8a8a8a';
      g.fillRect(0, 2, 16, 2);
      g.fillRect(0, 12, 16, 2);
      g.fillStyle = '#d8d8d8';
      g.fillRect(0, 2, 16, 1);
      g.fillRect(0, 12, 16, 1);
      return c;
    },
    [T.CRAFTING_TABLE]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(14);
      noise(g, r, PLANK);
      g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, 16, 4);
      g.fillStyle = '#a0703c';
      for (let x = 1; x < 16; x += 3) g.fillRect(x, 1, 2, 2);
      g.fillStyle = '#4d3920'; g.fillRect(0, 4, 16, 1); g.fillRect(0, 15, 16, 1);
      g.fillRect(0, 4, 1, 12); g.fillRect(15, 4, 1, 12);
      // saw
      g.fillStyle = '#b0b0b0'; g.fillRect(3, 7, 4, 2);
      g.fillStyle = '#6b5132'; g.fillRect(7, 7, 2, 2);
      // hammer
      g.fillStyle = '#9a9a9a'; g.fillRect(10, 7, 4, 2);
      g.fillStyle = '#6b5132'; g.fillRect(11, 9, 2, 5);
      return c;
    },
    [T.TALL_GRASS]: () => {
      const c = canvas(16, 16), g = c.getContext('2d');
      g.fillStyle = '#5d9b3b';
      [[2, 9, 1, 7], [4, 6, 1, 10], [7, 10, 1, 6], [9, 5, 1, 11], [12, 8, 1, 8], [14, 11, 1, 5]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      g.fillStyle = '#78b84f';
      [[3, 11, 1, 5], [8, 8, 1, 8], [11, 10, 1, 6]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      return c;
    },
    [T.FLOWER_RED]: () => flowerTex('#e02020', '#ff6060'),
    [T.FLOWER_YELLOW]: () => flowerTex('#f2d21b', '#fff27a'),
    [T.LAVA]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(15);
      noise(g, r, ['#d45a12', '#e8751a', '#f29a1f', '#c9460e']);
      for (let i = 0; i < 10; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), '#ffd24a');
      return c;
    },
    [T.FURNACE]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(16);
      noise(g, r, ['#7a7a7a', '#8a8a8a', '#6e6e6e']);
      g.fillStyle = '#4a4a4a'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
      g.fillStyle = '#222'; g.fillRect(4, 8, 8, 5);
      g.fillStyle = '#ff8a1f'; g.fillRect(5, 10, 6, 3);
      g.fillStyle = '#ffd23f'; g.fillRect(6, 11, 2, 2); g.fillRect(9, 10, 1, 2);
      g.fillStyle = '#5a5a5a'; g.fillRect(3, 3, 10, 2);
      return c;
    },
    [T.BOOKSHELF]: () => {
      const c = canvas(16, 16), g = c.getContext('2d'), r = rng(17);
      noise(g, r, PLANK);
      const books = ['#a02020', '#2f5fa8', '#3f8f3a', '#8e44ad', '#c9a227', '#6b3a1e'];
      [[1, 7], [9, 15]].forEach(([y0, y1]) => {
        g.fillStyle = '#4a3420'; g.fillRect(1, y0, 14, y1 - y0 - 1);
        for (let x = 2; x < 14; x += 2) {
          g.fillStyle = books[Math.floor(r() * books.length)];
          g.fillRect(x, y0 + (r() < 0.3 ? 1 : 0), 2, y1 - y0 - 1 - (r() < 0.3 ? 1 : 0));
        }
      });
      return c;
    },
    [T.TORCH]: () => {
      const c = canvas(16, 16), g = c.getContext('2d');
      g.fillStyle = '#6b5132'; g.fillRect(7, 7, 2, 9);
      g.fillStyle = '#ff8a1f'; g.fillRect(7, 5, 2, 2);
      g.fillStyle = '#ffd23f'; g.fillRect(7, 4, 2, 1); g.fillRect(8, 5, 1, 1);
      return c;
    },
  };

  function flowerTex(petal, hi) {
    const c = canvas(16, 16), g = c.getContext('2d');
    g.fillStyle = '#3f7d25'; g.fillRect(7, 9, 2, 7); g.fillRect(5, 12, 2, 1); g.fillRect(9, 11, 2, 1);
    g.fillStyle = petal; g.fillRect(6, 5, 4, 4);
    g.fillStyle = hi; g.fillRect(7, 4, 2, 1); g.fillRect(5, 6, 1, 2); g.fillRect(10, 6, 1, 2); g.fillRect(7, 9, 2, 1);
    g.fillStyle = '#f7e36b'; g.fillRect(7, 6, 2, 2);
    return c;
  }

  const tileCache = {};
  function tile(id) {
    if (!tileCache[id] && makers[id]) tileCache[id] = makers[id]();
    return tileCache[id];
  }

  // Portal is animated, so it has several frames.
  const portalFrames = [];
  function portalFrame(t) {
    if (!portalFrames.length) {
      for (let f = 0; f < 8; f++) {
        const c = canvas(16, 16), g = c.getContext('2d');
        for (let y = 0; y < 16; y++)
          for (let x = 0; x < 16; x++) {
            const v = Math.sin((x + f * 2) * 0.7 + Math.cos((y - f) * 0.5) * 2) + Math.sin((y + x) * 0.3 - f);
            const cols = ['#5010b0', '#6a1fd0', '#8b3cf0', '#b070ff'];
            px(g, x, y, cols[Math.max(0, Math.min(3, Math.floor((v + 2) / 4 * 4)))]);
          }
        portalFrames.push(c);
      }
    }
    return portalFrames[Math.floor(t * 8) % 8];
  }

  // ---------- Item icons (8x8 pixel grids) ----------
  const ITEMS = {
    emerald: {
      pal: { k: '#084a1f', g: '#0f7a33', G: '#17dd62', L: '#8ff5b3' },
      rows: ['...kk...', '..kGGk..', '.kGLGGk.', 'kGLGGGgk', 'kGGGGggk', '.kGGggk.', '..kggk..', '...kk...'],
    },
    log: {
      pal: { B: '#4d3920', b: '#6b5132', y: '#bf9a5c', Y: '#a1804a' },
      rows: ['.BBBBBB.', 'BbbbbbbB', 'BbyyyybB', 'BbyYYybB', 'BbyYYybB', 'BbyyyybB', 'BbbbbbbB', '.BBBBBB.'],
    },
    planks: {
      pal: { p: '#c4a06a', P: '#9c7a48', d: '#6e5230' },
      rows: ['pppppppp', 'pppPpppp', 'dddddddd', 'pppppPpp', 'pPpppppp', 'dddddddd', 'pppPpppp', 'pppppppp'],
    },
    bread: {
      pal: { O: '#8a5214', o: '#c8872e', y: '#e8b060' },
      rows: ['........', '..OOOO..', '.OyoyoO.', 'OoyoyooO', 'OooooooO', '.OooooO.', '..OOOO..', '........'],
    },
    carrot: {
      pal: { o: '#f08a1c', O: '#c0600c', g: '#3fa02a' },
      rows: ['......gg', '.....gg.', '....oOg.', '...ooO..', '..ooO...', '.ooO....', '.oO.....', 'o.......'],
    },
    coal: {
      pal: { k: '#1a1a1a', K: '#383838', w: '#5a5a5a' },
      rows: ['..kkk...', '.kKKkk..', 'kKwKKkk.', 'kKKKkKk.', 'kkKKKKkk', '.kkKkkk.', '..kkkk..', '........'],
    },
    iron: {
      pal: { w: '#ffffff', s: '#d8d8d8', S: '#a8a8a8', d: '#707070' },
      rows: ['........', '........', '..wwwww.', '.wsssssd', 'wsssssSd', 'dSSSSSdd', 'dddddd..', '........'],
    },
    gold: {
      pal: { w: '#fffbd0', s: '#fce94f', S: '#e0b820', d: '#9a7a10' },
      rows: ['........', '........', '..wwwww.', '.wsssssd', 'wsssssSd', 'dSSSSSdd', 'dddddd..', '........'],
    },
    diamond: {
      pal: { k: '#155e63', C: '#2aa8b0', c: '#5decf5', w: '#ffffff' },
      rows: ['..kkkk..', '.kcwcck.', 'kcwcccCk', 'kccccCCk', '.kccCCk.', '..kcCk..', '...kk...', '........'],
    },
    stick: {
      pal: { b: '#8b6a3e', B: '#5c4424' },
      rows: ['......bB', '.....bB.', '....bB..', '...bB...', '..bB....', '.bB.....', 'bB......', '........'],
    },
    torch: {
      pal: { y: '#ffd23f', o: '#ff8a1f', b: '#8b6a3e', B: '#5c4424' },
      rows: ['...yy...', '..yoy...', '...oy...', '...bB...', '...bB...', '...bB...', '...bB...', '...bB...'],
    },
    arrow: {
      pal: { s: '#bdbdbd', b: '#8b6a3e', w: '#f0f0f0' },
      rows: ['.....sss', '......ss', '.....b.s', '....b...', '...b....', 'wwb.....', '.w......', 'w.w.....'],
    },
    wool: {
      pal: { w: '#f0f0f0', W: '#d0d0d0' },
      rows: ['wWwwWwww', 'wwwWwwWw', 'Wwwwwwww', 'wwWwwWww', 'wwwwwwWw', 'wWwwWwww', 'wwwwwwwW', 'WwwWwwww'],
    },
    gunpowder: {
      pal: { k: '#4a4a4a', K: '#6a6a6a', w: '#9a9a9a' },
      rows: ['........', '...kw...', '..kKKk..', '.kKwKKk.', '.KKKKwk.', 'kKwKKKKk', '.kkkkkk.', '........'],
    },
    obsidian: {
      pal: { a: '#140f1f', b: '#2b1f45', c: '#4a3478' },
      rows: ['abaaabaa', 'aacabaab', 'baaaaaca', 'aabacaaa', 'acaaaaba', 'aaabaaca', 'baacaaaa', 'aaaaabaa'],
    },
    heart: {
      pal: { k: '#300000', r: '#e02020', R: '#a00000', w: '#ffb0b0' },
      rows: ['.kk.kk..', 'krwkrrk.', 'krrrrRk.', 'krrrRRk.', '.krRRk..', '..kRk...', '...k....', '........'],
    },
    heartEmpty: {
      pal: { k: '#300000', r: '#3a3a3a' },
      rows: ['.kk.kk..', 'krrkrrk.', 'krrrrrk.', 'krrrrrk.', '.krrrk..', '..krk...', '...k....', '........'],
    },
    zombie: {
      pal: { g: '#3f8f3a', G: '#2d6b28', k: '#111', c: '#2f6ea0' },
      rows: ['.gggggg.', 'gGggggGg', 'gkkggkkg', 'gggggggg', 'ggGkkGgg', '.gggggg.', '.cccccc.', '.cc..cc.'],
    },
    skeleton: {
      pal: { w: '#d8d8d8', W: '#a8a8a8', k: '#222' },
      rows: ['.wwwwww.', 'wWwwwwWw', 'wkkwwkkw', 'wwwwwwww', 'wkWkWkWw', '.wwwwww.', '..w..w..', '.w....w.'],
    },
    creeper: {
      pal: { g: '#4fb84a', G: '#2d7a28', l: '#8fdc7a', k: '#111' },
      rows: ['glgGglgg', 'gkkggkkG', 'gkkGgkkg', 'lggkkggl', 'ggkkkkgg', 'gGkkkkGg', 'ggkggkgl', 'GggglggG'],
    },
    villager: {
      pal: { s: '#b98a6e', S: '#9a6e55', b: '#3b2a1c', e: '#2f9b4a', w: '#fff' },
      rows: ['.bbbbbb.', 'ssssssss', 'swessews', 'ssssssss', 'sssSSsss', 'sssSSsss', '.ssSSss.', '...SS...'],
    },
    portal: {
      pal: { o: '#140f1f', p: '#8b3cf0', P: '#5010b0', l: '#b070ff' },
      rows: ['oooooooo', 'opPlpPpo', 'oPlpPlpo', 'olpPlpPo', 'opPlpPlo', 'oPlpPlpo', 'olpPlpPo', 'oooooooo'],
    },
    craftingTable: {
      pal: { t: '#6b4a2b', h: '#a0703c', p: '#c4a06a', s: '#b0b0b0', d: '#4d3920' },
      rows: ['tthtthtt', 'hthhthht', 'dddddddd', 'dppppppd', 'dpssppsd', 'dppdpppd', 'dppdpppd', 'dddddddd'],
    },
    book: {
      pal: { b: '#6b3a1e', B: '#4a2610', p: '#f3e6c4', P: '#d8c69a', r: '#b02020' },
      rows: ['.bbbbbb.', 'bBppppPb', 'bBppppPb', 'bBpPPpPb', 'bBppppPb', 'bBpPPpPb', 'bBppppPb', '.bbbbbr.'],
    },
    quill: {
      pal: { w: '#f5f5f5', W: '#c8c8c8', k: '#222', b: '#6b3a1e' },
      rows: ['......ww', '.....wWw', '....wWw.', '...wWw..', '..wWw...', '..bw....', '.b......', 'k.......'],
    },
    stone: {
      pal: { a: '#7d7d7d', b: '#8f8f8f', c: '#6a6a6a' },
      rows: ['abacabaa', 'babaacab', 'acabbaba', 'abaacaab', 'bacabaca', 'aabacaba', 'cabaabac', 'abcabaab'],
    },
    rottenFlesh: {
      pal: { r: '#a0503a', R: '#7a3524', g: '#6a8a3a', k: '#4a2a1a' },
      rows: ['........', '..rRr...', '.rrgrR..', 'rRrrrgr.', 'rrgRrrRr', '.rrrRrr.', '..kRrr..', '........'],
    },
    bone: {
      pal: { w: '#f0eee0', W: '#c8c4b0' },
      rows: ['ww......', 'wWw.....', '.wWw....', '..wWw...', '...wWw..', '....wWw.', '.....wWw', '......ww'],
    },
    furnace: {
      pal: { a: '#7a7a7a', b: '#5a5a5a', k: '#222', o: '#ff8a1f', y: '#ffd23f' },
      rows: ['bbbbbbbb', 'baaaaaab', 'babbbbab', 'baaaaaab', 'bakkkkab', 'bakoyoab', 'baooooab', 'bbbbbbbb'],
    },
    shield: {
      pal: { w: '#b8945f', W: '#8a6a3e', i: '#c9c9c9', k: '#555' },
      rows: ['kkkkkkkk', 'kiwwwwik', 'kwwiiwwk', 'kwwiiwwk', 'kwwwwwwk', '.kwwwwk.', '..kWWk..', '...kk...'],
    },
    clock: {
      pal: { y: '#f2d21b', Y: '#b08a10', k: '#333', w: '#fff7c0' },
      rows: ['..YYYY..', '.YwwwwY.', 'YwwkwwwY', 'YwwkwwwY', 'YwwkkkwY', 'YwwwwwwY', '.YwwwwY.', '..YYYY..'],
    },
    bookshelf: {
      pal: { p: '#b8945f', d: '#4a3420', r: '#a02020', b: '#2f5fa8', g: '#3f8f3a' },
      rows: ['pppppppp', 'pdrdbdgp', 'prdbdgdp', 'pppppppp', 'pdgdrdbp', 'pgdrdbdp', 'pppppppp', 'pppppppp'],
    },
    librarian: {
      pal: { s: '#b98a6e', S: '#9a6e55', h: '#a02020', e: '#2f9b4a', w: '#fff' },
      rows: ['.hhhhhh.', 'hhhhhhhh', 'swessews', 'ssssssss', 'sssSSsss', 'sssSSsss', '.ssSSss.', '...SS...'],
    },
    blacksmith: {
      pal: { s: '#b98a6e', S: '#9a6e55', b: '#3b2a1c', e: '#2f9b4a', w: '#fff', k: '#111' },
      rows: ['.bbbbbb.', 'ssssssss', 'swekkkks', 'sssskkss', 'sssSSsss', 'sssSSsss', '.ssSSss.', '...SS...'],
    },
    star: {
      pal: { y: '#ffdd55', Y: '#c9a200' },
      rows: ['...y....', '...yy...', 'yyyyyyy.', '.yyyyY..', '..yyYY..', '.yyYyYY.', '.yY..YY.', '........'],
    },
  };

  const iconCache = {};
  function iconCanvas(name) {
    const def = ITEMS[name];
    const c = canvas(8, 8), g = c.getContext('2d');
    if (!def) return c;
    def.rows.forEach((row, y) => {
      for (let x = 0; x < 8; x++) {
        const col = def.pal[row[x]];
        if (col) px(g, x, y, col);
      }
    });
    return c;
  }
  function icon(name) {
    if (!iconCache[name]) iconCache[name] = iconCanvas(name).toDataURL();
    return iconCache[name];
  }

  // Upscaled block texture as a data URL (for CSS backgrounds and <img>).
  const tileURLCache = {};
  function tileDataURL(id, scale = 4) {
    const key = id + 'x' + scale;
    if (tileURLCache[key]) return tileURLCache[key];
    const src = tile(id);
    const c = canvas(16 * scale, 16 * scale), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return (tileURLCache[key] = c.toDataURL());
  }

  // ---------- Characters ----------
  // Sprites are 16 art-pixels wide and 32 tall; (x, y) is the top-left in canvas pixels, s is px per art-pixel.

  function limb(g, pivotX, pivotY, angle, draw) {
    g.save();
    g.translate(pivotX, pivotY);
    g.rotate(angle);
    draw();
    g.restore();
  }

  function rect(g, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  }

  function drawPlayer(g, x, y, s, look, opts = {}) {
    const facing = opts.facing || 1;
    const swing = Math.sin(opts.walk || 0) * (opts.moving ? 0.6 : 0);
    const armBack = opts.armAngle !== undefined ? opts.armAngle : swing;
    const armFront = opts.armAngle !== undefined ? opts.armAngle : -swing;
    const skin = look.skin, hair = look.hair, shirt = look.shirt, pants = look.pants;
    const shoe = '#3a3a3a';
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    // back arm & leg (drawn first, darker)
    limb(g, 14, 9, armBack, () => { rect(g, -2, -1, 4, 4, shade(shirt, -35)); rect(g, -2, 3, 4, 8, shade(skin, -35)); });
    limb(g, 10, 20, -swing, () => { rect(g, -2, 0, 4, 10, shade(pants, -35)); rect(g, -2, 10, 4, 2, shade(shoe, -20)); });

    // body
    rect(g, 4, 8, 8, 12, shirt);
    rect(g, 4, 8, 8, 1, shade(shirt, 25));
    rect(g, 10, 9, 2, 11, shade(shirt, -20));
    rect(g, 4, 19, 8, 1, shade(shirt, -30));

    // front leg
    limb(g, 6, 20, swing, () => { rect(g, -2, 0, 4, 10, pants); rect(g, 1, 0, 1, 10, shade(pants, -20)); rect(g, -2, 10, 4, 2, shoe); });

    // head
    rect(g, 4, 0, 8, 8, skin);
    const eyeRow = 4;
    const whites = facing > 0 ? [5, 9] : [6, 10];
    const pupils = facing > 0 ? [6, 10] : [5, 9];
    whites.forEach(ex => rect(g, ex, eyeRow, 1, 1, '#ffffff'));
    pupils.forEach(ex => rect(g, ex, eyeRow, 1, 1, look.eyes || '#3b5bdb'));
    rect(g, 7, 5, 2, 1, shade(skin, -25));
    rect(g, 6, 6, 4, 1, shade(skin, -55));

    // hair
    const style = look.hairStyle || 'short';
    if (style !== 'none') {
      rect(g, 4, 0, 8, 2, hair);
      rect(g, 4, 2, 1, 1, hair);
      rect(g, 11, 2, 1, 1, hair);
      if (style === 'long') {
        rect(g, 4, 2, 1, 8, hair);
        rect(g, 11, 2, 1, 8, hair);
        rect(g, 3, 1, 1, 9, shade(hair, -20));
        rect(g, 12, 1, 1, 9, shade(hair, -20));
      } else if (style === 'spiky') {
        for (let i = 0; i < 4; i++) rect(g, 4 + i * 2, -1, 1, 1, hair);
        rect(g, 5, 2, 1, 1, hair);
        rect(g, 10, 2, 1, 1, hair);
      } else if (style === 'cap') {
        rect(g, 4, -1, 8, 3, look.pants);
        rect(g, facing > 0 ? 10 : 2, 1, 4, 1, shade(look.pants, -25));
      }
    }

    // front arm
    limb(g, 2, 9, armFront, () => { rect(g, -2, -1, 4, 4, shade(shirt, 10)); rect(g, -2, 3, 4, 8, skin); rect(g, -2, 10, 4, 1, shade(skin, -20)); });

    g.restore();
  }

  // style: { robe, robeD, hat, apron, eyepatch } for different villager jobs.
  function drawVillager(g, x, y, s, t = 0, style = {}) {
    const robe = style.robe || '#6b4a2b', robeD = style.robeD || '#523720', skin = '#b98a6e', skinD = '#9a6e55';
    const bob = Math.round(Math.sin(t * 2) * 0.5);
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    rect(g, 3, 10, 10, 22, robe);
    rect(g, 11, 10, 2, 22, robeD);
    rect(g, 3, 24, 10, 1, '#3b2a1c');
    rect(g, 3, 30, 10, 2, '#2f2016');
    // head
    rect(g, 4, bob, 8, 10, skin);
    rect(g, 4, bob, 8, 2, '#3b2a1c');
    rect(g, 5, 3 + bob, 6, 1, '#3b2a1c');
    rect(g, 5, 4 + bob, 1, 1, '#fff'); rect(g, 6, 4 + bob, 1, 1, '#2f9b4a');
    rect(g, 9, 4 + bob, 1, 1, '#2f9b4a'); rect(g, 10, 4 + bob, 1, 1, '#fff');
    rect(g, 7, 5 + bob, 2, 5, skinD);
    if (style.apron) {
      rect(g, 4, 18, 8, 12, style.apron);
      rect(g, 4, 18, 8, 1, shade(style.apron, 30));
    }
    if (style.hat) {
      rect(g, 3, bob - 1, 10, 3, style.hat);
      rect(g, 5, bob - 3, 6, 2, style.hat);
    }
    if (style.eyepatch) {
      rect(g, 8, 3 + bob, 3, 2, '#111');
      rect(g, 4, 3 + bob, 8, 1, '#111');
    }
    // crossed arms
    rect(g, 2, 14, 12, 4, robeD);
    rect(g, 5, 15, 6, 2, skin);
    g.restore();
  }

  const ZOMBIE_LOOK = { skin: '#5a9a4a', hair: '#3a6a2e', hairStyle: 'none', shirt: '#2f8fb0', pants: '#4a3f9b', eyes: '#111' };
  function drawZombie(g, x, y, s, t = 0) {
    drawPlayer(g, x, y, s, ZOMBIE_LOOK, { facing: -1, walk: t * 3, moving: true, armAngle: Math.PI / 2 - 0.1 + Math.sin(t * 3) * 0.08 });
  }

  function drawSkeleton(g, x, y, s, t = 0) {
    const bone = '#d8d8d8', dark = '#9a9a9a', k = '#222';
    const sway = Math.sin(t * 2) * 0.1;
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    // back leg and arm
    limb(g, 9, 20, -sway, () => rect(g, -1, 0, 2, 12, dark));
    limb(g, 12, 9, 0.2, () => rect(g, -1, 0, 2, 11, dark));
    // spine and ribs
    rect(g, 7, 8, 2, 12, bone);
    [10, 13, 16].forEach(ry => rect(g, 4, ry, 8, 1, bone));
    rect(g, 4, 19, 8, 1, dark);
    limb(g, 6, 20, sway, () => rect(g, -1, 0, 2, 12, bone));
    // skull
    rect(g, 4, 0, 8, 8, bone);
    rect(g, 4, 7, 8, 1, dark);
    rect(g, 5, 3, 2, 2, k); rect(g, 9, 3, 2, 2, k);
    rect(g, 7, 5, 2, 1, dark);
    rect(g, 5, 6, 6, 1, k);
    // arm aiming a bow to the left
    // (kept inside the sprite's 2px margin so nothing is clipped)
    limb(g, 4, 9, Math.PI / 2 - 0.1, () => rect(g, -1, 0, 2, 5, bone));
    rect(g, -2, 4, 1, 12, '#6b4a2b');
    rect(g, -1, 3, 1, 2, '#6b4a2b'); rect(g, -1, 15, 1, 2, '#6b4a2b');
    rect(g, 0, 5, 1, 10, '#ddd');
    g.restore();
  }

  const creeperPixels = (() => {
    const r = rng(42), cols = ['#4fb84a', '#3f9b3a', '#6fcf5f', '#2d7a28', '#8fdc7a'];
    const grid = [];
    for (let i = 0; i < 16 * 32; i++) grid.push(cols[Math.floor(r() * cols.length)]);
    return grid;
  })();

  function drawCreeper(g, x, y, s, opts = {}) {
    const face = '#111';
    g.save();
    g.translate(x, y);
    const swell = opts.swell || 0;
    if (swell) {
      g.translate(8 * s, 32 * s);
      g.scale(1 + swell * 0.12, 1 + swell * 0.08);
      g.translate(-8 * s, -32 * s);
    }
    g.scale(s, s);
    const shape = (px2, py) =>
      (px2 >= 4 && px2 < 12 && py < 8) ||
      (px2 >= 4 && px2 < 12 && py >= 8 && py < 24) ||
      ((px2 >= 2 && px2 < 7) || (px2 >= 9 && px2 < 14)) && py >= 24;
    for (let py = 0; py < 32; py++)
      for (let px2 = 0; px2 < 16; px2++)
        if (shape(px2, py)) rect(g, px2, py, 1, 1, creeperPixels[py * 16 + px2]);
    // face
    rect(g, 5, 2, 2, 2, face); rect(g, 9, 2, 2, 2, face);
    rect(g, 7, 4, 2, 3, face); rect(g, 6, 5, 1, 3, face); rect(g, 9, 5, 1, 3, face);
    if (opts.flash) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(2, 0, 12, 32);
    }
    g.restore();
  }

  // Character palettes for the creator.
  const LOOK_OPTIONS = {
    skin: ['#f5d0b0', '#e8b48f', '#c98e66', '#a8704a', '#7a4e32', '#5a3822'],
    hair: ['#2b1d12', '#5a3a1e', '#9a6a33', '#e0c068', '#c0461c', '#1b1b1b', '#e6e6e6', '#6a3fb0', '#2f8fd8'],
    hairStyle: ['short', 'long', 'spiky', 'cap', 'none'],
    shirt: ['#2fa4a4', '#3b5bdb', '#d83b3b', '#3f9b2e', '#f2a51b', '#8e44ad', '#e84393', '#f0f0f0', '#333333'],
    pants: ['#3b3b9b', '#2b2b2b', '#6b4a2b', '#5a7d2b', '#8a2b2b', '#4a6a8a', '#7a7a7a'],
  };

  function defaultLook() {
    return { skin: '#e8b48f', hair: '#9a6a33', hairStyle: 'spiky', shirt: '#f2a51b', pants: '#2b2b2b', eyes: '#2f9b4a' };
  }

  function randomLook() {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    return {
      skin: pick(LOOK_OPTIONS.skin), hair: pick(LOOK_OPTIONS.hair), hairStyle: pick(LOOK_OPTIONS.hairStyle),
      shirt: pick(LOOK_OPTIONS.shirt), pants: pick(LOOK_OPTIONS.pants),
      eyes: pick(['#3b5bdb', '#2f9b4a', '#5a3a1e', '#333']),
    };
  }

  function drawAvatar(canvasEl, look, opts = {}) {
    const g = canvasEl.getContext('2d');
    g.clearRect(0, 0, canvasEl.width, canvasEl.height);
    g.imageSmoothingEnabled = false;
    const s = Math.floor(Math.min(canvasEl.width / 18, canvasEl.height / 34));
    const x = Math.floor((canvasEl.width - 16 * s) / 2);
    const y = Math.floor((canvasEl.height - 32 * s) / 2) + s;
    drawPlayer(g, x, y, s, look, opts);
  }

  return {
    tile, portalFrame, icon, tileDataURL, shade, rng,
    drawPlayer, drawVillager, drawCreeper, drawZombie, drawSkeleton, drawAvatar,
    LOOK_OPTIONS, defaultLook, randomLook,
  };
})();
