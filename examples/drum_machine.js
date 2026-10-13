// Drum machine: a sequencer that plays by itself, and pads to hit by hand. Press play (the first
// touch lets the page make sound), then tap steps on and off.
// Try changing: pattern: "breakbeat"; steps: 32; a fourth drum, made with makeSynth("chipSnare").
//
// Run it:   pictures run drum_machine.js     (dials.js sits beside this file)

const { drumSeq, pads, row } = await use("dials.js")

const kit = { kick: makeSynth("kick"), snare: makeSynth("snare"), hat: makeSynth("hat") }
const drums = Object.keys(kit), notes = [36, 52, 60]             // the note each drum is played at

const hits = pads("kit", drums, { notes, onNoteOn: (note, velocity, drum) => kit[drum].noteOn(note, velocity), onNoteOff: (note, drum) => kit[drum].noteOff(note) })
row()
// Tap a step on and off, drag across to paint, drag up on one for an accent; tap a drum's name to hear it.
// clock: soundTime keeps the beat by the sound's own clock, so it stays tight when the page is busy.
drumSeq("beat", drums, { targets: kit, notes, clock: soundTime, pattern: "backbeat", tempo: 110, onStep: (drum) => hits.flash(drum) })
