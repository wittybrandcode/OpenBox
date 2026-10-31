/**
 * OPENBOX - Host Engine
 * Module: Recipes.jsx
 * Version: 2.3.0 (Parallel Multi-Line Sync, Time-Invariant Bounds & RTL/LTR Word Engine)
 * 
 * Extensible Strategy Pattern for Highlight Styles & Motions:
 * Decouples geometric measurements from visual representation and animation curves.
 * New styles or motions can be added without modifying the Core Builder.
 */

if (!$._smartHighlighter) $._smartHighlighter = {};

$._smartHighlighter.recipes = {
    styles: {},
    motions: {},

    registerStyle: function (name, recipe) {
        if (!name || typeof recipe !== "object") return false;
        recipe.id = name;
        this.styles[name] = recipe;
        $._smartHighlighter.log("Recipe registered: Style [" + name + "]");
        return true;
    },

    registerMotion: function (name, recipe) {
        if (!name || typeof recipe !== "object") return false;
        recipe.id = name;
        this.motions[name] = recipe;
        $._smartHighlighter.log("Recipe registered: Motion [" + name + "]");
        return true;
    },

    getStyle: function (name) {
        return this.styles[name] || this.styles["box"];
    },

    getMotion: function (name) {
        return this.motions[name] || this.motions["wipe"];
    },

    listStyles: function () {
        var list = [];
        for (var k in this.styles) { if (this.styles.hasOwnProperty(k)) list.push(k); }
        return list;
    },

    listMotions: function () {
        var list = [];
        for (var k in this.motions) { if (this.motions.hasOwnProperty(k)) list.push(k); }
        return list;
    }
};

// ═══════════════════════════════════════════════════════════════════
// 1. BUILT-IN MOTION STRATEGIES
// ═══════════════════════════════════════════════════════════════════

// A. TYPEWRITER MOTION STRATEGY
$._smartHighlighter.recipes.registerMotion("typewriter", {
    isTypewriter: true,

    setupTextAnimator: function (textLayer, tStart, tEnd, styleType, revealUnit, hasOutro, tOutStart, tOutEnd, outroOrder, useMarkers, typewriterMode, typewriterSpeedMode, linesData, totalTextChars, totalWords) {
        var animStyle = (styleType === "scale" || styleType === "pop") ? "scale" : "opacity";
        $._smartHighlighter.ensureTextTypewriter(textLayer, tStart, tEnd, animStyle, revealUnit, hasOutro, tOutStart, tOutEnd, outroOrder, useMarkers, typewriterMode, typewriterSpeedMode, linesData, totalTextChars, totalWords);
    },

    getProgressExpression: function (ctx) {
        var box = ctx.box || {};
        var lineNum = ((typeof box.lineIndex === "number") ? box.lineIndex : (ctx.index || 0)) + 1;
        var c1 = (ctx.timing && typeof ctx.timing.cStartPct === "number") ? ctx.timing.cStartPct : 0;
        var c2 = (ctx.timing && typeof ctx.timing.cEndPct === "number") ? ctx.timing.cEndPct : 100;
        var w1 = (ctx.timing && typeof ctx.timing.wStartPct === "number") ? ctx.timing.wStartPct : c1;
        var w2 = (ctx.timing && typeof ctx.timing.wEndPct === "number") ? ctx.timing.wEndPct : c2;
        var l1 = (ctx.timing && typeof ctx.timing.lStartPct === "number") ? ctx.timing.lStartPct : c1;
        var l2 = (ctx.timing && typeof ctx.timing.lEndPct === "number") ? ctx.timing.lEndPct : c2;

        return (
            'var res = value;\n' +
            'var pLayer = hasParent ? parent : null;\n' +
            'if (pLayer) {\n' +
            '    var anim = null;\n' +
            '    try { anim = pLayer.text.animator("Typewriter Sync"); } catch(e) {}\n' +
            '    if (!anim) { try { anim = pLayer.text.animator("Typewriter"); } catch(e2) {} }\n' +
            '    if (anim && anim.numProperties >= 1) {\n' +
            '        try {\n' +
            '            var lineNum = ' + lineNum + ';\n' +
            '            var sel = null;\n' +
            '            try { sel = anim.selector("Range Selector Line " + lineNum); } catch(eSL) {}\n' +
            '            if (!sel) { try { sel = anim.selector("Range Selector Intro"); } catch(eSI) {} }\n' +
            '            if (!sel) { try { sel = anim.selector(1); } catch(eS1) {} }\n' +
            '            if (sel) {\n' +
            '                var unitType = 1;\n' +
            '                try {\n' +
            '                    if (sel.advanced && sel.advanced.basedOn) unitType = sel.advanced.basedOn.value;\n' +
            '                } catch(eUT) {}\n' +
            '                var c1 = (unitType == 3) ? ' + w1.toFixed(4) + ' : ((unitType == 4) ? ' + l1.toFixed(4) + ' : ' + c1.toFixed(4) + ');\n' +
            '                var c2 = (unitType == 3) ? ' + w2.toFixed(4) + ' : ((unitType == 4) ? ' + l2.toFixed(4) + ' : ' + c2.toFixed(4) + ');\n' +
            '                var pVal = 0;\n' +
            '                var pStart = null; try { pStart = sel.start; } catch(e1) {}\n' +
            '                var pEnd = null; try { pEnd = sel.end; } catch(e2) {}\n' +
            '                if (pStart && (pStart.numKeys > 0 || pStart.expressionEnabled)) { pVal = pStart.value; }\n' +
            '                else if (pEnd && (pEnd.numKeys > 0 || pEnd.expressionEnabled)) { pVal = pEnd.value; }\n' +
            '                else if (pStart) { pVal = pStart.value; }\n' +
            '                else if (pEnd) { pVal = pEnd.value; }\n' +
            '                res = (pVal <= c1) ? 0 : ((pVal >= c2) ? 100 : linear(pVal, c1, c2, 0, 100));\n' +
            '                var outSel = null;\n' +
            '                try { outSel = anim.selector("Range Selector Outro Line " + lineNum); } catch(eOL) {}\n' +
            '                if (!outSel) { try { outSel = anim.selector("Range Selector Outro"); } catch(eOI) {} }\n' +
            '                if (!outSel) {\n' +
            '                    try {\n' +
            '                        var cand2 = anim.selector(2);\n' +
            '                        if (cand2 && cand2.name.indexOf("Line") == -1) outSel = cand2;\n' +
            '                    } catch(eO2) {}\n' +
            '                }\n' +
            '                if (outSel) {\n' +
            '                    var oStart = null; try { oStart = outSel.start; } catch(e3) {}\n' +
            '                    var oEnd = null; try { oEnd = outSel.end; } catch(e4) {}\n' +
            '                    if (oStart && (oStart.numKeys > 0 || oStart.expressionEnabled)) {\n' +
            '                        var oVal = oStart.value;\n' +
            '                        var outPct = (oVal >= c2) ? 100 : ((oVal <= c1) ? 0 : linear(oVal, c1, c2, 0, 100));\n' +
            '                        res = Math.min(res, outPct);\n' +
            '                    } else if (oEnd && (oEnd.numKeys > 0 || oEnd.expressionEnabled)) {\n' +
            '                        var oVal2 = oEnd.value;\n' +
            '                        var outPct2 = (oVal2 <= c1) ? 100 : ((oVal2 >= c2) ? 0 : linear(oVal2, c1, c2, 100, 0));\n' +
            '                        res = Math.min(res, outPct2);\n' +
            '                    }\n' +
            '                }\n' +
            '            }\n' +
            '        } catch(err) {}\n' +
            '    }\n' +
            '}\n' +
            'res;'
        );
    },

    getWidthSnippet: function (ctx) {
        var revealUnit = ctx.timing.revealUnit || "chars";
        var box = ctx.box;
        var boxOutroOrder = ctx.boxOutroOrder || "first";
        var targetBoxWStr = box.width.toFixed(2);
        var lineNum = ((typeof box.lineIndex === "number") ? box.lineIndex : (ctx.index || 0)) + 1;

        if (revealUnit === "words" && box.wOffsets && box.wOffsets.length > 0) {
            var wOffsetsStr = "[" + box.wOffsets.join(",") + "]";
            return (
                'var wOffsets = ' + wOffsetsStr + ';\n' +
                'var numWords = wOffsets.length;\n' +
                'var totalWordW = (numWords > 0) ? wOffsets[numWords - 1] : 0;\n' +
                'var targetBaseW = ' + targetBoxWStr + ';\n' +
                'var wNorm = (totalWordW > 0) ? (targetBaseW / totalWordW) : 1;\n' +
                'var curTextW = 0;\n' +
                'var startOffset = 0;\n' +
                'if (p > 0 && numWords > 0) {\n' +
                '    var visWords = Math.min(numWords, Math.max(0, Math.floor(p * numWords + 0.5)));\n' +
                '    if (typeof isForwardOutro !== "undefined" && isForwardOutro) {\n' +
                '        if (visWords >= numWords) {\n' +
                '            curTextW = targetBaseW;\n' +
                '            startOffset = 0;\n' +
                '        } else if (visWords > 0) {\n' +
                '            var hiddenW = wOffsets[numWords - visWords - 1] * wNorm;\n' +
                '            curTextW = targetBaseW - hiddenW;\n' +
                '            startOffset = hiddenW;\n' +
                '        } else {\n' +
                '            curTextW = 0;\n' +
                '            startOffset = targetBaseW;\n' +
                '        }\n' +
                '    } else {\n' +
                '        curTextW = (visWords > 0) ? (wOffsets[visWords - 1] * wNorm) : 0;\n' +
                '        startOffset = 0;\n' +
                '    }\n' +
                '}\n' +
                'var curW = (p <= 0 || curTextW <= 0) ? 0 : (curTextW * fontRatio + pX * 2);\n'
            );
        } else if (revealUnit === "lines") {
            return (
                'var baseW = ' + targetBoxWStr + ' * fontRatio;\n' +
                'var startOffset = 0;\n' +
                'var curW = (p >= 0.5) ? (baseW + pX * 2) : 0;\n'
            );
        } else if (box.cOffsets && box.cOffsets.length > 0) {
            var cOffsetsStr = "[" + box.cOffsets.join(",") + "]";
            return (
                'var cOffsets = ' + cOffsetsStr + ';\n' +
                'var numChars = cOffsets.length;\n' +
                'var totalCharW = (numChars > 0) ? cOffsets[numChars - 1] : 0;\n' +
                'var targetBaseW = ' + targetBoxWStr + ';\n' +
                'var cNorm = (totalCharW > 0) ? (targetBaseW / totalCharW) : 1;\n' +
                'var curTextW = 0;\n' +
                'var startOffset = 0;\n' +
                'if (p > 0 && numChars > 0) {\n' +
                '    var smVal = 0;\n' +
                '    try {\n' +
                '        var anim = null;\n' +
                '        try { anim = pLayer.text.animator("Typewriter Sync"); } catch(e01) {}\n' +
                '        if (!anim) { try { anim = pLayer.text.animator("Typewriter"); } catch(e02) {} }\n' +
                '        if (anim) {\n' +
                '            var sel = null;\n' +
                '            try { sel = anim.selector("Range Selector Line ' + lineNum + '"); } catch(eSL) {}\n' +
                '            if (!sel) { try { sel = anim.selector(1); } catch(eS1) {} }\n' +
                '            if (sel && sel.advanced && sel.advanced.smoothness) {\n' +
                '                smVal = sel.advanced.smoothness.value;\n' +
                '            }\n' +
                '        }\n' +
                '    } catch(eSm) {}\n' +
                '    if (typeof isForwardOutro !== "undefined" && isForwardOutro) {\n' +
                '        var visChars = Math.min(numChars, Math.max(0, Math.floor(p * numChars + 0.5)));\n' +
                '        if (visChars >= numChars) {\n' +
                '            curTextW = targetBaseW;\n' +
                '            startOffset = 0;\n' +
                '        } else if (visChars > 0) {\n' +
                '            var hiddenW = cOffsets[numChars - visChars - 1] * cNorm;\n' +
                '            curTextW = targetBaseW - hiddenW;\n' +
                '            startOffset = hiddenW;\n' +
                '        } else {\n' +
                '            curTextW = 0;\n' +
                '            startOffset = targetBaseW;\n' +
                '        }\n' +
                '    } else if (smVal > 0) {\n' +
                '        var cFloat = p * numChars;\n' +
                '        var cIdx = Math.min(numChars - 1, Math.floor(cFloat));\n' +
                '        var prevW = ((cIdx > 0) ? cOffsets[cIdx - 1] : 0) * cNorm;\n' +
                '        var nextW = cOffsets[cIdx] * cNorm;\n' +
                '        var frac = cFloat - cIdx;\n' +
                '        curTextW = prevW + frac * (nextW - prevW);\n' +
                '        startOffset = 0;\n' +
                '    } else {\n' +
                '        var visChars = Math.min(numChars, Math.max(0, Math.floor(p * numChars + 0.5)));\n' +
                '        curTextW = (visChars > 0) ? (cOffsets[visChars - 1] * cNorm) : 0;\n' +
                '        startOffset = 0;\n' +
                '    }\n' +
                '}\n' +
                'var curW = (p <= 0 || curTextW <= 0) ? 0 : (curTextW * fontRatio + pX * 2);\n'
            );
        }

        return (
            'var baseW = ' + targetBoxWStr + ' * fontRatio;\n' +
            'var startOffset = (typeof isForwardOutro !== "undefined" && isForwardOutro) ? (baseW * (1 - p)) : 0;\n' +
            'var curW = (p <= 0) ? 0 : (baseW * p + pX * 2);\n'
        );
    },

    getOpacityCondition: function (ctx) {
        if (ctx.timing.revealUnit === "lines") {
            return "(prog < 50) ? 0 : baseOp;";
        }
        return "(prog <= 0) ? 0 : baseOp;";
    }
});

// B. SMOOTH WIPE MOTION STRATEGY
$._smartHighlighter.recipes.registerMotion("wipe", {
    isTypewriter: false,

    applyKeyframeEasing: function (progSlider, k1Idx, k2Idx) {
        var easePunch = new KeyframeEase(0, 25);
        var easeDecel = new KeyframeEase(0, 80);
        progSlider.setTemporalEaseAtKey(k1Idx, [easePunch], [easePunch]);
        progSlider.setTemporalEaseAtKey(k2Idx, [easeDecel], [easeDecel]);
    },

    applyOutroKeyframeEasing: function (progSlider, k3Idx, k4Idx) {
        var easeOutIn = new KeyframeEase(0, 30);
        var easeOutEnd = new KeyframeEase(0, 75);
        progSlider.setTemporalEaseAtKey(k3Idx, [easeOutIn], [easeOutIn]);
        progSlider.setTemporalEaseAtKey(k4Idx, [easeOutEnd], [easeOutEnd]);
    },

    getWidthSnippet: function (ctx) {
        return (
            'var baseW = ' + ctx.box.width.toFixed(2) + ' * fontRatio;\n' +
            'var startOffset = (typeof isForwardOutro !== "undefined" && isForwardOutro) ? (baseW * (1 - p)) : 0;\n' +
            'var curW = (p <= 0) ? 0 : (baseW * p + pX * 2);\n'
        );
    },

    getOpacityCondition: function (ctx) {
        return "(prog <= 0) ? 0 : baseOp;";
    }
});

// C. SCALE POP (ELASTIC BOUNCE) MOTION STRATEGY
$._smartHighlighter.recipes.registerMotion("pop", {
    isTypewriter: false,

    applyTransformScale: function (scaleProp, ctx) {
        var scaleExpr = 
            'var useM = 0; try { useM = effect("Use Timeline Markers")(1); } catch(eUM) {}\n' +
            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 1) {\n' +
            '    var dIn = 0.20; try { dIn = Math.max(0.01, effect("Intro Duration (s)")(1)); } catch(eDI) {}\n' +
            '    var dOut = 0.20; try { dOut = Math.max(0.01, effect("Outro Duration (s)")(1)); } catch(eDO) {}\n' +
            '    var tIn = thisLayer.inPoint;\n' +
            '    try { tIn = thisLayer.marker.key("IN").time; } catch(eK1) { try { tIn = thisLayer.marker.key(1).time; } catch(eK2) {} }\n' +
            '    var hasOut = false;\n' +
            '    var tOut = 0;\n' +
            '    if (thisLayer.marker.numKeys >= 2) {\n' +
            '        try { tOut = thisLayer.marker.key("OUT").time; hasOut = true; } catch(eKO) {}\n' +
            '    }\n' +
            '    var s = 100;\n' +
            '    if (time < tIn) {\n' +
            '        s = 0;\n' +
            '    } else if (time < tIn + dIn) {\n' +
            '        s = easeOut(time, tIn, tIn + dIn, 0, 100);\n' +
            '    } else if (hasOut && time >= tOut) {\n' +
            '        s = easeIn(time, tOut, tOut + dOut, 100, 0);\n' +
            '    } else {\n' +
            '        s = 100;\n' +
            '    }\n' +
            '    [s, s];\n' +
            '} else {\n' +
            '    var p = 100; try { p = effect("Progress")(1); } catch(eP) {}\n' +
            '    var outVal = [100, 100];\n' +
            '    if (p.numKeys >= 2) {\n' +
            '        var k1 = p.key(1);\n' +
            '        var k2 = p.key(2);\n' +
            '        if (time < k1.time) {\n' +
            '            outVal = [0, 0];\n' +
            '        } else if (time <= k2.time) {\n' +
            '            var tNorm = (time - k1.time) / Math.max(0.001, (k2.time - k1.time));\n' +
            '            var s = easeOut(tNorm, 0, 1, 93, 100);\n' +
            '            outVal = [s, s];\n' +
            '        } else {\n' +
            '            var hasExit = (p.numKeys >= 4);\n' +
            '            var k3 = hasExit ? p.key(3) : null;\n' +
            '            var k4 = hasExit ? p.key(4) : null;\n' +
            '            if (hasExit && time >= k4.time) {\n' +
            '                outVal = [0, 0];\n' +
            '            } else if (hasExit && time >= k3.time) {\n' +
            '                var tOutNorm = (time - k3.time) / Math.max(0.001, (k4.time - k3.time));\n' +
            '                var sOut = easeIn(tOutNorm, 0, 1, 100, 0);\n' +
            '                outVal = [sOut, sOut];\n' +
            '            } else {\n' +
            '                outVal = [100, 100];\n' +
            '            }\n' +
            '        }\n' +
            '    } else {\n' +
            '        var prog = p.value;\n' +
            '        if (prog <= 0) {\n' +
            '            outVal = [0, 0];\n' +
            '        } else if (prog < 100) {\n' +
            '            var sProg = easeOut(prog, 0, 100, 93, 100);\n' +
            '            outVal = [sProg, sProg];\n' +
            '        } else {\n' +
            '            outVal = [100, 100];\n' +
            '        }\n' +
            '    }\n' +
            '    outVal;\n' +
            '}';
        scaleProp.expression = scaleExpr;
    },

    applyKeyframeEasing: function (progSlider, k1Idx, k2Idx) {
        var easePunch = new KeyframeEase(0, 25);
        var easeDecel = new KeyframeEase(0, 80);
        progSlider.setTemporalEaseAtKey(k1Idx, [easePunch], [easePunch]);
        progSlider.setTemporalEaseAtKey(k2Idx, [easeDecel], [easeDecel]);
    },

    applyOutroKeyframeEasing: function (progSlider, k3Idx, k4Idx) {
        var easeOutIn = new KeyframeEase(0, 30);
        var easeOutEnd = new KeyframeEase(0, 75);
        progSlider.setTemporalEaseAtKey(k3Idx, [easeOutIn], [easeOutIn]);
        progSlider.setTemporalEaseAtKey(k4Idx, [easeOutEnd], [easeOutEnd]);
    },

    getWidthSnippet: function (ctx) {
        return (
            'var baseW = ' + ctx.box.width.toFixed(2) + ' * fontRatio;\n' +
            'var startOffset = 0;\n' +
            'var curW = (p <= 0) ? 0 : (baseW + pX * 2);\n'
        );
    },

    getOpacityCondition: function (ctx) {
        return "(prog <= 0) ? 0 : baseOp;";
    }
});

// D. SNAP JUMP MOTION STRATEGY (0-Frame Cut)

// E. ELASTIC SPRING BOUNCE MOTION STRATEGY [EV-06]
$._smartHighlighter.recipes.registerMotion("elastic", {
    id: "elastic",
    name: "Elastic Spring Bounce",
    isTypewriter: false,

    applyTransformScale: function (scaleProp, ctx) {
        var scaleExpr = 
            'var useM = 0; try { useM = effect("Use Timeline Markers")(1); } catch(eUM) {}\n' +
            'var dIn = 0.35; try { dIn = Math.max(0.01, effect("Intro Duration (s)")(1)); } catch(eDI) {}\n' +
            'var tIn = thisLayer.inPoint;\n' +
            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 1) {\n' +
            '    try { tIn = thisLayer.marker.key("IN").time; } catch(eK) { try { tIn = thisLayer.marker.key(1).time; } catch(eK2) {} }\n' +
            '}\n' +
            'var s = 100;\n' +
            'if (time < tIn) {\n' +
            '    s = 0;\n' +
            '} else if (time < tIn + dIn) {\n' +
            '    var tNorm = (time - tIn) / Math.max(0.001, dIn);\n' +
            '    var decay = 5.0; var freq = 14.0;\n' +
            '    s = 100 - (100 * Math.exp(-decay * tNorm) * Math.cos(freq * tNorm));\n' +
            '} else {\n' +
            '    s = 100;\n' +
            '}\n' +
            '[s, s];';
        try { scaleProp.expression = scaleExpr; } catch (eSc) {}
    },

    getWidthSnippet: function (ctx) {
        return 'var curW = fullW;\n';
    },

    getOpacityCondition: function (ctx) {
        return '(prog <= 0) ? 0 : baseOp;';
    }
});

// F. SNAPPY EASE-OUT MOTION STRATEGY [EV-06]
$._smartHighlighter.recipes.registerMotion("snappy", {
    id: "snappy",
    name: "Snappy Ease-Out",
    isTypewriter: false,

    applyTransformScale: function (scaleProp, ctx) {
        var scaleExpr = 
            'var useM = 0; try { useM = effect("Use Timeline Markers")(1); } catch(eUM) {}\n' +
            'var dIn = 0.22; try { dIn = Math.max(0.01, effect("Intro Duration (s)")(1)); } catch(eDI) {}\n' +
            'var tIn = thisLayer.inPoint;\n' +
            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 1) {\n' +
            '    try { tIn = thisLayer.marker.key("IN").time; } catch(eK) { try { tIn = thisLayer.marker.key(1).time; } catch(eK2) {} }\n' +
            '}\n' +
            'var s = (time < tIn) ? 0 : ((time < tIn + dIn) ? easeOut(time, tIn, tIn + dIn, 0, 100) : 100);\n' +
            '[s, s];';
        try { scaleProp.expression = scaleExpr; } catch (eSc2) {}
    },

    getWidthSnippet: function (ctx) {
        return 'var curW = fullW;\n';
    },

    getOpacityCondition: function (ctx) {
        return '(prog <= 0) ? 0 : baseOp;';
    }
});

$._smartHighlighter.recipes.registerMotion("snap", {
    isTypewriter: false,
    lineDur: 0.04,

    getWidthSnippet: function (ctx) {
        return (
            'var baseW = ' + ctx.box.width.toFixed(2) + ' * fontRatio;\n' +
            'var startOffset = 0;\n' +
            'var curW = (p <= 0) ? 0 : (baseW + pX * 2);\n'
        );
    },

    getOpacityCondition: function (ctx) {
        return "(prog <= 0) ? 0 : baseOp;";
    }
});

// ═══════════════════════════════════════════════════════════════════
// 2. BUILT-IN VISUAL STYLE STRATEGIES
// ═══════════════════════════════════════════════════════════════════

// Base Helper for Box Positions
var getStandardPositionSnippet = function (ctx) {
    var box = ctx.box;
    var totalSlots = (typeof ctx.totalSlots === "number" && ctx.totalSlots > 0) ? ctx.totalSlots : ((typeof box.totalSlots === "number" && box.totalSlots > 0) ? box.totalSlots : ((typeof ctx.totalLines === "number" && ctx.totalLines > 0) ? ctx.totalLines : 1));
    var slotIndex = (typeof ctx.slotIndex === "number") ? ctx.slotIndex : ((typeof box.slotIndex === "number") ? box.slotIndex : ((typeof box.lineIndex === "number") ? box.lineIndex : 0));
    var isCenter = ctx.isCenter;
    var boxOutroOrder = ctx.boxOutroOrder || "first";
    var isForwardOutro = (boxOutroOrder === "first");

    var safeBaseFS = Math.max(1, (typeof ctx.baseFS === "number" && ctx.baseFS > 0) ? ctx.baseFS : 1);
    var safeBaseTotalH = Math.max(1, (typeof ctx.baseTotalH === "number" && ctx.baseTotalH > 0) ? ctx.baseTotalH : 1);
    var safeBaseTotalW = (typeof ctx.baseTotalW === "number" && ctx.baseTotalW > 0) ? ctx.baseTotalW : ((typeof box.lineWidth === "number" && box.lineWidth > 0) ? box.lineWidth : 100);
    var safeBaseLeft = (typeof ctx.baseFullLeft === "number") ? ctx.baseFullLeft : 0;
    var safeBaseTop = (typeof ctx.baseFullTop === "number") ? ctx.baseFullTop : 0;
    var hasStaticBounds = (typeof ctx.baseFullLeft === "number" && typeof ctx.baseTotalW === "number" && ctx.baseTotalW > 0);

    var posSnippet = 
        'var pLayer = hasParent ? parent : null;\n' +
        'if (!pLayer) {\n' +
        '    value;\n' +
        '} else {\n' +
        '    var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
        '    var pX = (useM == 1 && pLayer && pLayer.effect("Master Padding X")) ? pLayer.effect("Master Padding X")(1) : effect("Local Padding X")(1);\n' +
        '    var offY = (useM == 1 && pLayer && pLayer.effect("Master Offset Y")) ? pLayer.effect("Master Offset Y")(1) : effect("Local Offset Y")(1);\n\n' +
        '    var baseFS = ' + safeBaseFS.toFixed(2) + ';\n' +
        '    var curFS = baseFS;\n' +
        '    var r = pLayer.sourceRectAtTime(0, false);\n' +
        '    if (r.width <= 0.5 || r.height <= 0.5) { r = pLayer.sourceRectAtTime(time, false); }\n' +
        '    if (r.width <= 0.5 || r.height <= 0.5) { r = pLayer.sourceRectAtTime((pLayer.inPoint + pLayer.outPoint) * 0.5, false); }\n' +
        '    try { curFS = pLayer.text.sourceText.style.fontSize; } catch(err) { curFS = baseFS * (Math.max(1, r.height) / Math.max(1, ' + safeBaseTotalH.toFixed(2) + ')); }\n' +
        '    var fontRatio = Math.max(0.01, curFS / Math.max(1, baseFS));\n';

    posSnippet +=
        '    var p = 1; try { p = clamp(effect("Progress")(1) / 100, 0, 1); } catch(eP) {}\n' +
        '    var isOutro = false;\n' +
        '    try {\n' +
        '        var pProg = null; try { pProg = effect("Progress")(1); } catch(ePP) {}\n' +
        '        if (pProg && pProg.velocity < -0.001) {\n' +
        '            isOutro = true;\n' +
        '        } else if (pProg && pProg.numKeys >= 4 && time >= pProg.key(3).time) {\n' +
        '            isOutro = true;\n' +
        '        }\n' +
        '        if (!isOutro && thisLayer.marker && thisLayer.marker.numKeys >= 2) {\n' +
        '            try {\n' +
        '                var mOutTime = thisLayer.marker.key("OUT").time;\n' +
        '                if (time >= mOutTime) isOutro = true;\n' +
        '            } catch(eMO2) {}\n' +
        '        }\n' +
        '        if (!isOutro && pLayer && pLayer.marker && pLayer.marker.numKeys > 0) {\n' +
        '            for (var mi = 1; mi <= pLayer.marker.numKeys; mi++) {\n' +
        '                if (pLayer.marker.key(mi).comment === "HL_OUT_START" && time >= pLayer.marker.key(mi).time) {\n' +
        '                    isOutro = true; break;\n' +
        '                }\n' +
        '            }\n' +
        '        }\n' +
        '    } catch(eOD) {}\n' +
        '    var isForwardOutro = isOutro && ' + (isForwardOutro ? 'true' : 'false') + ';\n' +
        '    var curX, curY;\n' +
        '    var dynH = ' + box.height.toFixed(2) + ' * fontRatio;\n' +
        '    // حساب المسافة الرأسية بالاعتماد على totalSlots لمنع أي انزياح أو صندوق وهمي عند الأسطر الفارغة\n' +
        '    var linePitch = (' + totalSlots + ' > 1) ? Math.max(0, (r.height - dynH) / (' + (totalSlots - 1) + ')) : 0;\n';

    if (ctx.style.id === "underline" || ctx.style.id === "wavy") {
        if (totalSlots === 1) {
            posSnippet += '    curY = r.top + r.height - (Math.max(curFS * 0.12, 5) / 2) + 2;\n';
        } else {
            posSnippet += '    curY = r.top + dynH + (' + slotIndex + ' * linePitch) - (Math.max(curFS * 0.12, 5) / 2) + 2;\n';
        }
    } else {
        if (totalSlots === 1) {
            posSnippet += '    curY = r.top + (r.height / 2);\n';
        } else {
            posSnippet += '    curY = r.top + (dynH / 2) + (' + slotIndex + ' * linePitch);\n';
        }
    }

    posSnippet += '    var startOffset = 0;\n';
    posSnippet += ctx.motion.getWidthSnippet(ctx) + '\n';

    if (box.isWord) {
        var isLineRTL = (typeof box.line_rtl === "boolean") ? box.line_rtl : box.rtl_k;
        if (isLineRTL) {
            if (isCenter) {
                posSnippet +=
                    '    var cOff = ' + (box.centerOffset ? box.centerOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                    '    var lineRight = r.left + (r.width / 2) + cOff + (' + (box.lineWidth / 2).toFixed(2) + ' * fontRatio);\n';
            } else {
                posSnippet +=
                    '    var rOff = ' + (box.rightOffset ? box.rightOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                    '    var lineRight = (r.left + r.width) - rOff;\n';
            }
            posSnippet += '    var rightEdge = lineRight - (' + box.wordOffset.toFixed(2) + ' * fontRatio);\n';
            if (box.rtl_k) {
                // Arabic word in RTL line: wipes RTL
                posSnippet +=
                    '    curX = (rightEdge + pX - (startOffset * fontRatio)) - (curW / 2);\n' +
                    '    [curX, curY + offY];\n';
            } else {
                // Latin word inside RTL line: positioned within RTL flow, wipes LTR
                posSnippet +=
                    '    var wordBaseW = ' + box.width.toFixed(2) + ' * fontRatio;\n' +
                    '    var leftEdge = rightEdge - wordBaseW;\n' +
                    '    curX = (leftEdge - pX + (startOffset * fontRatio)) + (curW / 2);\n' +
                    '    [curX, curY + offY];\n';
            }
        } else {
            if (isCenter) {
                posSnippet +=
                    '    var cOff = ' + (box.centerOffset ? box.centerOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                    '    var lineLeft = r.left + (r.width / 2) + cOff - (' + (box.lineWidth / 2).toFixed(2) + ' * fontRatio);\n';
            } else {
                posSnippet +=
                    '    var lOff = ' + (box.leftOffset ? box.leftOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                    '    var lineLeft = r.left + lOff;\n';
            }
            posSnippet += '    var leftEdge = lineLeft + (' + box.wordOffset.toFixed(2) + ' * fontRatio);\n';
            if (box.rtl_k) {
                // Arabic word inside LTR line: positioned within LTR flow, wipes RTL
                posSnippet +=
                    '    var wordBaseW = ' + box.width.toFixed(2) + ' * fontRatio;\n' +
                    '    var rightEdge = leftEdge + wordBaseW;\n' +
                    '    curX = (rightEdge + pX - (startOffset * fontRatio)) - (curW / 2);\n' +
                    '    [curX, curY + offY];\n';
            } else {
                // Latin word in LTR line: wipes LTR
                posSnippet +=
                    '    curX = (leftEdge - pX + (startOffset * fontRatio)) + (curW / 2);\n' +
                    '    [curX, curY + offY];\n';
            }
        }
    } else {
        if (isCenter) {
            posSnippet += 
                '    var cOff = ' + (box.centerOffset ? box.centerOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                '    var lineCenterX = r.left + (r.width / 2) + cOff;\n';
            if (box.rtl_k) {
                posSnippet +=
                    '    var lineHalfW = (' + (box.width / 2).toFixed(2) + ' * fontRatio);\n' +
                    '    var rightEdge = lineCenterX + lineHalfW;\n' +
                    '    curX = (rightEdge + pX - (startOffset * fontRatio)) - (curW / 2);\n' +
                    '    [curX, curY + offY];\n';
            } else {
                posSnippet +=
                    '    var lineHalfW = (' + (box.width / 2).toFixed(2) + ' * fontRatio);\n' +
                    '    var leftEdge = lineCenterX - lineHalfW;\n' +
                    '    curX = (leftEdge - pX + (startOffset * fontRatio)) + (curW / 2);\n' +
                    '    [curX, curY + offY];\n';
            }
        } else if (box.rtl_k) {
            posSnippet += 
                '    var rOff = ' + (box.rightOffset ? box.rightOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                '    curX = ((r.left + r.width) - rOff + pX - (startOffset * fontRatio)) - (curW / 2);\n' +
                '    [curX, curY + offY];\n';
        } else {
            posSnippet += 
                '    var lOff = ' + (box.leftOffset ? box.leftOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                '    curX = (r.left + lOff - pX + (startOffset * fontRatio)) + (curW / 2);\n' +
                '    [curX, curY + offY];\n';
        }
    }

    posSnippet += '}\n';
    return posSnippet;
};

// Base Helper for Box Size
var getStandardSizeSnippet = function (ctx) {
    var box = ctx.box;
    var totalSlots = (typeof ctx.totalSlots === "number" && ctx.totalSlots > 0) ? ctx.totalSlots : ((typeof box.totalSlots === "number" && box.totalSlots > 0) ? box.totalSlots : ((typeof ctx.totalLines === "number" && ctx.totalLines > 0) ? ctx.totalLines : 1));
    var boxOutroOrder = ctx.boxOutroOrder || "first";
    var isForwardOutro = (boxOutroOrder === "first");

    var safeBaseFS = Math.max(1, (typeof ctx.baseFS === "number" && ctx.baseFS > 0) ? ctx.baseFS : 1);
    var safeBaseTotalH = Math.max(1, (typeof ctx.baseTotalH === "number" && ctx.baseTotalH > 0) ? ctx.baseTotalH : 1);
    var safeBaseTotalW = (typeof ctx.baseTotalW === "number" && ctx.baseTotalW > 0) ? ctx.baseTotalW : ((typeof box.lineWidth === "number" && box.lineWidth > 0) ? box.lineWidth : 100);
    var safeBaseLeft = (typeof ctx.baseFullLeft === "number") ? ctx.baseFullLeft : 0;
    var safeBaseTop = (typeof ctx.baseFullTop === "number") ? ctx.baseFullTop : 0;

    var sizeSnippet = 
        'var pLayer = hasParent ? parent : null;\n' +
        'if (!pLayer) {\n' +
        '    value;\n' +
        '} else {\n' +
        '    var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
        '    var pX = (useM == 1 && pLayer && pLayer.effect("Master Padding X")) ? pLayer.effect("Master Padding X")(1) : effect("Local Padding X")(1);\n' +
        '    var pY = (useM == 1 && pLayer && pLayer.effect("Master Padding Y")) ? pLayer.effect("Master Padding Y")(1) : effect("Local Padding Y")(1);\n\n' +
        '    var r = pLayer.sourceRectAtTime(0, false);\n' +
        '    if (r.width <= 0.5 || r.height <= 0.5) { r = pLayer.sourceRectAtTime(time, false); }\n' +
        '    if (r.width <= 0.5 || r.height <= 0.5) { r = pLayer.sourceRectAtTime((pLayer.inPoint + pLayer.outPoint) * 0.5, false); }\n' +
        '    var baseFS = ' + safeBaseFS.toFixed(2) + ';\n' +
        '    var curFS = baseFS;\n' +
        '    try { curFS = pLayer.text.sourceText.style.fontSize; } catch(err) { curFS = baseFS * (Math.max(1, r.height) / Math.max(1, ' + safeBaseTotalH.toFixed(2) + ')); }\n' +
        '    var fontRatio = Math.max(0.01, curFS / Math.max(1, baseFS));\n\n' +
        '    var p = 1; try { p = clamp(effect("Progress")(1) / 100, 0, 1); } catch(eP) {}\n' +
        '    var isOutro = false;\n' +
        '    try {\n' +
        '        var pProg = null; try { pProg = effect("Progress")(1); } catch(ePP) {}\n' +
        '        if (pProg && pProg.velocity < -0.001) {\n' +
        '            isOutro = true;\n' +
        '        } else if (pProg && pProg.numKeys >= 4 && time >= pProg.key(3).time) {\n' +
        '            isOutro = true;\n' +
        '        }\n' +
        '        if (!isOutro && pLayer && pLayer.marker && pLayer.marker.numKeys > 0) {\n' +
        '            for (var mi = 1; mi <= pLayer.marker.numKeys; mi++) {\n' +
        '                if (pLayer.marker.key(mi).comment === "HL_OUT_START" && time >= pLayer.marker.key(mi).time) {\n' +
        '                    isOutro = true; break;\n' +
        '                }\n' +
        '            }\n' +
        '        }\n' +
        '    } catch(eOD) {}\n' +
        '    var isForwardOutro = isOutro && ' + (isForwardOutro ? 'true' : 'false') + ';\n' +
        '    var fullH;\n';

    if (ctx.style.id === "underline" || ctx.style.id === "wavy") {
        sizeSnippet += '    fullH = Math.max(curFS * 0.12, 5) + pY;\n';
    } else if (totalSlots === 1) {
        sizeSnippet += '    fullH = Math.max(r.height, ' + box.height.toFixed(2) + ' * fontRatio) + (pY * 2);\n';
    } else {
        sizeSnippet += '    fullH = (' + box.height.toFixed(2) + ' * fontRatio) + (pY * 2);\n';
    }

    sizeSnippet += '    ' + ctx.motion.getWidthSnippet(ctx) + '[curW, fullH];\n}\n';
    return sizeSnippet;
};

// A. STANDARD BOX STYLE
$._smartHighlighter.recipes.registerStyle("box", {
    name: "Standard Box",
    defaultRoundness: 0,
    blendingMode: BlendingMode.NORMAL,

    setupLayer: function (shapeLayer, ctx) {
        var rotZ = shapeLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (rotZ) rotZ.setValue(0);
        shapeLayer.blendingMode = this.blendingMode;
    },

    getSizeExpression: function (ctx) {
        return getStandardSizeSnippet(ctx);
    },

    getPositionExpression: function (ctx) {
        return getStandardPositionSnippet(ctx);
    },

    buildGraphics: function (gContents, ctx) {
        var fill = gContents.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Fill Color";
        fill.property("ADBE Vector Fill Color").expression = 
            'var pLayer = hasParent ? parent : null;\n' +
            'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
            'var mCol = (pLayer && pLayer.effect("Master Highlight Color")) ? pLayer.effect("Master Highlight Color")(1) : [1, 0.9, 0, 1];\n' +
            'var lColProp = effect("Local Color")(1);\n' +
            '(useM == 0 || !pLayer || lColProp.numKeys > 0) ? lColProp.value : mCol;';
    }
});

// B. PILL STYLE
$._smartHighlighter.recipes.registerStyle("pill", {
    name: "Rounded Pill",
    defaultRoundness: 50,
    blendingMode: BlendingMode.NORMAL,

    setupLayer: function (shapeLayer, ctx) {
        var rotZ = shapeLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (rotZ) rotZ.setValue(0);
        shapeLayer.blendingMode = this.blendingMode;
    },

    getSizeExpression: function (ctx) {
        return getStandardSizeSnippet(ctx);
    },

    getPositionExpression: function (ctx) {
        return getStandardPositionSnippet(ctx);
    },

    buildGraphics: function (gContents, ctx) {
        var fill = gContents.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Fill Color";
        fill.property("ADBE Vector Fill Color").expression = 
            'var pLayer = hasParent ? parent : null;\n' +
            'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
            'var mCol = (pLayer && pLayer.effect("Master Highlight Color")) ? pLayer.effect("Master Highlight Color")(1) : [1, 0.9, 0, 1];\n' +
            'var lColProp = effect("Local Color")(1);\n' +
            '(useM == 0 || !pLayer || lColProp.numKeys > 0) ? lColProp.value : mCol;';
    }
});

// C. REAL MARKER STYLE (Organic Tilt & Multiply Blending)
$._smartHighlighter.recipes.registerStyle("marker", {
    name: "Real Marker",
    defaultRoundness: 2,
    blendingMode: BlendingMode.MULTIPLY,

    setupLayer: function (shapeLayer, ctx) {
        var tilts = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.7];
        var rotZ = shapeLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (rotZ) rotZ.setValue(tilts[ctx.index % tilts.length]);
        shapeLayer.blendingMode = this.blendingMode;
    },

    getSizeExpression: function (ctx) {
        return getStandardSizeSnippet(ctx);
    },

    getPositionExpression: function (ctx) {
        return getStandardPositionSnippet(ctx);
    },

    buildGraphics: function (gContents, ctx) {
        var fill = gContents.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Fill Color";
        fill.property("ADBE Vector Fill Color").expression = 
            'var pLayer = hasParent ? parent : null;\n' +
            'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
            'var mCol = (pLayer && pLayer.effect("Master Highlight Color")) ? pLayer.effect("Master Highlight Color")(1) : [1, 0.9, 0, 1];\n' +
            'var lColProp = effect("Local Color")(1);\n' +
            '(useM == 0 || !pLayer || lColProp.numKeys > 0) ? lColProp.value : mCol;';
    }
});

// D. CLEAN UNDERLINE STYLE
$._smartHighlighter.recipes.registerStyle("underline", {
    name: "Underline Strip",
    defaultRoundness: 0,
    blendingMode: BlendingMode.NORMAL,

    setupLayer: function (shapeLayer, ctx) {
        var rotZ = shapeLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (rotZ) rotZ.setValue(0);
        shapeLayer.blendingMode = this.blendingMode;
    },

    getSizeExpression: function (ctx) {
        return getStandardSizeSnippet(ctx);
    },

    getPositionExpression: function (ctx) {
        return getStandardPositionSnippet(ctx);
    },

    buildGraphics: function (gContents, ctx) {
        var fill = gContents.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Fill Color";
        fill.property("ADBE Vector Fill Color").expression = 
            'var pLayer = hasParent ? parent : null;\n' +
            'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
            'var mCol = (pLayer && pLayer.effect("Master Highlight Color")) ? pLayer.effect("Master Highlight Color")(1) : [1, 0.9, 0, 1];\n' +
            'var lColProp = effect("Local Color")(1);\n' +
            '(useM == 0 || !pLayer || lColProp.numKeys > 0) ? lColProp.value : mCol;';
    }
});

// E. OUTLINE STYLE (Stroke Only)
$._smartHighlighter.recipes.registerStyle("outline", {
    name: "Hollow Outline",
    defaultRoundness: 0,
    blendingMode: BlendingMode.NORMAL,

    setupLayer: function (shapeLayer, ctx) {
        var rotZ = shapeLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (rotZ) rotZ.setValue(0);
        shapeLayer.blendingMode = this.blendingMode;
    },

    getSizeExpression: function (ctx) {
        return getStandardSizeSnippet(ctx);
    },

    getPositionExpression: function (ctx) {
        return getStandardPositionSnippet(ctx);
    },

    buildGraphics: function (gContents, ctx) {
        var stroke = gContents.addProperty("ADBE Vector Graphic - Stroke");
        stroke.name = "Outline Stroke";
        stroke.property("ADBE Vector Stroke Width").setValue(3);
        stroke.property("ADBE Vector Stroke Color").expression = 
            'var pLayer = hasParent ? parent : null;\n' +
            'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
            'var mCol = (pLayer && pLayer.effect("Master Highlight Color")) ? pLayer.effect("Master Highlight Color")(1) : [1, 0.9, 0, 1];\n' +
            'var lColProp = effect("Local Color")(1);\n' +
            '(useM == 0 || !pLayer || lColProp.numKeys > 0) ? lColProp.value : mCol;';
    }
});


// F. WAVY / ZIGZAG UNDERLINE STYLE
$._smartHighlighter.recipes.registerStyle("wavy", {
    name: "Wavy Underline",
    defaultRoundness: 0,
    blendingMode: BlendingMode.NORMAL,

    setupLayer: function (shapeLayer, ctx) {
        var rotZ = shapeLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        if (rotZ) rotZ.setValue(0);
        shapeLayer.blendingMode = this.blendingMode;
    },

    getSizeExpression: function (ctx) {
        return getStandardSizeSnippet(ctx);
    },

    getPositionExpression: function (ctx) {
        return getStandardPositionSnippet(ctx);
    },

    buildGraphics: function (gContents, ctx) {
        var stroke = gContents.addProperty("ADBE Vector Graphic - Stroke");
        stroke.name = "Wavy Stroke";
        stroke.property("ADBE Vector Stroke Width").setValue(3);
        stroke.property("ADBE Vector Stroke Color").expression = 
            'var pLayer = hasParent ? parent : null;\n' +
            'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
            'var mCol = (pLayer && pLayer.effect("Master Highlight Color")) ? pLayer.effect("Master Highlight Color")(1) : [1, 0.9, 0, 1];\n' +
            'var lColProp = effect("Local Color")(1);\n' +
            '(useM == 0 || !pLayer || lColProp.numKeys > 0) ? lColProp.value : mCol;';

        try {
            var zigzag = gContents.addProperty("ADBE Vector Filter - Zigzag");
            if (zigzag) {
                zigzag.name = "Zigzag Wave";
                try { zigzag.property("ADBE Vector Zigzag Point Type").setValue(2); } catch (ePt) {}
                try { zigzag.property("ADBE Vector Zigzag Size").setValue(4); } catch (eSz) {}
                try { zigzag.property("ADBE Vector Zigzag Ridges").setValue(10); } catch (eRd) {}
            }
        } catch (eZz) {}
    }
});

var SMART_HL_RECIPES_LOADED = true;