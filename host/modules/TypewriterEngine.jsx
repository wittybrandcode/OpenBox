/**
 * OPENBOX - Host Engine
 * Module: TypewriterEngine.jsx
 * Version: 2.0.0 (Custom Typewriter Engine)
 * 
 * Creates, detects, and synchronizes the dedicated OPENBOX Typewriter
 * animator on the text layer with discrete character jumps (Smoothness = 0)
 * and subpixel keyframe precision.
 */

// ÙØ­Øµ ÙˆØ¬ÙˆØ¯ Text Animator Ù…Ø³Ø¨Ù‚ Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø¨Ù…ÙØ§ØªÙŠØ­ Range Selector (Start/End)
$._smartHighlighter.detectTextAnimator = function (textLayer) {
    try {
        var textProp = textLayer.property("ADBE Text Properties");
        if (!textProp) return null;
        var animators = textProp.property("ADBE Text Animators");
        if (!animators || animators.numProperties === 0) return null;

        var animName = $._smartHighlighter.TYPEWRITER_ANIM_NAME || "Typewriter Sync";
        var minStart = null;
        var maxEnd = null;
        var foundProp = null;

        for (var i = 1; i <= animators.numProperties; i++) {
            var anim = animators.property(i);
            var aName = anim.name || "";
            // ØªØ¬Ø§Ù‡Ù„ Ø£Ù†ÙŠÙ…ÙŠØªÙˆØ± Ø§Ù„Ø¢Ù„Ø© Ø§Ù„ÙƒØ§ØªØ¨Ø© Ø§Ù„ØªØ§Ø¨Ø¹ Ù„Ù„Ø¥Ø¶Ø§ÙØ© Ù„Ù…Ù†Ø¹ ØªØ±Ø§ÙƒÙ… Ø§Ù„Ù…Ø¯Ø© Ø¨Ø´ÙƒÙ„ Ø£Ø³ÙŠ
            if (aName === animName || aName === "Typewriter Sync" || aName === "Typewriter") {
                continue;
            }

            var selectors = anim.property("ADBE Text Selectors");
            if (!selectors || selectors.numProperties === 0) continue;

            // Ù†ÙØ­Øµ ÙÙ‚Ø· Ø§Ù„Ù…Ø­Ø¯Ø¯ Ø§Ù„Ø£ÙˆÙ„ (Intro selector) Ù„ØªØ¬Ù†Ø¨ Ù‚Ø±Ø§Ø¡Ø© Ù…ÙØ§ØªÙŠØ­ Ø§Ù„Ø®Ø±ÙˆØ¬ ÙƒÙ…Ø¯Ø© Ø­Ø±ÙƒØ© Ø§Ù„Ø¯Ø®ÙˆÙ„
            var sel = selectors.property(1);
            if (!sel) continue;

            var checkProps = ["ADBE Text Percent Start", "ADBE Text Percent End", "Start", "End"];
            for (var p = 0; p < checkProps.length; p++) {
                try {
                    var targetProp = sel.property(checkProps[p]);
                    if (targetProp && targetProp.numKeys >= 2) {
                        var k1 = targetProp.keyTime(1);
                        var k2 = targetProp.keyTime(targetProp.numKeys);
                        if (minStart === null || k1 < minStart) minStart = k1;
                        if (maxEnd === null || k2 > maxEnd) maxEnd = k2;
                        foundProp = targetProp;
                    }
                } catch (eProp) {}
            }
        }

        if (minStart !== null && maxEnd !== null && maxEnd > minStart) {
            return {
                hasKeys: true,
                startTime: minStart,
                endTime: maxEnd,
                prop: foundProp
            };
        }
    } catch (e) {
        $._smartHighlighter.log("detectTextAnimator error: " + e.toString());
    }
    return null;
};

// Ø¥Ù†Ø´Ø§Ø¡ Ø£Ùˆ ØªØ­Ø¯ÙŠØ« ØªØ£Ø«ÙŠØ± Typewriter Ø£ØµÙ„ÙŠ Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ù…Ø¹ Ø¯Ø¹Ù… ÙƒØ§Ù…Ù„ Ù„Ø­Ø±ÙƒØªÙŠ Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙˆØ§Ù„Ø®Ø±ÙˆØ¬ (Intro & Outro)
// ÙŠØ¯Ø¹Ù… Ù†Ù…Ø·ÙŠÙ†: Ø§Ù„Ù†Ù…Ø· Ø§Ù„Ù…ØªØ³Ù„Ø³Ù„ (Sequential) ÙˆØ§Ù„Ù†Ù…Ø· Ø§Ù„Ù…ØªÙˆØ§Ø²ÙŠ Ù„Ù„Ø£Ø³Ø·Ø± (Parallel Lines) Ù…Ø¹ Ø«Ø¨Ø§Øª Ø§Ù„Ø³Ø±Ø¹Ø© Ø£Ùˆ Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…ØªØ²Ø§Ù…Ù†
$._smartHighlighter.ensureTextTypewriter = function (textLayer, tStart, tEnd, styleType, revealUnit, hasOutro, tOutStart, tOutEnd, outroOrder, useMarkers, typewriterMode, speedMode, linesData, totalTextChars, totalWords) {
    try {
        var textProp = textLayer.property("ADBE Text Properties");
        if (!textProp) return false;
        var animators = textProp.property("ADBE Text Animators");
        if (!animators) return false;

        var animName = $._smartHighlighter.TYPEWRITER_ANIM_NAME || "Typewriter Sync";

        // ØªØ­Ø¯ÙŠØ¯ ÙˆØ­Ø¯Ø© Ø§Ù„ØªÙ‚Ø³ÙŠÙ… (Based On): 1 = Characters, 3 = Words, 4 = Lines
        var unitVal = 1;
        if (revealUnit === "words") {
            unitVal = 3;
        } else if (revealUnit === "lines") {
            unitVal = 4;
        }

        // 1. ØªÙ†Ø¸ÙŠÙ Ø£ÙŠ Ø£Ù†ÙŠÙ…ÙŠØªÙˆØ± Ø³Ø§Ø¨Ù‚ Ù„Ø¶Ù…Ø§Ù† Ø¨Ù†Ø§Ø¡ Ø¬Ø¯ÙŠØ¯ ÙˆÙ†Ø¸ÙŠÙ ÙˆØ®Ø§Ù„Ù Ù…Ù† Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ©
        $._smartHighlighter.removeTextTypewriter(textLayer);

        // 2. Ø¥Ù†Ø´Ø§Ø¡ Ø£Ù†ÙŠÙ…ÙŠØªÙˆØ± Ø¬Ø¯ÙŠØ¯ Ø¨Ø§Ø³Ù… Typewriter Sync
        var anim = animators.addProperty("ADBE Text Animator");
        anim.name = animName;
        var selectors = anim.property("ADBE Text Selectors");

        var isParallel = (typewriterMode === "parallel" && linesData && linesData.length > 1);
        var spdMode = speedMode || "constant";
        var totalIntroDur = Math.max(0.04, tEnd - tStart);

        if (isParallel) {
            // ============================================================
            // Ø§Ù„Ù†Ù…Ø· Ø§Ù„Ù…ØªÙˆØ§Ø²ÙŠ: Ø¥Ù†Ø´Ø§Ø¡ Range Selectors Ù…Ø®ØµØµØ© Ù„ÙƒÙ„ Ø³Ø·Ø± ØªØ¨Ø¯Ø£ Ù…Ø¹Ø§Ù‹ Ø¨Ø§Ù„ØªÙˆØ§Ø²ÙŠ
            // ============================================================
            var maxUnits = 1;
            for (var mi = 0; mi < linesData.length; mi++) {
                var mLine = linesData[mi];
                var mCount = 1;
                if (revealUnit === "words") {
                    mCount = (mLine.wOffsets && mLine.wOffsets.length > 0) ? mLine.wOffsets.length : Math.max(1, (mLine.wordEnd || 0) - (mLine.wordStart || 0));
                } else {
                    mCount = Math.max(1, (typeof mLine.charEnd === "number" && typeof mLine.charStart === "number") ? (mLine.charEnd - mLine.charStart) : (mLine.text || "").length);
                }
                if (mCount > maxUnits) maxUnits = mCount;
            }

            var totC = (typeof totalTextChars === "number" && totalTextChars > 0) ? totalTextChars : 1;
            var totW = (typeof totalWords === "number" && totalWords > 0) ? totalWords : 1;

            for (var i = 0; i < linesData.length; i++) {
                var lineItem = linesData[i];
                var lineUnits = (revealUnit === "words")
                    ? ((lineItem.wOffsets && lineItem.wOffsets.length > 0) ? lineItem.wOffsets.length : Math.max(1, (lineItem.wordEnd || 0) - (lineItem.wordStart || 0)))
                    : Math.max(1, (typeof lineItem.charEnd === "number" && typeof lineItem.charStart === "number") ? (lineItem.charEnd - lineItem.charStart) : (lineItem.text || "").length);

                var lineDur = (spdMode === "synced")
                    ? totalIntroDur
                    : Math.max(0.08, (lineUnits / maxUnits) * totalIntroDur);

                var pStart, pEnd;
                if (revealUnit === "words") {
                    pStart = (((lineItem.wordStart !== undefined && lineItem.wordStart !== null) ? lineItem.wordStart : 0) / totW) * 100;
                    pEnd = (i === linesData.length - 1) ? 100 : (((lineItem.wordEnd !== undefined && lineItem.wordEnd !== null) ? lineItem.wordEnd : totW) / totW) * 100;
                } else {
                    pStart = (((lineItem.charStart !== undefined && lineItem.charStart !== null) ? lineItem.charStart : 0) / totC) * 100;
                    pEnd = (i === linesData.length - 1) ? 100 : (((lineItem.charEnd !== undefined && lineItem.charEnd !== null) ? lineItem.charEnd : totC) / totC) * 100;
                }
                pStart = Math.max(0, Math.min(100, pStart));
                pEnd = Math.max(0, Math.min(100, pEnd));
                if (pEnd <= pStart) pEnd = Math.min(100, pStart + 1);

                // Ø£. Ù…Ø­Ø¯Ø¯ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ù„Ø³Ø·Ø± (Intro Selector for Line i)
                var inSelLine = selectors.addProperty("ADBE Text Selector");
                try { inSelLine.name = "Range Selector Line " + (i + 1); } catch(eNInL) {}

                try {
                    var inAdvL = inSelLine.property("ADBE Text Range Advanced");
                    if (inAdvL) {
                        try {
                            var bPropL = inAdvL.property("ADBE Text Range Type2");
                            if (bPropL) bPropL.setValue(unitVal);
                        } catch(eBL) {}
                        try {
                            var smPropL = inAdvL.property("ADBE Text Selector Smoothness");
                            if (smPropL) smPropL.setValue(0);
                        } catch(eSmL) {}
                    }
                } catch(eAdvInL) {}

                try {
                    var inEndPropL = inSelLine.property("ADBE Text Percent End");
                    if (!inEndPropL) inEndPropL = inSelLine.property("End");
                    if (inEndPropL) inEndPropL.setValue(pEnd);
                } catch(eEL) {}

                var inStartPropL = null;
                try { inStartPropL = inSelLine.property("ADBE Text Percent Start"); } catch(eSL) {}
                if (!inStartPropL) { try { inStartPropL = inSelLine.property("Start"); } catch(eSL2) {} }
                if (inStartPropL) {
                    inStartPropL.setValueAtTime(tStart, pStart);
                    inStartPropL.setValueAtTime(tStart + lineDur, pEnd);
                    try {
                        inStartPropL.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                        inStartPropL.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                    } catch(eLinL) {}

                    if (useMarkers === true) {
                        var inExprPara = 
                            "var res = value;\n" +
                            "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
                            "    var inS = null, inE = null;\n" +
                            "    for (var k = 1; k <= thisLayer.marker.numKeys; k++) {\n" +
                            "        var c = thisLayer.marker.key(k).comment;\n" +
                            "        if (c === 'HL_IN_START') inS = thisLayer.marker.key(k).time;\n" +
                            "        else if (c === 'HL_IN_END') inE = thisLayer.marker.key(k).time;\n" +
                            "    }\n" +
                            "    if (inS !== null && inE !== null) {\n" +
                            "        var totDur = Math.max(0.01, inE - inS);\n" +
                            "        var myDur = " + (spdMode === "synced" ? "totDur" : ("Math.max(0.08, (" + (lineUnits / maxUnits).toFixed(4) + ") * totDur)")) + ";\n" +
                            "        res = linear(time, inS, inS + myDur, " + pStart.toFixed(4) + ", " + pEnd.toFixed(4) + ");\n" +
                            "    }\n" +
                            "}\n" +
                            "res;";
                        try { inStartPropL.expression = inExprPara; } catch(eExPL) {}
                    }
                }

                // Ø¨. Ù…Ø­Ø¯Ø¯ Ø§Ù„Ø®Ø±ÙˆØ¬ Ù„Ù„Ø³Ø·Ø± (Outro Selector for Line i)
                if (hasOutro === true) {
                    if (typeof tOutStart !== "number") tOutStart = tEnd + 1.0;
                    var totalOutroDur = (typeof tOutEnd === "number" && tOutEnd > tOutStart) ? (tOutEnd - tOutStart) : totalIntroDur;
                    var lineOutDur = (spdMode === "synced") ? totalOutroDur : Math.max(0.08, (lineUnits / maxUnits) * totalOutroDur);

                    var outSelLine = selectors.addProperty("ADBE Text Selector");
                    try { outSelLine.name = "Range Selector Outro Line " + (i + 1); } catch(eNOutL) {}

                    try {
                        var outAdvL = outSelLine.property("ADBE Text Range Advanced");
                        if (outAdvL) {
                            try {
                                var obPropL = outAdvL.property("ADBE Text Range Type2");
                                if (obPropL) obPropL.setValue(unitVal);
                            } catch(eObL) {}
                            try {
                                var osmPropL = outAdvL.property("ADBE Text Selector Smoothness");
                                if (osmPropL) osmPropL.setValue(0);
                            } catch(eOsmL) {}
                        }
                    } catch(eAdvOutL) {}

                    var isReverseLine = (outroOrder === "last");
                    if (isReverseLine) {
                        try {
                            var oEndPL = outSelLine.property("ADBE Text Percent End");
                            if (!oEndPL) oEndPL = outSelLine.property("End");
                            if (oEndPL) oEndPL.setValue(pEnd);
                        } catch(eOEL) {}

                        var oStartPL = null;
                        try { oStartPL = outSelLine.property("ADBE Text Percent Start"); } catch(eOSL) {}
                        if (!oStartPL) { try { oStartPL = outSelLine.property("Start"); } catch(eOSL11) {} }
                        if (oStartPL) {
                            oStartPL.setValueAtTime(tOutStart, pEnd);
                            oStartPL.setValueAtTime(tOutStart + lineOutDur, pStart);
                            try {
                                oStartPL.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                                oStartPL.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                            } catch(eLinOutL1) {}

                            if (useMarkers === true) {
                                var outRevExprPara = 
                                    "var res = value;\n" +
                                    "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
                                    "    var outS = null, outE = null;\n" +
                                    "    for (var k = 1; k <= thisLayer.marker.numKeys; k++) {\n" +
                                    "        var c = thisLayer.marker.key(k).comment;\n" +
                                    "        if (c === 'HL_OUT_START') outS = thisLayer.marker.key(k).time;\n" +
                                    "        else if (c === 'HL_OUT_END') outE = thisLayer.marker.key(k).time;\n" +
                                    "    }\n" +
                                    "    if (outS !== null && outE !== null) {\n" +
                                    "        var oTot = Math.max(0.01, outE - outS);\n" +
                                    "        var oMyDur = " + (spdMode === "synced" ? "oTot" : ("Math.max(0.08, (" + (lineUnits / maxUnits).toFixed(4) + ") * oTot)")) + ";\n" +
                                    "        res = linear(time, outS, outS + oMyDur, " + pEnd.toFixed(4) + ", " + pStart.toFixed(4) + ");\n" +
                                    "    }\n" +
                                    "}\n" +
                                    "res;";
                                try { oStartPL.expression = outRevExprPara; } catch(eExRevPL) {}
                            }
                        }
                    } else {
                        try {
                            var oStartPL2 = outSelLine.property("ADBE Text Percent Start");
                            if (!oStartPL2) oStartPL2 = outSelLine.property("Start");
                            if (oStartPL2) oStartPL2.setValue(pStart);
                        } catch(eOSL2) {}

                        var oEndPL2 = null;
                        try { oEndPL2 = outSelLine.property("ADBE Text Percent End"); } catch(eOEL2) {}
                        if (!oEndPL2) { try { oEndPL2 = outSelLine.property("End"); } catch(eOEL22) {} }
                        if (oEndPL2) {
                            oEndPL2.setValueAtTime(tOutStart, pStart);
                            oEndPL2.setValueAtTime(tOutStart + lineOutDur, pEnd);
                            try {
                                oEndPL2.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                                oEndPL2.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                            } catch(eLinOutL2) {}

                            if (useMarkers === true) {
                                var outFwdExprPara = 
                                    "var res = value;\n" +
                                    "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
                                    "    var outS = null, outE = null;\n" +
                                    "    for (var k = 1; k <= thisLayer.marker.numKeys; k++) {\n" +
                                    "        var c = thisLayer.marker.key(k).comment;\n" +
                                    "        if (c === 'HL_OUT_START') outS = thisLayer.marker.key(k).time;\n" +
                                    "        else if (c === 'HL_OUT_END') outE = thisLayer.marker.key(k).time;\n" +
                                    "    }\n" +
                                    "    if (outS !== null && outE !== null) {\n" +
                                    "        var oTot = Math.max(0.01, outE - outS);\n" +
                                    "        var oMyDur = " + (spdMode === "synced" ? "oTot" : ("Math.max(0.08, (" + (lineUnits / maxUnits).toFixed(4) + ") * oTot)")) + ";\n" +
                                    "        res = linear(time, outS, outS + oMyDur, " + pStart.toFixed(4) + ", " + pEnd.toFixed(4) + ");\n" +
                                    "    }\n" +
                                    "}\n" +
                                    "res;";
                                try { oEndPL2.expression = outFwdExprPara; } catch(eExFwdPL) {}
                            }
                        }
                    }
                }
            }
        } else {
            // ============================================================
            // Ø§Ù„Ù†Ù…Ø· Ø§Ù„Ù…ØªØ³Ù„Ø³Ù„ Ø§Ù„ØªÙ‚Ù„ÙŠØ¯ÙŠ: Ù…Ø­Ø¯Ø¯ ÙˆØ§Ø­Ø¯ Ø´Ø§Ù…Ù„ ÙŠØªØ¯ÙÙ‚ Ù…Ù† Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø­ØªÙ‰ Ø§Ù„Ù†Ù‡Ø§ÙŠØ©
            // ============================================================
            var inSel = selectors.addProperty("ADBE Text Selector");
            try { inSel.name = "Range Selector Intro"; } catch(eNameIn) {}

            try {
                var inAdv = inSel.property("ADBE Text Range Advanced");
                if (inAdv) {
                    try {
                        var bProp = inAdv.property("ADBE Text Range Type2");
                        if (bProp) bProp.setValue(unitVal);
                    } catch(eB) {}
                    try {
                        var smProp = inAdv.property("ADBE Text Selector Smoothness");
                        if (smProp) smProp.setValue(0);
                    } catch(eSm) {}
                }
            } catch(eAdvIn) {}

            try {
                var inEndProp = inSel.property("ADBE Text Percent End");
                if (inEndProp) inEndProp.setValue(100);
            } catch(eE1) {}

            var inStartProp = null;
            try { inStartProp = inSel.property("ADBE Text Percent Start"); } catch(eS1) {}
            if (inStartProp) {
                inStartProp.setValueAtTime(tStart, 0);
                inStartProp.setValueAtTime(tEnd, 100);
                try {
                    inStartProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                    inStartProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                } catch(eLin1) {}

                if (useMarkers === true) {
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
                    try { inStartProp.expression = inExpr; } catch(eEx1) {}
                }
            }

            if (hasOutro === true) {
                if (typeof tOutStart !== "number") tOutStart = tEnd + 1.0;
                if (typeof tOutEnd !== "number" || tOutEnd <= tOutStart) tOutEnd = tOutStart + Math.max(0.2, tEnd - tStart);

                var outSel = selectors.addProperty("ADBE Text Selector");
                try { outSel.name = "Range Selector Outro"; } catch(eNameOut) {}

                try {
                    var outAdv = outSel.property("ADBE Text Range Advanced");
                    if (outAdv) {
                        try {
                            var obProp = outAdv.property("ADBE Text Range Type2");
                            if (obProp) obProp.setValue(unitVal);
                        } catch(eOb) {}
                        try {
                            var osmProp = outAdv.property("ADBE Text Selector Smoothness");
                            if (osmProp) osmProp.setValue(0);
                        } catch(eOsm) {}
                    }
                } catch(eAdvOut) {}

                var isReverse = (outroOrder === "last");
                if (isReverse) {
                    try {
                        var oEndP = outSel.property("ADBE Text Percent End");
                        if (oEndP) oEndP.setValue(100);
                    } catch(eOE) {}

                    var oStartP = null;
                    try { oStartP = outSel.property("ADBE Text Percent Start"); } catch(eOS) {}
                    if (oStartP) {
                        oStartP.setValueAtTime(tOutStart, 100);
                        oStartP.setValueAtTime(tOutEnd, 0);
                        try {
                            oStartP.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                            oStartP.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                        } catch(eLin2) {}

                        if (useMarkers === true) {
                            var outRevExpr = 
                                "var res = value;\n" +
                                "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
                                "    var outS = null, outE = null;\n" +
                                "    for (var i = 1; i <= thisLayer.marker.numKeys; i++) {\n" +
                                "        var c = thisLayer.marker.key(i).comment;\n" +
                                "        if (c === 'HL_OUT_START') outS = thisLayer.marker.key(i).time;\n" +
                                "        else if (c === 'HL_OUT_END') outE = thisLayer.marker.key(i).time;\n" +
                                "    }\n" +
                                "    if (outS !== null && outE !== null) res = linear(time, outS, outE, 100, 0);\n" +
                                "}\n" +
                                "res;";
                            try { oStartP.expression = outRevExpr; } catch(eExRev) {}
                        }
                    }
                } else {
                    try {
                        var oStartP2 = outSel.property("ADBE Text Percent Start");
                        if (oStartP2) oStartP2.setValue(0);
                    } catch(eOS2) {}

                    var oEndP2 = null;
                    try { oEndP2 = outSel.property("ADBE Text Percent End"); } catch(eOE2) {}
                    if (oEndP2) {
                        oEndP2.setValueAtTime(tOutStart, 0);
                        oEndP2.setValueAtTime(tOutEnd, 100);
                        try {
                            oEndP2.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                            oEndP2.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                        } catch(eLin3) {}

                        if (useMarkers === true) {
                            var outFwdExpr = 
                                "var res = value;\n" +
                                "if (thisLayer.marker && thisLayer.marker.numKeys > 0) {\n" +
                                "    var outS = null, outE = null;\n" +
                                "    for (var i = 1; i <= thisLayer.marker.numKeys; i++) {\n" +
                                "        var c = thisLayer.marker.key(i).comment;\n" +
                                "        if (c === 'HL_OUT_START') outS = thisLayer.marker.key(i).time;\n" +
                                "        else if (c === 'HL_OUT_END') outE = thisLayer.marker.key(i).time;\n" +
                                "    }\n" +
                                "    if (outS !== null && outE !== null) res = linear(time, outS, outE, 0, 100);\n" +
                                "}\n" +
                                "res;";
                            try { oEndP2.expression = outFwdExpr; } catch(eExFwd) {}
                        }
                    }
                }
            }
        }

        // 5. Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø®ØµØ§Ø¦Øµ Ø§Ù„Ø¨ØµØ±ÙŠØ© (ADBE Text Opacity = 0)
        var props = anim.property("ADBE Text Animator Properties");
        var op = null;
        try { op = props.addProperty("ADBE Text Opacity"); } catch(eAddOp) {}
        if (!op) {
            try { op = props.property("ADBE Text Opacity"); } catch(eGetOp) {}
        }
        if (op) op.setValue(0);

        if (styleType === "scale" || styleType === "pop") {
            try {
                var sc = props.addProperty("ADBE Text Scale 3D");
                if (!sc) sc = props.addProperty("ADBE Text Scale");
                if (sc) sc.setValue([0, 0, 0]);
            } catch (eSc) {}
        }

        $._smartHighlighter.log("ensureTextTypewriter: successfully built Typewriter Sync (" + (isParallel ? "Parallel" : "Sequential") + ") with selectors and opacity.");
        return true;
    } catch (e) {
        $._smartHighlighter.log("ensureTextTypewriter error: " + e.toString());
    }
    return false;
};

// Ø¥Ø²Ø§Ù„Ø© Ø£Ù†ÙŠÙ…ÙŠØªÙˆØ± Ø§Ù„Ø¢Ù„Ø© Ø§Ù„ÙƒØ§ØªØ¨Ø© Ø¹Ù†Ø¯ Ù…Ø³Ø­ Ø§Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª
$._smartHighlighter.removeTextTypewriter = function (textLayer) {
    try {
        var textProp = textLayer.property("ADBE Text Properties");
        if (!textProp) return;
        var animators = textProp.property("ADBE Text Animators");
        if (!animators) return;

        var animName = $._smartHighlighter.TYPEWRITER_ANIM_NAME || "Typewriter Sync";
        for (var ai = animators.numProperties; ai >= 1; ai--) {
            var an = animators.property(ai).name;
            if (an === animName || an === "Typewriter Sync" || an === "Typewriter") {
                animators.property(ai).remove();
            }
        }
    } catch (eAnimDel) {}
};

var SMART_HL_TYPEWRITER_LOADED = true;
