// Trance: a chord whose loudness is chopped by a gate, and a lead that runs up and down its notes.
// Both patterns are yours to draw: the gate's bars, and the arpeggio's notes, rests, ties and accents.
// Try changing: the chord; "1 3 2 4" for the arpeggio; the gate to "x..x..x." and its length to 8.
//
// Run it:   pictures run trance.js     (dials.js sits beside this file)

const { gatePattern, arpPattern, number, toggle, row } = await use("dials.js")
const { makeSynth } = await use("standin-synth.js")   // a stand-in until synths.js is ready: then delete this line

const pad = makeSynth({ wave: "saw", attack: 0.01, release: 0.2, filter_cutoff: 1800 })
const lead = makeSynth({ wave: "square", attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.1 })
const chord = [57, 60, 64, 67]                         // A, C, E and G: the notes the arpeggio counts from 1

const tempo = number("tempo", 80, 180, 138, { unit: "bpm" })
const playing = toggle("play", false)
row()
const gate = gatePattern("gate", "x.x.xxx.x.x.x5x.")
row()
const arp = arpPattern("arp", "1 3 2 4 3^ 2 4! 1^")

let time = 0, step = -1, on = false, held = null

function update(dt) {
  if (playing.on !== on) {
    // Play: the chord is held under the gate. Stop: everything is let go.
    on = playing.on
    for (const note of chord) on ? pad.noteOn(note - 12, 0.6) : pad.noteOff(note - 12)
    if (!on && held != null) { lead.noteOff(held); held = null }
  }
  if (!on) return
  time += dt
  const now = Math.floor(time / (60 / tempo / 4))      // four steps to a beat
  if (now === step) return
  step = now
  gate.step = step                                     // light the step that is sounding
  arp.step = step
  pad.set("volume", 0.1 + 0.6 * gate.value[step % gate.length])
  const s = arp.value[step % arp.length]               // { note, octave, tie, accent, slide }
  if (s.tie) return                                    // the note before is held on
  if (held != null) lead.noteOff(held)
  held = s.note ? chord[(s.note - 1) % chord.length] + 12 * s.octave : null
  if (held != null) lead.noteOn(held, s.accent ? 1 : 0.7)
}
