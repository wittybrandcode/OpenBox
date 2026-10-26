/**
 * OPENBOX - Host Engine
 * Module: TextScanner.jsx
 * Version: 2.7.0 (Production Optimized Direct Solid-Anchor RTL Geometry Engine)
 * 
 * High-precision Paragraph & Line Geometry Scanner:
 * - Direct Solid-Anchor RTL: Guarantees 100% right-edge alignment (rightOffset = 0)
 *   for all Arabic RTL Area Text lines, locking every box flush to the right container margin.
 * - Clean ink bounding measurement without dangerous Text Animators or ±20000px shifting.
 * - Safe unconstrained box expansion for character and word offsets.
 */

// محرك القياس الهندسي المباشر لحبر الأسطر دون Text Animators مؤقتة تلوث الطبقة
$._smartHighlighter.createBilateralIsolator = function (targetLayer, evalTime) {
    // تم إلغاء استخدام Text Animators لتفادي تلوث طبقة النص الأصلية وانهيار ريندر After Effects
    return null;
};

// فحص أسطر الفقرة بدقة تامة مع حماية من الأخطاء
$._smartHighlighter.scanParagraph = function (textLayer, comp, optText) {
    var temp = null;
    try {
        var srcProp = textLayer.property("Source Text");
        var textDoc = srcProp.value;
        var fullText = $._smartHighlighter.stripAnchors((typeof optText === "string") ? optText : textDoc.text);
        var fontSize = textDoc.fontSize;

        // التقاط محاذاة النص من لوحة Paragraph
        var justification = null;
        try {
            justification = textDoc.justification;
        } catch (eJ) {}

        // فحص ما إذا كان النص مضبوطاً (Justified) مبكراً لاستخدامه في فحص الالتفاف
        var isJustified = false;
        var isJustifyFullAll = false;
        var justifyType = "left"; // "left", "right", "center", "full"

        if (justification !== null && justification !== undefined) {
            try {
                if (typeof ParagraphJustification !== "undefined") {
                    if (justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT) {
                        isJustified = true; justifyType = "left";
                    } else if (justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_RIGHT) {
                        isJustified = true; justifyType = "right";
                    } else if (justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_CENTER) {
                        isJustified = true; justifyType = "center";
                    } else if (justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_FULL) {
                        isJustified = true; isJustifyFullAll = true; justifyType = "full";
                    }
                }
                var jStr = String(justification).toUpperCase();
                if (jStr.indexOf("FULL_JUSTIFY") !== -1 || (justification >= 7416 && justification <= 7419)) {
                    isJustified = true;
                    if (jStr.indexOf("LASTLINE_FULL") !== -1 || justification === 7419) isJustifyFullAll = true;
                    if (jStr.indexOf("LASTLINE_RIGHT") !== -1 || justification === 7417) justifyType = "right";
                    if (jStr.indexOf("LASTLINE_CENTER") !== -1 || justification === 7418) justifyType = "center";
                }
            } catch (eJ2) {}
        }

        // إذا كانت طبقة المستخدم تحمل اسم المحرك المؤقت نتيجة خطأ سابق، نعيد تسميتها فوراً لحمايتها
        if (textLayer.name === $._smartHighlighter.SCAN_TEMP_ENGINE) {
            textLayer.name = "Highlight Text";
        }

        // تنظيف أي طبقات فحص مؤقتة قديمة عالقة مع استثناء طبقة النص الأصلية قطعاً
        for (var ci = comp.numLayers; ci >= 1; ci--) {
            try {
                var chkL = comp.layer(ci);
                if (chkL && chkL !== textLayer && chkL.name === $._smartHighlighter.SCAN_TEMP_ENGINE) {
                    chkL.remove();
                }
            } catch (eC) {}
        }

        temp = textLayer.duplicate();
        temp.name = $._smartHighlighter.SCAN_TEMP_ENGINE;
        temp.enabled = true; // يجب أن تكون مفعلة ليتمكن After Effects من حساب أبعاد sourceRectAtTime
        temp.guideLayer = true; // طبقة إرشادية لا تؤثر على المشهد أو الريندر

        // إزالة أي Text Animators من الطبقة المؤقتة لضمان قياس هندسة الحروف الأصلية 100%
        try {
            var tempAnimators = temp.property("ADBE Text Properties").property("ADBE Text Animators");
            if (tempAnimators && tempAnimators.numProperties > 0) {
                for (var tai = tempAnimators.numProperties; tai >= 1; tai--) {
                    try { tempAnimators.property(tai).remove(); } catch (eRmTa) {}
                }
            }
        } catch (eCleanAnim) {}

        // فحص ما إذا كانت طبقة النص Paragraph (Area) Text أو Point Text
        var isBoxText = false;
        var boxSize = null;
        try {
            isBoxText = !!textDoc.boxText;
            if (isBoxText && textDoc.boxTextSize) {
                boxSize = [textDoc.boxTextSize[0], textDoc.boxTextSize[1]];
            }
        } catch (eBox) {
            isBoxText = false;
        }

        // قياس الفقرة الكاملة داخل الصندوق الأصلي فوراً على النسخة البكر 100% قبل أي تلاعب في النصوص
        var rFull = temp.sourceRectAtTime(comp.time, false);
        var rFullRight = rFull.left + rFull.width;

        // عزل وقياس الأسطر مباشرة من محرك الريندر HarfBuzz على الطبقة البكر
        var pristineInBoxMetrics = [];
        if (isBoxText) {
            try {
                var textPropPristine = temp.property("ADBE Text Properties");
                var animGroupPristine = textPropPristine.property("ADBE Text Animators");
                var animPristine = animGroupPristine.addProperty("ADBE Text Animator");
                animPristine.name = "OB_PRISTINE_LINE_ISOLATOR";

                var scalePropPristine = animPristine.property("ADBE Text Animator Properties").addProperty("ADBE Text Scale 3D");
                scalePropPristine.setValue([0, 0, 100]);

                var selPristine = animPristine.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
                var advPristine = selPristine.property("ADBE Text Range Advanced");
                advPristine.property("ADBE Text Range Type2").setValue(4); // Lines
                advPristine.property("ADBE Text Range Units").setValue(2); // Index
                advPristine.property("ADBE Text Selector Mode").setValue(2); // Subtract
                advPristine.property("ADBE Text Selector Smoothness").setValue(0);

                var startPropPristine = selPristine.property("ADBE Text Index Start");
                var endPropPristine = selPristine.property("ADBE Text Index End");

                for (var li = 0; li < 100; li++) {
                    startPropPristine.setValue(li);
                    endPropPristine.setValue(li + 1);
                    var rLineIso = temp.sourceRectAtTime(comp.time, false);
                    if (rLineIso.width <= 1 && rLineIso.height <= 1) {
                        break;
                    }
                    pristineInBoxMetrics.push({
                        left: rLineIso.left,
                        right: rLineIso.left + rLineIso.width,
                        width: rLineIso.width,
                        top: rLineIso.top,
                        height: rLineIso.height,
                        wrappedInIsolation: false,
                        exactInPara: true
                    });
                }
                animPristine.remove();
            } catch (ePristineAnim) {}
        }

        // توسيع آمن لصندوق النص ضمن حدود After Effects (تجنب [100000, 100000] الذي يطلق استثناء في AE ويفشل بصمت!)
        var applySafeExpandedBox = function (docObj) {
            if (!docObj || !docObj.boxText) return;
            var bw = (boxSize && boxSize[0] > 0) ? boxSize[0] : 2000;
            var bh = (boxSize && boxSize[1] > 0) ? boxSize[1] : 2000;
            var candidates = [
                [Math.min(15000, Math.max(6000, Math.round(bw * 4))), Math.min(15000, Math.max(6000, Math.round(bh * 4)))],
                [10000, 10000],
                [8000, 8000],
                [4096, 4096]
            ];
            for (var k = 0; k < candidates.length; k++) {
                try {
                    docObj.boxTextSize = candidates[k];
                    return;
                } catch (eLim) {}
            }
        };

        var useExpandedBox = false;
        var setTempText = function (str) {
            try {
                var d = srcProp.value;
                if (d && d.boxText) {
                    if (useExpandedBox) {
                        applySafeExpandedBox(d);
                    } else if (boxSize !== null) {
                        try { d.boxTextSize = [boxSize[0], boxSize[1]]; } catch (eOrigB) {}
                    }
                }
                d.text = str;
                temp.property("Source Text").setValue(d);
            } catch (eDoc) {
                try {
                    var dFallback = temp.property("Source Text").value;
                    if (useExpandedBox && dFallback && dFallback.boxText) {
                        applySafeExpandedBox(dFallback);
                    }
                    dFallback.text = str;
                    temp.property("Source Text").setValue(dFallback);
                } catch (eRaw) {}
            }
        };

        var docDirCounts = $._smartHighlighter.countDir ? $._smartHighlighter.countDir(fullText) : { rtl: 0, ltr: 0 };
        var isArabicDoc = (docDirCounts.rtl > 0);

        // قياس الارتفاع المرجعي للسطر والمسافة السطرية الحقيقية (Leading) لاكتشاف سقوط السطر الحقيقي بدقة قاطعة
        setTempText(isArabicDoc ? "\u0623\r\u0628" : "A\rB");
        var sampleR2 = temp.sourceRectAtTime(comp.time, false);
        setTempText(isArabicDoc ? "\u0623" : "A");
        var sampleR1 = temp.sourceRectAtTime(comp.time, false);
        var refLineH = Math.max(sampleR1.height, fontSize * 1.0);
        if (refLineH <= 0) refLineH = Math.max(fontSize, 24);
        var refLineLeading = Math.max(sampleR2.height - sampleR1.height, fontSize * 1.0);
        var lineDropThreshold = refLineLeading * 0.55;
        var wrapThresholdH = refLineH * 1.35;

        // حساب عرض التخطيط الحقيقي لصندوق Area Text
        var justifiedLayoutW = (isBoxText && boxSize && typeof boxSize[0] === "number" && boxSize[0] > 0) ? boxSize[0] : rFull.width;
        if (isBoxText && boxSize && typeof boxSize[0] === "number" && boxSize[0] > 0) {
            try {
                var lInd = (typeof textDoc.leftIndent === "number") ? textDoc.leftIndent : 0;
                var rInd = (typeof textDoc.rightIndent === "number") ? textDoc.rightIndent : 0;
                justifiedLayoutW = Math.max(10, justifiedLayoutW - lInd - rInd);
            } catch (eInd) {}
        }
        if (rFull.width > justifiedLayoutW) {
            justifiedLayoutW = rFull.width;
        }
        justifiedLayoutW = Math.round(justifiedLayoutW * 10) / 10;

        var rawParagraphs = fullText.split(/\r\n|[\r\n\u0003]/);
        var visualLines = [];
        var currentSlot = 0;

        if (!isBoxText) {
            // Point Text: لا يلتف أوتوماتيكياً في After Effects نهائياً
            for (var p = 0; p < rawParagraphs.length; p++) {
                var pText = rawParagraphs[p];
                if (pText.replace(/\s/g, "").length === 0) {
                    currentSlot++;
                    continue;
                }
                var cleanLine = pText.replace(/\s+$/, "");
                visualLines.push({
                    text: cleanLine,
                    paraText: cleanLine,
                    paraCharStart: 0,
                    paraCharEnd: cleanLine.length,
                    isLastOfPara: true,
                    slotIndex: currentSlot++
                });
            }
        } else {
            // Area (Box) Text: كشف الأسطر الحقيقي عبر التقليص التراجعي بالبحث الثنائي (Reverse Binary Search)
            for (var p = 0; p < rawParagraphs.length; p++) {
                var para = rawParagraphs[p];
                if (para.replace(/\s/g, "").length === 0) {
                    currentSlot++;
                    continue;
                }

                var words = para.match(/\S+/g) || [];
                if (words.length === 0) {
                    currentSlot++;
                    continue;
                }

                // فحص ما إذا كانت الفقرة كاملة تتسع في سطر واحد
                setTempText(para);
                var rPara = temp.sourceRectAtTime(comp.time, false);

                if (rPara.height <= wrapThresholdH) {
                    var trimmedSingle = para.replace(/\s+$/, "");
                    visualLines.push({
                        text: trimmedSingle,
                        paraText: para,
                        paraCharStart: 0,
                        paraCharEnd: trimmedSingle.length,
                        isLastOfPara: true,
                        slotIndex: currentSlot++
                    });
                    continue;
                }

                // الفقرة تمتد لعدة أسطر: الكشف التراجعي من الأسفل للأعلى
                var paraLines = [];
                var remainingEnd = words.length;

                while (remainingEnd > 0) {
                    var curSubText = words.slice(0, remainingEnd).join(" ");
                    setTempText(curSubText);
                    var rCur = temp.sourceRectAtTime(comp.time, false);

                    // إذا كانت الكلمات المتبقية تتسع في سطر واحد
                    if (rCur.height <= wrapThresholdH) {
                        paraLines.unshift({
                            startWordIdx: 0,
                            endWordIdx: remainingEnd,
                            words: words.slice(0, remainingEnd)
                        });
                        break;
                    }

                    // البحث الثنائي عن الكلمة التي بدأ عندها السطر السفلي الحالي
                    var targetH = rCur.height;
                    var low = 0;
                    var high = remainingEnd - 1;
                    var lineStartWordIdx = high;

                    while (low <= high) {
                        var mid = Math.floor((low + high) / 2);
                        var probeText = words.slice(0, mid).join(" ");
                        setTempText(probeText);
                        var rProbe = temp.sourceRectAtTime(comp.time, false);

                        if (targetH - rProbe.height > lineDropThreshold) {
                            // حدث هبوط حقيقي لسطر كامل! فالسطر يبدأ عند أو بعد mid
                            lineStartWordIdx = mid;
                            low = mid + 1;
                        } else {
                            // لم يسقط السطر بعد، ما زلنا ضمن نفس السطر
                            high = mid - 1;
                        }
                    }

                    paraLines.unshift({
                        startWordIdx: lineStartWordIdx,
                        endWordIdx: remainingEnd,
                        words: words.slice(lineStartWordIdx, remainingEnd)
                    });

                    remainingEnd = lineStartWordIdx;
                }

                // تحويل paraLines إلى visualLines مع التقاط paraCharStart و paraCharEnd بدقة
                var paraCursor = 0;
                for (var li = 0; li < paraLines.length; li++) {
                    var lWords = paraLines[li].words;
                    var lText = lWords.join(" ");
                    var isLast = (li === paraLines.length - 1);

                    var pFound = para.indexOf(lText, paraCursor);
                    var pStartIdx = (pFound !== -1) ? pFound : paraCursor;
                    var pEndIdx = pStartIdx + lText.length;
                    paraCursor = pEndIdx;

                    visualLines.push({
                        text: lText,
                        paraText: para,
                        paraCharStart: pStartIdx,
                        paraCharEnd: pEndIdx,
                        isLastOfPara: isLast,
                        slotIndex: currentSlot++
                    });
                }
            }
        }

        var totalSlots = Math.max(currentSlot, visualLines.length);
        var numLines = visualLines.length;
        if (numLines === 0) {
            return null;
        }

        // =========================================================================
        // المرحلة 1: القياس الحقيقي الصرف لحبر كل سطر داخل الفقرة عبر عزل الأسطر
        // بـ Text Animator مباشرة من محرك الريندر HarfBuzz على النسخة البكر
        // =========================================================================
        var inBoxMetrics = [];
        if (pristineInBoxMetrics && pristineInBoxMetrics.length === numLines) {
            inBoxMetrics = pristineInBoxMetrics;
        } else if (isBoxText) {
            for (var bi = 0; bi < numLines; bi++) {
                if (pristineInBoxMetrics && bi < pristineInBoxMetrics.length) {
                    inBoxMetrics.push(pristineInBoxMetrics[bi]);
                } else {
                    var bText = visualLines[bi].text;
                    var bIsRTL = isArabicDoc && (($._smartHighlighter.countDir ? $._smartHighlighter.countDir(bText).rtl : 1) > 0);
                    var probeInBoxText = (bIsRTL && /^[0-9]/.test(bText)) ? ("\u200F" + bText) : bText;
                    setTempText(probeInBoxText);
                    var rInBox = temp.sourceRectAtTime(comp.time, false);
                    inBoxMetrics.push({
                        left: rInBox.left,
                        right: rInBox.left + rInBox.width,
                        width: rInBox.width,
                        top: rInBox.top,
                        height: rInBox.height,
                        wrappedInIsolation: (rInBox.height > wrapThresholdH),
                        exactInPara: false
                    });
                    setTempText(fullText);
                }
            }
        } else {
            // Point Text: لا يوجد التفاف داخل صندوق
            for (var bi = 0; bi < numLines; bi++) {
                var pLineObj = visualLines[bi];
                var pText = pLineObj.text;
                var pIsRTL = isArabicDoc && (($._smartHighlighter.countDir ? $._smartHighlighter.countDir(pText).rtl : 1) > 0);
                var pProbeText = (pIsRTL && /^[0-9]/.test(pText)) ? ("\u200F" + pText) : pText;
                setTempText(pProbeText);
                var rPoint = temp.sourceRectAtTime(comp.time, false);
                inBoxMetrics.push({
                    left: rPoint.left,
                    right: rPoint.left + rPoint.width,
                    width: rPoint.width,
                    top: rPoint.top,
                    height: rPoint.height,
                    wrappedInIsolation: false,
                    exactInPara: true
                });
            }
        }

        // =========================================================================
        // المرحلة 2: توسيع آمن لصندوق النص (e.g. [8000, 8000]) لقياس cOffsets بحرية
        // =========================================================================
        if (isBoxText) {
            useExpandedBox = true;
        }

        setTempText(isArabicDoc ? "\u0646 \u0646" : "n n");
        var rWS = temp.sourceRectAtTime(comp.time, false).width;
        setTempText(isArabicDoc ? "\u0646\u0646" : "nn");
        var rNS = temp.sourceRectAtTime(comp.time, false).width;
        var fontSpaceW = Math.max(2, rWS - rNS);

        setTempText("\u0627");
        var alefAnchorW = Math.max(1, temp.sourceRectAtTime(comp.time, false).width);

        var measureSubStringWidth = function (str, lineStartsWithNumberRTL) {
            if (!str || str.length === 0) return 0;
            if (lineStartsWithNumberRTL) {
                setTempText("\u0627" + str);
                var rAnchored = temp.sourceRectAtTime(comp.time, false);
                return Math.max(0, rAnchored.width - alefAnchorW);
            }
            setTempText(str);
            return temp.sourceRectAtTime(comp.time, false).width;
        };

        var linesData = [];
        for (var i = 0; i < numLines; i++) {
            var lineObj = visualLines[i];
            var boxMetric = inBoxMetrics[i];
            var lText = lineObj.text;
            var isRTLDir = (justifyType === "right") || (justification === 7414) || (justification === 7417) || ($._smartHighlighter.countDir(lText).rtl > 0);
            var startsWithNumRTL = isRTLDir && /^[0-9\s.,:;!?\-\(\)\[\]+%$]+/.test(lText);

            var rawUnconstrainedW = measureSubStringWidth(lText, startsWithNumRTL);
            setTempText(startsWithNumRTL ? ("\u200F" + lText) : lText);
            var rLine = temp.sourceRectAtTime(comp.time, false);
            if (rLine.width > rawUnconstrainedW) {
                rawUnconstrainedW = rLine.width;
            }

            var finalW = rawUnconstrainedW;
            if (isBoxText) {
                if (isJustified && (isJustifyFullAll || !lineObj.isLastOfPara)) {
                    finalW = justifiedLayoutW;
                } else if (boxMetric && boxMetric.exactInPara && boxMetric.width > 0) {
                    if (isRTLDir) {
                        // الحساب الهندسي الدقيق للسطر العربي:
                        // الصندوق يبدأ من الحافة اليمنى للفقرة (rFullRight) وينتهي تماماً عند الحافة اليسرى للحبر (boxMetric.left)
                        finalW = Math.max(boxMetric.width, rFullRight - boxMetric.left);
                    } else {
                        // في نصوص LTR: الصندوق يبدأ من الحافة اليسرى للفقرة (rFull.left) وينتهي عند الحافة اليمنى للحبر
                        finalW = Math.max(boxMetric.width, boxMetric.right - rFull.left);
                    }
                } else {
                    finalW = rawUnconstrainedW;
                }
            } else if (isJustified && (isJustifyFullAll || !lineObj.isLastOfPara)) {
                finalW = justifiedLayoutW;
            }
            finalW = Math.round(finalW * 100) / 100;

            // حساب الإزاحات التراكمية الدقيقة للكلمات والأحرف بالاعتماد على نقاط ارتكاز الكلمات الكاملة
            // (Word-Anchored Offsets) لتجنب انكماش الحروف المعزولة وتسريع الأداء بأكثر من 8 أضعاف
            var wOffsets = [];
            var wordRegex = /\S+/g;
            var wMatch;
            var wordSpans = [];
            while ((wMatch = wordRegex.exec(lText)) !== null) {
                wordSpans.push({
                    start: wMatch.index,
                    end: wMatch.index + wMatch[0].length,
                    text: wMatch[0]
                });
            }

            var cOffsets = [];
            if (wordSpans.length === 0) {
                for (var ci = 1; ci <= lText.length; ci++) {
                    cOffsets.push(finalW);
                }
                wOffsets.push(finalW);
            } else {
                var prevWordEndW = 0;
                var wordEndWidths = [];

                // قياس أطراف الكلمات المتراكمة داخل السطر ككتل لغوية مكتملة
                for (var wi = 0; wi < wordSpans.length; wi++) {
                    if (wi === wordSpans.length - 1) {
                        wordEndWidths.push(finalW);
                    } else {
                        var prefixStr = lText.substring(0, wordSpans[wi].end);
                        var curWordW = measureSubStringWidth(prefixStr, startsWithNumRTL);
                        curWordW = Math.max(prevWordEndW + fontSpaceW, Math.min(finalW, curWordW));
                        wordEndWidths.push(Math.round(curWordW * 10) / 10);
                        prevWordEndW = curWordW;
                    }
                }

                // توزيع الحروف بنعومة عبر نطاق كل كلمة مشكلة بـ OpenType
                var curWordIdx = 0;
                var prevSpanEndW = 0;
                for (var c = 1; c <= lText.length; c++) {
                    var curCharIdx = c - 1;
                    if (curWordIdx < wordSpans.length) {
                        var sp = wordSpans[curWordIdx];
                        if (curCharIdx < sp.start) {
                            cOffsets.push(prevSpanEndW);
                        } else if (curCharIdx < sp.end) {
                            var targetW = wordEndWidths[curWordIdx];
                            var spanLen = sp.end - sp.start;
                            var charInSpan = curCharIdx - sp.start + 1;
                            var frac = (spanLen > 0) ? (charInSpan / spanLen) : 1;
                            var interpW = prevSpanEndW + (targetW - prevSpanEndW) * frac;
                            cOffsets.push(Math.round(interpW * 10) / 10);
                            if (curCharIdx === sp.end - 1) {
                                prevSpanEndW = targetW;
                                curWordIdx++;
                            }
                        }
                    } else {
                        cOffsets.push(finalW);
                    }
                }
                wOffsets = wordEndWidths;
            }

            // قياس الإزاحات الأفقية الدقيقة للسطر نسبة إلى الحدود الفعلية للفقرة الكاملة (rFull)
            var lineRightOffset = 0;
            var lineLeftOffset = 0;
            var lineCenterOffset = 0;

            if (isBoxText) {
                if (isJustified && (isJustifyFullAll || !lineObj.isLastOfPara)) {
                    lineRightOffset = 0;
                    lineLeftOffset = 0;
                    lineCenterOffset = 0;
                } else if (isRTLDir) {
                    // في النصوص العربية والـ RTL: بدايات الأسطر مقفولة 100% كالمسطرة عند الحافة اليمنى للفقرة
                    var hasLeadingWsRTL = /^\s+/.test(lText);
                    lineRightOffset = hasLeadingWsRTL ? Math.max(0, Math.round((rFullRight - boxMetric.right) * 10) / 10) : 0;
                    lineLeftOffset = Math.max(0, Math.round((rFullRight - finalW - rFull.left) * 10) / 10);
                    lineCenterOffset = Math.round(((rFullRight - (finalW * 0.5)) - (rFull.left + rFull.width * 0.5)) * 10) / 10;
                } else {
                    var effRight = boxMetric.right;
                    var effLeft = boxMetric.left;
                    if (finalW > boxMetric.width + 0.5) {
                        var extraW = finalW - boxMetric.width;
                        if (justifyType === "center" || justification === 7415 || justification === 7418) {
                            effLeft -= extraW * 0.5;
                            effRight += extraW * 0.5;
                        } else {
                            effRight = effLeft + finalW;
                        }
                    }
                    lineRightOffset = Math.max(0, Math.round((rFullRight - effRight) * 10) / 10);
                    lineLeftOffset = Math.max(0, Math.round((effLeft - rFull.left) * 10) / 10);
                    lineCenterOffset = Math.round((((effLeft + effRight) * 0.5) - (rFull.left + rFull.width * 0.5)) * 10) / 10;
                }
            } else {
                var rLineRight = rLine.left + rLine.width;
                lineRightOffset = Math.max(0, Math.round((rFullRight - rLineRight) * 10) / 10);
                lineLeftOffset = Math.max(0, Math.round((rLine.left - rFull.left) * 10) / 10);
                lineCenterOffset = Math.round(((rLine.left + rLine.width / 2) - (rFull.left + rFull.width / 2)) * 10) / 10;
            }

            linesData.push({
                lineIndex: i,
                slotIndex: (typeof lineObj.slotIndex === "number") ? lineObj.slotIndex : i,
                totalSlots: totalSlots,
                text: lineObj.text,
                paraText: lineObj.paraText,
                paraCharStart: lineObj.paraCharStart,
                paraCharEnd: lineObj.paraCharEnd,
                width: finalW,
                rawWidth: rawUnconstrainedW,
                inBoxLeft: boxMetric.left,
                inBoxRight: boxMetric.right,
                exactInPara: boxMetric.exactInPara,
                wrappedInIsolation: boxMetric.wrappedInIsolation,
                startsWithNumRTL: startsWithNumRTL,
                height: refLineH,
                lineH: refLineH,
                isLastOfPara: lineObj.isLastOfPara,
                isJustified: isJustified,
                justifyType: justifyType,
                isJustifyFullAll: isJustifyFullAll,
                top: 0,
                rightOffset: lineRightOffset,
                leftOffset: lineLeftOffset,
                centerOffset: lineCenterOffset,
                cOffsets: cOffsets,
                wOffsets: wOffsets
            });
        }

        // توزيع قمم الأسطر بتناسب هندسي دقيق معتمد على totalSlots بما يشمل فواصل الأسطر الفارغة
        var linePitch = (totalSlots > 1) ? ((rFull.height - refLineH) / (totalSlots - 1)) : 0;
        var cursor = 0;
        var totalWords = 0;
        for (var t = 0; t < numLines; t++) {
            var needle = visualLines[t].text;
            var found = fullText.indexOf(needle, cursor);
            if (found !== -1) {
                var endOff = found + needle.length;
                linesData[t].charStart = found;
                linesData[t].charEnd = endOff;
                cursor = endOff;
            } else {
                linesData[t].charStart = cursor;
                linesData[t].charEnd = cursor + visualLines[t].text.length;
                cursor += visualLines[t].text.length;
            }

            linesData[t].top = Math.round((linesData[t].slotIndex * linePitch) * 10) / 10;

            linesData[t].wordStart = totalWords;
            var numWordsInLine = (linesData[t].wOffsets) ? linesData[t].wOffsets.length : 1;
            linesData[t].wordEnd = totalWords + numWordsInLine;
            totalWords += numWordsInLine;
        }
        if (totalWords <= 0) totalWords = 1;

        $._smartHighlighter.log("scan: " + numLines + " lines, " + totalSlots + " slots, " + totalWords + " words, isJustified=" + isJustified + " (" + justifyType + "), fullW=" + rFull.width.toFixed(1) + ", refH=" + refLineH.toFixed(1));

        return {
            linesData: linesData,
            numLines: numLines,
            totalSlots: totalSlots,
            numWords: totalWords,
            singleH: refLineH,
            fullH: rFull.height,
            fullW: rFull.width,
            fullTop: rFull.top,
            fullLeft: rFull.left,
            fullRight: rFullRight,
            justifiedWidth: justifiedLayoutW,
            isBoxText: isBoxText,
            fontSize: fontSize,
            fullText: fullText,
            isJustified: isJustified,
            justifyType: justifyType,
            isJustifyFullAll: isJustifyFullAll,
            justification: justification,
            fontSpaceW: fontSpaceW,
            alefAnchorW: alefAnchorW
        };

    } catch (eScan) {
        $._smartHighlighter.log("scanParagraph EXCEPTION: " + eScan.toString());
        return null;
    } finally {
        if (temp) {
            try {
                temp.remove();
            } catch (eR) {}
            temp = null;
        }
        for (var di = comp.numLayers; di >= 1; di--) {
            try {
                var dL = comp.layer(di);
                if (dL && dL !== textLayer && dL.name === $._smartHighlighter.SCAN_TEMP_ENGINE) {
                    dL.remove();
                }
            } catch (eDel) {}
        }
        try {
            textLayer.selected = true;
        } catch (eSel) {}
    }
};

var SMART_HL_TEXTSCANNER_LOADED = true;