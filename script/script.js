const TOTAL_SYMBOLS = 21;
const REEL_IMAGE_HEIGHT = 1911; // reel.png / reel_c.png の高さ (px)
const SYMBOL_HEIGHT = REEL_IMAGE_HEIGHT / TOTAL_SYMBOLS;
const REEL_OFFSET_Y = 25; // 図柄を枠の中央に寄せるための表示オフセット (px)
const SNAP_DURATION_MS = 200;
const FLAG_DENOMINATOR = 65536;
const SLIP_RANGE = [0, 4];
const SETTING_RANGE = [1, 6];

const state = {
  slip: 0,                    // 滑りコマ数
  setting: 1,                 // 設定
  showsPressPosition: false,  // true: 表示中のリール位置をボタン押下位置とみなす, false: 停止位置とみなす
  isCenterFirst: false,       // true: 中1st, false: 左1st
  reelPosition: TOTAL_SYMBOLS, // 表示中のリール位置 (1〜21)
};

const el = {
  reel: document.getElementById('reel'),
  slipValue: document.getElementById('slip-value'),
  settingValue: document.getElementById('setting-value'),
  bbFlags: document.getElementById('bb-flags'),
  rbFlags: document.getElementById('rb-flags'),
  bbTotal: document.getElementById('bb-total'),
  rbTotal: document.getElementById('rb-total'),
  prizes: document.getElementById('prizes'),
};

// ---------- データ検証 ----------

// data.js の編集ミス（行・列の数え間違いなど）を早期に気付けるようにする
function validateData() {
  const errors = [];
  const checkMap = (label, map, columnCount) => {
    for (const [order, rows] of Object.entries(map)) {
      if (rows.length !== TOTAL_SYMBOLS) {
        errors.push(`${label}.${order}: 行数が ${rows.length} (期待値 ${TOTAL_SYMBOLS})`);
      }
      rows.forEach((row, i) => {
        if (row.length !== columnCount[order]) {
          errors.push(`${label}.${order}[${i}]: 列数が ${row.length} (期待値 ${columnCount[order]})`);
        }
      });
    }
  };
  checkMap('FLAG_MAP', FLAG_MAP, { left: FLAGS.length, center: FLAGS.length });
  checkMap('PRIZE_MAP', PRIZE_MAP, { left: PRIZE_NAMES.left.length, center: PRIZE_NAMES.center.length });
  FLAGS.forEach((flag) => {
    if (flag.nums.length !== SETTING_RANGE[1]) errors.push(`FLAGS ${flag.name}: 置数が ${flag.nums.length} 個`);
  });
  errors.forEach((message) => console.error(`[data.js] ${message}`));
}

// ---------- 計算 ----------

// value を min〜max の範囲で循環させる
function wrap(value, min, max) {
  const range = max - min + 1;
  return ((value - min) % range + range) % range + min;
}

function sum(arr) {
  return arr.reduce((acc, cur) => acc + cur, 0);
}

function pressOrderKey() {
  return state.isCenterFirst ? 'center' : 'left';
}

// ボタン押下時のリール位置 (1〜21)
function getPressedPosition() {
  const slip = state.showsPressPosition ? 0 : state.slip;
  return wrap(state.reelPosition - 1 - slip, 1, TOTAL_SYMBOLS);
}

function getMapRow(map, pressedPosition) {
  return map[pressOrderKey()][TOTAL_SYMBOLS - pressedPosition];
}

function findFlags(pressedPosition) {
  const row = getMapRow(FLAG_MAP, pressedPosition);
  return FLAGS
    .filter((_, i) => row[i] === state.slip)
    .map((flag) => ({ flag, num: flag.nums[state.setting - 1] }));
}

function findPrizes(pressedPosition) {
  const row = getMapRow(PRIZE_MAP, pressedPosition);
  const names = PRIZE_NAMES[pressOrderKey()].filter((_, i) => row[i] === state.slip);
  return [...new Set(names)];
}

function getBadgeColor(flag, pressedPosition) {
  if (!flag.leftRanges) return flag.color;
  if (state.isCenterFirst) return null;
  const inRange = flag.leftRanges.some(([from, to]) => pressedPosition >= from && pressedPosition <= to);
  return inRange ? flag.color : null;
}

// ---------- 描画 ----------

function createBadge(name, valueText, color) {
  const badge = document.createElement('div');
  badge.className = 'badge';

  const keyEl = document.createElement('div');
  keyEl.className = 'badge-key';
  if (color) keyEl.classList.add(`badge-key--${color}`);
  keyEl.textContent = name;

  const valueEl = document.createElement('div');
  valueEl.className = 'badge-value';
  valueEl.textContent = valueText;

  badge.append(keyEl, valueEl);
  return badge;
}

// 該当なしのときも行の高さを揃えるための非表示バッジ
function createPlaceholderBadge() {
  const badge = createBadge('-', '-', null);
  badge.classList.add('is-placeholder');
  badge.setAttribute('aria-hidden', 'true');
  return badge;
}

function renderFlagGroup(listEl, totalEl, hits, allHitsNum, pressedPosition) {
  if (hits.length === 0) {
    listEl.replaceChildren(createPlaceholderBadge());
    totalEl.textContent = '-';
    return;
  }

  listEl.replaceChildren(...hits.map(({ flag, num }) => {
    const percent = ((num / allHitsNum) * 100).toFixed(0);
    return createBadge(flag.name, `${percent}%`, getBadgeColor(flag, pressedPosition));
  }));
  const groupNum = sum(hits.map((hit) => hit.num));
  totalEl.textContent = `1/${(FLAG_DENOMINATOR / groupNum).toFixed(1)}`;
}

function render() {
  el.slipValue.textContent = state.slip;
  el.settingValue.textContent = state.setting;
  el.reel.classList.toggle('is-center-first', state.isCenterFirst);
  el.reel.setAttribute('aria-valuenow', state.reelPosition);

  const pressedPosition = getPressedPosition();
  const hits = findFlags(pressedPosition);
  // 割合はBB・RB合算に対する比率
  const allHitsNum = sum(hits.map((hit) => hit.num));

  renderFlagGroup(el.bbFlags, el.bbTotal, hits.filter((hit) => hit.flag.type === 'BB'), allHitsNum, pressedPosition);
  renderFlagGroup(el.rbFlags, el.rbTotal, hits.filter((hit) => hit.flag.type === 'RB'), allHitsNum, pressedPosition);

  const prizes = findPrizes(pressedPosition);
  el.prizes.textContent = prizes.length > 0 ? prizes.join(', ') : 'なし';
}

// ---------- リール操作 ----------

const drag = {
  active: false,
  startY: 0,
  startOffsetY: 0,
  offsetY: 0, // 背景画像の縦位置 (0〜REEL_IMAGE_HEIGHT)
};

let snapTimer = null;

function setReelOffset(offsetY, animate) {
  clearTimeout(snapTimer);
  el.reel.style.transition = animate ? `background-position ${SNAP_DURATION_MS}ms ease-out` : '';
  el.reel.style.backgroundPosition = `0px ${offsetY + REEL_OFFSET_Y}px`;
  if (animate) {
    snapTimer = setTimeout(() => {
      el.reel.style.transition = '';
    }, SNAP_DURATION_MS);
  }
}

// 指定コマ位置に合わせて表示・判定を更新する
function moveReelTo(index, animate) {
  const normalized = wrap(index, 0, TOTAL_SYMBOLS - 1);
  drag.offsetY = normalized * SYMBOL_HEIGHT;
  state.reelPosition = normalized === 0 ? TOTAL_SYMBOLS : normalized;
  setReelOffset(drag.offsetY, animate);
  render();
}

function endDrag() {
  if (!drag.active) return;
  drag.active = false;
  // 最寄りのコマに吸着させる
  moveReelTo(Math.round(drag.offsetY / SYMBOL_HEIGHT), true);
}

el.reel.addEventListener('pointerdown', (e) => {
  drag.active = true;
  drag.startY = e.clientY;
  drag.startOffsetY = drag.offsetY;
  setReelOffset(drag.offsetY, false);
  el.reel.setPointerCapture(e.pointerId);
});

el.reel.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  const offsetY = drag.startOffsetY + (e.clientY - drag.startY);
  drag.offsetY = wrap(offsetY, 0, REEL_IMAGE_HEIGHT - 1);
  setReelOffset(drag.offsetY, false);
});

el.reel.addEventListener('pointerup', endDrag);
el.reel.addEventListener('pointercancel', endDrag);

// ↓ キーで下方向（ドラッグを下に引いたとき）と同じ向きに1コマ動かす
el.reel.addEventListener('keydown', (e) => {
  const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  moveReelTo(Math.round(drag.offsetY / SYMBOL_HEIGHT) + step, true);
});

// ---------- 条件操作 ----------

function bindStepper(name, key, [min, max]) {
  const step = (delta) => {
    state[key] = wrap(state[key] + delta, min, max);
    render();
  };
  document.getElementById(`${name}-decrease`).addEventListener('click', () => step(-1));
  document.getElementById(`${name}-increase`).addEventListener('click', () => step(1));
}

function bindToggle(id, key) {
  const input = document.getElementById(id);
  // 再読み込み時にブラウザがチェック状態を復元する場合があるため、初期値も入力から取る
  state[key] = input.checked;
  input.addEventListener('change', () => {
    state[key] = input.checked;
    render();
  });
}

bindStepper('slip', 'slip', SLIP_RANGE);
bindStepper('setting', 'setting', SETTING_RANGE);
bindToggle('reel-basis-toggle', 'showsPressPosition');
bindToggle('press-order-toggle', 'isCenterFirst');

validateData();
moveReelTo(0, false);
