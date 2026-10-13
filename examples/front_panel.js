// Front panel: a whole synth, laid out like the front of a real one. Each group is a plate with a
// title that keeps its controls together; the plates arrange themselves to fit a phone, a tablet
// or a wide window, and what does not fit can be moved with a finger while the keys stay put.
// Try changing: move a dial to another group; group("filter", { colour: "deepskyblue" }, …);
// add row() between two groups to start a new line of plates; layout({ compact: true }).
//
// Run it:   pictures run front_panel.js     (dials.js sits beside this file)

const { group, row, column, dial, slider, select, scope, meter, keyboard } = await use("dials.js")
const { makeSynth } = await use("standin-synth.js")   // a stand-in until synths.js is ready: then delete this line

const lead = makeSynth({ wave: "saw", voices: 3, delay: 0.25, reverb: 0.3 })

group("oscillator", () => {
  select("wave", lead, "wave")
  dial("sub", lead, "sub")
})
group("unison", () => {
  dial("voices", lead, "voices")
  dial("detune", lead, "detune")
})
group("filter", () => {
  dial("cutoff", lead, "filter_cutoff")
  dial("resonance", lead, "filter_resonance")
})
group("envelope", () => {
  for (const stage of ["attack", "decay", "sustain", "release"]) slider(stage, lead, stage, { vertical: true })
})
group("delay", () => {
  dial("mix", lead, "delay")
  dial("time", lead, "delay_time")
  dial("feedback", lead, "delay_feedback")
})
group("reverb", () => {
  dial("mix", lead, "reverb")
  dial("size", lead, "reverb_size")
})
group("output", () => {
  scope(lead, { share: 1 })                  // the scope takes the room the others leave
  meter(lead)
  dial("volume", lead, "volume")
})
keyboard(lead, { octave: 3, octaves: 2 })
