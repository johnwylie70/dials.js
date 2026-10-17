// Your own analyser: a level meter in dB, the spectrum as bars with peaks that hold, and the wave, drawn by custom().
// It listens to the synth with source: lead, which gives draw() c.level, c.samples and c.spectrum every frame, and it is drawn for
// a size of 640 by 300 (design): the control scales that to fit whatever box it is given, centres it and cuts anything outside.
// Press and hold keys A S D F G H J to hear and see it.
// Try changing: bands to 24 or 96; the colours; the dB scale of the level; what is drawn in the wave strip.
//
// Run it:   pictures run custom_analyser.js     (dials.js sits beside this file)

const { custom, label, keyboard, select, dial } = await use("dials.js")

const lead = makeSynth("lead")
select("wave", lead, "wave")
dial("cutoff", lead, "cutoff")

const BANDS = 48
const bars = new Array(BANDS).fill(0), tops = new Array(BANDS).fill(0), held = new Array(BANDS).fill(0)
let vu = 0, vuTop = 0, vuAt = 0, last = performance.now() / 1000

label("analyser")
custom({
  width: 640, height: 300, design: [640, 300], bands: BANDS, source: lead, animate: true,
  draw(c) {
    const now = performance.now() / 1000, dt = Math.min(0.1, now - last)
    last = now
    c.clear(c.theme.well)
    // level: dB from -60 to 0 as thirty lights, green, then amber from -12, then red from -3, with a peak that holds
    const db = 20 * Math.log10(Math.max(c.level, 1e-4))
    vu = Math.max(0, Math.min(1, (db + 60) / 60))
    if (vu >= vuTop) { vuTop = vu; vuAt = now } else if (now - vuAt > 1) vuTop = Math.max(vu, vuTop - 0.5 * dt)
    c.text("LEVEL", 36, 14, c.theme.dim, 10)
    for (const mark of [0, -12, -24, -48]) {
      const y = 24 + 180 * (1 - (mark + 60) / 60)
      c.line(22, y, 50, y, c.theme.edge, 1)
      c.text(String(mark), 64, y, c.theme.dim, 9, "left")
    }
    for (let i = 0; i < 30; i++) {
      const at = -60 + 2 * i, colour = at >= -3 ? c.theme.hot : at >= -12 ? c.theme.warn : c.theme.good
      c.rect(22, 24 + 180 - 6 * (i + 1) + 1, 28, 4, vu * 60 - 60 >= at ? colour : c.theme.knob, 1)
    }
    c.rect(22, 24 + 180 * (1 - vuTop) - 2, 28, 2, c.theme.text)
    // spectrum: bars that rise at once and fall away, with a tick that holds
    c.text("SPECTRUM", 100, 14, c.theme.dim, 10, "left")
    const left = 100, width = 520, top = 24, tall = 180, each = width / BANDS
    for (const mark of [-20, -40, -60]) {
      const y = top + tall * (1 - (mark + 90) / 90)
      c.line(left, y, left + width, y, c.theme.edge, 1)
      c.text(String(mark), left + width - 2, y - 6, c.theme.dim, 9, "right")
    }
    for (let i = 0; i < BANDS; i++) {
      bars[i] = Math.max(c.spectrum[i] || 0, bars[i] - 1.2 * dt)
      if (bars[i] >= tops[i]) { tops[i] = bars[i]; held[i] = now } else if (now - held[i] > 0.7) tops[i] = Math.max(bars[i], tops[i] - 0.5 * dt)
      c.rect(left + i * each + 1, top + tall * (1 - bars[i]), each - 2, tall * bars[i], bars[i] < 0.9 ? c.accent : c.theme.hot)
      if (tops[i] > 0.02) c.rect(left + i * each + 1, top + tall * (1 - tops[i]) - 2, each - 2, 2, c.theme.text)
    }
    for (const [hz, name] of [[100, "100"], [1000, "1k"], [10000, "10k"]]) c.text(name, left + width * Math.log(hz / 30) / Math.log(18000 / 30), top + tall + 12, c.theme.dim, 9)
    // the wave itself
    c.text("WAVE", 22, 236, c.theme.dim, 10, "left")
    c.line(100, 262, 620, 262, c.theme.edge, 1)
    if (c.samples && c.samples.length) c.lines(Array.from(c.samples, (v, i) => [100 + 520 * i / (c.samples.length - 1), 262 - 24 * v]), c.accent, 1.5)
  },
})

keyboard(lead, { octave: 3, octaves: 2 })

function draw() {
  background("#0b1020")
}
