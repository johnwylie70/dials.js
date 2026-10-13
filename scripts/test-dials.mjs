#!/usr/bin/env node
/**
 * The controls in real browsers, on pictures.js scenes. Small scenes leave what they found in
 * `result` for the test to compare; then controls are turned, pressed and played with a real
 * mouse, the keyboard and several fingers at once; then every example is run for a moment.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-dials.mjs
 *
 * pictures.js is taken from the folder beside this repository (or PICTURES=/path/to/pictures.js).
 * Chromium, and WebKit when Playwright has it. `--shots` also saves a picture of each example in
 * shots/. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PICTURES = resolve(process.env.PICTURES || join(ROOT, '..', 'pictures.js'))
const SHOTS = process.argv.includes('--shots')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/full.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;overflow:hidden;background:#fff"><div id="s" style="position:absolute;inset:0"></div>')
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:20px;background:#fff"><div id="s" style="width:760px;height:560px"></div>')
  let body
  // pictures.js itself, and what it loads, come from its own repository; everything else from this one.
  const file = path.startsWith('/pictures/') ? join(PICTURES, path.slice(10)) : join(ROOT, path)
  try { body = await readFile(file) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// Every scene starts with these: the library, and a way to wait for the controls to be laid out and drawn.
const TOP = `const lib = await use("/dials.js")
const { dial, slider, button, toggle, select, keyboard, scope, meter, label, row, layout, over, dials, theme } = lib
const drawn = async () => { await frame(); await frame(); await frame() }
`
// Run a scene on the page as it is now; what it left in `result`, or its error.
const play = (page, source, base) => page.evaluate(async ({ source, base }) => {
  const { runScene } = await import('/pictures/pictures.js')
  window.result = undefined
  window.scene?.stop()
  document.getElementById('s').replaceChildren()
  return new Promise((done) => {
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', base, keyboard: true, onError: (message, line) => done({ error: message, line }) })
    const look = () => (window.result !== undefined ? done(window.result) : setTimeout(look, 20))
    look()
    setTimeout(() => done({ error: 'the scene left no result' }), 4000)
  })
}, { source, base })

// --- cases that need no hands: a scene that sets window.result, and what it must be
const CASES = [
  { what: 'a dial with a range is a number: it starts at the low end, or where it is told to',
    source: `const a = dial("speed", 0, 10), b = dial("size", 5, 50, 20)
window.result = [a.value, b.value, a.min, a.max, b * 2, b + 1, \`\${b}\`, a.label]`,
    want: [0, 20, 0, 10, 40, 21, '20', 'speed'] },
  { what: 'a value set from code is kept inside the range and on the step',
    source: `const a = dial("n", 0, 10, { step: 2 }), b = slider("s", -1, 1, 0)
a.value = 7.2; b.value = 5
const c = dial("gain", { min: 1, max: 3, value: 2 })
window.result = [a.value, b.value, c.value]`,
    want: [8, 1, 2] },
  { what: 'a control tied to a target takes its range, unit, start and name from it, and sets it',
    source: `const set = []
const synth = { values: { cutoff: 800, on: 1, wave: 2 },
  describe: (name) => ({ cutoff: { min: 20, max: 20000, default: 1000, unit: "Hz" }, on: { kind: "bool", default: 0 }, wave: { kind: "choice", choices: "sine|saw|square", default: 0 } })[name],
  get(name) { return this.values[name] }, set(name, value) { set.push(name, value); this.values[name] = value } }
const d = dial(synth, "cutoff"), t = toggle("power", synth, "on"), s = select("wave", synth, "wave")
d.value = 5000; t.on = false; s.value = "saw"
window.result = [d.min, d.max, d.unit, d.default, d.log, d.label, t.label, s.choices, set, d.value, t.value, s.value, s.index]`,
    want: [20, 20000, 'Hz', 1000, true, 'cutoff', 'power', ['sine', 'saw', 'square'], ['cutoff', 5000, 'on', 0, 'wave', 1], 5000, false, 'saw', 1] },
  { what: 'a target with no set, get or describe is an object whose value is read and written, and a change made to it elsewhere moves the dial',
    source: `const ball = { size: 30 }
const d = dial("size", ball, "size", { min: 10, max: 90 })
const was = d.value
d.value = 50
const wrote = ball.size
ball.size = 70
await drawn()
window.result = [was, wrote, d.value]`,
    want: [30, 50, 70] },
  { what: 'a pitch is turned by ratio, and any range can be',
    source: `const d = dial("f", { min: 20, max: 20000, unit: "Hz" }), e = dial("x", { min: 1, max: 100, log: true }), f = dial("y", 0, 100)
window.result = [d.log, Math.round(d.fromPos(0.5)), Math.round(e.fromPos(0.5)), f.log, f.fromPos(0.5)]`,
    want: [true, 632, 10, false, 50] },
  { what: 'a target may spell its units in any case and say how many decimals; a dial turned by ratio shows small values to three figures',
    source: `const synth = { values: { cutoff: 440, attack: 0.01, pan: 0.5 },
  describe: (name) => ({ cutoff: { min: 20, max: 20000, unit: "hz" }, attack: { min: 0.001, max: 20, unit: "seconds", log: true }, pan: { min: -1, max: 1, digits: 1 } })[name],
  get(name) { return this.values[name] }, set(name, value) { this.values[name] = value } }
const c = dial(synth, "cutoff"), a = dial(synth, "attack"), p = dial(synth, "pan")
const text = (d) => { let said = ""; d.draw({ fillText: (t) => { said = t }, beginPath() {}, arc() {}, stroke() {}, fill() {}, moveTo() {}, lineTo() {} }, 1); return said }
const first = [c.unit, c.log, text(c), a.unit, text(a), text(p)]
a.value = 2.5; c.value = 5000
window.result = [...first, text(a), text(c)]`,
    want: ['Hz', true, '440 Hz', 's', '0.010 s', '0.5', '2.50 s', '5.00 kHz'] },
  { what: 'controls line up in rows inside the picture without overlapping, and the keyboard is along the bottom',
    source: `const made = [dial("a", 0, 1), dial("b", 0, 1), slider("c", 0, 1), slider("d", 0, 1, { vertical: true }), button("go"), toggle("t"), select("s", ["one", "two"]), meter(), scope(), dial("e", 0, 1)]
const piano = keyboard()
await drawn()
const inside = made.every((c) => c.w > 0 && c.x >= 0 && c.y >= 0 && c.x + c.w <= width && c.y + c.h <= piano.y)
let apart = true
for (const a of made) for (const b of made) if (a !== b && a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) apart = false
window.result = [inside, apart, piano.y + piano.h <= height && piano.y > height / 2, piano.w > width * 0.9, made[9].y > made[8].y, made[0].y === made[1].y]`,
    want: [true, true, true, true, true, true] },
  { what: 'row() starts a new row, { x, y } puts a control where it is told, and place() moves it',
    source: `const a = dial("a", 0, 1); row(); const b = dial("b", 0, 1), c = dial("c", 0, 1, { x: 300, y: 200 })
await drawn()
const first = [b.y > a.y, c.x, c.y]
c.place(20, 250)
await drawn()
window.result = [...first, c.x, c.y, over(25, 255), over(600, 300)]`,
    want: [true, 300, 200, 20, 250, true, false] },
  { what: 'controls that nearly fit are drawn a little smaller so that they do, and more than could fit are not made tiny: the plate they are on can be moved, above the keyboard',
    source: `const few = []
for (let i = 0; i < 40; i++) few.push(dial("d" + i, 0, 1))
const piano = keyboard()
await drawn()
const p = dials().panel
const first = [p.u < 1 && p.u >= 0.8, p.viewport, few.every((c) => c.y + c.h <= piano.y && c.y >= 0)]
for (let i = 0; i < 40; i++) few.push(dial("e" + i, 0, 1))
await drawn()
const v = p.viewport
window.result = [...first, p.u >= 0.8, !!v && v.max > 0, few.some((c) => c.y >= v.y + v.h), v.y + v.h <= piano.y]`,
    want: [true, null, true, true, true, true, true] },
  { what: 'the controls are drawn on a canvas of their own, exactly over the scene\'s, and the scene\'s is left alone',
    source: `background("rgb(0, 0, 255)")
const d = dial("a", 0, 1, 0.5)
await drawn()
const layer = canvas.nextElementSibling, a = canvas.getBoundingClientRect(), b = layer.getBoundingClientRect()
const px = (c, x, y) => [...c.getContext("2d").getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data].join()
window.result = [layer.tagName, [a.left, a.top, a.width, a.height].join() === [b.left, b.top, b.width, b.height].join(), layer.width === canvas.width,
  px(canvas, d.x + d.w / 2, d.y + d.h / 2), px(layer, d.x + d.w / 2, d.y + d.h / 2) !== "0,0,0,0", px(layer, 5, 500), getComputedStyle(layer).pointerEvents]`,
    want: ['CANVAS', true, true, '0,0,255,255', true, '0,0,0,0', 'none'] },
  { what: 'a scene that draws nothing is given a dark backdrop, and one that draws is not',
    source: `dial("a", 0, 1)
await sleep(0.2)
const layer = canvas.nextElementSibling
const px = () => [...layer.getContext("2d").getImageData(5, layer.height - 5, 1, 1).data].join()
const empty = px()
background("navy")
await sleep(0.8)
window.result = [empty, px()]`,
    want: ['16,18,22,255', '0,0,0,0'] },
  { what: 'a scope draws what it is given: a list, a function, a target with samples(), or points pushed one at a time',
    source: `const wave = Float32Array.from({ length: 256 }, (_, i) => Math.sin(i / 8))
theme({ accent: "rgb(255, 0, 0)" })
const scopes = [scope(wave, { width: 140 }), scope(() => wave, { width: 140 }), scope({ samples: () => wave }, { width: 140 }), scope({ width: 140 })]
for (let i = 0; i < 200; i++) scopes[3].push(Math.sin(i / 8) * 100)
const flat = scope([0, 0, 0, 0], { width: 140, steady: false })
await drawn()
const g = canvas.nextElementSibling.getContext("2d")
const reds = (c) => { const d = g.getImageData(c.x * pixelRatio, c.y * pixelRatio, c.w * pixelRatio, c.h * pixelRatio).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] < 90) n++; return n }
// A wave covers far more of the screen than a flat line does.
window.result = [...scopes.map((s) => reds(s) > reds(flat) * 2), reds(flat) > 20, scopes[3].value.toFixed(2)]
theme({ accent: "#ffb224" })`,
    want: [true, true, true, true, true, (Math.sin(199 / 8) * 100).toFixed(2)] },
  { what: 'a meter shows a level it is given, or asks a function or a target for it, and falls back when it stops',
    source: `let level = 1
const a = meter(), b = meter(() => level), c = meter("out", { level: () => [0.5, 0.25] })
a.value = 0.5
await drawn()
const high = [a.bars[0], b.bars[0], c.bars.join()]
level = 0
await sleep(0.4)
window.result = [...high, b.bars[0] < 0.8 && b.bars[0] > 0, b.peaks[0], c.label]`,
    want: [0.5, 1, '0.5,0.25', true, 1, 'out'] },
  { what: 'the library can be made from its text alone, as a host with no modules does (Python\'s page)',
    source: `const text = await (await fetch("/dials.js")).text()
const made = new Function(text.replace("export {", "return {"))()
const d = made.dials(canvas).dial("a", 0, 4, 3)
window.result = [Object.keys(made).length > 10, d.value, made.version]`,
    want: [true, 3, '0.0.0'] },
  { what: 'a host is told what was made from a target and the rectangle no control is on, and is called every frame only when it asks and answers',
    source: `const heard = []
const api = dials()
api.listen((e) => heard.push(e))
api.make("dial", 7, { target: { describe: () => ({ min: 2, max: 9, default: 4 }), at: 5, get() { return this.at }, set(name, value) { this.at = value } }, param: "x" })
api.make("scope", 8, {})
await drawn()
const first = JSON.stringify(heard)
heard.length = 0
api.beat()
await drawn()
const beats = heard.length
api.ack(); api.call(8, "feed", [0, 1, 0]); api.set(7, "value", 6)
await drawn()
window.result = [first, beats, heard.length, api.panel.find(7).value, api.panel.find(8).list.length]
api.drop(7); api.drop(8)`,
    want: ['[{"c":[],"n":[],"m":[7,2,9,4,"",5],"b":0,"f":[0,260,760,300]}]', 1, 2, 6, 3] },
]

// --- cases with hands. `setup` is the scene; it leaves its controls in `window.t`. `act` uses them.
const SPOT = (name, fx = 0.5, fy = 0.5) => `(() => { const c = window.t.${name}, b = document.querySelector("#s canvas").getBoundingClientRect(); return [b.left + c.x + c.w * ${fx}, b.top + c.y + c.h * ${fy}] })()`
const spot = (page, name, fx, fy) => page.evaluate(SPOT(name, fx, fy))
const read = (page, code) => page.evaluate(code)
const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
// A finger made by hand: a browser's own touch input is one finger at a time.
const finger = (page, type, id, [x, y]) => page.evaluate(({ type, id, x, y }) => {
  const target = type === 'pointerdown' || type === 'pointermove' ? document.querySelector('#s canvas') : window
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 11 }))
}, { type, id, x, y })

const SYNTH = `const log = []
const synth = { noteOn: (note, velocity) => log.push("on " + note), noteOff: (note) => log.push("off " + note), sounding: [], notes() { return this.sounding } }
`
const HANDS = [
  { what: 'dragging up on a dial turns it up, the drag carries on outside the picture, and onChange and the target hear it',
    setup: `const heard = [], box = { v: 0 }
const d = dial("a", 0, 100, 20, { onChange: (v) => heard.push(v) }), e = dial("b", box, "v", { min: 0, max: 100 })
window.t = { d, e, heard, box }`,
    async act(page) {
      let [x, y] = await spot(page, 'd')
      await page.mouse.move(x, y); await page.mouse.down()
      await page.mouse.move(x, y - 45, { steps: 3 })
      const mid = await read(page, 't.d.value')
      await page.mouse.move(x, -200, { steps: 4 }) // far above the page's top edge
      await page.mouse.up()
      const top = await read(page, 't.d.value');
      [x, y] = await spot(page, 'e')
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90, y, { steps: 3 }); await page.mouse.up()
      return [Math.round(mid), top, await read(page, 't.heard.length > 3 && t.heard.at(-1) === 100'), await read(page, 'Math.round(t.box.v)'), await read(page, 't.d.held')]
    },
    want: [45, 100, true, 50, false] },
  { what: 'Shift turns a dial a tenth as far, and so does pulling well away from it a quarter',
    setup: `window.t = { d: dial("a", 0, 100, 0), e: dial("b", 0, 100, 0) }`,
    async act(page) {
      let [x, y] = await spot(page, 'd')
      await page.keyboard.down('Shift')
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 90, { steps: 3 }); await page.mouse.up()
      await page.keyboard.up('Shift');
      [x, y] = await spot(page, 'e')
      // Out to the right first (which turns it up), then the same distance up from there.
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 180, y, { steps: 2 })
      const before = await read(page, 't.e.value')
      await read(page, 't.e.value = 0')
      await page.mouse.move(x + 180, y - 90, { steps: 3 }); await page.mouse.up()
      return [await read(page, 'Math.round(t.d.value)'), before > 50, await read(page, 'Math.round(t.e.value * 2) / 2')]
    },
    want: [5, true, 12.5] },
  { what: 'two clicks close together put a dial and a slider back where they started',
    setup: `window.t = { d: dial("a", 0, 100, 30), s: slider("b", 0, 10, 4) }
t.d.value = 80; t.s.value = 9`,
    async act(page) {
      for (const name of ['d', 's']) {
        const [x, y] = await spot(page, name, 0.5, name === 's' ? 0.2 : 0.5)
        await page.mouse.click(x, y); await page.mouse.click(x, y)
      }
      return [await read(page, 't.d.value'), await read(page, 't.s.value')]
    },
    want: [30, 4] },
  { what: 'a slider comes to a click on its track, and is dragged from its handle; an upright one runs upward',
    setup: `window.t = { s: slider("a", 0, 100, 0, { size: 200 }), v: slider("b", 0, 100, 0, { vertical: true, size: 100 }), api: dials() }`,
    async act(page) {
      const box = await read(page, '({ u: t.api.panel.u })')
      let [x, y] = await spot(page, 's', 0, 1)
      // The track starts 14 points in and is 200 long, 18 points up from the bottom.
      await page.mouse.click(x + 14 + 150, y - 18)
      const jumped = await read(page, 'Math.round(t.s.value)')
      await page.waitForTimeout(400) // or it is the second of two clicks, which puts it back
      await page.mouse.move(x + 14 + 150, y - 18); await page.mouse.down(); await page.mouse.move(x + 14 + 100, y - 18, { steps: 3 }); await page.mouse.up()
      const dragged = await read(page, 'Math.round(t.s.value)');
      [x, y] = await spot(page, 'v', 0.5, 1)
      await page.mouse.click(x, y - 30 - 80)
      return [box.u, jumped, dragged, await read(page, 'Math.round(t.v.value)')]
    },
    want: [1, 75, 50, 80] },
  { what: 'a button is pressed once for each press, a toggle turns over, and a select steps round its choices',
    setup: `const heard = []
window.t = { b: button("fire", () => heard.push("press")), g: toggle("mute", false, (on) => heard.push("mute " + on)), s: select("wave", ["sine", "saw", "square"], "saw", { onChange: (v) => heard.push(v) }), heard }`,
    async act(page) {
      let [x, y] = await spot(page, 'b')
      await page.mouse.move(x, y); await page.mouse.down()
      const held = await read(page, 't.b.held')
      await page.mouse.up()
      const pressed = await read(page, '[t.b.pressed, t.b.pressed, t.b.held]')
      await page.mouse.click(...await spot(page, 'g'))
      await page.mouse.click(...await spot(page, 's', 0.9))
      await page.mouse.click(...await spot(page, 's', 0.9))
      await page.mouse.click(...await spot(page, 's', 0.1))
      return [held, pressed, await read(page, 't.g.on'), await read(page, 't.s.value'), await read(page, 't.heard')]
    },
    want: [true, [true, false, false], true, 'square', ['press', 'mute true', 'square', 'sine', 'square']] },
  { what: 'a piano key plays its note while it is held, sliding along plays each key, and the black keys are found',
    setup: SYNTH + `window.t = { k: keyboard(synth, { octave: 4, octaves: 1 }), log }`,
    async act(page) {
      // Eight white keys from C4 to C5: the first is C (60), and the black key over the first join is C sharp (61).
      const white = (i) => spot(page, 'k', (i + 0.5) / 8, 0.9)
      await page.mouse.move(...await white(0)); await page.mouse.down()
      const held = await read(page, 't.k.notes')
      await page.mouse.move(...await white(1), { steps: 2 }); await page.mouse.move(...await white(2), { steps: 2 })
      await page.mouse.up()
      await page.mouse.click(...await spot(page, 'k', 1 / 8, 0.4))
      await page.mouse.click(...await white(7))
      return [held, await read(page, 't.log'), await read(page, 't.k.notes')]
    },
    want: [[60], ['on 60', 'on 62', 'off 60', 'on 64', 'off 62', 'off 64', 'on 61', 'off 61', 'on 72', 'off 72'], []] },
  { what: 'the computer\'s keys play it by where they are, Z and X step the octave, and a held key does not repeat',
    setup: SYNTH + `window.t = { k: keyboard(synth, { octave: 4 }), log }`,
    async act(page) {
      await page.locator('#s canvas[tabindex]').focus()
      await page.keyboard.down('KeyA'); await page.keyboard.down('KeyA'); await page.keyboard.down('KeyW'); await page.keyboard.down('KeyK')
      const held = await read(page, 't.k.notes')
      await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyK')
      await page.keyboard.press('KeyX'); await page.keyboard.press('KeyS'); await page.keyboard.press('KeyZ'); await page.keyboard.press('KeyZ'); await page.keyboard.press('KeyS')
      return [held, await read(page, 't.log'), await read(page, 't.k.octave')]
    },
    want: [[60, 61, 72], ['on 60', 'on 61', 'on 72', 'off 60', 'off 61', 'off 72', 'on 74', 'off 74', 'on 50', 'off 50'], 3] },
  { what: 'several fingers hold several keys at once, each sliding and lifting on its own, while another finger turns a dial',
    setup: SYNTH + `window.t = { d: dial("a", 0, 100, 0), k: keyboard(synth, { octave: 4, octaves: 1 }), log }`,
    async act(page) {
      const white = (i) => spot(page, 'k', (i + 0.5) / 8, 0.9)
      await finger(page, 'pointerdown', 11, await white(0))
      await finger(page, 'pointerdown', 12, await white(2))
      await finger(page, 'pointerdown', 13, await white(4))
      const chord = await read(page, 't.k.notes')
      const [x, y] = await spot(page, 'd')
      await finger(page, 'pointerdown', 14, [x, y]); await finger(page, 'pointermove', 14, [x, y - 90])
      await finger(page, 'pointermove', 12, await white(3))
      await finger(page, 'pointerup', 11, await white(0))
      const after = await read(page, 't.k.notes')
      await finger(page, 'pointercancel', 12, await white(3)); await finger(page, 'pointerup', 13, await white(4)); await finger(page, 'pointerup', 14, [x, y - 90])
      return [chord, after, await read(page, 'Math.round(t.d.value)'), await read(page, 't.k.notes'), await read(page, 't.log.length')]
    },
    want: [[60, 64, 67], [65, 67], 50, [], 8] },
  { what: 'held keys are lit, notes the target says are sounding are lit another colour, and the strip above the keys steps the octave',
    setup: SYNTH + `window.t = { k: keyboard(synth, { octave: 4, octaves: 1 }), synth, log }`,
    async act(page) {
      const colour = (i) => page.evaluate(([x, y]) => {
        const scene = document.querySelector('#s canvas'), layer = scene.nextElementSibling, b = scene.getBoundingClientRect(), r = layer.width / b.width
        return [...layer.getContext('2d').getImageData((x - b.left) * r, (y - b.top) * r, 1, 1).data].slice(0, 3).join()
      }, [i[0], i[1] - 30])
      const c = await spot(page, 'k', 0.5 / 8, 0.9), e = await spot(page, 'k', 2.5 / 8, 0.9)
      const plain = await colour(c)
      await page.mouse.move(...c); await page.mouse.down(); await settle(page)
      const lit = await colour(c)
      await page.mouse.up()
      await read(page, 't.synth.sounding = [64]'); await settle(page)
      const sounding = await colour(e)
      await page.mouse.click(...await spot(page, 'k', 0.98, 0.05))
      await page.mouse.click(...await spot(page, 'k', 0.98, 0.05))
      await page.mouse.click(...await spot(page, 'k', 0.02, 0.05))
      return [plain, lit, sounding, await read(page, 't.k.octave')]
    },
    want: ['244,241,234', '255,178,36', '143,211,255', 5] },
  { what: 'when the scene is run again its controls go with it, and its notes are let go',
    setup: SYNTH + `window.t = { k: keyboard(synth), log }
window.count = () => document.querySelectorAll("#s canvas").length`,
    async act(page) {
      await page.mouse.move(...await spot(page, 'k', 0.3, 0.9)); await page.mouse.down()
      const before = await read(page, '[count(), t.log.length]')
      const log = await page.evaluateHandle('t.log')
      await page.evaluate(() => window.scene.stop()); await settle(page)
      await page.mouse.up()
      return [before, await read(page, 'count()'), await log.evaluate((l) => l.length)]
    },
    want: [[2, 1], 1, 2] },
]

// Nothing reaches the speakers: Chromium is launched muted, and in every page (WebKit has no such switch)
// what a sound would be sent to is a gain of nothing in front of the real output.
const SILENT = () => {
  for (const Kind of [window.AudioContext, window.webkitAudioContext]) {
    if (!Kind) continue
    const real = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'destination').get
    const quiet = new WeakMap()
    Object.defineProperty(Kind.prototype, 'destination', { configurable: true, get() {
      if (!quiet.has(this)) { const gain = this.createGain(); gain.gain.value = 0; gain.connect(real.call(this)); quiet.set(this, gain) }
      return quiet.get(this)
    } })
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
let failed = 0
const check = (browser, what, got, want) => {
  const ok = same(got, want)
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${browser}: ${what}`)
  if (!ok) console.log(`       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`)
}

const examples = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js') && !['dials.js', 'standin-synth.js'].includes(f)).sort()
if (SHOTS) await mkdir(join(ROOT, 'shots'), { recursive: true })

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await playwright[name].launch(name === 'chromium' ? { args: ['--mute-audio'] } : {}) } catch (e) { console.log(`     ${name}: not installed, skipped`); continue }
  const context = await browser.newContext({ viewport: { width: 900, height: 700 } })
  await context.addInitScript(SILENT)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${at}/test.html`)
  for (const c of CASES) check(name, c.what, await play(page, TOP + c.source), c.want)
  for (const c of HANDS) {
    const began = await play(page, TOP + c.setup + '\nawait drawn()\nwindow.result = "ready"')
    let got = began
    if (began === 'ready') { try { got = await c.act(page) } catch (e) { got = { error: String(e) } } }
    await page.mouse.up()
    check(name, c.what, got, c.want)
  }
  check(name, 'no case left an error on the page', errors, [])

  // Every example, as `pictures run` shows it: filling the page.
  await page.goto(`${at}/full.html`)
  for (const file of examples) {
    errors.length = 0
    const source = await readFile(join(ROOT, 'examples', file), 'utf8')
    const got = await page.evaluate(async ({ source, file }) => {
      const { runScene } = await import('/pictures/pictures.js')
      window.scene?.stop()
  document.getElementById('s').replaceChildren()
      let error = null
      window.scene = runScene(document.getElementById('s'), { source, name: file, base: '/examples/', keyboard: true, onError: (message, line) => { error = `${message} (line ${line})` } })
      await new Promise((done) => setTimeout(done, 700))
      const layer = document.querySelector('#s canvas').nextElementSibling
      // How much of the controls' canvas is painted: an example has something to show.
      let painted = 0
      if (layer) { const d = layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) painted++ }
      return { error, painted: painted > 2000 }
    }, { source, file })
    check(name, `examples/${file} runs and shows its controls`, [got, errors], [{ error: null, painted: true }, []])
    if (/keyboard\(/.test(source)) {
      // Play a chord on the computer's keys: the example's synth sounds, and nothing breaks.
      await page.locator('#s canvas[tabindex]').focus()
      for (const key of ['KeyA', 'KeyD', 'KeyG']) await page.keyboard.down(key)
      await page.waitForTimeout(250)
      if (SHOTS) await page.screenshot({ path: join(ROOT, 'shots', `${name}-${file.replace('.js', '')}.png`) })
      for (const key of ['KeyA', 'KeyD', 'KeyG']) await page.keyboard.up(key)
      check(name, `examples/${file} is played from the computer's keys`, errors, [])
    } else if (SHOTS) await page.screenshot({ path: join(ROOT, 'shots', `${name}-${file.replace('.js', '')}.png`) })
  }

  // A touch screen the size of a tablet: the controls are made bigger for fingers, and a real tap plays a key and flips a switch.
  if (name === 'chromium') {
    const tablet = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true })
    await tablet.addInitScript(SILENT)
    const touch = await tablet.newPage()
    await touch.goto(`${at}/full.html`)
    const began = await play(touch, TOP + `const log = []
window.t = { g: toggle("mute"), k: keyboard({ octave: 4, octaves: 2, onNoteOn: (note) => log.push(note) }), log, api: dials() }
await drawn()
window.result = "ready"`)
    let got = began
    if (began === 'ready') {
      await touch.touchscreen.tap(...await spot(touch, 'k', 0.5 / 15, 0.9))
      await touch.touchscreen.tap(...await spot(touch, 'g'))
      got = await read(touch, '[t.api.panel.coarse, t.api.panel.u, t.log, t.k.notes, t.g.on, t.k.h > 150, getComputedStyle(document.querySelector("#s canvas")).touchAction]')
    }
    check(name, 'on a touch screen the controls are bigger, and a tap plays a key and flips a switch', got, [true, 1.15, [60], [], true, true, 'none'])
    await tablet.close()
  }
  await browser.close()
}
server.close()
console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
