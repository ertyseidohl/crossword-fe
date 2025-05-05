// From https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
function toBinary(str: string) {
  const codeUnits = new Uint16Array(str.length)
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = str.charCodeAt(i)
  }
  return String.fromCharCode(...new Uint8Array(codeUnits.buffer))
}

function fromBinary(binary: string) {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return String.fromCharCode(...new Uint16Array(bytes.buffer))
}

export function safeBase64Encode(str: string) {
  return btoa(toBinary(str))
}

export function safeBase64Decode(str: string) {
  return fromBinary(atob(str))
}

