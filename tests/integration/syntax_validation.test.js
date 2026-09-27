/**
 * OPENBOX â€” Integration Test Suite
 * Test: Full Codebase Syntax & AST Validation
 * 
 * Verifies:
 * Every JavaScript (.js) and ExtendScript (.jsx) file across the entire extension
 * is syntactically sound and passes VM parsing with 0 syntax errors.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function runTest() {
    console.log('\n[TEST SUITE] Full Codebase Syntax & AST Validation');

    var rootDir = path.join(__dirname, '../..');
    var targetDirs = [
        path.join(rootDir, 'client/js'),
        path.join(rootDir, 'host/modules'),
        path.join(rootDir, 'host')
    ];

    var totalChecked = 0;

    function checkDirectory(dir) {
        var entries = fs.readdirSync(dir, { withFileTypes: true });
        for (var i = 0; i < entries.length; i++) {
            var ent = entries[i];
            var fullPath = path.join(dir, ent.name);
            if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== 'scratch') {
                checkDirectory(fullPath);
            } else if (ent.isFile() && (ent.name.endsWith('.js') || ent.name.endsWith('.jsx'))) {
                var code = fs.readFileSync(fullPath, 'utf8');
                // ExtendScript preprocessor directives (#include, #target) are valid in AE but need commenting out in Node V8
                var cleanCode = code.replace(/#(include|target)[^\n]*/g, '// preprocessor: $&');
                try {
                    new vm.Script(cleanCode, { filename: fullPath });
                    totalChecked++;
                } catch (err) {
                    assert.fail(`Syntax Error in ${path.relative(rootDir, fullPath)}: ${err.message}`);
                }
            }
        }
    }

    targetDirs.forEach(function (d) {
        if (fs.existsSync(d)) {
            checkDirectory(d);
        }
    });

    console.log(`  âœ“ Verified ${totalChecked} JS/JSX files across client/ and host/ with 0 syntax errors`);
    console.log('âœ“ All Syntax Validation Checks Passed Successfully!\n');
    return true;
}

if (require.main === module) {
    runTest();
}

module.exports = runTest;
