// Bounce: controls with no sound at all. Dials set the gravity and the bounce, a button kicks the
// ball, a toggle leaves a trail, and the scope draws the ball's height as it goes.
// Try changing: the ranges of the dials; what the button does; push the ball's speed to the scope.
//
// Run it:   pictures run bounce.js     (dials.js sits beside this file)

const { dial, button, toggle, scope, layout } = await use("dials.js")

layout({ at: "bottom" })
const gravity = dial("gravity", 0, 2000, 900)
const bounce = dial("bounce", 0, 1, 0.8)
const kick = button("kick")
const trail = toggle("trail", false)
const graph = scope("height", { width: 220 })

let y = 100, vy = 0

function update(dt) {
  const floor = height - 220
  if (kick.pressed) vy = -700
  vy += gravity.value * dt
  y += vy * dt
  if (y > floor) {
    y = floor
    vy = -Math.abs(vy) * bounce.value
  }
  graph.push(floor - y)
}

function draw() {
  background(trail.on ? "rgba(16, 24, 48, 0.08)" : "rgb(16, 24, 48)")
  circle(width / 2, y, 24, "tomato")
}
