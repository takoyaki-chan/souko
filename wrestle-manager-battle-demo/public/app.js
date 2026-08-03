(function () {
  'use strict';

  const root = document.getElementById('app');
  const { fighters, opponentByPlayer, statLabels } = window.WMDemoData;
  const config = window.WM_DEMO_CONFIG;
  const { trackEvent } = window.WMDemoAnalytics;

  const state = {
    screen: 'selection',
    playerId: null,
    opponentId: null,
    result: null,
    enginePromise: null,
    battleFrame: null,
    escapeTimer: null,
    runCount: 0,
    completionTracked: false,
  };

  const BattleMusic = {
    audio: null,
    start() {
      this.stop();
      try {
        const audio = new Audio('./bgm/production-ogg/wm_bgm_m01_v01.ogg');
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0.22;
        this.audio = audio;
        audio.play().catch(() => {});
      } catch (_) {
        this.audio = null;
      }
    },
    stop() {
      if (!this.audio) return;
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (_) {}
      this.audio = null;
    },
  };

  function fighterById(id) {
    return fighters.find((fighter) => fighter.id === Number(id)) || null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function focusApp() {
    window.requestAnimationFrame(() => root.focus({ preventScroll: true }));
  }

  function cleanupBattleFrame() {
    window.clearTimeout(state.escapeTimer);
    state.escapeTimer = null;
    state.battleFrame = null;
    BattleMusic.stop();
    document.body.classList.remove('battle-active');
  }

  function statBars(fighter) {
    return `<div class="demo-ability-bars">${statLabels.map(([key, label]) => `
      <div class="demo-ab-row">
        <span>${escapeHtml(label)}</span>
        <i><b class="${key}" style="width:${Math.max(0, Math.min(100, fighter[key]))}%"></b></i>
        <strong>${fighter[key]}</strong>
      </div>`).join('')}
    </div>`;
  }

  function fighterCard(fighter, selected) {
    return `<button class="demo-fighter-card${selected ? ' selected' : ''}" type="button" role="listitem"
      aria-pressed="${selected}" data-action="select-fighter" data-fighter-id="${fighter.id}">
      <div class="demo-fighter-art"><img src="${escapeHtml(fighter.image)}" alt="${escapeHtml(fighter.name)}"></div>
      <div class="demo-fighter-info">
        <div class="demo-fighter-head">
          <div><span>${escapeHtml(fighter.type)} / ${escapeHtml(fighter.style)}</span><h2>${escapeHtml(fighter.name)}</h2></div>
          <em><small>OVR</small>${fighter.ovr}</em>
        </div>
        ${statBars(fighter)}
        <p>${escapeHtml(fighter.description)}</p>
      </div>
      ${selected ? '<span class="demo-selected"><b>✓ PLAYER</b><small>選択中</small></span>' : ''}
    </button>`;
  }

  function renderSelection() {
    cleanupBattleFrame();
    state.screen = 'selection';
    state.result = null;
    state.completionTracked = false;
    const selected = fighterById(state.playerId);
    const opponent = selected ? fighterById(opponentByPlayer[selected.id]) : null;
    state.opponentId = opponent ? opponent.id : null;

    root.innerHTML = `<section class="demo-selection" aria-labelledby="selection-title">
      <div class="demo-section-head">
        <div>
          <p>WRESTLE-MANAGER / FREE BATTLE DEMO</p>
          <h1 id="selection-title">選手を選んで、1試合を観戦</h1>
          <span class="demo-battle-guide">選手ごとの能力とスタイルが、技の選択・命中・ダメージ・スタミナ消費・決着までの流れに影響します。技名や状態変化、試合ログを追いながら最後まで観戦できます。</span>
        </div>
        <strong>1 MATCH</strong>
      </div>
      <div class="demo-fighter-grid${selected ? ' has-selection' : ''}" role="list" aria-label="デモ選手一覧">
        ${fighters.map((fighter) => fighterCard(fighter, fighter.id === state.playerId)).join('')}
      </div>
      ${selected && opponent ? `<div class="demo-matchup" aria-label="対戦カード">
        <div><small>PLAYER</small><strong>${escapeHtml(selected.name)}</strong></div>
        <b>VS</b>
        <div class="right"><small>OPPONENT</small><strong>${escapeHtml(opponent.name)}</strong></div>
      </div>` : ''}
      <div class="demo-selection-actions">
        <button class="demo-start-button" type="button" data-action="confirm" ${selected ? '' : 'disabled'}>
          ${selected ? `${escapeHtml(selected.name)}で試合を始める` : '選手を選択してください'}
        </button>
      </div>
    </section>`;
    focusApp();
  }

  function renderLoading() {
    state.screen = 'loading';
    root.innerHTML = `<section class="demo-loading" aria-live="polite">
      <div class="waiting-pulse"></div>
      <p>ONE MATCH BATTLE</p>
      <h1>試合データを準備しています</h1>
      <span>選手の能力とスタイルから試合を組み立てています…</span>
    </section>`;
    focusApp();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-demo-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') resolve();
        else existing.addEventListener('load', resolve, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.demoSrc = src;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`${src} を読み込めませんでした。`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function loadEngine() {
    if (window.WMDemoEngine.isReady()) return Promise.resolve();
    if (!state.enginePromise) {
      state.enginePromise = loadScript('./shared/battle-data.js')
        .then(() => loadScript('./shared/match-engine.js'))
        .then(() => {
          if (!window.WMDemoEngine.isReady()) throw new Error('共有バトルエンジンの初期化に失敗しました。');
        })
        .catch((error) => {
          state.enginePromise = null;
          throw error;
        });
    }
    return state.enginePromise;
  }

  function createSeed(leftId, rightId) {
    const time = Date.now() & 0x7fffffff;
    return (time ^ (leftId * 2654435761) ^ (rightId * 1597334677) ^ state.runCount) | 0 || 1;
  }

  function battleFighter(fighter) {
    return {
      ...fighter,
      portraitUrl: `../image/face_${fighter.assetKey}.png`,
      profile: '',
      vl: Array.isArray(fighter.vl) ? fighter.vl.slice() : ['…！'],
      vsExHit: [],
    };
  }

  function startPayload(player, opponent) {
    return {
      type: 'START_MATCH',
      left: battleFighter(player),
      right: battleFighter(opponent),
      result: state.result,
      matchInfo: {
        header: 'Wrestle-Manager 無料バトルデモ',
        subHeader: `${player.name} vs ${opponent.name}`,
        matchNum: 1,
        totalMatches: 1,
        isTitle: false,
        isSpecialMatch: false,
        matchTier: 1,
        h2hRecord: null,
        rivalryTier: 0,
        leftPersonality: player.personality || 'normal',
        leftArchetype: player.archetype || 'standard',
        rightPersonality: opponent.personality || 'normal',
        rightArchetype: opponent.archetype || 'standard',
        sfxMasterVol: 0.85,
        bgmMasterVol: 0.75,
      },
    };
  }

  async function beginBattle() {
    const player = fighterById(state.playerId);
    const opponent = fighterById(state.opponentId);
    if (!player || !opponent) return;
    BattleMusic.start();
    renderLoading();
    try {
      await loadEngine();
      state.result = window.WMDemoEngine.simulate(player, opponent, createSeed(player.id, opponent.id));
      if (!state.result || !Array.isArray(state.result.frames) || state.result.frames.length === 0) {
        throw new Error('試合フレームが生成されませんでした。');
      }
      state.runCount += 1;
      state.completionTracked = false;
      trackEvent('battle_start', { player: player.name, opponent: opponent.name });
      renderProductBattle(player, opponent);
    } catch (error) {
      renderError(error);
    }
  }

  function renderProductBattle(player, opponent) {
    state.screen = 'battle';
    document.body.classList.add('battle-active');
    root.innerHTML = `<section class="demo-battle-frame" aria-label="${escapeHtml(player.name)}対${escapeHtml(opponent.name)}の試合">
      <iframe title="バトル画面：${escapeHtml(player.name)}対${escapeHtml(opponent.name)}" allow="autoplay"></iframe>
      <button class="demo-battle-exit" type="button" data-action="new-rematch">✕ 選手選択へ戻る</button>
    </section>`;
    const iframe = root.querySelector('iframe');
    state.battleFrame = iframe;
    const payload = startPayload(player, opponent);
    let sent = false;
    const sendOnce = () => {
      if (sent || state.battleFrame !== iframe || !iframe.contentWindow) return;
      sent = true;
      iframe.contentWindow.postMessage(payload, window.location.origin);
    };
    iframe.addEventListener('load', () => window.setTimeout(sendOnce, 150), { once: true });
    iframe.src = `./battle/battle-engine.html?demo=${Date.now()}`;
    window.setTimeout(sendOnce, 850);
    state.escapeTimer = window.setTimeout(() => {
      const escapeButton = root.querySelector('.demo-battle-exit');
      if (escapeButton) escapeButton.classList.add('visible');
    }, 8000);
  }

  function trackBattleComplete() {
    if (state.completionTracked || !state.result) return;
    state.completionTracked = true;
    const player = fighterById(state.playerId);
    const opponent = fighterById(state.opponentId);
    const winner = state.result.winner === 'left' ? player : state.result.winner === 'right' ? opponent : null;
    trackEvent('battle_complete', {
      player: player ? player.name : '',
      opponent: opponent ? opponent.name : '',
      winner: winner ? winner.name : 'draw',
      finish: state.result.finType || '',
      move: state.result.finMove || '',
      turns: state.result.turns || 0,
    });
  }

  function formatFinish(type, move) {
    if (!move) return type || '激闘決着';
    if (type === 'フォール' || type === 'ピン') return `${move} → 3カウント`;
    if (type === 'ギブアップ') return `${move} → ギブアップ`;
    if (type === 'TKO') return `${move} → レフェリーストップ`;
    if (type === '丸め込み') return `${move} → 丸め込み`;
    return `${move} (${type || '決着'})`;
  }

  function formatJapaneseTime(turns) {
    const seconds = Math.max(0, Number(turns || 0) * 18);
    return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`;
  }

  function validProductUrl(value) {
    if (!value) return '';
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function productLinks() {
    const labels = { booth: 'BOOTHで製品版を見る', dlsite: 'DLsiteで製品版を見る', fanza: 'FANZAで製品版を見る' };
    const links = Object.entries(config.productLinks || {})
      .map(([store, value]) => [store, validProductUrl(value)])
      .filter((entry) => entry[1]);
    if (links.length === 0) return '';
    return `<div class="demo-store-links" aria-label="製品版販売ページ">${links.map(([store, url]) => `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-action="product-link" data-store="${escapeHtml(store)}">${escapeHtml(labels[store] || '製品版を見る')}</a>
    `).join('')}</div>`;
  }

  function renderEnd() {
    trackBattleComplete();
    cleanupBattleFrame();
    state.screen = 'end';
    const player = fighterById(state.playerId);
    const opponent = fighterById(state.opponentId);
    const winner = state.result.winner === 'left' ? player : state.result.winner === 'right' ? opponent : null;
    root.innerHTML = `<section class="demo-result" aria-labelledby="result-title">
      <p>MATCH COMPLETE</p>
      <h1 id="result-title">${winner ? `${escapeHtml(winner.name)} 勝利` : '時間切れ引き分け'}</h1>
      <div class="demo-result-summary">
        <div><small>決まり手</small><strong>${escapeHtml(formatFinish(state.result.finType, state.result.finMove))}</strong></div>
        <div><small>試合時間</small><strong>${formatJapaneseTime(state.result.turns)}</strong></div>
      </div>
      <div class="demo-product-message">
        <strong>能力とスタイルの違いが、一試合ごとの攻防を変えます。</strong>
        <span>技名、ダメージ、状態変化、フォール／ギブアップの進行は、試合中のログから確認できます。</span>
      </div>
      <div class="demo-result-actions">
        <button type="button" data-action="same-rematch">同じ組み合わせでもう一度</button>
        <button type="button" data-action="new-rematch">別の対戦を選ぶ</button>
      </div>
      ${productLinks()}
    </section>`;
    focusApp();
  }

  function renderError(error) {
    cleanupBattleFrame();
    state.screen = 'error';
    root.innerHTML = `<section class="demo-error" role="alert">
      <p>LOAD ERROR</p>
      <h1>試合を開始できませんでした</h1>
      <span>${escapeHtml(error && error.message ? error.message : 'ページを再読み込みしてください。')}</span>
      <button type="button" data-action="new-rematch">選手選択へ戻る</button>
    </section>`;
    focusApp();
  }

  window.addEventListener('message', (event) => {
    const iframe = state.battleFrame;
    if (!iframe || event.source !== iframe.contentWindow || event.origin !== window.location.origin || !event.data) return;
    if (event.data.type === 'BATTLE_FINISH_CUE') {
      trackBattleComplete();
    } else if (event.data.type === 'MATCH_RESULT') {
      renderEnd();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'home') {
      event.preventDefault();
      state.playerId = null;
      state.opponentId = null;
      renderSelection();
    } else if (action === 'select-fighter') {
      state.playerId = Number(target.dataset.fighterId);
      state.opponentId = opponentByPlayer[state.playerId];
      renderSelection();
    } else if (action === 'confirm') {
      beginBattle();
    } else if (action === 'same-rematch') {
      trackEvent('rematch', { mode: 'same', player: fighterById(state.playerId).name, opponent: fighterById(state.opponentId).name });
      beginBattle();
    } else if (action === 'new-rematch') {
      trackEvent('rematch', { mode: 'different' });
      state.playerId = null;
      state.opponentId = null;
      renderSelection();
    } else if (action === 'product-link') {
      trackEvent('product_link_click', { store: target.dataset.store || 'unknown' });
    }
  });

  window.addEventListener('pagehide', cleanupBattleFrame);
  renderSelection();
  trackEvent('demo_page_view', { path: window.location.pathname });
})();
