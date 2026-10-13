/**
 * The cases for the controls of the second part of dials.js (a number box, a text box, a readout and
 * the rest), in the shapes test-dials.mjs runs: scenes that leave what they found in `result`, scenes
 * worked by hand, and scenes laid out at every size of screen. test-dials.mjs runs them all.
 */

/** The names a scene is given besides the first part's. */
export const MORE = 'const { number, stepper, textBox, readout, checkbox, choose, radio, dropdown, xyPad, colourPicker, colorPicker, progress, light, busy, rangeSlider, fader, joystick, dpad, actionButton, envelope, stepGrid, pads, wheel, modWheel, pitchWheel, steps, gatePattern, arpPattern, drumSeq } = lib\n'

/** The kinds of this part: at every size each is asked to draw, and must keep to its own box. */
export const MORE_KINDS = ['number', 'textBox', 'readout', 'checkbox', 'choose', 'radio', 'dropdown', 'xyPad', 'colourPicker', 'progress', 'light', 'busy', 'rangeSlider', 'fader', 'joystick', 'dpad', 'actionButton', 'envelope', 'stepGrid', 'pads', 'wheel', 'steps', 'gatePattern', 'arpPattern', 'drumSeq']
/** Those a finger works: on a touch screen none is smaller than a finger. */
export const MORE_TOUCHED = ['number', 'textBox', 'checkbox', 'choose', 'radio', 'dropdown', 'xyPad', 'colourPicker', 'rangeSlider', 'fader', 'joystick', 'dpad', 'actionButton', 'envelope', 'pads', 'wheel']

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
  { what: 'a joystick and a pad of arrows are at rest until they are pushed, and a round button is a button',
    source: `const stick = joystick(), pad = dpad("arrows", { ways: 4 }), fire = actionButton("A")
await drawn()
window.result = [stick.x, stick.y, stick.distance, stick.value, pad.left, pad.right, pad.up, pad.down, pad.x, pad.y, pad.ways, fire.held, fire.pressed, stick.kind, typeof stick.control.w, fire.w === fire.h]`,
    want: [0, 0, 0, [0, 0], false, false, false, false, 0, 0, 4, false, false, 'joystick', 'number', true] },
  { what: 'an envelope finds a target\'s attack, decay, sustain and release by name (or is given the names, or an object with the four numbers, or nothing) and sets them',
    source: `const lead = { v: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.8, a2: 0.1, d2: 0.2, s2: 0.3, r2: 0.4 }, describe: (n) => ({ attack: { min: 0.001, max: 2, unit: "s" }, decay: { min: 0.001, max: 2 }, sustain: { min: 0, max: 1 }, release: { min: 0.001, max: 4 } })[n], get(n) { return this.v[n] }, set(n, x) { this.v[n] = x } }
const plain = { attack: 0.5, decay: 0.5, sustain: 0.5, release: 1 }
const a = envelope("shape", lead), b = envelope("two", lead, "a2", "d2", "s2", "r2"), c = envelope(plain), d = envelope("alone", { attack: 0.2 })
const first = [a.value, a.attack, a.parts[3].max, b.value, c.value, c.parts[0].max, d.value, a.label]
a.attack = 1; a.value = [1, 1, 0.25, 9]; c.release = 1.5
lead.v.sustain = 0.9
await drawn()
window.result = [...first, lead.v.attack, lead.v.release, a.sustain, plain.release]`,
    want: [[0.02, 0.3, 0.6, 0.8], 0.02, 4, [0.1, 0.2, 0.3, 0.4], [0.5, 0.5, 0.5, 1], 2, [0.2, 0.3, 0.7, 0.5], 'shape', 1, 4, 0.9, 1.5] },
  { what: 'a grid of steps is rows of cells read and written by a row\'s name or number, with a column lit as the one playing; pads named for drums play those drums\' notes; a pitch wheel is a slider from -1 to 1',
    source: `const log = []
const kit = { noteOn: (note, velocity) => log.push("on " + note + " " + velocity), noteOff: (note) => log.push("off " + note) }
const g = stepGrid("drums", 8, ["kick", "snare"]), n = stepGrid(4, 2, { value: [[1, 0, 0, 1], [0, 0.5, 0, 0]] }), p = pads("kit", ["kick", "snare", "hat", "boom"], kit), q = pads(6), w = pitchWheel("bend"), m = modWheel("mod", 0, 127, 64)
g.put("kick", 0, true); g.put(1, 4, 0.5); g.put("kick", 99, true); g.step = 9
const first = [g.value, g.get("kick", 0), g.get("snare", 4), g.row("snare"), g.step, n.value, n.rows]
g.clear(); p.hit("snare", 0.5); p.lift("snare"); p.flash("hat")
window.result = [...first, g.row(0), p.notes, q.names.length, q.columns, log, [w.min, w.max, w.value, w.spring, w.vertical], [m.value, m.spring]]`,
    want: [[[1, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0.5, 0, 0, 0]], 1, 0.5, [0, 0, 0, 0, 0.5, 0, 0, 0], 1, [[1, 0, 0, 1], [0, 0.5, 0, 0]], ['1', '2'], [0, 0, 0, 0, 0, 0, 0, 0], [36, 38, 42, 39], 6, 3, ['on 38 0.5', 'off 38'], [-1, 1, 0, true, true], [64, false]] },
  { what: 'a pattern is a list and is the text the sound engine reads, and either may be set: a lane of steps, a gate with levels in ninths, an arpeggio with rests, ties, octaves, accents, slides and lengths, a built-in pattern by its name, and a drum sequencer with a line for each drum',
    source: `const lane = steps("accent", 8), gate = gatePattern("gate", "x.5.9..3"), arp = arpPattern("arp", "1 - 3 2 _ 1^ ~3 5':4"), seq = drumSeq(["kick", "snare"], { steps: 8 })
lane.text = "x..x|x.X."; seq.text = "kick: x...x...\\nsnare: ..X...x."
const first = [lane.value, lane.steps[6], lane.length, gate.value.map((v) => Math.round(v * 9)), gate.text, gate.length, arp.text, arp.value[4], arp.value[7], arp.value[6].slide, arp.value[1].note, seq.value, seq.text, seq.steps[1][2].accent]
lane.value = [1, 0, 0.5, true]; gate.put(1, 3 / 9); arp.value = [1, 0, "2'", { note: 3, octave: -1, accent: true, length: 6 }, "~4"]; seq.put("snare", 0, true); seq.pattern = "backbeat"
const set = [lane.text, lane.length, gate.text, arp.text, arp.length, seq.get("kick", 0), seq.text.split("\\n")[1]]
gate.text = "pump"; arp.text = "acid"; arp.length = 6
window.result = [...first, ...set, gate.text, gate.length, arp.text, arp.rows]`,
    want: [[1, 0, 0, 1, 1, 0, 1, 0], { on: true, level: 1, accent: true }, 8, [9, 0, 5, 0, 9, 0, 0, 3], 'x.5.x..3', 8, "1 - 3 2 _ 1^ ~3 5':4", { note: 0, octave: 0, tie: true, accent: false, slide: false, length: 0 }, { note: 5, octave: 1, tie: false, accent: false, slide: false, length: 4 }, true, 0,
      [[1, 0, 0, 0, 1, 0, 0, 0], [0, 0, 1, 0, 0, 0, 1, 0]], 'x...x...\n..X...x.', true, 'x.5x', 4, 'x35.x..3', "1 - 2' 3,^:6 ~4", 5, 1, '....X...', '2468246824682468', 16, "1^ 1 ~3 - 1' ~1", 8] },
  { what: 'a pattern tied to a target is found by a synth\'s names for it, read and written as text, expanded from a name, follows the target, lights the step the target says is sounding, and has the target\'s named patterns and settings made beside it',
    source: `const P = { gatePattern: { kind: "pattern", steps: 24, patterns: { mine: "xx..", pump: "2468" } }, gateDepth: { min: 0, max: 1 }, gateRate: { min: 0.25, max: 16 }, gateStereo: { kind: "bool" }, arpPattern: { kind: "pattern", steps: 32 } }
// As a synth keeps them: get() is always the text ("" for none), and the step that is sounding is a setting to read.
const lead = { v: { gatePattern: "x.x.", gateDepth: 0.5, gateRate: 4, gateStereo: 0, arpPattern: "", levels: [1, 0, 0.5], gateStep: 2, arpStep: -1 }, describe: (n) => P[n], get(n) { return this.v[n] }, set(n, x) { this.v[n] = x } }
const gate = gatePattern("gate", lead), arp = arpPattern(lead), list = steps("levels", lead, "levels")
await drawn()
const beside = dials().all.map((c) => c.kind + " " + c.label)
const first = [gate.text, gate.lane.most, gate.step, arp.text, arp.step, lead.v.arpPattern, list.value, beside, dials().all[1].choices]
gate.put(1, true); arp.preset("bounce"); list.put(1, 1); gate.preset("mine")
const wrote = [lead.v.gatePattern, lead.v.arpPattern, lead.v.levels]
lead.v.gatePattern = "x..5..x."; lead.v.gateStep = 5; lead.v.arpPattern = "trance"; lead.v.arpStep = 3
await drawn()
window.result = [...first, wrote, gate.text, gate.length, gate.step, arp.text, arp.step]`,
    want: ['x.x.', 24, 2, '1 2 3 4', -1, '', [1, 0, 0.5], ['gatePattern ', 'select pattern', 'dial depth', 'dial rate', 'toggle stereo', 'arpPattern ', 'select pattern', 'steps levels'], ['yours', 'mine', 'pump'], ['xx..', '1 2 3 2', [1, 1, 0.5]], 'x..5..x.', 8, 5, '1^ - 3 2 - 1^ 3 -', 3] },
  { what: 'a drum sequencer plays by itself: each step that is on is handed to its row\'s target a little before it is due, with the time it is to sound, in order, swung and not when muted; and the column that is lit follows the clock',
    source: `const log = [], heard = []
const clock = { t: 10, time() { return this.t } }
const kit = { noteOn: (note, velocity, when) => log.push([note, velocity, Math.round(when.at * 1000)]), noteOff() {} }
const seq = drumSeq("beat", ["kick", "hat"], kit, { steps: 4, tempo: 150, clock: () => clock.t, value: ["X.x.", "xxxx"], swing: 0.5, onStep: (row, step, velocity) => heard.push(row + step) })
seq.mute("hat")
seq.play()
await drawn()
const early = [log.length, seq.step]
clock.t = 10.21
await drawn()
const one = [log.map((l) => l.join()), seq.step]
seq.mute("hat", false); clock.t = 10.46
await drawn()
seq.stop()
window.result = [early, one, log.slice(1).map((l) => l[0] + "@" + l[2]), heard, seq.step, seq.playing]`,
    // At 150 beats a minute a step is a tenth of a second, and every other one is half a step late: the first is due at 10.05.
    want: [[1, -1], [['36,1,10050', '36,0.7,10250'], 1], ['36@10250', '42@10400', '36@10450', '42@10450', '42@10600'], ['kick0', 'kick2', 'hat3', 'kick0', 'hat0', 'hat1'], -1, false] },
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
  { what: 'a joystick follows a thumb, no further than its rim, and springs back when it is let go; another finger presses a round button meanwhile; and one that floats appears where the thumb lands',
    setup: `const heard = []
const stick = joystick({ onChange: (x, y) => heard.push([x, y]) }), fire = actionButton("A"), flo = joystick({ floating: true })
window.t = { c: stick.control, stick, fire, f: flo.control, flo, heard }`,
    async act(page, { spot, read, finger }) {
      const mid = await spot(page, 'c')
      await finger(page, 'pointerdown', 11, mid)
      const still = await read(page, 't.stick.value')
      const reach = await read(page, 't.c.shape(t.c.u).reach')
      await finger(page, 'pointermove', 11, [mid[0] + reach / 2, mid[1]])
      const half = await read(page, '[t.stick.x, t.stick.y, t.stick.distance, t.stick.angle].map((n) => Math.round(n * 100) / 100)')
      await finger(page, 'pointermove', 11, [mid[0], mid[1] - 400])
      const up = await read(page, '[t.stick.x, t.stick.y, t.stick.distance, Math.round(t.stick.angle * 100)]')
      const a = await spot(page, 'fire')
      await finger(page, 'pointerdown', 12, a)
      const both = await read(page, '[t.fire.held, t.c.held, t.stick.y]')
      await finger(page, 'pointerup', 12, a); await finger(page, 'pointerup', 11, [mid[0], mid[1] - 400])
      const let_go = await read(page, '[t.stick.value, t.fire.pressed, t.heard.length, t.heard.at(-1)]')
      const land = await spot(page, 'f', 0.3, 0.6)
      await finger(page, 'pointerdown', 11, land)
      const landed = await read(page, '(() => { const s = t.f.shape(t.f.u), b = document.querySelector("#s canvas").getBoundingClientRect(); return [Math.round(b.left + s.x), Math.round(b.top + s.y), t.flo.value] })()')
      await finger(page, 'pointermove', 11, [land[0] + 500, land[1]])
      const right = await read(page, 't.flo.x')
      await finger(page, 'pointerup', 11, land)
      return [still, half, up, both, let_go, landed.join() === [...land.map(Math.round), 0, 0].join(), right, await read(page, 't.flo.value')]
    },
    want: [[0, 0], [0.5, 0, 0.5, 0], [0, -1, 1, -157], [true, true, -1], [[0, 0], true, 3, [0, 0]], true, 1, [0, 0]] },
  { what: 'a pad of arrows says which are pressed as a thumb slides round it, two at once between them (or one, told four ways), and one told to be keys holds the arrow keys down for the scene, as a round button holds its key',
    setup: `const pad = dpad({ asKeys: true }), four = dpad({ ways: 4, asKeys: "wasd" }), jump = actionButton("jump", { key: "space" }), n = number("n", 0, 9, 5)
const downs = []
function onKeyDown(key) { downs.push(key) }
window.t = { c: pad.control, pad, d: four.control, four, jump, n, downs, keys: () => [...keys].sort() }`,
    async act(page, { spot, read, finger, settle }) {
      // The number box is touched first: it has the keys, and must not take the ones the pad presses for the scene.
      await page.mouse.click(...await spot(page, 'n', 0.5, 0.1))
      const at = (name, fx, fy) => spot(page, name, fx, fy)
      await finger(page, 'pointerdown', 11, await at('c', 0.12, 0.5))
      await settle(page)
      const left = await read(page, '[t.pad.left, t.pad.right, t.pad.up, t.pad.down, t.pad.x, t.pad.y, t.keys()]')
      await finger(page, 'pointermove', 11, await at('c', 0.15, 0.15))
      await settle(page)
      const upLeft = await read(page, '[t.pad.left, t.pad.up, t.pad.x, t.pad.y, t.keys()]')
      await finger(page, 'pointermove', 11, await at('c', 0.5, 0.5))
      const middle = await read(page, 't.pad.value')
      await finger(page, 'pointermove', 11, await at('c', 0.5, 0.9))
      await finger(page, 'pointerdown', 12, await at('jump'))
      await settle(page)
      const downAndJump = await read(page, '[t.pad.down, t.pad.y, t.keys()]')
      await finger(page, 'pointerup', 11, await at('c', 0.5, 0.9)); await finger(page, 'pointerup', 12, await at('jump'))
      await settle(page)
      const none = await read(page, '[t.pad.value, t.keys()]')
      await finger(page, 'pointerdown', 11, await at('d', 0.15, 0.15))
      const one = await read(page, 'Math.abs(t.four.x) + Math.abs(t.four.y)')
      await finger(page, 'pointermove', 11, await at('d', 0.9, 0.5))
      await settle(page)
      const wasd = await read(page, '[t.four.right, t.keys()]')
      await finger(page, 'pointerup', 11, await at('d', 0.9, 0.5))
      return [left, upLeft, middle, downAndJump, none, one, wasd, await read(page, '[t.n.value, t.downs.includes("ArrowLeft") && t.downs.includes(" ")]')]
    },
    want: [[true, false, false, false, -1, 0, ['ArrowLeft']], [true, true, -1, -1, ['ArrowLeft', 'ArrowUp']], [0, 0], [true, 1, [' ', 'ArrowDown']], [[0, 0], []], 1, [true, ['d']], [5, true]] },
  { what: 'the corners of an envelope are dragged: the first sets the attack, the second the decay across and the sustain up and down, the last the release; and two taps put the shape back',
    setup: `const heard = []
const lead = { attack: 0.5, decay: 0.5, sustain: 0.5, release: 0.5 }
window.t = { e: envelope("shape", lead, { width: 300, height: 200, onChange: (a, d, s, r) => heard.push([a, d, s, r]) }), lead, heard,
  corner: (i) => { const p = t.e.shape(t.e.u).points[i], b = canvas.getBoundingClientRect(); return [b.left + p[0], b.top + p[1]] }, span: () => { const s = t.e.shape(t.e.u); return [s.w * 0.27, s.h] } }`,
    async act(page, { read }) {
      const corner = (i) => read(page, `t.corner(${i})`), [part, tall] = await read(page, 't.span()')
      const drag = async (i, dx, dy) => { const [x, y] = await corner(i); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(400) }
      const two = (list) => list.map((n) => Math.round(n * 20) / 20)       // to the nearest twentieth: a pointer is on whole pixels
      await drag(1, part / 4, 0)
      const attack = two(await read(page, 't.e.value'))
      await drag(2, -part / 4, -tall / 4)
      const decay = two(await read(page, 't.e.value'))
      await drag(4, 5000, 0)
      const release = two(await read(page, '[t.lead.attack, t.lead.decay, t.lead.sustain, t.lead.release]'))
      const heard = await read(page, 't.heard.length > 3 && t.heard.at(-1).length === 4')
      const [x, y] = await corner(3)
      await page.mouse.click(x, y); await page.mouse.click(x, y)
      return [attack, decay, release, heard, await read(page, 't.e.value')]
    },
    want: [[1, 0.5, 0.5, 0.5], [1, 0, 0.75, 0.5], [1, 0, 0.75, 2], true, [0.5, 0.5, 0.5, 0.5]] },
  { what: 'a tap turns a step on or off and a finger dragged along turns on every step it crosses; pads are hit several at once, each harder the nearer its middle, and play their target for as long as they are held',
    setup: `const heard = [], log = []
const kit = { noteOn: (note, velocity) => log.push("on " + note), noteOff: (note) => log.push("off " + note) }
window.t = { g: stepGrid("drums", 8, ["kick", "snare"], { onChange: (row, step, on) => heard.push(row + " " + step + " " + on) }), p: pads("kit", ["kick", "snare", "hat", "clap"], kit, { onNoteOn: (note, velocity, name) => heard.push(name + (velocity > 0.8 ? " hard" : velocity < 0.6 ? " soft" : "")) }), heard, log,
  cell: (r, s) => { const c = t.g.spotOf(r, s, t.g.u), b = canvas.getBoundingClientRect(); return [b.left + c.x + c.w / 2, b.top + c.y + c.h / 2] } }`,
    async act(page, { spot, read, finger }) {
      const cell = (r, s) => read(page, `t.cell(${r}, ${s})`)
      await page.mouse.click(...await cell(0, 2))
      const tapped = await read(page, '[t.g.get("kick", 2), t.heard]')
      await page.waitForTimeout(400)
      await finger(page, 'pointerdown', 11, await cell(1, 1))
      for (const s of [2, 3, 4]) await finger(page, 'pointermove', 11, await cell(1, s))
      await finger(page, 'pointerup', 11, await cell(1, 4))
      const painted = await read(page, 't.g.row("snare")')
      await page.mouse.click(...await cell(0, 2))
      const off = await read(page, 't.g.row("kick")')
      // Two pads at once: the kick in its middle, the clap near its corner.
      const kick = await spot(page, 'p', 0.25, 0.3), clap = await spot(page, 'p', 0.95, 0.93)
      await finger(page, 'pointerdown', 11, kick); await finger(page, 'pointerdown', 12, clap)
      const both = await read(page, '[t.p.value, t.log]')
      await finger(page, 'pointerup', 11, kick); await finger(page, 'pointerup', 12, clap)
      return [tapped, painted, off, both, await read(page, '[t.p.value, t.log.slice(2), t.heard.slice(-2)]')]
    },
    want: [[1, ['kick 2 1']], [0, 1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [[0, 3], ['on 36', 'on 39']], [[], ['off 36', 'off 39'], ['kick hard', 'clap soft']]] },
  { what: 'a pitch wheel is rolled and rolls back when it is let go; a mod wheel stays where it is put',
    setup: `window.t = { w: pitchWheel("bend", { size: 100 }), m: modWheel("mod", 0, 100, 0, { size: 100 }) }`,
    async act(page, { spot, read }) {
      let [x, y] = await spot(page, 'w')
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 25, { steps: 3 })
      const rolled = await read(page, 'Math.round(t.w.value * 100) / 100');
      await page.mouse.up()
      const back = await read(page, 't.w.value');
      [x, y] = await spot(page, 'm', 0.5, 1)
      await page.mouse.move(x, y - 30); await page.mouse.down(); await page.mouse.move(x, y - 30 - 40, { steps: 3 }); await page.mouse.up()
      return [rolled, back, await read(page, 'Math.round(t.m.value)')]
    },
    want: [0.5, 0, 40] },
  { what: 'a gate\'s steps are tapped on and off, set by how high the finger is and drawn across; its length is changed with the − and +; an arpeggio\'s cell is tapped for a note and again for a rest, dragged sideways to hold it on, and in the lanes under the grid given an accent, a slide, an octave and a length of its own',
    setup: `const heard = []
window.t = { g: gatePattern("gate", 8, { onChange: () => heard.push(t.g.text) }), a: arpPattern("arp", "1 2 3 4"), heard,
  bar: (i, down) => { const c = t.g.spotOf(i, t.g.u), b = canvas.getBoundingClientRect(); return [b.left + c.x + c.w / 2, b.top + c.y + c.h * down] },
  cell: (i, row) => { const s = t.a.grid(t.a.u), b = canvas.getBoundingClientRect(); return [b.left + s.x + (i + 0.5) * s.w, b.top + (row < 0 ? s.under + (-row - 1) * 24 * t.a.u + 11 * t.a.u : s.y + (t.a.rows - 1 - row + 0.5) * s.h)] },
  count: (c, side) => { const b = canvas.getBoundingClientRect(); return [b.left + c.x + c.w - (side < 0 ? 73 : 19) * c.u, b.top + c.y + 13 * c.u] } }`,
    async act(page, { read, finger }) {
      const bar = (i, down) => read(page, `t.bar(${i}, ${down})`), cell = (i, row) => read(page, `t.cell(${i}, ${row})`)
      await page.mouse.click(...await bar(0, 0.5)); await page.waitForTimeout(400)
      await page.mouse.click(...await bar(2, 0.5)); await page.waitForTimeout(400)
      await page.mouse.click(...await bar(2, 0.5)); await page.waitForTimeout(400)
      const tapped = await read(page, 't.g.text')
      await finger(page, 'pointerdown', 11, await bar(4, 0.1)); await finger(page, 'pointermove', 11, await bar(4, 0.5)); await finger(page, 'pointermove', 11, await bar(5, 0.67)); await finger(page, 'pointermove', 11, await bar(6, 0.2)); await finger(page, 'pointerup', 11, await bar(6, 0.2))
      const drawn = await read(page, '[t.g.text, t.heard.at(-1)]')
      await page.mouse.click(...await read(page, 't.count(t.g, 1)')); await page.waitForTimeout(400)
      await page.mouse.click(...await read(page, 't.count(t.g, 1)')); await page.waitForTimeout(400)
      await page.mouse.click(...await read(page, 't.count(t.g, -1)'))
      const longer = await read(page, '[t.g.length, t.g.text]')
      await page.mouse.click(...await cell(1, 0)); await page.waitForTimeout(400)
      await page.mouse.click(...await cell(3, 3)); await page.waitForTimeout(400)
      const noted = await read(page, 't.a.text')
      const from = await cell(0, 4)
      await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(...await cell(2, 4), { steps: 3 }); await page.mouse.move(...await cell(1, 4), { steps: 2 }); await page.mouse.up()
      const tied = await read(page, 't.a.text')
      // The lanes under the grid, from the top: an accent, a slide, an octave (tapped twice), a length (tapped: half a step; dragged up: longer).
      await page.mouse.click(...await cell(2, -1)); await page.waitForTimeout(400)
      await page.mouse.click(...await cell(2, -2)); await page.waitForTimeout(400)
      await page.mouse.click(...await cell(0, -3)); await page.waitForTimeout(400)
      await page.mouse.click(...await cell(0, -3)); await page.waitForTimeout(400)
      await page.mouse.click(...await cell(2, -4)); await page.waitForTimeout(400)
      const [x, y] = await cell(0, -4)
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 16, { steps: 3 }); await page.mouse.up()
      await page.mouse.click(...await cell(3, -1))
      return [tapped, drawn, longer, noted, tied, await read(page, 't.a.text')]
    },
    want: ['x.......', ['x...537.', 'x...537.'], [9, 'x...537..'], '1 1 3 -', '5 _ 3 -', "5'':3 _ ~3^:5 -"] },
  { what: 'a drum sequencer\'s steps are tapped and painted, leaned up on for an accent, its rows muted and heard by their names, and its own strip plays and stops it, sets its tempo, picks a pattern and clears it',
    setup: `const log = []
const kit = { noteOn: (note) => log.push(note), noteOff() {} }
window.t = { s: drumSeq("beat", ["kick", "snare", "hat"], kit, { tempo: 100 }), log,
  cell: (r, s) => { const c = t.s.spotOf(r, s, t.s.u), b = canvas.getBoundingClientRect(); return [b.left + c.x + c.w / 2, b.top + c.y + c.h / 2] },
  part: (name) => { const p = t.s.parts(t.s.u)[name], b = canvas.getBoundingClientRect(); return [b.left + p.x + p.w / 2, b.top + p.y + p.h / 2] },
  name: (r, fx) => { const b = canvas.getBoundingClientRect(), u = t.s.u; return [b.left + t.s.x + fx * u, b.top + t.s.y + (34 + r * 30 + 15) * u] } }`,
    async act(page, { read, finger }) {
      const cell = (r, s) => read(page, `t.cell(${r}, ${s})`), part = (name) => read(page, `t.part("${name}")`)
      await page.mouse.click(...await cell(0, 0)); await page.waitForTimeout(400)
      await finger(page, 'pointerdown', 11, await cell(2, 1)); for (const s of [2, 3]) await finger(page, 'pointermove', 11, await cell(2, s)); await finger(page, 'pointerup', 11, await cell(2, 3))
      const at = await cell(1, 4)
      await finger(page, 'pointerdown', 11, at); await finger(page, 'pointermove', 11, [at[0], at[1] - 30]); await finger(page, 'pointerup', 11, [at[0], at[1] - 30])
      const drawn = await read(page, 't.s.text.split("\\n").map((line) => line.slice(0, 6))')
      await page.mouse.click(...await read(page, 't.name(1, 40)')); await page.waitForTimeout(400)
      await page.mouse.click(...await read(page, 't.name(2, 16)')); await page.waitForTimeout(400)
      const named = await read(page, '[t.log, t.s.muted]')
      await page.mouse.click(...await part('faster')); await page.waitForTimeout(400)
      await page.mouse.click(...await part('play'))
      await page.waitForTimeout(700)
      const playing = await read(page, '[t.s.tempo, t.s.playing, t.s.step >= 0, t.log.includes(36), t.log.includes(42)]')
      await page.mouse.click(...await part('play')); await page.waitForTimeout(400)
      await page.mouse.click(...await part('pattern')); await page.waitForTimeout(400)
      const preset = await read(page, '[t.s.playing, t.s.pattern, t.s.row_ == null && t.s.get("kick", 4)]')
      await page.mouse.click(...await part('clear'))
      return [drawn, named, playing, preset, await read(page, 't.s.text.includes("x")')]
    },
    want: [['x.....', '....X.', '.xxx..'], [[38], [false, false, true]], [101, true, true, true, false], [false, 'four on the floor', 1], false] },
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
  // A game's controls in a strip along the bottom, with the scene in the room that is left.
  games: `group({ at: "bottom" }, () => { joystick(); dpad(); spacer(); actionButton("B", { size: "small" }); actionButton("A") })
function draw() { background("#16324f"); const r = room(); rect(r.x, r.y, r.width, r.height, "#1f5f8b") }`,
  music: `label("voice")
envelope("shape"); pitchWheel("bend"); modWheel("mod")
row()
label("beat")
stepGrid("drums", 16, ["kick", "snare", "hat"]); pads("kit", ["kick", "snare", "hat", "clap"])`,
  patterns: `gatePattern("gate", "x.x.x5x.X.3.xx..")
row()
arpPattern("arp", "1 - 3 2 _ 1^ ~3 2':5")
row()
steps("accent", 16); row()
drumSeq("beat", ["kick", "snare", "hat", "clap"], { pattern: "backbeat" })`,
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
