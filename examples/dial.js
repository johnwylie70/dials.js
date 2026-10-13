// Dial: one dial, and a drawing that follows it. Turn it and the star grows more points.
// Try changing: 3 and 12, the fewest and the most points; "gold"; add a second dial for the size.
//
// Run it:   pictures run dial.js     (controls.js sits beside this file)

const { dial } = await use("controls.js")

const points = dial("points", 3, 12, 5, { step: 1 })
let turn = 0

function update(dt) {
  turn += dt * 0.5
}

function draw() {
  background("midnightblue")
  ctx.save()
  ctx.translate(width / 2, height / 2 + 50)
  ctx.rotate(turn)
  star(0, 0, Math.min(width, height) / 4, points.value, "gold")
  ctx.restore()
}
