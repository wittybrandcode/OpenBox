/**
 * OPENBOX - Host Engine
 * Module: TextScanner.jsx
 * Version: 2.3.0 (World-Ready Multi-Line Area Text & Exact Ink Envelope Engine)
 * 
 * High-precision Paragraph & Line Geometry Scanner:
 * - Preserves pristine TextDocument state from source layer on every measurement
 *   (preventing font-fallback and BiDi direction corruption on Arabic layers).
 * - Measures each visual line inside the original Area Text boxTextSize BEFORE
 *   expanding to [100000, 100000], using both real next-line prefix soft-wrap probes
 *   and mathematically locked soft-wrap continuation probes so Adobe's World-Ready
 *   Paragraph Composer applies authentic intermediate-line spacing without forcing
 *   rigid full-box widths on ragged lines.
 * - Extracts exact in-box per-line horizontal offsets (rightOffset, leftOffset,
 *   centerOffset) relative to rFull and normalizes cOffsets / wOffsets to finalW.
 */

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

        // دالة مساعدة لتحديث نص الطبقة المؤقتة بالاعتماد على نسخة نظيفة من الطبقة الأصلية (srcProp.value)
        // لمنع أي تلوث في الخط البديل (Font Fallback) أو انقلاب اتجاه الفقرة (BiDi Direction) أثناء القياس
        var customBoxSize = null;
        var setTempText = function (str) {
            try {
                var d = srcProp.value;
                if (customBoxSize !== null && d.boxText) {
                    d.boxTextSize = customBoxSize;
                } else if (boxSize !== null && d.boxText) {
                    d.boxTextSize = [boxSize[0], boxSize[1]];
                }
                d.text = str;
                temp.property("Source Text").setValue(d);
            } catch (eDoc) {
                try {
                    var dFallback = temp.property("Source Text").value;
                    dFallback.text = str;
                    temp.property("Source Text").setValue(dFallback);
                } catch (eRaw) {}
            }
        };

        var docDirCounts = $._smartHighlighter.countDir ? $._smartHighlighter.countDir(fullText) : { rtl: 0, ltr: 0 };
        var isArabicDoc = (docDirCounts.rtl > 0);

        // قياس الارتفاع المرجعي للسطر بعينة متوافقة مع لغة الخط الأصلي دون محارف لاتينية معجمة تسبب Font Fallback
        setTempText(isArabicDoc ? "\u0623\u064A\u0640\u062C\u0031" : "Ag1");
        var sampleR = temp.sourceRectAtTime(comp.time, false);
        var refLineH = Math.max(sampleR.height, fontSize * 1.15);
        if (refLineH <= 0) refLineH = Math.max(fontSize, 24);

        // قياس الارتفاع المرجعي لسطرين لاكتشاف قفزة الالتفاف بدقة قاطعة
        setTempText(isArabicDoc ? "\u0623\r\u0628" : "A\rB");
        var sampleR2 = temp.sourceRectAtTime(comp.time, false);
        var ref2LineH = Math.max(sampleR2.height, refLineH * 1.8);

        // قياس الفقرة الكاملة داخل الصندوق الأصلي أولاً قبل أي تغيير في الأبعاد
        setTempText(fullText);
        var rFull = temp.sourceRectAtTime(comp.time, false);
        var rFullRight = rFull.left + rFull.width;

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
            // كل سطر مفصول بـ Enter يمثل سطراً بصرياً واحداً بدقة 100%
            for (var p = 0; p < rawParagraphs.length; p++) {
                var pText = rawParagraphs[p];
                if (pText.replace(/\s/g, "").length === 0) {
                    currentSlot++; // الحفاظ على الفتحة الرأسية للسطر الفارغ
                    continue;
                }
                visualLines.push({
                    text: pText.replace(/\s+$/, ""),
                    isLastOfPara: true,
                    slotIndex: currentSlot++
                });
            }
        } else {
            // Area (Box) Text: يلتف عند تجاوز عرض الصندوق boxTextSize
            for (var p = 0; p < rawParagraphs.length; p++) {
                var para = rawParagraphs[p];
                if (para.replace(/\s/g, "").length === 0) {
                    currentSlot++; // الحفاظ على الفتحة الرأسية للسطر الفارغ بين الفقرات
                    continue;
                }

                var words = para.match(/\S+|\s+/g) || [];
                if (words.length === 0) {
                    currentSlot++;
                    continue;
                }

                var curLine = "";

                for (var w = 0; w < words.length; w++) {
                    var token = words[w];
                    var testStr = curLine ? (curLine + token) : token;

                    var wrapsToNextLine = false;
                    if (curLine.replace(/\s/g, "").length > 0) {
                        if (isJustified) {
                            // في النصوص المضبوطة: نختبر السطر كسطر وسيط
                            setTempText(testStr + "\r.");
                            var rTest = temp.sourceRectAtTime(comp.time, false);
                            wrapsToNextLine = (rTest.height > ref2LineH * 1.25);
                        } else {
                            setTempText(testStr);
                            var r = temp.sourceRectAtTime(comp.time, false);
                            wrapsToNextLine = (r.height > refLineH * 1.6);
                        }
                    } else {
                        setTempText(testStr);
                    }

                    if (wrapsToNextLine) {
                        visualLines.push({
                            text: curLine.replace(/\s+$/, ""),
                            isLastOfPara: false,
                            slotIndex: currentSlot++
                        });
                        curLine = token.replace(/^\s+/, "");
                    } else {
                        curLine = testStr;
                    }
                }
                if (curLine.replace(/\s/g, "").length > 0) {
                    visualLines.push({
                        text: curLine.replace(/\s+$/, ""),
                        isLastOfPara: true,
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

        // قياس عرض المسافة الفعلي للخط وعرض وحدة الكشيدة/النقطة لبناء مسبار الالتفاف الناعم (Soft-Wrap Probe)
        var probeChar = isArabicDoc ? "\u0640" : ".";
        var probeBaseStr = "";
        for (var pc = 0; pc < 20; pc++) probeBaseStr += probeChar;
        setTempText(probeBaseStr);
        var probe20W = Math.max(4, temp.sourceRectAtTime(comp.time, false).width);
        var singleProbeCharW = Math.max(0.5, probe20W / 20);

        setTempText(isArabicDoc ? "\u0646 \u0646" : "n n");
        var rWS = temp.sourceRectAtTime(comp.time, false).width;
        setTempText(isArabicDoc ? "\u0646\u0646" : "nn");
        var rNS = temp.sourceRectAtTime(comp.time, false).width;
        var fontSpaceW = Math.max(2, rWS - rNS);

        // =========================================================================
        // المرحلة 1: قياس الأبعاد والإحداثيات الحقيقية لكل سطر داخل boxTextSize الأصلي
        // مع محاكاة الالتفاف الطبيعي (Soft-Wrap) لمحرك World-Ready Paragraph Composer
        // =========================================================================
        var inBoxMetrics = [];
        for (var bi = 0; bi < numLines; bi++) {
            var bLineObj = visualLines[bi];
            var bText = bLineObj.text;

            setTempText(bText);
            var rInBox = temp.sourceRectAtTime(comp.time, false);

            var bLeft = rInBox.left;
            var bRight = rInBox.left + rInBox.width;
            var bWidth = rInBox.width;

            // إذا كان السطر وحده قد التف داخل الصندوق (يحدث أحياناً في النصوص المضبوطة بشدة)
            if (isBoxText && rInBox.height > refLineH * 1.6) {
                bLeft = rFull.left;
                bRight = rFullRight;
                bWidth = rFull.width;
            } else if (isBoxText && !bLineObj.isLastOfPara) {
                // السطر وسيط ملتف تلقائياً (!isLastOfPara):
                // عند قياسه منفرداً يعامله After Effects كسطر أخير في فقرة مستقلة فلا يطبق تمدد المسافات
                // الخاص بمحرك World-Ready Paragraph Composer.
                // لذلك نقيسه كسطر ملتف فعلياً داخل الصندوق الأصلي عبر مسبارين آمنين هندسياً:

                // المسبار الأول: إلحاق أول كلمة أو كلمتين من السطر التالي (بشرط أن تكون أضيق من السطر الحالي)
                if (bi + 1 < numLines) {
                    var nextLineWords = visualLines[bi + 1].text.match(/\S+/g) || [];
                    var maxTestWords = Math.min(2, nextLineWords.length);
                    var nextPrefix = "";
                    for (var nw = 0; nw < maxTestWords; nw++) {
                        nextPrefix = nextPrefix ? (nextPrefix + " " + nextLineWords[nw]) : nextLineWords[nw];
                        setTempText(nextPrefix);
                        var rNP = temp.sourceRectAtTime(comp.time, false);
                        if (rNP.width > 0 && rNP.width < bWidth * 0.82 && rNP.height <= refLineH * 1.45) {
                            setTempText(bText + " " + nextPrefix);
                            var rWrapNext = temp.sourceRectAtTime(comp.time, false);
                            // التحقق من أن السطر التف إلى سطرين بالضبط دون أن يسحب كلمة إلى السطر الثالث
                            if (rWrapNext.height > refLineH * 1.45 && rWrapNext.height <= ref2LineH * 1.35) {
                                var wnLeft = rWrapNext.left;
                                var wnRight = rWrapNext.left + rWrapNext.width;
                                if (rWrapNext.width >= bWidth && rWrapNext.width <= rFull.width + 2) {
                                    bLeft = Math.min(bLeft, wnLeft);
                                    bRight = Math.max(bRight, wnRight);
                                    bWidth = bRight - bLeft;
                                }
                            }
                        }
                    }
                }

                // المسبار الثاني (المقفل رياضياً): بناء كلمة متصلة وهمية على السطر الثاني
                // تحقق المتباينة: (boxW - lastWordW) < dummyW < lineW
                // مما يمنع المحرك رياضياً من إنزال آخر كلمة ("آخرين") للسطر الثاني، ويمنع السطر الثاني من تجاوز عرض السطر الأول
                var lineTokens = bText.match(/\S+/g) || [];
                if (lineTokens.length > 1) {
                    var lastWordStr = lineTokens[lineTokens.length - 1];
                    setTempText(lastWordStr);
                    var rLastW = temp.sourceRectAtTime(comp.time, false);
                    var lastW = rLastW.width;
                    var minDummyW = Math.max(20, justifiedLayoutW - lastW + 12);
                    var maxDummyW = bWidth - 12;

                    if (minDummyW < maxDummyW) {
                        var targetDummyW = (minDummyW + maxDummyW) * 0.5;
                        var repeatCount = Math.max(5, Math.min(400, Math.round(targetDummyW / singleProbeCharW)));
                        var dummyToken = "";
                        for (var dc = 0; dc < repeatCount; dc++) dummyToken += probeChar;

                        setTempText(dummyToken);
                        var rDummy = temp.sourceRectAtTime(comp.time, false);
                        if (rDummy.width > (justifiedLayoutW - lastW) && rDummy.width < bWidth * 0.96 && rDummy.height <= refLineH * 1.45) {
                            // اختبار التفاف بسطرين واختبار بـ 3 أسطر لمحاكاة الفقرة الكاملة في World-Ready Composer
                            var probes = [
                                bText + " " + dummyToken,
                                bText + " " + dummyToken + " " + dummyToken
                            ];
                            for (var pr = 0; pr < probes.length; pr++) {
                                setTempText(probes[pr]);
                                var rLock = temp.sourceRectAtTime(comp.time, false);
                                if (rLock.height > refLineH * 1.45 && rLock.width >= bWidth && rLock.width <= rFull.width + 2) {
                                    bLeft = Math.min(bLeft, rLock.left);
                                    bRight = Math.max(bRight, rLock.left + rLock.width);
                                    bWidth = bRight - bLeft;
                                }
                            }
                        }
                    }
                }
            }

            inBoxMetrics.push({
                left: bLeft,
                right: bRight,
                width: bWidth
            });
        }

        // =========================================================================
        // المرحلة 2: توسيع صندوق النص في الطبقة المؤقتة لقياس cOffsets بحرية دون التفاف
        // =========================================================================
        if (isBoxText) {
            customBoxSize = [100000, 100000];
        }

        var linesData = [];
        for (var i = 0; i < numLines; i++) {
            var lineObj = visualLines[i];
            var boxMetric = inBoxMetrics[i];

            setTempText(lineObj.text);
            var rLine = temp.sourceRectAtTime(comp.time, false);
            var rawUnconstrainedW = rLine.width;

            // اعتماد العرض الفعلي الشامل لتمدد World-Ready Composer داخل الفقرة
            var finalW = isBoxText ? Math.max(rawUnconstrainedW, boxMetric.width) : rawUnconstrainedW;
            if (isJustified) {
                // في النصوص المضبوطة: الأسطر الممتدة (غير الأخيرة في كل فقرة) تأخذ عرض التخطيط الفعلي justifiedLayoutW
                if (isJustifyFullAll || !lineObj.isLastOfPara) {
                    finalW = justifiedLayoutW;
                }
            }
            finalW = Math.round(finalW * 100) / 100;

            // قياس العرض التراكمي الحقيقي بالبيكسل لكل حرف (Exact Cumulative Character Offsets)
            var cOffsets = [];
            var lText = lineObj.text;
            var prevOffW = 0;
            for (var c = 1; c <= lText.length; c++) {
                setTempText(lText.substring(0, c));
                var rSub = temp.sourceRectAtTime(comp.time, false);
                var curSubW = rSub.width;
                if (/\s/.test(lText.charAt(c - 1)) && curSubW <= prevOffW) {
                    curSubW = prevOffW + fontSpaceW;
                } else {
                    curSubW = Math.max(prevOffW, curSubW);
                }
                cOffsets.push(Math.round(curSubW * 10) / 10);
                prevOffW = curSubW;
            }

            // مواءمة الإزاحات التراكمية للحروف (cOffsets) مع العرض النهائي الفعلي للسطر (finalW)
            // سواء كان التمدد ناتجاً عن الضبط الكلي (Justify) أو عن توزيع المسافات في World-Ready Composer
            if (finalW > 0 && cOffsets.length > 0 && prevOffW > 0 && Math.abs(finalW - prevOffW) > 0.5) {
                var scaleRatio = finalW / prevOffW;
                for (var jc = 0; jc < cOffsets.length; jc++) {
                    cOffsets[jc] = Math.round(cOffsets[jc] * scaleRatio * 10) / 10;
                }
                cOffsets[cOffsets.length - 1] = Math.round(finalW * 10) / 10;
            }

            // حساب إزاحات الكلمات الدقيقة لتزامن الكلمات (Word Offsets)
            var wOffsets = [];
            var wordRegex = /\S+/g;
            var wMatch;
            while ((wMatch = wordRegex.exec(lText)) !== null) {
                var wEndChar = wMatch.index + wMatch[0].length; // 1-based index
                var wWidth = (wEndChar <= cOffsets.length && wEndChar > 0) ? cOffsets[wEndChar - 1] : finalW;
                wOffsets.push(Math.round(wWidth * 10) / 10);
            }
            if (wOffsets.length === 0) {
                wOffsets.push(Math.round(finalW * 10) / 10);
            } else {
                wOffsets[wOffsets.length - 1] = Math.round(finalW * 10) / 10;
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
                } else {
                    // استخدام الإحداثيات الفعلية المقاسة داخل الصندوق الأصلي (boxMetric)
                    // لضمان عدم ضياع أي إزاحة ناتجة عن المحاذاة أو فروق هوامش الحروف
                    var effLeft = boxMetric.left;
                    var effRight = boxMetric.right;
                    var isRTLDir = (justifyType === "right") || (justification === 7414) || (justification === 7417) || ($._smartHighlighter.countDir(lText).rtl > 0);

                    if (finalW > boxMetric.width + 0.5) {
                        var extraW = finalW - boxMetric.width;
                        if (justifyType === "center" || justification === 7415 || justification === 7418) {
                            effLeft -= extraW / 2;
                            effRight += extraW / 2;
                        } else if (isRTLDir && justification !== 7413 && justification !== 7416) {
                            effLeft = effRight - finalW;
                        } else if (!isRTLDir || justification === 7413 || justification === 7416) {
                            effRight = effLeft + finalW;
                        }
                    }

                    lineRightOffset = Math.max(0, Math.round((rFullRight - effRight) * 10) / 10);
                    lineLeftOffset = Math.max(0, Math.round((effLeft - rFull.left) * 10) / 10);
                    lineCenterOffset = Math.round((((effLeft + effRight) / 2) - (rFull.left + rFull.width / 2)) * 10) / 10;
                }
            } else {
                // Point Text: measure exact ink offsets relative to paragraph bounding box
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
                width: finalW,
                rawWidth: rawUnconstrainedW,
                inBoxLeft: boxMetric.left,
                inBoxRight: boxMetric.right,
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

            // تحديد نطاق الكلمات للسطر (wordStart و wordEnd)
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
            fontSpaceW: fontSpaceW
        };

    } catch (eScan) {
        $._smartHighlighter.log("scanParagraph EXCEPTION: " + eScan.toString());
        return null;
    } finally {
        // ضمان الحذف الفوري للطبقة المؤقتة
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