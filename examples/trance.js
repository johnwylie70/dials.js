// Trance: a held chord chopped by a trance gate, and a lead that runs up and down the chord's notes.
// Both patterns are yours to draw: the gate's bars, and the arpeggio's notes, rests, ties and accents.
// Try changing: the chord ("Am7" to "Dm7"); the patterns to start from ("pump", "acid"); the tempo.
//
// Run it:   pictures run trance.js     (dials.js sits beside this file)

const { tranceGate, arpPattern, number, toggle, row } = await use("dials.js")

setTempo(138)
const pad = makeSynth("pad", { echo: 0.3 })
const lead = makeSynth("lead")
pad.tranceGate = "trance"                              // a pattern by name: the editor below shows it, and changes it
lead.arpPattern = "trance"

let chord = null
number("tempo", 80, 180, 138, { unit: "bpm", onChange: (bpm) => setTempo(bpm) })
toggle("play", false, (on) => {
  // Play: the pad holds the chord under its gate, and the lead plays the same chord as an arpeggio. Stop: both are let go.
  if (on) { pad.start(["A3", "C4", "E4", "G4"]); chord = lead.startArp("Am7", { step: "sixteenth" }) } else { pad.stop(); if (chord) chord.stop() }
})
row()
tranceGate("gate", pad)                                // pad.tranceGate, with its depth, rate and the rest beside it
row()
arpPattern("arp", lead)                                // lead.arpPattern
