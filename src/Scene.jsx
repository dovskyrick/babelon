import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIRS, N, E, S, W } from './maze.js'

export const CELL = 2        // world units per maze cell
export const GROW_R = 9      // carve the maze this many cells around the player
const VIEW_R = 11            // render this many cells around the player
const T = 0.22, H = 1.3      // wall thickness, height
const R = 0.3                // player half-width
const SPEED = 4.2            // units per second
const OPEN_D = 0.75, REARM_D = 1.3
const MAX_WALLS = 4 * (2 * VIEW_R + 1) ** 2, MAX_FLOORS = (2 * VIEW_R + 1) ** 2

// Wall boxes of one cell side: [centerX, centerZ, halfX, halfZ]
function wallBox(c, bit) {
  const x = c.x * CELL, z = c.y * CELL, h = CELL / 2
  if (bit === N) return [x, z - h, h + T / 2, T / 2]
  if (bit === S) return [x, z + h, h + T / 2, T / 2]
  if (bit === W) return [x - h, z, T / 2, h + T / 2]
  return [x + h, z, T / 2, h + T / 2]
}

function collide(maze, p, nx, nz) {
  const cx = Math.round(p.x / CELL), cy = Math.round(p.z / CELL)
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const c = maze.get(cx + dx, cy + dy)
    if (!c) continue
    for (const d of DIRS) {
      if (c.open & d.bit) continue
      const [bx, bz, hx, hz] = wallBox(c, d.bit)
      // resolve X with the old Z, then Z with the new X
      if (Math.abs(nx - bx) < hx + R && Math.abs(p.z - bz) < hz + R) nx = nx < bx ? bx - hx - R : bx + hx + R
      if (Math.abs(nx - bx) < hx + R && Math.abs(nz - bz) < hz + R) nz = nz < bz ? bz - hz - R : bz + hz + R
    }
  }
  return [nx, nz]
}

function Maze({ g, version }) {
  const walls = useRef(), floors = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3()
    const { maze } = g, [px, py] = g.cell.current
    let nw = 0, nf = 0
    for (let y = py - VIEW_R; y <= py + VIEW_R; y++) for (let x = px - VIEW_R; x <= px + VIEW_R; x++) {
      const c = maze.get(x, y)
      if (!c) continue
      floors.current.setMatrixAt(nf++, m.compose(v.set(x * CELL, 0, y * CELL), q, s.set(1, 1, 1)))
      for (const d of DIRS) {
        if (c.open & d.bit) continue
        // a side shared with a carved neighbour is drawn by that neighbour's N/W pass
        if ((d.bit === S || d.bit === E) && maze.get(x + d.dx, y + d.dy)) continue
        const [bx, bz, hx, hz] = wallBox(c, d.bit)
        walls.current.setMatrixAt(nw++, m.compose(v.set(bx, H / 2, bz), q, s.set(hx * 2, H, hz * 2)))
      }
    }
    walls.current.count = nw; floors.current.count = nf
    walls.current.instanceMatrix.needsUpdate = floors.current.instanceMatrix.needsUpdate = true
  }, [g, version])
  return (
    <group>
      <instancedMesh ref={floors} args={[null, null, MAX_FLOORS]} frustumCulled={false}>
        <boxGeometry args={[CELL - 0.06, 0.02, CELL - 0.06]} />
        <meshStandardMaterial color="#3a3428" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={walls} args={[null, null, MAX_WALLS]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#8b7a5e" roughness={0.85} />
      </instancedMesh>
    </group>
  )
}

function Book({ b, g }) {
  const ref = useRef(), glow = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + b.id
    ref.current.position.y = 0.14 + 0.05 * Math.sin(t * 2)
    glow.current.scale.setScalar(1 + 0.15 * Math.sin(t * 3))
    glow.current.material.opacity = b.read ? 0.12 : 0.4
  })
  const color = b.read ? '#6c7a92' : '#e0a83a'
  return (
    <group position={[b.x * CELL, 0, b.y * CELL]} rotation-y={b.rot}>
      <mesh ref={ref}>
        <boxGeometry args={[0.5, 0.1, 0.68]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={b.read ? 0.1 : 0.45} />
      </mesh>
      <mesh ref={glow} rotation-x={-Math.PI / 2} position-y={0.03}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#ffd27a" transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function Player({ g, onCell, onBook }) {
  const ref = useRef(), lamp = useRef()
  const v = useMemo(() => new THREE.Vector2(), [])
  useFrame(({ camera }, dt) => {
    const p = g.player.current, k = g.keys.current
    if (!g.paused.current) {
      v.set((k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0))
      if (v.lengthSq() > 0) {
        v.normalize().multiplyScalar(SPEED * Math.min(dt, 0.05))
        const [nx, nz] = collide(g.maze, p, p.x + v.x, p.z + v.y)
        p.x = nx; p.z = nz
        p.face = Math.atan2(v.x, v.y)
      }
    }
    const cx = Math.round(p.x / CELL), cy = Math.round(p.z / CELL)
    if (cx !== g.cell.current[0] || cy !== g.cell.current[1]) onCell(cx, cy)

    // texts in this cell and its neighbours
    let near = null, nd = Infinity
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const b = g.maze.get(cx + dx, cy + dy)?.book
      if (!b) continue
      const d = Math.hypot(b.x * CELL - p.x, b.y * CELL - p.z)
      if (d < nd) { nd = d; near = b }
    }
    if (g.dismissed.current && (near !== g.dismissed.current || nd > REARM_D)) g.dismissed.current = null
    if (near && nd < OPEN_D && near !== g.dismissed.current && !g.paused.current) onBook(near)

    ref.current.position.set(p.x, 0.65, p.z)
    ref.current.rotation.y = p.face
    lamp.current.position.set(p.x, 2.6, p.z)
    camera.position.lerp({ x: p.x, y: 15, z: p.z + 8.5 }, Math.min(1, dt * 4))
    camera.lookAt(camera.position.x, 0, camera.position.z - 8.5)
  })
  return (
    <>
      <mesh ref={ref}>
        <boxGeometry args={[R * 2, 1.3, R * 2]} />
        <meshStandardMaterial color="#d8dde6" metalness={0.3} roughness={0.45} />
      </mesh>
      <pointLight ref={lamp} color="#ffd9a0" intensity={40} distance={16} decay={1.6} />
    </>
  )
}

export default function Scene({ g, version, onCell, onBook }) {
  const books = []
  const [px, py] = g.cell.current
  for (const b of g.maze.books) if (Math.abs(b.x - px) <= VIEW_R && Math.abs(b.y - py) <= VIEW_R) books.push(b)
  return (
    <Canvas camera={{ position: [0, 15, 8.5], fov: 45 }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
      <color attach="background" args={['#0d0c0a']} />
      <fog attach="fog" args={['#0d0c0a', 12, 26]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 12, 6]} intensity={0.5} />
      <Maze g={g} version={version} />
      {books.map((b) => <Book key={b.id} b={b} g={g} />)}
      <Player g={g} onCell={onCell} onBook={onBook} />
    </Canvas>
  )
}
