/**
 * The cases for `custom()` (a control of your own: you draw it, and a finger and a sound reach your code) and
 * for the MIDI button of `keyboard(synth, { midi: true })`, in the shapes test-dials.mjs runs: scenes that leave
 * what they found in `result`, scenes worked by hand, and a page with a pretend MIDI keyboard or two.
 *
 *   CASES=custom,MIDI PLAYWRIGHT=... node scripts/test-dials.mjs     runs only these (and the example)
 */

/** In a scene: where a custom control's own point (x, y) is drawn, and the colour of the pixel there. */
const READ = `const layerOf = () => canvas.nextElementSibling
const px = (c, x, y, top = 0) => [...layerOf().getContext("2d").getImageData(Math.round((c.x + x * c.u) * pixelRatio), Math.round((c.y + (top + y) * c.u) * pixelRatio), 1, 1).data].join()
const { custom } = lib
`

export const CUSTOM_CASES = [
  { what: 'custom: a control of your own is laid out like any other, at the size it asks for (a height asked for is the drawing area; a label adds its own line above it), apart from its neighbours and inside the picture',
    source: READ + `const a = custom("pad", { width: 160, height: 100 }), b = custom({ width: 120, height: 60 }), c = dial("d", 0, 1)
const piano = keyboard()
await drawn()
const whole = (k) => k.w > 0 && k.x >= 0 && k.y >= 0 && k.x + k.w <= width && k.y + k.h <= piano.y
window.result = [a.label, b.label, Math.round(a.w / a.u), Math.round(a.h / a.u), Math.round(b.w / b.u), Math.round(b.h / b.u), whole(a), whole(b), a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y, a.kind, c.kind]`,
    want: ['pad', '', 160, 122, 120, 60, true, true, true, 'custom', 'dial'] },
  { what: 'custom: draw(c) is given a painter in the control\'s own points: its size, value, whether it is held, the accent colour, and what its source says',
    source: READ + `let seen = null
const a = custom({ width: 120, height: 80, value: 0.25, source: () => 7, draw(c) { seen = [Math.round(c.width), Math.round(c.height), c.value, c.held, c.accent, c.input, typeof c.g, typeof c.theme.text] } })
const b = custom("named", { width: 100, height: 50, colour: "tomato", draw(c) { window.named = [Math.round(c.height), c.accent, c.label] } })
await drawn()
window.result = [seen, window.named]`,
    want: [[120, 80, 0.25, false, '#ffb224', 7, 'object', 'string'], [50, 'tomato', 'named']] },
  { what: 'custom: the painter draws a rect, a frame, a circle, a ring, a line, lines, a polygon, text and a clear where it was told',
    source: READ + `const c = custom({ width: 200, height: 100, draw(p) {
  p.clear("#000000")
  p.rect(10, 10, 30, 20, "#ff0000")
  p.frame(50, 10, 30, 20, "#00ff00", 4)
  p.circle(110, 20, 10, "#0000ff")
  p.ring(150, 20, 10, "#ffff00", 4)
  p.line(10, 60, 50, 60, "#ff00ff", 4)
  p.lines([[60, 60], [100, 60], [100, 90]], "#00ffff", 4)
  p.polygon([[120, 50], [160, 50], [140, 90]], "#ffffff")
  p.text("Hi", 180, 80, "#ff8800", 20)
} })
await drawn()
const g = layerOf().getContext("2d")
const orange = () => { const d = g.getImageData(Math.round((c.x + 165 * c.u) * pixelRatio), Math.round((c.y + 62 * c.u) * pixelRatio), Math.round(30 * c.u * pixelRatio), Math.round(28 * c.u * pixelRatio)).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 90 && d[i + 1] < 190 && d[i + 2] < 60) n++; return n > 10 }
window.result = [px(c, 5, 95), px(c, 25, 20), px(c, 50, 20), px(c, 65, 20), px(c, 110, 20), px(c, 140, 20), px(c, 150, 20), px(c, 30, 60), px(c, 80, 60), px(c, 100, 75), px(c, 140, 60), orange()]`,
    want: ['0,0,0,255', '255,0,0,255', '0,255,0,255', '0,0,0,255', '0,0,255,255', '255,255,0,255', '0,0,0,255', '255,0,255,255', '0,255,255,255', '0,255,255,255', '255,255,255,255', true] },
  { what: 'custom: a list of drawing commands (ops), for a host that cannot hand over a function, draws the same, and a label moves the drawing down by its line (the label line is added to the height asked for, and what is drawn past the box is cut off)',
    source: READ + `const a = custom({ width: 60, height: 40, ops: [["rect", 0, 0, 60, 40, "#ff0000"], ["circle", 30, 20, 10, "#0000ff"]] })
const b = custom("lab", { width: 60, height: 40, ops: [["rect", 0, 0, 60, 40, "#00ff00"]] })
await drawn()
window.result = [px(a, 5, 5), px(a, 30, 20), px(b, 5, 5, 22), px(b, 30, 10, 22), px(b, 30, 45, 22) !== '0,255,0,255']`,
    want: ['255,0,0,255', '0,0,255,255', '0,255,0,255', '0,255,0,255', true] },
  { what: 'custom: what a control draws is cut at the edge of its own area: a shape far bigger than it does not reach the label line above it, nor past its sides',
    source: READ + `const a = custom("lab", { width: 80, height: 40, draw(c) { c.circle(40, 20, 400, "#ff0000") } })
const side = custom({ width: 80, height: 40, draw(c) { c.circle(40, 20, 400, "#00ff00") } })
await drawn()
window.result = [px(a, 4, 6) !== '255,0,0,255', px(a, 40, 10, 22), px(side, 40, 20), px(side, -4, 20) !== '0,255,0,255', px(side, 84, 20) !== '0,255,0,255']`,
    want: [true, '255,0,0,255', '0,255,0,255', true, true] },
  { what: 'custom: a control whose drawing throws, or has no size to draw in, does not stop the controls after it from being drawn',
    source: READ + `const bad = custom("bad", { width: 80, height: 40, draw(c) { c.rect(0, 0, 50, 30, "#ff0000", 4); throw new Error("on purpose") } })
const none = custom("none", { width: 80, height: 40, draw(c) { c.rect(0, 0, -5, -5, "#ff0000", 8); c.ring(0, 0, -3, "#ff0000", 2) } })
const after = custom({ width: 80, height: 40, draw(c) { c.rect(0, 0, c.width, c.height, "#00ff00") } })
await drawn()
window.result = [px(after, 40, 20), px(bad, 20, 20, 22)]`,
    want: ['0,255,0,255', '255,0,0,255'] },
  { what: 'custom: it is drawn only when it needs to be (animate: true draws it every frame, otherwise it waits for redraw(), a new value or a hand)',
    source: READ + `let a = 0, b = 0
const A = custom({ width: 80, height: 40, animate: true, draw() { a++ } }), B = custom({ width: 80, height: 40, draw() { b++ } })
await drawn()
const a0 = a, b0 = b
for (let i = 0; i < 10; i++) await frame()
const idle = [a - a0, b - b0]
B.redraw(); await drawn()
const redrawn = b - b0
B.value = 3; await drawn()
window.result = [idle[0] >= 8, idle[1], redrawn >= 1, b - b0 > redrawn, B.value]`,
    want: [true, 0, true, true, 3] },
  { what: 'custom: set(v) is a hand changing it (onChange hears it, with the control), while the value setter only draws it',
    source: READ + `const heard = []
const c = custom("c", { width: 80, height: 40, value: 1, onChange: (v, who) => heard.push([v, who === c]) })
c.value = 4
const quiet = heard.length
c.set(5)
window.result = [quiet, heard, c.value, c.valueOf(), \`\${c}\`]`,
    want: [0, [[5, true]], 5, 5, '5'] },
  { what: 'custom: a source that is a target gives level() (a list is its loudest), samples() and notes() to draw; one that is a function gives what it returns',
    source: READ + `const seen = {}
const lead = { level: () => 0.6, samples: () => [0, 0.5, -0.5], notes: () => [60, 64] }
const two = { level: () => [0.2, 0.7] }
let n = 0
custom({ width: 80, height: 40, source: lead, animate: true, draw(c) { seen.a = [c.level, c.samples, c.input] } })
custom({ width: 80, height: 40, source: two, animate: true, draw(c) { seen.b = c.level } })
custom({ width: 80, height: 40, source: () => ++n, animate: true, draw(c) { seen.c = c.input } })
await drawn(); await drawn()
window.result = [seen.a, seen.b, seen.c > 1]`,
    want: [[0.6, [0, 0.5, -0.5], [60, 64]], 0.7, true] },
  { what: 'custom: onFrame is called every frame with a painter and the time, and onKey is asked about a key (true keeps it, and no onKey takes none)',
    source: READ + `let frames = 0, kinds = null
const keys = []
const a = custom({ width: 80, height: 40, onFrame(c, now) { frames++; kinds = [typeof c.width, typeof now] }, onKey(e, c) { keys.push([e.key, typeof c.width]); return e.key === "a" } })
const b = custom({ width: 80, height: 40 })
for (let i = 0; i < 6; i++) await frame()
window.result = [frames >= 5, kinds, a.keyDown({ key: "a" }), a.keyDown({ key: "b" }), keys, b.keyDown({ key: "a" })]`,
    want: [true, ['number', 'number'], true, false, [['a', 'number'], ['b', 'number']], false] },
  { what: 'custom: place() puts it where it is told and place() with nothing hands it back to the layout, and remove() takes it off the scene',
    source: READ + `const a = custom({ width: 80, height: 40 }), b = dial("b", 0, 1)
await drawn()
const panel = canvas[Symbol.for("dials.panel")]
const laid = [a.x, a.y]
a.place(30, 40); await drawn()
const put = [a.x, a.y]
a.place(); await drawn()
const back = [a.x, a.y]
a.remove(); await drawn()
window.result = [laid.join() === back.join(), put, panel.items.includes(a), panel.items.includes(b)]`,
    want: [true, [30, 40], false, true] },
  { what: 'custom: its handlers may be spelled on_down, on_move, on_up, on_key, on_frame and on_change',
    source: READ + `const f = () => {}
const c = custom({ width: 80, height: 40, on_down: f, on_move: f, on_up: f, on_key: f, on_frame: f, on_change: f })
window.result = [typeof c.hear.down, typeof c.hear.move, typeof c.hear.up, typeof c.hear.key, typeof c.hear.frame, typeof c.onChange]`,
    want: ['function', 'function', 'function', 'function', 'function', 'function'] },
  { what: 'MIDI button: a keyboard has one on its strip only when it is asked for (midi: true) and it is wide enough, whether or not its target has a midiInput() of its own',
    source: READ + `const lead = makeSynth("lead")
const a = keyboard(lead, { octave: 4, midi: true })
await drawn()
const strip = a.shape(a.u).strip, box = a.midiBox(a.u)
const on = [a.hasMidi, box.x >= a.x && box.x + box.w <= a.x + a.w && box.y >= a.y && box.y + box.h <= a.y + strip]
a.remove()
const b = keyboard(lead, { octave: 4 })
await drawn()
const off = b.hasMidi
b.remove()
const c = keyboard({ noteOn() {}, noteOff() {} }, { octave: 4, midi: true })
await drawn()
const bare = c.hasMidi
c.remove()
canvas.parentElement.style.width = "200px"
const d = keyboard(lead, { octave: 4, midi: true })
await drawn()
const narrow = [d.hasMidi, Math.round(d.w / d.u) < 230]
canvas.parentElement.style.width = "760px"
window.result = [on, off, bare, narrow]`,
    want: [[true, true], false, true, [false, true]] },
]

export const CUSTOM_HANDS = [
  { what: 'custom: a hand on it calls onDown, onMove and onUp with points in its own coordinates (below its label), whose shift is the Shift key, and a pointer elsewhere is not heard',
    setup: `const { custom } = lib
const log = []
window.t = { a: custom("pad", { width: 200, height: 100, onDown: (p, c) => log.push(["down", Math.round(p.x), Math.round(p.y), p.shift, Math.round(c.width)]), onMove: (p) => log.push(["move", Math.round(p.x), Math.round(p.y), p.shift]), onUp: (p) => log.push(["up", Math.round(p.x), Math.round(p.y)]) }), d: dial("d", 0, 1), log }`,
    async act(page, { spot, read }) {
      // The control is 200 across; its label takes the first 22 points down, so its drawing is 100 down from there.
      const where = (fx, fy) => spot(page, 'a', fx, fy)
      const [x0, y0] = await where(0.25, 0.5)
      await page.mouse.move(x0, y0); await page.mouse.down()
      await page.keyboard.down('Shift')
      const [x1, y1] = await where(0.75, 0.75)
      await page.mouse.move(x1, y1, { steps: 3 })
      await page.keyboard.up('Shift')
      await page.mouse.up()
      const u = await read(page, 't.a.u'), log = await read(page, 't.log')
      const w = await read(page, 't.a.w / t.a.u'), h = await read(page, 't.a.h / t.a.u')
      const near = (a, b) => Math.abs(a - b) <= 2
      const down = log[0], last = log.filter((e) => e[0] === 'move').pop(), up = log[log.length - 1]
      // Elsewhere on the page: a dial is turned, and the pad hears nothing.
      const before = log.length
      await page.mouse.move(...await spot(page, 'd', 0.5, 0.5)); await page.mouse.down(); await page.mouse.up()
      return [down[0], near(down[1], w * 0.25), near(down[2], h * 0.5 - 22), down[3], Math.round(down[4]) === Math.round(w),
        last[0], near(last[1], w * 0.75), near(last[2], h * 0.75 - 22), last[3], up[0], near(up[1], w * 0.75), (await read(page, 't.log.length')) === before]
    },
    want: ['down', true, true, false, true, 'move', true, true, true, 'up', true, true] },
  { what: 'custom: a hand that is dragging it keeps it held while it is down, and the painter says so',
    setup: `const { custom } = lib
const seen = []
window.t = { a: custom({ width: 160, height: 80, animate: true, draw: (c) => seen.push(c.held) }), seen }`,
    async act(page, { spot, read, settle }) {
      await page.mouse.move(...await spot(page, 'a', 0.5, 0.5)); await page.mouse.down()
      await settle(page); await settle(page)
      const during = await read(page, '[t.a.held, t.seen[t.seen.length - 1]]')
      await page.mouse.up()
      await settle(page); await settle(page)
      return [during, await read(page, '[t.a.held, t.seen[t.seen.length - 1]]')]
    },
    want: [[true, true], [false, false]] },
]

/** A keyboard with a MIDI button, and what is on the page to find it by. */
const BOARD = `const log = []
const lead = makeSynth("lead")
window.t = { k: keyboard(lead, { octave: 4, midi: true, onNoteOn: (n) => log.push(n) }), lead, log }
window.btn = () => { const b = document.querySelector("#s canvas").getBoundingClientRect(), m = t.k.midiBox(t.k.u); return [b.left + m.x + m.w / 2, b.top + m.y + m.h / 2] }
// Where a line of the panel is, on the page.
window.at = (what) => {
  const b = document.querySelector("#s canvas").getBoundingClientRect(), l = t.k.list, u = l.u
  if (what.device !== undefined) return [b.left + l.x + 60 * u, b.top + l.y + 30 * u + what.device * l.line + l.line / 2]
  const row = Math.floor(what.channel / l.perRow), col = what.channel % l.perRow
  return [b.left + l.x + 10 * u + col * l.cell + l.cell / 2, b.top + l.y + l.h0 + 24 * u + row * (l.cell - 6 * u) + (l.cell - 6 * u) / 2]
}`

/** The same, on a target that has no MIDI input of its own: the keyboard listens to the browser's MIDI itself. */
const PLAIN = `const log = [], keys = []
const target = { noteOn: (n, v) => log.push(["on", n, Math.round(v * 127)]), noteOff: (n) => log.push(["off", n]) }
window.t = { k: keyboard(target, { octave: 4, midi: true, onNoteOn: (n, v) => keys.push([n, Math.round(v * 127)]) }), target, log, keys }
window.btn = () => { const b = document.querySelector("#s canvas").getBoundingClientRect(), m = t.k.midiBox(t.k.u); return [b.left + m.x + m.w / 2, b.top + m.y + m.h / 2] }
window.at = (what) => {
  const b = document.querySelector("#s canvas").getBoundingClientRect(), l = t.k.list, u = l.u
  if (what.device !== undefined) return [b.left + l.x + 60 * u, b.top + l.y + 30 * u + what.device * l.line + l.line / 2]
  const row = Math.floor(what.channel / l.perRow), col = what.channel % l.perRow
  return [b.left + l.x + 10 * u + col * l.cell + l.cell / 2, b.top + l.y + l.h0 + 24 * u + row * (l.cell - 6 * u) + (l.cell - 6 * u) / 2]
}`

/** A page where navigator.requestMIDIAccess finds two keyboards; a message is sent from one with window.send(which, bytes). */
const FAKE_MIDI = () => {
  const make = (id, name) => ({ id, name, manufacturer: '', type: 'input', state: 'connected', connection: 'open', onmidimessage: null, addEventListener() {}, removeEventListener() {}, open: async () => {} })
  const inputs = new Map([['a', make('a', 'Keystation 49')], ['b', make('b', 'Launchkey Mini')]])
  window.__inputs = inputs
  window.send = (which, bytes) => { const input = inputs.get(which); if (input && input.onmidimessage) { input.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); return true } return false }
  navigator.requestMIDIAccess = async () => ({ inputs, outputs: new Map(), sysexEnabled: false, onstatechange: null, addEventListener() {}, removeEventListener() {} })
}

/**
 * The MIDI button worked by hand, on a page with two pretend MIDI keyboards, and on one with no MIDI at all.
 * (The scenes are run by test-dials's own `play`; nothing is written to the folder the page is served from.)
 */
export async function midiCases(browser, name, { play, check, SILENT, TOP, at, only }) {
  const want = (what) => !only.length || only.some((k) => what.includes(k))
  const open = async (fake) => {
    const context = await browser.newContext({ viewport: { width: 900, height: 700 } })
    await context.addInitScript(SILENT)
    if (fake) await context.addInitScript(FAKE_MIDI)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${at}/test.html`)
    return { context, page, errors }
  }
  const wait = (page, ms) => page.waitForTimeout(ms)

  if (want('MIDI button: with two MIDI keyboards')) {
    const { context, page, errors } = await open(true)
    const began = await play(page, TOP + BOARD + '\nawait drawn()\nwindow.result = "ready"')
    let got = began
    if (began === 'ready') {
      try {
        const out = {}
        await page.mouse.click(...await page.evaluate('btn()'))
        await wait(page, 700)
        out.opened = await page.evaluate('[t.k.list.shown, t.k.list.devices(), t.k.list.channels()]')
        // A device and a channel are chosen in the panel; they are the synth's own MIDI input's.
        await page.mouse.click(...await page.evaluate('at({ device: 2 })'))
        await wait(page, 300)
        await page.mouse.click(...await page.evaluate('at({ channel: 3 })'))
        await wait(page, 300)
        out.chosen = await page.evaluate('[String(t.lead.midiInput().get("device")), String(t.lead.midiInput().get("channel")), t.k.list.shown]')
        // A note from the keyboard that was not chosen, and one on the wrong channel, are not heard; one from the chosen keyboard on channel 3 is.
        await page.evaluate('send("a", [0x92, 65, 100]); send("b", [0x90, 66, 100])')
        await wait(page, 200)
        out.unheard = await page.evaluate('[t.k.midiLit, t.k.port.notes().includes(65), t.k.port.notes().includes(66)]')
        await page.evaluate('send("b", [0x92, 64, 100])')
        await wait(page, 200)
        out.heard = await page.evaluate('[t.k.midiLit > 0, t.k.port.notes().includes(64), !!(t.k.sounding && t.k.sounding.has(64))]')
        await page.evaluate('send("b", [0x82, 64, 0])')
        await wait(page, 200)
        out.let_go = await page.evaluate('[t.k.port.notes().includes(64)]')
        got = out
      } catch (e) { got = { error: String(e) } }
    }
    check(name, 'MIDI button: with two MIDI keyboards, a tap opens the panel (every device, every channel), a choice there is the synth\'s own MIDI input, and only notes from it on its channel light the button and the keys',
      [got, errors],
      [{ opened: [true, ['all', 'Keystation 49', 'Launchkey Mini'], ['all', ...Array.from({ length: 16 }, (_, i) => String(i + 1))]], chosen: ['Launchkey Mini', '3', true], unheard: [0, false, false], heard: [true, true, true], let_go: [false] }, []])
    await context.close()
  }

  if (want('MIDI button: a target with no MIDI input')) {
    const { context, page, errors } = await open(true)
    const began = await play(page, TOP + PLAIN + '\nawait drawn()\nwindow.result = "ready"')
    let got = began
    if (began === 'ready') {
      try {
        const out = {}
        out.button = await page.evaluate('t.k.hasMidi')
        await page.mouse.click(...await page.evaluate('btn()'))
        await wait(page, 700)
        out.opened = await page.evaluate('[t.k.list.shown, t.k.list.devices(), t.k.list.channels().length]')
        await page.mouse.click(...await page.evaluate('at({ device: 2 })'))
        await wait(page, 300)
        await page.mouse.click(...await page.evaluate('at({ channel: 3 })'))
        await wait(page, 300)
        out.chosen = await page.evaluate('[t.k.port.get("device"), t.k.port.get("channel")]')
        // The other keyboard, and the wrong channel, are ignored.
        await page.evaluate('send("a", [0x92, 65, 100]); send("b", [0x90, 66, 100])')
        await wait(page, 200)
        out.ignored = await page.evaluate('[t.log.slice(), t.keys.slice(), t.k.midiLit]')
        // The chosen one on channel 3 plays the target, with its velocity, lights the key and the button.
        await page.evaluate('send("b", [0x92, 64, 100])')
        await wait(page, 100)
        out.played = await page.evaluate('[t.log.slice(), t.keys.slice(), t.k.count.has(64), t.k.midiLit > 0, t.k.notes]')
        await page.evaluate('send("b", [0x82, 64, 0])')
        await wait(page, 200)
        out.let_go = await page.evaluate('[t.log.slice(), t.k.count.has(64), t.k.notes]')
        got = out
      } catch (e) { got = { error: String(e) } }
    }
    check(name, 'MIDI button: a target with no MIDI input of its own gets the button too, and the keyboard listens itself: the panel lists both keyboards, only the chosen one on its channel plays the target (with its velocity, lighting the key and the button), and a note off lets it go',
      [got, errors],
      [{ button: true, opened: [true, ['all', 'Keystation 49', 'Launchkey Mini'], 17], chosen: ['Launchkey Mini', '3'], ignored: [[], [], 0],
        played: [[['on', 64, 100]], [[64, 100]], true, true, [64]], let_go: [[['on', 64, 100], ['off', 64]], false, []] }, []])
    await context.close()
  }

  if (want('MIDI button: a touch outside')) {
    const { context, page } = await open(true)
    const began = await play(page, TOP + BOARD + '\nawait drawn()\nwindow.result = "ready"')
    let got = began
    if (began === 'ready') {
      try {
        await page.mouse.click(...await page.evaluate('btn()'))
        await wait(page, 500)
        const was = await page.evaluate('t.k.list.shown')
        // A key of the piano, under where the panel is not: the panel closes, and the key is not played.
        const key = await page.evaluate('(() => { const b = document.querySelector("#s canvas").getBoundingClientRect(), s = t.k.shape(t.k.u); return [b.left + t.k.x + t.k.w * 0.8, b.top + s.top + s.tall * 0.8] })()')
        await page.mouse.click(...key)
        await wait(page, 300)
        const closed = await page.evaluate('[t.k.list.shown, t.log.slice()]')
        // And with the panel shut, the same touch plays the key.
        await page.mouse.click(...key)
        await wait(page, 300)
        got = [was, closed, await page.evaluate('t.log.length > 0')]
      } catch (e) { got = { error: String(e) } }
    }
    check(name, 'MIDI button: a touch outside the panel closes it and is not felt by the key under it', got, [true, [false, []], true])
    await context.close()
  }

  if (want('MIDI button: with no MIDI, a target with no MIDI input')) {
    const { context, page, errors } = await open(false)
    const began = await play(page, TOP + PLAIN + '\nawait drawn()\nwindow.result = "ready"')
    let got = began
    if (began === 'ready') {
      try {
        await page.mouse.click(...await page.evaluate('btn()'))
        await wait(page, 700)
        got = await page.evaluate('[t.k.hasMidi, t.k.list.shown, t.k.list.missing, t.k.list.devices()]')
      } catch (e) { got = { error: String(e) } }
    }
    check(name, 'MIDI button: with no MIDI, a target with no MIDI input of its own still has the button, and the panel says so', [got, errors], [[true, true, true, ['no MIDI here']], []])
    await context.close()
  }

  if (want('MIDI button: where there is no MIDI')) {
    const { context, page, errors } = await open(false)
    const began = await play(page, TOP + BOARD + '\nawait drawn()\nwindow.result = "ready"')
    let got = began
    if (began === 'ready') {
      try {
        await page.mouse.click(...await page.evaluate('btn()'))
        await wait(page, 700)
        got = await page.evaluate('[t.k.list.shown, t.k.list.missing, t.k.list.devices()]')
      } catch (e) { got = { error: String(e) } }
    }
    check(name, 'MIDI button: where there is no MIDI the button is there and the panel says so, as the tracker\'s does', [got, errors], [[true, true, ['no MIDI here']], []])
    await context.close()
  }
}
