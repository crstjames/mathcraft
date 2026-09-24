// Demo level: Ratio Ridge.
// Walk right, solve ratio problems at each station to clear the way, and step into the Nether portal.
// Route: crafting table & ravine -> farmer -> mine tunnel -> creeper -> village (librarian, blacksmith
// & lava) -> zombie horde -> diamond quarry -> skeleton sniper -> Nether portal.
window.BQ = window.BQ || {};
BQ.Levels = BQ.Levels || {};

(() => {
  const T = BQ.T;
  const W = 264, H = 26;
  const GROUND = 17;

  // Key landmark columns.
  const RAVINE = [20, 24];
  const GATE_X = 41;
  const TUNNEL = [49, 78];
  const TUNNEL_FLOOR = 18;
  const ORE_WALL = [64, 66]; // 3 wide x 4 tall = 12 ore blocks
  const LIBRARY = [102, 108]; // librarian's house
  const LIB_GATE_X = 113;
  const SMITHY = [116, 122]; // blacksmith's house
  const LAVA = [126, 130];
  const QUARRY = [166, 202]; // open-pit diamond quarry
  const QUARRY_FLOOR = 22;
  const DIAMOND_WALL = [184, 186];
  const PORTAL = { left: 246, right: 249, top: 13, bottom: 17 };

  // Quarry depth per column: steps down, a flat floor, steps back up.
  function quarrySurface(x) {
    const down = x - QUARRY[0], up = QUARRY[1] - x;
    return GROUND + 1 + Math.min(down, up, QUARRY_FLOOR - GROUND - 1);
  }

  function build() {
    const fg = new Uint8Array(W * H);
    const bg = new Uint8Array(W * H);
    const surf = new Array(W).fill(GROUND);
    const r = BQ.Art.rng(7);
    const set = (layer, x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = t; };
    const get = (layer, x, y) => (x >= 0 && x < W && y >= 0 && y < H ? layer[y * W + x] : 0);

    function surfaceAt(x) {
      if (x >= 8 && x <= 10) return GROUND - 1;
      if (x >= 29 && x <= 31) return GROUND - 1;
      if (x >= 95 && x <= 97) return GROUND - 1;
      if (x >= 140 && x <= 142) return GROUND - 1;
      if (x >= 210 && x <= 212) return GROUND - 1;
      if (x >= 232 && x <= 233) return GROUND - 1;
      return GROUND;
    }

    function fillColumn(x, top) {
      set(fg, x, top, T.GRASS);
      for (let y = top + 1; y < H - 1; y++) {
        let t = y <= top + 3 ? T.DIRT : T.STONE;
        if (t === T.STONE) {
          const roll = r();
          if (roll < 0.05) t = T.COAL_ORE;
          else if (roll < 0.075) t = T.IRON_ORE;
          else if (roll < 0.082 && y > H - 6) t = T.DIAMOND_ORE;
        }
        set(fg, x, y, t);
      }
      set(fg, x, H - 1, T.BEDROCK);
    }

    for (let x = 0; x < W; x++) {
      if (x >= RAVINE[0] && x <= RAVINE[1]) {
        surf[x] = null;
        continue;
      }
      if (x >= TUNNEL[0] && x <= TUNNEL[1]) continue;
      if (x >= LAVA[0] && x <= LAVA[1]) {
        surf[x] = null;
        set(fg, x, GROUND + 1, T.LAVA);
        set(fg, x, GROUND + 2, T.LAVA);
        for (let y = GROUND + 3; y < H - 1; y++) set(fg, x, y, T.STONE);
        set(fg, x, H - 1, T.BEDROCK);
        continue;
      }
      if (x >= QUARRY[0] && x <= QUARRY[1]) {
        // Dug-out stone: no grass, darker stone behind where the ground used to be.
        surf[x] = quarrySurface(x);
        for (let y = GROUND; y < surf[x]; y++) set(bg, x, y, T.STONE);
        fillColumn(x, surf[x]);
        set(fg, x, surf[x], T.STONE);
        for (let y = surf[x] + 1; y <= surf[x] + 3; y++) set(fg, x, y, T.STONE);
        continue;
      }
      surf[x] = surfaceAt(x);
      fillColumn(x, surf[x]);
    }

    // Ravine walls get a stone background so the pit reads as deep.
    for (let x = RAVINE[0]; x <= RAVINE[1]; x++)
      for (let y = GROUND + 2; y < H; y++) set(bg, x, y, T.STONE);

    // Mountain with a mine tunnel through it.
    for (let x = TUNNEL[0]; x <= TUNNEL[1]; x++) {
      const top = Math.round(12 - 5 * Math.sin(Math.PI * (x - TUNNEL[0] + 1) / (TUNNEL[1] - TUNNEL[0] + 2)));
      surf[x] = TUNNEL_FLOOR;
      set(fg, x, top, T.GRASS);
      for (let y = top + 1; y < H - 1; y++) {
        if (y >= 14 && y < TUNNEL_FLOOR) { set(bg, x, y, T.STONE); continue; }
        let t = y <= top + 2 ? T.DIRT : T.STONE;
        if (t === T.STONE) {
          const roll = r();
          if (roll < 0.07) t = T.COAL_ORE;
          else if (roll < 0.1) t = T.IRON_ORE;
          else if (roll < 0.11) t = T.GOLD_ORE;
        }
        set(fg, x, y, t);
      }
      set(fg, x, H - 1, T.BEDROCK);
    }
    // Mineshaft supports at the entrances.
    [TUNNEL[0], TUNNEL[1]].forEach(x => {
      for (let y = 15; y < TUNNEL_FLOOR; y++) set(bg, x, y, T.LOG);
      set(bg, x, 14, T.PLANKS);
    });
    [54, 59, 70, 75].forEach(x => set(fg, x, 15, T.TORCH));

    // Ore vein wall: a random coal : iron mix each play, so the kid counts the real blocks.
    const [coal, iron] = [[9, 3], [8, 4], [4, 8], [3, 9], [10, 2], [6, 6]][Math.floor(Math.random() * 6)];
    const cells = [...Array(coal).fill('coal'), ...Array(iron).fill('iron')];
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const wallW = ORE_WALL[1] - ORE_WALL[0] + 1;
    cells.forEach((c, i) => set(fg, ORE_WALL[0] + (i % wallW), 14 + Math.floor(i / wallW), c === 'coal' ? T.COAL_ORE : T.IRON_ORE));
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const vein = { coal, iron, a: coal / gcd(coal, iron), b: iron / gcd(coal, iron), layout: cells };

    // Village houses (background) and the village gate.
    function house(x0, x1, wall) {
      const s = GROUND;
      for (let x = x0; x <= x1; x++) {
        for (let y = s - 4; y < s; y++) set(bg, x, y, x === x0 || x === x1 ? T.LOG : wall);
        set(bg, x, s - 5, T.LOG);
        if (x > x0 && x < x1) set(bg, x, s - 6, T.PLANKS);
        if (x > x0 + 1 && x < x1 - 1) set(bg, x, s - 7, T.PLANKS);
      }
      set(bg, x0 - 1, s - 5, T.LOG);
      set(bg, x1 + 1, s - 5, T.LOG);
    }
    house(LIBRARY[0], LIBRARY[1], T.BOOKSHELF);
    house(SMITHY[0], SMITHY[1], T.COBBLE);
    set(fg, SMITHY[1] + 1, GROUND - 1, T.FURNACE);
    for (let y = GROUND - 4; y < GROUND; y++) set(fg, LIB_GATE_X, y, T.IRON_BARS);
    set(bg, LIB_GATE_X - 1, GROUND - 1, T.COBBLE);
    set(bg, LIB_GATE_X + 1, GROUND - 1, T.COBBLE);

    // Diamond wall in the quarry: a random diamond : stone mix to count.
    const [diamond, stone] = [[3, 9], [2, 10], [4, 8]][Math.floor(Math.random() * 3)];
    const dCells = [...Array(diamond).fill('diamond'), ...Array(stone).fill('stone')];
    for (let i = dCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dCells[i], dCells[j]] = [dCells[j], dCells[i]];
    }
    const dW = DIAMOND_WALL[1] - DIAMOND_WALL[0] + 1;
    dCells.forEach((c, i) => set(fg, DIAMOND_WALL[0] + (i % dW), QUARRY_FLOOR - 4 + Math.floor(i / dW), c === 'diamond' ? T.DIAMOND_ORE : T.STONE));
    const dg = gcd(diamond, stone);
    const diamondWall = { diamond, stone, a: diamond / dg, b: stone / dg, layout: dCells };
    [175, 194].forEach(x => set(fg, x, QUARRY_FLOOR - 1, T.TORCH));

    // Iron-bar gate by the villager.
    for (let y = GROUND - 4; y < GROUND; y++) set(fg, GATE_X, y, T.IRON_BARS);
    set(bg, GATE_X - 1, GROUND - 1, T.COBBLE);
    set(bg, GATE_X + 1, GROUND - 1, T.COBBLE);

    // Crafting table.
    set(fg, 14, GROUND - 1, T.CRAFTING_TABLE);

    // Nether portal frame (background) standing on an obsidian floor.
    for (let x = PORTAL.left; x <= PORTAL.right; x++) {
      set(fg, x, PORTAL.bottom, T.OBSIDIAN);
      set(bg, x, PORTAL.top, T.OBSIDIAN);
    }
    for (let y = PORTAL.top; y < PORTAL.bottom; y++) {
      set(bg, PORTAL.left, y, T.OBSIDIAN);
      set(bg, PORTAL.right, y, T.OBSIDIAN);
    }

    // Trees (background, so they never block the path).
    function tree(x) {
      const s = surf[x];
      if (s === null) return;
      for (let y = s - 4; y < s; y++) set(bg, x, y, T.LOG);
      for (let y = s - 7; y <= s - 4; y++)
        for (let dx = -2; dx <= 2; dx++) {
          const corner = Math.abs(dx) === 2 && (y === s - 7 || y === s - 4);
          if (!corner && !(dx === 0 && y >= s - 4)) set(bg, x + dx, y, T.LEAVES);
        }
    }
    [5, 17, 27, 45, 84, 99, 134, 139, 157, 163, 208, 215, 230, 238, 257].forEach(tree);

    // Grass and flowers.
    const near = (x, a, b) => x >= a - 1 && x <= b + 1;
    const busy = x => Math.abs(x - 14) < 2 || Math.abs(x - 36) < 2 || Math.abs(x - GATE_X) < 2 ||
      near(x, PORTAL.left, PORTAL.right) || near(x, TUNNEL[0], TUNNEL[1]) || near(x, LIBRARY[0], SMITHY[1] + 1) ||
      near(x, LAVA[0], LAVA[1]) || near(x, QUARRY[0], QUARRY[1]);
    for (let x = 1; x < W - 1; x++) {
      if (surf[x] === null || busy(x)) continue;
      const roll = r();
      const t = roll < 0.25 ? T.TALL_GRASS : roll < 0.31 ? T.FLOWER_RED : roll < 0.37 ? T.FLOWER_YELLOW : 0;
      if (t && !get(fg, x, surf[x] - 1)) set(fg, x, surf[x] - 1, t);
    }

    return { w: W, h: H, fg, bg, surf, vein, diamondWall };
  }

  // Apply a station's reward to the world. `fx` is the game (for particles, sounds and timers);
  // when `instant` is true the change is applied silently (used when loading a save).
  function applySolve(world, station, fx, instant) {
    const set = (x, y, t) => { world.fg[y * world.w + x] = t; };
    const setBg = (x, y, t) => { world.bg[y * world.w + x] = t; };
    const steps = [];
    const openGate = gx => steps.push(() => {
      for (let y = GROUND - 4; y < GROUND; y++) {
        set(gx, y, T.AIR);
        if (!instant) fx.burst(gx + 0.5, y + 0.5, '#c9c9c9', 6);
      }
      if (!instant) fx.sound('door');
    });
    const bridge = ([x0, x1], tile, color) => {
      for (let x = x0; x <= x1; x++)
        steps.push(() => { set(x, GROUND, tile); if (!instant) { fx.burst(x + 0.5, GROUND + 0.5, color, 8); fx.sound('place'); } });
    };
    const mineWall = ([x0, x1], bottom, colors) => {
      for (let i = 0; i < 4; i++)
        for (let x = x0; x <= x1; x++) {
          const y = bottom - i;
          steps.push(() => {
            const was = world.fg[y * world.w + x];
            set(x, y, T.AIR);
            setBg(x, y, T.STONE);
            if (!instant) { fx.burst(x + 0.5, y + 0.5, colors[was] || '#8a8a8a', 10); fx.sound('break'); }
          });
        }
    };
    const defeat = colors => steps.push(() => {
      fx.entities.filter(e => e.stationId === station.id).forEach(e => {
        if (!instant) colors.forEach(c => fx.burst(e.x + 0.5, e.feetY - 1, c, 15));
        fx.entities.splice(fx.entities.indexOf(e), 1);
      });
      if (!instant) fx.sound('pop');
    });
    switch (station.id) {
      case 'craft': bridge(RAVINE, T.PLANKS, '#c4a06a'); break;
      case 'villager': openGate(GATE_X); break;
      case 'ore': mineWall(ORE_WALL, 17, { [T.IRON_ORE]: '#d8af93', [T.COAL_ORE]: '#2b2b2b' }); break;
      case 'creeper': defeat(['#eeeeee', '#4fb84a']); break;
      case 'librarian': openGate(LIB_GATE_X); break;
      case 'blacksmith': bridge(LAVA, T.COBBLE, '#9a9a9a'); break;
      case 'zombies': defeat(['#eeeeee', '#5a9a4a']); break;
      case 'diamonds': mineWall(DIAMOND_WALL, QUARRY_FLOOR - 1, { [T.DIAMOND_ORE]: '#5decf5', [T.STONE]: '#8a8a8a' }); break;
      case 'skeleton': defeat(['#eeeeee', '#d8d8d8']); break;
      case 'portal':
        for (let y = PORTAL.bottom - 1; y > PORTAL.top; y--)
          steps.push(() => {
            for (let x = PORTAL.left + 1; x < PORTAL.right; x++) setBg(x, y, T.PORTAL);
            if (!instant) { fx.burst(PORTAL.left + 2, y + 0.5, '#b070ff', 12); fx.sound('portal'); }
          });
        break;
    }
    steps.forEach((step, i) => (instant ? step() : fx.after(0.15 * i + 0.1, step)));
  }

  BQ.Levels['ratio-ridge'] = {
    id: 'ratio-ridge',
    name: 'Ratio Ridge',
    skill: 'Ratios',
    description: 'Craft a bridge, trade in a village, cross lava, mine ore and diamonds, fight off a creeper, zombies and a skeleton, then light a Nether portal!',
    cardTile: T.GRASS,
    spawnX: 3,
    intro: [
      'Welcome to <b>Ratio Ridge</b>!',
      'A <b>ratio</b> compares two amounts, like "1 log makes 4 planks" (1 : 4).',
      'Travel right through the mine, the village and the diamond quarry to reach the <b>Nether portal</b>. Every obstacle needs a ratio to solve. Look for the <b style="color:#ffdd55">!</b> signs, and watch out for mobs!',
      'Wrong answers cost a heart. Lose them all and you respawn at the last checkpoint.',
    ],
    stations: [
      {
        id: 'craft', kind: 'table', x: 14, feetY: GROUND, trigger: 'use', action: 'Craft',
        title: 'Crafting Table', icon: 'craftingTable', respawnX: 16,
        speech: 'The ravine ahead is too wide to jump! Craft planks to build a bridge.',
        questions: ['craftForward', 'craftReverse'],
        page: {
          title: 'Crafting Ratios',
          body: `<p><b>1 log : 4 planks</b> is a ratio. It never changes.</p>
            <p>More logs? <b>Multiply</b> both sides by the same number:</p>
            <table class="rb-table"><tr><th>Logs</th><td>1</td><td>2</td><td>3</td><td>5</td></tr><tr><th>Planks</th><td>4</td><td>8</td><td>12</td><td>20</td></tr></table>
            <p>Going backwards? <b>Divide</b>: 20 planks ÷ 4 = 5 logs.</p>`,
        },
        solvedText: 'Bridge built! Cross the ravine.',
      },
      {
        id: 'villager', kind: 'villager', x: 36, feetY: GROUND, trigger: 'use', action: 'Trade',
        title: 'Farmer Villager', icon: 'villager', respawnX: 38,
        speech: 'Hrmm! Make some good trades with me and I will open the gate.',
        questions: ['tradeTable', 'betterDeal'],
        page: {
          title: 'Trading Tables',
          body: `<p>A <b>ratio table</b> keeps a trade fair. Whatever you do to one row, do to the other.</p>
            <table class="rb-table"><tr><th>Emeralds</th><td>2</td><td>4</td><td>6</td></tr><tr><th>Bread</th><td>5</td><td>10</td><td>15</td></tr></table>
            <p><b>Better deal?</b> Find the <b>unit rate</b>, how many you get for ONE emerald.</p>
            <p>12 arrows for 3 emeralds = 4 each.<br>10 arrows for 2 emeralds = 5 each. That one wins!</p>`,
        },
        solvedText: 'Hrmm! The gate is open.',
      },
      {
        id: 'ore', kind: 'ore', x: ORE_WALL[0] - 1, feetY: TUNNEL_FLOOR, trigger: 'use', action: 'Mine',
        title: 'Ore Vein', icon: 'coal', respawnX: 62,
        speech: 'A thick ore vein blocks the tunnel. Count its blocks, then use its ratio to find what is hidden deeper!',
        questions: ['oreCount', 'oreScale', 'orePartWhole'],
        context: world => world.vein,
        page: {
          title: 'Counting a Ratio',
          body: `<p>Count each kind: <b>9 coal</b> and <b>3 iron</b> is 9 : 3.</p>
            <p><b>Simplify</b>: divide both by 3 to get <b>3 : 1</b>.</p>
            <p>A 3 : 1 vein <b>repeats a pattern</b>: 3 coal, then 1 iron, over and over. One pattern = 4 blocks.</p>
            <p>Dug up 12 coal? 12 ÷ 3 = 4 patterns, so 4 × 1 = <b>4 iron</b>.</p>
            <p>20 blocks in all? 20 ÷ 4 = 5 patterns, so 5 × 1 = <b>5 iron</b>.</p>`,
        },
        solvedText: 'You mined through the ore vein!',
      },
      {
        id: 'creeper', kind: 'creeper', x: 92, feetY: GROUND, trigger: 'auto', barrierX: 91.2, action: '',
        title: 'Creeper Ambush!', icon: 'creeper', respawnX: 86,
        speech: 'Hsssss... Answer my riddles or I go BOOM!',
        questions: ['simplify', 'equivalent', 'mobPartWhole'],
        page: {
          title: 'Same Ratio, New Numbers',
          body: `<p><b>Simplest form</b>: divide both sides by the same number until you can't anymore.<br>6 : 9 ÷ 3 = <b>2 : 3</b></p>
            <p><b>Equivalent</b>: multiply both sides by the same number.<br>2 : 3 × 4 = <b>8 : 12</b></p>
            <p class="rb-warn">Adding does NOT work! 2 : 3 is not the same as 4 : 5.</p>`,
        },
        solvedText: 'The creeper fizzled out and dropped gunpowder!',
      },
      {
        id: 'librarian', kind: 'villager', x: 105, feetY: GROUND, trigger: 'use', action: 'Trade',
        title: 'Librarian', icon: 'librarian', respawnX: 107,
        speech: 'Hmm! The village gate only opens for clever traders. Help me check my book trades!',
        questions: ['oddOneOut', 'bookshelf'],
        page: {
          title: 'Spot the Unfair Trade',
          body: `<p>Fair trades all have the same <b>unit rate</b> (books for ONE emerald).</p>
            <table class="rb-table"><tr><th>Emeralds</th><td>2</td><td>3</td><td>4</td></tr><tr><th>Books</th><td>6</td><td>9</td><td>16</td></tr><tr><th>Per emerald</th><td>3</td><td>3</td><td class="rb-warn">4 ✗</td></tr></table>
            <p>A bookshelf is <b>6 planks : 3 books</b>, the same as <b>2 : 1</b>. Planks are always double the books.</p>`,
        },
        solvedText: 'The librarian opened the village gate!',
      },
      {
        id: 'blacksmith', kind: 'villager', x: 119, feetY: GROUND, trigger: 'use', action: 'Help',
        title: 'Blacksmith', icon: 'blacksmith', respawnX: 121,
        speech: 'Lava out back! Help me run the furnace and I will smelt you a cobblestone bridge.',
        questions: ['smeltRate', 'furnaceTime'],
        page: {
          title: 'Furnace Math',
          body: `<p><b>1 coal : 8 items</b> smelted.</p>
            <table class="rb-table"><tr><th>Coal</th><td>1</td><td>2</td><td>3</td><td>5</td></tr><tr><th>Items</th><td>8</td><td>16</td><td>24</td><td>40</td></tr></table>
            <p><b>1 item : 10 seconds</b>. 6 items take 6 × 10 = 60 seconds.</p>
            <p>Need coal for 32 items? 32 ÷ 8 = <b>4 coal</b>.</p>`,
        },
        solvedText: 'The blacksmith built a cobblestone bridge over the lava!',
      },
      {
        id: 'zombies', kind: 'zombies', x: 148, feetY: GROUND, trigger: 'auto', barrierX: 147.2, action: '',
        title: 'Zombie Horde!', icon: 'zombie', respawnX: 142,
        speech: 'Braaaains... Answer our questions or we will follow you forever!',
        questions: ['zombieDrops', 'zombieSpeed'],
        page: {
          title: 'Rates',
          body: `<p>A <b>rate</b> is a ratio with time: <b>2 blocks every 3 seconds</b>.</p>
            <table class="rb-table"><tr><th>Seconds</th><td>3</td><td>6</td><td>9</td><td>15</td></tr><tr><th>Blocks</th><td>2</td><td>4</td><td>6</td><td>10</td></tr></table>
            <p>15 seconds is 5 × 3, so the zombie shuffles 5 × 2 = <b>10 blocks</b>.</p>`,
        },
        solvedText: 'The sun came up and the zombies ran away!',
      },
      {
        id: 'diamonds', kind: 'ore', x: DIAMOND_WALL[0] - 1, feetY: QUARRY_FLOOR, trigger: 'use', action: 'Mine',
        title: 'Diamond Wall', icon: 'diamond', respawnX: 181,
        speech: 'Diamonds! Count this wall carefully. Are you comparing part to part, or part to the whole?',
        questions: ['partVsWhole', 'diamondOdds'],
        context: world => world.diamondWall,
        page: {
          title: 'Part vs Whole',
          body: `<p>A wall with <b>3 diamonds</b> and <b>9 stone</b> has 12 blocks.</p>
            <p><b>Part : part</b>, diamonds to stone = <b>3 : 9</b></p>
            <p><b>Part : whole</b>, diamonds to ALL blocks = <b>3 : 12</b></p>
            <p>Read the question carefully: "to stone" or "to all"?</p>`,
        },
        solvedText: 'Diamonds! You mined through the wall.',
      },
      {
        id: 'skeleton', kind: 'skeleton', x: 222, feetY: GROUND, trigger: 'auto', barrierX: 221.2, action: '',
        title: 'Skeleton Sniper!', icon: 'skeleton', respawnX: 216,
        speech: '*rattle rattle* Answer my arrow riddles, if you can!',
        questions: ['skeletonRate', 'shieldBlocks'],
        page: {
          title: '"Out Of"',
          body: `<p>"Your shield blocks <b>4 out of every 5</b> arrows" is a part : whole ratio: <b>blocked : all = 4 : 5</b>.</p>
            <p>That means blocked : got past = <b>4 : 1</b>.</p>
            <p>20 arrows? 20 ÷ 5 = 4 sets, so 4 × 4 = <b>16 blocked</b>, 4 get past.</p>`,
        },
        solvedText: 'The skeleton rattled away and left some bones!',
      },
      {
        id: 'portal', kind: 'portal', x: PORTAL.left + 1, feetY: GROUND, trigger: 'use', action: 'Light',
        title: 'Nether Portal', icon: 'portal', respawnX: PORTAL.left - 3,
        speech: 'The portal frame is built. Solve the portal riddles to light it!',
        questions: ['portalScale', 'netherTravel'],
        page: {
          title: 'Portals & the Nether',
          body: `<p>A portal's inside is <b>2 wide : 3 tall</b>. Scale both the same way:<br>4 : 6, 6 : 9, 8 : 12...</p>
            <p><b>1 block</b> in the Nether = <b>8 blocks</b> in the Overworld.</p>
            <table class="rb-table"><tr><th>Nether</th><td>1</td><td>5</td><td>10</td></tr><tr><th>Overworld</th><td>8</td><td>40</td><td>80</td></tr></table>
            <p>Overworld → Nether: <b>÷ 8</b>. Nether → Overworld: <b>× 8</b>.</p>`,
        },
        solvedText: 'The portal is lit! Step inside!',
      },
    ],
    entities: [
      { type: 'villager', x: 36, feetY: GROUND, stationId: 'villager' },
      { type: 'creeper', x: 92, feetY: GROUND, stationId: 'creeper' },
      { type: 'villager', x: 105, feetY: GROUND, stationId: 'librarian', style: { robe: '#e6e0d2', robeD: '#bdb6a6', hat: '#a02020' } },
      { type: 'villager', x: 119, feetY: GROUND, stationId: 'blacksmith', style: { apron: '#2b2b2b', eyepatch: true } },
      { type: 'zombie', x: 148, feetY: GROUND, stationId: 'zombies' },
      { type: 'zombie', x: 149.4, feetY: GROUND, stationId: 'zombies' },
      { type: 'zombie', x: 150.8, feetY: GROUND, stationId: 'zombies' },
      { type: 'skeleton', x: 222, feetY: GROUND, stationId: 'skeleton' },
    ],
    portal: PORTAL,
    build,
    applySolve,
  };

  BQ.Levels.order = ['ratio-ridge'];
  BQ.Levels.comingSoon = [
    { name: 'Multiplication Mines', skill: 'Times tables', tile: T.STONE },
    { name: 'Fraction Forest', skill: 'Fractions', tile: T.LEAVES },
    { name: 'Nether Negatives', skill: 'Negative numbers', tile: T.OBSIDIAN },
    { name: 'End City Equations', skill: 'Equations', tile: T.PLANKS },
  ];
})();
