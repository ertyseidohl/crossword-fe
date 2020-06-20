// From https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
function toBinary(string) {
  const codeUnits = new Uint16Array(string.length)
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = string.charCodeAt(i)
  }
  return String.fromCharCode(...new Uint8Array(codeUnits.buffer))
}

function fromBinary(binary) {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return String.fromCharCode(...new Uint16Array(bytes.buffer))
}

function safeBase64Encode(string) {
  return btoa(toBinary(string))
}

function safeBase64Decode(string) {
  return fromBinary(atob(string))
}

module.exports = {
  safeBase64Encode,
  safeBase64Decode,
}

