// Screens, menus, the question modal and the HUD. Owns the current player and game instance.
window.BQ = window.BQ || {};

BQ.UI = (() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let player = null;
  let game = null;
  let draftLook = null;
  let quiz = null;
  let toastTimer = null;
  let loops = {};
  let recipeSpread = 0;
  let recipesPausedGame = false;

  // ---------- Screens ----------
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    Object.keys(loops).forEach(k => { if (k !== id) stopLoop(k); });
    if (id === 'screen-title') startTitleLoop();
    if (id === 'screen-create') startPreviewLoop();
  }

  function startLoop(key, fn) {
    stopLoop(key);
    const tick = t => { fn(t / 1000); loops[key] = requestAnimationFrame(tick); };
    loops[key] = requestAnimationFrame(tick);
  }
  function stopLoop(key) {
    if (loops[key]) cancelAnimationFrame(loops[key]);
    delete loops[key];
  }

  // ---------- Title ----------
  function startTitleLoop() {
    const c = $('#title-bg');
    const g = c.getContext('2d');
    const heights = [];
    for (let i = 0; i < 400; i++) heights.push(Math.round(3 * Math.sin(i * 0.15) + 2 * Math.sin(i * 0.05 + 1) + Math.sin(i * 0.5)));
    startLoop('screen-title', t => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
      g.imageSmoothingEnabled = false;
      const ts = Math.max(32, Math.round(c.height / 14));
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0, '#5b8ae8');
      grad.addColorStop(1, '#b5ceff');
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
      const scroll = t * 0.8;
      const cols = Math.ceil(c.width / ts) + 2;
      const base = Math.floor(c.height / ts) - 4;
      for (let i = 0; i < cols; i++) {
        const wx = Math.floor(scroll) + i;
        const h = base + heights[wx % heights.length];
        const x = Math.round((i - (scroll % 1)) * ts);
        for (let y = h; y * ts < c.height; y++) {
          const id = y === h ? BQ.T.GRASS : y < h + 3 ? BQ.T.DIRT : BQ.T.STONE;
          g.drawImage(BQ.Art.tile(id), x, y * ts, ts, ts);
        }
        if (wx % 11 === 3) {
          for (let y = h - 4; y < h; y++) g.drawImage(BQ.Art.tile(BQ.T.LOG), x, y * ts, ts, ts);
          for (let dx = -2; dx <= 2; dx++)
            for (let y = h - 7; y <= h - 5; y++) g.drawImage(BQ.Art.tile(BQ.T.LEAVES), x + dx * ts, y * ts, ts, ts);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, 0, c.width, c.height);
    });
  }

  // ---------- Players ----------
  function renderPlayers() {
    const list = $('#player-list');
    list.innerHTML = '';
    BQ.Storage.listPlayers().forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      const done = Object.values(p.levels).filter(l => l.completed).length;
      card.innerHTML = `
        <canvas width="64" height="96"></canvas>
        <div class="name">${escapeHTML(p.name)}</div>
        <div class="meta"><img src="${BQ.Art.icon('emerald')}" style="width:14px;height:14px;vertical-align:middle"> ${p.emeralds} &nbsp; Worlds: ${done}</div>
        <div class="meta">Played ${timeAgo(p.updatedAt)}</div>
        <div class="btns">
          <button class="mc-btn small green" data-play="${p.id}">Play</button>
          <button class="mc-btn small red" data-delete="${p.id}">Delete</button>
        </div>`;
      BQ.Art.drawAvatar(card.querySelector('canvas'), p.look);
      list.appendChild(card);
    });
    const add = document.createElement('div');
    add.className = 'player-card new';
    add.dataset.action = 'new-player';
    add.innerHTML = '<div class="plus">+</div><div>New Player</div>';
    list.appendChild(add);
  }

  function timeAgo(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} days ago`;
  }

  // ---------- Create ----------
  function openCreate() {
    draftLook = BQ.Art.defaultLook();
    $('#player-name').value = '';
    $('#create-error').hidden = true;
    renderLookOptions();
    show('screen-create');
    setTimeout(() => $('#player-name').focus(), 50);
  }

  function renderLookOptions() {
    const opts = BQ.Art.LOOK_OPTIONS;
    $$('#screen-create .swatches').forEach(el => {
      const part = el.dataset.part;
      el.innerHTML = opts[part].map(col =>
        `<div class="swatch ${draftLook[part] === col ? 'selected' : ''}" style="background:${col}" data-part="${part}" data-value="${col}" role="button" aria-label="${part} ${col}"></div>`).join('');
    });
    $$('#screen-create .choices').forEach(el => {
      const part = el.dataset.part;
      el.innerHTML = opts[part].map(v =>
        `<button class="choice ${draftLook[part] === v ? 'selected' : ''}" data-part="${part}" data-value="${v}">${v}</button>`).join('');
    });
  }

  function startPreviewLoop() {
    const c = $('#create-preview');
    startLoop('screen-create', t => {
      const facing = Math.floor(t / 3) % 2 ? -1 : 1;
      BQ.Art.drawAvatar(c, draftLook, { walk: t * 6, moving: true, facing });
    });
  }

  function createPlayer() {
    const name = $('#player-name').value.trim();
    const err = $('#create-error');
    if (!name) {
      err.textContent = 'Type a name for your player!';
      err.hidden = false;
      $('#player-name').focus();
      return;
    }
    player = BQ.Storage.createPlayer({ name, look: Object.assign({}, draftLook) });
    BQ.Audio.play('levelup');
    openMap();
  }

  // ---------- Map ----------
  function openMap() {
    player = BQ.Storage.getPlayer(player.id) || player;
    $('#map-greeting').textContent = `Hi, ${player.name}!`;
    $('#map-recipes').textContent = `Recipe Book (${player.recipes.length}/${recipePages().length})`;
    BQ.Art.drawAvatar($('#map-avatar'), player.look);
    const total = player.stats.correct + player.stats.wrong;
    const acc = total ? Math.round((player.stats.correct / total) * 100) + '%' : '-';
    $('#map-stats').innerHTML = `
      <span><img src="${BQ.Art.icon('emerald')}"> ${player.emeralds} emeralds</span>
      <span>XP ${player.xp}</span>
      <span>Correct answers: ${player.stats.correct}</span>
      <span>Accuracy: ${acc}</span>`;

    const list = $('#level-list');
    list.innerHTML = '';
    BQ.Levels.order.forEach(id => {
      const lv = BQ.Levels[id];
      const st = player.levels[id] || { completed: false, bestStars: 0, stationsDone: [] };
      const inProgress = st.stationsDone.length > 0;
      const label = inProgress ? `Continue (${st.stationsDone.length}/${lv.stations.length})` : st.completed ? 'Play Again' : 'Play';
      const card = document.createElement('div');
      card.className = 'level-card';
      card.style.backgroundImage = `url(${BQ.Art.tileDataURL(lv.cardTile, 3)})`;
      card.innerHTML = `
        <span class="demo-tag">DEMO</span>
        <div class="lv-name">${lv.name}</div>
        <div class="lv-skill">Skill: ${lv.skill}</div>
        <div class="lv-desc">${lv.description}</div>
        <div class="lv-stars">${stars(st.bestStars)}</div>
        <button class="mc-btn green" data-level="${id}">${label}</button>`;
      list.appendChild(card);
    });
    BQ.Levels.comingSoon.forEach(lv => {
      const card = document.createElement('div');
      card.className = 'level-card locked';
      card.style.backgroundImage = `url(${BQ.Art.tileDataURL(lv.tile, 3)})`;
      card.innerHTML = `
        <div class="lv-name">${lv.name}</div>
        <div class="lv-skill">Skill: ${lv.skill}</div>
        <div class="lv-desc">Coming soon...</div>
        <button class="mc-btn" disabled>Locked</button>`;
      list.appendChild(card);
    });
    show('screen-map');
  }

  function stars(n, total = 3) {
    return Array.from({ length: total }, (_, i) => (i < n ? '★' : '<span class="off">★</span>')).join('');
  }

  // ---------- Game ----------
  function startLevel(levelId) {
    if (game) game.destroy();
    show('screen-game');
    hideAllOverlays();
    const lv = BQ.Levels[levelId];
    $('#hud-level').textContent = lv.name;
    game = new BQ.Game($('#game-canvas'), player, levelId, {
      onStation: openQuiz,
      onHud: renderHud,
      onToast: toast,
      onPauseRequest: openPause,
      onComplete: showComplete,
    });
    const intro = game.resumed
      ? [`Welcome back, <b>${escapeHTML(player.name)}</b>!`, `You're at checkpoint ${game.state.stationsDone.length} of ${lv.stations.length}. Keep going!`]
      : lv.intro;
    message(lv.name, intro.map(p => `<p>${p}</p>`).join(''), [
      { label: "Let's Go!", cls: 'green', fn: () => { hide('#message'); game.setPaused(false); } },
    ]);
  }

  function leaveGame() {
    if (game) game.destroy();
    game = null;
    hideAllOverlays();
    openMap();
  }

  function renderHud(h) {
    $('#hud-hearts').innerHTML = Array.from({ length: h.maxHearts }, (_, i) =>
      `<img src="${BQ.Art.icon(i < h.hearts ? 'heart' : 'heartEmpty')}" alt="">`).join('');
    $('#hud-emeralds').textContent = h.emeralds;
    $('#hud-emerald-icon').src = BQ.Art.icon('emerald');
    $('#hud-progress').innerHTML = h.stations.map(s =>
      `<div class="step ${s.done ? 'done' : ''}" title="${s.title}"><img src="${BQ.Art.icon(s.icon)}" alt=""></div>`).join('');
  }

  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3000);
  }

  function hide(sel) { $(sel).hidden = true; }
  function hideAllOverlays() { ['#quiz', '#pause', '#message', '#toast'].forEach(hide); quiz = null; }

  function message(title, bodyHTML, buttons) {
    $('#message-title').textContent = title;
    $('#message-body').innerHTML = bodyHTML;
    const wrap = $('#message-buttons');
    wrap.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'mc-btn ' + (b.cls || '');
      btn.textContent = b.label;
      btn.addEventListener('click', () => { BQ.Audio.play('click'); b.fn(); });
      wrap.appendChild(btn);
    });
    $('#message').hidden = false;
    setTimeout(() => wrap.querySelector('button')?.focus(), 30);
  }

  function openPause() {
    if (!game || quiz) return;
    game.setPaused(true);
    updateSoundLabels();
    $('#pause').hidden = false;
  }

  function showComplete({ stars: n, mistakes, bonus }) {
    const praise = n === 3 ? 'Perfect! You are a Ratio Master!' : n === 2 ? 'Great job, adventurer!' : 'You made it! Play again to earn more stars.';
    message('Level Complete!', `
      <div class="big-stars">${stars(n)}</div>
      <p>${praise}</p>
      <div class="result-grid">
        <span>Mistakes</span><span>${mistakes}</span>
        <span>Star bonus</span><span>+${bonus} emeralds</span>
        <span>Total emeralds</span><span>${player.emeralds}</span>
      </div>`, [
      { label: 'World Map', cls: 'green', fn: leaveGame },
      { label: 'Play Again', fn: () => startLevel(game.level.id) },
    ]);
  }

  // ---------- Quiz ----------
  function openQuiz(station) {
    quiz = { station, q: null, answered: false, correct: false, fainted: false, first: true };
    $('#quiz-icon').src = BQ.Art.icon(station.icon);
    $('#quiz-title').textContent = station.title;
    $('#quiz').hidden = false;
    nextQuestion();
  }

  function nextQuestion() {
    const s = quiz.station;
    const type = s.questions[s.progress];
    const q = BQ.Questions.make(type, game.stationContext(s));
    Object.assign(quiz, { q, type, answered: false, correct: false, stepIdx: 0 });
    $('#quiz-pips').innerHTML = s.questions.map((_, i) => `<span class="${i < s.progress ? 'on' : ''}"></span>`).join('');
    $('#quiz-speech').innerHTML = quiz.first ? s.speech : '';
    quiz.first = false;
    $('#quiz-prompt').innerHTML = q.prompt;
    $('#quiz-visual').innerHTML = q.visual;
    $('#quiz-choices').innerHTML = q.choices.map((c, i) =>
      `<button class="choice-btn" data-choice="${escapeHTML(c)}"><span class="key">${i + 1}</span>${escapeHTML(c)}</button>`).join('');
    $('#quiz-feedback').hidden = true;
    $('#quiz-book-btn').hidden = !q.steps;
    // If the kid had the worksheet open, keep it open for the next problem.
    if (quiz.bookOpen && q.steps) renderBook();
    else $('#quiz-book').hidden = true;
    $('.quiz-card').scrollTop = 0;
  }

  // ---------- Book & Quill ----------
  // The hint: a tip plus the problem broken into steps, shown one at a time, each blank checked.
  // Mistakes in the book never cost hearts, and the answer choices stay usable the whole time.
  function renderBook() {
    $('#book-quill').src = BQ.Art.icon('quill');
    $('#book-sub').textContent = 'Mistakes in here cost no hearts.';
    $('#book-tip').innerHTML = `<b>Tip:</b> ${quiz.q.hint}`;
    $('#book-steps').innerHTML = quiz.q.steps.map((step, i) => {
      const html = escapeHTML(step).replace(/\{\{(\d+)\}\}/g, (_, n) =>
        `<input class="blank" inputmode="numeric" autocomplete="off" maxlength="4" data-answer="${n}" aria-label="blank">`);
      return `<li data-step="${i}">${html}<button class="mc-btn small green book-check" data-action="book-check">Check</button></li>`;
    }).join('');
    quiz.stepIdx = 0;
    $('#book-msg').textContent = `Step 1 of ${quiz.q.steps.length}`;
    $('#quiz-book').hidden = false;
    updateBookSteps();
    focusBlank();
  }

  function updateBookSteps() {
    $$('#book-steps li').forEach((li, i) => {
      li.classList.toggle('done', i < quiz.stepIdx);
      li.classList.toggle('current', i === quiz.stepIdx);
      li.classList.toggle('locked', i > quiz.stepIdx);
      li.querySelectorAll('.blank').forEach(inp => (inp.disabled = i !== quiz.stepIdx));
    });
  }

  function focusBlank() {
    setTimeout(() => {
      const inp = [...$$('#book-steps .blank')].find(b => !b.disabled && !b.classList.contains('ok'));
      if (inp) inp.focus();
    }, 40);
  }

  function checkStep() {
    if (!quiz || $('#quiz-book').hidden || quiz.stepIdx >= quiz.q.steps.length) return;
    const li = $(`#book-steps li[data-step="${quiz.stepIdx}"]`);
    const blanks = [...li.querySelectorAll('.blank')];
    let allOk = true;
    blanks.forEach(inp => {
      const ok = inp.value.trim() === inp.dataset.answer;
      inp.classList.toggle('ok', ok);
      inp.classList.remove('bad');
      if (!ok) { void inp.offsetWidth; inp.classList.add('bad'); allOk = false; }
    });
    if (!allOk) {
      BQ.Audio.play('click');
      $('#book-msg').textContent = 'Not quite. Fix the red box and check again. Read the tip at the top if you are stuck!';
      focusBlank();
      return;
    }
    BQ.Audio.play('pop');
    quiz.stepIdx++;
    updateBookSteps();
    if (quiz.stepIdx < quiz.q.steps.length) {
      $('#book-msg').textContent = `Nice! Step ${quiz.stepIdx + 1} of ${quiz.q.steps.length}.`;
      focusBlank();
      return;
    }
    $('#book-msg').textContent = 'Great work! Now pick your answer below.';
    setTimeout(() => $('#quiz-choices .choice-btn:not(:disabled)')?.focus(), 40);
  }

  function toggleBook() {
    if (!quiz || !quiz.q.steps) return;
    quiz.bookOpen = $('#quiz-book').hidden;
    if (quiz.bookOpen) renderBook();
    else $('#quiz-book').hidden = true;
  }

  function answer(choice) {
    if (!quiz || quiz.answered) return;
    quiz.answered = true;
    const q = quiz.q, s = quiz.station;
    const correct = choice === q.answer;
    quiz.correct = correct;
    $$('#quiz-choices .choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.choice === q.answer) b.classList.add('correct');
      else if (b.dataset.choice === choice) b.classList.add('wrong');
    });
    quiz.fainted = game.recordAnswer(correct);
    const fb = $('#quiz-feedback');
    const btn = fb.querySelector('button');
    if (correct) {
      s.progress++;
      $('#quiz-pips').innerHTML = s.questions.map((_, i) => `<span class="${i < s.progress ? 'on' : ''}"></span>`).join('');
      const done = s.progress >= s.questions.length;
      fb.className = 'quiz-feedback good';
      $('#quiz-feedback-text').innerHTML = `<div class="big-line">Correct! +1 emerald</div><div>${q.explain}</div>`;
      btn.textContent = done ? 'Finish' : 'Next Question';
    } else {
      fb.className = 'quiz-feedback bad';
      $('#quiz-feedback-text').innerHTML = `<div class="big-line">${quiz.fainted ? 'Out of hearts!' : 'Not quite. -1 heart'}</div><div>${q.explain}</div>`
        + (quiz.fainted ? '<div>You fainted. You will respawn at the last checkpoint with full hearts.</div>' : '<div>Here comes a new one. You can do it!</div>');
      btn.textContent = quiz.fainted ? 'Respawn' : 'Try Another';
      const card = $('.quiz-card');
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }
    fb.hidden = false;
    setTimeout(() => btn.focus(), 30);
  }

  function quizContinue() {
    if (!quiz || !quiz.answered) return;
    const s = quiz.station;
    if (quiz.fainted) {
      closeQuizPanel();
      game.faint();
      toast('You fainted! Back to the checkpoint with full hearts.');
    } else if (quiz.correct && s.progress >= s.questions.length) {
      closeQuizPanel();
      game.completeStation(s);
    } else {
      nextQuestion();
    }
  }

  function quizLeave() {
    if (!quiz) return;
    closeQuizPanel();
    game.closeStation();
  }

  function closeQuizPanel() {
    $('#quiz').hidden = true;
    quiz = null;
  }

  // ---------- Recipe Book ----------
  function recipePages() {
    return BQ.Levels.order.flatMap(levelId => {
      const lv = BQ.Levels[levelId];
      return lv.stations.filter(s => s.page).map(s => Object.assign({ id: `${levelId}/${s.id}`, level: lv.name, station: s.title, icon: s.icon }, s.page));
    });
  }

  function openRecipes() {
    if (!player) return;
    if (game && !game.paused) {
      game.setPaused(true);
      recipesPausedGame = true;
    }
    recipeSpread = 0;
    renderRecipes();
    $('#recipes').hidden = false;
  }

  function closeRecipes() {
    $('#recipes').hidden = true;
    if (recipesPausedGame && game) game.setPaused(false);
    recipesPausedGame = false;
  }

  function renderRecipes() {
    const pages = recipePages();
    const found = pages.filter(p => player.recipes.includes(p.id)).length;
    const cover = `
      <h3><img src="${BQ.Art.icon('book')}" alt="">${escapeHTML(player.name)}'s Recipe Book</h3>
      <p>Every station you clear adds a page of ratio tricks. Come back here whenever you need a reminder!</p>
      <p><b>${found} of ${pages.length}</b> pages found</p>
      <ol class="rb-toc">${pages.map(p => (player.recipes.includes(p.id) ? `<li>${p.title}</li>` : '<li class="locked">???</li>')).join('')}</ol>`;
    const all = [cover, ...pages.map((p, i) => player.recipes.includes(p.id)
      ? `<div class="rb-from">${p.level} · ${p.station}</div><h3><img src="${BQ.Art.icon(p.icon)}" alt="">${p.title}</h3><div>${p.body}</div><div class="rb-pnum">${i + 1}</div>`
      : `<div class="rb-locked"><img src="${BQ.Art.icon(p.icon)}" alt=""><h3 style="justify-content:center">???</h3><p>Clear the <b>${p.station}</b> in ${p.level} to unlock this page.</p></div><div class="rb-pnum">${i + 1}</div>`)];
    const spreads = Math.ceil(all.length / 2);
    recipeSpread = Math.max(0, Math.min(spreads - 1, recipeSpread));
    $('#rb-left').innerHTML = all[recipeSpread * 2] || '';
    $('#rb-right').innerHTML = all[recipeSpread * 2 + 1] || '';
    $('#rb-count').textContent = `${recipeSpread + 1} / ${spreads}`;
    $('[data-action=rb-prev]').disabled = recipeSpread === 0;
    $('[data-action=rb-next]').disabled = recipeSpread === spreads - 1;
  }

  // ---------- Sound ----------
  function updateSoundLabels() {
    const label = `Sound: ${BQ.Audio.isMuted() ? 'Off' : 'On'}`;
    $('#title-sound').textContent = label;
    $('#pause-sound').textContent = label;
  }

  // ---------- Events ----------
  const actions = {
    'start': () => { renderPlayers(); show('screen-players'); },
    'toggle-sound': () => { BQ.Audio.setMuted(!BQ.Audio.isMuted()); updateSoundLabels(); },
    'back-title': () => show('screen-title'),
    'back-players': () => { renderPlayers(); show('screen-players'); },
    'new-player': openCreate,
    'randomize': () => { draftLook = BQ.Art.randomLook(); renderLookOptions(); },
    'create-player': createPlayer,
    'pause': openPause,
    'resume': () => { hide('#pause'); game.setPaused(false); },
    'restart-level': () => {
      const st = game.state;
      st.stationsDone = [];
      st.mistakes = 0;
      BQ.Storage.savePlayer(player);
      startLevel(game.level.id);
    },
    'quit-map': leaveGame,
    'quiz-continue': quizContinue,
    'quiz-leave': quizLeave,
    'quiz-book': toggleBook,
    'book-check': checkStep,
    'open-recipes': openRecipes,
    'close-recipes': closeRecipes,
    'rb-prev': () => { recipeSpread--; renderRecipes(); },
    'rb-next': () => { recipeSpread++; renderRecipes(); },
  };

  document.addEventListener('click', e => {
    BQ.Audio.unlock();
    const el = e.target.closest('[data-action],[data-play],[data-delete],[data-level],[data-choice],[data-part]');
    if (!el) return;
    if (el.dataset.choice !== undefined) return answer(el.dataset.choice);
    BQ.Audio.play('click');
    if (el.dataset.action) return actions[el.dataset.action]?.();
    if (el.dataset.play) {
      player = BQ.Storage.getPlayer(el.dataset.play);
      return openMap();
    }
    if (el.dataset.delete) {
      const p = BQ.Storage.getPlayer(el.dataset.delete);
      if (p && confirm(`Delete ${p.name}? Their progress will be gone forever.`)) {
        BQ.Storage.deletePlayer(p.id);
        renderPlayers();
      }
      return;
    }
    if (el.dataset.level) return startLevel(el.dataset.level);
    if (el.dataset.part) {
      draftLook[el.dataset.part] = el.dataset.value;
      renderLookOptions();
    }
  });

  document.addEventListener('keydown', e => {
    if (!$('#recipes').hidden) {
      e.stopPropagation();
      if (e.code === 'Escape') closeRecipes();
      else if (e.code === 'ArrowLeft') actions['rb-prev']();
      else if (e.code === 'ArrowRight') actions['rb-next']();
      return;
    }
    if (quiz) {
      e.stopPropagation();
      // Typing in a Book & Quill blank: Enter checks the step, everything else is just typing.
      if (e.target.classList && e.target.classList.contains('blank')) {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); checkStep(); }
        else if (e.code === 'Escape') quizLeave();
        return;
      }
      if (!quiz.answered && /^Digit[1-4]$/.test(e.code)) {
        const btns = $$('#quiz-choices .choice-btn');
        const b = btns[Number(e.code.slice(5)) - 1];
        if (b) answer(b.dataset.choice);
      } else if (e.code === 'KeyH' || e.code === 'KeyB') toggleBook();
      else if (e.code === 'Escape') quizLeave();
      else if (quiz.answered && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); quizContinue(); }
      return;
    }
    if (!$('#pause').hidden && e.code === 'Escape') { e.stopPropagation(); actions.resume(); }
    if ($('#screen-create').classList.contains('active') && e.code === 'Enter') createPlayer();
  });

  // Touch controls
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch');
  $$('.touch-controls button').forEach(btn => {
    const key = btn.dataset.key;
    const set = down => e => {
      e.preventDefault();
      btn.classList.toggle('down', down);
      if (game && !game.paused) game.setKey(key, down);
      else if (game && !down) game.setKey(key, false);
    };
    btn.addEventListener('pointerdown', set(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, set(false)));
  });

  // Boot
  $$('.book-icon').forEach(img => (img.src = BQ.Art.icon('book')));
  $$('.quill-icon').forEach(img => (img.src = BQ.Art.icon('quill')));
  document.documentElement.style.setProperty('--dirt', `url(${BQ.Art.tileDataURL(BQ.T.DIRT)})`);
  updateSoundLabels();
  show('screen-title');

  // `game` is exposed for debugging from the browser console.
  return { show, get game() { return game; } };
})();
