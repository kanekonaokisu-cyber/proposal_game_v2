(function () {
  "use strict";

  const STORAGE_KEY = "proposal-game-prototype-v1";
  const letters = ["A", "B", "C", "D"];
  const nodeLabels = {
    START: "START",
    Q1: "Q1",
    Q2: "Q2",
    Q3: "Q3",
    Q4: "Q4",
    DUMMY1: "DUMMY 1",
    DUMMY2: "DUMMY 2",
    FINAL: "FINAL"
  };
  const qrEntries = {
    "7fK3mP9x": { node: "Q1", purpose: "1問目" },
    "A82kd91L": { node: "Q2", purpose: "2問目" },
    "xQ7m2Nz4": { node: "Q3", purpose: "3問目" },
    "r5Vn8B2c": { node: "Q4", purpose: "4問目" },
    "M4pZ7aQ9": { node: "DUMMY1", purpose: "誤答ルート" },
    "cN6w3Kx8": { node: "DUMMY2", purpose: "誤答ルート" },
    "H2dR9sL5": { node: "FINAL", purpose: "最終案内" }
  };
  const questions = {
    Q1: {
      text: "次のうち、僕の出身地はどれ？",
      correct: "B",
      destination: "館内の案内板のそばにある、次のQRを探してください。",
      wrongDestination: "窓の外がよく見える場所にある、小さなQRを探してください。",
      nextCorrect: "Q2",
      nextWrong: "DUMMY1",
      choices: ["横浜", "仙台", "神戸", "福岡"]
    },
    Q2: {
      text: "次のうち、僕たちが実際に行った場所はどれ？",
      correct: "C",
      destination: "次の目的地にあるQRを探してください。",
      nextCorrect: "Q3",
      nextWrong: "Q3",
      choices: ["金沢", "函館", "鎌倉", "松本"]
    },
    Q3: {
      text: "次の写真のうち、一番古いものはどれ？",
      correct: "C",
      destination: "写真を撮った場所を思い出しながら、次のQRを探してください。",
      wrongDestination: "思い出の場所の近くにある、もうひとつのQRを探してください。",
      nextCorrect: "Q4",
      nextWrong: "DUMMY2",
      choices: ["海辺の写真", "カフェの写真", "旅行の写真", "公園の写真"]
    },
    Q4: {
      text: "次のうち、僕について正しいものはどれ？",
      correct: "A",
      destination: "最後のQRがある場所へ進んでください。",
      nextCorrect: "FINAL",
      nextWrong: "FINAL",
      choices: ["朝はコーヒーより紅茶", "辛い食べ物が苦手", "犬より猫が好き", "地図を読むのが得意"]
    }
  };
  const dummyNodes = {
    DUMMY1: { title: "次の手がかり", copy: "この先に、次の手がかりがあるみたいです。", destination: "近くにある次のQRを探してください。", next: "Q3" },
    DUMMY2: { title: "もうひとつの手がかり", copy: "近くに次のQRがあるようです。", destination: "見つけたら読み取ってください。", next: "Q4" }
  };

  function freshState() {
    return {
      status: "ready",
      currentNode: "START",
      expectedNode: null,
      roomNumber: "2807",
      answers: [],
      message: "",
      startedAt: null,
      stoppedAt: null,
      finishConfirmed: false
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return freshState();
      return { ...freshState(), ...saved, answers: Array.isArray(saved.answers) ? saved.answers : [] };
    } catch (error) {
      return freshState();
    }
  }

  let state = loadState();
  const app = document.getElementById("app");

  function saveState(mutator) {
    const next = loadState();
    mutator(next);
    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  }

  function qrIdForNode(node) {
    const entry = Object.entries(qrEntries).find(function (pair) { return pair[1].node === node; });
    return entry ? entry[0] : null;
  }

  function qrUrl(id, preview) {
    return window.location.origin + window.location.pathname + "#/g/" + id + (preview ? "?preview=1" : "");
  }

  function routeInfo() {
    const route = (window.location.hash || "#/game/start").slice(1);
    if (route === "/admin") return { admin: true };
    const match = route.match(/^\/g\/([A-Za-z0-9]{8})(\?preview=1)?$/);
    if (match) {
      const entry = qrEntries[match[1]];
      return { node: entry ? entry.node : null, qrId: match[1], preview: Boolean(match[2]) };
    }
    return { node: "START", preview: false };
  }

  function answerFor(questionId) {
    return state.answers.find(function (answer) { return answer.node === questionId; });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function formatTime(value) {
    return value ? new Date(value).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  }

  function sharedMessage() {
    if (state.status === "stopped") {
      return '<div class="paused-screen"><h2>ゲームは停止中です</h2><p>管理者からの案内をお待ちください。</p>' + (state.message ? '<p class="system-message">' + escapeHtml(state.message) + "</p>" : "") + "</div>";
    }
    if (state.status === "paused") {
      return '<div class="paused-screen"><h2>少しだけお待ちください</h2><p>管理者がゲームを一時停止しています。</p>' + (state.message ? '<p class="system-message">' + escapeHtml(state.message) + "</p>" : "") + "</div>";
    }
    return state.message ? '<div class="system-message">' + escapeHtml(state.message) + "</div>" : "";
  }

  function renderStart() {
    if (state.status !== "ready") {
      const title = state.status === "finished" ? "ゲームは終了しました。" : "ゲームは進行中です。";
      const copy = state.status === "finished" ? "ありがとうございました。" : "表示された案内にそって、次の手がかりを探してください。";
      return '<div class="player-layout"><section class="panel player-panel"><h1 class="player-heading">' + title + '</h1><p class="player-copy">' + copy + "</p></section></div>";
    }
    return '<div class="player-layout"><section class="panel player-panel">' +
      '<h1 class="player-heading">大切な人のこと、<br>どれくらい知ってる？</h1>' +
      '<p class="player-copy">手がかりを探しながら、ひとつずつ答えてください。</p>' +
      '<button class="primary-button start-button" data-action="start">はじめる</button>' +
      "</section></div>";
  }

  function renderQuestion(node, preview) {
    const question = questions[node];
    const existing = answerFor(node);
    const choices = question.choices.map(function (choice, index) {
      const letter = letters[index];
      return '<li><button class="choice-button" data-action="answer" data-question="' + node + '" data-choice="' + letter + '" ' + (existing || preview ? "disabled" : "") + '><span class="choice-letter">' + letter + '</span><span class="choice-text">' + escapeHtml(choice) + "</span></button></li>";
    }).join("");
    let result = "";
    if (existing) {
      const destination = existing.nextNode === (question.nextWrong || "") && !existing.isCorrect
        ? (question.wrongDestination || question.destination)
        : question.destination;
      result = '<div class="answer-result"><h2>回答を受け取りました。</h2><p>次の手がかりを探してください。</p><p>' + escapeHtml(destination) + "</p></div>";
    }
    return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
      '<h1 class="player-heading">' + escapeHtml(question.text) + '</h1>' +
      '<ul class="choice-list">' + choices + "</ul>" + result +
      "</section></div>";
  }

  function renderDummy(node) {
    const dummy = dummyNodes[node];
    return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
      '<h1 class="player-heading">' + dummy.title + '</h1>' +
      '<div class="dummy-banner">' + dummy.copy + "</div><p class=\"destination-copy\">" + dummy.destination + "</p>" +
      "</section></div>";
  }

  function renderFinal() {
    const room = /^\d{4}$/.test(state.roomNumber) ? state.roomNumber : "2807";
    const confirmed = state.finishConfirmed;
    return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
      '<h1 class="player-heading">たどり着いた答えは……</h1>' +
      '<div class="room-number" aria-label="部屋番号 ' + room.split("").join(" ") + '">' + room + "</div>" +
      (confirmed
        ? '<div class="confirmation-note">答えを確かめに、ゴールへ向かいましょう。</div>'
        : '<div class="confidence-box"><p>この答えに自信がありますか？</p><div class="confidence-actions"><button class="primary-button" data-action="confirm-final">はい</button></div></div>') +
      "</section></div>";
  }

  function renderHold() {
    const title = state.status === "stopped" ? "ゲームは停止中です" : "少しだけお待ちください";
    const copy = state.status === "stopped" ? "管理者からの案内をお待ちください。" : "管理者がゲームを一時停止しています。";
    return '<div class="player-layout"><section class="panel player-panel">' +
      '<h1 class="player-heading">' + title + '</h1><p class="player-copy">' + copy + "</p>" +
      (state.message ? '<div class="system-message">' + escapeHtml(state.message) + "</div>" : "") +
      "</section></div>";
  }

  function renderUnavailable() {
    return '<div class="player-layout"><section class="panel player-panel"><h1 class="player-heading">この手がかりは、まだ開けません。</h1><p class="player-copy">今いる場所の案内にそって、次のQRを探してください。</p></section></div>';
  }

  function progressMarkup(current) {
    const route = ["Q1", "Q2", "Q3", "Q4", "FINAL"];
    const visibleCurrent = current === "DUMMY1" ? "Q1" : current === "DUMMY2" ? "Q3" : current;
    return '<div class="progress-track">' + route.map(function (node, index) {
      const isDone = state.answers.some(function (answer) { return answer.node === node; }) || (node === "FINAL" && state.status === "finished");
      const activeIndex = route.indexOf(visibleCurrent);
      const currentClass = node === visibleCurrent ? " is-current" : "";
      const doneClass = isDone || index < activeIndex ? " is-done" : "";
      return '<div class="progress-step' + doneClass + currentClass + '">' + node + "</div>";
    }).join("") + "</div>";
  }

  function renderAdmin() {
    const current = state.currentNode;
    const statusLabels = { ready: "準備中", active: "進行中", paused: "一時停止", stopped: "停止", finished: "終了" };
    const statusClass = state.status === "paused" || state.status === "stopped" ? " is-paused" : "";
    const qrRows = Object.entries(qrEntries).map(function (pair) {
      const id = pair[0];
      const entry = pair[1];
      const url = qrUrl(id, false);
      return '<tr><td><code>' + id + '</code></td><td>' + entry.node + '</td><td>' + entry.purpose + '</td><td class="qr-url-cell"><a href="' + url + '" target="_blank" rel="noreferrer">' + escapeHtml(url) + '</a></td><td class="qr-actions"><button class="secondary-button" data-action="copy-qr" data-url="' + escapeHtml(url) + '">URLをコピー</button><a class="secondary-button" href="' + qrUrl(id, true) + '" target="_blank" rel="noreferrer">テスト表示</a></td></tr>';
    }).join("");
    const rows = ["Q1", "Q2", "Q3", "Q4"].map(function (node) {
      const answer = answerFor(node);
      if (!answer) return '<tr><td>' + node + '</td><td class="result-pending">未回答</td><td>—</td><td>—</td></tr>';
      return '<tr><td>' + node + '</td><td>' + answer.choice + " · " + escapeHtml(answer.choiceText) + '</td><td class="' + (answer.isCorrect ? "result-correct" : "result-incorrect") + '">' + (answer.isCorrect ? "正解" : "不正解") + '</td><td>' + formatTime(answer.at) + "</td></tr>";
    }).join("");
    const elapsed = state.startedAt ? Math.max(0, Math.floor(((state.stoppedAt || Date.now()) - state.startedAt) / 60000)) + "分" : "—";
    return '<div class="admin-layout"><div class="admin-main">' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h1>ゲーム進行</h1><p>プレイヤー画面と同じブラウザー保存データを表示しています。</p></div><span class="status-chip' + statusClass + '">' + statusLabels[state.status] + '</span></div>' +
      '<div><strong>現在のノード：</strong>' + (nodeLabels[current] || current) + '</div>' +
      '<div><strong>次のQR：</strong>' + (state.expectedNode ? nodeLabels[state.expectedNode] : "案内待ち") + '</div>' + progressMarkup(current) +
      '<p class="progress-caption">回答 ' + state.answers.length + ' / 4 <span>·</span> 経過 ' + elapsed + '</p>' +
      '<div class="admin-field"><label for="room-number">現在の部屋番号</label><input id="room-number" inputmode="numeric" maxlength="4" value="' + escapeHtml(state.roomNumber) + '" aria-describedby="room-feedback"></div><p class="inline-feedback" id="room-feedback"></p>' +
      '</section>' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>回答履歴</h2><p>選択内容と正誤は管理画面だけに表示されます。</p></div></div>' +
      '<div class="answer-table-wrap"><table class="answer-table"><thead><tr><th>問題</th><th>選択</th><th>判定</th><th>時刻</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>" +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>QR対応表</h2><p>公開IDと内部ノードの対応。テスト表示は進行状態を変更しません。</p></div></div>' +
      '<div class="answer-table-wrap"><table class="answer-table qr-table"><thead><tr><th>QR識別子</th><th>内部ノード</th><th>用途</th><th>URL</th><th>操作</th></tr></thead><tbody>' + qrRows + "</tbody></table></div></section>" +
      '</div><aside class="admin-side">' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>プレイヤーへの連絡</h2><p>送信するとプレイヤー画面に反映されます。</p></div></div>' +
      '<div class="admin-field"><label for="admin-message">メッセージ</label><textarea id="admin-message" placeholder="例：ゆっくり進んでね。">' + escapeHtml(state.message) + '</textarea></div><div class="admin-actions"><button class="primary-button" data-action="send-message">メッセージを送信</button><button class="secondary-button" data-action="clear-message">表示を消す</button></div><p class="inline-feedback" id="message-feedback"></p></section>' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>ゲーム操作</h2><p>一時停止とテスト状態のリセット。</p></div></div>' +
      '<div class="admin-actions"><button class="secondary-button" data-action="toggle-pause">' + (state.status === "paused" ? "ゲームを再開" : "ゲームを一時停止") + '</button><button class="danger-button" data-action="stop-game">ゲームを停止</button><button class="secondary-button" data-action="reset-game">最初からやり直す</button></div>' +
      '<p class="admin-note">リセットすると回答履歴・メッセージ・終了状態を初期化します。部屋番号は保持します。</p></section>' +
      '<p class="inline-feedback" id="qr-feedback" aria-live="polite"></p>' +
      "</aside></div>";
  }

  function render() {
    state = loadState();
    const route = routeInfo();
    document.querySelector(".app-shell").classList.toggle("is-admin", route.admin === true);
    if (route.admin) {
      app.innerHTML = renderAdmin();
      return;
    }
    if (state.status === "stopped" || state.status === "paused") {
      app.innerHTML = renderHold();
      return;
    }
    if (route.node === "START") {
      app.innerHTML = renderStart();
      return;
    }
    if (!route.node) {
      app.innerHTML = renderUnavailable();
      return;
    }
    if (route.preview) {
      app.innerHTML = renderNode(route.node, true);
      return;
    }
    if (route.node !== state.currentNode) {
      if (route.node !== state.expectedNode) {
        app.innerHTML = renderUnavailable();
        return;
      }
      state.currentNode = route.node;
      state.expectedNode = dummyNodes[route.node] ? dummyNodes[route.node].next : null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    app.innerHTML = renderNode(route.node, false);
  }

  function renderNode(node, preview) {
    if (questions[node]) return renderQuestion(node, preview);
    if (dummyNodes[node]) return renderDummy(node);
    if (node === "FINAL") return renderFinal();
    return renderUnavailable();
  }

  app.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "copy-qr") {
      const feedback = document.getElementById("qr-feedback");
      const url = button.dataset.url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          if (feedback) feedback.textContent = "QR URLをコピーしました。";
        }).catch(function () {
          if (feedback) feedback.textContent = "URLを選択してコピーしてください。";
        });
      }
      return;
    }
    if (["start", "answer", "confirm-final"].includes(action) && ["paused", "stopped", "finished"].includes(state.status)) return;

    if (action === "start") {
      saveState(function (current) {
        current.status = "active";
        current.startedAt = current.startedAt || Date.now();
        current.stoppedAt = null;
        current.finishConfirmed = false;
        current.expectedNode = "Q1";
      });
      window.location.hash = "/g/" + qrIdForNode("Q1");
    } else if (action === "answer") {
      const questionId = button.dataset.question;
      const choice = button.dataset.choice;
      const question = questions[questionId];
      const route = routeInfo();
      if (route.preview || !question || route.node !== state.currentNode || answerFor(questionId)) return;
      const index = letters.indexOf(choice);
      if (index < 0) return;
      const isCorrect = choice === question.correct;
      const nextNode = isCorrect ? question.nextCorrect : question.nextWrong;
      saveState(function (current) {
        current.status = "active";
        current.expectedNode = nextNode;
        current.answers.push({ node: questionId, choice: choice, choiceText: question.choices[index], isCorrect: isCorrect, nextNode: nextNode, at: Date.now() });
      });
    } else if (action === "confirm-final") {
      const route = routeInfo();
      if (route.preview || route.node !== "FINAL") return;
      saveState(function (current) {
        current.finishConfirmed = true;
        current.status = "finished";
        current.stoppedAt = Date.now();
      });
    } else if (action === "send-message") {
      const field = document.getElementById("admin-message");
      const message = field ? field.value.trim() : "";
      saveState(function (current) { current.message = message; });
      const feedback = document.getElementById("message-feedback");
      if (feedback) feedback.textContent = message ? "プレイヤー画面へ送信しました。" : "メッセージを入力してください。";
    } else if (action === "clear-message") {
      saveState(function (current) { current.message = ""; });
    } else if (action === "toggle-pause") {
      saveState(function (current) { current.status = current.status === "paused" ? "active" : "paused"; });
    } else if (action === "stop-game") {
      saveState(function (current) { current.status = "stopped"; current.stoppedAt = Date.now(); });
    } else if (action === "reset-game") {
      const roomNumber = loadState().roomNumber;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...freshState(), roomNumber: roomNumber }));
      state = loadState();
      render();
      window.location.hash = "/";
    }
  });

  app.addEventListener("change", function (event) {
    if (event.target.id !== "room-number") return;
    const value = event.target.value.trim();
    const feedback = document.getElementById("room-feedback");
    if (!/^\d{4}$/.test(value)) {
      if (feedback) feedback.textContent = "部屋番号は4桁で入力してください。";
      return;
    }
    state = loadState();
    state.roomNumber = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (feedback) feedback.textContent = "部屋番号を保存しました。";
  });

  window.addEventListener("hashchange", function () {
    render();
  });
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) render();
  });

  render();
})();