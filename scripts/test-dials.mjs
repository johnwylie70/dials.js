#!/usr/bin/env node
/**
 * The controls in real browsers, on pictures.js scenes. Small scenes leave what they found in
 * `result` for the test to compare; then controls are turned, pressed and played with a real
 * mouse, the keyboard and several fingers at once; then every example is run for a moment.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-dials.mjs
 *
 * pictures.js is taken from the folder beside this repository (or PICTURES=/path/to/pictures.js).
 * Then the layout: scenes are laid out at four sizes of screen (a phone upright, a tablet's split view,
 * a tablet on its side, a desktop window) and every control and plate is measured where it was put.
 *
 * Chromium, and WebKit when Playwright has it. `--shots` also saves a picture of each example in
 * shots/, and of each layout scene at each size. It ends with code 1 if a case fails. No sound is made.
 */
import { createServer } from 'node:http'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { MORE, MORE_CASES, MORE_HANDS, MORE_KINDS, MORE_LAID, MORE_TOUCHED, SPILL, shutIn } from './widget-cases.mjs'

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
  // A page that shuts the scene's page in a frame which may run scripts and nothing else, as a preview does.
  if (path === '/framed.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0;overflow:hidden"><iframe sandbox="allow-scripts" src="/full.html" style="position:absolute;left:40px;top:30px;width:700px;height:500px;border:0"></iframe>')
  let body
  // pictures.js itself, and what it loads, come from its own repository; everything else from this one.
  const file = path.startsWith('/pictures/') ? join(PICTURES, path.slice(10)) : join(ROOT, path)
  try { body = await readFile(file) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'access-control-allow-origin': '*' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// Every scene starts with these: the library, and a way to wait for the controls to be laid out and drawn.
const TOP = `const lib = await use("/dials.js")
const { dial, slider, button, toggle, select, rotary, keyboard, scope, meter, label, group, row, column, grid, page, spacer, wrap, layout, room, over, dials, theme } = lib
const drawn = async () => { await frame(); await frame(); await frame() }
` + MORE
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
  { what: 'a canvas another library laid over the scene (an effects layer, a scene transition) is not taken for a second scene, and a plain one is',
    source: `for (const name of ["effectsLayer", "sceneTransition"]) { const c = document.createElement("canvas"); c.dataset[name] = ""; canvas.after(c) }
const d = dial("a", 0, 1, 0.5)
await drawn()
const plain = document.createElement("canvas")
canvas.after(plain)
let said = "no complaint"
try { dial("b", 0, 1) } catch (e) { said = e.message.slice(0, 30) }
plain.remove()
window.result = [d.value, said]`,
    want: [0.5, 'There is more than one canvas '] },
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
  { what: 'a rotary takes its choices from a target as a select does, sets it, and a select can be drawn as one',
    source: `const set = []
const synth = { values: { wave: 2 }, describe: () => ({ kind: "choice", choices: "sine|saw|square|noise", default: 0 }), get(name) { return this.values[name] }, set(name, value) { set.push(name, value); this.values[name] = value } }
const r = rotary("wave", synth, "wave"), plain = rotary("mode", ["room", "hall", "plate", "spring"], "hall"), other = select("kind", ["a", "b"], { style: "rotary" })
const first = [r.choices, r.value, r.index, plain.value, plain.index, r.kind, other.kind]
r.value = "noise"; plain.index = 3
synth.values.wave = 1
await drawn()
window.result = [...first, set, r.value, plain.value]`,
    want: [['sine', 'saw', 'square', 'noise'], 'square', 2, 'hall', 1, 'rotary', 'rotary', ['wave', 3], 'saw', 'spring'] },
  { what: 'a rotary names its choices round the knob where there is room: none on a small one, more of each on a large one, and with too many only the one it is on',
    source: `const long = ["cathedral hall", "small bright room", "vintage spring tank", "shimmering plate"]
const small = rotary("a", long, { size: "small" }), usual = rotary("b", long), large = rotary("c", long, { size: "large" }), many = rotary("d", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]), three = rotary("e", ["sine", "saw", "noise"], { size: "large" })
await drawn()
const under = (c) => { let said = ""; const g = dials().panel.g, was = g.fillText; g.fillText = function (t, ...rest) { said = t; return was.call(this, t, ...rest) }; c.draw(g, c.u); g.fillText = was; return said }
window.result = [small.names.length, usual.names.length, usual.names.every((n) => !n.whole), large.names.every((n) => n.w > usual.names[n.i].w), large.w > usual.w && usual.w > small.w, many.names.length, three.names.every((n) => n.whole), under(small), under(many), [small, usual, large, many, three].every((c) => c.x >= 0 && c.x + c.w <= width)]`,
    want: [0, 4, true, true, true, 0, true, 'cathedral hall', '1', true] },
  { what: 'a rotary with its names round it does not name its choice a second time underneath (a small one, with none round it, does), showValue says otherwise either way, and its title and its knob are on a line with the dials beside it',
    source: `const three = rotary("e", ["sine", "saw", "noise"], "saw"), small = rotary("a", ["sine", "saw", "noise"], "saw", { size: "small" }), beside = dial("d", 0, 1)
const both = rotary("b", ["sine", "saw", "noise"], "saw", { showValue: true }), none = rotary("n", ["sine", "saw", "noise"], "saw", { size: "small", showValue: false })
await drawn()
const count = (c) => { const said = []; const g = dials().panel.g, was = g.fillText; g.fillText = function (t, ...rest) { said.push(t); return was.call(this, t, ...rest) }; c.draw(g, c.u); g.fillText = was; return said.filter((t) => t === "saw").length }
const middle = beside.y + 20 * beside.u + (beside.h - 40 * beside.u) / 2
const alone = rotary("x", ["sine", "saw", "noise"], { x: 500, y: 300 }), read = rotary("y", ["sine", "saw", "noise"], { x: 600, y: 300, showValue: true })
await drawn()
window.result = [count(three), count(small), count(both), count(none), three.names.find((n) => n.i === 1).whole, beside.y === three.y && beside.h === three.h, Math.abs(three.centre(three.u)[1] - middle) < 0.01,
  three.names.find((n) => n.i === 1).y - 5 * three.u >= three.y + 18 * three.u, alone.h < read.h, alone.h]`,
    want: [1, 1, 2, 0, true, true, true, true, true, 114] },
  { what: 'a target that says a setting has changed is asked about it again: a select keeps its choice while it is still there, a dial takes the new range, and a control that is gone is no longer told',
    source: `const heard = new Set()
const input = { names: ["all", "1", "2"], on: "2", low: 0, high: 10, at: 4,
  describe(name) { return name === "device" ? { kind: "text", choices: this.names } : { min: this.low, max: this.high } },
  get(name) { return name === "device" ? this.on : this.at }, set(name, value) { if (name === "device") this.on = value; else this.at = value },
  onChange(fn) { heard.add(fn); return () => heard.delete(fn) }, say(name) { for (const fn of [...heard]) fn(name) } }
const device = select("midi in", input, "device"), knob = rotary("also", input, "device"), level = dial("level", input, "level"), gone = dial("gone", input, "level")
await drawn()
const first = [device.choices, device.value, heard.size, device.w]
gone.remove()
input.names = ["all", "1", "2", "A very long keyboard name"]; input.say("device")
await drawn()
const grown = [device.choices.length, device.value, knob.choices.length, knob.value, device.w > first[3], level.max, heard.size]
input.names = ["all", "1"]; input.on = "all"; input.low = 2; input.high = 3; input.say()
await drawn()
window.result = [...first.slice(0, 3), ...grown, device.choices, device.value, device.index, knob.value, level.min, level.max, level.value, input.on]`,
    want: [['all', '1', '2'], '2', 4, 4, '2', 4, '2', true, 10, 3, ['all', '1'], 'all', 0, 'all', 2, 3, 3, 'all'] },
  { what: 'a dial turned by ratio from 0 has 0 at its bottom, and a value the target has a name for is shown by its name',
    source: `const verb = { values: { decay: 0, size: 0.5 },
  describe: (name) => ({ decay: { min: 0, max: 20, unit: "s", log: true, labels: { 0: "auto" } }, size: { min: 0, max: 1, labels: { 1: "huge" } } })[name],
  get(name) { return this.values[name] }, set(name, value) { this.values[name] = value } }
const d = dial("decay", verb, "decay"), z = dial("size", verb, "size"), own = dial("x", { min: 0, max: 10, log: true, logFrom: 0.1, format: (v) => (v ? v.toFixed(1) + "!" : "off") })
const text = (c) => { let said = ""; c.draw({ fillText: (t) => { said = t }, beginPath() {}, arc() {}, stroke() {}, fill() {}, moveTo() {}, lineTo() {} }, 1); return said }
const first = [d.value, d.pos, text(d), d.log, d.from, text(z), text(own)]
d.slide(0.02); const still = d.value
d.slide(0.04); const least = d.value
d.slide(1); const most = d.value
d.slide(0.52); const mid = d.value
z.value = 1; own.slide(1)
window.result = [...first, still, least, most, Math.round(mid * 100) / 100, text(d), verb.values.decay === d.value, d.toPos(0.02) === 1, text(z), text(own)]`,
    want: [0, 0, 'auto', true, 0.02, '0.50', 'off', 0, 0.02, 20, 0.63, '0.632 s', true, false, 'huge', '10.0!'] },
  { what: 'a select and a rotary follow a choice changed in code, whether the target reads it back by its place, by its name (in any case, or by another it answers to) or as true and false, and say nothing back; a dial and a slider follow a number as before',
    source: `const sets = []
const make = (read) => ({ wave: 2, on: 1, cutoff: 500,
  describe: (name) => ({ wave: { kind: "choice", choices: "sine|triangle|saw|square", aliases: { sawtooth: "saw" } }, on: { kind: "choice", choices: "off|on" }, cutoff: { min: 20, max: 2000 } })[name],
  get(name) { return name === "wave" ? read(this.wave) : name === "on" ? (read === byName ? !!this.on : this.on) : this.cutoff }, set(name, value) { sets.push(name); this[name] = value } })
const byName = (i) => ["sine", "triangle", "saw", "square"][i], byPlace = (i) => i
const named = make(byName), placed = make(byPlace), heard = []
const all = [select("a", named, "wave", { onChange: (v) => heard.push(v) }), rotary("b", named, "wave", { onChange: (v) => heard.push(v) }), select("c", placed, "wave"), rotary("d", placed, "wave")]
const flags = [select("e", named, "on"), rotary("f", placed, "on")], knob = dial("g", named, "cutoff"), bar = slider("h", placed, "cutoff")
await drawn()
const first = [all.map((c) => c.value).join(), flags.map((c) => c.value).join()]
named.wave = 0; placed.wave = 3; named.on = 0; placed.on = 0; named.cutoff = 900; placed.cutoff = 40
await drawn()
const second = [all.map((c) => c.value).join(), all.map((c) => c.index).join(), flags.map((c) => c.value).join(), knob.value, bar.value]
named.get = (name) => (name === "wave" ? "SAWTOOTH" : name === "on" ? true : 900)
await drawn()
window.result = [...first, ...second, all[0].value, all[1].index, flags[0].value, sets, heard]`,
    want: ['saw,saw,saw,saw', 'on,on', 'sine,sine,square,square', '0,0,3,3', 'off,off', 900, 40, 'saw', 2, 'on', [], []] },
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
    want: ['[{"c":[],"n":[],"m":[7,2,9,4,"",5],"b":0,"f":[0,260,760,300,760,560,1]}]', 1, 2, 6, 3] },
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
  { what: 'a rotary holds at each notch until the finger has gone most of the way to the next, then clicks over, and stops at its ends',
    setup: `const heard = []
window.t = { r: rotary("mode", ["room", "hall", "plate", "spring"], "hall", { onChange: (v) => heard.push(v) }), heard }`,
    async act(page) {
      const [x, y] = await spot(page, 'r')
      const u = await read(page, 't.r.u')
      await page.mouse.move(x, y); await page.mouse.down()
      await page.mouse.move(x, y - 30 * u, { steps: 3 })           // a notch is 60 points here: half way is not enough
      const held = await read(page, '[t.r.value, t.r.lean > 0]')
      await page.mouse.move(x, y - 40 * u, { steps: 2 })
      const clicked = await read(page, 't.r.value')
      await page.mouse.move(x, y - 100 * u, { steps: 4 })
      const again = await read(page, 't.r.value')
      await page.mouse.move(x, y - 400 * u, { steps: 4 })
      await page.mouse.move(x, y - 400 * u + 70 * u, { steps: 4 })   // and back down one
      await page.mouse.up()
      return [held, clicked, again, await read(page, '[t.r.value, t.r.index, t.r.lean, t.heard]')]
    },
    want: [['hall', true], 'plate', 'spring', ['plate', 2, 0, ['plate', 'spring', 'plate']]] },
  { what: 'a tap on a rotary\'s name or notch goes straight there, and two taps on the knob put it back where it started',
    setup: `window.t = { r: rotary("mode", ["room", "hall", "plate", "spring"], "hall", { size: "large" }) }`,
    async act(page) {
      const at = (code) => page.evaluate(`(() => { const r = window.t.r, b = document.querySelector("#s canvas").getBoundingClientRect(), [x, y] = ${code}; return [b.left + x, b.top + y] })()`)
      await page.mouse.click(...await at('[r.names[3].x + r.names[3].w / 2, r.names[3].y]'))
      const named = await read(page, 't.r.value')
      await page.waitForTimeout(400)
      await page.mouse.click(...await at('(() => { const [cx, cy] = r.centre(r.u), a = r.angle(0), far = r.knob * r.u / 2; return [cx + Math.cos(a) * far, cy + Math.sin(a) * far] })()'))
      const notched = await read(page, 't.r.value')
      await page.waitForTimeout(400)
      const middle = await at('r.centre(r.u)')
      await page.mouse.click(...middle)
      const still = await read(page, 't.r.value')
      await page.mouse.click(...middle)
      return [named, notched, still, await read(page, 't.r.value')]
    },
    want: ['spring', 'room', 'room', 'hall'] },
  { what: 'the keys slide to a new octave: part way for some frames, then exactly there; and a key pressed part way plays the note under the finger',
    setup: SYNTH + `window.t = { k: keyboard(synth, { octave: 4, octaves: 2 }), log }`,
    async act(page) {
      await page.mouse.click(...await spot(page, 'k', 0.98, 0.05))
      const seen = await page.evaluate(() => new Promise((done) => {
        const k = window.t.k, each = k.w / 15, seen = [], began = performance.now()
        const look = () => { seen.push(k.offset / each); performance.now() - began < 500 ? requestAnimationFrame(look) : done(seen) }
        look()
      }))
      const part = seen.filter((v) => v > 0.05 && v < 6.95).length
      // Again, and this time a finger lands on the keys while they are still moving.
      await page.mouse.click(...await spot(page, 'k', 0.02, 0.05))
      await page.waitForTimeout(60)
      const [x, y] = await spot(page, 'k', 0.4, 0.9)
      const played = await page.evaluate(([x, y]) => {
        const k = window.t.k, scene = document.querySelector('#s canvas'), b = scene.getBoundingClientRect(), each = k.w / 15, off = k.offset
        const key = (across) => { const i = Math.floor(across / each); return 12 * (k.octave + 1) + 12 * Math.floor(i / 7) + [0, 2, 4, 5, 7, 9, 11][((i % 7) + 7) % 7] }
        scene.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 51, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }))
        const got = [...k.notes]
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 51, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }))
        return [off !== 0, got[0] === key(x - b.left - k.x - off), key(x - b.left - k.x - off) !== key(x - b.left - k.x), k.notes.length]
      }, [x, y])
      await page.waitForTimeout(350)
      return [seen[0] > 6, part >= 3, seen.at(-1), seen.every((v, i) => !i || v <= seen[i - 1] + 1e-9), played, await read(page, '[t.k.octave, t.k.offset]')]
    },
    want: [true, true, 0, true, [true, true, true, 0], [4, 0]] },
  { what: 'Z and X slide the keys too, a note held when the octave changes is let go once and cleanly, a held arrow steps again and again, and animate: false jumps',
    setup: SYNTH + `window.t = { k: keyboard(synth, { octave: 4, octaves: 1 }), still: keyboard({ octave: 4, octaves: 1, animate: false, keys: false, height: 60 }), log }`,
    async act(page) {
      await page.locator('#s canvas[tabindex]').focus()
      await page.mouse.move(...await spot(page, 'k', 0.5 / 8, 0.9)); await page.mouse.down()
      await page.keyboard.press('KeyX')
      const after = await read(page, '[t.k.octave, t.k.offset !== 0, t.k.notes, t.log]')
      await page.mouse.up()
      await page.waitForTimeout(300)
      await page.mouse.click(...await spot(page, 'still', 0.98, 0.05))
      const jumped = await read(page, '[t.still.octave, t.still.offset]')
      await page.mouse.move(...await spot(page, 'k', 0.02, 0.05)); await page.mouse.down()
      await page.waitForTimeout(1050)
      await page.mouse.up()
      const stepped = await read(page, 't.k.octave')
      await page.waitForTimeout(300)
      return [after, jumped, stepped <= 2 && stepped >= 1, await read(page, '[t.k.offset, t.log.length]')]
    },
    want: [[5, true, [], ['on 60', 'off 60']], [5, 0], true, [0, 2]] },
  { what: 'a finger on the strip above the keys drags them sideways, and they settle on a whole octave',
    setup: SYNTH + `window.t = { k: keyboard(synth, { octave: 4, octaves: 2 }), log }`,
    async act(page) {
      const [x, y] = await spot(page, 'k', 0.5, 0.05)
      const octave = await read(page, 't.k.w / 15 * 7')
      await finger(page, 'pointerdown', 61, [x, y]); await finger(page, 'pointermove', 61, [x + octave * 0.3, y]); await finger(page, 'pointermove', 61, [x + octave * 0.7, y])
      const dragging = await read(page, `[Math.round(t.k.offset - ${octave * 0.7}), t.k.octave]`)
      await finger(page, 'pointerup', 61, [x + octave * 0.7, y])
      const let_go = await read(page, `[t.k.octave, Math.abs(t.k.offset + ${octave * 0.3}) < 3]`)
      await page.waitForTimeout(350)
      return [dragging, let_go, await read(page, '[t.k.octave, t.k.offset, t.log.length]')]
    },
    want: [[0, 4], [3, true], [3, 0, 0]] },
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

// The controls of the second part: their cases are kept in a file of their own, and run with the rest.
CASES.push(...MORE_CASES)
HANDS.push(...MORE_HANDS)

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
let failed = 0
const check = (browser, what, got, want) => {
  const ok = same(got, want)
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${browser}: ${what}`)
  if (!ok) console.log(`       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`)
}


// --------------------------------------------------------------------------------------------
// LAYOUT, measured. Each scene is laid out at four sizes of screen and looked at as it was drawn.
const SIZES = {
  small: { width: 320, height: 640, touch: true },
  phone: { width: 390, height: 844, touch: true },
  land: { width: 844, height: 390, touch: true },
  split: { width: 560, height: 1100, touch: true },
  tablet: { width: 1180, height: 820, touch: true },
  full: { width: 1200, height: 1600, touch: true },
  desktop: { width: 1440, height: 900, touch: false },
}
/** A finger's target is never smaller than this, in points, on a screen that is touched. */
const TOUCH_LEAST = 44
// The lines of a wrapped group are balanced when none is shorter than the longest by more than the widest thing in the group.

// A synth with the settings of the scene in the owner's picture, that makes no sound.
const LEAD = `const P = { wave: { kind: "choice", choices: "sine|triangle|saw|pulse", default: 3 }, width: { min: 0, max: 1, default: 0.5 }, "lfo2.pulse_width": { min: 0, max: 1, default: 0 },
  "lfo2.rate": { min: 0.01, max: 20, default: 0.5, unit: "Hz", digits: 3 }, sub: { min: 0, max: 1, default: 0.5 }, voices: { min: 1, max: 8, default: 1, kind: "int" }, detune: { min: 0, max: 100, default: 20, unit: "ct", digits: 0 },
  spread: { min: 0, max: 1, default: 0.5 }, filter: { kind: "choice", choices: "lowpass|highpass|bandpass", default: 0 }, cutoff: { min: 20, max: 20000, default: 2800, unit: "Hz" }, resonance: { min: 0, max: 1, default: 0.25 },
  attack: { min: 0.001, max: 5, default: 0.01, unit: "s", digits: 3 }, decay: { min: 0.001, max: 5, default: 0.15, unit: "s", digits: 3 }, sustain: { min: 0, max: 1, default: 0.7 }, release: { min: 0.001, max: 5, default: 0.2, unit: "s", digits: 3 },
  echo: { min: 0, max: 1, default: 0.2 }, "delay.time": { min: 0.01, max: 2, default: 0.3, unit: "s" }, "delay.feedback": { min: 0, max: 0.95, default: 0.4 }, reverb: { min: 0, max: 1, default: 0.98 }, "reverb.size": { min: 0, max: 1, default: 0.6 }, chorus: { min: 0, max: 1, default: 0.81 } }
const values = {}; for (const n in P) values[n] = P[n].default
const lead = { describe: (n) => P[n], get: (n) => values[n], set: (n, v) => { values[n] = v }, noteOn() {}, noteOff() {}, samples: () => Float32Array.from({ length: 256 }, (_, i) => Math.sin(i / 12) * 0.6) }
`
// The scene in the owner's picture, line for line: labels, controls and row() only.
const OWNER = `label("oscillator")
select("wave", lead, "wave")
dial("width", lead, "width")
dial("pwm", lead, "lfo2.pulse_width")
dial("pwm speed", lead, "lfo2.rate")
dial("sub", lead, "sub")

row()
label("unison")
dial("voices", lead, "voices")
dial("detune", lead, "detune")
dial("spread", lead, "spread")
label("filter")
select("filter", lead, "filter")
dial("cutoff", lead, "cutoff")
dial("resonance", lead, "resonance")

row()
label("shape")
slider("attack", lead, "attack")
slider("decay", lead, "decay")
slider("sustain", lead, "sustain")
slider("release", lead, "release")

row()
label("delay")
dial("delay", lead, "echo")
dial("time", lead, "delay.time")
dial("feedback", lead, "delay.feedback")
label("reverb")
dial("reverb", lead, "reverb")
dial("size", lead, "reverb.size")
dial("chorus", lead, "chorus")
scope(lead)

keyboard(lead, { octave: 3, octaves: 2 })
`
// The same panel as the owner wrote it the second time: seven short rows, a row() after each, so that nothing would wrap in a narrow view.
const OWNER_ROWS = `label("oscillator"); select("wave", lead, "wave"); dial("width", lead, "width"); dial("sub", lead, "sub")
row()
label("pwm"); dial("amount", lead, "lfo2.pulse_width"); dial("speed", lead, "lfo2.rate")
row()
label("unison"); dial("voices", lead, "voices"); dial("detune", lead, "detune"); dial("spread", lead, "spread")
row()
label("filter"); select("filter", lead, "filter"); dial("cutoff", lead, "cutoff"); dial("resonance", lead, "resonance")
row()
label("shape"); dial("attack", lead, "attack"); dial("decay", lead, "decay"); dial("sustain", lead, "sustain"); dial("release", lead, "release")
row()
label("delay"); dial("amount", lead, "echo"); dial("time", lead, "delay.time"); dial("feedback", lead, "delay.feedback")
row()
label("reverb"); dial("amount", lead, "reverb"); dial("size", lead, "reverb.size"); dial("chorus", lead, "chorus")
scope(lead)
keyboard(lead, { octave: 3, octaves: 2 })
`
/** A panel is set against the picture's edges: no more of the width than this is left at either side of its lines of plates. */
const MARGIN_MOST = 0.03
const LAID = {
  six: `dial("speed", 0, 10, 4); dial("size", 5, 50, 20); dial("spin", 0, 1, 0.3); dial("red", 0, 255, 200); dial("green", 0, 255, 120); dial("blue", 0, 255, 40)
function draw() { background("midnightblue"); circle(width / 2, height / 2, 60, "gold") }`,
  owner: LEAD + OWNER,
  rows: LEAD + OWNER_ROWS,
  // Groups made with functions and in a straight line, one inside another, a column, a grid, sizes, a share and a spacer.
  groups: LEAD + `group("oscillator", () => { select("wave", lead, "wave"); dial("width", lead, "width"); dial("sub", lead, "sub") })
group("unison", 3, () => { dial("voices", lead, "voices"); dial("detune", lead, "detune"); dial("spread", lead, "spread") })
group("filter", { colour: "deepskyblue" }, () => {
  column(() => { select("filter", lead, "filter"); toggle("drive") })
  grid(2, () => { dial("cutoff", lead, "cutoff", { size: "large", span: 2 }); dial("resonance", lead, "resonance", { size: "small" }); dial("chorus", lead, "chorus", { size: "small" }) })
})
group("shape")
slider("attack", lead, "attack"); slider("decay", lead, "decay"); slider("sustain", lead, "sustain"); slider("release", lead, "release")
group("delay")
dial("delay", lead, "echo"); dial("time", lead, "delay.time"); dial("feedback", lead, "delay.feedback")
group("output", () => { scope(lead, { share: 1 }); meter(lead); spacer(8); button("panic") })
keyboard(lead, { octave: 3, octaves: 2 })`,
  pages: LEAD + `page("osc")
group("oscillator"); select("wave", lead, "wave"); dial("width", lead, "width"); dial("sub", lead, "sub")
group("unison"); dial("voices", lead, "voices"); dial("detune", lead, "detune"); dial("spread", lead, "spread")
page("fx", () => {
  group("delay", () => { dial("delay", lead, "echo"); dial("time", lead, "delay.time"); dial("feedback", lead, "delay.feedback") })
  group("reverb", () => { dial("reverb", lead, "reverb"); dial("size", lead, "reverb.size") })
})
page()
scope(lead)
keyboard(lead, { octave: 3, octaves: 2 })`,
  game: `group("moves", { at: "left" }, () => { dial("speed", 0, 10, 4); dial("spin", 0, 1, 0.3); button("jump"); spacer(); toggle("trail") })
group({ at: "bottom" }, () => { button("left"); button("right"); spacer(); button("fire", { size: "large" }) })
function draw() { background("#16324f"); const r = room(); rect(r.x, r.y, r.width, r.height, "#1f5f8b") }
window.said = () => room()`,
}

// What the page has: every control, plate and group where it was put (and, where plates can be moved, the part that is seen).
const SURVEY = `(() => {
  const p = document.querySelector("#s canvas")[Symbol.for("dials.panel")]
  const seen = (c, clip) => { const v = clip === undefined ? c.view : clip; if (!v) return [c.x, c.y, c.w, c.h]; const t = Math.max(c.y, v.y), b = Math.min(c.y + c.h, v.y + v.h), l = Math.max(c.x, v.x), r = Math.min(c.x + c.w, v.x + v.w); return b > t && r > l ? [l, t, r - l, b - t] : null }
  const shown = (c) => !c.items && !c.ghost && !c.hidden && c.w > 0
  const controls = p.items.filter(shown).map((c) => ({ id: c.id, kind: c.kind, label: c.label, heading: !!c.heading, placed: !!c.at, at: seen(c), whole: [c.x, c.y, c.w, c.h],
    felt: p.under(c.x + c.w / 2, c.y + c.h / 2) === c, middleSeen: !c.view || (c.y + c.h / 2 >= c.view.y && c.y + c.h / 2 < c.view.y + c.view.h && c.x + c.w / 2 >= c.view.x && c.x + c.w / 2 < c.view.x + c.view.w) }))
  const inside = (box) => box.items.flatMap((kid) => (kid.items ? inside(kid) : shown(kid) ? [kid.id] : []))
  const groups = [...p.boxes, ...p.items.filter((c) => c.items)].filter((b) => b.m && b.w > 0 && b.kind !== "page" && !(b.kind === "row" && !b.entered)).map((b) => {
    const head = b.heading && b.heading.heading ? b.heading : null
    const title = head ? head.label : b.label
    const named = head ? [head.x, head.y + head.h / 2] : (() => { const t = p.titles.find((t) => t.text === b.label && t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h); return t ? [t.x, t.y] : null })()
    return { title, named, rect: [b.x, b.y, b.w, b.h], plated: p.plated(b), kids: inside(b), head: head ? head.id : null,
      lines: b.m.lines ? b.m.lines.map((line) => ({ n: line.kids.length, w: line.w, widest: Math.max(...line.kids.map((kid) => kid.m.w)) })) : null }
  })
  const every = p.plates.map((plate) => ({ at: seen({ x: plate[0], y: plate[1], w: plate[2], h: plate[3] }, plate.clip || null), whole: [...plate], inner: !!plate.inner }))
  const plates = every.filter((plate) => plate.at)
  const v = p.viewport
  return { W: p.W, H: p.H, u: p.u, coarse: p.coarse, controls, groups, plates, every, free: p.free, view: v && { y: v.y, h: v.h, max: v.max, scroll: v.scroll, maxX: v.maxX, scrollX: v.scrollX },
    designed: p.designed, info: p.info(),
    tabs: p.tabs.map((tab) => ({ name: tab.page.label, on: tab.page === p.shown, at: [tab.x, tab.y, tab.w, tab.h] })) }
})()`

const meet = (a, b, slack = 0.5) => a[0] < b[0] + b[2] - slack && b[0] < a[0] + a[2] - slack && a[1] < b[1] + b[3] - slack && b[1] < a[1] + a[3] - slack
const holds = (outer, inner, slack = 0.75) => inner[0] >= outer[0] - slack && inner[1] >= outer[1] - slack && inner[0] + inner[2] <= outer[0] + outer[2] + slack && inner[1] + inner[3] <= outer[1] + outer[3] + slack
/** Everything that is wrong with a layout, in words; none is what is wanted. */
function faults(r, asked = {}) {
  const wrong = [], all = [0, 0, r.W, r.H], name = (c) => `${c.kind} "${c.label}"`
  const seen = r.controls.filter((c) => c.at)
  for (const c of seen) if (!holds(all, c.at)) wrong.push(`${name(c)} is outside the picture`)
  for (const plate of r.plates) if (!holds(all, plate.at)) wrong.push(`a plate is outside the picture: ${plate.at.map(Math.round)}`)
  for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) if (meet(seen[i].at, seen[j].at)) wrong.push(`${name(seen[i])} and ${name(seen[j])} overlap`)
  const own = r.plates.filter((plate) => !plate.inner)
  for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) if (meet(own[i].at, own[j].at)) wrong.push(`two plates overlap: ${own[i].at.map(Math.round)} and ${own[j].at.map(Math.round)}`)
  // A control with its middle out of sight is not felt there; one in sight is.
  for (const c of r.controls) if (c.felt !== (c.middleSeen && !!c.at)) wrong.push(`${name(c)} is ${c.felt ? 'felt where it is not seen' : 'not felt where it is seen'}`)
  const by = new Map(r.controls.map((c) => [c.id, c]))
  for (const group of r.groups) {
    const kids = group.kids.map((id) => by.get(id)).filter(Boolean)
    for (const kid of kids) if (!holds(group.rect, kid.whole)) wrong.push(`${name(kid)} is not inside its group "${group.title}"`)
    if (group.title && kids.some((kid) => kid.id !== group.head)) {
      // A heading: on the same plate as its controls, and above every one of them.
      if (!group.named) wrong.push(`the group "${group.title}" shows no title`)
      else {
        if (!holds(group.rect, [...group.named, 0, 0])) wrong.push(`the title "${group.title}" is not on its group's plate`)
        for (const kid of kids) if (kid.id !== group.head && kid.whole[1] < group.named[1]) wrong.push(`the title "${group.title}" is not before ${name(kid)}`)
      }
      if (group.plated && !r.every.some((plate) => plate.whole.every((v, i) => Math.abs(v - group.rect[i]) < 1))) wrong.push(`the group "${group.title}" has no plate`)
    }
    if (group.lines && group.lines.length > 1) {
      const widths = group.lines.map((line) => line.w), widest = Math.max(...group.lines.map((line) => line.widest))
      if (Math.max(...widths) - Math.min(...widths) > widest + 1) wrong.push(`the lines of "${group.title}" are not balanced: ${widths.map(Math.round)}`)
    }
  }
  // Never tiny: on a touch screen no smaller than with a mouse, and with a mouse no smaller than eight tenths.
  if (r.u < (asked.least ?? (r.coarse ? 1 : 0.8)) - 1e-6) wrong.push(`the controls are drawn at ${r.u} of their size`)
  if (r.coarse && asked.fingers !== false) for (const c of r.controls) if (['dial', 'slider', 'button', 'toggle', 'select', 'rotary'].includes(c.kind) && Math.min(c.whole[2], c.whole[3]) < TOUCH_LEAST) wrong.push(`${name(c)} is ${c.whole.slice(2).map(Math.round)}: too small for a finger`)
  // What does not fit is moved to be seen, not left out of sight: nothing is cut off except where the plates can be moved.
  if (!r.view) for (const c of r.controls) if (!c.at || Math.abs(c.at[3] - c.whole[3]) > 0.5 || Math.abs(c.at[2] - c.whole[2]) > 0.5) wrong.push(`${name(c)} is cut off, and the plates cannot be moved`)
  return wrong
}
/** The titles of the plates, line by line down the picture. */
const plateLines = (r) => {
  const lines = []
  for (const group of r.groups.filter((g) => g.plated && g.title).sort((a, b) => a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0])) {
    const line = lines.find((l) => Math.abs(l.y - group.rect[1]) < 1)
    line ? line.titles.push(group.title) : lines.push({ y: group.rect[1], titles: [group.title] })
  }
  return lines.map((line) => line.titles)
}
const lay = async (page, source) => {
  const began = await play(page, TOP + source + '\nawait drawn()\nawait drawn()\nwindow.result = "ready"')
  if (began !== 'ready') return { error: began }
  return page.evaluate(SURVEY)
}
const survey = async (page) => { await settle(page); await settle(page); return page.evaluate(SURVEY) }
/** Drag one dial up a quarter of its travel with a finger; how far it turned, as a part of its range (0.25 if it kept to the finger). */
const turn = async (page, r, labels) => {
  const c = r.controls.find((c) => c.kind === 'dial' && labels.includes(c.label) && c.at && Math.abs(c.at[3] - c.whole[3]) < 0.5)
  if (!c) return 'no dial in sight'
  const value = () => page.evaluate((id) => { const d = document.querySelector('#s canvas')[Symbol.for('dials.panel')].find(id); return (d.value - d.min) / (d.max - d.min) }, c.id)
  const box = await page.evaluate(() => { const b = document.querySelector('#s canvas').getBoundingClientRect(); return [b.left, b.top] })
  const x = box[0] + c.whole[0] + c.whole[2] / 2, y = box[1] + c.whole[1] + c.whole[3] / 2, before = await value()
  await finger(page, 'pointerdown', 21, [x, y])
  for (let step = 1; step <= 3; step++) await finger(page, 'pointermove', 21, [x, y - 15 * r.u * step])
  await finger(page, 'pointerup', 21, [x, y - 45 * r.u])
  return Math.round((await value() - before) * 1000) / 1000
}


// --- wrapping said in code, and a panel of a set size
const MODES = {
  nowrap: LEAD + 'layout({ wrap: false })\n' + OWNER,
  floor: LEAD + 'layout({ wrap: false, minScale: 0.9 })\n' + OWNER,
  insist: LEAD + 'layout({ wrap: false, minScale: 0 })\n' + OWNER,
  columns: LEAD + 'layout({ columns: { phone: 1, tablet: 2, wide: 3 } })\n' + OWNER,
  sized: LEAD + 'layout({ size: [900, 640] })\n' + OWNER,
  marks: LEAD + `group("shape", { wrap: false }, () => { slider("attack", lead, "attack"); slider("decay", lead, "decay"); slider("sustain", lead, "sustain"); slider("release", lead, "release") })
group("filter", () => { dial("cutoff", lead, "cutoff", { size: "large" }); dial("resonance", lead, "resonance"); dial("drive", lead, "chorus", { size: "small" }); wrap(); dial("width", lead, "width", { size: 1.5 }); dial("sub", lead, "sub") })
row({ wrap: false }, () => {
  group("delay", () => { dial("delay", lead, "echo"); dial("time", lead, "delay.time") })
  group("reverb", () => { dial("reverb", lead, "reverb"); dial("size", lead, "reverb.size") })
})
keyboard(lead, { octave: 3, octaves: 2 })
window.sizes = []
window.told = layout({ onResize: (now) => window.sizes.push([now.width, now.height]) })`,
}
MODES.fill = LEAD + 'layout({ fit: "width" })\n' + OWNER
MODES.capped = LEAD + 'layout({ fit: "width", maxScale: 1.2 })\n' + OWNER
// More than twice what fits on a phone: plates of dials, one of sliders, and a keyboard that says what it plays.
MODES.tall = LEAD + `window.played = []
for (const name of ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"]) {
  group(name, () => { dial("a", 0, 1, 0.5); dial("b", 0, 1, 0.5); dial("c", 0, 1, 0.5) })
  if (name === "two") group("sliders", () => { slider("across", 0, 1, 0.5); slider("other", 0, 1, 0.5) })
}
keyboard({ octave: 4, octaves: 1, onNoteOn: (note) => window.played.push(note) })`
const WRITTEN = [['oscillator'], ['unison', 'filter'], ['shape'], ['delay', 'reverb']]
let drawnScale = 0
let drawnAt = null     // where everything of the panel of a set size is, in its own 900 by 640: the same on every screen

async function modeCases(page, name, size, said, shot) {
  const { width, height } = SIZES[size]
  const dials = (r) => r.controls.filter((c) => c.kind === 'dial')
  const plates = (r) => r.groups.filter((g) => g.plated && g.title)

  // wrap: false. Every row is the row that was written, and one scale makes the widest fit the width.
  let r = await lay(page, MODES.nowrap)
  const right = (r) => Math.max(...plates(r).map((g) => g.rect[0] + g.rect[2]))
  // The widest row fits the width; or, under a finger, the controls stop at the smallest that is comfortable (0.8) and the rows are moved sideways.
  const fitted = (r) => (r.view && r.view.maxX ? r.coarse && Math.abs(r.u - 0.8) < 1e-6 : right(r) <= width + 0.5)
  check(name, said('told not to wrap, every row is the row that was written, at one scale that fits the widest to the width (or, under a finger, no smaller than is comfortable)'),
    [r.error || faults(r, { least: 0.5 }), plateLines(r), r.groups.every((g) => !g.lines || g.lines.length === 1), new Set(dials(r).map((c) => Math.round(c.whole[2] * 10))).size, fitted(r), r.u <= (r.coarse ? 1.15 : 1) + 1e-6],
    [[], WRITTEN, true, 1, true, true])
  check(name, said('and a dial drawn smaller to fit still keeps to the finger'), await turn(page, r, ['width', 'sub', 'spread', 'resonance']), 0.25)
  await shot('nowrap')
  if (width < 500) {
    const small = await lay(page, MODES.insist)
    check(name, said('minScale: 0 insists: as small as it takes to fit the width, with no moving sideways'), [faults(small, { least: 0, fingers: false }), plateLines(small), right(small) <= width + 0.5, !small.view || !small.view.maxX, small.u < 0.8], [[], WRITTEN, true, true, true])
  }

  // fit: "width" fills the width whichever way: bigger where there is room, as far as maxScale.
  if (width >= 1100) {
    const big = await lay(page, MODES.fill), capped = await lay(page, MODES.capped), usual = big.coarse ? 1.15 : 1
    check(name, said('fit: "width" draws a panel bigger to fill a wide picture, its rows as written, no bigger than maxScale and no bigger than fits the height'),
      [faults(big, { least: 0.5 }), plateLines(big), (size === 'full' ? big.u > usual + 0.1 : big.u >= (big.coarse ? 1 : 0.8) - 1e-6) && big.u <= 1.6 + 1e-6, !big.view, capped.u <= 1.2 + 1e-6 && capped.u >= (big.coarse ? 1 : 0.8) - 1e-6, new Set(dials(big).map((c) => Math.round(c.whole[2] * 10))).size],
      [[], WRITTEN, true, true, true, 1])
    await shot('fill')
  }

  // minScale: no smaller than that. Rows that are still too wide are moved from side to side.
  r = await lay(page, MODES.floor)
  if (width < 560) {
    const from = [width / 2, r.groups.find((g) => g.title === 'oscillator').rect[1] + 12]
    await page.mouse.move(...from); await page.mouse.wheel(60, 0)
    const moved = await survey(page)
    check(name, said('with a smallest scale the rows stop there, still unwrapped, and are moved from side to side'),
      [faults(r, { least: 0.9 }), r.u, plateLines(r), r.view.maxX > 0, Math.round(moved.view.scrollX), faults(moved, { least: 0.9 })], [[], 0.9, WRITTEN, true, Math.min(60, Math.round(r.view.maxX)), []])
    check(name, said('and a dial on rows moved sideways keeps to the finger'), await turn(page, moved, ['width', 'sub', 'spread', 'resonance', 'pwm']), 0.25)
  } else check(name, said('a smallest scale is not reached where the rows fit'), [faults(r, { least: 0.9 }), r.u >= 0.9, plateLines(r)], [[], true, WRITTEN])

  // columns: so many plates to a line, by the width.
  r = await lay(page, MODES.columns)
  const many = width >= 900 ? 3 : width >= 600 ? 2 : 1
  const tops = [...new Set(plates(r).map((g) => Math.round(g.rect[1])))].map((top) => plates(r).filter((g) => Math.round(g.rect[1]) === top).length)
  check(name, said(`columns by width puts ${many} to a line here`), [r.error || faults(r, { least: 0.5 }), tops, r.info.columns], [[], many === 3 ? [3, 3] : many === 2 ? [2, 2, 2] : [1, 1, 1, 1, 1, 1], many])
  await shot('columns')

  // A panel of a set size: laid out once, the same on every screen, and made to fit the picture whole.
  r = await lay(page, MODES.sized)
  const s = Math.min(width / 900, height / 640), ox = (width - 900 * s) / 2, oy = (height - 640 * s) / 2
  const own = r.controls.map((c) => [c.label, ...c.whole.map((v, i) => Math.round((i === 0 ? v - ox : i === 1 ? v - oy : v) / s))])
  drawnAt ||= own
  const off = own.filter((c, i) => c.slice(1).some((v, j) => Math.abs(v - drawnAt[i][j + 1]) > 1))
  check(name, said('a panel of a set size is the same on every screen, scaled whole and kept in the middle'),
    [r.error || faults(r, { least: 0, fingers: false }), r.designed.map(Math.round), off, Math.abs(r.info.scale / s - (drawnScale ||= r.info.scale / s)) < 0.01 && drawnScale >= 0.8 && drawnScale <= 1, r.controls.every((c) => holds(r.designed, c.whole, 1))],
    [[], [ox, oy, 900 * s, 640 * s].map(Math.round), [], true, true])
  check(name, said('and a dial of it keeps to the finger at that scale'), await turn(page, r, ['width', 'sub', 'spread', 'resonance']), 0.25)
  await shot('sized')

  // A group told not to wrap, a place marked to wrap at, two groups kept side by side, and dials of three sizes.
  r = await lay(page, MODES.marks)
  const of = (title) => r.groups.find((g) => g.title === title)
  const knob = (label) => r.controls.find((c) => c.kind === 'dial' && c.label === label).whole
  const split = of('filter').lines.map((line) => line.n)
  check(name, said('a group told not to wrap never does, a line is split only at its mark and only when it must be, and two groups kept together stay side by side'),
    [r.error || faults(r, { least: 0.5 }), of('shape').lines.length, split.join() === '5' || split.join() === '3,2', Math.round(of('delay').rect[1]) === Math.round(of('reverb').rect[1]), of('delay').plated && of('reverb').plated],
    [[], 1, true, true, true])
  check(name, said('a bigger dial stays that much bigger at any scale, and its label and value line up with its neighbours\''),
    [Math.round(knob('cutoff')[2] / knob('resonance')[2] * 100), knob('cutoff')[1] === knob('resonance')[1] && knob('cutoff')[3] === knob('resonance')[3], knob('drive')[3] === knob('cutoff')[3], knob('width')[2] > knob('sub')[2]],
    [Math.round(90 / 76 * 100), true, true, true])
  await shot('marks')
  if (size === 'desktop') {
    const told = await page.evaluate('[window.told.width, window.told.height, window.told.scale, window.sizes]')
    await page.setViewportSize({ width: 700, height: 500 }); await page.waitForTimeout(250)
    check(name, said('layout() says the size and the scale, and onResize is called when the picture changes size'), [told, await page.evaluate('[window.sizes, dials().layout().width]').catch(() => page.evaluate('window.sizes'))], [[width, height, 1, [[width, height]]], [[width, height], [700, 500]]])
    await page.setViewportSize({ width, height })
  }
}


/** When there is more than fits, the plates are moved to see the rest: that is what a panel does by itself. */
async function scrollCases(page, name, size, said, shot) {
  const { width } = SIZES[size]
  let r = await lay(page, MODES.tall)
  const values = () => page.evaluate('dials().panel.items.filter((c) => c.kind === "dial" || c.kind === "slider").map((c) => c.value).join()').catch(() => page.evaluate(() => document.querySelector('#s canvas')[Symbol.for('dials.panel')].items.filter((c) => c.kind === 'dial' || c.kind === 'slider').map((c) => c.value).join()))
  const whole = (r) => r.controls.filter((c) => c.at && Math.abs(c.at[3] - c.whole[3]) < 0.5 && c.kind !== 'keyboard').map((c) => c.id)
  const keys = (r) => r.controls.find((c) => c.kind === 'keyboard')
  const all = r.controls.filter((c) => c.kind !== 'keyboard').map((c) => c.id)
  const first = r
  // Every control can be reached: the wheel, a view at a time, to the end.
  const reached = new Set(whole(r))
  await page.mouse.move(width / 2, r.view.y + 30)
  for (let turn = 0; turn < 12 && r.view.scroll < r.view.max - 0.5; turn++) { await page.mouse.wheel(0, r.view.h * 0.6); r = await survey(page); for (const id of whole(r)) reached.add(id) }
  check(name, said('a panel more than twice the height of its room is moved to see the rest: every control can be reached, and the keyboard stays where it is'),
    [first.error || faults(first), first.view.max > first.view.h, all.filter((id) => !reached.has(id)), keys(r).whole, r.view.scroll === r.view.max], [[], true, [], keys(first).whole, true])
  // A drag on a dial turns the dial, and moves nothing.
  const before = r.view.scroll
  check(name, said('there, a drag on a dial turns the dial and does not move the plates'), [await turn(page, r, ['a', 'b', 'c']), (await survey(page)).view.scroll], [0.25, before])
  // A drag from the room between two plates moves them, right across dials, and changes nothing.
  r = await survey(page)
  const told = await values()
  const gapAt = (r) => { const p = r.plates.filter((plate) => plate.at[3] > 60 && plate.at[1] > r.view.y + 10 && plate.at[1] + plate.at[3] <= r.view.y + r.view.h + 1)[0]; return [p.at[0] + p.at[2] / 2, p.at[1] - 4] }
  let from = gapAt(r)
  const over = await page.evaluate(([x, y]) => { const p = document.querySelector('#s canvas')[Symbol.for('dials.panel')]; return [p.api.over(x, y), !!p.under(x, y)] }, from)
  await finger(page, 'pointerdown', 71, from)
  for (let step = 1; step <= 6; step++) await finger(page, 'pointermove', 71, [from[0], from[1] + 30 * step])
  await page.waitForTimeout(150)
  await finger(page, 'pointerup', 71, [from[0], from[1] + 180])
  let moved = await survey(page)
  check(name, said('a drag that starts between two plates moves them, passes over dials without turning one, and the scene is not given it'),
    [over, Math.round(before - moved.view.scroll), await values() === told], [[true, false], 180, true])
  // The keyboard plays while the plates are moved away from the top.
  const k = keys(moved).whole
  await finger(page, 'pointerdown', 72, [k[0] + k[2] * 0.5 / 8, k[1] + k[3] * 0.9]); await finger(page, 'pointerup', 72, [k[0] + k[2] * 0.5 / 8, k[1] + k[3] * 0.9])
  check(name, said('and the keyboard plays while they are moved'), [await page.evaluate('window.played'), moved.view.scroll > 0], [[60], true])
  // A slider that lies across: a finger going up or down it means the plates, a finger going along it means the slider.
  await page.mouse.move(width / 2, moved.view.y + 30); await page.mouse.wheel(0, -100000); await page.mouse.wheel(0, 150)
  r = await survey(page)
  const slide = r.controls.find((c) => c.kind === 'slider' && c.label === 'across')
  const on = [slide.whole[0] + slide.whole[2] * 0.3, slide.whole[1] + slide.whole[3] * 0.75]
  const value = () => page.evaluate((id) => document.querySelector('#s canvas')[Symbol.for('dials.panel')].find(id).value, slide.id)
  await finger(page, 'pointerdown', 73, on)
  for (let step = 1; step <= 4; step++) await finger(page, 'pointermove', 73, [on[0] + 2, on[1] - 20 * step])
  await page.waitForTimeout(150); await finger(page, 'pointerup', 73, [on[0] + 2, on[1] - 80])
  const up = [await value(), Math.round((await survey(page)).view.scroll - r.view.scroll)]
  r = await survey(page)
  const again = r.controls.find((c) => c.id === slide.id).whole, start = [again[0] + again[2] * 0.3, again[1] + again[3] * 0.75]
  await finger(page, 'pointerdown', 74, start)
  for (let step = 1; step <= 4; step++) await finger(page, 'pointermove', 74, [start[0] + 15 * step, start[1] - 1])
  await finger(page, 'pointerup', 74, [start[0] + 60, start[1] - 1])
  check(name, said('a finger going up a slider that lies across moves the plates, and one going along it moves the slider'),
    [up, await value() !== 0.5, Math.round((await survey(page)).view.scroll - r.view.scroll)], [[0.5, 80], true, 0])
  // Let go while moving, the plates carry on a little way.
  await page.mouse.move(width / 2, r.view.y + 30); await page.mouse.wheel(0, -100000)
  r = await survey(page)
  from = gapAt(r)
  await finger(page, 'pointerdown', 75, from)
  for (let step = 1; step <= 4; step++) { await finger(page, 'pointermove', 75, [from[0], from[1] - 30 * step]); await page.waitForTimeout(16) }
  await finger(page, 'pointerup', 75, [from[0], from[1] - 120])
  const let_go = (await survey(page)).view.scroll
  await page.waitForTimeout(2200)
  const rest = (await survey(page)).view.scroll
  await page.waitForTimeout(200)
  check(name, said('let go while moving, the plates carry on a little way and come to rest'), [let_go >= 110, rest > let_go + 10, (await survey(page)).view.scroll === rest], [true, true, true])
  await shot('tall')
}


// --- the owner's panel on his tablet: seven titled groups, a scope and a keyboard, and nothing drawn by the scene
const TABLET_PANEL = LEAD + `label("oscillator"); rotary("wave", lead, "wave"); dial("width", lead, "width"); dial("sub", lead, "sub")
row()
label("pwm"); dial("amount", lead, "lfo2.pulse_width"); dial("speed", lead, "lfo2.rate")
row()
label("unison"); dial("voices", lead, "voices"); dial("detune", lead, "detune"); dial("spread", lead, "spread")
row()
label("filter"); select("filter", lead, "filter"); dial("cutoff", lead, "cutoff", { size: "large" }); dial("resonance", lead, "resonance")
row()
label("shape"); dial("attack", lead, "attack"); dial("decay", lead, "decay"); dial("sustain", lead, "sustain"); dial("release", lead, "release")
row()
label("delay"); dial("amount", lead, "echo"); dial("time", lead, "delay.time"); dial("feedback", lead, "delay.feedback")
row()
label("reverb"); rotary("type", ["room", "hall", "plate", "cathedral", "spring"], "spring"); dial("amount", lead, "reverb"); dial("size", lead, "reverb.size"); dial("decay", lead, "chorus")
scope(lead)
keyboard(lead, { octave: 3, octaves: 2 })
`
/** The instrument keeps its height: the scope is there and can be read, the keys are tall enough to play, and where the plates are moved every point of the height is used. */
async function instrumentCases(browser, name) {
  for (const [width, height, what] of [[615, 860, 'the owner\'s tablet, as its preview draws it'], [1230, 1700, 'a tablet\'s whole screen'], [560, 1100, 'a split view'], [1440, 900, 'a desktop window'], [390, 844, 'a phone']]) {
    const touch = width !== 1440
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && name === 'chromium', deviceScaleFactor: 1 })
    await context.addInitScript(SILENT)
    const page = await context.newPage()
    const notes = []
    page.on('console', (m) => { if (m.type() === 'info') notes.push(m.text()) })
    await page.goto(`${at}/full.html`)
    let r = await lay(page, TABLET_PANEL)
    await page.waitForTimeout(700); r = await survey(page)
    const u = r.u, scope = r.controls.find((c) => c.kind === 'scope'), keys = r.controls.find((c) => c.kind === 'keyboard')
    const strip = (r.coarse ? 30 : 22) * u, gap = 8 * u, margin = 10 * u, pad = 8 * u
    // From the top margin to the bottom one with nothing between but the gaps: the plates (or where they are seen), the scope's plate, the keyboard's.
    const top = r.view ? r.view.y : Math.min(...r.plates.map((plate) => plate.at[1]))
    const stack = r.view ? [r.view.y - margin, scope.whole[1] - pad - gap - (r.view.y + r.view.h), keys.whole[1] - pad - gap - (scope.whole[1] + scope.whole[3] + pad), height - margin - (keys.whole[1] + keys.whole[3] + pad)] : [top - margin, 0, keys.whole[1] - pad - gap - (scope.whole[1] + scope.whole[3] + pad), height - margin - (keys.whole[1] + keys.whole[3] + pad)]
    check(name, `the instrument, ${what} (${width} by ${height}): the scope is there and no shorter than it can be read at, the keys are tall enough to play, and nothing is hidden`,
      [r.error || faults(r), !!scope && scope.whole[3] >= 56 * u - 0.5 && scope.at[3] === scope.whole[3], keys.whole[3] - strip >= (150 - 30) * u - 0.5, r.controls.filter((c) => !c.at && !r.view).length, notes],
      [[], true, true, 0, []])
    check(name, `the instrument, ${what}: the height is all used, from the top margin to the bottom one, with no band left over`, stack.map((v) => Math.abs(v) < 1.5), [true, true, true, true])
    if (SHOTS) await page.screenshot({ path: join(ROOT, 'shots', `${name}-instrument-${width}.png`) })
    await context.close()
  }
}

async function layoutCases(browser, name, size) {
  const { width, height, touch } = SIZES[size]
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && name === 'chromium', deviceScaleFactor: 1 })
  await context.addInitScript(SILENT)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${at}/full.html`)
  const said = (what) => `layout, ${size} (${width} by ${height}): ${what}`
  const shot = async (scene) => { if (SHOTS) await page.screenshot({ path: join(ROOT, 'shots', `${name}-layout-${scene}-${size}.png`) }) }

  // Six dials and nothing else: one tidy plate, wrapped evenly where it must be.
  let r = await lay(page, LAID.six)
  check(name, said('six dials and nothing else are one tidy plate'), [r.error || faults(r), r.plates.length, r.groups[0].lines.map((line) => line.n)], [[], 1, size === 'phone' || size === 'small' ? [3, 3] : [6]])
  if (touch && name === 'chromium') check(name, said('a touch screen is known, and its controls are bigger'), [r.coarse, r.u >= 1], [true, true])
  await shot('six')

  // The owner's scene: labels, controls and row() only.
  r = await lay(page, LAID.owner)
  const headed = r.groups.filter((g) => g.head).map((g) => [g.title, g.kids.length])
  check(name, said('the scene in the owner\'s picture is plates with their headings, none stranded'), [r.error || faults(r), headed],
    [[], [['oscillator', 5], ['unison', 3], ['filter', 3], ['shape', 4], ['delay', 3], ['reverb', 3]]])
  if (size === 'split') check(name, said('and its plates stand as its rows were written'), plateLines(r), [['oscillator'], ['unison', 'filter'], ['shape'], ['delay', 'reverb']])
  const piano = r.controls.find((c) => c.kind === 'keyboard'), wave = r.controls.find((c) => c.kind === 'scope')
  // On a phone on its side there is too little height for both: the scope is put away, and the keyboard takes no more than four tenths.
  if (size === 'land') check(name, said('with very little height the scope is put away and the keyboard keeps to its share, with keys wide enough to play'), [!wave, piano.at[3] <= height * 0.42, piano.at[1] + piano.at[3] > height - 30, r.view.h >= 190, piano.at[2] / 15 >= 22], [true, true, true, true, true])
  else check(name, said('the keyboard is along the bottom and the scope just above it, both whole'), [piano.at[1] + piano.at[3] > height - 30, wave.at[1] + wave.at[3] <= piano.at[1], wave.at[3] === wave.whole[3], wave.at[2] > width * 0.8], [true, true, true, true])
  await shot('owner')
  if (r.view) {
    // More than fits: a finger on a heading moves the plates, and a dial that was moved still keeps to the finger.
    const head = r.controls.find((c) => c.heading && c.at && c.at[3] > 10)
    const from = [head.at[0] + 40, head.at[1] + head.at[3] / 2]
    await finger(page, 'pointerdown', 31, from); await finger(page, 'pointermove', 31, [from[0], from[1] - 60]); await finger(page, 'pointermove', 31, [from[0], from[1] - 130]); await page.waitForTimeout(150); await finger(page, 'pointerup', 31, [from[0], from[1] - 130])
    const moved = await survey(page)
    check(name, said('what does not fit is moved with a finger, and nothing is drawn tiny'), [faults(moved), Math.round(moved.view.scroll), moved.view.max > 0, moved.u >= (moved.coarse ? 1 : 0.8)], [[], Math.round(Math.min(130, r.view.max)), true, true])
    check(name, said('a dial on plates that were moved keeps to the finger'), await turn(page, moved, ['sub', 'spread', 'resonance', 'feedback', 'size', 'width']), 0.25)
    await page.mouse.move(from[0], from[1]); await page.mouse.wheel(0, 100000)
    const end = await survey(page)
    check(name, said('the wheel moves them too, as far as they go, and the keyboard and scope stay put'), [faults(end), end.view.scroll === end.view.max, end.controls.find((c) => c.kind === 'keyboard').at, end.controls.find((c) => c.kind === 'scope')?.at], [[], true, moved.controls.find((c) => c.kind === 'keyboard').at, moved.controls.find((c) => c.kind === 'scope')?.at])
    await shot('owner-moved')
  } else {
    check(name, said('it all fits, and nothing is drawn tiny'), [r.controls.every((c) => c.at && c.at[3] === c.whole[3]), r.u >= (r.coarse ? 1 : 0.8)], [true, true])
  }
  await modeCases(page, name, size, said, shot)
  if (size === 'phone' || size === 'small') await scrollCases(page, name, size, said, shot)

  // The owner's second writing of it, a row() after every group: the plates still stand side by side to fill the width.
  r = await lay(page, LAID.rows)
  await page.waitForTimeout(700); r = await survey(page)      // a scene that draws nothing is seen to be a panel after a moment
  const named = r.groups.filter((g) => g.plated && g.title).sort((a, b) => a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0])
  const tops = [...new Set(named.map((g) => Math.round(g.rect[1])))]
  const perLine = tops.map((top) => named.filter((g) => Math.round(g.rect[1]) === top))
  const edges = perLine.map((line) => [line[0].rect[0], r.W - (line.at(-1).rect[0] + line.at(-1).rect[2])])
  const keys = r.controls.find((c) => c.kind === 'keyboard'), trace = r.controls.find((c) => c.kind === 'scope') || (size === 'land' ? { whole: [0, keys.whole[1], 0, 0] } : null)
  check(name, said('a panel written as seven short rows fills the width with lines of plates as tall as each other, set against both edges'),
    [r.error || faults(r), perLine.map((line) => line.length).join(), perLine.every((line) => line.every((g) => Math.abs(g.rect[3] - line[0].rect[3]) < 0.5)),
      edges.every(([left, right]) => left <= Math.max(12, r.W * MARGIN_MOST) && right <= Math.max(12, r.W * MARGIN_MOST) + (r.view ? 22 : 0)), keys.whole[1] - (trace.whole[1] + trace.whole[3]) < 30],
    [[], { small: '1,1,1,1,1,1,1', phone: '1,1,1,1,1,1,1', land: '3,2,2', split: '2,2,1,2', tablet: '4,3', full: '4,3', desktop: '7' }[size], true, true, true])
  await shot('rows')

  // Groups, one inside another, with a column, a grid, sizes, a share and a spacer.
  r = await lay(page, LAID.groups)
  const sizes = Object.fromEntries(r.controls.filter((c) => ['cutoff', 'resonance', 'width'].includes(c.label) && c.kind === 'dial').map((c) => [c.label, c.whole[3]]))
  const out = r.groups.find((g) => g.title === 'output'), graph = r.controls.find((c) => c.kind === 'scope'), level = r.controls.find((c) => c.kind === 'meter')
  check(name, said('groups keep their controls together, with sizes, a grid and a share'),
    [r.error || faults(r), r.groups.filter((g) => g.plated).map((g) => g.title), sizes.cutoff > sizes.width && sizes.width > sizes.resonance, graph.whole[2] > level.whole[2] * 2, out.rect[2] > r.W * 0.5 || graph.whole[2] > 150],
    [[], ['oscillator', 'unison', 'filter', 'shape', 'delay', 'output'], true, true, true])
  await shot('groups')
  if (r.view) check(name, said('a dial in a group on plates that can be moved keeps to the finger'), await turn(page, r, ['width', 'sub', 'spread', 'resonance']), 0.25)

  // Pages, turned with a tab.
  r = await lay(page, LAID.pages)
  const labels = (r) => r.controls.filter((c) => c.kind === 'dial').map((c) => c.label)
  const first = [r.error || faults(r), r.tabs.map((tab) => [tab.name, tab.on]), labels(r)]
  const tab = r.tabs[1].at
  await finger(page, 'pointerdown', 41, [tab[0] + tab[2] / 2, tab[1] + tab[3] / 2]); await finger(page, 'pointerup', 41, [tab[0] + tab[2] / 2, tab[1] + tab[3] / 2])
  const turned = await survey(page)
  check(name, said('pages are turned with a tab, and only the page on show is there'), [...first, faults(turned), turned.tabs.map((t) => t.on), labels(turned), turned.tabs.map((t) => t.at), turned.controls.find((c) => c.kind === 'scope')?.at],
    [[], [['osc', true], ['fx', false]], ['width', 'sub', 'voices', 'detune', 'spread'], [], [false, true], ['delay', 'time', 'feedback', 'reverb', 'size'], r.tabs.map((t) => t.at), r.controls.find((c) => c.kind === 'scope')?.at])
  check(name, said('a dial on the page turned to keeps to the finger'), await turn(page, turned, ['delay', 'time', 'feedback', 'size']), 0.25)
  await shot('pages')

  // Strips along two edges, and the rectangle that is left for the scene.
  r = await lay(page, LAID.game)
  const left = await page.evaluate('window.said()'), free = [left.x, left.y, left.width, left.height]
  const strip = r.groups.find((g) => g.title === 'moves').rect
  check(name, said('strips along the edges leave the rectangle that room() gives'),
    [r.error || faults(r), r.plates.some((plate) => meet(plate.at, free)), r.controls.some((c) => meet(c.at, free)), free[0] > strip[0] + strip[2], free[0] + free[2] === r.W, free[1], free[1] + free[3] < r.plates[1].at[1], free[2] * free[3] > r.W * r.H * 0.4, r.free.join() === free.join(), strip[3] > r.H * 0.9],
    [[], false, false, true, true, 0, true, true, true, true])
  await shot('game')
  // The controls of the second part, at this size: whole, apart, in the picture, each drawing only in its own box, and none too small for a finger.
  for (const [scene, source] of Object.entries(MORE_LAID)) {
    r = await lay(page, source)
    const small = r.error || !r.coarse ? [] : r.controls.filter((c) => MORE_TOUCHED.includes(c.kind) && Math.min(c.whole[2], c.whole[3]) < TOUCH_LEAST).map((c) => `${c.kind} "${c.label}"`)
    check(name, said(`the controls ${{ any: 'for any program', more: 'for any program (pads, colours, bars, lights, sliders)' }[scene] || 'for ' + scene} are laid out whole and apart, each draws only in its own box, and none is too small for a finger`), [r.error || faults(r), r.error ? null : await page.evaluate(SPILL(MORE_KINDS)), small], [[], [], []])
    await shot('more-' + scene)
  }
  check(name, said('no scene left an error on the page'), errors, [])
  await context.close()
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
    if (began === 'ready') { try { got = await c.act(page, { spot, read, finger, settle }) } catch (e) { got = { error: String(e) } } }
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
  {
    // Someone who has asked for less movement: the keys jump to the new octave, as they always did.
    const calm = await browser.newContext({ viewport: { width: 900, height: 700 }, reducedMotion: 'reduce' })
    await calm.addInitScript(SILENT)
    const still = await calm.newPage()
    await still.goto(`${at}/full.html`)
    const began = await play(still, TOP + `window.t = { k: keyboard({ octave: 4, octaves: 2 }) }
await drawn()
window.result = "ready"`)
    let got = began
    if (began === 'ready') {
      await still.mouse.click(...await spot(still, 'k', 0.98, 0.05))
      got = await read(still, '[t.k.octave, t.k.offset, matchMedia("(prefers-reduced-motion: reduce)").matches]')
    }
    check(name, 'with reduced motion asked for, the keys jump to the new octave', got, [5, 0, true])
    await calm.close()
  }
  await shutIn(browser, name, { at, play, check, SILENT, TOP })
  for (const size of Object.keys(SIZES)) await layoutCases(browser, name, size)
  await instrumentCases(browser, name)
  await browser.close()
}
server.close()
console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
