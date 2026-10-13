// Rocks: a game for two thumbs. The stick flies the ship and the round button fires; on a computer
// the arrow keys and the space bar do the same.
// Try changing: how fast the rocks fall; how big they are; a second button that clears the screen.
//
// Run it:   pictures run joystick_game.js     (dials.js sits beside this file)

const { joystick, actionButton, readout, group, spacer, room } = await use("dials.js")

let score = 0, stick, fire
group({ at: "bottom", plate: false }, () => {
  stick = joystick()
  spacer()
  readout("score", () => score, { size: "large" })
  spacer()
  fire = actionButton("fire")
})

const ship = { x: 0, y: 0 }, shots = [], rocks = []
let wait = 0, space = false, began = false

function onKeyDown(key) { if (key === " ") space = true }

function update(dt) {
  const area = room()                                  // the part of the picture no control is on
  if (!began) { ship.x = area.x + area.width / 2; ship.y = area.bottom - 40; began = true }
  // The stick, or else the arrow keys: each gives a push from -1 to 1.
  const dx = stick.x || (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0)
  const dy = stick.y || (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0)
  ship.x = Math.min(area.right - 20, Math.max(area.x + 20, ship.x + dx * 340 * dt))
  ship.y = Math.min(area.bottom - 20, Math.max(area.y + 20, ship.y + dy * 340 * dt))
  if (fire.pressed || space) shots.push({ x: ship.x, y: ship.y - 20 })
  space = false
  wait -= dt
  if (wait <= 0) { rocks.push({ x: area.x + random(area.width), y: area.y - 20, size: random(10, 22) }); wait = 0.7 }
  for (const shot of shots) shot.y -= 520 * dt
  for (const rock of rocks) rock.y += 110 * dt
  for (const rock of rocks) {
    for (const shot of shots) {
      if (Math.hypot(rock.x - shot.x, rock.y - shot.y) < rock.size + 4) { rock.hit = shot.hit = true; score += 10 }
    }
  }
  remove(shots, (shot) => shot.hit || shot.y < area.y)
  remove(rocks, (rock) => rock.hit || rock.y > area.bottom + 30)
}

function remove(list, gone) {
  for (let i = list.length - 1; i >= 0; i--) if (gone(list[i])) list.splice(i, 1)
}

function draw() {
  background("#0b1026")
  for (const rock of rocks) circle(rock.x, rock.y, rock.size, "slategray")
  for (const shot of shots) rect(shot.x - 2, shot.y - 8, 4, 16, "gold")
  triangle(ship.x, ship.y - 20, ship.x - 16, ship.y + 16, ship.x + 16, ship.y + 16, "deepskyblue")
}
