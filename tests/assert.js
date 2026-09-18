let passed = 0;
let failed = 0;
const failures = [];

export function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    if (error.stack) {
      console.error(`    ${error.stack.split("\n")[1] ?? ""}`.trimEnd());
    }
  }
}

export function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Expected equal"}: got ${actual}, expected ${expected}`);
  }
}

export function assertMatch(actual, matcher, message) {
  if (!matcher(actual)) {
    throw new Error(`${message || "Unexpected value"}: ${JSON.stringify(actual)}`);
  }
}

export function summary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
  return { passed, failed, failures };
}
