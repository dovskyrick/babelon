// The Library of Babel, after Borges: 25 symbols (22 letters, space, comma, period),
// 410 pages per book, 40 lines per page, 80 characters per line.
//
// Every possible page exists exactly once. A page's position in the library is an
// integer `index` in [0, 25^3200). Its text is that index pushed through an
// invertible affine scramble modulo 25^3200 and written out in base 25, so
// pageAt() and locate() are exact inverses: any text can be found, and every
// address has exactly one text.

export const ALPHABET = 'abcdefghijlmnoprstuvxz ,.' // 22 letters + space, comma, period
export const LINES = 40, COLS = 80, PAGE_LEN = LINES * COLS
export const WALLS = 4, SHELVES = 5, VOLUMES = 32, PAGES = 410
const PER_HEX = BigInt(WALLS * SHELVES * VOLUMES * PAGES)

const B = 25n
const CHUNK = 10 // 25^10 < 2^53, so a chunk of 10 digits fits in a plain number
const B_CHUNK = B ** BigInt(CHUNK)
export const M = B ** BigInt(PAGE_LEN) // number of distinct pages

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function digitsToBig(d) {
  let n = 0n
  for (let i = 0; i < d.length; i += CHUNK) {
    let c = 0
    for (let j = i; j < i + CHUNK; j++) c = c * 25 + d[j]
    n = n * B_CHUNK + BigInt(c)
  }
  return n
}

function bigToDigits(n) {
  const d = new Array(PAGE_LEN)
  for (let i = PAGE_LEN - CHUNK; i >= 0; i -= CHUNK) {
    let c = Number(n % B_CHUNK); n /= B_CHUNK
    for (let j = i + CHUNK - 1; j >= i; j--) { d[j] = c % 25; c = Math.floor(c / 25) }
  }
  return d
}

export function randomIndex(rng = Math.random) {
  return digitsToBig(Array.from({ length: PAGE_LEN }, () => Math.floor(rng() * 25)))
}

// Fixed scramble constants: A must be coprime to M (= 5^6400), i.e. not divisible by 5.
const KEY = mulberry32(0x0babe1)
let A = randomIndex(KEY); if (A % 5n === 0n) A += 1n
const C = randomIndex(KEY)

export function pageAt(index) {
  return bigToDigits((A * index + C) % M).map((x) => ALPHABET[x]).join('')
}

function modInverse(a, m) {
  let [r0, r1, s0, s1] = [a % m, m, 1n, 0n]
  while (r1) { const q = r0 / r1;[r0, r1] = [r1, r0 - q * r1];[s0, s1] = [s1, s0 - q * s1] }
  return ((s0 % m) + m) % m
}
let A_INV = null

// Find the address of any text (padded with spaces to a full page).
export function locate(text) {
  const t = text.toLowerCase().padEnd(PAGE_LEN, ' ').slice(0, PAGE_LEN)
  const d = [...t].map((ch) => { const i = ALPHABET.indexOf(ch); if (i < 0) throw new Error(`"${ch}" is not in the Library's alphabet`); return i })
  A_INV ??= modInverse(A, M)
  return (((digitsToBig(d) - C) % M + M) % M) * A_INV % M
}

export function addressOf(index) {
  let r = index % PER_HEX
  const page = r % 410n; r /= 410n
  const volume = r % 32n; r /= 32n
  const shelf = r % 5n
  const wall = r / 5n
  const hex = (index / PER_HEX).toString(36)
  return { hex, wall: Number(wall) + 1, shelf: Number(shelf) + 1, volume: Number(volume) + 1, page: Number(page) + 1 }
}

export function lines(text) {
  return Array.from({ length: LINES }, (_, i) => text.slice(i * COLS, (i + 1) * COLS))
}

// Pick a run of `len` consecutive letters (no space or punctuation) inside `s`.
export function pickWord(s, rng = Math.random) {
  const isL = (ch) => ch >= 'a' && ch <= 'z'
  for (let len = 5 + Math.floor(rng() * 6); len >= 3; len--) {
    const starts = []
    for (let i = 0, run = 0; i < s.length; i++) {
      run = isL(s[i]) ? run + 1 : 0
      if (run >= len) starts.push(i - len + 1)
    }
    if (starts.length) { const at = starts[Math.floor(rng() * starts.length)]; return { at, len } }
  }
  return { at: 0, len: 0 }
}
