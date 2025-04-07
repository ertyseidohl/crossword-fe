<template>
  <div class="all" v-bind:class="{'all--nomenu': !showInfo}">
    <div class="overlay" v-if="modalText">
      <div id="modal" class="overlay__modal">
        {{modalText}}
      </div>
    </div>
    <div class="messages">
      <div
        v-for="(e, i) in messages"
        v-bind:key="i"
        class="message"
        v-on:click="deleteMessage(i)">
        <div class="message__text" v-html="e"></div>
      </div>
    </div>
    <div class="info" v-if="showInfo">
      <h1>Crossword</h1>
      <h2>
        Name: <input v-model="name" v-on:keyup="triggerSaveTimeout()" v-on:change="triggerSaveTimeout()"/><br/>
        By <input v-model="author" v-on:keyup="triggerSaveTimeout()" v-on:change="triggerSaveTimeout()"/>
      </h2>
      <p>
        Width:
        <input
          type="number"
          min="3"
          max="25"
          v-model="width"
          id="width"
          v-on:keyup="handleSizeChange()"
          v-on:change="handleSizeChange()">
        Height:
        <input
          type="number"
          min="3"
          max="25"
          v-model="height"
          id="height"
          v-on:keyup="handleSizeChange()"
          v-on:change="handleSizeChange()">
        Symmetry: <select v-model="symmetry" v-on:change="triggerSaveTimeout()">
          <option value="180" selected="selected">180&deg;</option>
          <option value="90" selected="selected">90&deg;</option>
          <option value="0" selected="selected">None</option>
        </select>
        <button v-on:click="attemptSolve()">Solve</button>
        <button v-on:click="attemptSolve(100)">Long Solve</button>
        <button v-on:click="exportCrossword()">Export</button>
        <button v-on:click="importCrossword()">Import</button>
        <button v-on:click="printCrossword(false)">Print</button>
        <button v-on:click="printCrossword(true)">Print Sol'n</button>
        |
        <button v-on:click="clearCrossword()">Clear</button>
        |
        <button v-on:click="showInfo = false">Hide</button>
        <button v-on:click="showHelp()">Help</button>
      </p>
    </div>
    <div class="restore" v-if="!showInfo">
        <button v-on:click="showInfo = true">Show Menu</button>
    </div>
    <div class="printinfo">
      <h1>{{name}}<span v-if="printSolutionMode"> (Solution)</span></h1>
      <p>By {{author}}</p>
    </div>
    <div class="editor">
      <div class="crossword">
        <div v-if="wrongSize" id="wrongsize">
          Error: Width and height must be between 3 and 25.
        </div>
        <table class="crossword__table" v-if="!wrongSize">
          <tr v-for="y in cwh" v-bind:key="y">
            <td v-for="x in cww" v-bind:key="x" class="cell">
              <div class="cell__overlay" v-if="isSpecialCell(x, y)"></div>
              <div class="cell__number">{{getCellNumber(x, y)}}</div>
              <input
                class="cell__input"
                v-bind:value="getCellVisibleValue(x, y)"
                v-bind:class="getCellClasses(x, y)"
                v-on:keydown="handleCellKey(x, y, $event)"
                v-on:keyup="function() {return false}"
                v-on:focus="handleCellFocus(x, y)"
                v-on:dblclick="handleCellDoubleClick(x, y)"
                v-bind:id="x + ',' + y"
                v-bind:ref="x + ',' + y"
                maxlength="1" />
            </td>
          </tr>
        </table>
      </div>
      <div class="clueeditor">
        <div class="clueeditor__minwordlength">
          <label for="minimum-word-length-for-clue">Minimum word length for clue: </label>
          <input
            type="number"
            min="1"
            v-bind:max="maxClueLength"
            v-model="minimumWordLengthForClue"
            v-on:change="recalculate()"
            class="clueeditor__minwordlength__input"
            id="minimum-word-length-for-clue"
          />
        </div>
        <div v-show="dirtyClues">
          Some clues need checking
          <span
            class="clueeditor__checkall"
            v-on:click="checkAll()"
          >
            Check all
          </span>
        </div>
        <div v-for="(clues, dir) in sortedClues" v-bind:key="dir" class="clueeditor__type">
          <b>{{dir}}</b>
          <div v-for="(clue, i) in clues" v-bind:key="i" class="clue">
            {{clue.ordinal}}
            <input
              class="clue__input"
              v-bind:class="{'clue__input--dirty': clue.isDirty}"
              v-bind:ref="clue.x + ',' + clue.y + ',' + clue.direction"
              v-bind:id="clue.x + ',' + clue.y + ',' + clue.direction"
              type="text"
              v-bind:data-index="i"
              v-model="clue.text"
              v-on:focus="handleClueFocus(clue.x, clue.y, clue.direction)"
              v-on:keydown="handleClueKey($event)"
            />
          </div>
        </div>
      </div>
      <div class="cluedisplay" v-if="!printSolutionMode">
        <div v-for="(clues, dir) in sortedClues" v-bind:key="dir" class="cluedisplay__type">
          <h3 class="cluedisplay__dir">{{dir}}</h3>
            <div v-for="(clue, i) in clues" v-bind:key="i" class="cluedisplay__clue">
            <b>{{clue.ordinal}}</b>
            {{clue.text}}
            </div>
        </div>
      </div>
      <div class="wordlist">
        <input type="text" ref="exploreword" id="exploreword" v-model="exploreWord" v-on:keydown="handleExploreKey($event)" />
        <br />
        <select
          v-bind:size="wordList.length"
          id="wordlist"
          ref="wordlist"
          v-on:blur="clearGhosts()"
          v-on:keydown="handleWordListKey($event)">
          <option
            class="word"
            v-for="(word, i) in wordList"
            v-bind:key="i"
          >
            {{word}}
          </option>
        </select>
        <div v-if="wordList.length" id="wordlist__page">
          <div>
            <span
              class="wordlist__link"
              v-on:click="getCompletions(exploreWord, true)"
              v-bind:class="{'wordlist__link--hidden': wordListPage === 0}">Prev</span>
            (Page {{wordListPage + 1}})
            <span
              class="wordlist__link"
              v-on:click="getCompletions(exploreWord, false)"
              v-bind:class="{'wordlist__link--hidden': wordListPage === wordListPageMax}">Next</span>
          </div>
          <div v-if="wordListPage === wordListPageMax">(Last Page)</div>
        </div>
        <div class="desiredwords">
          <p><b>Your Words</b></p>
          <textarea
            ref="desiredwords"
            id="desiredwords"
            v-model="desiredWords"
            v-on:keyup="handleDesiredWordsKey($event)"
            placeholder="Enter one per line">
          </textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

p, td, input, button, select, textarea {
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
  outline:none;
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
  .cell__input, .cell__input:focus {
    background-color: white;
  }
  .cell__input--dark {
    background-color: black;
    color: black;
  }
  .cell__number--dirty, .clue__input--dirty {
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
    margin-bottom:1rem;
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

<script>
import Vue from "vue"
import CrosswordServer from "../lib/CrosswordServer"
import LocalStorage from "../lib/LocalStorage"
import { safeBase64Decode } from "../lib/Base64"
import { CrosswordParseError } from "../lib/CrosswordParseError"
import { backendUrl } from "../settings"

// `server` needs to be global and writable so that our test can override it.
// let server = new CrosswordServer("//localhost:8081")
let server = new CrosswordServer(backendUrl)
// Bind to window, so that webpack doesn't mangle our function name.
window.replaceServer = function(url) {
  server = new CrosswordServer(url)
}

var showSaveWarning = true
// We need a way to disable the "unsaved data" alert for tests.
window.disableSaveWarning = function() {
  showSaveWarning = false
}

const storage = new LocalStorage()

const HORIZONTAL = 1
const VERTICAL = 2

// If you change these, also search for other
// instances of the numbers.
const MAX_SIZE = 25
const MIN_SIZE = 3

const STATE_STARTUP = 0
const STATE_EDIT = 1
const STATE_WAIT = 2
const STATE_SAVING = 3
const STATE_LOADING = 4

const SYMMETRY_180 = "180"
const SYMMETRY_90 = "90"
const SYMMETRY_NONE = "0"

const DARK = "#"

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
`

const isBlankOrDark = (char) => {
  return char === "" || char === DARK
}

class Clue {
  constructor(x, y, ordinal, direction, word, text, isDirty) {
    this.x = x
    this.y = y
    this.ordinal = ordinal
    this.direction = direction
    this.word = word
    this.text = text
    this.isDirty = isDirty
  }

  static from(obj) {
    return new Clue(
      obj.x,
      obj.y,
      obj.ordinal,
      obj.direction,
      obj.word,
      obj.text,
      obj.isDirty,
    )
  }

  isSame(x, y, direction) {
    return (
      this.x === x &&
      this.y === y &&
      this.direction === direction
    )
  }
}

export default {
  name: "Crossword",
  data: function() {
    return {
      state: STATE_STARTUP,
      moveMode: HORIZONTAL,
      currX: 0,
      currY: 0,
      height: 13,
      width: 13,
      name: "My Crossword",
      author: "Me",
      messages: [],
      cells: {},
      ghostCells: {},
      specialCells: {},
      wordList: [],
      wordListPage: -1,
      wordListPageMax: undefined,
      wordListCache: [],
      wordListCacheWord: null,
      wordListServerPage: -1,
      wordAtCache: {},
      desiredWords: "",
      saveTimeout: null,
      symmetry: SYMMETRY_180,
      exploreWord: "",
      cellNumbers: {},
      currentClues: [],
      historicalClues: [],
      showInfo: true,
      waitTimeout: undefined,
      printMode: false,
      printSolutionMode: false,
      minimumWordLengthForClue: 1,
    }
  },
  computed: {
    cww: function () {
      const w = parseInt(this.width, 10)
      if (isNaN(w) || w < MIN_SIZE || w > MAX_SIZE) {
        return []
      }
      return [...Array(w).keys()]
    },
    cwh: function () {
      const h = parseInt(this.height, 10)
      if (isNaN(h) || h < MIN_SIZE || h > MAX_SIZE) {
        return []
      }
      return [...Array(h).keys()]
    },
    wrongSize: function() {
      const h = parseInt(this.height, 10)
      const w = parseInt(this.height, 10)
      return h < MIN_SIZE || h > MAX_SIZE || w < MIN_SIZE || w > MAX_SIZE
    },
    disableCells: function () {
      return this.state !== STATE_EDIT
    },
    sortedClues: function () {
      function getFilter(dir) {
        return function (clue) {
          return clue.direction === dir &&
          clue.word.length >= this.minimumWordLengthForClue
        }
      }
      return {
        "ACROSS": this.currentClues.filter(getFilter(HORIZONTAL).bind(this)),
        "DOWN": this.currentClues.filter(getFilter(VERTICAL).bind(this)),
      }
    },
    modalText: function() {
      switch(this.state) {
      case STATE_STARTUP: return "Starting..."
      case STATE_WAIT:
        if (this.waitTimeout) {
          return "Thinking for up to " + this.waitTimeout + " seconds..."
        }
        return "Thinking..."
      case STATE_SAVING: return "Saving..."
      case STATE_LOADING: return "Loading..."
      default: return undefined
      }
    },
    dirtyClues: function(){
      return this.currentClues.some(c => c.isDirty)
    },
    maxClueLength: function() {
      return Math.max(...this.currentClues.map(c => c.word.length))
    },
  },
  created: function() {
    if (this.state === STATE_STARTUP) {
      this.load().then(() => {
        // note that load calls recalculate to place the cell numbers
        this.$refs["0,0"][0].focus()
        this.state = STATE_EDIT
      })
      window.addEventListener("keydown", this.handleWindowKey)
    }
  },
  methods: {
    deleteMessage: function(index) {
      this.messages.splice(index, 1)
    },
    showHelp: function() {
      this.messages.push(HELP_MESSAGE)
    },
    isBlocked: function() {
      return this.state === STATE_WAIT ||
        this.state === STATE_STARTUP ||
        this.state === STATE_SAVING ||
        this.state === STATE_LOADING
    },
    getCellClasses: function(x, y) {
      const classes = {
        "cell__input--current": this.currX === x && this.currY === y,
        "cell__input--dark": this.isDark(x, y),
        "cell__input--sameword": this.isSameWord(x, y),
        "cell__input--ghost": this.isShowingGhost(x, y),
        "cell__input--reflection": this.isReflectionCell(x, y),
        "cell__input--special": this.isSpecialCell(x, y),
      }
      const minLetterLength = this.getMinLetterLength(x, y)
      if (minLetterLength === 1) {
        classes["cell__input--single-letter"] = true
      } else if (minLetterLength === 2) {
        classes["cell__input--double-letter"] = true
      }
      return classes
    },
    setCell: function (x, y, v) {
      const currentChar = this.getCell(x, y)
      if (currentChar === v) {
        return
      }
      if (currentChar === "#") {
        this.setCellDark(x, y, false)
      }
      Vue.set(this.cells, x + "," + y, v)
      this.invalidateCluesAt(x, y)
      this.triggerSaveTimeout()
    },
    setCellNoChecks: function (x, y, v) {
      Vue.set(this.cells, x + "," + y, v)
    },
    setCellDark: function(x, y, dark) {
      const char = dark ? "#" : ""
      if (this.symmetry === SYMMETRY_180) {
        if (!isBlankOrDark(this.getCell(this.width - x - 1, this.height - y - 1))) {
          this.messages.push("Making this cell dark would delete a letter.")
          return
        }
        this.setCellNoChecks(x, y, char)
        this.setCellNoChecks(this.width - x - 1, this.height - y - 1, char)
      } else if (this.symmetry === SYMMETRY_90) {
        if (!isBlankOrDark(this.getCell(this.width - x - 1, this.height - y - 1))
          || !isBlankOrDark(this.getCell(this.width - x - 1, y))
          || !isBlankOrDark(this.getCell(x, this.height - y - 1))) {
          this.messages.push("Making this cell dark would delete a letter.")
          return
        }
        this.setCellNoChecks(x, y, char)
        this.setCellNoChecks(this.width - x - 1, this.height - y - 1, char)
        this.setCellNoChecks(this.width - x - 1, y, char)
        this.setCellNoChecks(x, this.height - y - 1, char)
      } else if (this.symmetry === SYMMETRY_NONE) {
        this.setCellNoChecks(x, y, char)
      } else{
        this.messages.push("Unknown symmetry: " + this.symmetry)
      }
      this.recalculate()
      this.triggerSaveTimeout()
    },
    getCell: function (x, y) {
      return this.cells[x + "," + y] || ""
    },
    isDark: function (x, y) {
      return this.cells[x + "," + y] === "#"
    },
    isReflectionCell: function(x, y) {
      if (this.symmetry === SYMMETRY_180) {
        if (this.currX === this.width - x - 1 &&
          this.currY === this.height - y - 1) {
          return true
        }
      } else if (this.symmetry === SYMMETRY_90) {
        if (this.currX === this.width - x - 1) {
          if (this.currY === this.height - y - 1) {
            return true
          } else if (this.currY === y) {
            return true
          }
        } else if (this.currX === x && this.currY === this.height - y - 1) {
          return true
        }
      }
    },
    setSpecialCell: function(x, y){
      const key = x + "," + y
      if (this.specialCells[key]) {
        Vue.delete(this.specialCells, key)
      } else {
        Vue.set(this.specialCells, key, true)
      }
    },
    isSpecialCell: function(x, y) {
      const key = x + "," + y
      return !!this.specialCells[key]
    },
    getWordLength: function([[startX, startY], [endX, endY]], direction) {
      if (direction === VERTICAL) {
        return (endY - startY) + 1
      }
      return (endX - startX) + 1
    },
    getMinLetterLength: function(x, y) {
      if (this.isDark(x, y)) {
        return false
      }
      // Probably could cache this for optimization in the future since we're recomputing
      // a lot of the same word lengths over and over
      const verticalLength = this.getWordLength(this.getWordBounds(x, y, VERTICAL), VERTICAL)
      const horizontalLength = this.getWordLength(this.getWordBounds(x, y, HORIZONTAL), HORIZONTAL)
      return Math.min(verticalLength, horizontalLength)
    },
    setGhost: function (x, y, v) {
      Vue.set(this.ghostCells, x + "," + y, v)
    },
    getGhost: function(x, y) {
      return this.ghostCells[x + "," + y] || ""
    },
    isShowingGhost: function(x, y) {
      return this.getGhost(x, y) && !this.getCell(x, y)
    },
    getCellVisibleValue: function(x, y) {
      if (this.printMode && !this.printSolutionMode) {
        return ""
      }
      return this.getCell(x, y) || this.getGhost(x, y)
    },
    clearGhosts: function() {
      this.ghostCells = {}
    },
    handleSizeChange: function() {
      this.recalculate()
      this.triggerSaveTimeout()
    },
    triggerSaveTimeout: function() {
      if (this.state === STATE_LOADING) {
        // Don't save if we're in the middle of loading.
        return
      }
      if (this.saveTimeout) {
        window.clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = window.setTimeout(this.save, 500)
      if (showSaveWarning) {
        window.onbeforeunload = function(event) {
          event.preventDefault()
          return "Your changes have not been saved."
        }
      }
    },
    getCrosswordData: function() {
      return {
        crossword: this.getEntireCrossword(),
        author: this.author,
        name: this.name,
        width: this.width,
        height: this.height,
        desiredWords: this.desiredWords,
        symmetry: this.symmetry,
        currentClues: this.currentClues,
        historicalClues: this.historicalClues,
        showInfo: this.showInfo,
        specialCells: this.specialCells,
      }
    },
    save: function() {
      this.state = STATE_SAVING
      if (this.saveTimeout) {
        this.saveTimeout = null
      }
      return storage.save(this.getCrosswordData())
        .then(this.handleSave)
        .catch(this.handleSaveError)
    },
    handleSave: function() {
      this.state = STATE_EDIT
      window.onbeforeunload = undefined
    },
    handleSaveError: function(error) {
      this.state = STATE_EDIT
      this.messages.push(error)
    },
    load: function() {
      this.state = STATE_LOADING
      return storage.load(this.getEntireCrossword())
        .then(this.handleLoad)
        .catch(this.handleLoadError)
    },
    handleLoad: function(crosswordData) {
      if (crosswordData) {
        this.author = crosswordData.author || "Me"
        this.name = crosswordData.name || "My Crossword"
        this.width = crosswordData.width || 13
        this.height = crosswordData.height || 13
        this.desiredWords = crosswordData.desiredWords || ""
        this.symmetry = crosswordData.symmetry || SYMMETRY_180
        this.rehydrateClues(crosswordData.currentClues || [], crosswordData.historicalClues || [])
        if (crosswordData.crossword) {
          this.fillEntireCrossword(crosswordData.crossword)
        }
        this.specialCells = crosswordData.specialCells || {}
        // "re-dirty" the clues that are dirty (hax)
        this.reDirtyDirtyClues(crosswordData.currentClues)
        this.showInfo = crosswordData.showInfo || true
      } else {
        this.messages.push("Welcome!")
        this.recalculate()
      }
      // Set state last (or we'll accidentially trigger the save timeout).
      this.state = STATE_EDIT
    },
    reDirtyDirtyClues(jsonClues) {
      // This is a hack because fillEntireCrossword calls recalculate, which marks
      // clues as not dirty (when they should be).
      this.currentClues.forEach(c => {
        for (let i = 0; i < jsonClues.length; i++ ){
          const jsonClue = jsonClues[i]
          if (c.isSame(jsonClue.x, jsonClue.y, jsonClue.direction)) {
            c.isDirty = jsonClue.isDirty
            return
          }
        }
      })
    },
    handleLoadError: function(error){
      this.state = STATE_EDIT
      this.messages.push(error)
    },
    rehydrateClues: function(jsonCurrentClues, jsonHistoricalClues) {
      this.historicalClues = {}
      this.currentClues = []
      // We need to make sure that not only the values, but the
      // actual references in historical and current clues are
      // the same.
      for(let loc in jsonHistoricalClues) {
        jsonHistoricalClues[loc]
          .map(c => Clue.from(c))
          .map(this.addHistoricalClue.bind(this))
      }
      for (let jsonClue of jsonCurrentClues) {
        // We are guaranteed that a clue in existing exists in historical
        // ... As long as nobody has tampered with the data.
        const clue = this.findExistingClue(jsonClue.x, jsonClue.y, jsonClue.direction)
        this.currentClues.push(clue)
      }
    },
    attemptSolve: function(timeout) {
      this.state = STATE_WAIT
      this.waitTimeout = timeout
      return server.attemptSolve(this.getEntireCrossword(), timeout)
        .then(this.handleSolveAttempt)
        .catch(this.handleSolveAttemptError)
    },
    handleSolveAttempt: function(result) {
      this.waitTimeout = undefined
      this.state = STATE_EDIT
      if (!result) {
        return
      }
      this.fillEntireCrossword(result)
    },
    handleSolveAttemptError: function(error) {
      this.state = STATE_EDIT
      this.waitTimeout = undefined
      this.messages.push(error)
    },
    fillEntireCrossword: function(crosswordData) {
      const content = crosswordData.split("\n")
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (content[y][x] === ".") {
            this.setCellNoChecks(x, y, "")
          } else {
            this.setCellNoChecks(x, y, content[y][x])
          }
        }
      }
      this.recalculate()
    },
    getEntireCrossword: function () {
      let rows = []
      for (let y = 0; y < this.height; y++) {
        let row = []
        for (let x = 0; x < this.width; x++) {
          let cell = this.getCell(x, y)
          row.push(cell === "" ? "." : cell)
        }
        rows.push(row.join(""))
      }
      return rows.join("\n")
    },
    getLocalWords: function() {
      if (!this.desiredWords) {
        return []
      }
      return this.desiredWords.split("\n").filter(w => !!w.trim())
    },
    getCompletions: function(word, backward) {
      this.state = STATE_WAIT
      if (backward) {
        this.wordListPage = Math.max(this.wordListPage - 1, 0)
      } else if (this.wordListPageMax !== undefined && this.wordListPage >= this.wordListPageMax) {
        this.wordListPage = this.wordListPageMax
        return Promise.resolve().then(() => this.state = STATE_EDIT)
      } else {
        this.wordListPage ++
      }
      const currentWordRegex = new RegExp("^" + word.toUpperCase() + "$")
      if (word !== this.wordListCacheWord) {
        let localWords = this.getLocalWords()
          .map(w => w.toUpperCase())
          .filter(w => currentWordRegex.test(w))
        this.wordListCache = localWords
        this.wordListCacheWord = word
      }
      const startIndex = this.wordListPage * 10
      const endIndex = (this.wordListPage + 1) * 10
      if (this.wordListPageMax === undefined && endIndex > this.wordListCache.length) {
        this.wordListServerPage ++
        return server.getCompletions(word.toUpperCase(), this.wordListServerPage)
          .then((result) => {
            if (result.length === 0) {
              this.wordListPageMax = this.wordListPage
              this.wordListPage --
              return Promise.resolve().then(() => this.state = STATE_EDIT)
            }
            if (result.length < 10) {
              this.wordListPageMax = this.wordListPage
            }
            this.wordListCache = this.wordListCache.concat(result)
            this.completeWordListUpdate(this.wordListCache.slice(startIndex, endIndex))
          })
          .catch(this.handleCompletionsError)
      } else {
        return Promise.resolve().then(
          this.completeWordListUpdate(this.wordListCache.slice(startIndex, endIndex)))
      }
    },
    invalidateWordListCache: function() {
      this.wordListPage = -1
      this.wordListPageMax = undefined
      this.wordListServerPage = -1
      this.wordList = []
      this.wordListCache = []
      this.wordListCacheWord = null
    },
    completeWordListUpdate: function(result) {
      this.wordList = result
      this.state = STATE_EDIT
    },
    handleCompletionsError: function(error) {
      this.state = STATE_EDIT
      this.wordList = []
      this.messages.push(error)
    },
    fillWithWord: function(word, isGhost) {
      if (this.wordList.length === 0) {
        return
      }
      let [[x, y], _, [dx, dy]] = this.getWordBounds(this.currX, this.currY, this.moveMode)
      for (let char of word.split("")) {
        if (isGhost) {
          this.setGhost(x, y, char)
        } else {
          this.setCell(x, y, char)
        }
        x += dx
        y += dy
      }
    },
    switchFocus: function(target) {
      if (target === "livecell") {
        this.$refs[this.currX + "," + this.currY][0].focus()
      } else if (target === "clue") {
        const [[startX, startY], _a, _b] = this.getWordBounds(this.currX, this.currY, this.moveMode)
        this.$refs[startX + "," + startY + "," + this.moveMode][0].focus()
      } else if (target === "wordlist") {
        const wordListElement = this.$refs["wordlist"]
        wordListElement.focus()
        wordListElement.selectedIndex = 0
      } else {
        if (Array.isArray(this.$refs[target])) {
          this.$refs[target][0].focus()
        } else {
          this.$refs[target].focus()
        }
      }
    },
    handleCellFocus: function(x, y) {
      // Focus always fires before click
      this.currX = x
      this.currY = y
    },
    handleCellDoubleClick: function() {
      this.moveMode = this.moveMode === VERTICAL ? HORIZONTAL : VERTICAL
    },
    handleWindowKey: function() {
      // Can't do this since these are used in clues ...
      // const key = event.key
      // if (!event.controlKey) {
      //   return
      // }
      // if (key === "!") {
      //   event.preventDefault()
      //   this.switchFocus("livecell")
      // } else if (key === "@") {
      //   event.preventDefault()
      //   this.switchFocus("clue")
      // } else if (key === "#") {
      //   event.preventDefault()
      //   this.switchFocus("exploreword")
      // } else if (key === "$") {
      //   event.preventDefault()
      //   this.switchFocus("desiredwords")
      // }
    },
    handleWordListKey: function(event) {
      const key = event.key
      if (event.ctrlKey || event.metaKey) {
        return
      }
      const word = event.target.value
      const wordListElement = this.$refs["wordlist"]
      if (key === "Enter" && word) {
        this.fillWithWord(word, false)
        this.switchFocus("livecell")
      } else if (key === "ArrowLeft") {
        this.getCompletions(this.exploreWord, true)
          .then(() => this.fillWithWord(event.target.value, true))
      } else if (key === "ArrowRight") {
        this.getCompletions(this.exploreWord, false)
          .then(() => this.fillWithWord(event.target.value, true))
      } else if (key === "ArrowUp") {
        if (wordListElement.selectedIndex === 0) {
          event.preventDefault()
          this.getCompletions(this.exploreWord, true)
            .then(() => this.fillWithWord(event.target.value, true))
            .then(() => wordListElement.selectedIndex = this.wordList.length - 1)
        } else {
          setTimeout(() => this.fillWithWord(event.target.value, true), 0)
        }
      } else if (key === "ArrowDown") {
        if (wordListElement.selectedIndex === this.wordList.length - 1) {
          event.preventDefault()
          this.getCompletions(this.exploreWord, false)
            .then(() => this.fillWithWord(event.target.value, true))
            .then(() => wordListElement.selectedIndex = 0)
        } else {
          setTimeout(() => this.fillWithWord(event.target.value, true), 0)
        }
      } else if (key === "Escape") {
        event.preventDefault()
        this.switchFocus("livecell")
      }
    },
    handleCellKey: function(x, y, event) {
      if (event.ctrlKey || event.metaKey) {
        return
      }
      event.preventDefault()
      if (this.isBlocked()) {
        return
      }
      const key = event.key
      if (key === "Backspace") {
        if (this.getCell(x, y) === DARK) {
          return
        }
        if (this.getCell(x, y) === "") {
          this.moveCursor(x, y, this.moveMode, -1)
          this.setCell(this.currX, this.currY, "")
        } else{
          this.setCell(x, y, "")
        }
      } else if (key === "/" || key === "?") {
        this.switchMoveMode()
      } else if (key === "Enter") {
        if (this.getCell(this.currX, this.currY) === DARK) {
          return
        }
        this.invalidateWordListCache()
        this.exploreWord = this.getWordAt(this.currX, this.currY, this.moveMode)
        this.getCompletions(this.exploreWord, false).then(() => {
          this.switchFocus("wordlist")
          if (this.wordList.length) {
            this.fillWithWord(this.wordList[0], true)
          }
        })
      } else if (key === "ArrowLeft") {
        this.moveCursor(x, y, HORIZONTAL, -1)
      } else if (key === "ArrowUp") {
        this.moveCursor(x, y, VERTICAL, -1)
      } else if (key === "ArrowRight") {
        this.moveCursor(x, y, HORIZONTAL, 1)
      } else if (key === "ArrowDown") {
        this.moveCursor(x, y, VERTICAL, 1)
      } else if (key === " ") {
        if (this.getCell(x, y) === DARK) {
          this.setCellDark(x, y, false)
        } else {
          this.setCellDark(x, y, true)
        }
      } else if (key === "Escape") {
        this.messages = []
      } else if (key === "Tab") {
        this.switchFocus("clue")
      } else if (key === ".") {
        this.setSpecialCell(x, y)
      } else if (/^[a-z0-9]$/i.test(key)) {
        this.setCell(x, y, key.toUpperCase())
        this.moveCursor(x, y, this.moveMode, 1)
      }
    },
    handleClueKey: function(event) {
      const key = event.key

      if (event.ctrlKey || event.metaKey) {
        return
      }

      if (key === "Enter") {
        this.switchFocus("livecell")
      } else if (key === "Shift") {
        // Do nothing
      } else if (key === "Tab") {
        event.preventDefault()
        if (event.shiftKey) {
          this.switchFocus("livecell")
        } else {
          this.switchFocus("exploreword")
        }
      } else if (key === "ArrowUp") {
        this.selectAdjacentClue(event.target.id, event.target.dataset["index"], -1)
      } else if (key === "ArrowDown") {
        this.selectAdjacentClue(event.target.id, event.target.dataset["index"], 1)
      } else {
        this.triggerSaveTimeout()
      }
    },
    selectAdjacentClue(currentId, currentIndexStr, delta) {
      // This is bad code and I feel bad about it thanks
      const currentIndex = parseInt(currentIndexStr, 10)
      const [_x, _y, directionStr] = currentId.split(",")
      const direction = parseInt(directionStr, 10)
      const acrossClues = this.currentClues.filter(c => c.direction === HORIZONTAL)
      const downClues = this.currentClues.filter(c => c.direction === VERTICAL)
      const toRef = c => c.x + "," + c.y + "," + c.direction
      if (direction === HORIZONTAL) {
        if (delta === -1 && currentIndex === 0) {
          this.switchFocus(toRef(downClues[downClues.length - 1]))
        } else if (delta === 1 && currentIndex === acrossClues.length - 1) {
          this.switchFocus(toRef(downClues[0]))
        } else {
          this.switchFocus(toRef(acrossClues[currentIndex + delta]))
        }
      } else if (direction === VERTICAL) {
        if (delta === -1 && currentIndex === 0) {
          this.switchFocus(toRef(acrossClues[acrossClues.length - 1]))
        } else if (delta === 1 && currentIndex === downClues.length - 1) {
          this.switchFocus(toRef(acrossClues[0]))
        } else {
          this.switchFocus(toRef(downClues[currentIndex + delta]))
        }
      }
    },
    moveCursor: function(x, y, direction, distance) {
      const xd = direction === HORIZONTAL ? x + distance : x
      const yd = direction === VERTICAL ? y + distance : y
      const cell = document.getElementById(xd + "," + yd)
      if (cell) {
        cell.focus()
      }
      this.currX = xd
      this.currY = yd
    },
    isSameWord: function(x, y) {
      if (this.getCell(x, y) === DARK) {
        return false
      }
      if (x === this.currX && y === this.currY) {
        return true
      }
      if (this.moveMode === VERTICAL && x === this.currX) {
        const dir = y < this.currY ? 1 : -1
        return this.isSameWord(x, y + dir)
      }
      if (this.moveMode === HORIZONTAL && y === this.currY) {
        const dir = x < this.currX ? 1 : -1
        return this.isSameWord(x + dir, y)
      }
      return false
    },
    switchMoveMode: function() {
      this.moveMode = this.moveMode === HORIZONTAL ? VERTICAL : HORIZONTAL
    },
    isValidCell: function(x, y) {
      return x >= 0 && x < this.width && y >= 0 && y < this.height
    },
    getWordBounds: function(x, y, direction) {
      let startX = x
      let startY = y
      let endX = x
      let endY = y
      const dx = direction === HORIZONTAL ? 1 : 0
      const dy = direction === VERTICAL ? 1 : 0
      while(this.getCell(startX - dx, startY - dy) !== DARK
        && this.isValidCell(startX - dx, startY - dy)) {
        startX -= dx
        startY -= dy
      }
      while(this.getCell(endX + dx, endY + dy) !== DARK
        && this.isValidCell(endX + dx, endY + dy)) {
        endX += dx
        endY += dy
      }
      return [[startX, startY], [endX, endY], [dx, dy]]
    },
    getWordAt: function(x, y, direction) {
      // Cache this, since we call this a lot.
      // This cache should be invalidated when the crossword changes.
      if (this.wordAtCache[x + "," + y + "," + direction]) {
        return this.wordAtCache[x + "," + y + "," + direction]
      }
      const [[startX, startY], [endX, endY], [dx, dy]] = this.getWordBounds(x, y, direction)
      let currX = startX
      let currY = startY
      const letters = []
      while (currX !== endX || currY !== endY) {
        const letter = this.getCell(currX, currY)
        letters.push(letter === "" ? "." : letter)
        currX += dx
        currY += dy
      }
      // Grab the last one
      const letter = this.getCell(currX, currY)
      letters.push(letter === "" ? "." : letter)
      this.wordAtCache[x + "," + y + "," + direction] = letters.join("")
      return letters.join("")
    },
    handleExploreKey: function(event) {
      const key = event.key
      if (key === "Enter") {
        this.invalidateWordListCache()
        this.getCompletions(this.exploreWord, false)
        this.switchFocus("wordlist")
      } else if (key === "Tab") {
        if (event.shiftKey) {
          event.preventDefault()
          this.switchFocus("clue")
        }
      }
    },
    createOrCopyClue: function(x, y, cellNumber, direction) {
      const word = this.getWordAt(x, y, direction)
      const existingClue = this.findExistingClue(x, y, direction, word)
      if (existingClue) {
        existingClue.ordinal = cellNumber
        existingClue.isDirty = existingClue.word !== word
        existingClue.word = word
        this.currentClues.push(existingClue)
      } else {
        const clue = new Clue(x, y, cellNumber, direction, word, "", true)
        this.currentClues.push(clue)
        this.addHistoricalClue(clue)
      }
    },
    checkAll: function() {
      this.currentClues.forEach(c => c.isDirty = false)
      this.triggerSaveTimeout()
    },
    recalculate: function() {
      if (this.width < MIN_SIZE || this.height < MIN_SIZE) {
        return
      }
      this.currentClues = []
      this.cellNumbers = {}
      let cellNumber = 1
      this.wordAtCache = {}
      // Need to figure out the minimum word length for clues first to avoid
      // the case where all of the words are too short and therefore no clues
      // are generated.
      let longestWord = -Infinity
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.getCell(x, y) === DARK) {
            continue
          }
          longestWord = Math.max(
            longestWord,
            this.getWordAt(x, y, VERTICAL).length,
            this.getWordAt(x, y, HORIZONTAL).length)
        }
      }
      if (this.minimumWordLengthForClue > longestWord) {
        this.minimumWordLengthForClue = longestWord
      }
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.getCell(x, y) === DARK) {
            continue
          }
          let isHorizontal = x === 0 || this.getCell(x - 1, y) === DARK
          let isVertical = y === 0 || this.getCell(x, y - 1) === DARK

          isHorizontal &= this.getWordLength(this.getWordBounds(x, y, HORIZONTAL), HORIZONTAL) >= this.minimumWordLengthForClue
          isVertical &= this.getWordLength(this.getWordBounds(x, y, VERTICAL), VERTICAL) >= this.minimumWordLengthForClue

          if (isHorizontal) {
            this.createOrCopyClue(x, y, cellNumber, HORIZONTAL)
          }
          if (isVertical) {
            this.createOrCopyClue(x, y, cellNumber, VERTICAL)
          }
          if (isHorizontal || isVertical) {
            this.cellNumbers[x + "," + y] = cellNumber
            cellNumber ++
          }
        }
      }
    },
    addHistoricalClue: function(clue) {
      const key = clue.x + "," + clue.y + "," + clue.direction
      if (!this.historicalClues[key]) {
        this.historicalClues[key] = []
      }
      this.historicalClues[key].push(clue)
    },
    findExistingClue: function(x, y, direction){
      const key = x + "," + y + "," + direction
      if (!this.historicalClues[key]) {
        return null
      }
      return this.historicalClues[key].find(c => c.isSame(x, y, direction))
    },
    invalidateCluesAt: function(x, y) {
      for (let direction of [HORIZONTAL, VERTICAL]) {
        const [[startX, startY], _a, _b] = this.getWordBounds(x, y, direction)
        const clue = this.findExistingClue(startX, startY, direction)
        if (clue) {
          clue.isDirty = true
        }
      }
    },
    getCellNumber: function(x, y) {
      return this.cellNumbers[x + "," + y] || ""
    },
    handleClueFocus: function(x, y, direction) {
      if(!this.isSameWord(x, y)) {
        this.currX = x
        this.currY = y
      }
      this.moveMode = direction
      this.findExistingClue(x, y, direction).isDirty = false
    },
    handleDesiredWordsKey: function(event) {
      const key = event.key
      if (key !== "Tab") {
        event.preventDefault()
        this.invalidateWordListCache()
        this.triggerSaveTimeout()
      }
    },
    exportCrossword: function() {
      this.save().then(() => {
        const content = JSON.stringify(this.getCrosswordData())
        const element = document.createElement("a")
        let name = this.name.replace(/[^a-zA-Z0-9_-]/g, "")
        if (!name) {
          name = "MyPuzzle"
        }
        element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content))
        element.setAttribute("download", `${name}.json`)
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
      })
    },
    importCrossword: function() {
      const input = document.createElement("input")
      input.type = "file"
      input.onchange = this.handleImportCrossword
      input.click()
    },
    handleImportCrossword: function(event) {
      const file = event.target.files[0]
      const reader = new FileReader()
      reader.readAsText(file)
      reader.onload = this.handleImportComplete
    },
    handleImportComplete: function(event) {
      try {
        // First try to load as .json file
        const result = JSON.parse(event.target.result)
        this.handleLoad(result)
      } catch(e1) {
        // Second, try to load as a .crossword file (legacy format)
        try {
          const result = JSON.parse(safeBase64Decode(event.target.result))
          this.handleLoad(result)
        } catch (e2) {
          this.messages.push("Unable to load file! See error(s) in the console for more details.")
          throw new CrosswordParseError(e1, e2)
        }
      }
    },
    printCrossword: function(solutionMode) {
      this.printMode = true
      this.printSolutionMode = solutionMode
      window.setTimeout(() => {
        print()
        this.printMode = false
        this.printSolutionMode = false
      }, 10)
    },
    clearCrossword: function() {
      if (window.confirm("This will delete all of your saved data. Continue?")) {
        window.localStorage.clear()
        document.location.reload()
      }
    },
  },
}
</script>

