class CrosswordServer {
  constructor(url) {
    this.url = url
  }
  async getCompletions(word, localWords, page) {
    try {
      const response = await window.fetch(
        this.url + "/words?word=" + encodeURIComponent(word) + "&page=" + encodeURIComponent(page))
      if (response.ok) {
        const text = await response.text()
        // Todo: if localWords.length > 10 put it on a different page etc.
        return localWords.concat(text.split(" "))
      } else {
        return Promise.reject("Response not ok.")
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }
  async attemptSolve(crossword, timeout) {
    try {
      let url = this.url + "/solve?crossword=" + encodeURIComponent(crossword)
      if (timeout !== undefined) {
        url += "&timeout=" + parseInt(timeout, 10)
      } else {
        timeout = 30
      }
      const response = await window.fetch(url)
      if (response.ok) {
        if (response.status === 204) {
          return Promise.reject("Server found no solutions.")
        }
        return response.text()
      } else {
        if (await response.text() === "Timeout") {
          return Promise.reject(`Unable to find a solution in ${timeout}s.`)
        } else {
          return Promise.reject("Response was not ok.")
        }
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }
}

module.exports = CrosswordServer
