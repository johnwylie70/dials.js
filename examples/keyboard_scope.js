// Keyboard and scope: every note you hold is a ring, and the scope shows the sound's wave.
// Play with a finger (several at once), the mouse, or the keys A S D F G H J and W E T Y U.
// Try changing: octaves: 2 to 3; the colours; what is drawn for a note.
//
// Run it:   pictures run keyboard_scope.js     (controls.js sits beside this file)

const { keyboard, scope, meter } = await use("controls.js")
const { makeSynth } = await use("standin-synth.js")   // a stand-in until synths.js is ready: then delete this line

const lead = makeSynth({ wave: "triangle" })

scope(lead, { width: 420 })
meter(lead)
const piano = keyboard(lead, { octave: 3, octaves: 2 })

function draw() {
  background("#0b1020")
  for (const note of piano.notes) {
    const x = width * (note - 48 + 0.5) / 25           // 48 is the lowest key: the C of octave 3
    circle(x, height * 0.45, 26, { outline: `hsl(${note * 30}, 90%, 65%)`, thickness: 5 })
  }
}
