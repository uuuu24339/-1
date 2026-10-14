// --- HTMLから操作する画面要素を取得 ---
const board = document.getElementById('board');          // 盤面エリア
const statusMessage = document.getElementById('status-message'); // 上部案内メッセージ
const startBtn = document.getElementById('start-btn');    // スタートボタン
const resetBtn = document.getElementById('reset-btn');    // リセットボタン
const ruleBtn = document.getElementById('rule-btn');      // ルールボタン
const p1Card = document.getElementById('p1-card');        // P1プレイヤーカード
const p2Card = document.getElementById('p2-card');        // P2プレイヤーカード
const p1LifeEl = document.getElementById('p1-life');      // P1ライフ表示枠
const p2LifeEl = document.getElementById('p2-life');      // P2ライフ表示枠
const ruleModal = document.getElementById('rule-modal');  // モーダル枠
const closeModal = document.getElementById('close-modal'); // モーダル閉じるボタン

// --- ルールモーダルのページ送り制御用要素 ---
const rulePages = document.querySelectorAll('.rule-page');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');
let currentRulePage = 1;
const totalRulePages = rulePages.length;

// --- ゲーム ルール定数の設定 ---
const totalCells = 16;  // 4x4＝全16マス
const setLimit = 3;     // 各プレイヤーが1回に置く爆弾の数（3個）
const playLimit = 2;    // めくりターンでめくして良いマス数（2マス）

// --- ゲームの状態・変数の初期化 ---
let gameState = 'waiting'; // ゲームの状態（waiting / p1_set / p2_set / p1_play / p2_play / game_over）
let count = 0;             // 設置した爆弾数や、めくったマス数をカウントする変数
let bombMap = Array(totalCells).fill(0); // 各マス（0～15）に置かれた爆弾の個数を記録する配列
let p1Life = 3;            // P1の残りライフ
let p2Life = 3;            // P2の残りライフ

// ボタンクリック時のイベントリスナーを設定
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

// ルールモーダルの開閉処理を設定
ruleBtn.addEventListener('click', () => {
  currentRulePage = 1;
  updateRulePageDisplay();
  ruleModal.classList.remove('hidden');
});
closeModal.addEventListener('click', () => ruleModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target === ruleModal) ruleModal.classList.add('hidden'); });

// ルールモーダルのページ切替処理
prevPageBtn.addEventListener('click', () => {
  if (currentRulePage > 1) {
    currentRulePage--;
    updateRulePageDisplay();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentRulePage < totalRulePages) {
    currentRulePage++;
    updateRulePageDisplay();
  }
});

// ルールモーダルの表示更新
function updateRulePageDisplay() {
  rulePages.forEach(page => {
    if (parseInt(page.dataset.page) === currentRulePage) {
      page.classList.remove('hidden');
    } else {
      page.classList.add('hidden');
    }
  });

  pageIndicator.textContent = `${currentRulePage} / ${totalRulePages}`;
  prevPageBtn.disabled = (currentRulePage === 1);
  nextPageBtn.disabled = (currentRulePage === totalRulePages);
}

// --- 指定したマスの周囲8マスにある爆弾の合計数を計算する関数 ---
function getAdjacentBombCount(index) {
  const row = Math.floor(index / 4); // マス番号から行（0～3）を算出
  const col = index % 4;             // マス番号から列（0～3）を算出
  let count = 0;

  // 上下左右・斜め8方向への相対移動量 [行のオフセット, 列のオフセット]
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1]
  ];

  for (const [dr, dc] of directions) {
    const r = row + dr;
    const c = col + dc;

    // 参照先のマスが4x4の盤面枠内（行・列ともに0～3）に収まっているかチェック
    if (r >= 0 && r < 4 && c >= 0 && c < 4) {
      const neighborIndex = r * 4 + c; // 行・列から一元配列のインデックス番号を逆算
      count += bombMap[neighborIndex]; // そのマスに置かれた爆弾数（重複含む）を加算
    }
  }

  return count;
}

// --- 初期化処理：盤面の16マスをJavaScriptで動的に生成 ---
for (let i = 0; i < totalCells; i++) {
  const cell = document.createElement('div'); // マス要素（<div>）を作成
  cell.classList.add('cell');                 // CSS適用用のclassを追加
  cell.dataset.index = i;                     // マスの番号（0〜15）をデータ属性として保持

  // 各マスがクリックされたときの処理
  cell.addEventListener('click', () => {
    // ゲーム開始前や終了後はクリック無効化
    if (gameState === 'waiting' || gameState === 'game_over') return;

    // 1. プレイヤー1 爆弾設置フェーズ
    if (gameState === 'p1_set') {
      // 既にP1が設置済みのマス、または指定個数（3個）設置済みならスキップ
      if (cell.dataset.p1Set === 'true' || count >= setLimit) return;
      
      bombMap[i] += 1;             // 内部配列の爆弾数を1加算
      cell.dataset.p1Set = 'true'; // P1がこのマスに設置した記録を付ける
      cell.classList.add('bomb');  // 黄色背景（設置中表示）用クラスを付与
      cell.textContent = '💣';     // 重複時も表示は見た目上💣1個に固定
      
      count++;
      updateStatus();

      // 3個設置し終わったら盤面を一度伏せてP2の設置ターンへ移行
      if (count === setLimit) {
        setTimeout(() => {
          resetBoard();
          gameState = 'p2_set';
          count = 0;
          updateStatus();
        }, 500);
      }
    }
    // 2. プレイヤー2 爆弾設置フェーズ
    else if (gameState === 'p2_set') {
      if (cell.dataset.p2Set === 'true' || count >= setLimit) return;

      bombMap[i] += 1;
      cell.dataset.p2Set = 'true';
      cell.classList.add('bomb');
      cell.textContent = '💣';

      count++;
      updateStatus();

      // 3個設置し終わったら盤面を一度伏せてめくりフェーズへ移行
      if (count === setLimit) {
        setTimeout(() => {
          resetBoard();
          gameState = 'p1_play';
          count = 0;
          updateStatus();
        }, 500);
      }
    }
    // 3. めくり（プレイ）フェーズ
    else if (gameState === 'p1_play' || gameState === 'p2_play') {
      // 既に開けられたマスや、1ターン内の上限数（2回）に達していたらスキップ
      if (cell.classList.contains('revealed') || count >= playLimit) return;

      cell.classList.add('revealed'); // 開封済みフラグ
      count++;

      const bombCount = bombMap[i]; // クリックしたマス自体の爆弾個数を取得

      if (bombCount > 0) {
        // 爆弾を踏んだ場合：重複数ぶん「💣💣」を表示しダメージ適用
        cell.textContent = '💣'.repeat(bombCount);
        
        if (gameState === 'p1_play') {
          cell.classList.add('bomb-p1'); // P1被弾（赤背景）
          p1Life -= bombCount;           // 重複爆弾の数だけライフ減算
        } else {
          cell.classList.add('bomb-p2'); // P2被弾（青背景）
          p2Life -= bombCount;           // 重複爆弾の数だけライフ減算
        }
        updateLifeDisplay();
      } else {
        // 安全マスを踏んだ場合：周囲8マスの爆弾合計数を計算して表示
        const adjacentBombs = getAdjacentBombCount(i);
        cell.textContent = adjacentBombs;
        cell.dataset.count = adjacentBombs; // 数字に応じたCSS色変化用のデータ属性
        cell.classList.add('safe');          // 安全マス表示用クラス
      }

      // どちらかのライフが0以下になったら決着
      if (p1Life <= 0 || p2Life <= 0) {
        endGame();
        return;
      }

      // 2マスめくったらプレイヤー交代
      if (count === playLimit) {
        setTimeout(() => {
          count = 0;
          gameState = (gameState === 'p1_play') ? 'p2_play' : 'p1_play';
          updateStatus();
        }, 500);
      } else {
        updateStatus();
      }
    }
  });

  // 16個作成したマス目を `#board` の中に順番に追加
  board.appendChild(cell);
}

// --- ゲームスタート時の処理 ---
function startGame() {
  gameState = 'p1_set';
  count = 0;
  bombMap = Array(totalCells).fill(0);
  p1Life = 3;
  p2Life = 3;

  p1Card.classList.remove('winner');
  p2Card.classList.remove('winner');

  updateLifeDisplay(); 
  startBtn.classList.add('hidden');       // 上部のスタートボタンを非表示
  resetBtn.classList.remove('hidden');    // 下部左側にリセットボタンを表示
  resetBoard(); 
  updateStatus(); 
}

// --- リセット（途中やり直し）処理 ---
function resetGame() {
  gameState = 'waiting';
  count = 0;
  bombMap = Array(totalCells).fill(0);
  p1Life = 3;
  p2Life = 3;

  p1Card.classList.remove('winner');
  p2Card.classList.remove('winner');

  updateLifeDisplay();
  resetBoard();
  
  startBtn.textContent = 'ゲームスタート';
  startBtn.classList.remove('hidden');    // 上部のスタートボタンを再表示
  resetBtn.classList.add('hidden');       // 下部リセットボタンを非表示
  
  updateStatus();
}

// --- 残りライフのハート表示更新関数 ---
function updateLifeDisplay() {
  p1LifeEl.textContent = '❤️'.repeat(Math.max(0, p1Life)) || '💀';
  p2LifeEl.textContent = '❤️'.repeat(Math.max(0, p2Life)) || '💀';
}

// --- ゲーム終了（勝敗決定）時の処理 ---
function endGame() {
  gameState = 'game_over';
  p1Card.classList.remove('active');
  p2Card.classList.remove('active');
  
  statusMessage.classList.remove('p1-turn', 'p2-turn');

  if (p1Life <= 0) {
    statusMessage.textContent = '🎉 プレイヤー2 の勝利！';
    p2Card.classList.add('winner');
    statusMessage.classList.add('p2-turn'); // P2勝利時はメッセージ枠を青に
  } else {
    statusMessage.textContent = '🎉 プレイヤー1 の勝利！';
    p1Card.classList.add('winner');
    statusMessage.classList.add('p1-turn'); // P1勝利時はメッセージ枠を赤に
  }

  startBtn.textContent = 'もう一度あそぶ';
  startBtn.classList.remove('hidden');
  resetBtn.classList.add('hidden');
}

// --- 盤面のマス目を見た目上リセットする関数 ---
function resetBoard() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('bomb', 'bomb-p1', 'bomb-p2', 'safe', 'revealed');
    delete cell.dataset.p1Set;
    delete cell.dataset.p2Set;
    delete cell.dataset.count;
  });
}

// --- 現在のターン・進行状況に合わせて画面表示を更新する関数 ---
function updateStatus() {
  p1Card.classList.remove('active');
  p2Card.classList.remove('active');
  statusMessage.classList.remove('p1-turn', 'p2-turn');

  if (gameState === 'waiting') {
    statusMessage.textContent = '「スタート」を押して開始';
  } else if (gameState === 'p1_set') {
    p1Card.classList.add('active');
    statusMessage.classList.add('p1-turn');
    statusMessage.textContent = `P1: 爆弾を設置 (${count}/${setLimit})`;
  } else if (gameState === 'p2_set') {
    p2Card.classList.add('active');
    statusMessage.classList.add('p2-turn');
    statusMessage.textContent = `P2: 爆弾を設置 (${count}/${setLimit})`;
  } else if (gameState === 'p1_play') {
    p1Card.classList.add('active');
    statusMessage.classList.add('p1-turn');
    statusMessage.textContent = `P1: マスをめくる (${count}/${playLimit})`;
  } else if (gameState === 'p2_play') {
    p2Card.classList.add('active');
    statusMessage.classList.add('p2-turn');
    statusMessage.textContent = `P2: マスをめくる (${count}/${playLimit})`;
  }
}

// 初回呼び出し（初期表示のセットアップ）
updateStatus();
