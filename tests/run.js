import { summary } from "./assert.js";
import { runCombatTests } from "./combat.test.js";
import { runRulesTests } from "./rules.test.js";
import { runAiTests } from "./ai.test.js";

console.log("DEV DUEL — engine tests");
runCombatTests();
runRulesTests();
runAiTests();
summary();
