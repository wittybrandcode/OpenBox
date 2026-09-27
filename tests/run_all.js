/**
 * OPENBOX — Master Test Runner
 * Production-Grade Invariant & Regression Protection Runner
 * 
 * Executes all unit and integration test suites:
 * - Typography & Flush Alignment Invariants
 * - Timecode Engine & Segmented Inputs Invariants
 * - Recipe Plugin System & Open-Closed Extensibility
 * - Expression Evaluation & Math Safety
 * - Zero Undo-Leaks & Balanced Undo Groups
 * - Full Codebase Syntax & AST Validation
 */

const startTime = process.hrtime();

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OPENBOX — MASTER TEST SUITE (PRODUCTION HARNESS)');
console.log('═══════════════════════════════════════════════════════════════');

const suites = [
    { name: 'Typography & Line Alignment', path: './unit/typography_alignment.test.js' },
    { name: 'Timecode Engine & Segmented Inputs', path: './unit/timecode_engine.test.js' },
    { name: 'Recipe Plugin Architecture', path: './unit/recipe_system.test.js' },
    { name: 'Expression Safety & Evaluation', path: './integration/expression_syntax.test.js' },
    { name: 'Zero Undo-Leaks & Balance', path: './integration/undo_safety.test.js' },
    { name: 'Codebase Syntax & AST Check', path: './integration/syntax_validation.test.js' }
];

var passedCount = 0;
var failedCount = 0;

suites.forEach(function (suite) {
    try {
        var testFn = require(suite.path);
        testFn();
        passedCount++;
    } catch (err) {
        failedCount++;
        console.error(`\n❌ FAILED SUITE: ${suite.name}`);
        console.error(err.stack || err.message);
    }
});

const elapsed = process.hrtime(startTime);
const durationMs = ((elapsed[0] * 1000) + (elapsed[1] / 1000000)).toFixed(1);

console.log('═══════════════════════════════════════════════════════════════');
if (failedCount === 0) {
    console.log(`  🎉 ALL ${passedCount} TEST SUITES PASSED IN ${durationMs}ms`);
    console.log('  🔒 All Invariants, Alignment Rules & Timing Contracts Solid!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
} else {
    console.error(`  ⚠️  ${failedCount} TEST SUITE(S) FAILED out of ${suites.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(1);
}
