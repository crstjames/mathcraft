// Ratio question generators. Every call builds a fresh question with random numbers, so
// a wrong answer is followed by a new problem rather than a guess at the same one.
//
// A question is: { prompt, visual (HTML), choices: [string], answer: string, hint, explain, steps }
// `steps` drive the Book & Quill: each step is a sentence where {{n}} is a blank whose answer is n.
window.BQ = window.BQ || {};

BQ.Questions = (() => {
  const icon = name => BQ.Art.icon(name);

  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Numeric multiple choice: the right answer plus up to 3 believable wrong answers.
  function numberChoices(answer, candidates) {
    const wrong = [];
    for (const c of candidates) {
      if (Number.isInteger(c) && c > 0 && c !== answer && !wrong.includes(c)) wrong.push(c);
      if (wrong.length === 3) break;
    }
    let bump = 1;
    while (wrong.length < 3) {
      const c = answer + (bump % 2 ? bump : -bump);
      if (c > 0 && c !== answer && !wrong.includes(c)) wrong.push(c);
      bump++;
    }
    return shuffle([answer, ...wrong]).map(String);
  }

  // ---------- Visual helpers (HTML strings) ----------
  const img = name => `<img src="${icon(name)}" alt="${name}">`;
  const slot = (name, count) => `<span class="slot">${img(name)}${count > 1 ? `<span class="count">${count}</span>` : ''}</span>`;
  const qslot = () => `<span class="slot q">?</span>`;
  const arrow = () => `<span class="arrow">→</span>`;
  const row = (...parts) => `<div class="slot-row">${parts.join('')}</div>`;
  const label = text => `<span class="label">${text}</span>`;
  function iconRow(name, n) {
    if (n > 40) return row(slot(name, n));
    return `<div class="icons">${Array.from({ length: n }, () => img(name)).join('')}</div>`;
  }
  const rep = (x, n) => Array.from({ length: n }, () => x);
  // A row of boxes, one per repeat of a pattern. '?' draws an unknown block.
  function patternRow(boxes) {
    const cell = n => (n === '?' ? '<span class="q-block">?</span>' : img(n));
    return `<div class="pattern-row">${boxes.map(b => `<span class="group-box">${b.map(cell).join('')}</span>`).join('')}</div>`;
  }
  function groupBox(parts) {
    return `<span class="group-box">${parts.map(([name, n]) => Array.from({ length: n }, () => img(name)).join('')).join('')}</span>`;
  }
  function ratioTable(rows) {
    // rows: [{ name, iconName, values: [number|null] }]
    return `<table class="ratio-table">${rows.map(r => `<tr><th>${img(r.iconName)}${r.name}</th>${r.values
      .map(v => (v === null ? '<td class="missing">?</td>' : `<td>${v}</td>`))
      .join('')}</tr>`).join('')}</table>`;
  }

  const blank = n => `{{${n}}}`;
  // Ratio-table columns: 1×, a 2× example, then the asked multiple (skip the example if it would repeat it).
  const tableCols = m => (m > 2 ? [1, 2, m] : [1, m]);

  // ---------- Generators ----------
  const RECIPES = [
    { inIcon: 'log', inName: 'logs', inOne: 'log', inN: 1, outIcon: 'planks', outName: 'planks', outN: 4 },
    { inIcon: 'planks', inName: 'planks', inOne: 'planks', inN: 2, outIcon: 'stick', outName: 'sticks', outN: 4 },
  ];

  const generators = {
    // Unit rate, forwards: groups of inputs -> outputs.
    craftForward() {
      const r = pick(RECIPES);
      const k = ri(2, 6);
      const have = k * r.inN;
      const answer = k * r.outN;
      return {
        prompt: `Recipe: <b>${r.inN} ${r.inN === 1 ? r.inOne : r.inName}</b> makes <b>${r.outN} ${r.outName}</b>. You have <b>${have} ${r.inName}</b>. How many ${r.outName} can you craft?`,
        visual:
          row(label('Recipe:'), slot(r.inIcon, r.inN), arrow(), slot(r.outIcon, r.outN)) +
          row(label('You have:')) + iconRow(r.inIcon, have),
        choices: numberChoices(answer, [answer + r.outN, answer - r.outN, have + r.outN, have * r.outN, k + r.outN, have]),
        answer: String(answer),
        steps: r.inN === 1
          ? [`1 ${r.inOne} = ${r.outN} ${r.outName}, 2 ${r.inName} = ${blank(2 * r.outN)} ${r.outName}`,
             `${have} ${r.inName} × ${r.outN} = ${blank(answer)} ${r.outName}`]
          : [`${have} ${r.inName} in groups of ${r.inN} = ${blank(k)} groups`,
             `${k} groups × ${r.outN} ${r.outName} = ${blank(answer)} ${r.outName}`],
        hint: `Every ${r.inN === 1 ? 'single ' + r.inOne : r.inN + ' ' + r.inName} makes ${r.outN}. You have ${k} of those groups. What is ${k} × ${r.outN}?`,
        explain: `${have} ${r.inName} = ${k} group${k > 1 ? 's' : ''} of ${r.inN}. ${k} × ${r.outN} = <b>${answer} ${r.outName}</b>.`,
      };
    },

    // Unit rate, backwards: how many inputs to reach a target.
    craftReverse() {
      const k = ri(3, 7);
      const need = k * 4;
      return {
        prompt: `Your bridge needs <b>${need} planks</b>. One log makes 4 planks. How many <b>logs</b> do you need?`,
        visual:
          row(label('Recipe:'), slot('log', 1), arrow(), slot('planks', 4)) +
          row(label('Need:'), slot('planks', need), label('from'), qslot(), img('log')),
        choices: numberChoices(k, [need * 4, need - 4, k + 1, k - 1, need / 2, need]),
        answer: String(k),
        steps: [`1 log = 4 planks, 2 logs = ${blank(8)} planks, 3 logs = ${blank(12)} planks`,
                `${need} planks ÷ 4 = ${blank(k)} logs`],
        hint: `How many groups of 4 planks fit into ${need}? Try counting by 4s: 4, 8, 12...`,
        explain: `${need} ÷ 4 = <b>${k} logs</b>, because ${k} × 4 = ${need}.`,
      };
    },

    // Equivalent ratios with a ratio table (missing value).
    tradeTable() {
      const [a, b] = pick([[1, 3], [2, 3], [2, 5], [3, 4], [3, 5], [1, 4], [2, 7], [4, 5], [3, 2], [5, 2]]);
      const m = ri(2, 5);
      const item = pick([{ icon: 'bread', name: 'bread' }, { icon: 'carrot', name: 'carrots' }]);
      const askItems = Math.random() < 0.6;
      const answer = askItems ? b * m : a * m;
      const cols = m > 2 ? [1, 2, m] : [1, m];
      const emRow = cols.map((c, i) => (i === cols.length - 1 && !askItems ? null : a * c));
      const itRow = cols.map((c, i) => (i === cols.length - 1 && askItems ? null : b * c));
      const given = askItems ? a * m : b * m;
      const prompt = askItems
        ? `The farmer trades <b>${a} emerald${a > 1 ? 's' : ''}</b> for <b>${b} ${item.name}</b>. How many ${item.name} do you get for <b>${a * m} emeralds</b>?`
        : `The farmer trades <b>${a} emerald${a > 1 ? 's' : ''}</b> for <b>${b} ${item.name}</b>. How many emeralds do you need for <b>${b * m} ${item.name}</b>?`;
      const additive = askItems ? b + (a * m - a) : a + (b * m - b);
      return {
        prompt,
        visual:
          row(slot('emerald', a), arrow(), slot(item.icon, b)) +
          ratioTable([
            { name: 'Emeralds', iconName: 'emerald', values: emRow },
            { name: item.name[0].toUpperCase() + item.name.slice(1), iconName: item.icon, values: itRow },
          ]),
        choices: numberChoices(answer, [additive, answer + (askItems ? b : a), answer - (askItems ? b : a), given * (askItems ? b : a), answer + 1]),
        answer: String(answer),
        steps: askItems
          ? [`${given} emeralds ÷ ${a} = ${blank(m)} (how many times bigger)`, `${b} ${item.name} × ${m} = ${blank(answer)} ${item.name}`]
          : [`${given} ${item.name} ÷ ${b} = ${blank(m)} (how many times bigger)`, `${a} emeralds × ${m} = ${blank(answer)} emeralds`],
        hint: `${given} is ${m} times ${askItems ? a : b}. Whatever you do to one side, do to the other: multiply ${askItems ? b : a} by ${m}.`,
        explain: `${a} : ${b} is the same as ${a * m} : ${b * m}, because both sides were multiplied by ${m}. Answer: <b>${answer}</b>.`,
      };
    },

    // Comparing unit rates.
    betterDeal() {
      const item = pick([{ icon: 'arrow', name: 'arrows', who: 'Fletcher' }, { icon: 'bread', name: 'bread', who: 'Baker' }]);
      const same = Math.random() < 0.2;
      let r1 = ri(2, 7), r2 = same ? r1 : ri(2, 7);
      while (!same && r2 === r1) r2 = ri(2, 7);
      let e1 = ri(2, 5), e2 = ri(2, 5);
      while (e2 === e1) e2 = ri(2, 5);
      // Make it tempting: the smaller rate often gets the bigger total.
      if (!same && Math.random() < 0.6) {
        const lowRate = Math.min(r1, r2), hiRate = Math.max(r1, r2);
        const bigE = Math.max(e1, e2), smallE = Math.min(e1, e2);
        if (lowRate * bigE > hiRate * smallE) {
          if (Math.random() < 0.5) { r1 = lowRate; e1 = bigE; r2 = hiRate; e2 = smallE; }
          else { r2 = lowRate; e2 = bigE; r1 = hiRate; e1 = smallE; }
        }
      }
      const n1 = r1 * e1, n2 = r2 * e2;
      const answer = r1 === r2 ? 'Same deal' : r1 > r2 ? 'Villager A' : 'Villager B';
      const deal = (who, e, n) =>
        `<div class="deal"><div class="who">${who}</div>${row(slot('emerald', e), arrow(), slot(item.icon, n))}</div>`;
      return {
        prompt: `Two ${item.who} villagers want to trade. Which one gives you <b>more ${item.name} for each emerald</b>?`,
        visual: `<div class="deal-cards">${deal('Villager A', e1, n1)}${deal('Villager B', e2, n2)}</div>`,
        choices: ['Villager A', 'Villager B', 'Same deal'],
        answer,
        steps: [`Villager A: ${n1} ÷ ${e1} = ${blank(r1)} ${item.name} per emerald`,
                `Villager B: ${n2} ÷ ${e2} = ${blank(r2)} ${item.name} per emerald`],
        hint: `Don't just look at the biggest pile! Find how many ${item.name} you get for ONE emerald: divide ${item.name} by emeralds for each villager.`,
        explain: `A: ${n1} ÷ ${e1} = <b>${r1}</b> per emerald. B: ${n2} ÷ ${e2} = <b>${r2}</b> per emerald. ${answer === 'Same deal' ? 'They are the same rate!' : `${answer} is the better deal.`}`,
      };
    },

    // Count the real ore wall in the level and write its ratio in simplest form.
    // ctx: { coal, iron, layout } from the level.
    oreCount(ctx) {
      const { coal, iron } = ctx;
      const coalFirst = Math.random() < 0.6;
      const [first, second] = coalFirst ? [coal, iron] : [iron, coal];
      const [n1, n2] = coalFirst ? ['coal', 'iron'] : ['iron', 'coal'];
      const g = gcd(first, second);
      const A = first / g, B = second / g;
      const correct = `${A} : ${B}`;
      const opts = [`${B} : ${A}`, `${A} : ${A + B}`, `${first} : ${first + second}`, `${A + 1} : ${B}`, `${A} : ${B + 1}`];
      const wrong = [];
      for (const o of opts) {
        const [x, y] = o.split(' : ').map(Number);
        if (o !== correct && !wrong.includes(o) && x * B !== y * A) wrong.push(o);
        if (wrong.length === 3) break;
      }
      return {
        prompt: `Count the blocks in the ore vein. What is the ratio of <b>${n1} to ${n2}</b> in <b>simplest form</b>?`,
        visual: row(veinGrid(ctx.layout)),
        choices: shuffle([correct, ...wrong]),
        answer: correct,
        steps: [
          `Count the coal blocks: ${blank(coal)}`,
          `Count the iron blocks: ${blank(iron)}`,
          `${n1} : ${n2} is ${first} : ${second}. Both divide by ${g}: ${first} ÷ ${g} = ${blank(A)} and ${second} ÷ ${g} = ${blank(B)}`,
        ],
        hint: `Count each kind of block. Put ${n1} first. Then divide both numbers by the biggest number that goes into both.`,
        explain: `There are ${coal} coal and ${iron} iron. ${n1} : ${n2} = ${first} : ${second}. Divide both by ${g} to get <b>${correct}</b>.`,
      };
    },

    // The vein continues underground, repeating its pattern. ctx: { a, b } = coal : iron in simplest form.
    oreScale(ctx) {
      const { a, b } = ctx;
      const m = ri(2, 4);
      const askIron = Math.random() < 0.6;
      const [have, haveName, want, wantName] = askIron ? [a, 'coal', b, 'iron'] : [b, 'iron', a, 'coal'];
      const given = have * m, answer = want * m;
      // Each dug-up pattern shows the known blocks and "?" where the unknown ones go.
      const box = askIron ? [...rep('coal', a), ...rep('?', b)] : [...rep('?', a), ...rep('iron', b)];
      return {
        prompt: `Deeper down, the vein repeats the same pattern: <b>${a} coal, then ${b} iron</b>, over and over. You dug up <b>${given} ${haveName}</b>. How much <b>${wantName}</b> did you find with it?`,
        visual:
          row(label('The pattern:'), patternRow([[...rep('coal', a), ...rep('iron', b)]])) +
          row(label(`Your ${given} ${haveName}, in patterns:`)) + patternRow(rep(box, m)),
        choices: numberChoices(answer, [want + (given - have), given * want, given - want, answer + want, answer - want, m, given]),
        answer: String(answer),
        steps: [
          `Each pattern has ${have} ${haveName}. How many patterns is ${given} ${haveName}? ${given} ÷ ${have} = ${blank(m)}`,
          `Each pattern has ${want} ${wantName}. ${m} patterns × ${want} = ${blank(answer)} ${wantName}`,
        ],
        hint: `Put your ${given} ${haveName} into piles of ${have}, one pile per pattern. Every pattern also has ${want} ${wantName}.`,
        explain: `${given} ${haveName} ÷ ${have} = ${m} patterns. Each pattern has ${want} ${wantName}, so ${m} × ${want} = <b>${answer} ${wantName}</b>.`,
      };
    },

    // Part : whole, using the vein's pattern. ctx: { a, b }.
    orePartWhole(ctx) {
      return partWhole({
        pairs: [[ctx.a, ctx.b]],
        a: { icon: 'coal', name: 'coal' },
        b: { icon: 'iron', name: 'iron' },
        story: (a, b, total) => `At the very bottom, the vein still repeats its pattern: <b>${a} coal, then ${b} iron</b>. This last part has <b>${total} blocks</b> in all.`,
        noun: 'blocks',
      });
    },

    mobPartWhole() {
      return partWhole({
        pairs: [[2, 1], [3, 1], [3, 2], [2, 3], [1, 4], [4, 3]],
        a: { icon: 'zombie', name: 'zombies' },
        b: { icon: 'skeleton', name: 'skeletons' },
        story: (a, b, total) => `"Hsss... My mob army marches in a pattern: <b>${a} zombie${a > 1 ? 's' : ''}, then ${b} skeleton${b > 1 ? 's' : ''}</b>, over and over. There are <b>${total} mobs</b> in all."`,
        noun: 'mobs',
      });
    },

    // ---------- Village: Librarian ----------
    // Three trades share one rate; spot the one that doesn't.
    oddOneOut() {
      const r = ri(2, 5);
      let odd;
      do { odd = r + pick([-1, 1]); } while (odd < 2);
      const es = shuffle([1, 2, 3, 4, 5, 6]).slice(0, 4);
      const oddIdx = ri(0, 3);
      const names = ['Trade A', 'Trade B', 'Trade C', 'Trade D'];
      const trades = es.map((e, i) => ({ name: names[i], e, n: e * (i === oddIdx ? odd : r), rate: i === oddIdx ? odd : r }));
      const card = t => `<div class="deal"><div class="who">${t.name}</div>${row(slot('emerald', t.e), arrow(), slot('book', t.n))}</div>`;
      return {
        prompt: `"Hmm! All my book trades use the <b>same ratio</b> of emeralds to books... except one sneaky trade." Which trade does <b>NOT</b> match the others?`,
        visual: `<div class="deal-cards">${trades.map(card).join('')}</div>`,
        choices: names,
        answer: names[oddIdx],
        steps: trades.map(t => `${t.name}: ${t.n} books ÷ ${t.e} emerald${t.e > 1 ? 's' : ''} = ${blank(t.rate)} books per emerald`),
        hint: `Work out how many books you get for ONE emerald in each trade. Three will match. One won't.`,
        explain: `${trades.map(t => `${t.name}: ${t.n} ÷ ${t.e} = ${t.rate}`).join('. ')}. Only <b>${names[oddIdx]}</b> gives ${odd} books per emerald instead of ${r}.`,
      };
    },

    // Real recipe: a bookshelf takes 6 planks and 3 books.
    bookshelf() {
      const k = ri(2, 6);
      const askPlanks = Math.random() < 0.5;
      const answer = askPlanks ? 6 * k : 3 * k;
      const given = askPlanks ? 3 * k : 6 * k;
      return {
        prompt: askPlanks
          ? `A bookshelf needs <b>6 planks and 3 books</b>. The librarian has <b>${given} books</b>. How many <b>planks</b> are needed to turn them all into bookshelves?`
          : `A bookshelf needs <b>6 planks and 3 books</b>. The librarian has <b>${given} planks</b>. How many <b>books</b> are needed to use them all?`,
        visual: row(slot('planks', 6), label('+'), slot('book', 3), arrow(), slot('bookshelf', 1)) +
          row(label('Have:'), slot(askPlanks ? 'book' : 'planks', given)),
        choices: numberChoices(answer, askPlanks ? [given + 3, given * 6, 2 * k, answer + 6, answer - 6] : [given - 3, given * 3, k, answer + 3, answer - 3, given / 2 + 1]),
        answer: String(answer),
        steps: askPlanks
          ? [`${given} books ÷ 3 per shelf = ${blank(k)} bookshelves`, `${k} bookshelves × 6 planks = ${blank(answer)} planks`]
          : [`${given} planks ÷ 6 per shelf = ${blank(k)} bookshelves`, `${k} bookshelves × 3 books = ${blank(answer)} books`],
        hint: `First find how many bookshelves you can make. Then use the recipe for each bookshelf.`,
        explain: `${given} ÷ ${askPlanks ? 3 : 6} = ${k} bookshelves, and ${k} × ${askPlanks ? 6 : 3} = <b>${answer} ${askPlanks ? 'planks' : 'books'}</b>. (6 : 3 is the same as 2 : 1, so planks are always double the books.)`,
      };
    },

    // ---------- Village: Blacksmith ----------
    // Real furnace rule: 1 coal smelts 8 items.
    smeltRate() {
      const k = ri(2, 7);
      const forward = Math.random() < 0.5;
      const answer = forward ? 8 * k : k;
      return {
        prompt: forward
          ? `In a furnace, <b>1 coal smelts 8 iron ore</b>. The blacksmith has <b>${k} coal</b>. How much iron ore can he smelt?`
          : `In a furnace, <b>1 coal smelts 8 iron ore</b>. The blacksmith needs to smelt <b>${8 * k} iron ore</b>. How many <b>coal</b> does he need?`,
        visual: row(slot('coal', 1), arrow(), slot('iron', 8)) + ratioTable([
          { name: 'Coal', iconName: 'coal', values: tableCols(k).map((c, i, a) => (i === a.length - 1 && !forward ? null : c)) },
          { name: 'Iron ore', iconName: 'iron', values: tableCols(k).map((c, i, a) => (i === a.length - 1 && forward ? null : 8 * c)) },
        ]),
        choices: numberChoices(answer, forward ? [k + 8, 8 * k + 8, 8 * k - 8, 7 * k] : [8 * k * 8, k + 1, k - 1, 8 * k - 8, 8]),
        answer: String(answer),
        steps: forward ? [`${k} coal × 8 = ${blank(8 * k)} iron ore`] : [`Count by 8s: 8, 16, ${blank(24)}, ${blank(32)}...`, `${8 * k} ÷ 8 = ${blank(k)} coal`],
        hint: forward ? `Every coal smelts 8. What is ${k} × 8?` : `How many 8s fit into ${8 * k}? Count by 8s.`,
        explain: forward ? `${k} × 8 = <b>${8 * k} iron ore</b>.` : `${8 * k} ÷ 8 = <b>${k} coal</b>.`,
      };
    },

    // Real furnace rule: 1 item every 10 seconds.
    furnaceTime() {
      const k = ri(2, 9);
      const askTime = Math.random() < 0.5;
      const answer = askTime ? 10 * k : k;
      return {
        prompt: askTime
          ? `A furnace smelts <b>1 iron ingot every 10 seconds</b>. How many <b>seconds</b> to smelt <b>${k} ingots</b>?`
          : `A furnace smelts <b>1 iron ingot every 10 seconds</b>. How many ingots are ready after <b>${10 * k} seconds</b>?`,
        visual: row(slot('furnace', 1), label('1 ingot'), slot('iron', 1), label('='), slot('clock', 1), label('10 seconds')) + ratioTable([
          { name: 'Ingots', iconName: 'iron', values: tableCols(k).map((c, i, a) => (i === a.length - 1 && !askTime ? null : c)) },
          { name: 'Seconds', iconName: 'clock', values: tableCols(k).map((c, i, a) => (i === a.length - 1 && askTime ? null : 10 * c)) },
        ]),
        choices: numberChoices(answer, askTime ? [k + 10, 10 * k + 10, 10 * k - 10, k * 100] : [10 * k, k + 1, k - 1, k + 10]),
        answer: String(answer),
        steps: askTime ? [`${k} ingots × 10 seconds = ${blank(10 * k)} seconds`] : [`${10 * k} seconds ÷ 10 = ${blank(k)} ingots`],
        hint: askTime ? `Each ingot takes 10 seconds. What is ${k} × 10?` : `How many 10s are in ${10 * k}?`,
        explain: askTime ? `${k} × 10 = <b>${10 * k} seconds</b>.` : `${10 * k} ÷ 10 = <b>${k} ingots</b>.`,
      };
    },

    // ---------- Zombie horde ----------
    zombieDrops() {
      const [a, b] = pick([[2, 3], [1, 2], [3, 4], [2, 5], [3, 2], [4, 3], [1, 3]]);
      const m1 = ri(2, 3);
      let m2;
      do { m2 = ri(4, 6); } while (m2 === m1);
      const askFlesh = Math.random() < 0.6;
      const answer = askFlesh ? b * m2 : a * m2;
      const given = askFlesh ? a * m2 : b * m2;
      return {
        prompt: askFlesh
          ? `Every <b>${a} zombie${a > 1 ? 's' : ''}</b> you defeat drop <b>${b} rotten flesh</b>. Fill in the table: how much rotten flesh from <b>${given} zombies</b>?`
          : `Every <b>${a} zombie${a > 1 ? 's' : ''}</b> you defeat drop <b>${b} rotten flesh</b>. How many zombies did you defeat to collect <b>${given} rotten flesh</b>?`,
        visual: ratioTable([
          { name: 'Zombies', iconName: 'zombie', values: [a, a * m1, askFlesh ? a * m2 : null] },
          { name: 'Rotten flesh', iconName: 'rottenFlesh', values: [b, b * m1, askFlesh ? null : b * m2] },
        ]),
        choices: numberChoices(answer, askFlesh ? [b + (given - a), answer + b, answer - b, given * b, b * m1 + b] : [a + (given - b), answer + a, answer - a, given * a, a * m1 + a]),
        answer: String(answer),
        steps: askFlesh
          ? [`${given} zombies ÷ ${a} = ${blank(m2)} (how many times bigger)`, `${b} rotten flesh × ${m2} = ${blank(answer)}`]
          : [`${given} rotten flesh ÷ ${b} = ${blank(m2)} (how many times bigger)`, `${a} zombies × ${m2} = ${blank(answer)}`],
        hint: `Compare the new column with the first column: how many times bigger is it? Multiply the other row by the same number.`,
        explain: `${given} is ${m2} times ${askFlesh ? a : b}, so ${askFlesh ? b : a} × ${m2} = <b>${answer}</b>.`,
      };
    },

    zombieSpeed() {
      return rateQuestion({
        pairs: [[2, 3], [3, 2], [1, 2], [2, 5], [4, 3], [3, 4]],
        things: 'blocks', thingIcon: 'zombie',
        story: (n, t) => `Zombies shuffle <b>${n} block${n > 1 ? 's' : ''} every ${t} seconds</b>.`,
        askThings: m => `How many blocks do they shuffle in <b>${m} seconds</b>?`,
        askTime: m => `How many seconds does it take them to shuffle <b>${m} blocks</b>?`,
      });
    },

    // ---------- Diamond quarry ----------
    // Part : part vs part : whole, counting the real wall. ctx: { diamond, stone, layout }.
    partVsWhole(ctx) {
      const d = ctx.diamond, st = ctx.stone, total = d + st;
      const askAll = Math.random() < 0.5;
      const correct = askAll ? `${d} : ${total}` : `${d} : ${st}`;
      const opts = askAll ? [`${d} : ${st}`, `${st} : ${total}`, `${total} : ${d}`, `${st} : ${d}`] : [`${d} : ${total}`, `${st} : ${d}`, `${st} : ${total}`, `${total} : ${d}`];
      return {
        prompt: askAll
          ? `Count the blocks in the diamond wall. What is the ratio of <b>diamonds to ALL the blocks</b>? (Use the counts. No need to simplify.)`
          : `Count the blocks in the diamond wall. What is the ratio of <b>diamonds to stone</b>? (Use the counts. No need to simplify.)`,
        visual: row(veinGrid(ctx.layout)),
        choices: shuffle([correct, ...opts.filter(o => o !== correct).slice(0, 3)]),
        answer: correct,
        steps: [
          `Count the diamonds: ${blank(d)}`,
          `Count the stone: ${blank(st)}`,
          ...(askAll ? [`All the blocks: ${d} + ${st} = ${blank(total)}`] : []),
        ],
        hint: askAll
          ? `"All the blocks" means diamonds AND stone together. Put diamonds first.`
          : `Only compare diamonds with stone. Put diamonds first.`,
        explain: `There are ${d} diamonds and ${st} stone (${total} blocks in all). Diamonds to stone is ${d} : ${st} (part to part). Diamonds to all blocks is ${d} : ${total} (part to whole). Answer: <b>${correct}</b>.`,
      };
    },

    // ctx: { a, b } = diamond : stone in simplest form.
    diamondOdds(ctx) {
      return partWhole({
        pairs: [[ctx.a, ctx.b]],
        a: { icon: 'diamond', name: 'diamonds' },
        b: { icon: 'stone', name: 'stone' },
        story: (a, b, total) => `Deeper in the quarry, the rock repeats the same pattern: <b>${a} diamond${a > 1 ? 's' : ''}, then ${b} stone</b>. You mine <b>${total} blocks</b>.`,
        noun: 'blocks',
      });
    },

    // ---------- Skeleton sniper ----------
    skeletonRate() {
      return rateQuestion({
        pairs: [[3, 2], [2, 1], [4, 3], [5, 2], [1, 2], [3, 4]],
        things: 'arrows', thingIcon: 'arrow',
        story: (n, t) => `The skeleton shoots <b>${n} arrow${n > 1 ? 's' : ''} every ${t} second${t > 1 ? 's' : ''}</b>.`,
        askThings: m => `How many arrows does it shoot in <b>${m} seconds</b>?`,
        askTime: m => `How many seconds does it take to shoot <b>${m} arrows</b>?`,
      });
    },

    // "p out of every q" is a part : whole ratio.
    shieldBlocks() {
      const [p, q] = pick([[3, 4], [4, 5], [2, 3], [1, 2], [5, 6], [2, 5]]);
      const m = ri(2, 4);
      const total = q * m;
      const askBlocked = Math.random() < 0.6;
      const part = askBlocked ? p : q - p;
      const answer = part * m;
      return {
        prompt: `Your shield blocks <b>${p} out of every ${q} arrows</b>. The skeleton shoots <b>${total} arrows</b>. How many arrows ${askBlocked ? 'does your shield <b>block</b>' : '<b>get past</b> your shield'}?`,
        visual:
          row(label(`Every ${q} arrows:`), patternRow([[...rep('shield', p), ...rep('arrow', q - p)]]), label(`= ${p} blocked, ${q - p} past`)) +
          row(label(`All ${total} arrows:`)) + patternRow(rep(rep('?', q), m)),
        choices: numberChoices(answer, [(askBlocked ? q - p : p) * m, total - m, m, answer + part, total]),
        answer: String(answer),
        steps: [
          `How many sets of ${q} arrows? ${total} ÷ ${q} = ${blank(m)}`,
          `Each set has ${part} ${askBlocked ? 'blocked' : 'getting past'}. ${m} × ${part} = ${blank(answer)}`,
        ],
        hint: `Split the ${total} arrows into sets of ${q}. In every set, ${p} are blocked and ${q - p} get past.`,
        explain: `${total} ÷ ${q} = ${m} sets. ${m} × ${part} = <b>${answer}</b> ${askBlocked ? 'blocked' : 'get past'}. ("${p} out of ${q}" compares a part to the whole set.)`,
      };
    },

    // Simplest form.
    simplify() {
      let a, b;
      do { a = ri(1, 5); b = ri(1, 6); } while (a === b || gcd(a, b) !== 1);
      const k = ri(2, 4);
      const A = a * k, B = b * k;
      const correct = `${a} : ${b}`;
      const opts = [`${b} : ${a}`, `${a + 1} : ${b}`, `${a} : ${b + 1}`, `${A} : ${B - 1}`, `${Math.max(1, a - 1)} : ${b}`];
      const wrong = [];
      for (const o of opts) {
        const [x, y] = o.split(' : ').map(Number);
        if (o !== correct && !wrong.includes(o) && x * b !== y * a && x > 0 && y > 0 && x !== y) wrong.push(o);
        if (wrong.length === 3) break;
      }
      return {
        prompt: `"Hsss... I brought <b>${A} zombies</b> and <b>${B} skeletons</b>." What is the ratio of zombies to skeletons in <b>simplest form</b>?`,
        visual: row(label('Zombies:')) + iconRow('zombie', A) + row(label('Skeletons:')) + iconRow('skeleton', B),
        choices: shuffle([correct, ...wrong]),
        answer: correct,
        steps: [`Divide the zombies by ${k}: ${A} ÷ ${k} = ${blank(a)}`, `Divide the skeletons by ${k}: ${B} ÷ ${k} = ${blank(b)}`],
        hint: `Find a number that divides BOTH ${A} and ${B}. Divide both sides by it. Keep going until nothing else divides both.`,
        explain: `${A} and ${B} can both be divided by ${k}: ${A} ÷ ${k} = ${a}, ${B} ÷ ${k} = ${b}. Simplest form: <b>${correct}</b>.`,
      };
    },

    // Spot the equivalent ratio.
    equivalent() {
      let a, b;
      do { a = ri(1, 5); b = ri(2, 6); } while (a === b || gcd(a, b) !== 1);
      const k = ri(2, 4);
      const correct = `${a * k} : ${b * k}`;
      const opts = [
        `${a + k} : ${b + k}`,
        `${b * k} : ${a * k}`,
        `${a * k} : ${b * (k + 1)}`,
        `${a * (k + 1)} : ${b * k}`,
        `${a + 1} : ${b + 2}`,
      ];
      const wrong = [];
      for (const o of opts) {
        const [x, y] = o.split(' : ').map(Number);
        if (o !== correct && !wrong.includes(o) && x * b !== y * a) wrong.push(o);
        if (wrong.length === 3) break;
      }
      return {
        prompt: `"Hsss... For every <b>${a} creeper${a > 1 ? 's' : ''}</b> in my squad there ${b > 1 ? 'are' : 'is'} <b>${b} zombies</b>." Which ratio is the <b>same</b> as ${a} : ${b}?`,
        visual: row(groupBox([['creeper', a], ['zombie', b]]), label(`= ${a} : ${b}`)),
        choices: shuffle([correct, ...wrong]),
        answer: correct,
        steps: [`Multiply the creepers by ${k}: ${a} × ${k} = ${blank(a * k)}`, `Multiply the zombies by ${k}: ${b} × ${k} = ${blank(b * k)}`],
        hint: `Equivalent ratios multiply (or divide) BOTH numbers by the SAME number. Adding the same number doesn't work!`,
        explain: `${a} × ${k} = ${a * k} and ${b} × ${k} = ${b * k}, so <b>${correct}</b> matches ${a} : ${b}.`,
      };
    },

    // Scale a shape keeping its ratio.
    portalScale() {
      const m = ri(2, 5);
      const askTall = Math.random() < 0.6;
      const w = 2 * m, h = 3 * m;
      const answer = askTall ? h : w;
      const grid = `<div class="frame-grid" style="grid-template-columns:repeat(4,20px)">${Array.from({ length: 20 }, (_, i) => {
        const x = i % 4, y = Math.floor(i / 4);
        const edge = x === 0 || x === 3 || y === 0 || y === 4;
        return `<div style="background:${edge ? '#1e1530' : '#8b3cf0'}"></div>`;
      }).join('')}</div>`;
      return {
        prompt: askTall
          ? `A Nether portal's inside is <b>2 blocks wide</b> and <b>3 blocks tall</b>. You want a giant portal with the same 2 : 3 shape that is <b>${w} blocks wide</b>. How tall should it be?`
          : `A Nether portal's inside is <b>2 blocks wide</b> and <b>3 blocks tall</b>. You want a giant portal with the same 2 : 3 shape that is <b>${h} blocks tall</b>. How wide should it be?`,
        visual: `<div class="frame-diagram">${grid}${ratioTable([
          { name: 'Wide', iconName: 'obsidian', values: [2, askTall ? w : null] },
          { name: 'Tall', iconName: 'portal', values: [3, askTall ? null : h] },
        ])}</div>`,
        choices: numberChoices(answer, askTall ? [w + 1, w * 3, h + 3, h - 3, w * 2] : [h - 1, h * 2, w + 2, w - 2, h / 3 * 3 + 1]),
        answer: String(answer),
        steps: askTall
          ? [`${w} wide ÷ 2 = ${blank(m)} (how many times bigger)`, `3 tall × ${m} = ${blank(h)} tall`]
          : [`${h} tall ÷ 3 = ${blank(m)} (how many times bigger)`, `2 wide × ${m} = ${blank(w)} wide`],
        hint: askTall
          ? `${w} is how many times 2? Multiply 3 by that same number.`
          : `${h} is how many times 3? Multiply 2 by that same number.`,
        explain: `The portal grew ${m} times bigger: 2 × ${m} = ${w} wide and 3 × ${m} = ${h} tall. Answer: <b>${answer}</b>.`,
      };
    },

    // Real Minecraft fact: 1 block in the Nether = 8 in the Overworld.
    netherTravel() {
      const m = ri(2, 12);
      const d = m * 8;
      const toNether = Math.random() < 0.55;
      const answer = toNether ? m : d;
      return {
        prompt: toNether
          ? `Walking <b>1 block in the Nether</b> moves you <b>8 blocks in the Overworld</b>. Your house is <b>${d} blocks</b> away in the Overworld. How many blocks is that in the Nether?`
          : `Walking <b>1 block in the Nether</b> moves you <b>8 blocks in the Overworld</b>. You walk <b>${m} blocks</b> in the Nether. How far did you go in the Overworld?`,
        visual: ratioTable([
          { name: 'Nether', iconName: 'portal', values: [1, toNether ? null : m] },
          { name: 'Overworld', iconName: 'planks', values: [8, toNether ? d : null] },
        ]),
        choices: numberChoices(answer, toNether ? [d * 8, d - 8, m + 8, m * 2, m + 1] : [m + 8, d + 8, d - 8, m * 4, d * 2]),
        answer: String(answer),
        steps: toNether
          ? [`Overworld ÷ 8 = Nether: ${d} ÷ 8 = ${blank(m)} blocks`]
          : [`Nether × 8 = Overworld: ${m} × 8 = ${blank(d)} blocks`],
        hint: toNether ? `The Nether is 8 times shorter. What is ${d} ÷ 8?` : `The Overworld is 8 times longer. What is ${m} × 8?`,
        explain: toNether ? `${d} ÷ 8 = <b>${m} blocks</b> in the Nether.` : `${m} × 8 = <b>${d} blocks</b> in the Overworld.`,
      };
    },
  };

  // A wall exactly as it appears in the level, drawn with the real block textures.
  function veinGrid(layout) {
    const ids = { coal: 'COAL_ORE', iron: 'IRON_ORE', diamond: 'DIAMOND_ORE', stone: 'STONE' };
    const tile = name => BQ.Art.tileDataURL(BQ.T[ids[name]], 2);
    return `<div class="vein-grid">${layout.map(name => `<img src="${tile(name)}" alt="${name}">`).join('')}</div>`;
  }

  // "n things every t seconds": find things for a longer time, or time for more things.
  function rateQuestion({ pairs, things, thingIcon, story, askThings, askTime }) {
    const [n, t] = pick(pairs);
    const m = ri(2, 5);
    const findThings = Math.random() < 0.6;
    const answer = findThings ? n * m : t * m;
    const given = findThings ? t * m : n * m;
    const Things = things[0].toUpperCase() + things.slice(1);
    return {
      prompt: `${story(n, t)} ${findThings ? askThings(given) : askTime(given)}`,
      visual: row(slot(thingIcon, n), label(`${n} ${things}`), label('='), slot('clock', 1), label(`${t} seconds`)) + ratioTable([
        { name: 'Seconds', iconName: 'clock', values: tableCols(m).map((c, i, a) => (i === a.length - 1 && !findThings ? null : t * c)) },
        { name: Things, iconName: thingIcon, values: tableCols(m).map((c, i, a) => (i === a.length - 1 && findThings ? null : n * c)) },
      ]),
      choices: numberChoices(answer, findThings ? [n + (given - t), given * n, answer + n, answer - n, given] : [t + (given - n), given * t, answer + t, answer - t, given]),
      answer: String(answer),
      steps: findThings
        ? [`${given} seconds ÷ ${t} = ${blank(m)} (how many times longer)`, `${n} ${things} × ${m} = ${blank(answer)} ${things}`]
        : [`${given} ${things} ÷ ${n} = ${blank(m)} (how many times more)`, `${t} seconds × ${m} = ${blank(answer)} seconds`],
      hint: `The ratio is ${n} ${things} : ${t} seconds. How many times bigger is ${given} than ${findThings ? t : n}? Multiply the other side by that too.`,
      explain: `${given} ÷ ${findThings ? t : n} = ${m}, so ${findThings ? n : t} × ${m} = <b>${answer} ${findThings ? things : 'seconds'}</b>.`,
    };
  }

  // "The pattern repeats; how many of one kind are in the whole thing?" The visual draws every
  // repeat of the pattern as a box, so the number of patterns can be seen, not just computed.
  function partWhole({ pairs, a: A, b: B, story, noun }) {
    const [a, b] = pick(pairs);
    const m = ri(2, 4);
    const total = (a + b) * m;
    const askB = Math.random() < 0.5;
    const ask = askB ? B : A;
    const part = askB ? b : a, other = askB ? a : b;
    const answer = part * m;
    const Name = ask.name[0].toUpperCase() + ask.name.slice(1);
    return {
      prompt: `${story(a, b, total)} How many are <b>${ask.name}</b>?`,
      visual:
        row(label('The pattern:'), patternRow([[...rep(A.icon, a), ...rep(B.icon, b)]]), label(`= ${a + b} ${noun}`)) +
        row(label(`All ${total} ${noun}:`)) + patternRow(rep(rep('?', a + b), m)),
      choices: numberChoices(answer, [other * m, total - part, total / part, m, part * (a + b), answer + part]),
      answer: String(answer),
      steps: [
        `How many ${noun} are in one pattern? ${a} + ${b} = ${blank(a + b)}`,
        `How many patterns make ${total} ${noun}? ${total} ÷ ${a + b} = ${blank(m)}`,
        `Each pattern has ${part} ${ask.name}. ${m} patterns × ${part} = ${blank(answer)} ${ask.name}`,
      ],
      hint: `One pattern is ${a + b} ${noun}. Count the boxes to see how many patterns there are, then count the ${ask.name} in all of them.`,
      explain: `One pattern = ${a} + ${b} = ${a + b} ${noun}. ${total} ÷ ${a + b} = ${m} patterns. ${Name}: ${m} × ${part} = <b>${answer}</b>.`,
    };
  }

  // ctx carries level data some questions depend on (like the ore wall's real counts).
  function make(name, ctx) {
    const gen = generators[name];
    if (!gen) throw new Error('Unknown question type: ' + name);
    return gen(ctx);
  }

  return { make, types: Object.keys(generators) };
})();
