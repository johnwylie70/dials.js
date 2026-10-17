// A chord pad: a control made from scratch that plays a chord each time a square is pressed.
// Nothing in dials.js draws it: draw() paints the squares, onDown() and onUp() play and stop the chord.
// Tap a square (or hold and slide to another one). The first touch lets the page make sound.
// Try changing: CHORDS; the colours; "pad" to "strings" or "organ".
//
// Run it:   pictures run custom_pad.js     (dials.js sits beside this file)

const { custom, dial, group } = await use("dials.js")

const synth = makeSynth("pad")
const CHORDS = [
  ["Am", ["A3", "C4", "E4"]], ["F", ["F3", "A3", "C4"]], ["C", ["C4", "E4", "G4"]], ["G", ["G3", "B3", "D4"]],
  ["Dm", ["D4", "F4", "A4"]], ["Em", ["E4", "G4", "B4"]], ["E", ["E3", "G#3", "B3"]], ["Am up", ["A4", "C5", "E5"]],
]
const COLUMNS = 4
let playing = false

group("pad", () => {
  dial("release", synth, "release")
  dial("reverb", synth, "reverb")
})

const pad = custom("chords", {
  width: 320, height: 150, value: -1,
  draw(c) {
    const w = c.width / COLUMNS, h = c.height / 2
    CHORDS.forEach(([name], i) => {
      const x = (i % COLUMNS) * w, y = Math.floor(i / COLUMNS) * h, on = i === c.value
      c.rect(x + 3, y + 3, w - 6, h - 6, on ? c.accent : c.theme.knob, 8)
      c.text(name, x + w / 2, y + h / 2, on ? c.theme.well : c.theme.text, 16)
    })
  },
  onDown: (p, c) => hit(p, c),
  onMove: (p, c) => hit(p, c),
  onUp: () => release(),
})

function hit(p, c) {
  const i = Math.max(0, Math.min(CHORDS.length - 1, Math.floor(p.x / (c.width / COLUMNS)) + COLUMNS * Math.floor(p.y / (c.height / 2))))
  if (i === pad.value) return
  release()
  const [, notes] = CHORDS[i]
  playing = true
  synth.play(notes, 4, 0.8)              // a list of notes is a chord; it rings until it is let go
  pad.set(i)
}
function release() {
  if (playing) synth.stop()
  playing = false
  pad.value = -1
}

function draw() {
  background("#0b1020")
}
