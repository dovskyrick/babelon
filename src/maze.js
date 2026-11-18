// An endless labyrinth that is carved only as you explore it.
//
// It is a "growing tree" maze on an unbounded grid: every new cell is carved from an
// already-carved neighbour, so the corridors form a tree rooted at the start cell.
// grow() only carves cells within a radius of the player, leaving the rest of the
// frontier dormant until you walk towards it. A few extra openings (BRAID) add
// occasional loops so dead ends are less punishing.

export const N = 1, E = 2, S = 4, W = 8
export const DIRS = [
  { bit: N, dx: 0, dy: -1, opp: S },
  { bit: E, dx: 1, dy: 0, opp: W },
  { bit: S, dx: 0, dy: 1, opp: N },
  { bit: W, dx: -1, dy: 0, opp: E },
]
const NEWEST = 0.75 // chance to extend the newest branch: higher = longer corridors
const BRAID = 0.05  // chance a new cell also opens into another carved neighbour
const BOOK = 0.03   // chance a new cell has a text lying on its floor

export const key = (x, y) => x + ',' + y

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createMaze(seed) {
  const rng = mulberry32(seed)
  const cells = new Map()
  const frontier = new Set() // carved cells that still have uncarved neighbours
  const books = []

  const get = (x, y) => cells.get(key(x, y))
  const add = (x, y) => {
    const c = { x, y, open: 0, book: null }
    cells.set(key(x, y), c); frontier.add(c)
    return c
  }
  const link = (a, b, d) => { a.open |= d.bit; b.open |= d.opp }

  add(0, 0)

  function grow(px, py, R) {
    const near = (x, y) => Math.abs(x - px) <= R && Math.abs(y - py) <= R
    const live = [...frontier].filter((c) => near(c.x, c.y))
    let born = 0
    while (live.length) {
      const i = rng() < NEWEST ? live.length - 1 : Math.floor(rng() * live.length)
      const c = live[i]
      const opts = []
      let uncarved = false
      for (const d of DIRS) {
        if (get(c.x + d.dx, c.y + d.dy)) continue
        uncarved = true
        if (near(c.x + d.dx, c.y + d.dy)) opts.push(d)
      }
      if (!uncarved) frontier.delete(c)
      if (!opts.length) { live.splice(i, 1); continue }

      const d = opts[Math.floor(rng() * opts.length)]
      const n = add(c.x + d.dx, c.y + d.dy)
      link(c, n, d)
      if (rng() < BRAID) {
        const others = DIRS.filter((e) => e.opp !== d.bit && get(n.x + e.dx, n.y + e.dy))
        if (others.length) { const e = others[Math.floor(rng() * others.length)]; link(n, get(n.x + e.dx, n.y + e.dy), e) }
      }
      // first carved cell always gets a text, so there is one to find right away
      if (books.length === 0 || rng() < BOOK) {
        n.book = { id: books.length, x: n.x + (rng() - 0.5) * 0.5, y: n.y + (rng() - 0.5) * 0.5, rot: rng() * Math.PI, read: false, page: null }
        books.push(n.book)
      }
      live.push(n); born++
    }
    return born
  }

  return { cells, books, get, grow, rng }
}
