# Changes

## Unreleased

- Dials, sliders (across or upright), buttons, toggles and selects: `dial("speed", 0, 10)` gives a number to read, and `dial("cutoff", lead, "filter_cutoff")` is that setting of `lead`, with its range, unit and starting value taken from it.
- A piano keyboard, `keyboard(lead, { octave: 4 })`: several fingers at once, sliding from key to key, the computer's keys by where they are (the row from A is the white keys), Z and X to step the octave, and keys lit while they sound.
- A scope, `scope(lead)`, for a sound's wave or any value over time (`graph.push(value)`), and a level meter, `meter(lead)`.
- Controls lay themselves out in rows, with the keyboard along the bottom, and are laid out again when the picture changes size. `{ x, y }` places one by hand; `row()` starts a new row; `layout({ at: "bottom" })` moves the rows.
- A drag that leaves a control, or the picture, keeps turning it. Shift turns a tenth as far, and so does pulling well away from a dial (a quarter). Two taps put a dial or slider back where it started.
- They are drawn on a canvas of their own over the scene's, so they sit on 2D and 3D scenes alike and need no call in `draw()`.
- Four examples: a dial that shapes a star, a synth panel, a keyboard with a scope, and a bouncing ball with no sound at all.
