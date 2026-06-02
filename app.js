const kanaColumns = [
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

const board = document.querySelector("#kana-board");
const selectedKana = document.querySelector("#selected-kana");
const speechStatus = document.querySelector("#speech-status");
const wordOutput = document.querySelector("#word-output");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const deleteButton = document.querySelector("#delete-button");
const clearButton = document.querySelector("#clear-button");
const repeatButton = document.querySelector("#repeat-button");
const voiceSelect = document.querySelector("#voice-select");
const rateControl = document.querySelector("#rate-control");

let currentKana = "あ";
let word = [];
let isSpeakingWord = false;
let wordReadToken = 0;
let voices = [];

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
  return "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ".includes(kana);
}

function isSmallKana(kana) {
  return "ぁぃぅぇぉゃゅょっ".includes(kana);
}

function isPauseMark(kana) {
  return "、。　ー".includes(kana);
}

function getKanaLabel(kana) {
  return kana === "　" ? "空白" : kana;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  kanaColumns.flat().forEach((kana) => fragment.append(makeKanaButton(kana)));
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

renderBoard();
populateVoices();
updateWordOutput();
stopButton.disabled = true;

if ("speechSynthesis" in window) {
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
