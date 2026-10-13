/**
 * The cases for the controls of the second part of dials.js (a number box, a text box, a readout and
 * the rest), in the shapes test-dials.mjs runs: scenes that leave what they found in `result`, scenes
 * worked by hand, and scenes laid out at every size of screen. test-dials.mjs runs them all.
 */

/** The names a scene is given besides the first part's. */
export const MORE = 'const { number, stepper, textBox, readout } = lib\n'

/** The kinds of this part: at every size each is asked to draw, and must keep to its own box. */
export const MORE_KINDS = ['number', 'textBox', 'readout']
/** Those a finger works: on a touch screen none is smaller than a finger. */
export const MORE_TOUCHED = ['number', 'textBox']

export const MORE_CASES = [
  { what: 'a number box is a number: it counts in ones, or in tenths over a small range, and keeps to its range and its step',
    source: `const a = number("lives", 0, 9, 3), b = number("gain", -1, 1, 0.25), c = stepper("n", 0, 100, 50, { step: 5 })
a.value = 12; c.value = 23
window.result = [a.value, a.step, a * 2, b.value, b.step, c.value, a.label, typeof a.reset]`,
    want: [9, 1, 18, 0.3, 0.1, 25, 'lives', 'object'] },
  { what: 'a number box tied to a target takes its range and step from it, and sets it',
    source: `const synth = { values: { voices: 3 }, describe: () => ({ min: 1, max: 8, default: 1, kind: "int" }), get(name) { return this.values[name] }, set(name, value) { this.values[name] = value } }
const n = number(synth, "voices")
const first = [n.value, n.min, n.max, n.step, n.label]
n.nudge(1); n.nudge(1, true)
const wrote = synth.values.voices
synth.values.voices = 2
await drawn()
window.result = [...first, wrote, n.value]`,
    want: [3, 1, 8, 1, 'voices', 8, 2] },
  { what: 'a text box is its text, and one tied to a target reads and writes it',
    source: `const player = { name: "Grace" }
const a = textBox("name", "Ada"), b = textBox("who", player, "name"), c = textBox("empty", { placeholder: "type here", max: 3 })
a.value = "Ada L"; b.value = "Hopper"
const wrote = player.name
player.name = "Mary"
await drawn()
c.take("abcdef")
window.result = [a.value, \`\${a}\`, wrote, b.value, c.value, c.placeholder, b.label]`,
    want: ['Ada L', 'Ada L', 'Hopper', 'Mary', 'abc', 'type here', 'who'] },
  { what: 'a readout shows a function\'s value, a value set from code, seconds as a clock and a setting of a target',
    source: `let score = 7
const ball = { speed: 2.5, describe: () => ({ unit: "hz", digits: 1 }) }
const a = readout("score", () => score), b = readout("time", 65, { format: "clock" }), c = readout("status", "Ready"), d = readout(ball, "speed"), e = readout("long", 3725, { format: "clock" })
const f = readout("pi", 3.14159), g = readout("made", 2, { format: (v) => "x" + v, unit: "km" })
await drawn()
const first = [a.text, b.text, c.text, d.text, d.unit, d.label, e.text, f.text, g.text, g.unit]
score = 12; c.value = "Go!"; ball.speed = 10
await drawn()
window.result = [...first, a.text, a.value, c.text, d.text]`,
    want: ['7', '1:05', 'Ready', '2.5', 'Hz', 'speed', '1:02:05', '3.14', 'x2', 'km', '12', 12, 'Go!', '10.0'] },
  { what: 'a readout that no longer fits its box is given a wider one, and is never made narrower',
    source: `const a = readout("status", "Go"), b = dial("x", 0, 1)
await drawn()
const narrow = a.w
a.value = "A much longer message than before"
await drawn()
const wide = a.w
a.value = "Go"
await drawn()
window.result = [wide > narrow + 80, a.w === wide, a.text]`,
    want: [true, true, 'Go'] },
]

/** What is being typed into, and where it is on the page. */
const TYPING = `(() => { const i = document.querySelector("input[data-dials-typing]"); if (!i) return null; const b = i.getBoundingClientRect(); return { value: i.value, keys: i.inputMode, focused: document.activeElement === i, at: [b.left, b.top, b.width, b.height].map(Math.round), font: parseFloat(getComputedStyle(i).fontSize) } })()`

export const MORE_HANDS = [
  { what: 'a number box steps with its − and +, keeps stepping while one is held, and is dragged up and down on its number',
    setup: `const heard = [], box = { n: 5 }
window.t = { a: number("lives", 0, 9, 3, { onChange: (v) => heard.push(v) }), b: number("big", 0, 1000, 100, { step: 10 }), c: number("tied", box, "n", { min: 0, max: 20 }), heard, box }`,
    async act(page, { spot, read }) {
      const plus = await spot(page, 'a', 0.88, 0.65), minus = await spot(page, 'a', 0.12, 0.65)
      await page.mouse.click(...plus); await page.mouse.click(...plus); await page.mouse.click(...minus)
      const stepped = await read(page, '[t.a.value, t.heard]')
      await page.mouse.move(...await spot(page, 'b', 0.88, 0.65)); await page.mouse.down()
      await page.waitForTimeout(1000)
      const side = await read(page, 't.b.side')
      await page.mouse.up()
      const held = await read(page, 't.b.value')
      const [x, y] = await spot(page, 'c', 0.5, 0.65)
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 60, { steps: 6 }); await page.mouse.up()
      return [stepped, side, held > 150 && held < 400, await read(page, '[t.c.value, t.box.n]'), await read(page, 'document.querySelector("input[data-dials-typing]")')]
    },
    want: [[4, [4, 5, 4]], 1, true, [11, 11], null] },
  { what: 'a tap on a number box\'s number types it: Enter keeps what was typed within the range, and what is not a number is not taken',
    setup: `const heard = []
window.t = { a: number("lives", 0, 9, 3, { onChange: (v) => heard.push(v) }), b: number("gain", -1, 1, 0), heard }`,
    async act(page, { spot, read }) {
      await page.mouse.click(...await spot(page, 'a', 0.5, 0.65))
      const open = await read(page, TYPING), field = await read(page, '(() => { const f = t.a.field(t.a.u), b = document.querySelector("#s canvas").getBoundingClientRect(); return [b.left + f.x + f.side, b.top + f.y, f.w - 2 * f.side, f.h].map(Math.round) })()')
      await page.keyboard.type('7'); await page.keyboard.press('Enter')
      const typed = await read(page, '[t.a.value, t.heard, document.querySelector("input[data-dials-typing]"), document.activeElement.tagName]')
      await page.mouse.click(...await spot(page, 'a', 0.5, 0.65))
      await page.keyboard.type('42'); await page.keyboard.press('Enter')
      const over = await read(page, 't.a.value')
      await page.mouse.click(...await spot(page, 'a', 0.5, 0.65))
      await page.keyboard.type('cat'); await page.keyboard.press('Enter')
      const words = await read(page, 't.a.value')
      await page.mouse.click(...await spot(page, 'b', 0.5, 0.65))
      const signed = (await read(page, TYPING)).keys
      await page.keyboard.type('-0,7'); await page.keyboard.press('Enter')
      return [open.value, open.keys, open.focused, open.font >= 16, open.at.join() === field.join(), typed, over, words, signed, await read(page, 't.b.value')]
    },
    want: ['3', 'numeric', true, true, true, [7, [7], null, 'CANVAS'], 9, 9, 'text', -0.7] },
  { what: 'a text box is typed into: onChange hears each letter, Enter calls onEnter, Escape puts back what was there, and a touch elsewhere keeps what was typed',
    setup: `const heard = [], player = { name: "" }
window.t = { a: textBox("name", "Ada", { onChange: (v) => heard.push(v), onEnter: (v) => heard.push("enter " + v) }), b: textBox(player, "name"), d: dial("x", 0, 1), heard, player, keys: () => [...keys] }`,
    async act(page, { spot, read, settle }) {
      await page.mouse.click(...await spot(page, 'a', 0.5, 0.65))
      await page.keyboard.type(' L')
      const during = await read(page, '[t.a.value, t.keys()]')
      await page.keyboard.press('Enter')
      const entered = await read(page, '[t.heard, document.querySelector("input[data-dials-typing]")]')
      await page.mouse.click(...await spot(page, 'a', 0.5, 0.65))
      await page.keyboard.type('zzz'); await page.keyboard.press('Escape')
      const escaped = await read(page, 't.a.value')
      await page.mouse.click(...await spot(page, 'b', 0.5, 0.65))
      await page.keyboard.type('Grace')
      await page.mouse.click(...await spot(page, 'd'))
      await settle(page)
      return [during, entered, escaped, await read(page, '[t.b.value, t.player.name, document.querySelector("input[data-dials-typing]")]')]
    },
    want: [['Ada L', []], [['Ada ', 'Ada L', 'enter Ada L'], null], 'Ada L', ['Grace', 'Grace', null]] },
  { what: 'the box that is typed into stays on its control when the page is scrolled and when the picture is drawn at another size',
    setup: `window.t = { a: textBox("name", "Ada"), n: number("n", 0, 9, 1) }`,
    async act(page, { spot, read }) {
      const where = '(() => { const f = t.a.field(t.a.u), b = document.querySelector("#s canvas").getBoundingClientRect(), k = b.width / document.querySelector("#s canvas").offsetWidth; return [b.left + f.x * k, b.top + f.y * k, f.w * k, f.h * k].map(Math.round) })()'
      await page.evaluate(() => { const s = document.getElementById('s'); s.style.transform = 'scale(0.75)'; s.style.transformOrigin = '0 0'; document.body.style.height = '3000px'; window.scrollTo(0, 60) })
      const [x, y, w, h] = await read(page, where)
      await page.mouse.click(x + w / 2, y + h / 2)
      await page.keyboard.type('!')
      const got = await read(page, TYPING), want = await read(page, where)
      const value = await read(page, 't.a.value')
      await page.keyboard.press('Enter')
      await page.evaluate(() => { const s = document.getElementById('s'); s.style.transform = ''; document.body.style.height = ''; window.scrollTo(0, 0) })
      return [got.focused, got.at.map((n, i) => Math.abs(n - want[i]) <= 1), value]
    },
    want: [true, [true, true, true, true], 'Ada!'] },
  { what: 'a finger works a number box as a mouse does, and the arrow keys step the control touched last (Shift ten at a time, Tab to the next)',
    setup: `window.t = { a: number("a", 0, 100, 50), b: number("b", 0, 100, 50), api: dials() }`,
    async act(page, { spot, read, finger }) {
      const plus = await spot(page, 'a', 0.88, 0.65)
      await finger(page, 'pointerdown', 11, plus); await finger(page, 'pointerup', 11, plus)
      const [x, y] = await spot(page, 'a', 0.5, 0.65)
      await finger(page, 'pointerdown', 11, [x, y]); await finger(page, 'pointermove', 11, [x, y - 30]); await finger(page, 'pointermove', 11, [x, y - 60]); await finger(page, 'pointerup', 11, [x, y - 60])
      const fingered = await read(page, 't.a.value')
      await page.locator('#s canvas[tabindex]').focus()
      await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Shift+ArrowUp')
      const keyed = await read(page, '[t.a.value, t.api.panel.keyed]')
      await page.keyboard.press('Tab'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('End')
      return [fingered > 53 && fingered < 60, keyed[0] - fingered, keyed[1], await read(page, '[t.b.value, t.api.panel.focus === t.b]')]
    },
    want: [true, 11, true, [100, true]] },
]

/** Scenes laid out at every size of screen: each must be whole, apart, in the picture and big enough for a finger. */
export const MORE_LAID = {
  any: `let score = 1250
label("player")
number("lives", 0, 9, 3); number("cutoff", 20, 20000, 440, { unit: "Hz", step: 10 }); textBox("name", "Ada"); textBox("city", { placeholder: "where?" })
row()
label("game")
readout("score", () => score, { size: "large" }); readout("time", 65, { format: "clock", size: "large" }); readout("speed", 12.5, { unit: "km/h" }); readout("status", "Ready")`,
}

/** In the page: every control of these kinds is drawn alone on a clear canvas, and what it painted is measured against its box. */
export const SPILL = (kinds) => `(() => {
  const p = document.querySelector("#s canvas")[Symbol.for("dials.panel")], wrong = [], kinds = ${JSON.stringify(kinds)}
  const c = Object.assign(document.createElement("canvas"), { width: Math.ceil(p.W), height: Math.ceil(p.H) }), g = c.getContext("2d", { willReadFrequently: true })
  for (const item of p.items) {
    if (!kinds.includes(item.kind) || item.hidden || !item.w) continue
    g.clearRect(0, 0, c.width, c.height)
    g.save(); item.draw(g, item.u); g.restore()
    const d = g.getImageData(0, 0, c.width, c.height).data
    let l = 1e9, t = 1e9, r = -1, b = -1
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y }
    const name = item.kind + ' "' + item.label + '"'
    if (r < 0) wrong.push(name + " draws nothing")
    else if (l < item.x - 1 || t < item.y - 1 || r > item.x + item.w + 1 || b > item.y + item.h + 1) wrong.push(name + " draws outside its box: " + [l, t, r, b] + " in " + [item.x, item.y, item.x + item.w, item.y + item.h].map(Math.round))
  }
  return wrong
})()`

/**
 * Typing in a scene that is shut in a frame which may run scripts and nothing else (no dialogs, no
 * storage, no way out to the page around it), as a preview's is: the box is made inside the frame,
 * takes the keys, and the scene has what was typed.
 */
export async function shutIn(browser, name, { at, play, check, SILENT, TOP }) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } })
  await context.addInitScript(SILENT)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${at}/framed.html`)
  const frame = page.frames().find((f) => f !== page.mainFrame())
  await frame.waitForLoadState()
  const began = await play(frame, TOP + `const heard = []
window.t = { a: textBox("name", "Ada", { onEnter: (v) => heard.push(v) }), n: number("lives", 0, 9, 3), heard }
await drawn()
window.result = "ready"`)
  let got = began
  if (began === 'ready') {
    // The frame is 40 across and 30 down the page that holds it.
    const spot = (which, fx, fy) => frame.evaluate(({ which, fx, fy }) => { const c = window.t[which], b = document.querySelector('#s canvas').getBoundingClientRect(); return [40 + b.left + c.x + c.w * fx, 30 + b.top + c.y + c.h * fy] }, { which, fx, fy })
    await page.mouse.click(...await spot('a', 0.5, 0.65))
    const open = await frame.evaluate(() => { const i = document.querySelector('input[data-dials-typing]'); return [!!i, document.activeElement === i, window.origin] })
    await page.keyboard.type(' L'); await page.keyboard.press('Enter')
    await page.mouse.click(...await spot('n', 0.5, 0.65))
    await page.keyboard.type('8'); await page.keyboard.press('Enter')
    got = [open, await frame.evaluate('[t.a.value, t.heard, t.n.value, document.querySelector("input[data-dials-typing]")]'), errors]
  }
  check(name, 'a scene shut in a frame that may only run scripts is typed into as any other: the box is made in the frame and takes the keys', got, [[true, true, 'null'], ['Ada L', ['Ada L'], 8, null], []])
  await context.close()
}
