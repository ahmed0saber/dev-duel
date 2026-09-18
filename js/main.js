import { createEngine } from "./game/engine/engine.js";
import { mountBoard } from "./game/ui/board.js";

const engine = createEngine();
mountBoard(document.getElementById("app"), engine);
