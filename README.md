# DEV DUEL

Local Human vs AI card-battle prototype. Machines are the bodies. Software engineering concepts are the traps.

## Run

ES modules need a local server (opening `index.html` as a file will fail):

```bash
npm start
```

or:

```bash
npx --yes serve .
```

Then open the printed local URL.

## Tests

```bash
npm test
```

## Architecture

The UI never decides the rules. Both the human and the AI submit actions to the same engine.

```text
Human / AI
  → Action
  → Game Engine
  → Game State
  → UI render
```

AI path:

```text
Game State
  → legal actions
  → simulate each action on a clone
  → evaluate resulting state
  → pick the highest score (random among near-ties)
  → dispatch through the engine
```

## Assumptions (not specified in the master rules)

These live in `js/game/engine/config.js` so they can be changed in one place:

- Field size is 5.
- Hand size cap is 10. Overflow is discarded to the graveyard.
- HP heals cannot exceed 8000.
- Traps play during your Main Phase, except **Git Conflict**, which answers a pending **Git Merge**.
- Restrictive traps (Rate Limiter, Firewall, Deadlock) therefore last until the end of the opponent's next turn.
- Fusion does not consume the normal one-machine summon. Materials go to the activating player's graveyard.
- Each Extra Pool frame can be summoned once per player per duel.
- If a player cannot draw, the draw is skipped. No mill damage.
- The duel is a draw if both players have empty decks, hands, and fields without a knockout.
- Stolen machines return to their owner at end of turn. If the field is full, the returning machine is buried.
- First player is the human and still draws on turn 1.

## Adding a card

1. Add a definition to `js/game/cards/monsters.js`, `traps.js`, or `extraPool.js`.
2. If it is a main-deck card, add copies in `js/game/cards/deck.js`.
3. If it is a fusion, add a recipe in `extraPool.js`.
4. Prefer a new `effects[].type` handled in `js/game/engine/effects.js` over special-casing the UI.

## Tuning the AI

Weights are in `js/game/ai/scoringWeights.js`. The right sidebar **AI Debugger** tab shows candidate actions, scores, and the evaluation breakdown after each AI move. **Game State** shows the duel feed and the currently hovered card.
