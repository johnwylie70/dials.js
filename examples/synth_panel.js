// Synth panel: a synth you can play. Dials and sliders for its settings, the wave it is making,
// and a piano keyboard: play it with a finger, the mouse, or the computer's keys (A S D F G H J
// are the white keys, W E T Y U the black ones, Z and X step down and up an octave).
// Try changing: "saw" to "square"; octave: 4 to 2; add dial("volume", lead, "volume").
//
// Run it:   pictures run synth_panel.js     (controls.js sits beside this file)

const { dial, slider, select, scope, keyboard } = await use("controls.js")
const { makeSynth } = await use("standin-synth.js")   // a stand-in until synths.js is ready: then delete this line

const lead = makeSynth({ wave: "saw" })

select("wave", lead, "wave")
dial("cutoff", lead, "filter_cutoff")
dial("resonance", lead, "filter_resonance")
slider("attack", lead, "attack")
slider("release", lead, "release")
scope(lead)
keyboard(lead, { octave: 4 })
