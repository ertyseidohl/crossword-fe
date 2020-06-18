const CROSSWORD_KEY = "crossword"

class LocalStorage {
  save(crosswordData) {
    window.localStorage.setItem(CROSSWORD_KEY, JSON.stringify(crosswordData))
    return new Promise(res => setTimeout(res, 0))
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

module.exports = LocalStorage
