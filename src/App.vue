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
  font-family: Times New Roman, serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 1rem auto;
}
</style>
