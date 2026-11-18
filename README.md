# Babelon

A minimal top-down React Three Fiber game: wander an endless labyrinth that is carved
as you explore it, and read the texts dropped on its floor, each one a real page of
Borges' Library of Babel.

- **Move:** arrow keys or WASD (on-screen arrows on touch devices)
- **Read:** step onto a glowing text. Close with Esc, Enter, Space, or just walk away

## How it works

- `src/maze.js`: a "growing tree" maze on an unbounded grid. Cells are carved only within
  a radius of the player, so the labyrinth is a tree that keeps growing outward as you
  walk, with a few extra openings for occasional loops.
- `src/babel.js`: the Library. 25 symbols (22 letters, space, comma, period), 40 lines of
  80 characters per page, 410 pages per volume, 32 volumes per shelf, 5 shelves per wall,
  4 walls per hexagon. A page's position is an integer below 25^3200; its text is that
  integer under an invertible affine scramble written in base 25. `locate(text)` is the
  exact inverse, so every page exists exactly once and any text can be found.
- The reader shows 5 consecutive lines of the page and highlights a random run of 5–10
  consecutive letters: the page's "word".

```bash
npm install
npm run dev
npm test   # checks that locate(pageAt(i)) === i and that the maze links are consistent
```

GitHub Actions (`.github/workflows/deploy.yml`) builds the site and deploys it to GitHub Pages.
