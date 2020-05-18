<template>
  <div class="editor">
    <h1>Crossword</h1>
    <div class="errors">
      <p v-for="(e, i) in errors" v-bind:key="i">{{e}}</p>
    </div>
    <div class="info">
      <h2>
        Name: <input v-model="name" /><br/>
        By <input v-model="author" />
      </h2>
      <p>
        Width:
        <input type="number" min="2" max="20" v-model="width">
        Height:
        <input type="number" min="2" max="20" v-model="height">
        <button v-on:click="attemptSolve()">Solve</button>
        <button v-on:click="attemptSolve(100)">Long Solve</button>
      </p>
    </div>
    <div class="crossword">
      <table>
        <tr v-for="y in cwh" v-bind:key="y">
          <td v-for="x in cww" v-bind:key="x">
            <input
              class="cell"
              v-bind:value="getCell(x, y)"
              v-bind:class="{'cell--dark': isDark(x, y), 'cell--sameword': isSameWord(x, y)}"
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
    <div class="wordlist">
      <select
        size="10"
        ref="wordlist"
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
      <textarea v-model="desiredWords">
      </textarea>
    </div>
  </div>
</template>

<script>
import Vue from "vue"
import CrosswordServer from "../lib/CrosswordServer"

const server = new CrosswordServer("//localhost:8080")

const HORIZONTAL = 1
const VERTICAL = 2

const MAX_SIZE = 21
const MIN_SIZE = 3

const STATE_EDIT = 1
const STATE_WAIT = 2

const DARK = "#"

export default {
  name: "Crossword",
  data: function() {
    return {
      state: STATE_EDIT,
      moveMode: HORIZONTAL,
      currX: 0,
      currY: 0,
      height: 13,
      width: 13,
      name: "My Crossword",
      author: "Me",
      errors: [],
      data: {},
      wordList: [],
      wordListSelectedIndex: 0,
      wordListPage: -1,
      desiredWords: "",
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
  },
  methods: {
    setCell: function (x, y, v) {
      Vue.set(this.data, x + "," + y, v)
    },
    getCell: function (x, y) {
      return this.data[x + "," + y] || ""
    },
    isDark: function (x, y) {
      return this.data[x + "," + y] === "#"
    },
    attemptSolve: function(timeout) {
      this.state = STATE_WAIT
      server.attemptSolve(this.getEntireCrossword(), timeout)
        .then(this.handleSolveAttempt)
        .catch(this.handleSolveAttemptError)
    },
    handleSolveAttempt: function(result) {
      this.state = STATE_EDIT
      const content = result.split("\n")
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          this.setCell(x, y, content[y][x])
        }
      }
    },
    handleSolveAttemptError: function(error) {
      this.errors.push(error)
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
    getCompletions: function(backward) {
      this.state = STATE_WAIT
      if (backward) {
        this.wordListPage = Math.max(this.wordListPage - 1, 0)
      } else {
        this.wordListPage ++
      }
      server.getCompletions(this.getCurrentWord(), this.wordListPage)
        .then(this.handleCompletions)
        .catch(this.handleCompletionsError)
      this.wordListSelectedIndex = 0
    },
    handleCompletions: function(result) {
      this.state = STATE_EDIT
      this.wordList = result
    },
    handleCompletionsError: function(error) {
      this.state = STATE_EDIT
      this.wordList = []
      this.errors.push(error)
    },
    selectNextCompletion: function() {
      this.wordListSelectedIndex =
        (this.wordListSelectedIndex + 1) % this.wordList.length
    },
    fillWithWord: function(word) {
      if (this.wordList.length === 0) {
        this.errors.push("No word to select")
      }
      let [[x, y], _, [dx, dy]] = this.getCurrentWordBounds()
      for (let char of word.split("")) {
        this.setCell (x, y, char)
        x += dx
        y += dy
      }
      this.moveCursor(x - dx, y - dy, null, 0)
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
    handleWordListKey: function(event) {
      const key = event.key
      if (event.ctrlKey || event.metaKey) {
        return
      }
      const word = event.target.value
      if (key === "Enter" && word) {
        this.fillWithWord(word)
      } else if (key === "Tab") {
        event.preventDefault()
        this.switchFocus("livecell")
      } else if (key === "ArrowLeft") {
        this.getCompletions(true)
      } else if (key === "ArrowRight") {
        this.getCompletions(false)
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
      console.log(event)
      if (key === "Backspace") {
        if (this.getCell(x, y) === "DARK") {
          return
        }
        if (this.getCell(x, y) === "") {
          this.moveCursor(x, y, HORIZONTAL, -1)
          this.setCell(this.currX, this.currY, "")
        } else{
          this.setCell(x, y, "")
        }
      } else if (key === "Tab") {
        this.switchMoveMode()
      } else if (key === "Enter") {
        if (this.getCell(this.currX, this.currY) === DARK) {
          return
        }
        this.wordListPage = -1
        this.getCompletions(false)
        this.switchFocus("wordlist")
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
          this.setCell(x, y, "")
        } else {
          this.setCell(x, y, DARK)
        }
      } else if (/^[a-z0-9]$/i.test(key)) {
        this.setCell(x, y, key.toUpperCase())
        this.moveCursor(x, y, HORIZONTAL, 1)
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
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
td {
  border: 1px solid black;
  padding: 0;
}

.cell {
  width: 1rem;
  height: 1rem;
  text-transform: uppercase;
}

.cell--sameword {
  background-color: #ccc;
}

.cell--dark {
  background-color: black;
}

.word {
  font-family: monospace;
}

.word--selected {
  background-color: black;
  color: white;
  font-weight: bold;
}
</style>
