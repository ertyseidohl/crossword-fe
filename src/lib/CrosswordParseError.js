export default class CrosswordParseError extends Error {
  constructor(jsonError, binaryError, ...params) {
    super(...params)
    this.jsonError = jsonError
    this.binaryError = binaryError
    this.message = `JSON Error:
${jsonError.message}
---
Binary Error:
${binaryError.message}`
  }
}