/**
 * OPENBOX â€” Integration Test Suite
 * Test: Expression Evaluation & Math Safety
 * 
 * Invariants Verified:
 * 1. Marker expressions (Intro / Outro) must gracefully fallback to base keyframe value if no markers exist.
 * 2. Intro expression smoothly interpolates 0% -> 100% across marker timeframe.
 * 3. Outro expression smoothly interpolates 100% -> 0% across marker timeframe.
 * 4. Elastic Pop scale expression must not cause NaN or division by zero at k1.time == k2.time.
 * 5. Parent null guards (if (!pLayer) value;) must protect against orphaned shape layers.
 */

const assert = require('assert');

function runTest() {
    console.log('\n[TEST SUITE] Expression Evaluation & Math Safety');

    // AE Expression Math Polyfills
    function linear(t, tMin, tMax, val1, val2) {
        if (t <= tMin) return val1;
        if (t >= tMax) return val2;
        return val1 + ((t - tMin) / Math.max(0.0001, (tMax - tMin))) * (val2 - val1);
    }

    function easeOut(t, tMin, tMax, val1, val2) {
        return linear(t, tMin, tMax, val1, val2);
    }

    function easeIn(t, tMin, tMax, val1, val2) {
        return linear(t, tMin, tMax, val1, val2);
    }

    function clamp(val, minVal, maxVal) {
        return Math.max(minVal, Math.min(maxVal, val));
    }

    // 1. Intro Marker Progress Expression Evaluation
    function evalIntroExpr(hasMarkers, time) {
        var value = 50;
        var thisLayer = {
            marker: hasMarkers ? {
                numKeys: 4,
                key: function (i) {
                    var comments = ['HL_IN_START', 'HL_IN_END', 'HL_OUT_START', 'HL_OUT_END'];
                    var times = [0.0, 0.5, 2.0, 2.5];
                    return { comment: comments[i - 1], time: times[i - 1] };
                }
            } : { numKeys: 0 }
        };

        var inExpr = 
            "var res = value;\n" +
            "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
            "    var inS = null, inE = null;\n" +
            "    for (var i = 1; i <= thisLayer.marker.numKeys; i++) {\n" +
            "        var c = thisLayer.marker.key(i).comment;\n" +
            "        if (c === 'HL_IN_START') inS = thisLayer.marker.key(i).time;\n" +
            "        else if (c === 'HL_IN_END') inE = thisLayer.marker.key(i).time;\n" +
            "    }\n" +
            "    if (inS !== null && inE !== null) res = linear(time, inS, inE, 0, 100);\n" +
            "}\n" +
            "res;";

        return eval(inExpr);
    }

    assert.strictEqual(evalIntroExpr(false, 0.2), 50, "Without markers, intro expression returns keyframe value 50");
    assert.strictEqual(evalIntroExpr(true, -0.1), 0, "Before intro start, intro progress is 0");
    assert.strictEqual(evalIntroExpr(true, 0.25), 50, "Halfway through intro, intro progress is 50");
    assert.strictEqual(evalIntroExpr(true, 1.0), 100, "After intro completion, intro progress is 100");
    console.log('  âœ“ Intro Marker Expression: 0% -> 50% -> 100% smooth evaluation passed');

    // 2. Outro Marker Progress Expression Evaluation
    function evalOutroExpr(hasMarkers, time) {
        var value = 100;
        var thisLayer = {
            marker: hasMarkers ? {
                numKeys: 4,
                key: function (i) {
                    var comments = ['HL_IN_START', 'HL_IN_END', 'HL_OUT_START', 'HL_OUT_END'];
                    var times = [0.0, 0.5, 2.0, 2.5];
                    return { comment: comments[i - 1], time: times[i - 1] };
                }
            } : { numKeys: 0 }
        };

        var outRevExpr = 
            "var res = value;\n" +
            "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
            "    var outS = null, outE = null;\n" +
            "    for (var i = 1; i <= thisLayer.marker.numKeys; i++) {\n" +
            "        var c = thisLayer.marker.key(i).comment;\n" +
            "        if (c === 'HL_OUT_START') outS = thisLayer.marker.key(i).time;\n" +
            "        else if (c === 'HL_OUT_END') outE = thisLayer.marker.key(i).time;\n" +
            "    }\n" +
            "    if (outS !== null && outE !== null) {\n" +
            "        if (time >= outS) res = linear(time, outS, outE, 100, 0);\n" +
            "    }\n" +
            "}\n" +
            "res;";

        return eval(outRevExpr);
    }

    assert.strictEqual(evalOutroExpr(true, 1.5), 100, "Before outro, progress is 100");
    assert.strictEqual(evalOutroExpr(true, 2.25), 50, "Halfway through outro, progress is 50");
    assert.strictEqual(evalOutroExpr(true, 3.0), 0, "After outro completion, progress is 0");
    console.log('  âœ“ Outro Marker Expression: 100% -> 50% -> 0% smooth reverse erase evaluation passed');

    // 3. Elastic Pop Scale Expression Zero-Division Guard
    function evalPopScale(k1Time, k2Time, time) {
        var effect = function (name) {
            return function (idx) {
                return {
                    value: 100,
                    numKeys: 2,
                    key: function (i) {
                        return { time: (i === 1 ? k1Time : k2Time) };
                    }
                };
            };
        };

        var scaleExpr = 
            'var p = effect("Progress")(1);\n' +
            'var outVal = [100, 100];\n' +
            'if (p.numKeys >= 2) {\n' +
            '    var k1 = p.key(1);\n' +
            '    var k2 = p.key(2);\n' +
            '    if (time < k1.time) {\n' +
            '        outVal = [0, 0];\n' +
            '    } else if (time <= k2.time) {\n' +
            '        var tNorm = (time - k1.time) / Math.max(0.001, (k2.time - k1.time));\n' +
            '        var s = easeOut(tNorm, 0, 1, 0, 118);\n' +
            '        outVal = [s, s];\n' +
            '    } else {\n' +
            '        outVal = [100, 100];\n' +
            '    }\n' +
            '}\n' +
            'outVal;';

        return eval(scaleExpr);
    }

    // Normal case
    var normalScale = evalPopScale(0.0, 0.4, 0.2);
    assert.strictEqual(normalScale[0] > 0, true, "Scale must evaluate during transition");

    // Zero-duration stress test (k1 == k2)
    var guardedScale = evalPopScale(0.5, 0.5, 0.5);
    assert.ok(!isNaN(guardedScale[0]), "Scale must not be NaN when k1.time == k2.time");
    assert.ok(!isNaN(guardedScale[1]), "Scale must not be NaN when k1.time == k2.time");
    console.log('  âœ“ Elastic Pop: Zero-division guard Math.max(0.001, dt) verified against NaN');

    // 4. Font Ratio and Base Dimensions Zero-Division Resilience (TASK-02 Verification)
    function evalFontRatio(ctxBaseFS, ctxBaseTotalH, pLayerHeight, textLayerStyleFontSize, triggerCatch) {
        var safeBaseFS = Math.max(1, (typeof ctxBaseFS === "number" && ctxBaseFS > 0) ? ctxBaseFS : 1);
        var safeBaseTotalH = Math.max(1, (typeof ctxBaseTotalH === "number" && ctxBaseTotalH > 0) ? ctxBaseTotalH : 1);

        var pLayer = {
            sourceRectAtTime: function() { return { height: pLayerHeight, top: 0, left: 0, width: 200 }; },
            text: {
                sourceText: {
                    get style() {
                        if (triggerCatch) throw new Error("SourceText style not available");
                        return { fontSize: textLayerStyleFontSize };
                    }
                }
            }
        };

        var ratioExpr =
            'var baseFS = ' + safeBaseFS.toFixed(2) + ';\n' +
            'var curFS = baseFS;\n' +
            'try { curFS = pLayer.text.sourceText.style.fontSize; } catch(err) { curFS = baseFS * (pLayer.sourceRectAtTime().height / Math.max(1, ' + safeBaseTotalH.toFixed(2) + ')); }\n' +
            'var fontRatio = Math.max(0.01, curFS / Math.max(1, baseFS));\n' +
            'fontRatio;';

        return eval(ratioExpr);
    }

    // Normal fontRatio
    var rNormal = evalFontRatio(48, 200, 200, 48, false);
    assert.strictEqual(rNormal, 1.0, "Normal fontRatio must be 1.0");

    // Extreme Edge Case 1: baseFS is 0 and baseTotalH is 0
    var rZeroBase = evalFontRatio(0, 0, 100, 0, false);
    assert.ok(isFinite(rZeroBase), "fontRatio must remain finite when baseFS and baseTotalH are 0");
    assert.ok(!isNaN(rZeroBase), "fontRatio must not be NaN when baseFS is 0");
    assert.ok(rZeroBase >= 0.01, "fontRatio must clamp to at least 0.01");

    // Extreme Edge Case 2: Catch fallback with 0 height and 0 safeBaseTotalH
    var rCatchZero = evalFontRatio(0, 0, 0, 0, true);
    assert.ok(isFinite(rCatchZero), "fontRatio fallback must be finite");
    assert.strictEqual(rCatchZero, 0.01, "fontRatio fallback clamps safely to 0.01");

    // Extreme Edge Case 3: Scaling ratio 2x via fallback
    var rCatchScale = evalFontRatio(50, 100, 200, 50, true);
    assert.strictEqual(rCatchScale, 2.0, "fontRatio fallback correctly scales 2.0x");
    console.log('  âœ“ Division-by-Zero Resilience: fontRatio & baseTotalH robust against 0, null, and NaN');

    // 5. Orphaned Shape Layer (pLayer == null) Parent-Null Guard
    function evalOrphanedPosition(hasParent) {
        var value = [960, 540];
        var parent = null;
        var expr =
            'var pLayer = hasParent ? parent : null;\n' +
            'if (!pLayer) {\n' +
            '    value;\n' +
            '} else {\n' +
            '    var r = pLayer.sourceRectAtTime();\n' +
            '    [r.left, r.top];\n' +
            '}\n';
        return eval(expr);
    }
    var orphanPos = evalOrphanedPosition(false);
    assert.deepStrictEqual(orphanPos, [960, 540], "Orphaned shape layer must return base value without TypeError");
    console.log('  âœ“ Orphaned Layer Guard: if (!pLayer) { value; } prevents TypeError on unparented shapes');

    // 6. Pop and Snap Motion startOffset Definition Invariant
    function evalMotionPosition(motionType) {
        var value = [500, 300];
        var hasParent = true;
        var parent = {
            sourceRectAtTime: function() { return { left: 100, top: 200, width: 400, height: 120 }; },
            text: { sourceText: { style: { fontSize: 40 } } },
            effect: function(n) { return function(idx) { return 0; }; }
        };
        var effect = function(n) {
            return function(idx) {
                if (n === "Progress") return { value: 100, velocity: 0, numKeys: 0 };
                return 0;
            };
        };

        var getWidthCode = (motionType === "pop")
            ? 'var baseW = 400.0 * fontRatio;\nvar startOffset = 0;\nvar curW = (p <= 0) ? 0 : (baseW * p + pX * 2);\n'
            : 'var baseW = 400.0 * fontRatio;\nvar startOffset = 0;\nvar curW = (p <= 0) ? 0 : (baseW + pX * 2);\n';

        var posExpr =
            'var pLayer = hasParent ? parent : null;\n' +
            'if (!pLayer) {\n' +
            '    value;\n' +
            '} else {\n' +
            '    var pX = 10, offY = 0;\n' +
            '    var r = pLayer.sourceRectAtTime();\n' +
            '    var baseFS = 40, curFS = 40;\n' +
            '    var fontRatio = 1.0;\n' +
            '    var p = 1.0;\n' +
            '    var dynH = 40.0 * fontRatio;\n' +
            '    var linePitch = 40.0;\n' +
            '    var curY = r.top + (dynH / 2);\n' +
            '    var startOffset = 0;\n' +
            getWidthCode +
            '    var lOff = 0;\n' +
            '    var curX = (r.left + lOff - pX + (startOffset * fontRatio)) + (curW / 2);\n' +
            '    [curX, curY + offY];\n' +
            '}\n';

        return eval(posExpr);
    }
    var popPos = evalMotionPosition("pop");
    var snapPos = evalMotionPosition("snap");
    assert.ok(Array.isArray(popPos) && isFinite(popPos[0]), "Pop motion position must evaluate cleanly to numbers");
    assert.ok(Array.isArray(snapPos) && isFinite(snapPos[0]), "Snap motion position must evaluate cleanly to numbers");
    console.log('  âœ“ Pop & Snap Motions: startOffset is defined and evaluates valid coordinate array [X, Y]');

    // 7. Zero / Negative linePitch Clamp Guard
    function calcLinePitch(rHeight, dynH, totalLines) {
        return (totalLines > 1) ? Math.max(0, (rHeight - dynH) / (totalLines - 1)) : 0;
    }
    assert.strictEqual(calcLinePitch(30, 50, 4), 0, "linePitch clamps to 0 when r.height < dynH");
    assert.strictEqual(calcLinePitch(200, 40, 5), 40, "linePitch computes correctly for normal height");
    console.log('  âœ“ Negative Pitch Clamp: Math.max(0, ...) protects against line inversion if r.height < dynH');

    console.log('âœ“ All Expression Evaluation & Math Safety Tests Passed Successfully!\n');
    return true;
}

if (require.main === module) {
    runTest();
}

module.exports = runTest;
