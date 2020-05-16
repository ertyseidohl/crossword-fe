<template>
  <div id="app">
    <Crossword />
  </div>
</template>

<script>
import Crossword from "./components/Crossword.vue"

export default {
  name: "App",
  components: {
    Crossword,
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
