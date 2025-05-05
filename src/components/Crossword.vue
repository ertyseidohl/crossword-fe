<template>
  <div class="all" :class="{ 'all--nomenu': !showInfo }">
    <div class="overlay" v-if="modalText">
      <div id="modal" class="overlay__modal">
        {{ modalText }}
      </div>
    </div>
    <div class="messages">
      <div
        v-for="(e, i) in messages"
        :key="i"
        class="message"
        @click="deleteMessage(i)"
      >
        <div class="message__text" v-html="e"></div>
      </div>
    </div>
    <div class="info" v-if="showInfo">
      <h1>Crossword</h1>
      <h2>
        Name:
        <input
          v-model="name"
          @keyup="triggerSaveTimeout()"
          @change="triggerSaveTimeout()"
        /><br />
        By
        <input
          v-model="author"
          @keyup="triggerSaveTimeout()"
          @change="triggerSaveTimeout()"
        />
      </h2>
      <p>
        Width:
        <input
          type="number"
          min="3"
          max="25"
          v-model.number="width"
          id="width"
          @keyup="handleSizeChange()"
          @change="handleSizeChange()"
        />
        Height:
        <input
          type="number"
          min="3"
          max="25"
          v-model.number="height"
          id="height"
          @keyup="handleSizeChange()"
          @change="handleSizeChange()"
        />
        Symmetry:
        <select v-model="symmetry" @change="triggerSaveTimeout()">
          <option value="180">180&deg;</option>
          <option value="90">90&deg;</option>
          <option value="0">None</option>
        </select>
        <button @click="attemptSolve(undefined)">Solve</button>
        <button @click="attemptSolve(100)">Long Solve</button>
        <button @click="exportCrossword()">Export</button>
        <button @click="importCrossword()">Import</button>
        <button @click="printCrossword(false)">Print</button>
        <button @click="printCrossword(true)">Print Sol'n</button>
        |
        <button @click="clearCrossword()">Clear</button>
        |
        <button @click="showInfo = false">Hide</button>
        <button @click="showHelp()">Help</button>
      </p>
    </div>
    <div class="restore" v-if="!showInfo">
      <button @click="showInfo = true">Show Menu</button>
    </div>
    <div class="printinfo">
      <h1>{{ name }}<span v-if="printSolutionMode"> (Solution)</span></h1>
      <p>By {{ author }}</p>
    </div>
    <div class="editor">
      <div class="crossword">
        <div v-if="wrongSize" id="wrongsize">
          Error: Width and height must be between 3 and 25.
        </div>
        <table class="crossword__table" v-if="!wrongSize">
          <tr v-for="y in cwh" :key="y">
            <td v-for="x in cww" :key="x" class="cell">
              <div class="cell__overlay" v-if="isSpecialCell(x, y)"></div>
              <div class="cell__number">{{ getCellNumber(x, y) }}</div>
              <input
                class="cell__input"
                :value="getCellVisibleValue(x, y)"
                :class="getCellClasses(x, y)"
                @keydown="handleCellKey(x, y, $event)"
                @keyup="() => false"
                @focus="handleCellFocus(x, y)"
                @dblclick="handleCellDoubleClick()"
                :id="x + ',' + y"
                :ref="x + ',' + y"
                maxlength="1"
              />
            </td>
          </tr>
        </table>
      </div>
      <div class="clueeditor">
        <div class="clueeditor__minwordlength">
          <label for="minimum-word-length-for-clue"
            >Minimum word length for clue:
          </label>
          <input
            type="number"
            min="1"
            :max="maxClueLength"
            v-model.number="minimumWordLengthForClue"
            @change="recalculate()"
            class="clueeditor__minwordlength__input"
            id="minimum-word-length-for-clue"
          />
        </div>
        <div v-show="dirtyClues">
          Some clues need checking
          <span class="clueeditor__checkall" @click="checkAll()">
            Check all
          </span>
        </div>
        <div
          v-for="(clues, dir) in sortedClues"
          :key="dir"
          class="clueeditor__type"
        >
          <b>{{ dir }}</b>
          <div v-for="(clue, i) in clues" :key="i" class="clue">
            {{ clue.ordinal }}
            <input
              class="clue__input"
              :class="{ 'clue__input--dirty': clue.isDirty }"
              :ref="clue.x + ',' + clue.y + ',' + clue.direction"
              :id="clue.x + ',' + clue.y + ',' + clue.direction"
              type="text"
              :data-index="i"
              v-model="clue.text"
              @focus="handleClueFocus(clue.x, clue.y, clue.direction)"
              @keydown="handleClueKey($event)"
            />
          </div>
        </div>
      </div>
      <div class="cluedisplay" v-if="!printSolutionMode">
        <div
          v-for="(clues, dir) in sortedClues"
          :key="dir"
          class="cluedisplay__type"
        >
          <h3 class="cluedisplay__dir">{{ dir }}</h3>
          <div v-for="(clue, i) in clues" :key="i" class="cluedisplay__clue">
            <b>{{ clue.ordinal }}</b>
            {{ clue.text }}
          </div>
        </div>
      </div>
      <div class="wordlist">
        <input
          type="text"
          ref="exploreword"
          id="exploreword"
          v-model="exploreWord"
          @keydown="handleExploreKey($event)"
        />
        <br />
        <select
          :size="wordList.length"
          id="wordlist"
          ref="wordlist"
          @blur="clearGhosts()"
          @keydown="handleWordListKey($event)"
        >
          <option class="word" v-for="(word, i) in wordList" :key="i">
            {{ word }}
          </option>
        </select>
        <div v-if="wordList.length" id="wordlist__page">
          <div>
            <span
              class="wordlist__link"
              @click="getCompletions(exploreWord, true)"
              :class="{ 'wordlist__link--hidden': wordListPage === 0 }"
              >Prev</span
            >
            (Page {{ wordListPage + 1 }})
            <span
              class="wordlist__link"
              @click="getCompletions(exploreWord, false)"
              :class="{
                'wordlist__link--hidden': wordListPage === wordListPageMax,
              }"
              >Next</span
            >
          </div>
          <div v-if="wordListPage === wordListPageMax">(Last Page)</div>
        </div>
        <div class="desiredwords">
          <p><b>Your Words</b></p>
          <textarea
            ref="desiredwords"
            id="desiredwords"
            v-model="desiredWords"
            @keyup="handleDesiredWordsKey($event)"
            placeholder="Enter one per line"
          >
          </textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
p,
td,
input,
button,
select,
textarea {
  font-size: 18px;
}

td {
  border: 1px solid black;
  padding: 0;
}

.all {
  position: relative;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.overlay__modal,
.message__text {
  background-color: white;
  border: 1px solid black;
  border-radius: 3px;
  box-shadow: 5px 5px 5px black;
  padding: 0.5rem 1rem;
}

.messages {
  position: fixed;
  left: 50%;
  margin-left: -300px;
  z-index: 10;
}

.message {
  display: block;
  width: 600px;
  margin: 0 auto;
  cursor: pointer;
}

.message__text:hover {
  background: #ccc;
}

.editor {
  display: grid;
  grid-template-columns: auto auto 300px;
  margin: 0 auto;
}

.crossword {
  padding: 0 1rem;
}

.crossword__table {
  margin: 0 auto;
  border-collapse: collapse;
}

.cell {
  position: relative;
  padding: 0;
  margin: 0;
}

.cell__number {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 1px;
  font-size: 0.5rem;
}

.cell__number--dirty {
  color: red;
}

.cell__input {
  width: 1.5rem;
  height: 1.5rem;
  text-transform: uppercase;
  border: none;
  text-align: center;
  padding: 5px 3px 1px 3px;
}

.cell__input--single-letter {
  background-color: #ffaaaa;
}

.cell__input--double-letter {
  background-color: #ffdddd;
}

.cell__input--sameword {
  background-color: #ccc;
}

.cell__input--reflection {
  background-color: #eee;
}

.cell__input--ghost {
  color: #fff;
}

.cell__overlay {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 1px solid black;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cell__input--current:focus {
  background-color: cornflowerblue;
  outline: none;
  box-shadow: none;
}

.cell__input--current {
  background-color: #aaccff;
}

.cell__input--dark {
  background-color: black;
}

.cell__input--dark:focus {
  background-color: #46c;
  color: #46c;
}

.word {
  font-family: monospace;
}

.word--selected {
  background-color: black;
  color: white;
  font-weight: bold;
}

.desiredwords {
  margin-top: 1rem;
}

.desiredwords textarea {
  width: 187px;
  min-height: 300px;
}

.printinfo {
  display: none;
}

.clueeditor {
  max-height: 600px;
  overflow-x: scroll;
}

.all--nomenu .clueeditor {
  height: auto;
}

.clueeditor__type {
  text-align: left;
}

.clueeditor__checkall {
  text-decoration: underline;
  cursor: pointer;
}

.clueeditor__minwordlength {
  margin: 0.5rem 0;
}

.clueeditor__minwordlength__input {
  width: 4rem;
  margin-right: 1rem;
}

.clue__input--dirty {
  color: red;
}

.clue {
  display: grid;
  grid-template-columns: 2rem auto;
}

.cluedisplay {
  display: none;
  text-align: left;
}

.wordlist__link {
  text-decoration: underline;
  cursor: pointer;
}

.wordlist__link--hidden {
  visibility: hidden;
}

@media print {
  h1 {
    margin: 0;
  }
  .cell__input,
  .cell__input:focus {
    background-color: white;
  }
  .cell__input--dark {
    background-color: black;
    color: black;
  }
  .cell__number--dirty,
  .clue__input--dirty {
    color: black;
  }
  .messages {
    display: none;
  }
  .info {
    display: none;
  }
  .printinfo {
    display: block;
  }
  .wordlist {
    display: none;
  }
  .desiredwords {
    display: none;
  }
  .editor {
    display: block;
  }
  .crossword {
    margin-bottom: 1rem;
  }
  .crossword__table {
    margin: 0px auto;
  }
  .clueeditor {
    display: none;
  }
  .cluedisplay {
    display: block;
  }
}
</style>

<script setup lang="ts">
import { reactive, computed, onMounted, toRefs, Reactive } from "vue";
import CrosswordServer from "../lib/CrosswordServer";
import LocalStorage from "../lib/LocalStorage";
import { safeBase64Decode } from "../lib/Base64";
import { CrosswordParseError } from "../lib/CrosswordParseError";
import { backendUrl } from "../settings";

type Bound = [[number, number], [number, number], [number, number]];

type UpperCaseCharacter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";
type LowerCaseCharacter =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";
type SpecialCharacter = "" | " " | "#";
type Char = UpperCaseCharacter | LowerCaseCharacter | SpecialCharacter;

// `server` needs to be global and writable so that our test can override it.
// let server = new CrosswordServer("//localhost:8081")
let server = new CrosswordServer(backendUrl);
// Bind to window, so that webpack doesn't mangle our function name.
(window as any).replaceServer = function (url: string) {
  server = new CrosswordServer(url);
};

var showSaveWarning = true;
// We need a way to disable the "unsaved data" alert for tests.
(window as any).disableSaveWarning = function () {
  showSaveWarning = false;
};

const storage = new LocalStorage();

enum Direction {
  HORIZONTAL = 1,
  VERTICAL = 2,
}

// If you change these, also search for other
// instances of the numbers.
const MAX_SIZE = 25;
const MIN_SIZE = 3;

const STATE_STARTUP = 0;
const STATE_EDIT = 1;
const STATE_WAIT = 2;
const STATE_SAVING = 3;
const STATE_LOADING = 4;

enum Symmetry {
  SYMMETRY_NONE = 0,
  SYMMETRY_90 = 1,
  SYMMETRY_180 = 2,
}

const DARK = "#";

const HELP_MESSAGE = `
  <h3>Help</h3>
  <p><b>Arrows or Click</b> to navigate grid</p>
  <p><b>Forward Slash (/) or Double Click</b> to switch Across/Down</p>
  <p><b>Tab/Shift+Tab</b> to select tools</p>
  <p><b>.</b> (period) to toggle special cells (circle)</p>
  <p><b>Enter</b> to query word completion</p>
  <p><b>ESC</b> to clear messages like this (or click here!)</p>
  <p><b>Cell Colors:</b></p>
  <p>White: Valid</p>
  <p>Blue: Valid, current</p>
  <p>Dark Grey: Valid, current word</p>
  <p>Light Grey: Valid, reflection of current cell</p>
  <p>Red: Valid, but is a one-letter word</p>
`;

const isBlankOrDark = (char: string) => {
  return char === "" || char === DARK;
};

interface State {
  appState: number;
  moveMode: Direction;
  currX: number;
  currY: number;
  height: number;
  width: number;
  name: string;
  author: string;
  messages: string[];
  cells: Reactive<Record<string, Char>>;
  ghostCells: Reactive<Record<string, Char>>;
  specialCells: Set<string>;
  wordList: string[];
  wordListPage: number;
  wordListPageMax: number | undefined;
  wordListCache: string[];
  wordListCacheWord: string | null;
  wordListServerPage: number;
  wordAtCache: Reactive<Record<string, string>>;
  desiredWords: string[];
  saveTimeout: number | null;
  symmetry: Symmetry;
  exploreWord: string;
  cellNumbers: Reactive<Record<string, number>>;
  currentClues: Clue[];
  historicalClues: Reactive<Record<string, Clue[]>>;
  showInfo: boolean;
  waitTimeout: number | undefined;
  printMode: boolean;
  printSolutionMode: boolean;
  minimumWordLengthForClue: number;
}

const defaultState: State = {
  appState: STATE_STARTUP,
  moveMode: Direction.HORIZONTAL,
  currX: 0,
  currY: 0,
  height: 13,
  width: 13,
  name: "My Crossword",
  author: "Me",
  messages: [],
  cells: reactive({} as Record<string, Char>),
  ghostCells: reactive({} as Record<string, Char>),
  specialCells: new Set<string>(),
  wordList: [],
  wordListPage: -1,
  wordListPageMax: undefined,
  wordListCache: [],
  wordListCacheWord: null,
  wordListServerPage: -1,
  wordAtCache: reactive({}),
  desiredWords: [],
  saveTimeout: null,
  symmetry: Symmetry.SYMMETRY_180,
  exploreWord: "",
  cellNumbers: reactive({}),
  currentClues: [],
  historicalClues: reactive({} as Record<string, Clue[]>),
  showInfo: true,
  waitTimeout: undefined,
  printMode: false,
  printSolutionMode: false,
  minimumWordLengthForClue: 1,
};

const state = reactive(defaultState);

const cww = computed(() => {
  if (isNaN(state.width) || state.width < MIN_SIZE || state.width > MAX_SIZE) {
    return [];
  }
  return [...Array(state.width).keys()];
});
const cwh = computed(() => {
  if (
    isNaN(state.height) ||
    state.height < MIN_SIZE ||
    state.height > MAX_SIZE
  ) {
    return [];
  }

  return [...Array(state.height).keys()];
});
const wrongSize = computed(() => {
  return (
    state.height < MIN_SIZE ||
    state.height > MAX_SIZE ||
    state.width < MIN_SIZE ||
    state.width > MAX_SIZE
  );
});
const sortedClues = computed(() => {
  function getFilter(dir: Direction) {
    return function (clue: Clue) {
      return (
        clue.direction === dir &&
        clue.word.length >= state.minimumWordLengthForClue
      );
    };
  }
  return {
    ACROSS: state.currentClues.filter(getFilter(Direction.HORIZONTAL)),
    DOWN: state.currentClues.filter(getFilter(Direction.VERTICAL)),
  };
});
const modalText = computed(() => {
  switch (state.appState) {
    case STATE_STARTUP:
      return "Starting...";
    case STATE_WAIT:
      if (state.waitTimeout) {
        return "Thinking for up to " + state.waitTimeout + " seconds...";
      }
      return "Thinking...";
    case STATE_SAVING:
      return "Saving...";
    case STATE_LOADING:
      return "Loading...";
    default:
      return undefined;
  }
});
const dirtyClues = computed(() => {
  return state.currentClues.some((c) => c.isDirty);
});
const maxClueLength = computed(() => {
  return Math.max(...state.currentClues.map((c) => c.word.length));
});

onMounted(() => {
  if (state.appState === STATE_STARTUP) {
    load().then(() => {
      // note that load calls recalculate to place the cell numbers
      document.getElementById("0,0")?.focus();
      state.appState = STATE_EDIT;
    });
  }
});

function deleteMessage(index: number) {
  state.messages.splice(index, 1);
}
function showHelp() {
  state.messages.push(HELP_MESSAGE);
}
function isBlocked() {
  return (
    state.appState === STATE_WAIT ||
    state.appState === STATE_STARTUP ||
    state.appState === STATE_SAVING ||
    state.appState === STATE_LOADING
  );
}
function getCellClasses(x: number, y: number) {
  const classes: any = {
    "cell__input--current": state.currX === x && state.currY === y,
    "cell__input--dark": isDark(x, y),
    "cell__input--sameword": isSameWord(x, y),
    "cell__input--ghost": isShowingGhost(x, y),
    "cell__input--reflection": isReflectionCell(x, y),
    "cell__input--special": isSpecialCell(x, y),
  };
  const minLetterLength = getMinLetterLength(x, y);
  if (minLetterLength === 1) {
    classes["cell__input--single-letter"] = true;
  } else if (minLetterLength === 2) {
    classes["cell__input--double-letter"] = true;
  }
  return classes;
}
function setCell(x: number, y: number, v: Char) {
  const currentChar = getCell(x, y);
  if (currentChar === v) {
    return;
  }
  if (currentChar === "#") {
    setCellDark(x, y, false);
  }
  state.cells[x + "," + y] = v;
  invalidateCluesAt(x, y);
  triggerSaveTimeout();
}
function setCellNoChecks(x: number, y: number, v: Char) {
  state.cells[x + "," + y] = v;
}
function setCellDark(x: number, y: number, dark: boolean) {
  const char = dark ? "#" : "";
  if (state.symmetry === Symmetry.SYMMETRY_180) {
    if (!isBlankOrDark(getCell(state.width - x - 1, state.height - y - 1))) {
      state.messages.push("Making this cell dark would delete a letter.");
      return;
    }
    setCellNoChecks(x, y, char);
    setCellNoChecks(state.width - x - 1, state.height - y - 1, char);
  } else if (state.symmetry === Symmetry.SYMMETRY_90) {
    if (
      !isBlankOrDark(getCell(state.width - x - 1, state.height - y - 1)) ||
      !isBlankOrDark(getCell(state.width - x - 1, y)) ||
      !isBlankOrDark(getCell(x, state.height - y - 1))
    ) {
      state.messages.push("Making this cell dark would delete a letter.");
      return;
    }
    setCellNoChecks(x, y, char);
    setCellNoChecks(state.width - x - 1, state.height - y - 1, char);
    setCellNoChecks(state.width - x - 1, y, char);
    setCellNoChecks(x, state.height - y - 1, char);
  } else if (state.symmetry === Symmetry.SYMMETRY_NONE) {
    setCellNoChecks(x, y, char);
  } else {
    state.messages.push("Unknown symmetry: " + state.symmetry);
  }
  recalculate();
  triggerSaveTimeout();
}
function getCell(x: number, y: number): Char {
  return state.cells[x + "," + y] || "";
}
function isDark(x: number, y: number) {
  return state.cells[x + "," + y] === "#";
}
function isReflectionCell(x: number, y: number) {
  if (state.symmetry === Symmetry.SYMMETRY_180) {
    if (
      state.currX === state.width - x - 1 &&
      state.currY === state.height - y - 1
    ) {
      return true;
    }
  } else if (state.symmetry === Symmetry.SYMMETRY_90) {
    if (state.currX === state.width - x - 1) {
      if (state.currY === state.height - y - 1) {
        return true;
      } else if (state.currY === y) {
        return true;
      }
    } else if (state.currX === x && state.currY === state.height - y - 1) {
      return true;
    }
  }
}
function setSpecialCell(x: number, y: number) {
  const key = x + "," + y;
  if (state.specialCells.has(key)) {
    state.specialCells.delete(key);
  } else {
    state.specialCells.add(key);
  }
}
function isSpecialCell(x: number, y: number) {
  const key = x + "," + y;
  return state.specialCells.has(key);
}
function getWordLength(bounds: Bound, direction: Direction): number {
  if (direction === Direction.VERTICAL) {
    return bounds[1][1] - bounds[0][1] + 1;
  }
  return bounds[1][0] - bounds[0][0] + 1;
}
function getMinLetterLength(x: number, y: number) {
  if (isDark(x, y)) {
    return false;
  }
  // Probably could cache this for optimization in the future since we're recomputing
  // a lot of the same word lengths over and over
  const verticalLength = getWordLength(
    getWordBounds(x, y, Direction.VERTICAL),
    Direction.VERTICAL
  );
  const horizontalLength = getWordLength(
    getWordBounds(x, y, Direction.HORIZONTAL),
    Direction.HORIZONTAL
  );
  return Math.min(verticalLength, horizontalLength);
}
function setGhost(x: number, y: number, v: Char): void {
  state.ghostCells[x + "," + y] = v;
}
function getGhost(x: number, y: number): Char {
  return state.ghostCells[x + "," + y] || "";
}
function isShowingGhost(x: number, y: number): boolean {
  return (getGhost(x, y) && !getCell(x, y)) !== "";
}
function getCellVisibleValue(x: number, y: number) {
  if (state.printMode && !state.printSolutionMode) {
    return "";
  }
  return getCell(x, y) || getGhost(x, y);
}
function clearGhosts() {
  state.ghostCells = {};
}
function handleSizeChange() {
  recalculate();
  triggerSaveTimeout();
}
function triggerSaveTimeout() {
  if (state.appState === STATE_LOADING) {
    // Don't save if we're in the middle of loading.
    return;
  }
  if (state.saveTimeout) {
    window.clearTimeout(state.saveTimeout);
  }
  state.saveTimeout = window.setTimeout(save, 500);
  if (showSaveWarning) {
    window.onbeforeunload = function (event) {
      event.preventDefault();
      return "Your changes have not been saved.";
    };
  }
}
function getCrosswordData() {
  return {
    crossword: getEntireCrossword(),
    author: state.author,
    name: state.name,
    width: state.width,
    height: state.height,
    desiredWords: state.desiredWords,
    symmetry: state.symmetry,
    currentClues: state.currentClues,
    historicalClues: state.historicalClues,
    showInfo: state.showInfo,
    specialCells: state.specialCells,
  };
}
function save() {
  state.appState = STATE_SAVING;
  if (state.saveTimeout) {
    state.saveTimeout = null;
  }
  return storage
    .save(getCrosswordData())
    .then(handleSave)
    .catch(handleSaveError);
}
function handleSave() {
  state.appState = STATE_EDIT;
  window.onbeforeunload = null;
}
function handleSaveError(error: string) {
  state.appState = STATE_EDIT;
  state.messages.push(error);
}
function load() {
  state.appState = STATE_LOADING;
  return storage.load().then(handleLoad).catch(handleLoadError);
}
function handleLoad(crosswordData: any) {
  if (crosswordData) {
    state.author = crosswordData.author || "Me";
    state.name = crosswordData.name || "My Crossword";
    state.width = crosswordData.width || 13;
    state.height = crosswordData.height || 13;
    state.desiredWords = crosswordData.desiredWords || "";
    state.symmetry = crosswordData.symmetry || Symmetry.SYMMETRY_180;
    rehydrateClues(
      crosswordData.currentClues || [],
      crosswordData.historicalClues || []
    );
    if (crosswordData.crossword) {
      fillEntireCrossword(crosswordData.crossword);
    }
    state.specialCells = crosswordData.specialCells || {};
    // "re-dirty" the clues that are dirty (hax)
    reDirtyDirtyClues(crosswordData.currentClues);
    state.showInfo = crosswordData.showInfo || true;
  } else {
    state.messages.push("Welcome!");
    recalculate();
  }
  // Set state last (or we'll accidentially trigger the save timeout).
  state.appState = STATE_EDIT;
}
function reDirtyDirtyClues(jsonClues: any) {
  // This is a hack because fillEntireCrossword calls recalculate, which marks
  // clues as not dirty (when they should be).
  state.currentClues.forEach((c) => {
    for (let i = 0; i < jsonClues.length; i++) {
      const jsonClue = jsonClues[i];
      if (c.isSame(jsonClue.x, jsonClue.y, jsonClue.direction)) {
        c.isDirty = jsonClue.isDirty;
        return;
      }
    }
  });
}
function handleLoadError(error: string) {
  state.appState = STATE_EDIT;
  state.messages.push(error);
}
function rehydrateClues(jsonCurrentClues: any, jsonHistoricalClues: any) {
  state.historicalClues = {};
  state.currentClues = [];
  // We need to make sure that not only the values, but the
  // actual references in historical and current clues are
  // the same.
  for (let loc in jsonHistoricalClues) {
    jsonHistoricalClues[loc]
      .map((c: any) => Clue.from(c))
      .map(addHistoricalClue);
  }
  for (let jsonClue of jsonCurrentClues) {
    // We are guaranteed that a clue in existing exists in historical
    // ... As long as nobody has tampered with the data.
    const clue = findExistingClue(jsonClue.x, jsonClue.y, jsonClue.direction);
    if (clue != null) {
      state.currentClues.push(clue);
    }
  }
}
function attemptSolve(timeout: number | undefined) {
  state.appState = STATE_WAIT;
  state.waitTimeout = timeout;
  return server
    .attemptSolve(getEntireCrossword(), timeout)
    .then(handleSolveAttempt)
    .catch(handleSolveAttemptError);
}
function handleSolveAttempt(result: string) {
  state.waitTimeout = undefined;
  state.appState = STATE_EDIT;
  if (!result) {
    return;
  }
  fillEntireCrossword(result);
}
function handleSolveAttemptError(error: string) {
  state.appState = STATE_EDIT;
  state.waitTimeout = undefined;
  state.messages.push(error);
}
function fillEntireCrossword(crosswordData: string) {
  const content = crosswordData.split("\n");
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (content[y][x] === ".") {
        setCellNoChecks(x, y, "");
      } else {
        const char: string | Char = content[x][y];
        if (isChar(char)) {
          setCellNoChecks(x, y, char);
        } else {
          console.error(
            "Invalid character in crossword data: " + content[y][x]
          );
        }
      }
    }
  }
  recalculate();
}
function getEntireCrossword() {
  let rows = [];
  for (let y = 0; y < state.height; y++) {
    let row = [];
    for (let x = 0; x < state.width; x++) {
      let cell = getCell(x, y);
      row.push(cell === "" ? "." : cell);
    }
    rows.push(row.join(""));
  }
  return rows.join("\n");
}
function getLocalWords() {
  if (!state.desiredWords) {
    return [];
  }
  return state.desiredWords.filter((w) => !!w.trim());
}
function getCompletions(word: string, backward: boolean) {
  state.appState = STATE_WAIT;
  if (backward) {
    state.wordListPage = Math.max(state.wordListPage - 1, 0);
  } else if (
    state.wordListPageMax !== undefined &&
    state.wordListPage >= state.wordListPageMax
  ) {
    state.wordListPage = state.wordListPageMax;
    return Promise.resolve().then(() => (state.appState = STATE_EDIT));
  } else {
    state.wordListPage++;
  }
  const currentWordRegex = new RegExp("^" + word.toUpperCase() + "$");
  if (word !== state.wordListCacheWord) {
    let localWords = getLocalWords()
      .map((w) => w.toUpperCase())
      .filter((w) => currentWordRegex.test(w));
    state.wordListCache = localWords;
    state.wordListCacheWord = word;
  }
  const startIndex = state.wordListPage * 10;
  const endIndex = (state.wordListPage + 1) * 10;
  if (
    state.wordListPageMax === undefined &&
    endIndex > state.wordListCache.length
  ) {
    state.wordListServerPage++;
    return server
      .getCompletions(word.toUpperCase(), state.wordListServerPage)
      .then((result) => {
        if (result.length === 0) {
          state.wordListPageMax = state.wordListPage;
          state.wordListPage--;
          return Promise.resolve().then(() => (state.appState = STATE_EDIT));
        }
        if (result.length < 10) {
          state.wordListPageMax = state.wordListPage;
        }
        state.wordListCache = state.wordListCache.concat(result);
        completeWordListUpdate(state.wordListCache.slice(startIndex, endIndex));
      })
      .catch(handleCompletionsError);
  } else {
    return Promise.resolve().then(() =>
      completeWordListUpdate(state.wordListCache.slice(startIndex, endIndex))
    );
  }
}
function invalidateWordListCache() {
  state.wordListPage = -1;
  state.wordListPageMax = undefined;
  state.wordListServerPage = -1;
  state.wordList = [];
  state.wordListCache = [];
  state.wordListCacheWord = null;
}
function completeWordListUpdate(result: string[]) {
  state.wordList = result;
  state.appState = STATE_EDIT;
}
function handleCompletionsError(error: string) {
  state.appState = STATE_EDIT;
  state.wordList = [];
  state.messages.push(error);
}
function fillWithWord(word: string, isGhost: boolean) {
  if (state.wordList.length === 0) {
    return;
  }
  let [[x, y], [dx, dy]]: Bound = getWordBounds(
    state.currX,
    state.currY,
    state.moveMode
  );
  for (let char of word.split("")) {
    if (!isChar(char)) {
      state.messages.push("Invalid character: " + char);
      return;
    }
    if (isGhost) {
      setGhost(x, y, char);
    } else {
      setCell(x, y, char);
    }
    x += dx;
    y += dy;
  }
}
function switchFocus(target: string) {
  if (target === "livecell") {
    document.getElementById(state.currX + "," + state.currY)?.focus();
  } else if (target === "clue") {
    const [[startX, startY], _] = getWordBounds(
      state.currX,
      state.currY,
      state.moveMode
    );
    document
      .getElementById(startX + "," + startY + "," + state.moveMode)
      ?.focus();
  } else if (target === "wordlist") {
    const wordListElement = document.getElementById(
      "wordlist"
    ) as HTMLSelectElement | null;
    if (!wordListElement) {
      return;
    }
    wordListElement.focus();
    wordListElement.selectedIndex = 0;
  } else {
    document.getElementById(target)?.focus();
  }
}
function handleCellFocus(x: number, y: number) {
  // Focus always fires before click
  state.currX = x;
  state.currY = y;
}
function handleCellDoubleClick() {
  state.moveMode =
    state.moveMode === Direction.VERTICAL
      ? Direction.HORIZONTAL
      : Direction.VERTICAL;
}
function handleWordListKey(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || !event.target) {
    return;
  }
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  const key = event.key;
  const word = (event.target as HTMLInputElement).value;
  const wordListElement = document.getElementById(
    "wordlist"
  ) as HTMLSelectElement | null;

  if (!wordListElement) {
    return;
  }

  if (key === "Enter" && word) {
    fillWithWord(word, false);
    switchFocus("livecell");
  } else if (key === "ArrowLeft") {
    getCompletions(state.exploreWord, true).then(() =>
      fillWithWord(word, true)
    );
  } else if (key === "ArrowRight") {
    getCompletions(state.exploreWord, false).then(() =>
      fillWithWord(word, true)
    );
  } else if (key === "ArrowUp") {
    if (wordListElement.selectedIndex === 0) {
      event.preventDefault();
      getCompletions(state.exploreWord, true)
        .then(() => fillWithWord(word, true))
        .then(
          () => (wordListElement.selectedIndex = state.wordList.length - 1)
        );
    } else {
      setTimeout(() => fillWithWord(word, true), 0);
    }
  } else if (key === "ArrowDown") {
    if (wordListElement.selectedIndex === state.wordList.length - 1) {
      event.preventDefault();
      getCompletions(state.exploreWord, false)
        .then(() => fillWithWord(word, true))
        .then(() => (wordListElement.selectedIndex = 0));
    } else {
      setTimeout(() => fillWithWord(word, true), 0);
    }
  } else if (key === "Escape") {
    event.preventDefault();
    switchFocus("livecell");
  }
}
function handleCellKey(x: number, y: number, event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey) {
    return;
  }
  event.preventDefault();
  if (isBlocked()) {
    return;
  }
  const key = event.key;
  if (key === "Backspace") {
    if (getCell(x, y) === DARK) {
      return;
    }
    if (getCell(x, y) === "") {
      moveCursor(x, y, state.moveMode, -1);
      setCell(state.currX, state.currY, "");
    } else {
      setCell(x, y, "");
    }
  } else if (key === "/" || key === "?") {
    switchMoveMode();
  } else if (key === "Enter") {
    if (getCell(state.currX, state.currY) === DARK) {
      return;
    }
    invalidateWordListCache();
    state.exploreWord = getWordAt(state.currX, state.currY, state.moveMode);
    getCompletions(state.exploreWord, false).then(() => {
      switchFocus("wordlist");
      if (state.wordList.length) {
        fillWithWord(state.wordList[0], true);
      }
    });
  } else if (key === "ArrowLeft") {
    moveCursor(x, y, Direction.HORIZONTAL, -1);
  } else if (key === "ArrowUp") {
    moveCursor(x, y, Direction.VERTICAL, -1);
  } else if (key === "ArrowRight") {
    moveCursor(x, y, Direction.HORIZONTAL, 1);
  } else if (key === "ArrowDown") {
    moveCursor(x, y, Direction.VERTICAL, 1);
  } else if (key === " ") {
    if (getCell(x, y) === DARK) {
      setCellDark(x, y, false);
    } else {
      setCellDark(x, y, true);
    }
  } else if (key === "Escape") {
    state.messages = [];
  } else if (key === "Tab") {
    switchFocus("clue");
  } else if (key === ".") {
    setSpecialCell(x, y);
  } else if (/^[a-z0-9]$/i.test(key)) {
    setCell(x, y, key.toUpperCase() as Char);
    moveCursor(x, y, state.moveMode, 1);
  }
}
function handleClueKey(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || !event.target) {
    return;
  }

  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const key = event.key;

  if (key === "Enter") {
    switchFocus("livecell");
  } else if (key === "Shift") {
    // Do nothing
  } else if (key === "Tab") {
    event.preventDefault();
    if (event.shiftKey) {
      switchFocus("livecell");
    } else {
      switchFocus("exploreword");
    }
  } else if (key === "ArrowUp") {
    selectAdjacentClue(
      event.target.id,
      event.target.dataset["index"] || "",
      -1
    );
  } else if (key === "ArrowDown") {
    selectAdjacentClue(event.target.id, event.target.dataset["index"] || "", 1);
  } else {
    triggerSaveTimeout();
  }
}
function selectAdjacentClue(
  currentId: string,
  currentIndexStr: string,
  delta: -1 | 1
) {
  // This is bad code and I feel bad about it thanks
  const currentIndex = parseInt(currentIndexStr, 10);
  const [_x, _y, directionStr] = currentId.split(",");
  const direction = parseInt(directionStr, 10);
  const acrossClues = state.currentClues.filter(
    (c) => c.direction === Direction.HORIZONTAL
  );
  const downClues = state.currentClues.filter(
    (c) => c.direction === Direction.VERTICAL
  );
  const toRef = (c: Clue) => c.x + "," + c.y + "," + c.direction;
  if (direction === Direction.HORIZONTAL) {
    if (delta === -1 && currentIndex === 0) {
      switchFocus(toRef(downClues[downClues.length - 1]));
    } else if (delta === 1 && currentIndex === acrossClues.length - 1) {
      switchFocus(toRef(downClues[0]));
    } else {
      switchFocus(toRef(acrossClues[currentIndex + delta]));
    }
  } else if (direction === Direction.VERTICAL) {
    if (delta === -1 && currentIndex === 0) {
      switchFocus(toRef(acrossClues[acrossClues.length - 1]));
    } else if (delta === 1 && currentIndex === downClues.length - 1) {
      switchFocus(toRef(acrossClues[0]));
    } else {
      switchFocus(toRef(downClues[currentIndex + delta]));
    }
  }
}
function moveCursor(
  x: number,
  y: number,
  direction: Direction,
  distance: number
) {
  const xd = direction === Direction.HORIZONTAL ? x + distance : x;
  const yd = direction === Direction.VERTICAL ? y + distance : y;
  const cell = document.getElementById(xd + "," + yd);
  if (cell) {
    cell.focus();
  }
  state.currX = xd;
  state.currY = yd;
}
function isSameWord(x: number, y: number) {
  if (getCell(x, y) === DARK) {
    return false;
  }
  if (x === state.currX && y === state.currY) {
    return true;
  }
  if (state.moveMode === Direction.VERTICAL && x === state.currX) {
    const dir = y < state.currY ? 1 : -1;
    return isSameWord(x, y + dir);
  }
  if (state.moveMode === Direction.HORIZONTAL && y === state.currY) {
    const dir = x < state.currX ? 1 : -1;
    return isSameWord(x + dir, y);
  }
  return false;
}
function switchMoveMode() {
  state.moveMode =
    state.moveMode === Direction.HORIZONTAL
      ? Direction.VERTICAL
      : Direction.HORIZONTAL;
}
function isValidCell(x: number, y: number) {
  return x >= 0 && x < state.width && y >= 0 && y < state.height;
}
function getWordBounds(x: number, y: number, direction: Direction): Bound {
  let startX = x;
  let startY = y;
  let endX = x;
  let endY = y;
  const dx = direction === Direction.HORIZONTAL ? 1 : 0;
  const dy = direction === Direction.VERTICAL ? 1 : 0;
  while (
    getCell(startX - dx, startY - dy) !== DARK &&
    isValidCell(startX - dx, startY - dy)
  ) {
    startX -= dx;
    startY -= dy;
  }
  while (
    getCell(endX + dx, endY + dy) !== DARK &&
    isValidCell(endX + dx, endY + dy)
  ) {
    endX += dx;
    endY += dy;
  }
  return [
    [startX, startY],
    [endX, endY],
    [dx, dy],
  ];
}
function invalidateWordAtCache() {
  state.wordAtCache = {};
}
function getWordAt(x: number, y: number, direction: Direction): string {
  // Cache this, since we call this a lot.
  // This cache should be invalidated when the crossword changes.
  if (state.wordAtCache[x + "," + y + "," + direction]) {
    return state.wordAtCache[x + "," + y + "," + direction];
  }
  const [[startX, startY], [endX, endY], [dx, dy]] = getWordBounds(
    x,
    y,
    direction
  );
  let currX = startX;
  let currY = startY;
  const letters = [];
  while (currX !== endX || currY !== endY) {
    const letter = getCell(currX, currY);
    letters.push(letter === "" ? "." : letter);
    currX += dx;
    currY += dy;
  }
  // Grab the last one
  const letter = getCell(currX, currY);
  letters.push(letter === "" ? "." : letter);
  state.wordAtCache[x + "," + y + "," + direction] = letters.join("");
  return letters.join("");
}
function handleExploreKey(event: KeyboardEvent) {
  const key = event.key;
  if (key === "Enter") {
    invalidateWordListCache();
    getCompletions(state.exploreWord, false);
    switchFocus("wordlist");
  } else if (key === "Tab") {
    if (event.shiftKey) {
      event.preventDefault();
      switchFocus("clue");
    }
  }
}
function createOrCopyClue(
  x: number,
  y: number,
  cellNumber: number,
  direction: Direction
) {
  const word = getWordAt(x, y, direction);
  const existingClue = findExistingClue(x, y, direction);
  if (existingClue) {
    existingClue.ordinal = cellNumber;
    existingClue.isDirty = existingClue.isDirty || existingClue.word !== word;
    existingClue.word = word;
    state.currentClues.push(existingClue);
  } else {
    const clue = new Clue(x, y, cellNumber, direction, word, "", true);
    state.currentClues.push(clue);
    addHistoricalClue(clue);
  }
}
function checkAll() {
  state.currentClues.forEach((c) => (c.isDirty = false));
  triggerSaveTimeout();
}
function recalculate() {
  if (state.width < MIN_SIZE || state.height < MIN_SIZE) {
    return;
  }
  state.currentClues = [];
  state.cellNumbers = {};
  let cellNumber = 1;
  invalidateWordAtCache();
  // Need to figure out the minimum word length for clues first to avoid
  // the case where all of the words are too short and therefore no clues
  // are generated.
  let longestWord = -Infinity;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (getCell(x, y) === DARK) {
        continue;
      }
      longestWord = Math.max(
        longestWord,
        getWordAt(x, y, Direction.VERTICAL).length,
        getWordAt(x, y, Direction.HORIZONTAL).length
      );
    }
  }
  if (state.minimumWordLengthForClue > longestWord) {
    state.minimumWordLengthForClue = longestWord;
  }
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (getCell(x, y) === DARK) {
        continue;
      }
      let isHorizontal = x === 0 || getCell(x - 1, y) === DARK;
      let isVertical = y === 0 || getCell(x, y - 1) === DARK;

      isHorizontal =
        isHorizontal &&
        getWordLength(
          getWordBounds(x, y, Direction.HORIZONTAL),
          Direction.HORIZONTAL
        ) >= state.minimumWordLengthForClue;
      isVertical =
        isVertical &&
        getWordLength(
          getWordBounds(x, y, Direction.VERTICAL),
          Direction.VERTICAL
        ) >= state.minimumWordLengthForClue;

      if (isHorizontal) {
        createOrCopyClue(x, y, cellNumber, Direction.HORIZONTAL);
      }
      if (isVertical) {
        createOrCopyClue(x, y, cellNumber, Direction.VERTICAL);
      }
      if (isHorizontal || isVertical) {
        state.cellNumbers[x + "," + y] = cellNumber;
        cellNumber++;
      }
    }
  }
}
function addHistoricalClue(clue: Clue) {
  const key = clue.x + "," + clue.y + "," + clue.direction;
  if (!state.historicalClues[key]) {
    state.historicalClues[key] = [];
  }
  state.historicalClues[key].push(clue);
}
function findExistingClue(
  x: number,
  y: number,
  direction: Direction
): Clue | null {
  const key = x + "," + y + "," + direction;
  if (!state.historicalClues[key]) {
    return null;
  }
  return state.historicalClues[key].find((c) => c.isSame(x, y, direction)) ?? null;
}
function invalidateCluesAt(x:number, y:number) {
  for (let direction of [Direction.HORIZONTAL, Direction.VERTICAL]) {
    const [[startX, startY], _a, _b] = getWordBounds(x, y, direction);
    const clue = findExistingClue(startX, startY, direction);
    if (clue) {
      clue.isDirty = true;
    }
  }
}
function getCellNumber(x: number, y: number) {
  return state.cellNumbers[x + "," + y] || "";
}
function handleClueFocus(x: number, y: number, direction: Direction) {
  if (!isSameWord(x, y)) {
    state.currX = x;
    state.currY = y;
  }
  state.moveMode = direction;
  const clue = findExistingClue(x, y, direction)
  if (clue != null) {
    clue.isDirty = false;
  }
}
function handleDesiredWordsKey(event: KeyboardEvent) {
  const key = event.key;
  if (key !== "Tab") {
    event.preventDefault();
    invalidateWordListCache();
    triggerSaveTimeout();
  }
}
function exportCrossword() {
  save().then(() => {
    const content = JSON.stringify(getCrosswordData());
    const element = document.createElement("a");
    let name = state.name.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!name) {
      name = "MyPuzzle";
    }
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", `${name}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  });
}
function importCrossword() {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = handleImportCrossword;
  input.click();
}
function handleImportCrossword(event: Event) {
  if (!event.target || !(event.target instanceof HTMLFormElement)) {
    return;
  }
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = handleImportComplete;
}
function handleImportComplete(event: ProgressEvent<FileReader>) {
  if (!event.target || !(event.target instanceof HTMLFormElement)) {
    return;
  }
  try {
    // First try to load as .json file
    const result = JSON.parse(event.target.result as string);
    handleLoad(result);
  } catch (e1) {
    // Second, try to load as a .crossword file (legacy format)
    try {
      const result = JSON.parse(safeBase64Decode(event.target.result as string));
      handleLoad(result);
    } catch (e2) {
      state.messages.push(
        "Unable to load file! See error(s) in the console for more details."
      );
      throw new CrosswordParseError(e1, e2);
    }
  }
}
function printCrossword(solutionMode: boolean) {
  state.printMode = true;
  state.printSolutionMode = solutionMode;
  window.setTimeout(() => {
    print();
    state.printMode = false;
    state.printSolutionMode = false;
  }, 10);
}
function clearCrossword() {
  if (window.confirm("This will delete all of your saved data. Continue?")) {
    window.localStorage.clear();
    document.location.reload();
  }
}

const {
  showInfo,
  width,
  height,
  name,
  author,
  messages,
  desiredWords,
  symmetry,
  exploreWord,
  minimumWordLengthForClue,
  printSolutionMode,
  wordList,
  wordListPage,
  wordListPageMax,
} = toRefs(state);

class Clue {
  constructor(
    public x: number,
    public y: number,
    public ordinal: number,
    public direction: Direction,
    public word: string,
    public text: string,
    public isDirty: boolean
  ) {}

  static from(obj: any) {
    return new Clue(
      obj.x,
      obj.y,
      obj.ordinal,
      obj.direction,
      obj.word,
      obj.text,
      obj.isDirty
    );
  }

  isSame(x: number, y: number, direction: Direction) {
    return this.x === x && this.y === y && this.direction === direction;
  }
}

function isChar(value: any): value is Char {
  if (typeof value !== "string" || value.length !== 1) {
    return false;
  }

  // Check if it's an uppercase letter
  if (/^[A-Za-z]$/.test(value)) {
    return true;
  }

  // Check if it's a special character
  return value === "" || value === " " || value === "#";
}
</script>
