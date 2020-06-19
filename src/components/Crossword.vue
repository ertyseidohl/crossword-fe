<template>
  <div class="all" v-bind:class="{'all--nomenu': !showInfo}">
    <div class="overlay" v-if="modalText">
      <div id="modal" class="overlay__modal">
        {{modalText}}
      </div>
    </div>
    <div class="messages">
      <p v-for="(e, i) in messages" v-bind:key="i">{{e}}</p>
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
        <button v-on:click="printCrossword()">Print</button>
        |
        <button v-on:click="showInfo = false">Hide</button>
      </p>
    </div>
    <div class="restore" v-if="!showInfo">
        <button v-on:click="showInfo = true">Show Menu</button>
    </div>
    <div class="printinfo">
      <h1>{{name}}</h1>
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
              <div class="cell__number">{{getCellNumber(x, y)}}</div>
              <input
                class="cell__input"
                v-bind:value="getCellVisibleValue(x, y)"
                v-bind:class="getCellClasses(x, y)"
                v-on:keydown="handleCellKey(x, y, $event)"
                v-on:keyup="function() {return false}"
                v-on:focus="handleCellFocus(x, y)"
                v-bind:id="x + ',' + y"
                v-bind:ref="x + ',' + y"
                maxlength="1" />
            </td>
          </tr>
        </table>
      </div>
      <div class="clueeditor">
        <div v-for="(clues, dir) in sortedClues" v-bind:key="dir" class="clueeditor__type">
          {{dir}}
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
      <div class="cluedisplay">
        <div v-for="(clues, dir) in sortedClues" v-bind:key="dir" class="cluedisplay__type">
          <div class="cluedisplay__dir">{{dir}}</div>
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
          <div>(Page {{wordListPage + 1}})</div>
          <div v-if="wordListPage === wordListPageMax">(Last Page)</div>
        </div>
      </div>
      <div class="desiredwords">
        <textarea
          ref="desiredwords"
          id="desiredwords"
          v-model="desiredWords"
          v-on:keyup="handleDesiredWordsKey($event)"
          placeholder="Custom words (one per line)">
        </textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.overlay__modal {
  background-color: white;
  border: 1px solid black;
  border-radius: 3px;
  box-shadow: 5px 5px 5px black;
  padding: 0.5rem 1rem;
}

.editor {
  display: grid;
  grid-template-columns: auto 400px 200px 200px;
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
  width: 100%;
  height: 100%;
  width: 1rem;
  height: 1rem;
  text-transform: uppercase;
  border: none;
  text-align: center;
  padding: 5px 3px 1px 3px;
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

.cell__input--current:focus {
  background-color: cornflowerblue;
}

.cell__input--current {
  background-color: #aaccff;
}

.cell__input--dark {
  background-color: black;
}

.cell__input--dark:focus {
  background-color: #22a;
  color: #22a;
}

.word {
  font-family: monospace;
}

.word--selected {
  background-color: black;
  color: white;
  font-weight: bold;
}

.printinfo {
  display: none;
}

.clueeditor {
  overflow-x: scroll;
  height: 400px;
}

.all--nomenu .clueeditor {
  height: auto;
}

.clueeditor__type {
  text-align: left;
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

@media print {
  h1 {
    margin: 0;
  }
  .cell__input, .cell__input:focus {
    background-color: white;
  }
  .cell__input--dark {
    background-color: black;
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

// `server` needs to be global and writable so that our test can override it.
let server = new CrosswordServer("//localhost:8081")
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
      wordList: [],
      wordListPage: -1,
      wordListPageMax: undefined,
      wordListCache: [],
      wordListCacheWord: null,
      wordListServerPage: -1,
      desiredWords: "",
      saveTimeout: null,
      symmetry: SYMMETRY_180,
      exploreWord: "",
      cellNumbers: {},
      currentClues: [],
      historicalClues: [],
      showInfo: true,
      waitTimeout: undefined,
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
      return {
        "ACROSS": this.currentClues.filter(c => c.direction === HORIZONTAL),
        "DOWN": this.currentClues.filter(c => c.direction === VERTICAL),
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
  },
  created: function() {
    if (this.state === STATE_STARTUP) {
      this.load().then(() => {
        this.recalculate()
        this.state = STATE_EDIT
      })
      window.addEventListener("keydown", this.handleWindowKey)
    }
  },
  methods: {
    isBlocked: function() {
      return this.state === STATE_WAIT ||
        this.state === STATE_STARTUP ||
        this.state === STATE_SAVING ||
        this.state === STATE_LOADING
    },
    getCellClasses: function(x, y) {
      return {
        "cell__input--current": this.currX === x && this.currY === y,
        "cell__input--dark": this.isDark(x, y),
        "cell__input--sameword": this.isSameWord(x, y),
        "cell__input--ghost": this.isShowingGhost(x, y),
        "cell__input--reflection": this.isReflectionCell(x, y)}
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
    setCellDark: function(x, y, dark) {
      const setCellNoChecks = (x, y, v) => Vue.set(this.cells, x + "," + y, v)
      const char = dark ? "#" : ""
      if (this.symmetry === SYMMETRY_180) {
        if (!isBlankOrDark(this.getCell(this.width - x - 1, this.height - y - 1))) {
          this.messages.push("Making this cell dark would delete a letter.")
          return
        }
        setCellNoChecks(x, y, char)
        setCellNoChecks(this.width - x - 1, this.height - y - 1, char)
      } else if (this.symmetry === SYMMETRY_90) {
        if (!isBlankOrDark(this.getCell(this.width - x - 1, this.height - y - 1))
          || !isBlankOrDark(this.getCell(this.width - x - 1, y))
          || !isBlankOrDark(this.getCell(x, this.height - y - 1))) {
          this.messages.push("Making this cell dark would delete a letter.")
          return
        }
        setCellNoChecks(x, y, char)
        setCellNoChecks(this.width - x - 1, this.height - y - 1, char)
        setCellNoChecks(this.width - x - 1, y, char)
        setCellNoChecks(x, this.height - y - 1, char)
      } else if (this.symmetry === SYMMETRY_NONE) {
        setCellNoChecks(x, y, char)
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
    save: function() {
      this.state = STATE_SAVING
      if (this.saveTimeout) {
        this.saveTimeout = null
      }
      const crosswordData = {
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
      }
      return storage.save(crosswordData)
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
        this.desiredWords = crosswordData.desiredWords || []
        this.symmetry = crosswordData.symmetry || SYMMETRY_180
        this.rehydrateClues(crosswordData.currentClues || [], crosswordData.historicalClues || [])
        if (crosswordData.crossword) {
          this.fillEntireCrossword(crosswordData.crossword)
        }
        this.showInfo = crosswordData.showInfo || true
      } else {
        this.messages.push("Welcome!")
      }
      // Set state last (or we'll accidentially trigger the save timeout).
      this.state = STATE_EDIT
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
      this.messages.push(error)
    },
    fillEntireCrossword: function(crosswordData) {
      const content = crosswordData.split("\n")
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (content[y][x] === ".") {
            this.setCell(x, y, "")
          } else {
            this.setCell(x, y, content[y][x])
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
      if (endIndex > this.wordListCache.length) {
        this.wordListServerPage ++
        return server.getCompletions(word.toUpperCase(), this.wordListServerPage)
          .then((result) => {
            if (result.length === 0) {
              this.wordListPage --
              this.wordListPageMax = this.wordListPage
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
      } else {
        if (Array.isArray(this.$refs[target])) {
          this.$refs[target][0].focus()
        } else {
          this.$refs[target].focus()
        }
      }
    },
    handleCellFocus: function(x, y) {
      this.currX = x
      this.currY = y
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
        setImmediate(() => this.fillWithWord(event.target.value, true))
      } else if (key === "ArrowDown") {
        setImmediate(() => this.fillWithWord(event.target.value, true))
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
      return x >= 0 && x < this.width && y >= 0 && y < this.width
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
    recalculate: function() {
      this.currentClues = []
      this.cellNumbers = {}
      let cellNumber = 1
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.getCell(x, y) === DARK) {
            continue
          }
          const isHorizontal = x === 0 || this.getCell(x - 1, y) === DARK
          const isVertical = y === 0 || this.getCell(x, y - 1) === DARK
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
      // From https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
      this.save().then(() => {
        const content = window.localStorage.getItem("crossword")
        const element = document.createElement("a")
        element.setAttribute("href", "data:text/plain;charset=utf-8," + content)
        element.setAttribute("download", `crossword-${this.name.replace(/[^a-zA-Z0-9]/, "")}.json`)
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
        const result = JSON.parse(event.target.result)
        this.handleLoad(result)
      } catch (e) {
        this.messages.push("Unable to load file! See error below for more detail:")
        this.messages.push(e)
        throw e
      }

    },
    printCrossword: function() {
      print()
    },
  },
}
</script>

