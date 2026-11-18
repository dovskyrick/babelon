import { useCallback, useEffect, useRef, useState } from 'react'
import Scene, { GROW_R } from './Scene.jsx'
import { createMaze } from './maze.js'
import { pageAt, randomIndex, addressOf, lines, pickWord, LINES } from './babel.js'

const SHOWN = 5 // lines of the page shown in the reader (80 chars each)

function openPage(book, rng) {
  if (!book.page) {
    const index = randomIndex(rng)
    const all = lines(pageAt(index))
    const from = Math.floor(rng() * (LINES - SHOWN + 1))
    const text = all.slice(from, from + SHOWN).join('')
    book.page = { addr: addressOf(index), from, text, word: pickWord(text, rng) }
  }
  return book.page
}

function Reader({ book, onClose }) {
  const { addr, from, text, word } = book.page
  const hex = addr.hex.length > 18 ? `${addr.hex.slice(0, 10)}…${addr.hex.slice(-6)}` : addr.hex
  const w = text.slice(word.at, word.at + word.len)
  return (
    <div className="veil" onClick={onClose}>
      <div className="reader" onClick={(e) => e.stopPropagation()}>
        <div className="addr">
          <span title={`hexagon ${addr.hex}`}>Hexagon <b>{hex}</b></span>
          <span>Wall <b>{addr.wall}</b></span><span>Shelf <b>{addr.shelf}</b></span>
          <span>Volume <b>{addr.volume}</b></span><span>Page <b>{addr.page}</b></span>
        </div>
        <div className="lines">lines {from + 1}–{from + SHOWN} of {LINES}</div>
        <p className="page">
          {text.slice(0, word.at)}<mark>{w}</mark>{text.slice(word.at + word.len)}
        </p>
        <div className="foot">
          <span>The word: <mark>{w}</mark></span>
          <button onClick={onClose}>Close · Esc</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const gRef = useRef(null)
  if (!gRef.current) {
    const maze = createMaze((Math.random() * 2 ** 32) >>> 0)
    maze.grow(0, 0, GROW_R)
    gRef.current = {
      maze,
      player: { current: { x: 0, z: 0, face: Math.PI } },
      cell: { current: [0, 0] },
      keys: { current: {} },
      paused: { current: false },
      dismissed: { current: null },
      walked: new Set(['0,0']),
    }
  }
  const G = gRef.current
  if (location.search.includes('debug')) window.babelon = G
  const [version, setVersion] = useState(0)
  const [book, setBook] = useState(null)
  const [read, setRead] = useState(0)

  const onCell = useCallback((x, y) => {
    G.cell.current = [x, y]
    G.walked.add(x + ',' + y)
    G.maze.grow(x, y, GROW_R)
    setVersion((v) => v + 1)
  }, [G])

  const onBook = useCallback((b) => {
    openPage(b, G.maze.rng)
    if (!b.read) { b.read = true; setRead((n) => n + 1) }
    G.paused.current = true
    setBook(b)
  }, [G])

  const close = useCallback(() => {
    G.dismissed.current = book
    G.paused.current = false
    setBook(null)
  }, [G, book])

  useEffect(() => {
    const down = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k.startsWith('Arrow')) e.preventDefault()
      if (book) {
        if (k === 'Escape' || k === 'Enter' || k === ' ') { e.preventDefault(); close() }
        else if (k.startsWith('Arrow') || 'wasd'.includes(k)) close() // walk away to close
      }
      G.keys.current[k] = true
    }
    const up = (e) => { G.keys.current[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false }
    const blur = () => { G.keys.current = {} }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [G, book, close])

  // on-screen arrows for touch devices
  const hold = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); if (book) close(); G.keys.current[k] = true },
    onPointerUp: () => { G.keys.current[k] = false },
    onPointerLeave: () => { G.keys.current[k] = false },
  })

  return (
    <div className="app">
      <Scene g={G} version={version} onCell={onCell} onBook={onBook} />
      <div className="panel">
        <div className="title">Babelon</div>
        <div>Rooms walked <b>{G.walked.size}</b> · Texts read <b>{read}</b></div>
        <div className="hint">Arrow keys or WASD to move. Step onto a glowing text to read it.</div>
      </div>
      <div className="pad">
        <button {...hold('ArrowUp')} className="up">▲</button>
        <button {...hold('ArrowLeft')} className="left">◀</button>
        <button {...hold('ArrowDown')} className="down">▼</button>
        <button {...hold('ArrowRight')} className="right">▶</button>
      </div>
      {book && <Reader book={book} onClose={close} />}
    </div>
  )
}
