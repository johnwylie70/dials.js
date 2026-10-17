// Your own instrument: three controls made from scratch with custom(). A ribbon you drag along to play
// a scale, a ring that lights with how loud the sound is, and a row of steps that plays itself.
// Each one is a few lines: what it looks like (draw), what a finger does (onDown, onMove, onUp) and, for the
// ring, what it listens to (source). Press the ribbon first: the first touch lets the page make sound.
// Try changing: SCALE to [0, 2, 4, 7, 9, 12, 14, 16]; the colours; "lead" to "bell" or "pluck".
//
// Run it:   pictures run custom_instrument.js     (dials.js sits beside this file)

const { custom, dial, group, row, scope } = await use("dials.js")

const lead = makeSynth("lead")
const SCALE = [0, 2, 3, 5, 7, 8, 10, 12]        // A minor, from A3 (57)

// 1. A ribbon. Across is the note, and it snaps to the scale. Up the ribbon is how hard.
let sounding = null
const ribbon = custom("ribbon", {
  width: 340, height: 110, value: -1,
  draw(c) {
    c.rect(0, 0, c.width, c.height, c.theme.well, 10)
    SCALE.forEach((_, i) => {
      const x = (i + 0.5) * c.width / SCALE.length
      c.rect(x - c.width / 16 + 2, 4, c.width / 8 - 4, c.height - 8, i === c.value ? c.accent : c.theme.knob, 6)
    })
  },
  onDown: (p, c) => play(p, c),
  onMove: (p, c) => play(p, c),
  onUp: () => stop(),
})
function play(p, c) {
  const i = Math.max(0, Math.min(SCALE.length - 1, Math.floor(p.x / c.width * SCALE.length)))
  if (i === ribbon.value) return
  stop()
  sounding = 57 + SCALE[i]
  lead.noteOn(sounding, 0.9)
  ribbon.set(i)                                   // changes the value, redraws, and calls onChange
}
function stop() {
  if (sounding != null) lead.noteOff(sounding)
  sounding = null
  ribbon.value = -1
}

// 2. A ring that follows the sound. `source: lead` hands draw() the synth's level as c.level, every frame.
custom("level", {
  width: 120, height: 110, source: lead, animate: true,
  draw(c) {
    const r = 14 + 26 * c.level
    c.ring(c.width / 2, c.height / 2, 40, c.theme.track, 2)
    c.circle(c.width / 2, c.height / 2, r, c.level > 0.8 ? c.theme.hot : c.accent)
  },
})

row()

// 3. A row of steps that plays itself. onFrame is called every frame, so it can keep time.
const steps = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1]
let at = -1, last = 0
const tempo = dial("tempo", 60, 180, 110)
const seq = custom("steps", {
  width: 420, height: 56, animate: true,
  draw(c) {
    const w = c.width / steps.length
    steps.forEach((on, i) => {
      c.rect(i * w + 2, 6, w - 4, c.height - 12, on ? (i === at ? c.theme.text : c.accent) : (i === at ? c.theme.track : c.theme.knob), 5)
    })
  },
  onDown(p, c) {
    const i = Math.floor(p.x / c.width * steps.length)
    steps[i] = steps[i] ? 0 : 1
    seq.redraw()
  },
  onFrame(c, now) {
    const gap = 60000 / tempo.value / 4
    if (now - last < gap) return
    last = now
    at = (at + 1) % steps.length
    if (steps[at]) lead.play(45 + SCALE[(at % 4) * 2], 0.2)
  },
})

scope(lead, { width: 420 })

function draw() {
  background("#0b1020")
}
