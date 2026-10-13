// Settings: a name to type, a number to step, a choice to make, a colour to pick and a box to tick,
// and a drawing that changes with each of them.
// Try changing: the choices of shape; the most shapes there can be; what the tick box does.
//
// Run it:   pictures run settings_panel.js     (dials.js sits beside this file)

const { textBox, number, choose, colourPicker, checkbox, readout, room } = await use("dials.js")

const name = textBox("name", "Ada")
const count = number("how many", 1, 8, 5)
const shape = choose("shape", ["circle", "square", "star"], "star")
const ink = colourPicker("colour", "gold")
const outline = checkbox("outline")
readout("letters", () => name.value.length)

function draw() {
  background("midnightblue")
  const area = room()                                  // the part of the picture no control is on
  const size = Math.min(area.width / (count * 2.6), area.height / 5)
  const y = area.y + area.height / 2
  const edge = outline.on ? "white" : undefined
  for (let i = 0; i < count; i++) {
    const x = area.x + area.width * (i + 0.5) / count
    if (shape.value === "circle") circle(x, y, size, ink.value, edge)
    else if (shape.value === "square") rect(x - size, y - size, size * 2, size * 2, ink.value, edge)
    else star(x, y, size, 5, ink.value, edge)
  }
  text(name.value || "type a name", width / 2, y + size + 44, "white", 28, "centre")
}
