const CROSSWORD_KEY = "crossword"

class Storage {
  save(crosswordData) {
    window.localStorage.setItem(CROSSWORD_KEY, JSON.stringify(crosswordData))
    return Promise.resolve()
  }
  load() {
    const crosswordData = window.localStorage.getItem(CROSSWORD_KEY)
    if (crosswordData) {
      return Promise.resolve(JSON.parse(crosswordData))
    } else {
      return Promise.resolve(null)
    }
  }
}

module.exports = Storage
