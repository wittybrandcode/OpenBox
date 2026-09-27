/**
 * OPENBOX â€” Integration Test Suite
 * Test: Zero Undo-Leaks & Balanced Undo Groups Invariant
 * 
 * Invariants Verified:
 * 1. Every app.beginUndoGroup must have a corresponding app.endUndoGroup in every host module.
 * 2. No function definition should be entered while an undo group remains unclosed.
 * 3. No unclosed undo groups may exist at EOF.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('\n[TEST SUITE] Zero Undo-Leaks & Balanced Groups');

    var hostDir = path.join(__dirname, '../../host/modules');
    var files = fs.readdirSync(hostDir)
                  .filter(f => f.endsWith('.jsx'))
                  .map(f => path.join(hostDir, f));

    var totalBegins = 0;
    var totalEnds = 0;

    files.forEach(function (file) {
        var content = fs.readFileSync(file, 'utf8');
        var lines = content.split('\n');
        var stack = [];
        var relPath = path.relative(path.join(__dirname, '../..'), file);

        lines.forEach(function (line, idx) {
            var lineNum = idx + 1;
            // Ignore definition of safeEndUndoGroup itself inside Utils.jsx
            if (file.endsWith('Utils.jsx') && line.indexOf('app.endUndoGroup()') !== -1) {
                return;
            }
            if (line.indexOf('app.beginUndoGroup(') !== -1 && line.trim().indexOf('//') !== 0) {
                stack.push({ lineNum: lineNum, text: line.trim() });
                totalBegins++;
            }
            if ((line.indexOf('app.endUndoGroup()') !== -1 || line.indexOf('safeEndUndoGroup()') !== -1) && line.trim().indexOf('//') !== 0) {
                totalEnds++;
                assert.ok(stack.length > 0, `Unmatched endUndoGroup found at ${relPath}:${lineNum}`);
                stack.pop();
            }

            // Check if another method starts while an undo group is open
            if (line.match(/^\s*\$._smartHighlighter\.\w+\s*=\s*function/) && stack.length > 0) {
                assert.fail(`Undo leak: New function defined at ${relPath}:${lineNum} while undo group is still open!`);
            }
        });

        assert.strictEqual(stack.length, 0, `Unclosed undo groups at end of ${relPath}: ${JSON.stringify(stack)}`);
    });

    assert.strictEqual(totalBegins, totalEnds, `Total beginUndoGroup (${totalBegins}) must equal endUndoGroup (${totalEnds})`);
    console.log(`  âœ“ Checked ${files.length} host modules: ${totalBegins} undo groups perfectly matched with 0 leaks`);
    console.log('âœ“ All Undo Safety Invariants Passed Successfully!\n');
    return true;
}

if (require.main === module) {
    runTest();
}

module.exports = runTest;
