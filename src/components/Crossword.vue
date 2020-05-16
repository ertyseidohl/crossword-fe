<template>
  <div class="hello">
    <div>
      <p v-for="(e, i) in errors" v-bind:key="i">{{e}}</p>
    </div>
    <h1>Crossword</h1>
    <div>
      <h2>
        Name: <input v-model="name" /><br/>
        By <input v-model="author" />
      </h2>
      <p>
        Width:
        <input type="number" min="2" max="20" v-model="width">
        Height:
        <input type="number" min="2" max="20" v-model="height">
      </p>
    </div>
    <table>
      <tr v-for="y in cwh" v-bind:key="y">
        <td v-for="x in cww" v-bind:key="x">
          <input
            class="cell"
            v-bind:value="getCell(x, y)"
            v-bind:class="{ 'cell--dark': isDark(x, y)}"
            v-on:keypress="handleCellKey(x, y, $event)"
            v-bind:id="x + ',' + y"
            maxlength="1" />
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import Vue from "vue"

const consts = {
  STATE_EDIT: 1,
  MAX_SIZE: 21,
  MIN_SIZE: 3,
  DARK: "#",
}
export default {
  name: "Crossword",
  data: function() {
    return {
      state: consts.STATE_EDIT,
      height: 13,
      width: 13,
      name: "My Crossword",
      author: "Me",
      errors: [],
      data: {},
      ...consts,
    }
  },
  computed: {
    cww: function () {
      const w = parseInt(this.width, 10)
      if (isNaN(w) || w < this.MIN_SIZE || w > this.MAX_SIZE) {
        return []
      }
      return [...Array(w).keys()]
    },
    cwh: function () {
      const h = parseInt(this.height, 10)
      if (isNaN(h) || h < this.MIN_SIZE || h > this.MAX_SIZE) {
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
      return this.data[x + "," + y] == "#"
    },
    handleCellKey: function(x, y, event) {
      const code = event.which || event.keyCode
      if (code == 8) {
        if (this.getCell(x, y) == "") {
          this.moveCursor(x, y, -1, true)
        } else{
          this.setCell(x, y, "")
        }
      } else if (code == 37) {
        // Left
        this.moveCursor(x, y, -1, false)
      } else if (code == 39) {
        // Right
        this.moveCursor(x, y, 1, false)
      } else if (code == 32) {
        // Space
        this.setCell(x, y, this.DARK)
        this.moveCursor(x, y, 1, true)
      } else if (
        // From https://stackoverflow.com/a/12467610/374601
        (code >= 48 && code <= 57)   || // number keys
        (code >= 65 && code <= 90)   || // letter keys
        (code >= 96 && code <= 105)   || // numpad keys
        (code > 44) //
      ) {
        console.log(code, String.fromCharCode(code))
        this.setCell(x, y, String.fromCharCode(code))
        this.moveCursor(x, y, 1, false)
      } else {
        console.log(code)
      }
    },
    moveCursor: function(x, y, distance, del) {
      const xd = x + distance
      const cell = document.getElementById(xd + "," + y)
      if (cell) {
        cell.focus()
        if (del) {
          this.setCell(xd, y, "")
        }
      }
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

.cell--dark {
  background-color: black;
}
</style>
