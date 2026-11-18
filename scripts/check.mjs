// Sanity checks for the Library and the maze: `npm test`
import assert from 'node:assert/strict'
import { pageAt, locate, randomIndex, addressOf, pickWord, PAGE_LEN, ALPHABET, M } from '../src/babel.js'
import { createMaze, DIRS } from '../src/maze.js'

assert.equal(ALPHABET.length, 25)
for (let i = 0; i < 3; i++) {
  const idx = randomIndex()
  const page = pageAt(idx)
  assert.equal(page.length, PAGE_LEN)
  assert.equal(locate(page), idx, 'locate(pageAt(i)) === i')
}
const quote = 'the universe, which others call the library, is composed of an indefinite number of hexagonal galleries.'
  .replace(/[kqwy]/g, 'x') // our alphabet has 22 letters
assert.equal(pageAt(locate(quote)).trimEnd(), quote)
assert.ok(locate(quote) < M)
console.log('address of a Borges line:', { ...addressOf(locate(quote)), hex: addressOf(locate(quote)).hex.slice(0, 12) + '…' })
const w = pickWord('ab cdefghij, lm')
assert.ok(w.len >= 3)

const m = createMaze(42)
m.grow(0, 0, 10)
let edges = 0
for (const c of m.cells.values()) for (const d of DIRS) if (c.open & d.bit) {
  const n = m.get(c.x + d.dx, c.y + d.dy); assert.ok(n && n.open & d.opp, 'links are symmetric'); edges++
}
assert.equal(m.cells.size, 21 * 21, 'fills the radius')
console.log(`maze: ${m.cells.size} cells, ${edges / 2} passages, ${m.books.length} texts`)
console.log('ok')
