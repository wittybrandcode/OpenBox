/**
 * OPENBOX - Host Engine
 * Module: TagManager.jsx
 * Version: 2.5.0 (RTL Solid-Anchor Margin Guarantee & In-Paragraph Word Geometry)
 * 
 * Manages tagged word parsing ([word], *word*, {word}), word stripping,
 * and multi-mode target box resolution (lines, tagged keywords, karaoke words).
 */

// استخراج الكلمات والعبارات المحاطة بالأقواس أو الوسوم [عبارة] أو *عبارة* أو {عبارة}
// يدعم امتداد العبارات عبر الأسطر المتعددة (Multi-line Tagged Phrases)
$._smartHighlighter.extractTags = function (text) {
    if (!text) return [];
    var tagPattern = /\[([^\]]+)\]|\*([^\*]+)\*|\{([^\}]+)\}/g;
    var tags = [];
    var match;
    var strippedCharsBefore = 0;
    while ((match = tagPattern.exec(text)) !== null) {
        var tagged = match[1] || match[2] || match[3];
        if (tagged && tagged.replace(/\s/g, "").length > 0) {
            var rawLen = match[0].length;
            var cleanStart = match.index - strippedCharsBefore;
            var cleanEnd = cleanStart + tagged.length;
            tags.push({
                raw: match[0],
                content: tagged,
                rawIndex: match.index,
                cleanStart: cleanStart,
                cleanEnd: cleanEnd
            });
            strippedCharsBefore += (rawLen - tagged.length);
        }
    }
    return tags;
};

// تنظيف النص من أقواس الوسوم لعرضه بشكل طبيعي
$._smartHighlighter.stripTags = function (text) {
    if (!text) return "";
    return text.replace(/\[([^\]]+)\]/g, "$1")
               .replace(/\*([^\*]+)\*/g, "$1")
               .replace(/\{([^\}]+)\}/g, "$1");
};

// قياس واستخراج أبعاد صناديق التظليل سواء للأسطر الكاملة أو الكلمات المستهدفة
$._smartHighlighter.scanTargetBoxes = function (textLayer, comp, data) {
    var rawText = "";
    try {
        rawText = textLayer.property("Source Text").value.text;
    } catch (e) {
        return null;
    }

    var tags = $._smartHighlighter.extractTags(rawText);
    var mode = data.mode || "auto"; // "lines", "tagged", "words", "auto"

    if (mode === "auto") {
        mode = (tags.length > 0) ? "tagged" : "lines";
    }

    var cleanText = (mode === "tagged" && tags.length > 0) ? $._smartHighlighter.stripTags(rawText) : rawText;
    var scan = $._smartHighlighter.scanParagraph(textLayer, comp, cleanText);
    if (!scan) return null;

    var boxesData = [];
    var fallbackRTL = false;
    var isCenter = false;

    if (data.direction === "center") {
        isCenter = true;
    } else if (data.direction === "rtl") {
        fallbackRTL = true;
    } else if (data.direction === "ltr") {
        fallbackRTL = false;
    } else {
        if (scan.isJustified) {
            if (scan.justifyType === "right") fallbackRTL = true;
            else if (scan.justifyType === "center") isCenter = true;
            else fallbackRTL = false;
        } else {
            var pj = $._smartHighlighter.detectJustification(scan.justification);
            if (pj === "center") isCenter = true;
            else if (pj === "rtl") fallbackRTL = true;
            else if (pj === "ltr") fallbackRTL = false;
            else {
                var fc = $._smartHighlighter.countDir(scan.fullText);
                fallbackRTL = (fc.rtl > fc.ltr);
            }
        }
    }

    // دالة موحدة لبناء بيانات صندوق السطر مع ضمان الاصطفاف العمودي للبداية والاحتواء الكامل للنهاية
    var buildLineBoxEntry = function (kIdx) {
        var ld = scan.linesData[kIdx];
        var rtl_k = isCenter ? false : ((data.direction === "ltr") ? false : ((data.direction === "rtl") ? true : (scan.isJustified ? (scan.justifyType === "right") : $._smartHighlighter.lineIsRTL(ld.text, fallbackRTL))));
        var cStart = (typeof ld.charStart === "number") ? ld.charStart : 0;
        var cEnd = (typeof ld.charEnd === "number") ? ld.charEnd : (cStart + ld.text.length);

        // ضمان اصطفاف عمودي مستقيم 100% لبدايات الأسطر (Flush Vertical Alignment for Start Side):
        // في نمط الأسطر، يجب أن تصطف بدايات جميع الحاويات على خط عمودي واحد كالمسطرة دون أي تعرج ناتج عن هوامش الحروف
        // بينما تظل نهايات الأسطر حرة وديناميكية وفقاً لطول وكلمات كل سطر دون أي قطع للكلمات الأخيرة
        var boxWidth = ld.width;
        var lOff = (typeof ld.leftOffset === "number") ? ld.leftOffset : 0;
        var rOff = (typeof ld.rightOffset === "number") ? ld.rightOffset : 0;
        var cOff = (typeof ld.centerOffset === "number") ? ld.centerOffset : 0;
        var lineCOffsets = (ld.cOffsets && ld.cOffsets.length > 0) ? ld.cOffsets.slice(0) : [];
        var lineWOffsets = (ld.wOffsets && ld.wOffsets.length > 0) ? ld.wOffsets.slice(0) : [];
        var hasLeadingIndent = /^\s+/.test(ld.text);

        var scaleLineOffsetsToWidth = function (oldW, newW) {
            if (oldW > 0 && newW > 0 && Math.abs(newW - oldW) > 0.1) {
                var ratio = newW / oldW;
                if (lineCOffsets.length > 0) {
                    for (var ci = 0; ci < lineCOffsets.length; ci++) {
                        lineCOffsets[ci] = Math.round((lineCOffsets[ci] * ratio) * 10) / 10;
                    }
                    lineCOffsets[lineCOffsets.length - 1] = Math.round(newW * 10) / 10;
                }
                if (lineWOffsets.length > 0) {
                    for (var wi = 0; wi < lineWOffsets.length; wi++) {
                        lineWOffsets[wi] = Math.round((lineWOffsets[wi] * ratio) * 10) / 10;
                    }
                    lineWOffsets[lineWOffsets.length - 1] = Math.round(newW * 10) / 10;
                }
            }
        };

        if (data.fullWidth === true || data.boxWidthMode === "full") {
            // Full Block Width mode: every box spans 100% full paragraph width / layout width
            var prevWFull = boxWidth;
            boxWidth = (typeof scan.justifiedWidth === "number" && scan.justifiedWidth > 0) ? scan.justifiedWidth : scan.fullW;
            scaleLineOffsetsToWidth(prevWFull, boxWidth);
            lOff = 0;
            rOff = 0;
        } else if (!isCenter) {
            // الحد الأقصى لامتصاص فرق البداية في الأسطر غير البادئة بمسافات:
            // في الأسطر الوسيطة الملتفة داخل Area Text، ندمج rOff (أو lOff) ضمن عرض الصندوق ليظل الطرف الأيمن
            // مصطفاً كالمسطرة عند هامش الحاوية بينما يصل الطرف الأيسر إلى الحافة الفعلية لآخر كلمة ("آخرين") دون قطع
            var maxFlushAbsorb = (!hasLeadingIndent)
                ? Math.max(12.0, (scan.fontSize || 40) * 0.95)
                : 4.0;

            if (scan.isJustified) {
                // في النصوص المضبوطة: نعتمد عرض التخطيط للأسطر الممتدة
                if (scan.isJustifyFullAll || !ld.isLastOfPara) {
                    var prevWJust = boxWidth;
                    lOff = 0;
                    rOff = 0;
                    boxWidth = (typeof scan.justifiedWidth === "number" && scan.justifiedWidth > 0) ? scan.justifiedWidth : scan.fullW;
                    scaleLineOffsetsToWidth(prevWJust, boxWidth);
                } else if (scan.justifyType === "right" || rtl_k) {
                    if (rOff > 0 && rOff <= maxFlushAbsorb) {
                        var prevWR = boxWidth;
                        boxWidth = Math.round((boxWidth + rOff) * 10) / 10;
                        scaleLineOffsetsToWidth(prevWR, boxWidth);
                        rOff = 0;
                    }
                } else if (scan.justifyType === "center") {
                    // center
                } else {
                    if (lOff > 0 && lOff <= maxFlushAbsorb) {
                        var prevWL = boxWidth;
                        boxWidth = Math.round((boxWidth + lOff) * 10) / 10;
                        scaleLineOffsetsToWidth(prevWL, boxWidth);
                        lOff = 0;
                    }
                }
            } else if (rtl_k) {
                // RTL (Arabic): في الأسطر غير البادئة بمسافات، نقفل اليمين 100% كالمسطرة (rOff = 0) وندمج أي فرق ضمن العرض
                if (!hasLeadingIndent) {
                    if (rOff > 0) {
                        var prevWR2 = boxWidth;
                        boxWidth = Math.round((boxWidth + rOff) * 10) / 10;
                        scaleLineOffsetsToWidth(prevWR2, boxWidth);
                    }
                    rOff = 0;
                } else if (rOff > 0 && rOff <= maxFlushAbsorb) {
                    var prevWR2 = boxWidth;
                    boxWidth = Math.round((boxWidth + rOff) * 10) / 10;
                    scaleLineOffsetsToWidth(prevWR2, boxWidth);
                    rOff = 0;
                }
            } else {
                // LTR (Latin): في الأسطر غير البادئة بمسافات، نقفل اليسار 100% كالمسطرة (lOff = 0) وندمج أي فرق ضمن العرض
                if (!hasLeadingIndent) {
                    if (lOff > 0) {
                        var prevWL2 = boxWidth;
                        boxWidth = Math.round((boxWidth + lOff) * 10) / 10;
                        scaleLineOffsetsToWidth(prevWL2, boxWidth);
                    }
                    lOff = 0;
                } else if (lOff > 0 && lOff <= maxFlushAbsorb) {
                    var prevWL2 = boxWidth;
                    boxWidth = Math.round((boxWidth + lOff) * 10) / 10;
                    scaleLineOffsetsToWidth(prevWL2, boxWidth);
                    lOff = 0;
                }
            }
        }

        var sIdx = (typeof ld.slotIndex === "number") ? ld.slotIndex : kIdx;
        var tSlots = (typeof scan.totalSlots === "number") ? scan.totalSlots : scan.numLines;
        return {
            boxIndex: kIdx,
            lineIndex: kIdx,
            slotIndex: sIdx,
            totalSlots: tSlots,
            text: ld.text,
            width: boxWidth,
            height: ld.height,
            lineH: ld.height,
            lineTop: ld.top,
            charStart: cStart,
            charEnd: cEnd,
            totalChars: scan.fullText.length,
            isWord: false,
            wordOffset: 0,
            rightOffset: rOff,
            leftOffset: lOff,
            centerOffset: cOff,
            lineWidth: boxWidth,
            rtl_k: rtl_k,
            name: textLayer.name + " - [Line " + (kIdx + 1) + "]",
            cOffsets: lineCOffsets,
            wOffsets: lineWOffsets,
            wordStart: (typeof ld.wordStart === "number") ? ld.wordStart : 0,
            wordEnd: (typeof ld.wordEnd === "number") ? ld.wordEnd : 0
        };
    };

    if (mode === "lines") {
        for (var k = 0; k < scan.numLines; k++) {
            boxesData.push(buildLineBoxEntry(k));
        }
    } else {
        // نمط الكلمات المفتاحية (Tagged Words) أو كاريوكي كل الكلمات (Words Mode)
        var tempWord = null;
        try {
            var srcPropWord = textLayer.property("Source Text");
            tempWord = textLayer.duplicate();
            tempWord.name = $._smartHighlighter.SCAN_TEMP_WORDS;
            tempWord.enabled = true;
            tempWord.guideLayer = true;

            var applySafeWordBox = function (docObj) {
                if (!docObj || !docObj.boxText) return;
                var candidates = [[8000, 8000], [6000, 6000], [4096, 4096], [100000, 100000]];
                for (var ci = 0; ci < candidates.length; ci++) {
                    try {
                        docObj.boxTextSize = candidates[ci];
                        return;
                    } catch (eLim) {}
                }
            };

            var setTempWordText = function (str) {
                try {
                    var wd = srcPropWord.value;
                    if (wd && wd.boxText) {
                        applySafeWordBox(wd);
                    }
                    wd.text = str;
                    tempWord.property("Source Text").setValue(wd);
                } catch (eWd) {
                    try {
                        var wdFb = tempWord.property("Source Text").value;
                        if (wdFb && wdFb.boxText) applySafeWordBox(wdFb);
                        wdFb.text = str;
                        tempWord.property("Source Text").setValue(wdFb);
                    } catch (eWd2) {}
                }
            };

            var alefW = (scan && typeof scan.alefAnchorW === "number" && scan.alefAnchorW > 0) ? scan.alefAnchorW : 0;
            if (alefW <= 0) {
                setTempWordText("ا");
                alefW = Math.max(1, tempWord.sourceRectAtTime(comp.time, false).width);
            }

            var measureWordSpan = function (str, anchorLeadingDigitsRTL) {
                if (!str || str.length === 0) return { width: 0, height: 0 };
                if (anchorLeadingDigitsRTL && /^[0-9\s.,:;!?\-\(\)\[\]+%$]+/.test(str)) {
                    setTempWordText("ا" + str);
                    var rA = tempWord.sourceRectAtTime(comp.time, false);
                    return { width: Math.max(0, rA.width - alefW), height: rA.height };
                }
                setTempWordText(str);
                var rN = tempWord.sourceRectAtTime(comp.time, false);
                return { width: rN.width, height: rN.height };
            };

            for (var lIdx = 0; lIdx < scan.numLines; lIdx++) {
                var lineObj = scan.linesData[lIdx];
                var lText = lineObj.text;
                var rtl_line = (data.direction === "rtl") ? true : ((data.direction === "ltr") ? false : (scan.isJustified ? (scan.justifyType === "right" ? true : (scan.justifyType === "left" ? false : $._smartHighlighter.lineIsRTL(lText, fallbackRTL))) : $._smartHighlighter.lineIsRTL(lText, fallbackRTL)));

                // حساب فرق تمدد المسافات الفعلي للسطر داخل الفقرة (World-Ready / Paragraph Composer Delta)
                var lineRawW = (typeof lineObj.rawWidth === "number" && lineObj.rawWidth > 0) ? lineObj.rawWidth : lineObj.width;
                var extraLineW = lineObj.width - lineRawW;
                var totalSpacesInLine = (lText.match(/\s+/g) || []).length;
                var deltaPerSpace = (totalSpacesInLine > 0 && Math.abs(extraLineW) > 0.2) ? (extraLineW / totalSpacesInLine) : 0;

                var wordsToFind = [];
                if (mode === "tagged") {
                    var lStart = (typeof lineObj.charStart === "number") ? lineObj.charStart : 0;
                    var lEnd = (typeof lineObj.charEnd === "number") ? lineObj.charEnd : (lStart + lText.length);
                    for (var tg = 0; tg < tags.length; tg++) {
                        var tagObj = tags[tg];
                        var overlapStart = Math.max(tagObj.cleanStart, lStart);
                        var overlapEnd = Math.min(tagObj.cleanEnd, lEnd);
                        if (overlapStart < overlapEnd) {
                            var localStart = overlapStart - lStart;
                            var localEnd = overlapEnd - lStart;
                            if (localStart < lText.length && localEnd <= lText.length) {
                                var subPhrase = lText.substring(localStart, localEnd);
                                var leadWs = subPhrase.match(/^\s*/)[0].length;
                                var trailWs = subPhrase.match(/\s*$/)[0].length;
                                if (leadWs + trailWs < subPhrase.length) {
                                    localStart += leadWs;
                                    localEnd -= trailWs;
                                    subPhrase = subPhrase.substring(leadWs, subPhrase.length - trailWs);
                                    wordsToFind.push({
                                        phrase: subPhrase,
                                        charIdx: localStart,
                                        tagIndex: tg
                                    });
                                }
                            }
                        }
                    }
                    wordsToFind.sort(function (a, b) { return a.charIdx - b.charIdx; });
                } else if (mode === "words") {
                    var matchedWords = lText.match(/\S+/g) || [];
                    var searchCursor = 0;
                    for (var mw = 0; mw < matchedWords.length; mw++) {
                        var wToken = matchedWords[mw];
                        var foundC = lText.indexOf(wToken, searchCursor);
                        if (foundC !== -1) {
                            wordsToFind.push({ phrase: wToken, charIdx: foundC });
                            searchCursor = foundC + wToken.length;
                        }
                    }
                }

                for (var wIdx = 0; wIdx < wordsToFind.length; wIdx++) {
                    var item = wordsToFind[wIdx];
                    var prefixBefore = (item.charIdx > 0) ? lText.substring(0, item.charIdx) : "";
                    var prefixUpTo = lText.substring(0, item.charIdx + item.phrase.length);
                    var suffixFrom = lText.substring(item.charIdx);

                    var wLocalStart = item.charIdx;
                    var wLocalEnd = item.charIdx + item.phrase.length;
                    var hasCOffsets = (lineObj.cOffsets && lineObj.cOffsets.length >= lText.length && wLocalEnd <= lineObj.cOffsets.length);
                    var wOffset = 0;
                    var finalWordW = 10;
                    var finalWordH = lineObj.height;
                    var wordCOffsets = [];

                    if (hasCOffsets) {
                        var spanEndW = lineObj.cOffsets[wLocalEnd - 1];
                        var spanStartW = (wLocalStart > 0) ? lineObj.cOffsets[wLocalStart - 1] : 0;
                        finalWordW = Math.max(1, Math.round((spanEndW - spanStartW) * 10) / 10);
                        wOffset = Math.max(0, Math.round(spanStartW * 10) / 10);
                        if (wOffset + finalWordW > lineObj.width + 1) {
                            wOffset = Math.max(0, Math.round((lineObj.width - finalWordW) * 10) / 10);
                        }
                        for (var pwc = 0; pwc < item.phrase.length; pwc++) {
                            var cVal = lineObj.cOffsets[wLocalStart + pwc] - spanStartW;
                            wordCOffsets.push(Math.round(Math.max(0, cVal) * 10) / 10);
                        }
                    } else {
                        var rUpTo = measureWordSpan(prefixUpTo, rtl_line);
                        var rWord = measureWordSpan(item.phrase, false);

                        var offsetFromPrefix = (item.charIdx <= 0) ? 0 : Math.max(0, rUpTo.width - rWord.width);
                        var rawWOffset = offsetFromPrefix;

                        // إذا كانت البادئة تحتوي على أرقام لاتينية (مثل "53" أو "200") بينما اللاحقة عربية خالصة،
                        // نستخدم القياس التفاضلي العكسي من نهاية السطر (Suffix Triangulation) لتحييد أي قفزة BiDi للأرقام!
                        if (rtl_line && item.charIdx > 0 && /[0-9]/.test(prefixBefore) && !/[0-9]/.test(suffixFrom)) {
                            var rSuffix = measureWordSpan(suffixFrom, false);
                            if (rSuffix.width >= rWord.width && lineRawW >= rSuffix.width) {
                                rawWOffset = Math.max(0, lineRawW - rSuffix.width);
                            }
                        }

                        var spacesBeforeWord = (item.charIdx > 0) ? (prefixBefore.match(/\s+/g) || []).length : 0;
                        var spacesInsideWord = (item.phrase.match(/\s+/g) || []).length;
                        wOffset = Math.max(0, Math.round((rawWOffset + spacesBeforeWord * deltaPerSpace) * 10) / 10);
                        finalWordW = Math.max(1, Math.round((rWord.width + spacesInsideWord * deltaPerSpace) * 10) / 10);
                        if (wOffset + finalWordW > lineObj.width + 1) {
                            wOffset = Math.max(0, Math.round((lineObj.width - finalWordW) * 10) / 10);
                        }
                        finalWordH = Math.max(rWord.height, lineObj.height * 0.9);

                        // قياس العروض التراكمية الدقيقة للكلمة (Exact cumulative character offsets for word)
                        var pText = item.phrase;
                        var prevWordOffW = 0;
                        var fontSpaceW = scan.fontSpaceW || 5;
                        for (var pwc = 1; pwc <= pText.length; pwc++) {
                            setTempWordText(pText.substring(0, pwc));
                            var rPWSub = tempWord.sourceRectAtTime(comp.time, false);
                            var curPWSubW = rPWSub.width;
                            if (/\s/.test(pText.charAt(pwc - 1)) && curPWSubW <= prevWordOffW) {
                                curPWSubW = prevWordOffW + fontSpaceW;
                            } else {
                                curPWSubW = Math.max(prevWordOffW, curPWSubW);
                            }
                            wordCOffsets.push(Math.round(curPWSubW * 10) / 10);
                            prevWordOffW = curPWSubW;
                        }
                        if (finalWordW > 0 && wordCOffsets.length > 0 && prevWordOffW > 0 && Math.abs(finalWordW - prevWordOffW) > 0.5) {
                            var wScaleRatio = finalWordW / prevWordOffW;
                            for (var wcIdx = 0; wcIdx < wordCOffsets.length; wcIdx++) {
                                wordCOffsets[wcIdx] = Math.round((wordCOffsets[wcIdx] * wScaleRatio) * 10) / 10;
                            }
                            wordCOffsets[wordCOffsets.length - 1] = Math.round(finalWordW * 10) / 10;
                        }
                    }

                    var wordCharStart = (typeof lineObj.charStart === "number") ? (lineObj.charStart + item.charIdx) : item.charIdx;
                    var wordCharEnd = wordCharStart + item.phrase.length;

                    var wordSlotIdx = (typeof lineObj.slotIndex === "number") ? lineObj.slotIndex : lIdx;
                    var tSlotsWord = (typeof scan.totalSlots === "number") ? scan.totalSlots : scan.numLines;
                    boxesData.push({
                        boxIndex: boxesData.length,
                        lineIndex: lIdx,
                        slotIndex: wordSlotIdx,
                        totalSlots: tSlotsWord,
                        text: item.phrase,
                        width: finalWordW,
                        height: finalWordH,
                        lineH: lineObj.height,
                        lineTop: lineObj.top,
                        charStart: wordCharStart,
                        charEnd: wordCharEnd,
                        totalChars: scan.fullText.length,
                        isWord: true,
                        wordOffset: wOffset,
                        rightOffset: (typeof lineObj.rightOffset === "number") ? lineObj.rightOffset : 0,
                        leftOffset: (typeof lineObj.leftOffset === "number") ? lineObj.leftOffset : 0,
                        centerOffset: (typeof lineObj.centerOffset === "number") ? lineObj.centerOffset : 0,
                        lineWidth: lineObj.width,
                        rtl_k: rtl_line,
                        line_rtl: rtl_line,
                        name: textLayer.name + " - [Word " + (boxesData.length + 1) + ": " + item.phrase + "]",
                        cOffsets: wordCOffsets
                    });
                }
            }
        } catch (eW) {
            $._smartHighlighter.log("scanTargetBoxes words error: " + eW.toString());
        } finally {
            if (tempWord) {
                try { tempWord.remove(); } catch (eR) { if ($._smartHighlighter && $._smartHighlighter.logError) $._smartHighlighter.logError("TagManager.jsx:456", eR); }
                tempWord = null;
            }
            for (var cl = comp.numLayers; cl >= 1; cl--) {
                try {
                    var chLayer = comp.layer(cl);
                    if (chLayer && chLayer !== textLayer && chLayer.name === $._smartHighlighter.SCAN_TEMP_WORDS) {
                        chLayer.remove();
                    }
                } catch (eCl) {}
            }
        }
    }

    // إذا لم يتم العثور على أي كلمات في نمط tagged، نتراجع تلقائياً لنمط الأسطر
    if (boxesData.length === 0) {
        mode = "lines";
        for (var k2 = 0; k2 < scan.numLines; k2++) {
            boxesData.push(buildLineBoxEntry(k2));
        }
    }

    $._smartHighlighter.log("scanTargetBoxes: mode=" + mode + ", totalBoxes=" + boxesData.length);

    return {
        scan: scan,
        boxesData: boxesData,
        mode: mode,
        cleanText: cleanText,
        hasTags: (tags.length > 0),
        isCenter: isCenter,
        fallbackRTL: fallbackRTL
    };
};

/**
 * [DEPRECATED] tagSelection is retired in favor of non-destructive buildPhraseHighlights.
 */
$._smartHighlighter.tagSelection = function (phrase) {
    return "DEPRECATED: Use interactive Phrase Highlight tab";
};

/**
 * ============================================================
 * PHRASE HIGHLIGHT ENGINE (NON-DESTRUCTIVE & ZERO-BRACKETS)
 * ============================================================
 * Builds precise highlight containers for selected phrases directly
 * from character indices without modifying the text layer Source Text.
 * Automatically slices phrases that cross line boundaries into coordinated
 * sub-boxes, and locks in step with Typewriter animation via cOffsets.
 */
$._smartHighlighter.buildPhraseHighlights = function (jsonPayloadStr) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "ERROR: Please select an active composition";
        }
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) {
            return "ERROR: Please select a Text Layer";
        }
        var textLayer = layers[0];
        if (!(textLayer instanceof TextLayer)) {
            if (textLayer.parent && (textLayer.parent instanceof TextLayer)) {
                textLayer = textLayer.parent;
            } else if (textLayer.comment && textLayer.comment.indexOf("PARENT:") !== -1) {
                var pName = textLayer.comment.replace("PARENT:", "").replace(/^\s+|\s+$/g, "");
                try { textLayer = comp.layer(pName); } catch (eP1) {}
            } else if (textLayer.comment && textLayer.comment.indexOf("parent:") !== -1) {
                var mPar = textLayer.comment.match(/parent:([^\|]+)/);
                if (mPar && mPar[1]) {
                    try { textLayer = comp.layer(mPar[1]); } catch (eP2) {}
                }
            }
        }
        if (!textLayer || !(textLayer instanceof TextLayer)) {
            return "ERROR: Please select a Text Layer";
        }

        var data = $._smartHighlighter.parseJSON(jsonPayloadStr);
        if (!data) return "ERROR: Invalid JSON payload";

        var textLayerIndex = textLayer.index;
        var textLayerName = textLayer.name;
        var phraseTag = "SMART_HL_PHRASE";

        // If explicitly requested to clear all phrases when empty array is passed with clearAll flag
        if (!data.phrases || data.phrases.length === 0) {
            if (data.clearAll === true) {
                return $._smartHighlighter.clearPhraseHighlights();
            }
            return "ERROR: Please select at least one word or phrase";
        }

        // Read source text non-destructively (Source Text is NEVER touched)
        var rawText = "";
        try {
            rawText = textLayer.property("Source Text").value.text;
        } catch (eTxt) {
            return "ERROR: Cannot read text from layer";
        }

        var scan = $._smartHighlighter.scanParagraph(textLayer, comp, rawText);
        if (!scan || !scan.linesData || scan.linesData.length === 0) {
            return "ERROR: Text layer is empty or cannot be measured";
        }

        // Resolve justification & fallback reading direction
        var docDirCounts = $._smartHighlighter.countDir ? $._smartHighlighter.countDir(scan.fullText) : { rtl: 0, ltr: 0 };
        var fallbackRTL = (docDirCounts.rtl > docDirCounts.ltr);
        var isCenter = false;
        if (data.direction === "center") {
            isCenter = true;
        } else if (data.direction === "rtl") {
            fallbackRTL = true;
        } else if (data.direction === "ltr") {
            fallbackRTL = false;
        } else {
            if (scan.isJustified) {
                if (scan.justifyType === "right") fallbackRTL = true;
                else if (scan.justifyType === "center") isCenter = true;
                else if (scan.justifyType === "left") fallbackRTL = false;
            } else {
                var pj = $._smartHighlighter.detectJustification(scan.justification);
                if (pj === "center") isCenter = true;
                else if (pj === "rtl") fallbackRTL = true;
                else if (pj === "ltr") fallbackRTL = false;
            }
        }

        // Create temporary text layer for subpixel phrase measurements
        var tempWord = null;
        var boxesData = [];
        try {
            var srcPropPhrase = textLayer.property("Source Text");
            tempWord = textLayer.duplicate();
            tempWord.name = $._smartHighlighter.SCAN_TEMP_WORDS;
            tempWord.enabled = true;
            tempWord.guideLayer = true;

            // Remove any text animators on tempWord so sourceRectAtTime always measures 100% un-animated glyphs
            try {
                var twAnimators = tempWord.property("ADBE Text Properties").property("ADBE Text Animators");
                if (twAnimators && twAnimators.numProperties > 0) {
                    for (var tai = twAnimators.numProperties; tai >= 1; tai--) {
                        try { twAnimators.property(tai).remove(); } catch (eRmTa) { if ($._smartHighlighter && $._smartHighlighter.logError) $._smartHighlighter.logError("TagManager.jsx:601", eRmTa); }
                    }
                }
            } catch (eTwAnim) {}

            var applySafePhraseBox = function (docObj) {
                if (!docObj || !docObj.boxText) return;
                var candidates = [[8000, 8000], [6000, 6000], [4096, 4096], [100000, 100000]];
                for (var ci = 0; ci < candidates.length; ci++) {
                    try {
                        docObj.boxTextSize = candidates[ci];
                        return;
                    } catch (eLim) {}
                }
            };

            var origPhraseBoxSize = null;
            try {
                var initPtwDoc = srcPropPhrase.value;
                if (initPtwDoc && initPtwDoc.boxText && initPtwDoc.boxTextSize) {
                    origPhraseBoxSize = [initPtwDoc.boxTextSize[0], initPtwDoc.boxTextSize[1]];
                }
            } catch (eOrigPtw) {}

            var useExpandedPhraseBox = true;
            var setTempWordText = function (str) {
                try {
                    var wd = srcPropPhrase.value;
                    if (wd && wd.boxText) {
                        if (useExpandedPhraseBox) {
                            applySafePhraseBox(wd);
                        } else if (origPhraseBoxSize !== null) {
                            try { wd.boxTextSize = [origPhraseBoxSize[0], origPhraseBoxSize[1]]; } catch (eOB) {}
                        }
                    }
                    wd.text = str;
                    tempWord.property("Source Text").setValue(wd);
                } catch (eWd) {
                    try {
                        var wdFb = tempWord.property("Source Text").value;
                        if (useExpandedPhraseBox && wdFb && wdFb.boxText) applySafePhraseBox(wdFb);
                        wdFb.text = str;
                        tempWord.property("Source Text").setValue(wdFb);
                    } catch (eWd2) {}
                }
            };

            var phrAlefW = (scan && typeof scan.alefAnchorW === "number" && scan.alefAnchorW > 0) ? scan.alefAnchorW : 0;
            if (phrAlefW <= 0) {
                setTempWordText("ا");
                phrAlefW = Math.max(1, tempWord.sourceRectAtTime(comp.time, false).width);
            }

            var measurePhraseSpan = function (str, anchorLeadingDigitsRTL) {
                if (!str || str.length === 0) return { width: 0, height: 0 };
                if (anchorLeadingDigitsRTL && /^[0-9\s.,:;!?\-\(\)\[\]+%$]+/.test(str)) {
                    setTempWordText("ا" + str);
                    var rA = tempWord.sourceRectAtTime(comp.time, false);
                    return { width: Math.max(0, rA.width - phrAlefW), height: rA.height };
                }
                setTempWordText(str);
                var rN = tempWord.sourceRectAtTime(comp.time, false);
                return { width: rN.width, height: rN.height };
            };

            for (var pIdx = 0; pIdx < data.phrases.length; pIdx++) {
                var phr = data.phrases[pIdx];
                var pStart = (typeof phr.charStart === "number") ? phr.charStart : 0;
                var pEnd = (typeof phr.charEnd === "number") ? phr.charEnd : (pStart + (phr.text || "").length);
                var pId = phr.id || ("phr_" + (new Date().getTime()) + "_" + pIdx + "_" + Math.floor(Math.random() * 1000));
                var pColHex = phr.colorHex || data.colorHex;
                if (!pColHex) {
                    var cArr = phr.color || data.color;
                    pColHex = (cArr && $._smartHighlighter.rgbToHex) ? $._smartHighlighter.rgbToHex(cArr) : "#2ECC71";
                }

                for (var lIdx = 0; lIdx < scan.numLines; lIdx++) {
                    var lineObj = scan.linesData[lIdx];
                    var lText = lineObj.text;
                    var lStart = (typeof lineObj.charStart === "number") ? lineObj.charStart : 0;
                    var lEnd = (typeof lineObj.charEnd === "number") ? lineObj.charEnd : (lStart + lText.length);

                    var overlapStart = Math.max(pStart, lStart);
                    var overlapEnd = Math.min(pEnd, lEnd);

                    if (overlapStart < overlapEnd) {
                        var localStart = overlapStart - lStart;
                        var localEnd = overlapEnd - lStart;
                        if (localStart < lText.length && localEnd <= lText.length) {
                            var subPhrase = lText.substring(localStart, localEnd);
                            var leadMatch = subPhrase.match(/^\s*/);
                            var trailMatch = subPhrase.match(/\s*$/);
                            var leadWs = leadMatch ? leadMatch[0].length : 0;
                            var trailWs = trailMatch ? trailMatch[0].length : 0;

                            if (leadWs + trailWs < subPhrase.length) {
                                localStart += leadWs;
                                localEnd -= trailWs;
                                subPhrase = subPhrase.substring(leadWs, subPhrase.length - trailWs);

                                // Determine true reading direction of the line first
                                var rtl_line = (data.direction === "rtl") ? true : ((data.direction === "ltr") ? false : (scan.isJustified ? (scan.justifyType === "right" ? true : (scan.justifyType === "left" ? false : $._smartHighlighter.lineIsRTL(lText, fallbackRTL))) : $._smartHighlighter.lineIsRTL(lText, fallbackRTL)));

                                // Compute exact word-spacing expansion delta from Area Text Paragraph Composer
                                var phrLineRawW = (typeof lineObj.rawWidth === "number" && lineObj.rawWidth > 0) ? lineObj.rawWidth : lineObj.width;
                                var extraLineW = lineObj.width - phrLineRawW;
                                var totalSpacesInLine = (lText.match(/\s+/g) || []).length;
                                var deltaPerSpace = (totalSpacesInLine > 0 && Math.abs(extraLineW) > 0.2) ? (extraLineW / totalSpacesInLine) : 0;

                                var prefixBefore = (localStart > 0) ? lText.substring(0, localStart) : "";
                                var hasLineCOffsets = (lineObj.cOffsets && lineObj.cOffsets.length >= lText.length && localEnd <= lineObj.cOffsets.length);
                                var wOffset = 0;
                                var finalW = 10;
                                var finalH = lineObj.height;
                                var wordCOffsets = [];

                                if (hasLineCOffsets) {
                                    var spanEndW = lineObj.cOffsets[localEnd - 1];
                                    var spanStartW = (localStart > 0) ? lineObj.cOffsets[localStart - 1] : 0;
                                    finalW = Math.max(1, Math.round((spanEndW - spanStartW) * 10) / 10);
                                    wOffset = Math.max(0, Math.round(spanStartW * 10) / 10);
                                    if (wOffset + finalW > lineObj.width + 1) {
                                        wOffset = Math.max(0, Math.round((lineObj.width - finalW) * 10) / 10);
                                    }
                                    for (var pwc = 0; pwc < subPhrase.length; pwc++) {
                                        var cVal = lineObj.cOffsets[localStart + pwc] - spanStartW;
                                        wordCOffsets.push(Math.round(Math.max(0, cVal) * 10) / 10);
                                    }
                                } else {
                                    var prefixUpTo = lText.substring(0, localStart + subPhrase.length);
                                    var suffixFrom = lText.substring(localStart);

                                    var rUpTo = measurePhraseSpan(prefixUpTo, rtl_line);
                                    var rWord = measurePhraseSpan(subPhrase, false);

                                    var rawWOffset = (localStart <= 0) ? 0 : Math.max(0, rUpTo.width - rWord.width);

                                    if (rtl_line && localStart > 0 && /[0-9]/.test(prefixBefore) && !/[0-9]/.test(suffixFrom)) {
                                        var rSuffix = measurePhraseSpan(suffixFrom, false);
                                        if (rSuffix.width >= rWord.width && phrLineRawW >= rSuffix.width) {
                                            rawWOffset = Math.max(0, phrLineRawW - rSuffix.width);
                                        }
                                    }

                                    var spacesBeforePhrase = (localStart > 0) ? (prefixBefore.match(/\s+/g) || []).length : 0;
                                    var spacesInsidePhrase = (subPhrase.match(/\s+/g) || []).length;

                                    wOffset = Math.max(0, Math.round((rawWOffset + spacesBeforePhrase * deltaPerSpace) * 10) / 10);
                                    finalW = Math.max(1, Math.round((rWord.width + spacesInsidePhrase * deltaPerSpace) * 10) / 10);
                                    if (wOffset + finalW > lineObj.width + 1) {
                                        wOffset = Math.max(0, Math.round((lineObj.width - finalW) * 10) / 10);
                                    }
                                    finalH = Math.max(rWord.height, wordHasArabic ? (lineObj.height * 0.98) : (lineObj.height * 0.92));

                                    var prevWordOffW = 0;
                                    var fontSpaceW = scan.fontSpaceW || 5;
                                    for (var pwc = 1; pwc <= subPhrase.length; pwc++) {
                                        setTempWordText(subPhrase.substring(0, pwc));
                                        var rPWSub = tempWord.sourceRectAtTime(comp.time, false);
                                        var curPWSubW = rPWSub.width;
                                        if (/\s/.test(subPhrase.charAt(pwc - 1)) && curPWSubW <= prevWordOffW) {
                                            curPWSubW = prevWordOffW + (fontSpaceW + deltaPerSpace);
                                        } else {
                                            curPWSubW = Math.max(prevWordOffW, curPWSubW);
                                        }
                                        wordCOffsets.push(Math.round(curPWSubW * 10) / 10);
                                        prevWordOffW = curPWSubW;
                                    }
                                    if (finalW > 0 && wordCOffsets.length > 0 && prevWordOffW > 0 && Math.abs(finalW - prevWordOffW) > 0.5) {
                                        var phrScaleRatio = finalW / prevWordOffW;
                                        for (var pwcIdx = 0; pwcIdx < wordCOffsets.length; pwcIdx++) {
                                            wordCOffsets[pwcIdx] = Math.round((wordCOffsets[pwcIdx] * phrScaleRatio) * 10) / 10;
                                        }
                                        wordCOffsets[wordCOffsets.length - 1] = Math.round(finalW * 10) / 10;
                                    }
                                }

                                // Reading direction rtl_line already resolved above
                                var wordHasArabic = $._smartHighlighter.hasArabic(subPhrase);
                                var isPureNumericOrLatin = /^[0-9\s.,:;!?\-\(\)\[\]+%$]+$/.test(subPhrase) || /^[A-Za-z0-9\s.,:;!?\-\(\)\[\]+%$]+$/.test(subPhrase);
                                var box_rtl = (data.direction === "rtl") ? true : ((data.direction === "ltr") ? false : (wordHasArabic ? true : (isPureNumericOrLatin ? false : rtl_line)));

                                var phrSlotIdx = (typeof lineObj.slotIndex === "number") ? lineObj.slotIndex : lIdx;
                                var phrTotalSlots = (typeof scan.totalSlots === "number") ? scan.totalSlots : scan.numLines;
                                var numWordsInSubPhrase = (subPhrase.match(/\S+/g) || []).length || 1;
                                var textBeforePhrase = lText.substring(0, localStart);
                                var wordsBeforePhrase = (textBeforePhrase.match(/\S+/g) || []).length;
                                var phrWordStart = ((typeof lineObj.wordStart === "number") ? lineObj.wordStart : 0) + wordsBeforePhrase;
                                var phrWordEnd = phrWordStart + numWordsInSubPhrase;
                                boxesData.push({
                                    boxIndex: boxesData.length,
                                    lineIndex: lIdx,
                                    slotIndex: phrSlotIdx,
                                    totalSlots: phrTotalSlots,
                                    text: subPhrase,
                                    phraseText: phr.text || subPhrase,
                                    phraseId: pId,
                                    phraseColorHex: pColHex,
                                    width: finalW,
                                    height: finalH,
                                    lineH: lineObj.height,
                                    lineTop: lineObj.top,
                                    charStart: lStart + localStart,
                                    charEnd: lStart + localEnd,
                                    wordStart: phrWordStart,
                                    wordEnd: phrWordEnd,
                                    totalChars: scan.fullText.length,
                                    isWord: true,
                                    wordOffset: wOffset,
                                    rightOffset: (typeof lineObj.rightOffset === "number") ? lineObj.rightOffset : 0,
                                    leftOffset: (typeof lineObj.leftOffset === "number") ? lineObj.leftOffset : 0,
                                    centerOffset: (typeof lineObj.centerOffset === "number") ? lineObj.centerOffset : 0,
                                    lineWidth: lineObj.width,
                                    rtl_k: box_rtl,
                                    line_rtl: rtl_line,
                                    name: '[HL-Phrase] "' + (subPhrase.length > 18 ? subPhrase.substring(0, 16) + '...' : subPhrase) + '"',
                                    cOffsets: wordCOffsets,
                                    color: phr.color || data.color,
                                    style: phr.style || data.style || "box",
                                    paddingX: (typeof phr.paddingX === "number") ? phr.paddingX : ((typeof data.paddingX === "number") ? data.paddingX : 10),
                                    paddingY: (typeof phr.paddingY === "number") ? phr.paddingY : ((typeof data.paddingY === "number") ? data.paddingY : 4),
                                    motion: phr.motion || data.motion || "typewriter",
                                    outro: (typeof phr.outro === "boolean") ? phr.outro : (data.outro === true),
                                    holdTime: (typeof phr.holdTime === "number") ? phr.holdTime : ((typeof data.holdTime === "number") ? data.holdTime : 1.2),
                                    sequential: (typeof phr.sequential === "boolean") ? phr.sequential : (data.sequential === true)
                                });
                            }
                        }
                    }
                }
            }
        } catch (eScanPhr) {
            $._smartHighlighter.log("buildPhraseHighlights scan error: " + eScanPhr.toString());
        } finally {
            if (tempWord) {
                try { tempWord.remove(); } catch (eR) { if ($._smartHighlighter && $._smartHighlighter.logError) $._smartHighlighter.logError("TagManager.jsx:836", eR); }
                tempWord = null;
            }
            for (var cl = comp.numLayers; cl >= 1; cl--) {
                try {
                    var chLayer = comp.layer(cl);
                    if (chLayer && chLayer !== textLayer && chLayer.name === $._smartHighlighter.SCAN_TEMP_WORDS) {
                        chLayer.remove();
                    }
                } catch (eCl) {}
            }
        }

        if (boxesData.length === 0) {
            return "ERROR: No matching words could be measured in text";
        }

        // Build Shape Layers for phrase highlight boxes (Additive & Non-Destructive)
        app.beginUndoGroup("OpenBox: Apply Phrase Highlight");

        // Additive Workflow: Only remove existing phrase layers if they overlap with the newly applied character ranges (or if replaceAll is requested)
        for (var si = comp.numLayers; si >= 1; si--) {
            var lyr = comp.layer(si);
            if (!lyr || lyr.index === textLayerIndex) continue;
            var isParent = false;
            try {
                if (lyr.parent && (lyr.parent.index === textLayerIndex || lyr.parent.name === textLayerName || lyr.parent === textLayer)) {
                    isParent = true;
                }
            } catch (ePar) {}
            var cmt = lyr.comment || "";
            if (!isParent && cmt.indexOf("parent:" + textLayerName) !== -1) {
                isParent = true;
            }
            var isPhrase = (cmt.indexOf(phraseTag) !== -1) || (lyr.name && lyr.name.indexOf("[HL-Phrase]") !== -1);
            if (isParent && isPhrase) {
                if (data.replaceAll === true) {
                    try { lyr.remove(); } catch (eDelAll) { if ($._smartHighlighter && $._smartHighlighter.logError) $._smartHighlighter.logError("TagManager.jsx:873", eDelAll); }
                } else {
                    var csM = cmt.match(/cs:(\d+)/);
                    var ceM = cmt.match(/ce:(\d+)/);
                    var exCs = csM ? parseInt(csM[1], 10) : -1;
                    var exCe = ceM ? parseInt(ceM[1], 10) : -1;
                    var shouldReplace = false;
                    if (exCs >= 0 && exCe > exCs) {
                        for (var nb = 0; nb < boxesData.length; nb++) {
                            if (exCs < boxesData[nb].charEnd && exCe > boxesData[nb].charStart) {
                                shouldReplace = true;
                                break;
                            }
                        }
                    }
                    if (shouldReplace) {
                        try { lyr.remove(); } catch (eDelOverlap) { if ($._smartHighlighter && $._smartHighlighter.logError) $._smartHighlighter.logError("TagManager.jsx:889", eDelOverlap); }
                    }
                }
            }
        }

        var totalBoxes = boxesData.length;
        var totalTextChars = Math.max(1, scan.fullText.length || 1);
        var totalWords = (scan && typeof scan.numWords === "number" && scan.numWords > 0) ? scan.numWords : 1;
        var baseTotalH = scan.fullH;
        var baseTotalW = scan.fullW;
        var baseFullLeft = (typeof scan.fullLeft === "number") ? scan.fullLeft : 0;
        var baseFullTop = (typeof scan.fullTop === "number") ? scan.fullTop : 0;
        var baseFS = scan.fontSize;
        var totalLines = Math.max(1, scan.numLines || 1);
        var globalMotion = data.motion || "typewriter";

        // NON-DESTRUCTIVE PASSIVE SYNC: Inspect existing animator on textLayer WITHOUT modifying or deleting it!
        var activeAnimInfo = ($._smartHighlighter.inspectActiveTypewriter)
            ? $._smartHighlighter.inspectActiveTypewriter(textLayer)
            : $._smartHighlighter.detectTextAnimator(textLayer);

        var typeStartTime = (activeAnimInfo && activeAnimInfo.hasKeys) ? activeAnimInfo.startTime : comp.time;
        var typeTotalDur = (activeAnimInfo && activeAnimInfo.hasKeys && activeAnimInfo.endTime > activeAnimInfo.startTime)
            ? (activeAnimInfo.endTime - activeAnimInfo.startTime)
            : 1.2;
        var revealUnit = data.revealUnit || "chars";
        if (activeAnimInfo && activeAnimInfo.basedOnUnit === 3) {
            revealUnit = "words";
        } else if (activeAnimInfo && activeAnimInfo.basedOnUnit === 4) {
            revealUnit = "lines";
        }

        // Find the last layer belonging to textLayer so new phrase layers stack neatly in order
        var lastLayer = textLayer;
        var consolidatedPhraseLayer = null;
        for (var li = textLayer.index + 1; li <= comp.numLayers; li++) {
            var chkChild = comp.layer(li);
            if (!chkChild) continue;
            var belongsToText = false;
            try {
                if (chkChild.parent && (chkChild.parent === textLayer || chkChild.parent.index === textLayer.index)) {
                    belongsToText = true;
                }
            } catch (eChP) {}
            if (belongsToText && chkChild.comment && chkChild.comment.indexOf(phraseTag) !== -1) {
                lastLayer = chkChild;
            } else {
                break;
            }
        }

        // Group boxes by phraseId to support Master-Slave multi-line rigging
        var phraseGroups = {};
        for (var bg = 0; bg < totalBoxes; bg++) {
            var bItem = boxesData[bg];
            if (!phraseGroups[bItem.phraseId]) {
                phraseGroups[bItem.phraseId] = [];
            }
            phraseGroups[bItem.phraseId].push(bItem);
        }

        for (var pKey in phraseGroups) {
            if (!phraseGroups.hasOwnProperty(pKey)) continue;
            var grp = phraseGroups[pKey];
            var totalGrpChars = 0;
            for (var gi = 0; gi < grp.length; gi++) {
                totalGrpChars += Math.max(1, grp[gi].text.length);
            }
            var cumChars = 0;
            for (var gi = 0; gi < grp.length; gi++) {
                var gBox = grp[gi];
                gBox.isMultiLine = (grp.length > 1);
                gBox.phraseTotalBoxes = grp.length;
                gBox.phraseBoxIndex = gi;
                gBox.isMaster = (gi === 0);
                gBox.isSlave = (gi > 0);
                var curBoxLen = Math.max(1, gBox.text.length);
                gBox.fracStart = cumChars / totalGrpChars;
                cumChars += curBoxLen;
                gBox.fracEnd = cumChars / totalGrpChars;
                if (gi > 0) {
                    gBox.masterBox = grp[0];
                }
            }
        }

        for (var k = 0; k < totalBoxes; k++) {
            var box = boxesData[k];
            var isSlave = !!box.isSlave;
            var masterBox = box.masterBox || null;
            var masterLayerName = masterBox ? (masterBox.assignedLayerName || masterBox.name) : "";

            var safePhrText = "";
            try { safePhrText = escape(box.phraseText); } catch(eEsc) { safePhrText = encodeURIComponent(box.phraseText); }
            var roleTag = isSlave ? ("|role:slave|master:" + (masterLayerName ? escape(masterLayerName) : "")) : "|role:master";
            var phraseComment = phraseTag + "|id:" + box.phraseId + "|parent:" + textLayer.name + "|color:" + box.phraseColorHex + "|text:" + safePhrText + "|cs:" + box.charStart + "|ce:" + box.charEnd + roleTag;

            var hasOutro = !!box.outro;
            var holdTime = (typeof box.holdTime === "number" && box.holdTime > 0) ? box.holdTime : 1.2;
            var isSequential = !!box.sequential;
            var boxDelay = (isSequential && totalBoxes > 1 && !box.isMultiLine) ? (k * 0.22) : 0;
            var outDur = 0.26;

            var boxMotion = box.motion || globalMotion;
            var styleRecipe = $._smartHighlighter.recipes.getStyle(box.style || data.style || "box");
            var motionRecipe = $._smartHighlighter.recipes.getMotion(boxMotion || "wipe");

            var cStartPct = (box.charStart / totalTextChars) * 100;
            var cEndPct = (box.charEnd / totalTextChars) * 100;
            var wStartPct = ((typeof box.wordStart === "number" ? box.wordStart : 0) / totalWords) * 100;
            var wEndPct = ((typeof box.wordEnd === "number" ? box.wordEnd : 1) / totalWords) * 100;
            var lStartPct = ((typeof box.lineIndex === "number" ? box.lineIndex : 0) / totalLines) * 100;
            var lEndPct = (((typeof box.lineIndex === "number" ? box.lineIndex : 0) + 1) / totalLines) * 100;

            var ctx = {
                index: k,
                totalBoxes: totalBoxes,
                box: box,
                textLayer: textLayer,
                shapeLayer: null,
                comp: comp,
                data: data,
                style: styleRecipe,
                motion: motionRecipe,
                totalLines: totalLines,
                totalSlots: (typeof box.totalSlots === "number" && box.totalSlots > 0) ? box.totalSlots : ((scan && typeof scan.totalSlots === "number") ? scan.totalSlots : totalLines),
                slotIndex: (typeof box.slotIndex === "number") ? box.slotIndex : ((typeof box.lineIndex === "number") ? box.lineIndex : k),
                totalWords: totalWords,
                totalChars: totalTextChars,
                baseFS: baseFS,
                baseTotalH: baseTotalH,
                baseTotalW: baseTotalW,
                baseFullLeft: baseFullLeft,
                baseFullTop: baseFullTop,
                isCenter: isCenter,
                timing: {
                    revealUnit: revealUnit,
                    cStartPct: cStartPct,
                    cEndPct: cEndPct,
                    wStartPct: wStartPct,
                    wEndPct: wEndPct,
                    lStartPct: lStartPct,
                    lEndPct: lEndPct
                },
                boxOutroOrder: "first",
                textOutroOrder: "first",
                hasOutro: hasOutro
            };

            var rawCol = box.color;
            var boxColor = [0.18, 0.8, 0.44, 1.0];
            if (rawCol instanceof Array && rawCol.length >= 3) {
                boxColor = [rawCol[0], rawCol[1], rawCol[2], (rawCol.length >= 4 ? rawCol[3] : 1.0)];
            } else if (typeof rawCol === "string" && rawCol.charAt(0) === "#") {
                boxColor = $._smartHighlighter.hexToRgba(rawCol);
            }

            // Compute timing window for this phrase box (respecting Parallel mode if active on textLayer)
            var lineNum = ((typeof box.lineIndex === "number") ? box.lineIndex : 0) + 1;
            var lineInfo = scan.linesData[box.lineIndex || 0] || {};
            var bStart, bEnd;

            if (activeAnimInfo && activeAnimInfo.isParallel) {
                var lTiming = (activeAnimInfo.lineTimings && activeAnimInfo.lineTimings[lineNum])
                    ? activeAnimInfo.lineTimings[lineNum]
                    : { startTime: typeStartTime, endTime: typeStartTime + typeTotalDur };
                var lDur = Math.max(0.04, lTiming.endTime - lTiming.startTime);
                var lCharStart = (typeof lineInfo.charStart === "number") ? lineInfo.charStart : 0;
                var lCharEnd = (typeof lineInfo.charEnd === "number" && lineInfo.charEnd > lCharStart) ? lineInfo.charEnd : (lCharStart + 1);
                var localFracStart = Math.max(0, Math.min(1, (box.charStart - lCharStart) / (lCharEnd - lCharStart)));
                var localFracEnd = Math.max(0, Math.min(1, (box.charEnd - lCharStart) / (lCharEnd - lCharStart)));
                bStart = lTiming.startTime + localFracStart * lDur;
                bEnd = lTiming.startTime + localFracEnd * lDur;
            } else if (activeAnimInfo && activeAnimInfo.hasAnimator) {
                var pctStart = (revealUnit === "words") ? wStartPct : cStartPct;
                var pctEnd = (revealUnit === "words") ? wEndPct : cEndPct;
                bStart = typeStartTime + (pctStart / 100) * typeTotalDur;
                bEnd = typeStartTime + (pctEnd / 100) * typeTotalDur;
            } else {
                var defaultStart = (typeof data.inPoint === "number" && data.inPoint > 0) ? data.inPoint : ((typeof comp.time === "number" && comp.time > 0) ? comp.time : textLayer.inPoint);
                if (typeof defaultStart !== "number" || isNaN(defaultStart)) defaultStart = comp.time;
                var defaultDur = (typeof data.lineDuration === "number" && data.lineDuration > 0) ? data.lineDuration : ((typeof data.dur === "number" && data.dur > 0) ? data.dur : 0.35);
                bStart = defaultStart + boxDelay;
                bEnd = bStart + defaultDur;
            }
            if (bEnd <= bStart) bEnd = bStart + 0.04;

            var tExitTime = bEnd + holdTime;
            var inDur = (boxMotion === "snap") ? 0.04 : Math.max(0.25, Math.min(1.0, bEnd - bStart));
            var outDur = 0.20;

            var opacExpr;
            if (isSlave) {
                opacExpr =
                    'var masterName = ' + JSON.stringify(masterLayerName) + ';\n' +
                    'var pMaster = null; try { pMaster = thisComp.layer(masterName); } catch(eM) {}\n' +
                    'if (!pMaster) {\n' +
                    '    value;\n' +
                    '} else {\n' +
                    '    var opM = 100; try { opM = pMaster.transform.opacity.value; } catch(eO) {}\n' +
                    '    var prog = 100; try { prog = effect("Progress")(1).value; } catch(eP) {}\n' +
                    '    (prog <= 0) ? 0 : opM;\n' +
                    '}';
            } else {
                opacExpr =
                    'var useM = 1; try { useM = effect("Use Timeline Markers")(1); } catch(eUM) {}\n' +
                    'var lOp = 100; try { lOp = effect("Local Opacity")(1); } catch(eLOp) {}\n' +
                    'var prog = 100; try { prog = effect("Progress")(1); } catch(eP) {}\n' +
                    'var tIn = ' + bStart.toFixed(3) + ';\n' +
                    'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 1) {\n' +
                    '    try { tIn = thisLayer.marker.key("IN").time; } catch(eK1) { try { tIn = thisLayer.marker.key(1).time; } catch(eK2) {} }\n' +
                    '}\n' +
                    'var hasOut = false;\n' +
                    'var tOut = ' + tExitTime.toFixed(3) + ';\n' +
                    'var dOut = ' + outDur.toFixed(3) + '; try { dOut = Math.max(0.01, effect("Outro Duration (s)")(1)); } catch(eDO) {}\n' +
                    'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 2) {\n' +
                    '    try { tOut = thisLayer.marker.key("OUT").time; hasOut = true; } catch(eKO) {}\n' +
                    '} else {\n' +
                    '    hasOut = true;\n' +
                    '}\n' +
                    'if (time < tIn || (hasOut && time >= tOut + dOut) || prog <= 0) {\n' +
                    '    0;\n' +
                    '} else if (hasOut && time >= tOut) {\n' +
                    '    ease(time, tOut, tOut + dOut, lOp, 0);\n' +
                    '} else {\n' +
                    '    lOp;\n' +
                    '}';
            }

            var fEndVal = (typeof box.fracEnd === "number") ? box.fracEnd : 1.0;
            var fStartVal = (typeof box.fracStart === "number") ? box.fracStart : 0.0;

            var shapeOpts = {
                comment: phraseComment,
                singleLayer: !!data.singleLayer,
                masterLayer: consolidatedPhraseLayer,
                groupName: "Phrase Group " + (k + 1),
                lastLayer: lastLayer,
                useMasterDefault: 0,
                defaultColor: boxColor,
                defaultPadX: box.paddingX,
                defaultPadY: box.paddingY,
                defaultRound: (box.style === "pill" ? 50 : 0),
                defaultOpacity: (box.style === "marker" ? 85 : 100),
                opacityExpression: opacExpr,
                groupName: "Phrase Group",
                animateProgress: function (progProp, c) {
                    progProp.setValueAtTime(bStart, 0);
                    progProp.setValueAtTime(bStart + inDur, 100);
                    try {
                        progProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                        progProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                    } catch (eLin) {}

                    var dualEngineProgExpr;
                    if (isSlave) {
                        dualEngineProgExpr =
                            'var masterName = ' + JSON.stringify(masterLayerName) + ';\n' +
                            'var pMaster = null; try { pMaster = thisComp.layer(masterName); } catch(eM) {}\n' +
                            'if (!pMaster) {\n' +
                            '    value;\n' +
                            '} else {\n' +
                            '    var useM = 1; try { useM = pMaster.effect("Use Timeline Markers")(1); } catch(eUM) {}\n' +
                            '    var tIn = ' + bStart.toFixed(3) + ';\n' +
                            '    if (useM == 1 && pMaster.marker && pMaster.marker.numKeys >= 1) {\n' +
                            '        try { tIn = pMaster.marker.key("IN").time; } catch(eK1) { try { tIn = pMaster.marker.key(1).time; } catch(eK2) {} }\n' +
                            '    }\n' +
                            '    var dIn = ' + inDur.toFixed(3) + '; try { dIn = Math.max(0.01, pMaster.effect("Intro Duration (s)")(1)); } catch(eDI) {}\n' +
                            '    var fStart = ' + fStartVal.toFixed(4) + ';\n' +
                            '    var fEnd = ' + fEndVal.toFixed(4) + ';\n' +
                            '    var tStart = tIn + (dIn * fStart);\n' +
                            '    var tEnd = tIn + (dIn * fEnd);\n' +
                            '    var mType = ' + (boxMotion === "snap" ? 3 : (boxMotion === "pop" ? 2 : (boxMotion === "typewriter" ? 4 : 1))) + '; try { mType = pMaster.effect("Motion Type")(1); } catch(eMT) {}\n' +
                            '    var res = 0;\n' +
                            '    if (mType == 3) {\n' +
                            '        res = (time < tStart) ? 0 : 100;\n' +
                            '    } else {\n' +
                            '        if (time < tStart) {\n' +
                            '            res = 0;\n' +
                            '        } else if (time < tEnd) {\n' +
                            '            res = ease(time, tStart, tEnd, 0, 100);\n' +
                            '        } else {\n' +
                            '            res = 100;\n' +
                            '        }\n' +
                            '    }\n' +
                            '    var hasOut = false;\n' +
                            '    var tOut = ' + tExitTime.toFixed(3) + ';\n' +
                            '    var dOut = ' + outDur.toFixed(3) + '; try { dOut = Math.max(0.01, pMaster.effect("Outro Duration (s)")(1)); } catch(eDO) {}\n' +
                            '    if (useM == 1 && pMaster.marker && pMaster.marker.numKeys >= 2) {\n' +
                            '        try { tOut = pMaster.marker.key("OUT").time; hasOut = true; } catch(eKO) {}\n' +
                            '    } else {\n' +
                            '        hasOut = true;\n' +
                            '    }\n' +
                            '    if (hasOut && time >= tOut) {\n' +
                            '        var tOutStart = tOut + (dOut * (1 - fEnd));\n' +
                            '        var tOutEnd = tOut + (dOut * (1 - fStart));\n' +
                            '        if (mType == 3) {\n' +
                            '            res = (time >= tOutStart) ? 0 : res;\n' +
                            '        } else {\n' +
                            '            var outP = ease(time, tOutStart, tOutEnd, 100, 0);\n' +
                            '            res = Math.min(res, outP);\n' +
                            '        }\n' +
                            '    }\n' +
                            '    res;\n' +
                            '}';
                    } else if (boxMotion === "typewriter" && activeAnimInfo && activeAnimInfo.hasAnimator) {
                        dualEngineProgExpr =
                            'var useM = 1; try { useM = effect("Use Timeline Markers")(1); } catch(eM) {}\n' +
                            'var tIn = ' + bStart.toFixed(3) + ';\n' +
                            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 1) {\n' +
                            '    try { tIn = thisLayer.marker.key("IN").time; } catch(eK1) { try { tIn = thisLayer.marker.key(1).time; } catch(eK2) {} }\n' +
                            '}\n' +
                            'var hasOut = false;\n' +
                            'var tOut = ' + tExitTime.toFixed(3) + ';\n' +
                            'var dOut = ' + outDur.toFixed(3) + '; try { dOut = Math.max(0.01, effect("Outro Duration (s)")(1)); } catch(eDO) {}\n' +
                            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 2) {\n' +
                            '    try { tOut = thisLayer.marker.key("OUT").time; hasOut = true; } catch(eMO) {}\n' +
                            '} else {\n' +
                            '    hasOut = true;\n' +
                            '}\n' +
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
                            '                var c1 = (unitType == 3) ? ' + wStartPct.toFixed(4) + ' : ((unitType == 4) ? ' + lStartPct.toFixed(4) + ' : ' + cStartPct.toFixed(4) + ');\n' +
                            '                var c2 = (unitType == 3) ? ' + wEndPct.toFixed(4) + ' : ((unitType == 4) ? ' + lEndPct.toFixed(4) + ' : ' + cEndPct.toFixed(4) + ');\n' +
                            '                var pVal = 0;\n' +
                            '                var pStart = null; try { pStart = sel.start; } catch(e1) {}\n' +
                            '                var pEnd = null; try { pEnd = sel.end; } catch(e2) {}\n' +
                            '                if (pStart && (pStart.numKeys > 0 || pStart.expressionEnabled)) { pVal = pStart.value; }\n' +
                            '                else if (pEnd && (pEnd.numKeys > 0 || pEnd.expressionEnabled)) { pVal = pEnd.value; }\n' +
                            '                else if (pStart) { pVal = pStart.value; }\n' +
                            '                else if (pEnd) { pVal = pEnd.value; }\n' +
                            '                if (time >= tIn && pVal < c2) {\n' +
                            '                    res = (pVal <= c1) ? 0 : linear(pVal, c1, c2, 0, 100);\n' +
                            '                } else {\n' +
                            '                    var dIn = ' + inDur.toFixed(3) + '; try { dIn = Math.max(0.01, effect("Intro Duration (s)")(1)); } catch(eD) {}\n' +
                            '                    var dInLocal = Math.max(0.01, dIn * ' + fEndVal.toFixed(4) + ');\n' +
                            '                    res = (time < tIn) ? 0 : (time < tIn + dInLocal ? ease(time, tIn, tIn + dInLocal, 0, 100) : 100);\n' +
                            '                }\n' +
                            '            }\n' +
                            '        } catch(err) {}\n' +
                            '    } else {\n' +
                            '        var dIn = ' + inDur.toFixed(3) + '; try { dIn = Math.max(0.01, effect("Intro Duration (s)")(1)); } catch(eD) {}\n' +
                            '        var dInLocal = Math.max(0.01, dIn * ' + fEndVal.toFixed(4) + ');\n' +
                            '        res = (time < tIn) ? 0 : (time < tIn + dInLocal ? ease(time, tIn, tIn + dInLocal, 0, 100) : 100);\n' +
                            '    }\n' +
                            '}\n' +
                            'if (time < tIn) res = 0;\n' +
                            'if (hasOut && time >= tOut) {\n' +
                            '    var tOutLocal = tOut + (dOut * (1 - ' + fEndVal.toFixed(4) + '));\n' +
                            '    var dOutLocal = Math.max(0.01, dOut * ' + fEndVal.toFixed(4) + ');\n' +
                            '    var outP = ease(time, tOutLocal, tOutLocal + dOutLocal, 100, 0);\n' +
                            '    res = Math.min(res, outP);\n' +
                            '}\n' +
                            'res;';
                    } else {
                        dualEngineProgExpr =
                            'var useM = 1; try { useM = effect("Use Timeline Markers")(1); } catch(eM) {}\n' +
                            'var dIn = ' + inDur.toFixed(3) + '; try { dIn = Math.max(0.01, effect("Intro Duration (s)")(1)); } catch(eD) {}\n' +
                            'var dInLocal = Math.max(0.01, dIn * ' + fEndVal.toFixed(4) + ');\n' +
                            'var tIn = ' + bStart.toFixed(3) + ';\n' +
                            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 1) {\n' +
                            '    try { tIn = thisLayer.marker.key("IN").time; } catch(eK1) { try { tIn = thisLayer.marker.key(1).time; } catch(eK2) {} }\n' +
                            '}\n' +
                            'var mType = ' + (boxMotion === "snap" ? 3 : (boxMotion === "pop" ? 2 : 1)) + '; try { mType = effect("Motion Type")(1); } catch(eMT) {}\n' +
                            'var res = 0;\n' +
                            'if (mType == 3) {\n' +
                            '    res = (time < tIn) ? 0 : 100;\n' +
                            '} else {\n' +
                            '    if (time < tIn) {\n' +
                            '        res = 0;\n' +
                            '    } else if (time < tIn + dInLocal) {\n' +
                            '        res = ease(time, tIn, tIn + dInLocal, 0, 100);\n' +
                            '    } else {\n' +
                            '        res = 100;\n' +
                            '    }\n' +
                            '}\n' +
                            'var hasOut = false;\n' +
                            'var tOut = ' + tExitTime.toFixed(3) + ';\n' +
                            'var dOut = ' + outDur.toFixed(3) + '; try { dOut = Math.max(0.01, effect("Outro Duration (s)")(1)); } catch(eDO) {}\n' +
                            'if (useM == 1 && thisLayer.marker && thisLayer.marker.numKeys >= 2) {\n' +
                            '    try { tOut = thisLayer.marker.key("OUT").time; hasOut = true; } catch(eMO) {}\n' +
                            '} else {\n' +
                            '    hasOut = true;\n' +
                            '}\n' +
                            'if (hasOut && time >= tOut) {\n' +
                            '    var tOutLocal = tOut + (dOut * (1 - ' + fEndVal.toFixed(4) + '));\n' +
                            '    var dOutLocal = Math.max(0.01, dOut * ' + fEndVal.toFixed(4) + ');\n' +
                            '    if (mType == 3) {\n' +
                            '        res = (time >= tOutLocal) ? 0 : res;\n' +
                            '    } else {\n' +
                            '        var outP = ease(time, tOutLocal, tOutLocal + dOutLocal, 100, 0);\n' +
                            '        res = Math.min(res, outP);\n' +
                            '    }\n' +
                            '}\n' +
                            'res;';
                    }
                    progProp.expression = dualEngineProgExpr;
                }
            };

            // Custom layer name for multi-line boxes
            if (isSlave) {
                box.name = '[HL-Phrase] "' + (box.text.length > 14 ? box.text.substring(0, 12) + '...' : box.text) + '" (Line ' + (box.phraseBoxIndex + 1) + ')';
            }

            var shapeLayer = $._smartHighlighter.createHighlightShapeLayer(comp, textLayer, box, ctx, shapeOpts);
            if (shapeLayer) {
                box.assignedLayerName = shapeLayer.name;
                try {
                    var fx = shapeLayer.property("ADBE Effect Parade");
                    if (fx && !isSlave) {
                        var chkMarkers = fx.addProperty("ADBE Checkbox Control");
                        chkMarkers.name = "Use Timeline Markers";
                        chkMarkers.property(1).setValue(1);

                        var slInDur = fx.addProperty("ADBE Slider Control");
                        slInDur.name = "Intro Duration (s)";
                        slInDur.property(1).setValue(inDur);

                        var slOutDur = fx.addProperty("ADBE Slider Control");
                        slOutDur.name = "Outro Duration (s)";
                        slOutDur.property(1).setValue(outDur);

                        var slMotion = fx.addProperty("ADBE Slider Control");
                        slMotion.name = "Motion Type";
                        var mVal = (boxMotion === "snap") ? 3 : (boxMotion === "pop" ? 2 : (boxMotion === "typewriter" ? 4 : 1));
                        slMotion.property(1).setValue(mVal);
                    }

                    // Only master layer gets timeline markers (prevents duplicated markers)
                    if (!isSlave) {
                        var mProp = shapeLayer.property("ADBE Marker");
                        if (mProp) {
                            while (mProp.numKeys > 0) mProp.removeKey(1);
                            var mIn = new MarkerValue("IN");
                            try { mIn.label = 8; } catch (eL1) {} // Green label #8
                            mProp.setValueAtTime(bStart, mIn);

                            var mOut = new MarkerValue("OUT");
                            try { mOut.label = 1; } catch (eL2) {} // Orange label #1
                            mProp.setValueAtTime(tExitTime, mOut);
                        }
                    }

                    // Color linking expression for slave box
                    if (isSlave && masterLayerName) {
                        try {
                            var rootGrp = shapeLayer.property("ADBE Root Vectors Group");
                            if (rootGrp && rootGrp.property(1)) {
                                var fillProp = rootGrp.property(1).property("ADBE Vectors Group").property("Fill Color");
                                if (fillProp && fillProp.property("ADBE Vector Fill Color")) {
                                    fillProp.property("ADBE Vector Fill Color").expression =
                                        'var pMaster = null; try { pMaster = thisComp.layer(' + JSON.stringify(masterLayerName) + '); } catch(eM) {}\n' +
                                        'if (pMaster && pMaster.effect("Local Color")) { pMaster.effect("Local Color")(1).value; } else { effect("Local Color")(1).value; }';
                                }
                            }
                        } catch (eLinkCol) {}
                    }

                    try {
                        shapeLayer.inPoint = Math.max(0, bStart - 0.5);
                        shapeLayer.outPoint = Math.min(comp.duration, tExitTime + outDur + 0.5);
                    } catch (eTrim) {}
                } catch (eDualFx) {
                    $._smartHighlighter.log("Dual-Engine setup warning: " + eDualFx.toString());
                }
            }
            ctx.shapeLayer = shapeLayer;
            if (!consolidatedPhraseLayer && data.singleLayer) consolidatedPhraseLayer = shapeLayer;
            lastLayer = shapeLayer;
        }

        var reportMsg = "SUCCESS: Applied " + totalBoxes + " phrase highlight box(es)";
        $._smartHighlighter.log(reportMsg);
        return reportMsg;

    } catch (e) {
        $._smartHighlighter.log("buildPhraseHighlights ERROR: " + e.toString());
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

/**
 * إزالة جميع صناديق تظليل العبارات (Phrase Highlights) من طبقة النص المحددة
 */
$._smartHighlighter.clearPhraseHighlights = function () {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "ERROR: Please select an active composition";
        }
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) {
            return "ERROR: Please select a Text Layer";
        }
        var textLayer = layers[0];
        if (!(textLayer instanceof TextLayer)) {
            if (textLayer.parent && (textLayer.parent instanceof TextLayer)) {
                textLayer = textLayer.parent;
            } else if (textLayer.comment && textLayer.comment.indexOf("PARENT:") !== -1) {
                var pName = textLayer.comment.replace("PARENT:", "").replace(/^\s+|\s+$/g, "");
                textLayer = comp.layer(pName);
            }
        }
        if (!textLayer || !(textLayer instanceof TextLayer)) {
            return "ERROR: Please select a Text Layer";
        }

        var textLayerIndex = textLayer.index;
        var textLayerName = textLayer.name;

        app.beginUndoGroup("OpenBox: Clear Phrase Highlights");
        var removed = 0;
        var phraseTag = "SMART_HL_PHRASE";
        for (var i = comp.numLayers; i >= 1; i--) {
            var l = comp.layer(i);
            if (!l || l.index === textLayerIndex) continue;
            var isParent = false;
            try {
                if (l.parent && (l.parent.index === textLayerIndex || l.parent.name === textLayerName || l.parent === textLayer)) {
                    isParent = true;
                }
            } catch (ePar) {}
            var isPhrase = (l.comment && l.comment.indexOf(phraseTag) !== -1) || (l.name && l.name.indexOf("[HL-Phrase]") !== -1);
            if (isParent && isPhrase) {
                try {
                    l.remove();
                    removed++;
                } catch (eR) {}
            }
        }
        var msg = "SUCCESS: Removed " + removed + " phrase highlight(s)";
        $._smartHighlighter.log(msg);
        return msg;
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

/**
 * استخراج قائمة العبارات المظللة حالياً على الطبقة النصية المحددة
 * ترجع مصفوفة JSON تحتوي على معرف كل عبارة، نصها، ولونها، وإحداثياتها
 */
$._smartHighlighter.getAppliedPhrases = function (targetLayerName) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "[]";

        // 1. Resolve Text Layer accurately
        var textLayer = null;
        if (targetLayerName && typeof targetLayerName === "string" && targetLayerName.length > 0) {
            try {
                var cand = comp.layer(targetLayerName);
                if (cand instanceof TextLayer) {
                    textLayer = cand;
                } else if (cand && cand.parent && (cand.parent instanceof TextLayer)) {
                    textLayer = cand.parent;
                } else if (cand && cand.comment && cand.comment.indexOf("parent:") !== -1) {
                    var mP = cand.comment.match(/parent:([^\|]+)/);
                    if (mP && mP[1]) {
                        var pLyr = comp.layer(mP[1]);
                        if (pLyr instanceof TextLayer) textLayer = pLyr;
                    }
                }
            } catch (eL1) {}
        }
        if (!textLayer || !(textLayer instanceof TextLayer)) {
            var layers = comp.selectedLayers;
            if (layers && layers.length > 0) {
                for (var si = 0; si < layers.length; si++) {
                    var sl = layers[si];
                    if (sl instanceof TextLayer) {
                        textLayer = sl;
                        break;
                    } else if (sl.parent && (sl.parent instanceof TextLayer)) {
                        textLayer = sl.parent;
                        break;
                    } else if (sl.comment && sl.comment.indexOf("PARENT:") !== -1) {
                        try {
                            var pName = sl.comment.replace("PARENT:", "").replace(/^\s+|\s+$/g, "");
                            textLayer = comp.layer(pName);
                            if (textLayer instanceof TextLayer) break;
                        } catch (eP) {}
                    } else if (sl.comment && sl.comment.indexOf("parent:") !== -1) {
                        try {
                            var mSelP = sl.comment.match(/parent:([^\|]+)/);
                            if (mSelP && mSelP[1]) {
                                var pLyr2 = comp.layer(mSelP[1]);
                                if (pLyr2 instanceof TextLayer) { textLayer = pLyr2; break; }
                            }
                        } catch (eP2) {}
                    }
                }
            }
        }
        // Fallback: If still not found, search comp layers for the first TextLayer
        if (!textLayer || !(textLayer instanceof TextLayer)) {
            for (var ci = 1; ci <= comp.numLayers; ci++) {
                var cl = comp.layer(ci);
                if (cl instanceof TextLayer) {
                    textLayer = cl;
                    break;
                }
            }
        }
        if (!textLayer || !(textLayer instanceof TextLayer)) return "[]";

        var textLayerIndex = textLayer.index;
        var textLayerName = textLayer.name;
        var rawTextContent = "";
        try { rawTextContent = textLayer.property("Source Text").value.text; } catch (eSrc) { if ($._smartHighlighter && $._smartHighlighter.logError) $._smartHighlighter.logError("TagManager.jsx:1515", eSrc); }

        var phrasesMap = {};
        var phrasesList = [];
        var phraseTag = "SMART_HL_PHRASE";

        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (!l || l.index === textLayerIndex) continue;

            var c = (l.comment || "");
            var isPhraseLayer = (c.indexOf(phraseTag) !== -1) || (l.name && l.name.indexOf("[HL-Phrase]") !== -1);

            // Check if layer belongs to textLayer via index, name, reference, or comment stamp
            var isParentMatch = false;
            try {
                if (l.parent) {
                    if (l.parent.index === textLayerIndex || l.parent.name === textLayerName || l.parent === textLayer) {
                        isParentMatch = true;
                    }
                }
            } catch (ePar) {}
            if (!isParentMatch && c.indexOf("parent:" + textLayerName) !== -1) {
                isParentMatch = true;
            }
            if (!isParentMatch && isPhraseLayer && (!l.parent || l.parent.name === textLayerName)) {
                isParentMatch = true;
            }

            if (isParentMatch && isPhraseLayer) {
                var idMatch = c.match(/id:([^\|]+)/);
                var colMatch = c.match(/color:([^\|]+)/);
                var textMatch = c.match(/text:([^\|]+)/);
                var csMatch = c.match(/cs:([^\|]+)/);
                var ceMatch = c.match(/ce:([^\|]+)/);

                var pId = idMatch ? idMatch[1] : ("phrase_layer_" + l.index);
                
                // Safe text decoding with fallback to layer name
                var pText = "";
                if (textMatch) {
                    try {
                        pText = unescape(textMatch[1]);
                    } catch (eDec1) {
                        try {
                            pText = decodeURIComponent(textMatch[1]);
                        } catch (eDec2) {
                            pText = textMatch[1];
                        }
                    }
                }
                if (!pText || pText.length === 0) {
                    var nameMatch = l.name.match(/"([^"]+)"/);
                    pText = nameMatch ? nameMatch[1] : l.name;
                }

                // Color extraction: prefer actual live effect color if present
                var pCol = colMatch ? colMatch[1] : "#2ECC71";
                try {
                    var colFx = l.effect("Local Color");
                    if (colFx) {
                        var cVal = colFx.property(1).value;
                        if (cVal && $._smartHighlighter.rgbToHex) {
                            pCol = $._smartHighlighter.rgbToHex(cVal);
                        }
                    }
                } catch (eCol) {}

                var pCs = csMatch ? parseInt(csMatch[1], 10) : -1;
                var pCe = ceMatch ? parseInt(ceMatch[1], 10) : -1;

                // Fallback character indices from raw text content
                if ((pCs < 0 || pCe <= pCs) && rawTextContent && pText) {
                    var fIdx = rawTextContent.indexOf(pText);
                    if (fIdx !== -1) {
                        pCs = fIdx;
                        pCe = fIdx + pText.length;
                    }
                }

                if (!phrasesMap[pId]) {
                    var phrObj = {
                        id: pId,
                        text: pText,
                        color: pCol,
                        charStart: Math.max(0, pCs),
                        charEnd: Math.max(pCs, pCe),
                        boxCount: 1
                    };
                    phrasesMap[pId] = phrObj;
                    phrasesList.push(phrObj);
                } else {
                    phrasesMap[pId].boxCount++;
                    if (pCe > phrasesMap[pId].charEnd) phrasesMap[pId].charEnd = pCe;
                    if (pCs >= 0 && pCs < phrasesMap[pId].charStart) phrasesMap[pId].charStart = pCs;
                }
            }
        }

        var jsonOut = $._smartHighlighter.stringifyJSON ? $._smartHighlighter.stringifyJSON(phrasesList) : JSON.stringify(phrasesList);
        if ($._smartHighlighter && $._smartHighlighter.log) {
            $._smartHighlighter.log("getAppliedPhrases FOUND: " + phrasesList.length + " phrase(s) -> " + jsonOut);
        }
        return jsonOut;
    } catch (e) {
        if ($._smartHighlighter && $._smartHighlighter.log) {
            $._smartHighlighter.log("getAppliedPhrases ERROR: " + e.toString());
        }
        return "[]";
    }
};

/**
 * حذف عبارة مظللة محددة بحسب معرفها الفريد دون التأثير على العبارات الأخرى
 */
$._smartHighlighter.removeSinglePhrase = function (phraseId) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "ERROR: Please select an active composition";
        if (!phraseId) return "ERROR: No phrase ID provided";

        app.beginUndoGroup("OpenBox: Remove Phrase Highlight");
        var removed = 0;
        var phraseTag = "SMART_HL_PHRASE";
        for (var i = comp.numLayers; i >= 1; i--) {
            var l = comp.layer(i);
            if (!l) continue;
            var isPhrase = (l.comment && l.comment.indexOf(phraseTag) !== -1) || (l.name && l.name.indexOf("[HL-Phrase]") !== -1);
            if (isPhrase) {
                var c = l.comment || "";
                if (c.indexOf("id:" + phraseId) !== -1 || phraseId === ("phrase_layer_" + l.index) || phraseId === ("layer_" + l.index) || l.name.indexOf(phraseId) !== -1) {
                    try {
                        l.remove();
                        removed++;
                    } catch (eR) {}
                }
            }
        }
        var msg = "SUCCESS: Removed phrase (" + removed + " box(es))";
        $._smartHighlighter.log(msg);
        return msg;
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

/**
 * تعديل لون عبارة مظللة حياً في After Effects دون إعادة إنشاء الطبقة أو المساس بالماركرز
 */
$._smartHighlighter.setPhraseColor = function (phraseId, newHexColor) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "ERROR: Please select an active composition";
        if (!phraseId || !newHexColor) return "ERROR: Missing phraseId or color";

        var rgb = $._smartHighlighter.hexToRgba ? $._smartHighlighter.hexToRgba(newHexColor) : [0.18, 0.8, 0.44, 1.0];
        app.beginUndoGroup("OpenBox: Change Phrase Color");
        var updated = 0;
        var phraseTag = "SMART_HL_PHRASE";

        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (!l) continue;
            var c = l.comment || "";
            var isPhrase = (c.indexOf(phraseTag) !== -1) || (l.name && l.name.indexOf("[HL-Phrase]") !== -1);
            if (isPhrase && (c.indexOf("id:" + phraseId) !== -1 || phraseId === ("phrase_layer_" + l.index) || l.name.indexOf(phraseId) !== -1)) {
                try {
                    var colFx = l.effect("Local Color");
                    if (colFx && colFx.property(1)) {
                        colFx.property(1).setValue(rgb);
                    }
                    if (c.indexOf("color:") !== -1) {
                        l.comment = c.replace(/color:[^\|]+/, "color:" + newHexColor);
                    }
                    updated++;
                } catch (eUp) {}
            }
        }
        var msg = "SUCCESS: Updated color for phrase (" + updated + " layer(s))";
        $._smartHighlighter.log(msg);
        return msg;
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

/**
 * تحديد موقع العبارة ونقل مؤشر تشغيل التايملاين مباشرة إلى زمن ماركر IN
 */
$._smartHighlighter.locatePhrase = function (phraseId) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "ERROR: Please select an active composition";
        if (!phraseId) return "ERROR: Missing phraseId";

        var phraseTag = "SMART_HL_PHRASE";
        var targetLayer = null;
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (!l) continue;
            var c = l.comment || "";
            var isPhrase = (c.indexOf(phraseTag) !== -1) || (l.name && l.name.indexOf("[HL-Phrase]") !== -1);
            if (isPhrase && (c.indexOf("id:" + phraseId) !== -1 || phraseId === ("phrase_layer_" + l.index) || l.name.indexOf(phraseId) !== -1)) {
                if (c.indexOf("role:master") !== -1 || !targetLayer) {
                    targetLayer = l;
                }
            }
        }

        if (!targetLayer) return "ERROR: Phrase layer not found in AE";

        var tSeek = targetLayer.inPoint;
        try {
            var mProp = targetLayer.property("ADBE Marker");
            if (mProp && mProp.numKeys >= 1) {
                try { tSeek = mProp.key("IN").time; } catch (eK) { tSeek = mProp.keyTime(1); }
            }
        } catch (eM) {}

        comp.time = Math.max(0, Math.min(comp.duration, tSeek));

        for (var si = 0; si < comp.selectedLayers.length; si++) {
            try { comp.selectedLayers[si].selected = false; } catch (eDes) {}
        }
        targetLayer.selected = true;

        return "SUCCESS: Jumped to phrase at " + tSeek.toFixed(2) + "s";
    } catch (e) {
        return "ERROR: " + e.toString();
    }
};

/**
 * إعادة مزامنة وتصويب إحداثيات وأبعاد الصناديق بدقة O(1) عند تعديل النص في After Effects
 * مع الحفاظ بنسبة 100% على توقيت الماركرز اليدوية والسلايدرات
 */
$._smartHighlighter.resyncPhraseHighlights = function () {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "ERROR: Please select an active composition";
        var layers = comp.selectedLayers;
        var textLayer = null;
        if (layers && layers.length > 0) {
            for (var si = 0; si < layers.length; si++) {
                if (layers[si] instanceof TextLayer) { textLayer = layers[si]; break; }
                if (layers[si].parent && (layers[si].parent instanceof TextLayer)) { textLayer = layers[si].parent; break; }
            }
        }
        if (!textLayer) {
            for (var ci = 1; ci <= comp.numLayers; ci++) {
                if (comp.layer(ci) instanceof TextLayer) { textLayer = comp.layer(ci); break; }
            }
        }
        if (!textLayer) return "ERROR: Please select a Text Layer to re-sync";

        app.beginUndoGroup("OpenBox: Re-Sync Phrases");

        if ($._smartHighlighter.clearScanCache) {
            $._smartHighlighter.clearScanCache(textLayer);
        }
        var scan = $._smartHighlighter.scanParagraph(textLayer);
        if (!scan || !scan.fullText) {
            return "ERROR: Failed to scan updated text layer";
        }

        var phraseTag = "SMART_HL_PHRASE";
        var resyncedCount = 0;

        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (!l) continue;
            var c = l.comment || "";
            var isPhrase = (c.indexOf(phraseTag) !== -1) || (l.name && l.name.indexOf("[HL-Phrase]") !== -1);
            var isChild = (l.parent === textLayer || (l.parent && l.parent.name === textLayer.name) || c.indexOf("parent:" + textLayer.name) !== -1);
            if (isPhrase && isChild) {
                var csMatch = c.match(/cs:(\d+)/);
                var ceMatch = c.match(/ce:(\d+)/);
                if (csMatch && ceMatch) {
                    var cs = parseInt(csMatch[1], 10);
                    var ce = parseInt(ceMatch[1], 10);
                    for (var li = 0; li < scan.numLines; li++) {
                        var lObj = scan.linesData[li];
                        var lStart = lObj.charStart || 0;
                        var lEnd = lStart + lObj.text.length;
                        if (cs >= lStart && cs < lEnd) {
                            var localStart = cs - lStart;
                            var localEnd = Math.min(ce - lStart, lObj.text.length);
                            var phrStarts = lObj.wordStarts || [];
                            var phrEnds = lObj.wordEnds || [];
                            var phrSpans = lObj.wordSpans || [];
                            var wOff = 0;
                            var newW = 10;
                            var fWIdx = -1, lWIdx = -1;
                            for (var wi = 0; wi < phrSpans.length; wi++) {
                                if (fWIdx === -1 && phrSpans[wi].end > localStart) fWIdx = wi;
                                if (phrSpans[wi].start < localEnd) lWIdx = wi;
                            }
                            if (fWIdx !== -1 && lWIdx >= fWIdx && phrStarts.length > fWIdx && phrEnds.length > lWIdx) {
                                wOff = Math.max(0, Math.round(phrStarts[fWIdx] * 10) / 10);
                                newW = Math.max(1, Math.round((phrEnds[lWIdx] - phrStarts[fWIdx]) * 10) / 10);
                            } else if (lObj.cOffsets && localEnd <= lObj.cOffsets.length) {
                                var sStart = (localStart > 0) ? lObj.cOffsets[localStart - 1] : 0;
                                var sEnd = lObj.cOffsets[localEnd - 1];
                                wOff = Math.max(0, Math.round(sStart * 10) / 10);
                                newW = Math.max(1, Math.round((sEnd - sStart) * 10) / 10);
                            }
                            try {
                                var rootGrp = l.property("ADBE Root Vectors Group");
                                if (rootGrp) {
                                    for (var gi = 1; gi <= rootGrp.numProperties; gi++) {
                                        var grp = rootGrp.property(gi);
                                        if (grp && grp.property("ADBE Vectors Group")) {
                                            var rectProp = grp.property("ADBE Vectors Group").property("ADBE Vector Shape - Rect");
                                            if (rectProp) {
                                                var posExpr = rectProp.property("ADBE Vector Rect Position").expression;
                                                if (posExpr) {
                                                    posExpr = posExpr.replace(/var dynH = [\d.]+/g, "var dynH = " + lObj.height.toFixed(2));
                                                    posExpr = posExpr.replace(/rightEdge - \([\d.]+/g, "rightEdge - (" + wOff.toFixed(2));
                                                    posExpr = posExpr.replace(/leftEdge \+ \([\d.]+/g, "leftEdge + (" + wOff.toFixed(2));
                                                    posExpr = posExpr.replace(/var baseW = [\d.]+/g, "var baseW = " + newW.toFixed(2));
                                                    rectProp.property("ADBE Vector Rect Position").expression = posExpr;
                                                }
                                                var szExpr = rectProp.property("ADBE Vector Rect Size").expression;
                                                if (szExpr) {
                                                    szExpr = szExpr.replace(/var baseW = [\d.]+/g, "var baseW = " + newW.toFixed(2));
                                                    rectProp.property("ADBE Vector Rect Size").expression = szExpr;
                                                }
                                            }
                                        }
                                    }
                                }
                                resyncedCount++;
                            } catch (eUpExpr) {}
                            break;
                        }
                    }
                }
            }
        }
        var resMsg = "SUCCESS: Re-synced " + resyncedCount + " phrase highlight(s)";
        $._smartHighlighter.log(resMsg);
        return resMsg;
    } catch (eResync) {
        return "ERROR: " + eResync.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

var SMART_HL_TAGMANAGER_LOADED = true;