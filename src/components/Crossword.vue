<template>
  <div class="all">
    <div class="messages">
      <p v-for="(e, i) in messages" v-bind:key="i">{{e}}</p>
    </div>
    <div class="info">
      <h1>Crossword</h1>
      <h2>
        Name: <input v-model="name" v-on:keyup="triggerSaveTimeout()" v-on:change="triggerSaveTimeout()"/><br/>
        By <input v-model="author" v-on:keyup="triggerSaveTimeout()" v-on:change="triggerSaveTimeout()"/>
      </h2>
      <p>
        Width:
        <input type="number" min="2" max="20" v-model="width" v-on:keyup="triggerSaveTimeout()" v-on:change="triggerSaveTimeout()">
        Height:
        <input type="number" min="2" max="20" v-model="height" v-on:keyup="triggerSaveTimeout()" v-on:change="triggerSaveTimeout()">
        Symmetry: <select v-model="symmetry" v-on:change="triggerSaveTimeout()">
          <option value="180" selected="selected">180&deg;</option>
          <option value="90" selected="selected">90&deg;</option>
          <option value="0" selected="selected">None</option>
        </select>
        <button v-on:click="attemptSolve()">Solve</button>
        <button v-on:click="attemptSolve(100)">Long Solve</button>
        <button v-on:click="exportCrossword()">Export</button>
        <button v-on:click="printCrossword()">Print</button>
      </p>
    </div>
    <div class="printinfo">
      <h1>{{name}}</h1>
      <p>By {{author}}</p>
    </div>
    <div class="editor">
      <div class="crossword">
        <table class="crossword__table">
          <tr v-for="y in cwh" v-bind:key="y">
            <td v-for="x in cww" v-bind:key="x" class="cell">
              <div class="cell__number" v-bind:class="{'cell__number--dirty': isClueDirty(x, y)}">{{getCellNumber(x, y)}}</div>
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
        <div
          v-for="(clue, i) in getSortedClues()"
          v-bind:key="i"
          >
          <div v-if="clue">
            {{i}}: {{clue.text}}  ({{clue.dirty ? "Dirty" : ""}})
          </div>
          <div v-if="!clue">
            {{i}}:
          </div>
        </div>
      </div>
      <div class="wordlist">
        <input type="text" ref="exploreword" v-model="exploreWord" v-on:keyup="handleExploreKey($event)" />
        <br />
        <select
          v-bind:size="wordList.length"
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
        <div v-if="wordList.length">
        (Page {{wordListPage + 1}})
        </div>
      </div>
      <div class="desiredwords">
        <textarea
          ref="desiredwords"
          v-model="desiredWords"
          v-on:keyup="triggerSaveTimeout()"
          v-on:change="triggerSaveTimeout()">
        </textarea>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from "vue"
import CrosswordServer from "../lib/CrosswordServer"
import Storage from "../lib/Storage"

const server = new CrosswordServer("//localhost:8080")
const storage = new Storage()

const HORIZONTAL = 1
const VERTICAL = 2
const BOTH = 3

const MAX_SIZE = 21
const MIN_SIZE = 3

const STATE_STARTUP = 0
const STATE_EDIT = 1
const STATE_WAIT = 2

const SYMMETRY_180 = "180"
const SYMMETRY_90 = "90"
const SYMMETRY_NONE = "0"

const DARK = "#"

const isBlankOrDark = (char) => {
  return char === "" || char === DARK
}

class WordStart {
  constructor(x, y, ordinal, direction) {
    this.x = x
    this.y = y
    this.ordinal = ordinal
    this.direction = direction
  }
}

class Clue {
  constructor(x, y, direction, word, text, isDirty) {
    this.x = x
    this.y = y
    this.direction = direction
    this.word = word
    this.text = text
    this.isDirty = isDirty
  }

  matches(x, y, word) {
    return this.x === x && this.y === y && this.word === word
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
      desiredWords: "",
      saveTimeout: null,
      symmetry: SYMMETRY_180,
      exploreWord: "",
      wordStarts: {},
      clues: {},
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
    disableCells: function () {
      return this.state !== STATE_EDIT
    },
  },
  created: function() {
    if (this.state === STATE_STARTUP) {
      this.load().then(() => {
        this.state = STATE_EDIT
      })
      window.addEventListener("keydown", this.handleWindowKey)
    }
    this.recalculateWordStarts()
  },
  methods: {
    getCellClasses: function(x, y) {
      return {
        "cell__input--current": this.currX === x && this.currY === y,
        "cell__input--dark": this.isDark(x, y),
        "cell__input--sameword": this.isSameWord(x, y),
        "cell__input--ghost": this.isShowingGhost(x, y),
        "cell__input--reflection": this.isReflectionCell(x, y)}
    },
    setCell: function (x, y, v) {
      if (this.getCell(x, y) === "#") {
        this.setCellDark(x, y, false)
      }
      Vue.set(this.cells, x + "," + y, v)
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
      this.recalculateWordStarts()
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
    getClue: function(x, y) {
      return this.clues[x + "," + y]
    },
    setClue: function(x, y, dir, v) {
      Vue.set(this.clues, x + "," + y, {
        text: v,
        dir: dir,
        dirty: false,
      })
    },
    markClueDirty: function(x, y) {
      this.clues[x + "," + y].dirty = true
    },
    triggerSaveTimeout: function() {
      if (this.saveTimeout) {
        window.clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = window.setTimeout(this.save, 500)
    },
    save: function() {
      this.state = STATE_WAIT
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
        clues: this.clues,
      }
      return storage.save(crosswordData)
        .then(this.handleSave)
        .catch(this.handleSaveError)
    },
    handleSave: function() {
      this.state = STATE_EDIT
    },
    handleSaveError: function(error) {
      this.state = STATE_EDIT
      this.messages.push(error)
    },
    load: function() {
      this.state = STATE_WAIT
      return storage.load(this.getEntireCrossword())
        .then(this.handleLoad)
        .catch(this.handleLoadError)
    },
    handleLoad: function(crosswordData) {
      this.state = STATE_EDIT
      if (crosswordData) {
        this.author = crosswordData.author
        this.name = crosswordData.name
        this.width = crosswordData.width
        this.height = crosswordData.height
        this.desiredWords = crosswordData.desiredWords
        this.symmetry = crosswordData.symmetry
        this.clues = crosswordData.clues
        this.fillEntireCrossword(crosswordData.crossword)
      } else {
        this.messages.push("Welcome!")
      }
    },
    handleLoadError: function(error){
      this.state = STATE_EDIT
      this.messages.push(error)
    },
    attemptSolve: function(timeout) {
      this.state = STATE_WAIT
      return server.attemptSolve(this.getEntireCrossword(), timeout)
        .then(this.handleSolveAttempt)
        .catch(this.handleSolveAttemptError)
    },
    handleSolveAttempt: function(result) {
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
      this.recalculateWordStarts()
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
      return this.desiredWords.split("\n")
    },
    getCompletions: function(word, backward) {
      this.state = STATE_WAIT
      if (backward) {
        this.wordListPage = Math.max(this.wordListPage - 1, 0)
      } else {
        this.wordListPage ++
      }
      const currentWordRegex = new RegExp("^" + word.toUpperCase() + "$")
      let localWords = this.getLocalWords()
        .map(w => w.toUpperCase())
        .filter(w => currentWordRegex.test(w))
      return server.getCompletions(word.toUpperCase(), localWords, this.wordListPage)
        .then(this.handleCompletions)
        .catch(this.handleCompletionsError)
    },
    handleCompletions: function(result) {
      this.state = STATE_EDIT
      this.wordList = result
    },
    handleCompletionsError: function(error) {
      this.state = STATE_EDIT
      this.wordList = []
      this.messages.push(error)
    },
    fillWithWord: function(word, isGhost) {
      if (this.wordList.length === 0) {
        this.messages.push("No word to select")
      }
      let [[x, y], _, [dx, dy]] = this.getCurrentWordBounds()
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
      } else {
        this.$refs[target].focus()
      }
    },
    handleCellFocus: function(x, y) {
      this.currX = x
      this.currY = y
    },
    handleWindowKey: function(event) {
      const key = event.key
      if (!event.shiftKey) {
        return
      }
      if (key === "!") {
        event.preventDefault()
        this.switchFocus("livecell")
      } else if (key === "@") {
        event.preventDefault()
        this.switchFocus("clue")
      } else if (key === "#") {
        event.preventDefault()
        this.switchFocus("exploreword")
      } else if (key === "$") {
        event.preventDefault()
        this.switchFocus("desiredwords")
      }
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
      if (this.state === STATE_WAIT) {
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
        this.wordListPage = -1
        this.exploreWord = this.getCurrentWord()
        this.getCompletions(this.getCurrentWord(), false).then(() => {
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
      if (key === "Enter") {
        this.switchFocus("livecell")
      } else if (key === "Tab" && event.shiftKey) {
        event.preventDefault()
        this.switchFocus("livecell")
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
    getCurrentWordBounds: function() {
      let startX = this.currX
      let startY = this.currY
      let endX = this.currX
      let endY = this.currY
      const dx = this.moveMode === HORIZONTAL ? 1 : 0
      const dy = this.moveMode === VERTICAL ? 1 : 0
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
    getCurrentWord: function() {
      const [[startX, startY], [endX, endY], [dx, dy]] = this.getCurrentWordBounds()
      let x = startX
      let y = startY
      const letters = []
      while (x !== endX || y !== endY) {
        const letter = this.getCell(x, y)
        letters.push(letter === "" ? "." : letter)
        x += dx
        y += dy
      }
      // Grab the last one
      const letter = this.getCell(x, y)
      letters.push(letter === "" ? "." : letter)
      return letters.join("")
    },
    handleExploreKey: function(event) {
      const key = event.key
      if (key === "Enter") {
        this.onExploreEnter()
      }
    },
    onExploreEnter: function() {
      this.wordListPage = -1
      this.getCompletions(this.exploreWord, false)
      this.switchFocus("wordlist")
    },
    recalculateWordStarts: function() {
      this.wordStarts = {}
      let wordNumber = 1
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.getCell(x, y) === DARK ) {
            continue
          }
          const isHorizontal = x === 0 || this.getCell(x - 1, y) === DARK
          const isVertical = y === 0 || this.getCell(x, y - 1) === DARK
          if (isHorizontal && isVertical) {
            this.wordStarts[x + "," + y] = WordStart(x, y, wordNumber, BOTH)
          } else if (isHorizontal) {
            this.wordStarts[x + "," + y] = WordStart(x, y, wordNumber, HORIZONTAL)
          } else if (isVertical) {
            this.wordStarts[x + "," + y] = WordStart(x, y, wordNumber, VERTICAL)
          }
          wordNumber ++
        }
      }
    },
    getCellNumber: function(x, y) {
      return this.wordStarts[x + "," + y].wordNumber || ""
    },
    isClueDirty: function(x, y) {
      const clue = this.clues[x + "," + y]
      return !clue || clue.dirty
    },
    exportCrossword: function() {
      this.save().then(() => {
        this.messages.push(window.localStorage.getItem("crossword"))
      })
    },
    printCrossword: function() {
      print()
    },
    getSortedClues: function() {
      this.sortedClues = {
        across: [],
        down: []
      }
      for (let loc in this.wordStarts) {
        this.sortedClues.push(this.clues[loc])
      }
      return this.sortedClues
    },
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
td {
  border: 1px solid black;
  padding: 0;
}

.editor {
  display: grid;
  grid-template-columns: auto 200px 200px 200px;
  margin: 0 auto;
}

.crossword__table {
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

@media print {
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
    float: left;
  }
}
</style>
