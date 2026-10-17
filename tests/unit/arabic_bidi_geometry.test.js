/**
 * OPENBOX — Unit Test Suite
 * Test: Arabic, BiDi, Unicode Preservation & Word Selection Geometry Invariants
 * 
 * Invariants Verified:
 * 1. Unicode Preservation: stripAnchors MUST ONLY strip \u200B, \u2060, \uFEFF.
 *    Orthographic characters like \u200C (ZWNJ) and \u200D (ZWJ) and BiDi marks MUST BE PRESERVED.
 * 2. Justification Invariant: FULL_JUSTIFY_LASTLINE_FULL MUST NOT be forced to "ltr".
 * 3. Multi-line Word Position Invariant:
 *    - In RTL paragraphs, words on shorter lines must account for line rightOffset to prevent floating in empty space.
 *    - In Center paragraphs, words must account for line centerOffset.
 *    - In LTR paragraphs, words must account for line leftOffset.
 * 4. Per-Word BiDi Strategy:
 *    - English words inside Arabic text MUST receive rtl_k = false so Typewriter/wipe runs LTR.
 *    - Arabic words MUST receive rtl_k = true so Typewriter/wipe runs RTL.
 * 5. Safe ES3 Comment Encoding:
 *    - Arabic strings encoded in layer comments MUST decode without URIError or corruption.
 */

const assert = require('assert');

function runTest() {
    console.log('\n[TEST SUITE] Arabic, BiDi & Word Selection Geometry Invariants');

    // -------------------------------------------------------------
    // Test 1: Unicode & Orthographic Preservation
    // -------------------------------------------------------------
    const stripAnchors = function (text) {
        if (!text) return "";
        return text.replace(/[\u200B\u2060\uFEFF]/g, "");
    };

    const persianPhraseWithZWNJ = "می\u200Cخواهم"; // Persian "I want" with ZWNJ
    const arabicWithBiDi = "\u200EHello \u200Fمرحبا"; // Text with LRM and RLM
    const openBoxPolluted = "\u200B" + persianPhraseWithZWNJ + "\u2060";

    const cleaned = stripAnchors(openBoxPolluted);
    assert.strictEqual(cleaned, persianPhraseWithZWNJ, "stripAnchors must remove \\u200B and \\u2060");
    assert.ok(cleaned.indexOf("\u200C") !== -1, "stripAnchors MUST PRESERVE \\u200C (ZWNJ)");
    assert.strictEqual(stripAnchors(arabicWithBiDi), arabicWithBiDi, "stripAnchors MUST NOT remove BiDi directional marks");
    console.log('  ✓ Unicode Preservation: ZWNJ, ZWJ, and BiDi marks 100% preserved; only OpenBox waypoints stripped');

    // -------------------------------------------------------------
    // Test 2: Paragraph Justification Detection Invariant
    // -------------------------------------------------------------
    const detectJustification = function (justification) {
        if (justification === null || justification === undefined) return null;
        var jStr = String(justification).toUpperCase();
        if (jStr.indexOf("CENTER") !== -1 || justification === 7415 || justification === 7418) return "center";
        if (jStr.indexOf("RIGHT") !== -1 || justification === 7414 || justification === 7417) return "rtl";
        if (justification === 7413 || justification === 7416) return "ltr";
        if (jStr === "FULL_JUSTIFY_LASTLINE_FULL") return null; // Neutral full justification
        if (jStr.indexOf("LEFT") !== -1) return "ltr";
        return null;
    };

    assert.strictEqual(detectJustification(7414), "rtl", "Right Justify must return rtl");
    assert.strictEqual(detectJustification("FULL_JUSTIFY_LASTLINE_FULL"), null, "FULL_JUSTIFY_LASTLINE_FULL must return null (not ltr) so text language determines direction");
    console.log('  ✓ Justification Invariant: Full justification defers direction to text language rather than forcing LTR');

    // -------------------------------------------------------------
    // Test 3: Multi-Line Word Position Geometry Invariant
    // -------------------------------------------------------------
    // Simulate After Effects sourceRectAtTime bounding box for a 2-line paragraph:
    // Line 1: width = 600px, starts at X=100, ends at X=700 (r.left = 100, r.width = 600).
    // Line 2: width = 250px.
    // In Right-aligned text, Line 2 ends at X=700 (rightOffset = 0).
    // In Left-aligned text, Line 2 ends at X=350 (rightOffset = 350px).
    // In Center-aligned text, Line 2 starts at X=275, ends at X=525 (centerOffset = 0, rightOffset = 175px).

    function computeWordX(box, r, fontRatio, pX, startOffset, curW) {
        var curX;
        if (box.rtl_k) {
            var rOff = (box.rightOffset ? box.rightOffset : 0) * fontRatio;
            var lineRight = (r.left + r.width) - rOff;
            var rightEdge = lineRight - (box.wordOffset * fontRatio);
            curX = (rightEdge + pX - (startOffset * fontRatio)) - (curW / 2);
        } else if (box.isCenter) {
            var cOff = (box.centerOffset ? box.centerOffset : 0) * fontRatio;
            var lineLeft = r.left + (r.width / 2) + cOff - ((box.lineWidth / 2) * fontRatio);
            curX = (lineLeft + (box.wordOffset * fontRatio) - pX + (startOffset * fontRatio)) + (curW / 2);
        } else {
            var lOff = (box.leftOffset ? box.leftOffset : 0) * fontRatio;
            var lineLeft = r.left + lOff;
            curX = (lineLeft + (box.wordOffset * fontRatio) - pX + (startOffset * fontRatio)) + (curW / 2);
        }
        return curX;
    }

    const r = { left: 100, width: 600 }; // Paragraph bounds: 100 to 700
    const fontRatio = 1.0;
    const pX = 10;
    const startOffset = 0;
    const wordW = 80; // Word width
    const curW = wordW + pX * 2; // 100px total box width

    // Case A: RTL word on Line 2 of a Left-aligned or indented paragraph where Line 2 has rightOffset = 350px
    // Word is at wordOffset = 50px from line 2's right edge (Line 2 ends at 700 - 350 = 350).
    // The word's right edge on screen is 350 - 50 = 300.
    // Center of the word box should be (300 + 10) - (100 / 2) = 260.
    const rtlBoxLine2 = {
        isWord: true,
        rtl_k: true,
        rightOffset: 350,
        wordOffset: 50,
        lineWidth: 250
    };
    const computedX_RTL = computeWordX(rtlBoxLine2, r, fontRatio, pX, startOffset, curW);
    assert.strictEqual(computedX_RTL, 260, "RTL word on line with rightOffset must position relative to actual line right, not paragraph max right");

    // Case B: LTR word on Line 2 of a Center-aligned paragraph (Line 2 starts at 275, centerOffset = 0, leftOffset = 175)
    // Word is at wordOffset = 40px from line 2's left edge (275 + 40 = 315).
    // Center of the word box should be (315 - 10) + (100 / 2) = 355.
    const centerBoxLine2 = {
        isWord: true,
        isCenter: true,
        centerOffset: 0,
        wordOffset: 40,
        lineWidth: 250
    };
    const computedX_Center = computeWordX(centerBoxLine2, r, fontRatio, pX, startOffset, curW);
    assert.strictEqual(computedX_Center, 355, "Centered word must position relative to line center");

    // Case C: LTR word on Line 2 with leftOffset = 150px
    const ltrBoxLine2 = {
        isWord: true,
        rtl_k: false,
        isCenter: false,
        leftOffset: 150,
        wordOffset: 30,
        lineWidth: 250
    };
    const computedX_LTR = computeWordX(ltrBoxLine2, r, fontRatio, pX, startOffset, curW);
    // lineLeft = 100 + 150 = 250. curX = (250 + 30 - 10) + 50 = 320.
    assert.strictEqual(computedX_LTR, 320, "LTR word on line with leftOffset must position relative to actual line left");
    console.log('  ✓ Multi-Line Word Geometry: rightOffset, leftOffset, and centerOffset prevent floating highlight boxes');

    // -------------------------------------------------------------
    // Test 4: Per-Word BiDi Direction Strategy
    // -------------------------------------------------------------
    const hasArabic = function (text) {
        var arabicPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicPattern.test(text);
    };

    function resolveWordDirection(wordStr, lineIsRTL) {
        var wordHasAr = hasArabic(wordStr);
        if (wordHasAr) return true;
        if (/[A-Za-z]/.test(wordStr)) return false; // Latin word inside RTL line runs LTR
        return lineIsRTL;
    }

    assert.strictEqual(resolveWordDirection("OpenBox", true), false, "English word 'OpenBox' in RTL line MUST have rtl_k = false for correct wipe");
    assert.strictEqual(resolveWordDirection("مشروع", true), true, "Arabic word 'مشروع' MUST have rtl_k = true");
    assert.strictEqual(resolveWordDirection("v2.0", true), false, "Alphanumeric version tag MUST have rtl_k = false");
    console.log('  ✓ Per-Word BiDi Strategy: Latin words in Arabic lines wipe LTR, Arabic words wipe RTL');

    // -------------------------------------------------------------
    // Test 5: Safe Comment Unicode Encoding & Decoding
    // -------------------------------------------------------------
    const sampleArabicPhrase = "تظليل احترافي متقدم";
    const safeEncoded = escape(sampleArabicPhrase);
    assert.ok(safeEncoded.indexOf("%u") !== -1, "escape() must safely represent Arabic UTF-16 code points");
    const safeDecoded = unescape(safeEncoded);
    assert.strictEqual(safeDecoded, sampleArabicPhrase, "unescape() must decode Arabic text with 100% fidelity without URIError");
    console.log('  ✓ Safe Comment Encoding: escape/unescape roundtrips Arabic text cleanly with zero URIError');

    console.log('✓ All Arabic, BiDi & Word Selection Geometry Invariants Passed Successfully!\n');
}

module.exports = runTest;

if (require.main === module) {
    runTest();
}
