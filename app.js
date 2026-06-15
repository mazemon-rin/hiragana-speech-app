const hiraganaColumns = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", "", "ゆ", "", "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", "", "を", "", "ん"],
  ["が", "ぎ", "ぐ", "げ", "ご"],
  ["ざ", "じ", "ず", "ぜ", "ぞ"],
  ["だ", "ぢ", "づ", "で", "ど"],
  ["ば", "び", "ぶ", "べ", "ぼ"],
  ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
  ["ぁ", "ぃ", "ぅ", "ぇ", "ぉ"],
  ["ゃ", "", "ゅ", "", "ょ"],
  ["っ", "ー", "、", "。", "　"],
];

const katakanaColumns = hiraganaColumns.map((column) =>
  column.map((kana) => toKatakana(kana)),
);

const templatePhrases = [
  {
    category: "あいさつ",
    phrases: ["おはようございます", "こんにちは", "ありがとうございます"],
  },
  {
    category: "体調",
    phrases: ["頭が痛いです", "気分が悪いです", "水が飲みたいです"],
  },
  {
    category: "介護",
    phrases: ["トイレに行きたいです", "横になりたいです"],
  },
];

const communicationPhrases = [
  { label: "🍚 食事", phrase: "食事がしたいです" },
  { label: "🚻 トイレ", phrase: "トイレに行きたいです" },
  { label: "💊 薬", phrase: "薬をください" },
  { label: "🛏️ 休憩", phrase: "休憩したいです" },
  { label: "🚑 痛い", phrase: "痛いです" },
  { label: "🚰 水", phrase: "水が飲みたいです" },
  { label: "🙋 助けてください", phrase: "助けてください" },
];

const favoritesStorageKey = "hiraganaSpeechFavorites";
const historyStorageKey = "hiraganaSpeechHistory";
const historyLimit = 20;

const board = document.querySelector("#kana-board");
const selectedKana = document.querySelector("#selected-kana");
const speechStatus = document.querySelector("#speech-status");
const wordOutput = document.querySelector("#word-output");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const deleteButton = document.querySelector("#delete-button");
const clearButton = document.querySelector("#clear-button");
const scriptToggleButton = document.querySelector("#script-toggle-button");
const favoriteAddButton = document.querySelector("#favorite-add-button");
const scrollRightButton = document.querySelector("#scroll-right-button");
const scrollLeftButton = document.querySelector("#scroll-left-button");
const repeatButton = document.querySelector("#repeat-button");
const voiceSelect = document.querySelector("#voice-select");
const rateControl = document.querySelector("#rate-control");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const favoritesList = document.querySelector("#favorites-list");
const historyList = document.querySelector("#history-list");
const templateList = document.querySelector("#template-list");
const communicationGrid = document.querySelector("#communication-grid");

let currentKana = "あ";
let currentScript = "hiragana";
let word = [];
let isSpeakingWord = false;
let wordReadToken = 0;
let voices = [];
let favorites = readStoredList(favoritesStorageKey);
let history = readStoredList(historyStorageKey);

function toKatakana(kana) {
  return kana.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60),
  );
}

function toHiragana(kana) {
  return kana.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

function getKanaColumns() {
  return currentScript === "hiragana" ? hiraganaColumns : katakanaColumns;
}

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveStoredList(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch {
    speechStatus.textContent = "端末内に保存できませんでした";
    return false;
  }
}

function makeKanaButton(kana) {
  if (!kana) {
    const spacer = document.createElement("div");
    spacer.className = "kana-cell empty";
    spacer.setAttribute("aria-hidden", "true");
    return spacer;
  }

  const button = document.createElement("button");
  button.className = [
    "kana-cell",
    isVoicedKana(kana) ? "is-voiced" : "",
    isSmallKana(kana) ? "is-small" : "",
    isPauseMark(kana) ? "is-pause" : "",
  ]
    .filter(Boolean)
    .join(" ");
  button.type = "button";
  button.textContent = getKanaLabel(kana);
  button.dataset.kana = kana;
  button.setAttribute("aria-label", `${getKanaLabel(kana)} を言葉に入れる`);
  button.setAttribute("aria-pressed", kana === currentKana ? "true" : "false");
  button.addEventListener("click", () => addKana(kana));
  return button;
}

function isVoicedKana(kana) {
  return "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ".includes(
    kana,
  );
}

function isSmallKana(kana) {
  return "ぁぃぅぇぉゃゅょっァィゥェォャュョッ".includes(kana);
}

function isPauseMark(kana) {
  return "、。　ー".includes(kana);
}

function getKanaLabel(kana) {
  return kana === "　" ? "空白" : kana;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  board.innerHTML = "";
  getKanaColumns().flat().forEach((kana) => fragment.append(makeKanaButton(kana)));
  board.append(fragment);
}

function setActiveKana(kana) {
  currentKana = kana;
  selectedKana.textContent = kana;
  document.querySelectorAll(".kana-cell[data-kana]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.kana === kana));
  });
}

function updateWordOutput() {
  wordOutput.textContent = word.length
    ? word.map((kana) => (kana === "　" ? "□" : kana)).join("")
    : "まだありません";
  startButton.disabled = word.length === 0;
  deleteButton.disabled = word.length === 0 || isSpeakingWord;
  clearButton.disabled = word.length === 0 || isSpeakingWord;
  favoriteAddButton.disabled = word.length === 0 || isSpeakingWord;
}

function addKana(kana) {
  stopSpeaking();
  setActiveKana(kana);
  word.push(kana);
  updateWordOutput();
  speechStatus.textContent = `${kana} を入れました`;
}

function getJapaneseVoices() {
  return speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
}

function populateVoices() {
  if (!canSpeak()) {
    return;
  }

  voices = getJapaneseVoices();
  voiceSelect.innerHTML = "";

  const options = voices.length
    ? voices
    : [{ name: "ブラウザの標準音声", lang: "ja-JP", default: true }];

  options.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.append(option);
  });

  const defaultIndex = voices.findIndex((voice) => voice.default);
  voiceSelect.value = String(Math.max(defaultIndex, 0));
}

function createUtterance(kana) {
  const utterance = new SpeechSynthesisUtterance(kana);
  utterance.lang = "ja-JP";
  utterance.rate = Number(rateControl.value);
  utterance.pitch = 1;

  const selectedVoice = voices[Number(voiceSelect.value)];
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onerror = (event) => {
    if (event.error === "canceled" || event.error === "interrupted") {
      return;
    }

    speechStatus.textContent = "音声を再生できませんでした";
    resetSpeakingState();
  };

  return utterance;
}

function speakKana(kana) {
  if (!canSpeak()) {
    return;
  }

  stopSpeaking();
  setActiveKana(kana);

  const utterance = createUtterance(kana);
  utterance.onstart = () => {
    speechStatus.textContent = `${kana} を読んでいます`;
  };
  utterance.onend = () => {
    speechStatus.textContent = "準備できています";
  };

  speechSynthesis.speak(utterance);
}

function speakWord() {
  if (!canSpeak() || word.length === 0) {
    return;
  }

  stopSpeaking();
  const readToken = wordReadToken + 1;
  wordReadToken = readToken;
  isSpeakingWord = true;
  startButton.disabled = true;
  stopButton.disabled = false;
  deleteButton.disabled = true;
  clearButton.disabled = true;

  const readingWord = word.join("");
  const utterance = createUtterance(readingWord);
  utterance.onstart = () => {
    addHistory(readingWord);
    speechStatus.textContent = `${readingWord} を読んでいます`;
  };
  utterance.onend = () => {
    if (readToken === wordReadToken) {
      resetSpeakingState();
      speechStatus.textContent = "最後まで読みました";
    }
  };
  speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  wordReadToken += 1;
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
  if (isSpeakingWord) {
    speechStatus.textContent = "読み上げを終了しました";
  }
  resetSpeakingState();
}

function resetSpeakingState() {
  isSpeakingWord = false;
  stopButton.disabled = true;
  updateWordOutput();
}

function canSpeak() {
  if ("speechSynthesis" in window) {
    return true;
  }

  speechStatus.textContent = "このブラウザは音声読み上げに未対応です";
  return false;
}

function getDisplayScriptName() {
  return currentScript === "hiragana" ? "ひらがな" : "カタカナ";
}

function getNextScriptName() {
  return currentScript === "hiragana" ? "カタカナ" : "ひらがな";
}

function updateScriptToggleButton() {
  scriptToggleButton.textContent = getNextScriptName();
  scriptToggleButton.setAttribute(
    "aria-label",
    `${getNextScriptName()}に切り替える`,
  );
}

function deleteLastKana() {
  if (isSpeakingWord) {
    return;
  }
  word.pop();
  updateWordOutput();
  speechStatus.textContent = word.length ? "一文字消しました" : "全部消えました";
}

function clearWord() {
  if (isSpeakingWord) {
    return;
  }
  word = [];
  updateWordOutput();
  speechStatus.textContent = "全部消しました";
}

function getCurrentWordText() {
  return word.join("").replace(/[ 　]+/g, " ").trim();
}

function setWordFromText(text, statusText = "言葉を入力しました") {
  const phrase = text.trim();
  if (!phrase) {
    return;
  }

  stopSpeaking();
  word = Array.from(phrase);
  const lastKana = word[word.length - 1];
  if (lastKana) {
    setActiveKana(lastKana);
  }
  updateWordOutput();
  speechStatus.textContent = statusText;
}

function addFavorite() {
  const phrase = getCurrentWordText();
  if (!phrase) {
    speechStatus.textContent = "登録する言葉がありません";
    return;
  }

  if (favorites.includes(phrase)) {
    speechStatus.textContent = "すでにお気に入りにあります";
    return;
  }

  favorites = [phrase, ...favorites];
  if (saveStoredList(favoritesStorageKey, favorites)) {
    renderFavorites();
    speechStatus.textContent = "お気に入りに登録しました";
  }
}

function removeFavorite(phrase) {
  favorites = favorites.filter((item) => item !== phrase);
  if (saveStoredList(favoritesStorageKey, favorites)) {
    renderFavorites();
    speechStatus.textContent = "お気に入りから削除しました";
  }
}

function addHistory(phrase) {
  const text = phrase.trim();
  if (!text) {
    return;
  }

  history = [text, ...history.filter((item) => item !== text)].slice(0, historyLimit);
  if (saveStoredList(historyStorageKey, history)) {
    renderHistory();
  }
}

function makePhraseButton(phrase, className = "phrase-button") {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = phrase;
  button.addEventListener("click", () =>
    setWordFromText(phrase, `${phrase} を入力しました`),
  );
  return button;
}

function renderEmptyState(container, message) {
  container.innerHTML = "";
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  container.append(empty);
}

function renderFavorites() {
  favoritesList.innerHTML = "";
  if (favorites.length === 0) {
    renderEmptyState(favoritesList, "お気に入りはまだありません");
    return;
  }

  favorites.forEach((phrase) => {
    const row = document.createElement("div");
    row.className = "phrase-row";
    row.append(makePhraseButton(phrase));

    const removeButton = document.createElement("button");
    removeButton.className = "phrase-remove-button";
    removeButton.type = "button";
    removeButton.textContent = "削除";
    removeButton.addEventListener("click", () => removeFavorite(phrase));
    row.append(removeButton);

    favoritesList.append(row);
  });
}

function renderHistory() {
  historyList.innerHTML = "";
  if (history.length === 0) {
    renderEmptyState(historyList, "履歴はまだありません");
    return;
  }

  history.forEach((phrase) => {
    const row = document.createElement("div");
    row.className = "phrase-row";
    row.append(makePhraseButton(phrase));
    historyList.append(row);
  });
}

function renderTemplates() {
  const fragment = document.createDocumentFragment();
  templatePhrases.forEach(({ category, phrases }) => {
    const section = document.createElement("section");
    section.className = "template-section";

    const heading = document.createElement("h3");
    heading.textContent = category;
    section.append(heading);

    const list = document.createElement("div");
    list.className = "phrase-grid";
    phrases.forEach((phrase) => list.append(makePhraseButton(phrase)));
    section.append(list);

    fragment.append(section);
  });
  templateList.append(fragment);
}

function renderCommunication() {
  const fragment = document.createDocumentFragment();
  communicationPhrases.forEach(({ label, phrase }) => {
    const button = document.createElement("button");
    button.className = "communication-button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      setWordFromText(phrase, `${phrase} を入力しました`);
      speakWord();
    });
    fragment.append(button);
  });
  communicationGrid.append(fragment);
}

function switchTab(tabName) {
  tabButtons.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.tab === tabName));
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });
}

function toggleScript() {
  stopSpeaking();
  currentScript = currentScript === "hiragana" ? "katakana" : "hiragana";
  const converter = currentScript === "hiragana" ? toHiragana : toKatakana;

  currentKana = converter(currentKana);
  word = word.map((kana) => converter(kana));
  renderBoard();
  setActiveKana(currentKana);
  updateWordOutput();
  updateScriptToggleButton();

  board.setAttribute(
    "aria-label",
    currentScript === "hiragana" ? "ひらがなと濁音の表" : "カタカナと濁音の表",
  );
  speechStatus.textContent = `${getDisplayScriptName()}表にしました`;
}

function scrollBoard(direction) {
  board.scrollBy({
    left: direction * Math.max(180, board.clientWidth * 0.75),
    behavior: "smooth",
  });
}

renderBoard();
updateWordOutput();
updateScriptToggleButton();
renderFavorites();
renderHistory();
renderTemplates();
renderCommunication();
stopButton.disabled = true;

if ("speechSynthesis" in window) {
  populateVoices();
  speechSynthesis.addEventListener("voiceschanged", populateVoices);
} else {
  voiceSelect.disabled = true;
  repeatButton.disabled = true;
  startButton.disabled = true;
  stopButton.disabled = true;
  speechStatus.textContent = "このブラウザは音声読み上げに未対応です";
}

repeatButton.addEventListener("click", () => speakKana(currentKana));
startButton.addEventListener("click", speakWord);
stopButton.addEventListener("click", stopSpeaking);
deleteButton.addEventListener("click", deleteLastKana);
clearButton.addEventListener("click", clearWord);
scriptToggleButton.addEventListener("click", toggleScript);
favoriteAddButton.addEventListener("click", addFavorite);
scrollRightButton.addEventListener("click", () => scrollBoard(-1));
scrollLeftButton.addEventListener("click", () => scrollBoard(1));
tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});
