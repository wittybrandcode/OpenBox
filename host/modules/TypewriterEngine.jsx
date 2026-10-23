/**
 * OPENBOX - Host Engine
 * Module: TypewriterEngine.jsx
 * Version: 2.1.0 (Custom Typewriter Engine + Non-Destructive Inspector)
 * 
 * Creates, detects, and synchronizes the dedicated OPENBOX Typewriter
 * animator on the text layer with discrete character jumps (Smoothness = 0)
 * and subpixel keyframe precision.
 */

// فحص وجود Text Animator مسبق على طبقة النص بمفاتيح Range Selector (Start/End)
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
            // تجاهل أنيميتور الآلة الكاتبة التابع للإضافة لمنع تراكم المدة بشكل أسي
            if (aName === animName || aName === "Typewriter Sync" || aName === "Typewriter") {
                continue;
            }

            var selectors = anim.property("ADBE Text Selectors");
            if (!selectors || selectors.numProperties === 0) continue;

            // نفحص فقط المحدد الأول (Intro selector) لتجنب قراءة مفاتيح الخروج كمدة حركة الدخول
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

// إنشاء أو تحديث تأثير Typewriter أصلي على طبقة النص مع دعم كامل لحركتي الدخول والخروج (Intro & Outro)
// يدعم نمطين: النمط المتسلسل (Sequential) والنمط المتوازي للأسطر (Parallel Lines) مع ثبات السرعة أو الانتهاء المتزامن
$._smartHighlighter.ensureTextTypewriter = function (textLayer, tStart, tEnd, styleType, revealUnit, hasOutro, tOutStart, tOutEnd, outroOrder, useMarkers, typewriterMode, speedMode, linesData, totalTextChars, totalWords) {
    try {
        var textProp = textLayer.property("ADBE Text Properties");
        if (!textProp) return false;
        var animators = textProp.property("ADBE Text Animators");
        if (!animators) return false;

        var animName = $._smartHighlighter.TYPEWRITER_ANIM_NAME || "Typewriter Sync";

        // تحديد وحدة التقسيم (Based On): 1 = Characters, 3 = Words, 4 = Lines
        var unitVal = 1;
        if (revealUnit === "words") {
            unitVal = 3;
        } else if (revealUnit === "lines") {
            unitVal = 4;
        }

        // 1. تنظيف أي أنيميتور سابق لضمان بناء جديد ونظيف وخالٍ من الأخطاء التراكمية
        $._smartHighlighter.removeTextTypewriter(textLayer);

        // 2. إنشاء أنيميتور جديد باسم Typewriter Sync
        var anim = animators.addProperty("ADBE Text Animator");
        anim.name = animName;
        var selectors = anim.property("ADBE Text Selectors");

        var isParallel = (typewriterMode === "parallel" && linesData && linesData.length > 1);
        var spdMode = speedMode || "constant";
        var totalIntroDur = Math.max(0.04, tEnd - tStart);

        if (isParallel) {
            // ============================================================
            // النمط المتوازي: إنشاء Range Selectors مخصصة لكل سطر تبدأ معاً بالتوازي
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

                // أ. محدد الدخول للسطر (Intro Selector for Line i)
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

                // ب. محدد الخروج للسطر (Outro Selector for Line i)
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
            // النمط المتسلسل التقليدي: محدد واحد شامل يتدفق من البداية حتى النهاية
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

        // 5. إضافة الخصائص البصرية (ADBE Text Opacity = 0)
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

// إزالة أنيميتور الآلة الكاتبة عند مسح الهايلايت
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


// فحص غير تدميري شامل لأنيمايتور الآلة الكاتبة الحالي على طبقة النص (لمزامنة تظليل العبارات دون المساس بحركة النص)
$._smartHighlighter.inspectActiveTypewriter = function (textLayer) {
    try {
        var textProp = textLayer.property("ADBE Text Properties");
        if (!textProp) return null;
        var animators = textProp.property("ADBE Text Animators");
        if (!animators || animators.numProperties === 0) return null;

        var animName = $._smartHighlighter.TYPEWRITER_ANIM_NAME || "Typewriter Sync";
        var targetAnim = null;

        for (var i = 1; i <= animators.numProperties; i++) {
            var cand = animators.property(i);
            if (!cand) continue;
            var cName = cand.name || "";
            if (cName === animName || cName === "Typewriter Sync" || cName === "Typewriter") {
                targetAnim = cand;
                break;
            }
        }
        if (!targetAnim) {
            targetAnim = animators.property(1);
        }
        if (!targetAnim) return null;

        var selectors = targetAnim.property("ADBE Text Selectors");
        if (!selectors || selectors.numProperties === 0) return null;

        var isParallel = false;
        var hasOutro = false;
        var basedOnUnit = 1; // 1 = chars, 3 = words, 4 = lines
        var minStart = null;
        var maxEnd = null;
        var outStart = null;
        var outEnd = null;
        var lineTimings = {};

        for (var s = 1; s <= selectors.numProperties; s++) {
            var sel = selectors.property(s);
            if (!sel) continue;
            var sName = sel.name || "";
            var isOutroSel = (sName.indexOf("Outro") !== -1);
            var lineMatch = sName.match(/Line\s+(\d+)/i);
            if (lineMatch && !isOutroSel) {
                isParallel = true;
            }
            if (isOutroSel) {
                hasOutro = true;
            }

            if (s === 1) {
                try {
                    var adv = sel.property("ADBE Text Range Advanced") || sel.property("Advanced");
                    if (adv) {
                        var bProp = adv.property("ADBE Text Range Type2");
                        if (bProp) basedOnUnit = bProp.value;
                    }
                } catch (eB) {}
            }

            var checkProps = ["ADBE Text Percent Start", "ADBE Text Percent End", "Start", "End"];
            for (var p = 0; p < checkProps.length; p++) {
                try {
                    var pr = sel.property(checkProps[p]);
                    if (pr && pr.numKeys >= 2) {
                        var k1 = pr.keyTime(1);
                        var k2 = pr.keyTime(pr.numKeys);
                        if (isOutroSel) {
                            if (outStart === null || k1 < outStart) outStart = k1;
                            if (outEnd === null || k2 > outEnd) outEnd = k2;
                        } else {
                            if (minStart === null || k1 < minStart) minStart = k1;
                            if (maxEnd === null || k2 > maxEnd) maxEnd = k2;
                            if (lineMatch && lineMatch[1]) {
                                var lNum = parseInt(lineMatch[1], 10);
                                lineTimings[lNum] = { startTime: k1, endTime: k2 };
                            }
                        }
                    }
                } catch (ePr) {}
            }
        }

        // فحص الماركرز على طبقة النص إذا كانت مفعلة
        try {
            if (textLayer.marker && textLayer.marker.numKeys > 0) {
                var mInS = null, mInE = null, mOutS = null, mOutE = null;
                for (var mk = 1; mk <= textLayer.marker.numKeys; mk++) {
                    var mComm = textLayer.marker.key(mk).comment;
                    var mTime = textLayer.marker.key(mk).time;
                    if (mComm === "HL_IN_START") mInS = mTime;
                    else if (mComm === "HL_IN_END") mInE = mTime;
                    else if (mComm === "HL_OUT_START") mOutS = mTime;
                    else if (mComm === "HL_OUT_END") mOutE = mTime;
                }
                if (mInS !== null && mInE !== null && mInE > mInS) {
                    minStart = mInS;
                    maxEnd = mInE;
                }
                if (mOutS !== null && mOutE !== null && mOutE > mOutS) {
                    hasOutro = true;
                    outStart = mOutS;
                    outEnd = mOutE;
                }
            }
        } catch (eMk) {}

        var hasValidKeys = (minStart !== null && maxEnd !== null && maxEnd > minStart);
        return {
            hasAnimator: true,
            hasKeys: hasValidKeys,
            isParallel: isParallel,
            hasOutro: hasOutro,
            basedOnUnit: basedOnUnit,
            startTime: hasValidKeys ? minStart : 0,
            endTime: hasValidKeys ? maxEnd : 1.2,
            outStartTime: outStart,
            outEndTime: outEnd,
            lineTimings: lineTimings
        };
    } catch (eInsp) {
        $._smartHighlighter.log("inspectActiveTypewriter error: " + eInsp.toString());
    }
    return null;
};

var SMART_HL_TYPEWRITER_LOADED = true;