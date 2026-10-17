// A level meter and a scope of your own, listening to a synth. `source: lead` hands draw() what the synth is
// doing, every frame: c.level (how loud, 0 to 1) and c.samples (its wave, numbers from -1 to 1). Both are
// drawn here the way you like: a bar that holds its peak, and a line that fills.
// Play the keys A S D F G H J.
// Try changing: "lead" to "bass"; the colours; PEAK_HOLD; draw the wave as dots with c.circle.
//
// Run it:   pictures run custom_meter.js     (dials.js sits beside this file)

const { custom, keyboard, row } = await use("dials.js")

const lead = makeSynth("lead")
const PEAK_HOLD = 1.2                   // seconds a peak stays before it falls
let peak = 0, peakAt = 0

// A vertical meter with a peak mark.
custom("level", {
  width: 70, height: 150, source: lead, animate: true,
  draw(c) {
    const now = performance.now() / 1000
    if (c.level >= peak || now - peakAt > PEAK_HOLD) { peak = Math.max(c.level, peak - 0.01); if (c.level >= peak) peakAt = now }
    const top = 8, tall = c.height - 16
    c.rect(c.width / 2 - 14, top, 28, tall, c.theme.well, 6)
    const fill = tall * Math.min(1, c.level)
    c.rect(c.width / 2 - 14, top + tall - fill, 28, fill, c.level > 0.85 ? c.theme.hot : c.level > 0.6 ? c.theme.warn : c.theme.good, 6)
    c.line(c.width / 2 - 18, top + tall - tall * peak, c.width / 2 + 18, top + tall - tall * peak, c.theme.text, 2)
  },
})

// A scope: the line, with the room under it filled.
custom("wave", {
  width: 360, height: 150, source: lead, animate: true,
  draw(c) {
    c.rect(0, 0, c.width, c.height, c.theme.well, 8)
    c.line(0, c.height / 2, c.width, c.height / 2, c.theme.track, 1)
    const s = c.samples
    if (!s || !s.length) return
    const points = []
    for (let i = 0; i < s.length; i += 4) points.push([i / s.length * c.width, c.height / 2 - s[i] * c.height * 0.4])
    c.lines(points, c.accent, 2)
  },
})

keyboard(lead, { octave: 4 })

function draw() {
  background("#0b1020")
}
