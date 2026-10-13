# controls.js

[![MIT licence](https://img.shields.io/badge/licence-MIT-green)](LICENSE)

controls.js puts dials, sliders, buttons, a piano keyboard, a scope and level meters on a scene, in plain JavaScript. You say what you want and it appears: nothing to position, nothing to draw, nothing to wire up. It works with a finger (several at once on the keyboard), with the mouse and with the computer's keys. It is a sibling of [pictures.js](https://github.com/johnwylie70/pictures.js), designed for projects made in [Circuitry Studio](https://www.circuitry.dev), and runs anywhere a browser does.

Prefer Python? The same library for [Pyctures](https://github.com/johnwylie70/pyctures) is in the `controls-py` repository.

Nothing here is published yet, and its name is not settled.

## A synth you can play

```js
const { dial, slider, select, scope, keyboard } = await use("controls.js")

const lead = makeSynth({ wave: "saw" })

select("wave", lead, "wave")
dial("cutoff", lead, "filter_cutoff")
dial("resonance", lead, "filter_resonance")
slider("attack", lead, "attack")
scope(lead)
keyboard(lead, { octave: 4 })
```

Each dial is that setting of the synth: it takes its range, its unit and where it starts from the synth, and turning it sets it. The scope draws the wave the synth is making. The keyboard plays it: with fingers, with the mouse, and with the keys A S D F G H J (the white keys) and W E T Y U (the black ones); Z and X step down and up an octave.

`makeSynth` will come from synths.js. Until it is ready, `examples/standin-synth.js` is a small stand-in made from the browser's own oscillators, so the examples make sound today.

## A number for anything

A control needs no synth. It is a number for a game or an animation:

```js
const { dial } = await use("controls.js")

const points = dial("points", 3, 12, 5, { step: 1 })    // from 3 to 12, starting at 5

function draw() {
  background("midnightblue")
  star(width / 2, height / 2, 120, points.value, "gold")
}
```

`points.value` is the number now. In sums the control stands for its number (`speed * dt`), and `points.value = 8` sets it.

## Run it

Put `controls.js` beside your scene and run the scene with pictures.js:

```
pictures run synth_panel.js
```

The examples in `examples/` run this way (their `controls.js` is a link to the one above them).

On a page of your own with one canvas, import it: `import { dial, keyboard } from "./controls.js"`. With more than one canvas, say which: `const { dial, keyboard } = controls(canvas)`.

## The controls

Every control takes a last `{ … }` of options. All of them take `x` and `y` (to place it by hand: its top left corner) and `colour`.

| | |
|---|---|
| `dial(label, min, max, start)` | A dial. Options: `step`, `unit`, `log` (turned by ratio, as a pitch is), `digits`, `size`, `onChange`. |
| `dial(label, target, "setting")` | A dial that is a setting of a target. The label may be left out: `dial(lead, "volume")`. |
| `slider(…)` | The same as a dial, as a slider. `{ vertical: true }` stands it upright. |
| `button(label, onPress)` | A button. `fire.pressed` is true once for each press (ask it in `update`); `fire.held` while it is down. |
| `toggle(label, on)` | A switch. `mute.on` is true or false. `toggle(label, target, "setting")` ties it to a setting. |
| `select(label, choices, start)` | One of a list, stepped through with the arrows at its sides. `wave.value` is the choice, `wave.index` its place. `select(label, target, "setting")` takes the choices from the target. |
| `keyboard(target, { octave, octaves })` | A piano keyboard along the bottom. `piano.notes` is what is held now (60 is middle C). Options: `keys: false` (no computer keys), `hints: false` (no letters on the keys), `onNoteOn(note, velocity)`, `onNoteOff(note)`. |
| `scope(source)` | A line of numbers, live: a target with `samples()`, a function that returns a list, or a list. With no source, `graph.push(value)` adds a point, to draw any value over time. Options: `min`, `max`, `width`, `height`, `points`. |
| `meter(source)` | A level from 0 to 1 as a bar of lights: a target with `level()`, a function, or `meter.value = 0.7`. `[left, right]` makes two bars. |
| `label(text)` | Words in the row, as a heading. |
| `row()` | The controls after this start a new row. |
| `layout({ at: "bottom" })` | Where the rows go (`"top"` or `"bottom"`), `scale`, `margin`, and `backdrop` (true, false or a colour). |
| `theme({ accent: "deepskyblue" })` | The colours. |
| `over(x, y)` | Is a control at this point? A game asks before it treats a click as its own. |

Every control has `value`, `label`, `remove()` and `place(x, y)`. `onChange(value)` is called when a hand changes it.

## With your hands

- Drag up or to the right on a dial to turn it up. The drag is the dial's until you let go, wherever the pointer wanders: off the dial, off the picture.
- Hold Shift to turn a tenth as far. On a touch screen, pull your finger well away from the dial for a quarter.
- Tap twice to put a dial or slider back where it started.
- Tap a slider's track and the handle comes to your finger; drag the handle to move it from where it is.
- Each finger on the keyboard holds its own key, and sliding along plays each key in turn.

## Targets

A control can be tied to anything. No library is named: a target is known by what it can do, and every part is optional.

| | |
|---|---|
| `set(name, value)`, `get(name)` | Without them the control reads and writes `target[name]`, so a plain object is a target: `dial("size", ball, "radius", { min: 5, max: 80 })`. |
| `describe(name)` | `{ min, max, default, unit, step, kind, choices, name }`. `kind` is `"float"`, `"int"`, `"bool"` or `"choice"`; `choices` is a list, or names joined by `\|`. |
| `noteOn(note, velocity)`, `noteOff(note)` | What a keyboard plays. `note` is a MIDI number, `velocity` is from 0 to 1. |
| `notes()` | The notes sounding now: a keyboard lights them. |
| `samples()` | Its latest output, numbers from -1 to 1: a scope draws it. |
| `level()` | How loud it is now, from 0 to 1, or `[left, right]`: a meter shows it. |

A target that is changed some other way (by the scene's code, by a song) moves its controls. The Python spellings (`note_on`, `on_change`) are understood too.

## How it is made

The controls are drawn on a canvas of their own, laid exactly over the scene's. So they sit on whatever the scene draws, 2D or 3D, need no call in `draw()`, and cost the scene nothing: only a control that changed is drawn again. A scene that draws nothing at all (a synth panel) is given a dark backdrop. Pointers and keys are heard on the scene's own canvas, so the scene's `mouse`, `touches` and `keys` go on working.

A host that keeps the scene's code somewhere else (the Python library does) makes controls by number and is told what changed once a frame: `make`, `set`, `call`, `drop`, `listen`, `beat` and `ack` on what `controls(canvas)` gives.

## Tests

```
PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-controls.mjs
```

Real browsers (Chromium, and WebKit when Playwright has it) on pictures.js scenes: the controls are turned, pressed and played with a real mouse, the keyboard and several fingers, and every example is run. pictures.js is taken from the folder beside this one.

## Licence

MIT. See [LICENSE](LICENSE).
