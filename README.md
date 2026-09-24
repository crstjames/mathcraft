# Mathcraft

A blocky, Minecraft-inspired math game for kids. Plain HTML, CSS and JavaScript with no
libraries and no build step.

## Run it

Open `index.html` in a browser. That's it; it also works from `file://`.

To serve it on your network (e.g. for a tablet):

```sh
python3 -m http.server 8000
```

## How it plays

1. **Start**, then create a player (name, skin, hair, shirt and pants).
2. Pick a world on the map. **Ratio Ridge** is the demo level.
3. Walk right. Every obstacle is a ratio problem:

| Station | Obstacle | Ratio skill |
|---|---|---|
| Crafting Table | Ravine too wide to jump, so craft planks for a bridge | Unit rates (1 log : 4 planks), forward and backward |
| Farmer Villager | Iron-bar gate | Ratio tables / missing values, comparing deals (unit rate) |
| Ore Vein | Wall of coal and iron (a random mix each play) | Count the real wall, simplify it, scale it deeper, part : whole |
| Creeper Ambush | Creeper blocks the path | Simplest form, equivalent ratios, part : whole |
| Librarian | Village gate | Spotting the trade with a different unit rate, bookshelf recipe (6 : 3) |
| Blacksmith | Lava pit, so he smelts a cobblestone bridge | Furnace rules: 1 coal : 8 items, 1 item : 10 seconds |
| Zombie Horde | Zombies block the path | Ratio tables (zombies : rotten flesh), rates (blocks per seconds) |
| Diamond Wall | Wall in the open-pit quarry (random mix each play) | Part : part vs part : whole, repeating patterns |
| Skeleton Sniper | Skeleton blocks the path | Rates (arrows per seconds), "4 out of every 5" |
| Nether Portal | Portal needs lighting | Scaling a shape (2 : 3), Nether travel (1 : 8, a real Minecraft rule) |

Wrong answers cost a heart and show a worked explanation, then a **new** problem with
different numbers, so kids can't guess by elimination. Distractors are built from real
misconceptions (like adding instead of multiplying). Lose all 5 hearts and you respawn
at the last checkpoint. Stars are awarded by mistakes.

### Book & Quill

Every question has an optional **Book & Quill** worksheet ("Need help?" button or B).
It breaks the problem into steps ("Count the coal blocks: [ ]") shown one at a time, and
each blank is checked. Mistakes in the book cost no hearts, and the answer choices stay
available the whole time, so kids who don't need it can just answer.

### Recipe Book

Clearing a station adds a page to the player's Recipe Book: a short, kid-sized reminder
of the ratio trick used there (tables, unit rates, simplifying...). Open it from the
book button in the game, the pause menu, or the world map.

**Controls:** ← → / A D to move, Space / W / ↑ to jump, E to use, Esc to pause.
In a quiz: 1-4 to answer, H for a hint, B for the Book & Quill, Enter to check a step. Touch devices get on-screen buttons.

## Saves

Players and progress live in `localStorage` (`blockquest.saves.v1`). Progress is saved
after every answer and station, so quitting mid-level resumes at the last checkpoint.
There's no login; saves are per browser.

## Project layout

```
index.html              screens and overlays
css/style.css           all styling
js/storage.js           save/load players and settings
js/audio.js             synthesized sound effects (Web Audio)
js/art.js               procedural block textures, item icons, characters
js/questions.js         ratio question generators
js/levels/ratio-ridge.js  demo level: world layout, stations, solve effects
js/game.js              engine: physics, camera, rendering, stations
js/ui.js                menus, quiz modal, HUD
```

## Adding a level

Copy `js/levels/ratio-ridge.js`: `build()` returns the tile grid, `stations` lists the
obstacles, the question types each one asks, an optional `context` (level data the
questions use, like the ore wall's real counts) and a Recipe Book `page`, and
`applySolve()` changes the world when a station is cleared. Every question type returns
`steps` for the Book & Quill, where `{{n}}` marks a blank whose answer is n. Add new question types to `js/questions.js`, register the
level in `BQ.Levels.order`, and include the script in `index.html`.

## Note

This is an unofficial fan-style game. It uses no Mojang assets (all art is generated
in code) and isn't affiliated with Mojang or Microsoft. "Mathcraft" is fine for a family
project, but pick a name without "craft" before publishing it publicly, since Mojang's
brand guidelines discourage names that sound like Minecraft.
