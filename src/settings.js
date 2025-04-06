/* eslint-disable no-undef */
module.exports = {
  backendUrl:
    process.env.NODE_ENV === "production"
      ? "https://crossword.erty.me"
      : "http://localhost:8081",
}