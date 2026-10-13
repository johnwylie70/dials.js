/**
 * The cases for the controls of the second part of dials.js (a number box, a text box, a readout and
 * the rest), in the shapes test-dials.mjs runs: scenes that leave what they found in `result`, scenes
 * worked by hand, and scenes laid out at every size of screen. test-dials.mjs runs them all.
 */

/** The names a scene is given besides the first part's. */
export const MORE = 'const { number, stepper, textBox, readout, checkbox, choose, radio, dropdown, xyPad, colourPicker, colorPicker, progress, light, busy, rangeSlider, fader } = lib\n'

/** The kinds of this part: at every size each is asked to draw, and must keep to its own box. */
export const MORE_KINDS = ['number', 'textBox', 'readout', 'checkbox', 'choose', 'radio', 'dropdown', 'xyPad', 'colourPicker', 'progress', 'light', 'busy', 'rangeSlider', 'fader']
/** Those a finger works: on a touch screen none is smaller than a finger. */
export const MORE_TOUCHED = ['number', 'textBox', 'checkbox', 'choose', 'radio', 'dropdown', 'xyPad', 'colourPicker', 'rangeSlider', 'fader']

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
  { what: 'a checkbox is true or false, and choose, radio and dropdown are one of a list, each tied to a target as a toggle and a select are',
    source: `const synth = { values: { on: 1, wave: 2 }, describe: (name) => ({ on: { kind: "bool" }, wave: { kind: "choice", choices: "sine|saw|square" } })[name], get(name) { return this.values[name] }, set(name, value) { this.values[name] = value } }
const a = checkbox("sound", true), b = checkbox("power", synth, "on"), c = choose("mode", ["easy", "medium", "hard"], "medium"), d = radio("wave", synth, "wave"), e = dropdown("planet", ["Mercury", "Venus", "Earth"], "Earth")
const first = [a.on, b.value, c.value, c.index, d.value, d.choices, e.value, e.open]
b.on = false; c.value = "hard"; d.pick(0); e.index = 1
window.result = [...first, synth.values, c.index, e.value]`,
    want: [true, true, 'medium', 1, 'square', ['sine', 'saw', 'square'], 'Earth', false, { on: 0, wave: 0 }, 2, 'Venus'] },
  { what: 'choices that do not fit on one line take two even ones',
    source: `canvas.parentElement.style.width = "300px"
await drawn()
const c = choose("day", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
await drawn()
const found = [c.cols, c.x + c.w <= 300, c.cell(4, c.u).y > c.cell(3, c.u).y, c.cell(3, c.u).y === c.cell(0, c.u).y]
canvas.parentElement.style.width = "760px"
window.result = found`,
    want: [4, true, true, true] },
  { what: 'an XY pad is two numbers, read as x and y: plain ranges start in the middle or where they are told, and two settings of a target give their ranges and are set',
    source: `const lead = { v: { cutoff: 800, resonance: 0.3 }, describe: (n) => ({ cutoff: { min: 20, max: 20000, unit: "Hz" }, resonance: { min: 0, max: 1 } })[n], get(n) { return this.v[n] }, set(n, x) { this.v[n] = x } }
const a = xyPad("spot", [0, 100], [0, 50]), b = xyPad("at", [0, 10, 2], [0, 10, 8]), c = xyPad(lead, "cutoff", "resonance"), d = xyPad("unit")
const first = [a.x, a.y, a.value, b.x, b.y, c.x, c.y, c.label, c.control.ax.log, c.control.ax.unit, d.value]
a.x = 150; a.y = 10; c.value = [5000, 0.9]
lead.v.cutoff = 100
await drawn()
window.result = [...first, a.value, lead.v.resonance, c.x, typeof a.control.w, a.kind]`,
    want: [50, 25, [50, 25], 2, 8, 800, 0.3, 'cutoff / resonance', true, 'Hz', [0.5, 0.5], [100, 10], 0.9, 100, 'number', 'xyPad'] },
  { what: 'a colour picker is a colour as a scene writes one: a name stays a name, a mixed colour is written with a #, and a target is read and set',
    source: `const pen = { colour: "gold" }
const a = colourPicker("ink", "tomato"), b = colorPicker("sky"), c = colourPicker(pen, "colour")
const first = [a.value, \`\${a}\`, a.rgb, Math.round(a.hue), Math.round(a.strong * 100), a.bright, b.value, c.value, c.label]
a.mix(120, 1, 1)
const mixed = a.value
a.take("black"); a.take("white")
c.value = "blue"
window.result = [...first, mixed, a.value, Math.round(a.hue), pen.colour, a.colours.length]`,
    want: ['tomato', 'tomato', [255, 99, 71], 9, 72, 1, 'tomato', 'gold', 'colour', '#00ff00', 'white', 120, 'blue', 16] },
  { what: 'a progress bar, a light and a busy ring show what they are told: a part done, a brightness, a colour, a function\'s answer or a target\'s level',
    source: `let done = 3
const amp = { level: () => [0.2, 0.6] }
const a = progress("loading", 0.4), b = progress("files", () => done, { max: 12 }), c = light("ready", true), d = light("warn", "red"), e = light("signal", amp), f = light("off"), g = busy("working"), h = busy("idle", false)
await drawn()
const first = [a.done, b.done, c.on, c.bright, d.on, d.shine, e.bright, f.on, g.on, h.on]
done = 12; a.value = 2; c.on = false; d.value = 0.25; h.on = true
await drawn()
window.result = [...first, a.done, b.done, c.on, d.bright, h.value]`,
    want: [0.4, 0.25, true, 1, true, 'red', 0.6, false, true, false, 1, 1, false, 0.25, true] },
  { what: 'a slider with two handles is a low and a high number that never pass each other, and a fader is a slider that stands upright',
    source: `const loop = { start: 0.2, end: 0.9, describe: () => ({ min: 0, max: 2, unit: "s" }) }
const a = rangeSlider("price", 0, 100, [20, 80]), b = rangeSlider("loop", loop, "start", "end"), c = rangeSlider("all", 0, 10), f = fader("vol", 0, 1, 0.7)
const first = [a.low, a.high, a.value, b.low, b.high, b.max, b.unit, c.value, f.vertical, f.value, f * 2]
a.low = 95; a.high = 50; b.high = 1.5; a.value = [30, 10]
const crossed = [a.low, a.high]
loop.start = 0.5
await drawn()
window.result = [...first, crossed, loop.end, b.low]`,
    want: [20, 80, [20, 80], 0.2, 0.9, 2, 's', [0, 10], true, 0.7, 1.4, [10, 30], 1.5, 0.5] },
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
  { what: 'a checkbox is ticked by a click, and a finger chooses among choices side by side (sliding across them) and one under another',
    setup: `const heard = []
window.t = { a: checkbox("sound", false, (on) => heard.push(on)), c: choose("mode", ["easy", "medium", "hard"], { onChange: (v) => heard.push(v) }), r: radio("size", ["small", "medium", "large"]), heard }`,
    async act(page, { spot, read, finger }) {
      await page.mouse.click(...await spot(page, 'a'))
      const ticked = await read(page, 't.a.on')
      await page.mouse.click(...await spot(page, 'c', 5 / 6, 0.7))
      const clicked = await read(page, 't.c.value')
      const cell = (i) => spot(page, 'c', (i + 0.5) / 3, 0.7)
      await finger(page, 'pointerdown', 11, await cell(0)); await finger(page, 'pointermove', 11, await cell(1)); await finger(page, 'pointerup', 11, await cell(1))
      await page.mouse.click(...await spot(page, 'r', 0.5, 0.86))
      await page.locator('#s canvas[tabindex]').focus()
      await page.keyboard.press('ArrowUp')
      return [ticked, clicked, await read(page, '[t.c.value, t.heard, t.r.value]')]
    },
    want: [true, 'hard', ['medium', [true, 'hard', 'easy', 'medium'], 'medium']] },
  { what: 'a dropdown opens its list over the controls: a tap on a line picks it and closes the list, a touch outside closes it and is not felt underneath, and a long list is moved with the wheel and a finger',
    setup: `const heard = []
const names = []; for (let i = 0; i < 30; i++) names.push("choice " + i)
window.t = { p: dropdown("planet", ["Mercury", "Venus", "Earth", "Mars"], "Earth", { onChange: (v) => heard.push(v) }), d: dial("x", 0, 100, 50), long: dropdown("long", names), heard, api: dials(), over: () => over(700, 500) }`,
    async act(page, { spot, read, finger, settle }) {
      const line = (name, i) => read(page, `(() => { const l = t.${name}.list, b = document.querySelector("#s canvas").getBoundingClientRect(); return [b.left + l.x + l.w / 2, b.top + l.y + 4 * l.u + (${i} + 0.5) * 40 * l.u - l.scroll] })()`)
      const before = await read(page, 't.over()')
      await page.mouse.click(...await spot(page, 'p', 0.5, 0.65))
      await settle(page)
      const open = await read(page, '[t.p.open, t.over(), t.p.list.y >= t.p.y + t.p.h - 8, t.p.list.h]')
      await page.mouse.click(...await line('p', 3))
      const picked = await read(page, '[t.p.value, t.p.open, t.heard]')
      await page.mouse.click(...await spot(page, 'p', 0.5, 0.65))
      await settle(page)
      const [x, y] = await spot(page, 'd')
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 60, { steps: 3 }); await page.mouse.up()
      const outside = await read(page, '[t.p.open, t.p.value, t.d.value]')
      await page.mouse.click(...await spot(page, 'long', 0.5, 0.65))
      await settle(page)
      const whole = await read(page, '[t.long.list.most > 0, t.long.list.y + t.long.list.h <= t.api.panel.H, t.long.list.scroll]')
      await page.mouse.move(...await line('long', 2)); await page.mouse.wheel(0, 400)
      await settle(page)
      const wheeled = await read(page, 't.long.list.scroll')
      const from = await line('long', 14)
      await finger(page, 'pointerdown', 11, from); await finger(page, 'pointermove', 11, [from[0], from[1] - 50]); await finger(page, 'pointermove', 11, [from[0], from[1] - 100]); await finger(page, 'pointerup', 11, [from[0], from[1] - 100])
      const dragged = await read(page, '[t.long.list.scroll, t.long.open, t.long.value]')
      const at = await line('long', 15)
      await finger(page, 'pointerdown', 11, at); await finger(page, 'pointerup', 11, at)
      await page.locator('#s canvas[tabindex]').focus()
      await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
      return [before, open.slice(0, 3), picked, outside, whole, wheeled, dragged[0] - wheeled, dragged.slice(1), await read(page, '[t.long.value, t.long.open]')]
    },
    want: [false, [true, true, true], ['Mars', false, ['Mars']], [false, 'Mars', 50], [true, true, 0], 400, 100, [true, 'choice 0'], ['choice 17', false]] },
  { what: 'an XY pad\'s dot comes to the finger and follows it out to the edge; one finger at a time; Shift moves it a tenth as far; two clicks put it back; and one that springs goes back when it is let go',
    setup: `const heard = []
const a = xyPad("spot", [0, 100], [0, 100], { onChange: (x, y) => heard.push([Math.round(x), Math.round(y)]) }), b = xyPad("stick", [-1, 1], [-1, 1], { spring: true })
window.t = { a: a.control, pad: a, b: b.control, stick: b, heard, at: (fx, fy) => { const c = a.control, s = c.pad(c.u), r = canvas.getBoundingClientRect(); return [r.left + s.x + s.side * fx, r.top + s.y + s.side * (1 - fy)] } }`,
    async act(page, { spot, read, finger }) {
      const at = (fx, fy) => read(page, `t.at(${fx}, ${fy})`)
      await page.mouse.click(...await at(0.25, 0.8))
      const clicked = await read(page, '[Math.round(t.pad.x), Math.round(t.pad.y), t.heard.at(-1)]')
      await page.waitForTimeout(400)
      const [x, y] = await at(0.25, 0.8)
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 600, y + 600, { steps: 4 })
      const dragged = await read(page, 't.pad.value')
      await finger(page, 'pointerdown', 12, await at(0.5, 0.5)); await finger(page, 'pointerup', 12, await at(0.5, 0.5))
      const second = await read(page, 't.pad.value')
      await page.mouse.up()
      await page.waitForTimeout(400)
      await page.keyboard.down('Shift')
      const from = await at(0.5, 0.5)
      await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(from[0] - 150, from[1], { steps: 3 }); await page.mouse.up()
      await page.keyboard.up('Shift')
      const fine = await read(page, 'Math.round(t.pad.x)')
      await page.waitForTimeout(400)
      await page.mouse.click(...from); await page.mouse.click(...from)
      const back = await read(page, 't.pad.value')
      const s = await spot(page, 'b', 0.8, 0.3)
      await finger(page, 'pointerdown', 11, s)
      const pushed = await read(page, 't.stick.x > 0.4 && t.stick.y > 0.2')
      await finger(page, 'pointerup', 11, s)
      return [clicked, dragged, second, fine, back, pushed, await read(page, 't.stick.value')]
    },
    want: [[25, 80, [25, 80]], [100, 0], [100, 0], 90, [50, 50], true, [0, 0]] },
  { what: 'a colour picker opens over the controls: a drag in its square and along its strip mixes a colour, a tap on a named colour takes it and closes the picker, and a touch outside closes it',
    setup: `const heard = []
window.t = { c: colourPicker("ink", "tomato", (v) => heard.push(v)), d: dial("x", 0, 100, 50), heard, over: () => over(5, 5),
  part: (name, fx, fy) => { const r = t.c.picker[name], b = canvas.getBoundingClientRect(); return [b.left + r.x + r.w * fx, b.top + r.y + r.h * fy] },
  named: (i) => { const n = t.c.picker.names, b = canvas.getBoundingClientRect(); return [b.left + n.x + (i % 8 + 0.5) * n.each, b.top + n.y + (Math.floor(i / 8) + 0.5) * n.h] } }`,
    async act(page, { spot, read, finger, settle }) {
      await page.mouse.click(...await spot(page, 'c', 0.5, 0.65))
      await settle(page)
      const open = await read(page, '[t.c.open, t.over()]')
      const [x, y] = await read(page, 't.part("square", 0.5, 0.5)')
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 2000, y - 2000, { steps: 3 }); await page.mouse.up()
      const strong = await read(page, '[t.c.value, t.c.open]')
      const h = await read(page, 't.part("strip", 0, 0.5)'), to = await read(page, 't.part("strip", 2 / 3, 0.5)')
      await finger(page, 'pointerdown', 11, h); await finger(page, 'pointermove', 11, to); await finger(page, 'pointerup', 11, to)
      const hue = await read(page, '[t.c.value, Math.round(t.c.hue), t.heard.length > 2, t.heard.at(-1)]')
      await page.mouse.click(...await read(page, 't.named(8)'))
      const named = await read(page, '[t.c.value, t.c.open]')
      await page.mouse.click(...await spot(page, 'c', 0.5, 0.65))
      await settle(page)
      await page.mouse.click(...await spot(page, 'd'))
      return [open, strong, hue, named, await read(page, '[t.c.open, t.c.value, t.d.value]')]
    },
    want: [[true, true], ['#ff2700', true], ['#0000ff', 240, true, '#0000ff'], ['blue', false], [false, 'blue', 50]] },
  { what: 'the handle of a two-handled slider nearer the finger is the one moved, and it stops at the other; a fader is dragged up',
    setup: `const heard = []
window.t = { r: rangeSlider("price", 0, 100, [20, 80], { size: 200, onChange: (low, high) => heard.push([Math.round(low), Math.round(high)]) }), f: fader("vol", 0, 100, 0, { size: 100 }), heard }`,
    async act(page, { spot, read }) {
      // The track starts 14 points in and is 200 long, 18 points up from the bottom.
      const [x, y] = await spot(page, 'r', 0, 1), on = (v) => [x + 14 + v * 2, y - 18]
      await page.mouse.move(...on(20)); await page.mouse.down(); await page.mouse.move(...on(50), { steps: 3 })
      const low = await read(page, 't.r.value.map(Math.round)')
      await page.mouse.move(...on(95), { steps: 3 }); await page.mouse.up()
      const stopped = await read(page, 't.r.value.map(Math.round)')
      await page.waitForTimeout(400)
      await page.mouse.click(...on(100))
      const high = await read(page, '[t.r.low, t.r.high, t.heard.at(-1)]')
      const [fx, fy] = await spot(page, 'f', 0.5, 1)
      await page.mouse.move(fx, fy - 30); await page.mouse.down(); await page.mouse.move(fx, fy - 30 - 60, { steps: 3 }); await page.mouse.up()
      return [low, stopped, high, await read(page, 'Math.round(t.f.value)')]
    },
    want: [[50, 80], [80, 80], [80, 100, [80, 100]], 60] },
]

/** Scenes laid out at every size of screen: each must be whole, apart, in the picture and big enough for a finger. */
export const MORE_LAID = {
  any: `let score = 1250
label("player")
number("lives", 0, 9, 3); number("cutoff", 20, 20000, 440, { unit: "Hz", step: 10 })
label("who")
textBox("name", "Ada"); textBox("city", { placeholder: "where?" })
row()
label("game")
readout("score", () => score, { size: "large" }); readout("time", 65, { format: "clock", size: "large" }); readout("speed", 12.5, { unit: "km/h" }); readout("status", "Ready")
row()
label("settings")
checkbox("sound", true); checkbox("show hints"); choose("mode", ["easy", "medium", "hard"], "medium"); choose("day", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "Wed")
radio("size", ["small", "medium", "large"], "medium"); dropdown("planet", ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"], "Earth")`,
  // Pads, colours, bars, lights and the sliders of other kinds.
  more: `label("pad")
xyPad("filter", [20, 20000], [0, 1]); colourPicker("ink", "tomato"); colourPicker("sky", "#3a7bd5")
label("doing")
progress("loading", 0.4); light("ready", true); light("warn", "red"); busy("working")
row()
label("mix")
rangeSlider("price", 0, 100, [20, 80]); fader("vol", 0, 1, 0.7); fader("pan", -1, 1, 0.25)`,
}

/** In the page: every control of these kinds is drawn alone on a clear canvas, and what it painted is measured against its box. */
export const SPILL = (kinds) => `(() => {
  const p = document.querySelector("#s canvas")[Symbol.for("dials.panel")], wrong = [], kinds = ${JSON.stringify(kinds)}
  const c = Object.assign(document.createElement("canvas"), { width: Math.ceil(p.W), height: Math.ceil(p.H) }), g = c.getContext("2d", { willReadFrequently: true })
  for (const item of p.items) {
    // One that is partly out of sight, on plates that have to be moved to see it, is not measured.
    if (!kinds.includes(item.kind) || item.hidden || !item.w || item.x < 0 || item.y < 0 || item.x + item.w > p.W || item.y + item.h > p.H) continue
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
