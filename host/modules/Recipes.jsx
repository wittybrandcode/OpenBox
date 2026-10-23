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
            '            var sels = anim.property("ADBE Text Selectors");\n' +
            '            if (sels && sels.numProperties >= 1) {\n' +
            '                var lineNum = ' + lineNum + ';\n' +
            '                var sel = null;\n' +
            '                try { sel = sels.property("Range Selector Line " + lineNum); } catch(eSL) {}\n' +
            '                if (!sel) { try { sel = sels.property("Range Selector Intro"); } catch(eSI) {} }\n' +
            '                if (!sel) { try { sel = sels.property(1); } catch(eS1) {} }\n' +
            '                if (sel) {\n' +
            '                    var unitType = 1;\n' +
            '                    try {\n' +
            '                        var adv = sel.property("ADBE Text Range Advanced");\n' +
            '                        if (!adv) adv = sel.property("Advanced");\n' +
            '                        if (adv) {\n' +
            '                            var bProp = adv.property("ADBE Text Range Type2");\n' +
            '                            if (bProp) unitType = bProp.value;\n' +
            '                        }\n' +
            '                    } catch(eUT) {}\n' +
            '                    var c1 = (unitType == 3) ? ' + w1.toFixed(4) + ' : ((unitType == 4) ? ' + l1.toFixed(4) + ' : ' + c1.toFixed(4) + ');\n' +
            '                    var c2 = (unitType == 3) ? ' + w2.toFixed(4) + ' : ((unitType == 4) ? ' + l2.toFixed(4) + ' : ' + c2.toFixed(4) + ');\n' +
            '                    var pVal = 0;\n' +
            '                    var pStart = null; try { pStart = sel.property("ADBE Text Percent Start"); } catch(e1) { try { pStart = sel.property("Start"); } catch(e11) {} }\n' +
            '                    var pEnd = null; try { pEnd = sel.property("ADBE Text Percent End"); } catch(e2) { try { pEnd = sel.property("End"); } catch(e22) {} }\n' +
            '                    if (pStart && (pStart.numKeys > 0 || pStart.expressionEnabled)) { pVal = pStart.value; }\n' +
            '                    else if (pEnd && (pEnd.numKeys > 0 || pEnd.expressionEnabled)) { pVal = pEnd.value; }\n' +
            '                    else if (pStart) { pVal = pStart.value; }\n' +
            '                    else if (pEnd) { pVal = pEnd.value; }\n' +
            '                    res = (pVal <= c1) ? 0 : ((pVal >= c2) ? 100 : linear(pVal, c1, c2, 0, 100));\n' +
            '                    var outSel = null;\n' +
            '                    try { outSel = sels.property("Range Selector Outro Line " + lineNum); } catch(eOL) {}\n' +
            '                    if (!outSel) { try { outSel = sels.property("Range Selector Outro"); } catch(eOI) {} }\n' +
            '                    if (!outSel && sels.numProperties == 2) {\n' +
            '                        try {\n' +
            '                            var cand2 = sels.property(2);\n' +
            '                            if (cand2 && cand2.name.indexOf("Line") == -1) outSel = cand2;\n' +
            '                        } catch(eO2) {}\n' +
            '                    }\n' +
            '                    if (outSel) {\n' +
            '                        var oStart = null; try { oStart = outSel.property("ADBE Text Percent Start"); } catch(e3) { try { oStart = outSel.property("Start"); } catch(e33) {} }\n' +
            '                        var oEnd = null; try { oEnd = outSel.property("ADBE Text Percent End"); } catch(e4) { try { oEnd = outSel.property("End"); } catch(e44) {} }\n' +
            '                        if (oStart && (oStart.numKeys > 0 || oStart.expressionEnabled)) {\n' +
            '                            var oVal = oStart.value;\n' +
            '                            var outPct = (oVal >= c2) ? 100 : ((oVal <= c1) ? 0 : linear(oVal, c1, c2, 0, 100));\n' +
            '                            res = Math.min(res, outPct);\n' +
            '                        } else if (oEnd && (oEnd.numKeys > 0 || oEnd.expressionEnabled)) {\n' +
            '                            var oVal2 = oEnd.value;\n' +
            '                            var outPct2 = (oVal2 <= c1) ? 100 : ((oVal2 >= c2) ? 0 : linear(oVal2, c1, c2, 100, 0));\n' +
            '                            res = Math.min(res, outPct2);\n' +
            '                        }\n' +
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
                '            var sels = anim.property("ADBE Text Selectors");\n' +
                '            var sel = null;\n' +
                '            try { sel = sels.property("Range Selector Line ' + lineNum + '"); } catch(eSL) {}\n' +
                '            if (!sel) { try { sel = sels.property(1); } catch(eS1) {} }\n' +
                '            if (sel) {\n' +
                '                var adv = sel.property("ADBE Text Range Advanced");\n' +
                '                if (!adv) adv = sel.property("Advanced");\n' +
                '                if (adv) {\n' +
                '                    var sm = adv.property("ADBE Text Range Smoothness");\n' +
                '                    if (!sm) sm = adv.property("ADBE Text Selector Smoothness");\n' +
                '                    if (!sm) sm = adv.property("Smoothness");\n' +
                '                    if (sm) smVal = sm.value;\n' +
                '                }\n' +
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
            'var p = 100; try { p = effect("Progress")(1); } catch(eP) {}\n' +
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
            '        var hasExit = (p.numKeys >= 4);\n' +
            '        var k3 = hasExit ? p.key(3) : null;\n' +
            '        var k4 = hasExit ? p.key(4) : null;\n' +
            '        if (hasExit && time >= k4.time) {\n' +
            '            outVal = [0, 0];\n' +
            '        } else if (hasExit && time >= k3.time) {\n' +
            '            var tOutNorm = (time - k3.time) / Math.max(0.001, (k4.time - k3.time));\n' +
            '            var sOut = easeIn(tOutNorm, 0, 1, 100, 0);\n' +
            '            outVal = [sOut, sOut];\n' +
            '        } else {\n' +
            '            var t = time - k2.time;\n' +
            '            if (t < 0.55) {\n' +
            '                var freq = 4.2;\n' +
            '                var decay = 7.5;\n' +
            '                var amp = 18.0;\n' +
            '                var w = amp * Math.cos(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n' +
            '                outVal = [100 + w, 100 + w];\n' +
            '            } else {\n' +
            '                outVal = [100, 100];\n' +
            '            }\n' +
            '        }\n' +
            '    }\n' +
            '} else {\n' +
            '    var prog = p.value;\n' +
            '    outVal = (prog <= 0) ? [0, 0] : [100, 100];\n' +
            '}\n' +
            'outVal;';
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
            'var curW = (p <= 0) ? 0 : (baseW * p + pX * 2);\n'
        );
    },

    getOpacityCondition: function (ctx) {
        return "(prog <= 0) ? 0 : baseOp;";
    }
});

// D. SNAP JUMP MOTION STRATEGY (0-Frame Cut)
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

    if (hasStaticBounds) {
        posSnippet +=
            '    if (r.width < ' + (safeBaseTotalW * 0.65).toFixed(2) + ' * fontRatio) {\n' +
            '        r = { left: ' + safeBaseLeft.toFixed(2) + ' * fontRatio, top: ' + safeBaseTop.toFixed(2) + ' * fontRatio, width: ' + safeBaseTotalW.toFixed(2) + ' * fontRatio, height: ' + safeBaseTotalH.toFixed(2) + ' * fontRatio };\n' +
            '    }\n';
    }

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

    if (ctx.style.id === "underline") {
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
        if (box.rtl_k) {
            posSnippet += 
                '    var rOff = ' + (box.rightOffset ? box.rightOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                '    curX = ((r.left + r.width) - rOff + pX - (startOffset * fontRatio)) - (curW / 2);\n' +
                '    [curX, curY + offY];\n';
        } else if (isCenter) {
            posSnippet += 
                '    var cOff = ' + (box.centerOffset ? box.centerOffset.toFixed(2) : '0') + ' * fontRatio;\n' +
                '    curX = r.left + (r.width / 2) + cOff;\n' +
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

    if (ctx.style.id === "underline") {
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

var SMART_HL_RECIPES_LOADED = true;