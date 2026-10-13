// Drum machine: a grid of steps to fill in, pads to hit by hand, a tempo to set and the shape of
// each hit to drag. Touch a pad first, so the page may make sound.
// Try changing: 16 steps to 8; the note each row plays; add a fourth row, "clap".
//
// Run it:   pictures run drum_machine.js     (dials.js sits beside this file)

const { stepGrid, pads, number, toggle, envelope, row } = await use("dials.js")
const { makeSynth } = await use("standin-synth.js")   // a stand-in until synths.js is ready: then delete this line

const kit = makeSynth({ wave: "square", attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 })
const rows = ["kick", "snare", "hat"], notes = [36, 50, 84]      // the note each row plays

const tempo = number("tempo", 60, 200, 110, { unit: "bpm" })
const playing = toggle("play", true)
envelope("shape", kit)
row()
const grid = stepGrid("beat", 16, rows, { value: [
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
] })
const hits = pads("kit", rows, kit, { notes })

let time = 0, step = -1, sounding = []

function update(dt) {
  if (!playing.on) return
  time += dt
  const now = Math.floor(time / (60 / tempo / 4)) % 16           // four steps to a beat
  if (now === step) return
  step = now
  grid.step = step                                               // light the column that is playing
  for (const note of sounding) kit.noteOff(note)
  sounding = []
  rows.forEach((name, i) => {
    if (!grid.get(name, step)) return
    kit.noteOn(notes[i], 0.9)
    sounding.push(notes[i])
    hits.flash(name)
  })
}
