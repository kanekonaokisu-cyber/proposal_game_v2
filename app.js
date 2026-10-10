(function () {
  "use strict";

  const STORAGE_KEY = "proposal-game-prototype-v1";
  const letters = ["A", "B", "C", "D"];
  const nodeLabels = {
    START: "QR待ち",
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
    "M4pZ7aQ9": { node: "DUMMY1", purpose: "誤答ルート問題1" },
    "cN6w3Kx8": { node: "DUMMY2", purpose: "誤答ルート問題2" }
  };
  const defaultQuestions = {
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
      wrongDestination: "次の目的地にあるQRを探してください。",
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
      destination: "最終案内を確認してください。",
      wrongDestination: "最終案内を確認してください。",
      nextCorrect: "FINAL",
      nextWrong: "FINAL",
      choices: ["朝はコーヒーより紅茶", "辛い食べ物が苦手", "犬より猫が好き", "地図を読むのが得意"]
    },
    DUMMY1: {
      text: "（問題文を設定してください）",
      correct: "A",
      destination: "Q3のQRコードを探してください。",
      wrongDestination: "Q3のQRコードを探してください。",
      nextCorrect: "Q3",
      nextWrong: "Q3",
      choices: ["選択肢Aを設定してください", "選択肢Bを設定してください", "選択肢Cを設定してください", "選択肢Dを設定してください"]
    },
    DUMMY2: {
      text: "（問題文を設定してください）",
      correct: "A",
      destination: "最終案内を確認してください。",
      wrongDestination: "最終案内を確認してください。",
      nextCorrect: "FINAL",
      nextWrong: "FINAL",
      choices: ["選択肢Aを設定してください", "選択肢Bを設定してください", "選択肢Cを設定してください", "選択肢Dを設定してください"]
    }
  };
  const routeOptions = {
    Q1: ["Q2", "DUMMY1"],
    Q2: ["Q3", "DUMMY1"],
    Q3: ["Q4", "DUMMY2"],
    Q4: ["FINAL"],
    DUMMY1: ["Q3"],
    DUMMY2: ["FINAL"]
  };
  const routeLabels = {
    Q2: "通常ルート：Q2へ進む",
    Q3: "通常ルート：Q3へ進む",
    Q4: "Q4へ進む",
    FINAL: "回答後に最終案内を表示",
    DUMMY1: "誤答ルートQRを経由してQ3へ進む",
    DUMMY2: "誤答ルートQRを経由して問題を表示"
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
      finishConfirmed: false,
      questionSettingsVersion: null,
      confidenceYesCount: 0,
      roomNumberRevealed: false,
      recoveryNode: null,
      recoveryError: false,
      recoveryGuideNode: null
    };
  }

  function normalizeQuestions(value) {
    if (!value || typeof value !== "object") throw new Error("共有された問題設定の形式が正しくありません。");
    const normalized = {};
    Object.keys(defaultQuestions).forEach(function (node) {
      const question = value[node];
      if (question === undefined && (node === "DUMMY1" || node === "DUMMY2")) {
        normalized[node] = { ...defaultQuestions[node] };
        return;
      }
      const nextCorrect = node === "DUMMY2" && question && question.nextCorrect === "Q4"
        ? "FINAL"
        : question && question.nextCorrect;
      const nextWrong = node === "DUMMY2" && question && question.nextWrong === "Q4"
        ? "FINAL"
        : question && question.nextWrong;
      if (!question || typeof question.text !== "string" || !question.text.trim() ||
          !Array.isArray(question.choices) || question.choices.length !== letters.length ||
          question.choices.some(function (choice) { return typeof choice !== "string" || !choice.trim(); }) ||
          !letters.includes(question.correct) ||
          (nextCorrect !== undefined && !routeOptions[node].includes(nextCorrect)) ||
          (nextWrong !== undefined && !routeOptions[node].includes(nextWrong)) ||
          (question.destination !== undefined &&
            (typeof question.destination !== "string" || !question.destination.trim())) ||
          (question.wrongDestination !== undefined &&
            (typeof question.wrongDestination !== "string" || !question.wrongDestination.trim()))) {
        throw new Error(node + "の問題文・4つの選択肢・正解を確認してください。");
      }
      normalized[node] = {
        ...defaultQuestions[node],
        text: question.text.trim(),
        choices: question.choices.map(function (choice) { return choice.trim(); }),
        correct: question.correct,
        nextCorrect: nextCorrect || defaultQuestions[node].nextCorrect,
        nextWrong: nextWrong || defaultQuestions[node].nextWrong,
        destination: typeof question.destination === "string"
          ? question.destination.trim()
          : defaultQuestions[node].destination,
        wrongDestination: typeof question.wrongDestination === "string"
          ? question.wrongDestination.trim()
          : defaultQuestions[node].wrongDestination
      };
    });
    return normalized;
  }

  function cloneDefaultQuestions() {
    return JSON.parse(JSON.stringify(defaultQuestions));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return freshState();
      return {
        ...freshState(),
        ...saved,
        answers: Array.isArray(saved.answers) ? saved.answers : [],
        questionSettingsVersion: Number.isInteger(saved.questionSettingsVersion) ? saved.questionSettingsVersion : null
      };
    } catch (error) {
      return freshState();
    }
  }

  let state = loadState();
  let questions = cloneDefaultQuestions();
  let startLocation = "エントランス";
  const app = document.getElementById("app");
  let answeredOnThisPage = null;
  const supabaseConfig = window.PROPOSAL_GAME_SUPABASE || {};
  const supabaseClient = supabaseConfig.url && supabaseConfig.anonKey && window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;
  let adminSession = null;
  let remoteSettingsVersion = null;
  let settingsSyncError = "";
  let settingsSyncInProgress = false;

  function saveState(mutator) {
    const next = loadState();
    mutator(next);
    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  }

  async function syncQuestionSettings() {
    if (!supabaseClient || settingsSyncInProgress) return;
    settingsSyncInProgress = true;
    try {
      const result = await supabaseClient.from("game_settings")
        .select("questions, version")
        .eq("id", 1)
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) {
        remoteSettingsVersion = 0;
        settingsSyncError = "";
        return;
      }
      const version = result.data.version;
      if (!Number.isInteger(version) || version < 1) {
        throw new Error("共有設定のバージョン情報が正しくありません。");
      }
      const updatedQuestions = normalizeQuestions(result.data.questions);
      if (result.data.questions.startLocation !== undefined &&
          (typeof result.data.questions.startLocation !== "string" || !result.data.questions.startLocation.trim())) {
        throw new Error("開始案内の場所設定が正しくありません。");
      }
      const saved = loadState();
      const settingsChanged = saved.questionSettingsVersion !== version;
      questions = updatedQuestions;
      startLocation = typeof result.data.questions.startLocation === "string"
        ? result.data.questions.startLocation.trim()
        : "エントランス";
      remoteSettingsVersion = version;
      settingsSyncError = "";
      if (settingsChanged) {
        const hasGameProgress = saved.status !== "ready" || saved.answers.length > 0;
        const nextState = hasGameProgress
          ? { ...freshState(), roomNumber: saved.roomNumber, questionSettingsVersion: version }
          : { ...saved, questionSettingsVersion: version };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        state = nextState;
        if (hasGameProgress) answeredOnThisPage = null;
        render();
      }
    } catch (error) {
      settingsSyncError = "共有設定を読み込めませんでした: " + error.message;
      render();
    } finally {
      settingsSyncInProgress = false;
    }
  }

  function renderSettingsNotice() {
    if (supabaseConfig.url && supabaseConfig.anonKey && settingsSyncError) {
      return '<p class="settings-notice is-error" role="alert">' + escapeHtml(settingsSyncError) + "</p>";
    }
    if (!supabaseClient) {
      return '<p class="settings-notice" role="status">別端末へ問題設定を共有するには、supabase-config.js と Supabase の初期設定が必要です。</p>';
    }
    return "";
  }

  function renderQuestionSettings() {
    const cards = Object.keys(defaultQuestions).map(function (node, questionIndex) {
      const question = questions[node];
      const choices = question.choices.map(function (choice, index) {
        const letter = letters[index];
        return '<label class="question-choice-field"><span>' + letter + '</span><input type="text" maxlength="200" data-question-choice="' + node + '" data-choice-letter="' + letter + '" value="' + escapeHtml(choice) + '" aria-label="' + node + "の選択肢" + letter + '" required></label>';
      }).join("");
      const answers = letters.map(function (letter) {
        return '<option value="' + letter + '" ' + (question.correct === letter ? "selected" : "") + ">" + letter + "</option>";
      }).join("");
      const correctRoutes = routeOptions[node].map(function (target) {
        return '<label class="question-route-option"><input type="radio" name="correct-route-' + node + '" value="' + target + '" ' + (question.nextCorrect === target ? "checked" : "") + ' required><span>' + routeLabels[target] + "</span></label>";
      }).join("");
      const wrongRoutes = routeOptions[node].map(function (target) {
        return '<label class="question-route-option"><input type="radio" name="wrong-route-' + node + '" value="' + target + '" ' + (question.nextWrong === target ? "checked" : "") + ' required><span>' + routeLabels[target] + "</span></label>";
      }).join("");
      const questionLabel = node.indexOf("DUMMY") === 0 ? node + " · 誤答ルート問題" : node + " · 問題 " + (questionIndex + 1);
      return '<fieldset class="question-settings-card"><legend>' + questionLabel + '</legend>' +
        '<label class="question-field-label" for="question-text-' + node + '">問題文</label>' +
        '<textarea id="question-text-' + node + '" data-question-text="' + node + '" maxlength="500" required>' + escapeHtml(question.text) + '</textarea>' +
        '<div class="question-choices">' + choices + "</div>" +
        '<label class="question-field-label" for="question-correct-' + node + '">正解の選択肢</label>' +
        '<select id="question-correct-' + node + '" data-question-correct="' + node + '">' + answers + "</select>" +
        '<fieldset class="question-route-group"><legend>正解したときの行き先</legend>' + correctRoutes + "</fieldset>" +
        '<label class="question-field-label" for="question-correct-destination-' + node + '">正解時に表示する案内文</label>' +
        '<textarea id="question-correct-destination-' + node + '" data-question-correct-destination="' + node + '" maxlength="500" required>' + escapeHtml(question.destination) + "</textarea>" +
        '<fieldset class="question-route-group"><legend>誤答したときの行き先</legend>' + wrongRoutes + "</fieldset>" +
        '<label class="question-field-label" for="question-wrong-destination-' + node + '">誤答時に表示する案内文</label>' +
        '<textarea id="question-wrong-destination-' + node + '" data-question-wrong-destination="' + node + '" maxlength="500" required>' + escapeHtml(question.wrongDestination) + "</textarea></fieldset>";
    }).join("");
    return '<section class="panel admin-panel"><div class="section-heading"><div><h2>開始案内・クイズの設定</h2><p>1問目へ誘導する場所と、問題文・選択肢・正解・回答後の行き先を設定します。DUMMY1/DUMMY2も編集できます。保存すると全端末の進行状況をリセットします。</p></div></div>' +
      renderSettingsNotice() +
      (supabaseClient
        ? '<form id="question-settings-form"><label class="admin-field"><span>1問目へ誘導する場所</span><input type="text" maxlength="100" data-start-location value="' + escapeHtml(startLocation) + '" required></label><div class="question-settings-grid">' + cards + '</div><button class="primary-button question-save-button" type="submit">設定を保存してゲームをリセット</button><p class="inline-feedback" id="question-settings-feedback" aria-live="polite"></p></form>'
        : '<p class="admin-note">Supabase を設定すると、ここから問題を編集してプレイヤーのスマートフォンにも反映できます。</p>') +
      "</section>";
  }

  function renderAdminLogin() {
    return '<div class="player-layout"><section class="panel player-panel"><h1 class="player-heading">管理者ログイン</h1><p class="player-copy">問題設定とゲーム管理を開くには、管理者アカウントでログインしてください。</p>' +
      renderSettingsNotice() +
      '<form id="admin-login-form" class="admin-login-form"><label class="question-field-label" for="admin-email">メールアドレス</label><input id="admin-email" type="email" autocomplete="username" required><label class="question-field-label" for="admin-password">パスワード</label><input id="admin-password" type="password" autocomplete="current-password" required><button class="primary-button" type="submit">ログイン</button></form><p class="inline-feedback" id="admin-login-feedback" aria-live="polite"></p></section></div>';
  }

  async function saveQuestionSettings(form) {
    const feedback = document.getElementById("question-settings-feedback");
    const updatedQuestions = cloneDefaultQuestions();
    const locationField = form.querySelector("[data-start-location]");
    const updatedStartLocation = locationField ? locationField.value.trim() : "";
    if (!updatedStartLocation) {
      if (feedback) feedback.textContent = "1問目へ誘導する場所を入力してください。";
      return;
    }
    let missingRouteNode = "";
    Object.keys(defaultQuestions).forEach(function (node) {
      const textField = form.querySelector('[data-question-text="' + node + '"]');
      const correctField = form.querySelector('[data-question-correct="' + node + '"]');
      const correctRouteField = form.querySelector('input[name="correct-route-' + node + '"]:checked');
      const correctDestinationField = form.querySelector('[data-question-correct-destination="' + node + '"]');
      const wrongRouteField = form.querySelector('input[name="wrong-route-' + node + '"]:checked');
      const wrongDestinationField = form.querySelector('[data-question-wrong-destination="' + node + '"]');
      if (!correctRouteField || !wrongRouteField) {
        missingRouteNode = node;
        return;
      }
      const choices = letters.map(function (letter) {
        const field = form.querySelector('[data-question-choice="' + node + '"][data-choice-letter="' + letter + '"]');
        return field.value.trim();
      });
      updatedQuestions[node].text = textField.value.trim();
      updatedQuestions[node].choices = choices;
      updatedQuestions[node].correct = correctField.value;
      updatedQuestions[node].nextCorrect = correctRouteField.value;
      updatedQuestions[node].destination = correctDestinationField.value.trim();
      updatedQuestions[node].nextWrong = wrongRouteField.value;
      updatedQuestions[node].wrongDestination = wrongDestinationField.value.trim();
    });
    if (missingRouteNode) {
      if (feedback) feedback.textContent = missingRouteNode + "の正解時・誤答時の行き先を選択してください。";
      return;
    }
    for (const node of ["DUMMY1", "DUMMY2"]) {
      const draft = defaultQuestions[node];
      const question = updatedQuestions[node];
      if (question.text === draft.text || question.choices.some(function (choice, index) {
        return choice === draft.choices[index];
      })) {
        const feedback = document.getElementById("question-settings-feedback");
        if (feedback) feedback.textContent = node + "の問題文と4つの選択肢を設定してください。";
        return;
      }
    }
    let validatedQuestions;
    try {
      validatedQuestions = normalizeQuestions(updatedQuestions);
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
      return;
    }
    if (!supabaseClient || !adminSession) {
      if (feedback) feedback.textContent = "管理者としてログインしてから保存してください。";
      return;
    }
    const nextVersion = (remoteSettingsVersion || 0) + 1;
    const sharedQuestions = { ...validatedQuestions, startLocation: updatedStartLocation };
    const result = await supabaseClient.from("game_settings")
      .upsert({ id: 1, questions: sharedQuestions, version: nextVersion }, { onConflict: "id" })
      .select("questions, version")
      .single();
    if (result.error) {
      if (feedback) feedback.textContent = "保存できませんでした: " + result.error.message;
      return;
    }
    const roomNumber = loadState().roomNumber;
    state = { ...freshState(), roomNumber: roomNumber, questionSettingsVersion: result.data.version };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    questions = normalizeQuestions(result.data.questions);
    startLocation = updatedStartLocation;
    remoteSettingsVersion = result.data.version;
    settingsSyncError = "";
    render();
    const savedFeedback = document.getElementById("question-settings-feedback");
    if (savedFeedback) savedFeedback.textContent = "保存しました。設定を全端末へ反映し、ゲームを最初からに戻しました。プレイヤーはQ1から再開できます。";
  }

  function qrIdForNode(node) {
    const entry = Object.entries(qrEntries).find(function (pair) { return pair[1].node === node; });
    return entry ? entry[0] : null;
  }

  function qrUrl(id, preview) {
    return window.location.origin + window.location.pathname + "#/g/" + id + (preview ? "?preview=1" : "");
  }

  function qrCodeDataUrl(url, cellSize) {
    const code = qrcode(0, "M");
    code.addData(url);
    code.make();
    return code.createDataURL(cellSize, 4);
  }

  function qrCodePng(url) {
    return new Promise(function (resolve, reject) {
      const code = qrcode(0, "M");
      code.addData(url);
      code.make();
      const margin = 4;
      const cellSize = 8;
      const size = (code.getModuleCount() + margin * 2) * cellSize;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("QR画像をPNGに変換できません。"));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#000000";
      for (let row = 0; row < code.getModuleCount(); row += 1) {
        for (let col = 0; col < code.getModuleCount(); col += 1) {
          if (code.isDark(row, col)) {
            context.fillRect((col + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize);
          }
        }
      }
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("QR画像をPNGに変換できません。"));
        }
      }, "image/png");
    });
  }

  function routeInfo() {
    const route = (window.location.hash || "#/").slice(1);
    if (route === "/admin") return { admin: true };
    if (route === "/start") return { node: "START", preview: false };
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

  function firstUnresolvedQuestion() {
    return ["Q1", "Q2", "Q3", "Q4"].find(function (node) {
      const answer = answerFor(node);
      return !answer || !answer.isCorrect;
    }) || null;
  }

  function advancePastCorrectAnswers(node) {
    const questionOrder = ["Q1", "Q2", "Q3", "Q4"];
    let targetNode = answerFor(node).nextNode;
    let guideNode = node;
    while (questionOrder.includes(targetNode)) {
      const answer = answerFor(targetNode);
      if (!answer || !answer.isCorrect) break;
      guideNode = targetNode;
      targetNode = answer.nextNode;
    }
    const unresolved = firstUnresolvedQuestion();
    if (targetNode === "FINAL" && unresolved) targetNode = unresolved;
    state.currentNode = "FINAL";
    state.expectedNode = targetNode === "FINAL" && !unresolved ? null : targetNode;
    state.recoveryGuideNode = state.expectedNode ? guideNode : null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function formatTime(value) {
    return value ? new Date(value).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  }

  function renderAdminMessage() {
    if (!state.message) return "";
    return '<div class="admin-message" role="status"><div class="admin-message-meta"><span class="admin-message-avatar" aria-hidden="true">管</span><span>管理者からのメッセージ</span></div><div class="admin-message-bubble">' + escapeHtml(state.message) + "</div></div>";
  }

  function renderSyncError() {
    return supabaseConfig.url && supabaseConfig.anonKey && settingsSyncError
      ? '<p class="settings-notice is-error" role="alert">' + escapeHtml(settingsSyncError) + "</p>"
      : "";
  }

  function sharedMessage() {
    if (state.status === "stopped") {
      return renderSyncError() + '<div class="paused-screen"><h2>ゲームは停止中です</h2><p>管理者からの案内をお待ちください。</p>' + renderAdminMessage() + "</div>";
    }
    if (state.status === "paused") {
      return renderSyncError() + '<div class="paused-screen"><h2>少しだけお待ちください</h2><p>管理者がゲームを一時停止しています。</p>' + renderAdminMessage() + "</div>";
    }
    return renderSyncError() + renderAdminMessage();
  }

  function renderAlreadyAnswered() {
    return '<div class="player-layout"><section class="panel player-panel">' +
      '<h1 class="player-heading">この問題には回答済みです。</h1>' +
      '<p class="player-copy">案内された場所にある次のQRコードを読み込んでください。</p>' +
      "</section></div>";
  }

  function renderQuestion(node, preview) {
    const question = questions[node];
    const existing = answerFor(node);
    const recovery = state.recoveryNode === node;
    const choices = question.choices.map(function (choice, index) {
      const letter = letters[index];
      return '<li><button class="choice-button" data-action="answer" data-question="' + node + '" data-choice="' + letter + '" ' + (existing && !recovery || preview ? "disabled" : "") + '><span class="choice-letter">' + letter + '</span><span class="choice-text">' + escapeHtml(choice) + "</span></button></li>";
    }).join("");
    let result = "";
    if (recovery && state.recoveryError) {
      result = '<div class="answer-result is-error"><h2>違います…あなたは何も知らないのですね…</h2><p>正しい答えを選ぶまで、もう一度考えてください。</p></div>';
    } else if (existing && !recovery) {
      const destination = existing.isCorrect
        ? question.destination
        : question.wrongDestination;
      result = '<div class="answer-result"><h2>回答を受け取りました。</h2><p>次の手がかりを探してください。</p><p>' + escapeHtml(destination) + "</p></div>";
    }
    return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
      '<h1 class="player-heading">' + escapeHtml(question.text) + '</h1>' +
      '<ul class="choice-list">' + choices + "</ul>" + result +
      "</section></div>";
  }

  function renderAnswerResult(node) {
    const question = questions[node];
    const answer = answerFor(node);
    const destination = answer.isCorrect
      ? question.destination
      : question.wrongDestination;
    return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
      '<div class="answer-result"><h1>回答を受け取りました。</h1><p>次の手がかりを探してください。</p><p>' + escapeHtml(destination) + "</p></div>" +
      "</section></div>";
  }

  function renderFinal() {
    const room = /^\d{4}$/.test(state.roomNumber) ? state.roomNumber : "2807";
    const unresolved = firstUnresolvedQuestion();
    if (state.expectedNode && state.recoveryGuideNode) {
      const recoveredQuestion = questions[state.recoveryGuideNode];
      return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
        '<h1 class="player-heading">正解です。</h1><p class="player-copy">次の場所へ向かってQRコードを探してください。</p><p class="destination-copy">' + escapeHtml(recoveredQuestion.destination) + "</p></section></div>";
    }
    if (unresolved) {
      const yesCount = Math.max(0, state.confidenceYesCount || 0);
      return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
        '<h1 class="player-heading">最後の確認です</h1><div class="confidence-box"><p>' +
        (yesCount ? "ほんとに？？" : "これまで答えた問題に自信がありますか？") +
        '</p><div class="confidence-actions"><button class="primary-button" data-action="confidence-yes">YES</button>' +
        '<button class="secondary-button" data-action="confidence-no">NO</button>' +
        '</div>' + (yesCount ? '<p class="confidence-hint">自信があるならYES、答えを見直すならNOを押してください。</p>' : "") +
        "</div></section></div>";
    }
    return '<div class="player-layout"><section class="panel player-panel">' + sharedMessage() +
      '<p class="room-instruction">集めたQRコードの裏面にある「アルファベット＋数字」を確認してください。アルファベット順に並べると、部屋番号になります。</p>' +
      (state.roomNumberRevealed
        ? '<div class="room-number" aria-label="部屋番号 ' + room.split("").join(" ") + '">' + room + "</div>" +
          '<p class="room-instruction">この部屋番号に来てください。</p>'
        : '<button class="room-rescue-button" data-action="reveal-room-number">QRコードをなくしてしまったらこちら</button>') +
      "</section></div>";
  }

  function renderHold() {
    const title = state.status === "stopped" ? "ゲームは停止中です" : "少しだけお待ちください";
    const copy = state.status === "stopped" ? "管理者からの案内をお待ちください。" : "管理者がゲームを一時停止しています。";
    return '<div class="player-layout"><section class="panel player-panel">' +
      '<h1 class="player-heading">' + title + '</h1><p class="player-copy">' + copy + "</p>" +
      renderAdminMessage() +
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
      const image = qrCodeDataUrl(url, 4);
      return '<tr><td><code>' + id + '</code></td><td>' + entry.node + '</td><td>' + entry.purpose + '</td><td class="qr-image-cell"><img class="qr-code-image" src="' + image + '" alt="' + escapeHtml(entry.purpose + "のQRコード") + '" width="128" height="128" loading="lazy"></td><td class="qr-url-cell"><a href="' + url + '" target="_blank" rel="noreferrer">' + escapeHtml(url) + '</a></td><td class="qr-actions"><button class="secondary-button" data-action="copy-qr-image" data-url="' + escapeHtml(url) + '">画像をコピー</button><button class="secondary-button" data-action="copy-qr" data-url="' + escapeHtml(url) + '">URLをコピー</button><a class="secondary-button" href="' + qrUrl(id, true) + '" target="_blank" rel="noreferrer">テスト表示</a><span class="qr-copy-feedback" aria-live="polite"></span></td></tr>';
    }).join("");
    const startGuideUrl = window.location.origin + window.location.pathname + "#/start";
    const startGuideQrRow = '<tr><td>—</td><td>START</td><td>1問目への案内</td><td class="qr-image-cell"><img class="qr-code-image" src="' +
      qrCodeDataUrl(startGuideUrl, 4) + '" alt="1問目への案内ページのQRコード" width="128" height="128" loading="lazy"></td><td class="qr-url-cell"><a href="' +
      startGuideUrl + '" target="_blank" rel="noreferrer">' + escapeHtml(startGuideUrl) + '</a></td><td class="qr-actions"><button class="secondary-button" data-action="copy-qr-image" data-url="' +
      escapeHtml(startGuideUrl) + '">画像をコピー</button><button class="secondary-button" data-action="copy-qr" data-url="' +
      escapeHtml(startGuideUrl) + '">URLをコピー</button><a class="secondary-button" href="' + startGuideUrl +
      '" target="_blank" rel="noreferrer">表示</a><span class="qr-copy-feedback" aria-live="polite"></span></td></tr>';
    const rows = ["Q1", "Q2", "DUMMY1", "Q3", "DUMMY2", "Q4"].map(function (node) {
      const answer = answerFor(node);
      if (!answer) return '<tr><td>' + node + '</td><td class="result-pending">未回答</td><td>—</td><td>—</td></tr>';
      return '<tr><td>' + node + '</td><td>' + answer.choice + " · " + escapeHtml(answer.choiceText) + '</td><td class="' + (answer.isCorrect ? "result-correct" : "result-incorrect") + '">' + (answer.isCorrect ? "正解" : "不正解") + '</td><td>' + formatTime(answer.at) + "</td></tr>";
    }).join("");
    const elapsed = state.startedAt ? Math.max(0, Math.floor(((state.stoppedAt || Date.now()) - state.startedAt) / 60000)) + "分" : "—";
    return '<div class="admin-layout"><div class="admin-main">' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h1>ゲーム進行</h1><p>プレイヤー画面と同じブラウザー保存データを表示しています。</p></div><div class="admin-heading-actions"><span class="status-chip' + statusClass + '">' + statusLabels[state.status] + '</span>' + (adminSession ? '<button class="secondary-button admin-logout-button" data-action="admin-logout">ログアウト</button>' : "") + '</div></div>' +
      '<div><strong>現在のノード：</strong>' + (nodeLabels[current] || current) + '</div>' +
      '<div><strong>次のQR：</strong>' + (state.expectedNode ? nodeLabels[state.expectedNode] : state.currentNode === "FINAL" ? "なし（最終案内を表示中）" : "案内待ち") + '</div>' + progressMarkup(state.currentNode === "FINAL" && state.expectedNode ? state.expectedNode : current) +
      '<p class="progress-caption">回答 ' + state.answers.length + ' / 6 <span>·</span> 経過 ' + elapsed + '</p>' +
      '<div class="admin-field"><label for="room-number">現在の部屋番号</label><input id="room-number" inputmode="numeric" maxlength="4" value="' + escapeHtml(state.roomNumber) + '" aria-describedby="room-feedback"></div><p class="inline-feedback" id="room-feedback"></p>' +
      '</section>' +
      renderQuestionSettings() +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>回答履歴</h2><p>選択内容と正誤は管理画面だけに表示されます。</p></div></div>' +
      '<div class="answer-table-wrap"><table class="answer-table"><thead><tr><th>問題</th><th>選択</th><th>判定</th><th>時刻</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>" +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>QR対応表</h2><p>画像を右クリック（スマートフォンでは長押し）して保存するか、「画像をコピー」で画像をコピーできます。テスト表示は進行状態を変更しません。</p></div></div>' +
      '<div class="answer-table-wrap"><table class="answer-table qr-table"><thead><tr><th>QR識別子</th><th>内部ノード</th><th>用途</th><th>QR画像</th><th>URL</th><th>操作</th></tr></thead><tbody>' + startGuideQrRow + qrRows + "</tbody></table></div></section>" +
      '</div><aside class="admin-side">' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>プレイヤーへの連絡</h2><p>送信するとプレイヤー画面に反映されます。</p></div></div>' +
      '<div class="admin-field"><label for="admin-message">メッセージ</label><textarea id="admin-message" placeholder="例：ゆっくり進んでね。">' + escapeHtml(state.message) + '</textarea></div><div class="admin-actions"><button class="primary-button" data-action="send-message">メッセージを送信</button><button class="secondary-button" data-action="clear-message">表示を消す</button></div><p class="inline-feedback" id="message-feedback"></p></section>' +
      '<section class="panel admin-panel"><div class="section-heading"><div><h2>ゲーム操作</h2><p>一時停止とテスト状態のリセット。</p></div></div>' +
      '<div class="admin-actions"><button class="secondary-button" data-action="toggle-pause">' + (state.status === "paused" ? "ゲームを再開" : "ゲームを一時停止") + '</button><button class="danger-button" data-action="stop-game">ゲームを停止</button><button class="secondary-button" data-action="reset-game">最初からやり直す</button></div>' +
      '<p class="admin-note">リセットすると回答履歴・メッセージ・終了状態を初期化します。部屋番号は保持します。</p></section>' +
      "</aside></div>";
  }

  function render() {
    state = loadState();
    const route = routeInfo();
    document.querySelector(".app-shell").classList.toggle("is-admin", route.admin === true);
    if (route.admin) {
      app.innerHTML = supabaseClient && !adminSession ? renderAdminLogin() : renderAdmin();
      return;
    }
    if (state.status === "stopped" || state.status === "paused") {
      app.innerHTML = renderHold();
      return;
    }
    if (route.node === "START") {
      app.innerHTML = '<div class="player-layout"><section class="panel player-panel start-guide"><p class="eyebrow">THE LITTLE MYSTERY</p><h1 class="player-heading">' +
        escapeHtml(startLocation) + 'へ向かってQRコードを探してください</h1></section></div>';
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
    if (state.recoveryNode && (state.currentNode === "FINAL" || route.node === state.recoveryNode)) {
      app.innerHTML = renderQuestion(state.recoveryNode, false);
      return;
    }
    const routeAnswer = answerFor(route.node);
    if (questions[route.node] && state.expectedNode === route.node && routeAnswer && routeAnswer.isCorrect) {
      advancePastCorrectAnswers(route.node);
      app.innerHTML = renderFinal();
      return;
    }
    if (state.currentNode === "FINAL") {
      if (state.expectedNode && state.recoveryGuideNode && route.node !== state.expectedNode) {
        app.innerHTML = renderFinal();
        return;
      }
      if (state.expectedNode && route.node === state.expectedNode) {
        const arrivedDuringRecovery = Boolean(state.recoveryGuideNode);
        state.currentNode = route.node;
        state.expectedNode = null;
        state.recoveryGuideNode = null;
        const previousAnswer = answerFor(route.node);
        if (arrivedDuringRecovery && previousAnswer && !previousAnswer.isCorrect) {
          state.recoveryNode = route.node;
          state.recoveryError = false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (state.recoveryNode === route.node) {
          app.innerHTML = renderQuestion(route.node, false);
          return;
        }
      } else if (!state.expectedNode || route.node === "FINAL") {
        app.innerHTML = renderFinal();
        return;
      } else {
        app.innerHTML = renderUnavailable();
        return;
      }
    }
    if (route.node === "FINAL") {
      app.innerHTML = renderFinal();
      return;
    }
    const previousAnswer = answerFor(route.node);
    const expectedIncorrectAnswer = state.expectedNode === route.node &&
      previousAnswer && !previousAnswer.isCorrect;
    if (questions[route.node] && previousAnswer && !expectedIncorrectAnswer) {
      app.innerHTML = answeredOnThisPage === route.node
        ? renderAnswerResult(route.node)
        : renderAlreadyAnswered();
      return;
    }
    if (state.status === "ready" && route.node === "Q1") {
      state.status = "active";
      state.currentNode = "Q1";
      state.expectedNode = null;
      state.startedAt = state.startedAt || Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    if (route.node !== state.currentNode) {
      if (route.node !== state.expectedNode) {
        app.innerHTML = renderUnavailable();
        return;
      }
      state.currentNode = route.node;
      state.expectedNode = null;
      state.recoveryGuideNode = null;
      const previousAnswer = answerFor(route.node);
      if (previousAnswer && !previousAnswer.isCorrect) {
        state.recoveryNode = route.node;
        state.recoveryError = false;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    app.innerHTML = renderNode(route.node, false);
  }

  function renderNode(node, preview) {
    if (questions[node]) return renderQuestion(node, preview);
    if (node === "FINAL") return renderFinal();
    return renderUnavailable();
  }

  app.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "admin-logout") {
      if (!supabaseClient) return;
      supabaseClient.auth.signOut().then(function (result) {
        if (result.error) throw result.error;
        adminSession = null;
        render();
      }).catch(function (error) {
        settingsSyncError = "ログアウトできませんでした: " + error.message;
        render();
      });
      return;
    }
    if (action === "copy-qr-image") {
      const feedback = button.closest("tr").querySelector(".qr-copy-feedback");
      const url = button.dataset.url;
      if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === "undefined") {
        if (feedback) feedback.textContent = "このブラウザーは画像コピーに対応していません。QR画像を右クリック（スマートフォンでは長押し）して保存してください。";
        return;
      }
      button.disabled = true;
      const showCopyError = function (error) {
        if (feedback) feedback.textContent = "QR画像をコピーできませんでした: " + error.message + " 画像を右クリック（スマートフォンでは長押し）して保存してください。";
      };
      const finishCopy = function () {
        button.disabled = false;
      };
      try {
        navigator.clipboard.write([new ClipboardItem({ "image/png": qrCodePng(url) })]).then(function () {
          if (feedback) feedback.textContent = "QR画像をコピーしました。";
        }).catch(showCopyError).then(finishCopy);
      } catch (error) {
        showCopyError(error);
        finishCopy();
      }
      return;
    }
    if (action === "copy-qr") {
      const feedback = button.closest("tr").querySelector(".qr-copy-feedback");
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
    if (["answer", "confirm-final", "confidence-yes", "confidence-no"].includes(action) &&
        ["paused", "stopped", "finished"].includes(state.status)) return;

    if (action === "reveal-room-number") {
      if (routeInfo().preview || state.currentNode !== "FINAL" || firstUnresolvedQuestion()) return;
      saveState(function (current) {
        current.roomNumberRevealed = true;
      });
    } else if (action === "answer") {
      const questionId = button.dataset.question;
      const choice = button.dataset.choice;
      const question = questions[questionId];
      const route = routeInfo();
      state = loadState();
      const recovery = state.recoveryNode === questionId;
      if (route.preview || !question ||
          (!recovery && (route.node !== state.currentNode || answerFor(questionId)))) return;
      const index = letters.indexOf(choice);
      if (index < 0) return;
      const isCorrect = choice === question.correct;
      const nextNode = isCorrect ? question.nextCorrect : question.nextWrong;
      answeredOnThisPage = questionId;
      saveState(function (current) {
        current.status = "active";
        if (recovery) {
          const existing = current.answers.find(function (answer) { return answer.node === questionId; });
          const updatedAnswer = {
            node: questionId,
            choice: choice,
            choiceText: question.choices[index],
            isCorrect: isCorrect,
            nextNode: nextNode,
            at: Date.now()
          };
          if (existing) Object.assign(existing, updatedAnswer);
          else current.answers.push(updatedAnswer);
          if (!isCorrect) {
            current.recoveryError = true;
            return;
          }
          current.currentNode = "FINAL";
          current.recoveryNode = null;
          current.recoveryError = false;
          current.confidenceYesCount = 0;
          current.finishConfirmed = false;
          const questionOrder = ["Q1", "Q2", "Q3", "Q4"];
          let targetNode = nextNode;
          let guideNode = questionId;
          while (questionOrder.includes(targetNode)) {
            const alreadyCorrect = current.answers.find(function (answer) {
              return answer.node === targetNode && answer.isCorrect;
            });
            if (!alreadyCorrect) break;
            guideNode = targetNode;
            targetNode = alreadyCorrect.nextNode;
          }
          const unresolved = questionOrder.find(function (node) {
            const answer = current.answers.find(function (item) { return item.node === node; });
            return !answer || !answer.isCorrect;
          });
          if (targetNode === "FINAL" && unresolved) {
            targetNode = unresolved;
          }
          if (targetNode === "FINAL" && !unresolved) {
            current.expectedNode = null;
            current.recoveryGuideNode = null;
          } else {
            current.expectedNode = targetNode;
            current.recoveryGuideNode = guideNode;
          }
        } else {
          if (nextNode === "FINAL") {
            current.currentNode = "FINAL";
            current.expectedNode = null;
          } else {
            current.expectedNode = nextNode;
          }
          current.answers.push({ node: questionId, choice: choice, choiceText: question.choices[index], isCorrect: isCorrect, nextNode: nextNode, at: Date.now() });
        }
      });
    } else if (action === "confidence-yes") {
      if (routeInfo().preview || state.currentNode !== "FINAL" || !firstUnresolvedQuestion()) return;
      saveState(function (current) {
        current.confidenceYesCount = (current.confidenceYesCount || 0) + 1;
      });
    } else if (action === "confidence-no") {
      if (routeInfo().preview || state.currentNode !== "FINAL") return;
      const unresolved = firstUnresolvedQuestion();
      if (!unresolved) return;
      saveState(function (current) {
        current.recoveryNode = unresolved;
        current.recoveryError = false;
      });
    } else if (action === "confirm-final") {
      const route = routeInfo();
      if (route.preview || state.currentNode !== "FINAL") return;
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
    }
  });

  app.addEventListener("submit", function (event) {
    event.preventDefault();
    if (event.target.id === "admin-login-form") {
      if (!supabaseClient) return;
      const feedback = document.getElementById("admin-login-feedback");
      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;
      supabaseClient.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
        if (result.error) throw result.error;
        adminSession = result.data.session;
        settingsSyncError = "";
        render();
      }).catch(function (error) {
        const currentFeedback = document.getElementById("admin-login-feedback");
        if (currentFeedback) currentFeedback.textContent = "ログインできませんでした: " + error.message;
      });
      return;
    }
    if (event.target.id === "question-settings-form") {
      saveQuestionSettings(event.target).catch(function (error) {
        const feedback = document.getElementById("question-settings-feedback");
        if (feedback) feedback.textContent = "保存できませんでした: " + error.message;
      });
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
    answeredOnThisPage = null;
    render();
  });
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) render();
  });

  async function initialize() {
    if (supabaseConfig.url && supabaseConfig.anonKey && !window.supabase) {
      settingsSyncError = "Supabase ライブラリを読み込めませんでした。ネットワーク接続を確認してください。";
    } else if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange(function (_event, session) {
        adminSession = session;
        if (routeInfo().admin) render();
      });
      try {
        const sessionResult = await supabaseClient.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        adminSession = sessionResult.data.session;
      } catch (error) {
        settingsSyncError = "管理者セッションを確認できませんでした: " + error.message;
      }
      await syncQuestionSettings();
      window.setInterval(syncQuestionSettings, 10000);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) syncQuestionSettings();
      });
    }
    render();
  }

  initialize();
})();