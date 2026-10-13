// Drum machine: a sequencer that plays by itself, pads to hit by hand, and the shape of each hit
// to drag. Press play (the first touch lets the page make sound), then tap steps on and off.
// Try changing: the drums and the note each plays; pattern: "breakbeat"; steps: 32.
//
// Run it:   pictures run drum_machine.js     (dials.js sits beside this file)

const { drumSeq, pads, envelope, row } = await use("dials.js")
const { makeSynth } = await use("standin-synth.js")   // a stand-in until synths.js is ready: then delete this line

const kit = makeSynth({ wave: "square", attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 })
const drums = ["kick", "snare", "hat", "clap"], notes = [36, 50, 84, 62]     // the note each drum plays

envelope("shape", kit)
const hits = pads("kit", drums, kit, { notes })
row()
// Tap a step on and off, drag across to paint, drag up on one for an accent; tap a drum's name to hear it.
const beat = drumSeq("beat", drums, kit, { notes, pattern: "backbeat", tempo: 110, onStep: (drum) => hits.flash(drum) })
