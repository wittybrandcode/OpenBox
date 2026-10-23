/**
 * OPENBOX - Host Engine
 * Module: TagManager.jsx
 * Version: 2.2.0 (Non-Destructive Additive Phrase Engine & Exact In-Box Word Sync)
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
        var rtl_k = isCenter ? false : ((data.direction === "auto") ? (scan.isJustified ? (scan.justifyType === "right") : $._smartHighlighter.lineIsRTL(ld.text, fallbackRTL)) : (data.direction === "rtl"));
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
            var maxFlushAbsorb = (scan.isBoxText && !ld.isLastOfPara && !hasLeadingIndent)
                ? Math.max(8.0, (scan.fontSize || 40) * 0.9)
                : (!hasLeadingIndent ? 8.0 : 4.0);

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
                // RTL (Arabic): دمج إزاحة البداية اليمنى ضمن عرض الصندوق للحفاظ على اصطفاف اليمين وتغطية كامل النص يساراً
                if (rOff > 0 && rOff <= maxFlushAbsorb) {
                    var prevWR2 = boxWidth;
                    boxWidth = Math.round((boxWidth + rOff) * 10) / 10;
                    scaleLineOffsetsToWidth(prevWR2, boxWidth);
                    rOff = 0;
                }
            } else {
                // LTR (Latin): دمج إزاحة البداية اليسرى ضمن عرض الصندوق للحفاظ على اصطفاف اليسار وتغطية كامل النص يميناً
                if (lOff > 0 && lOff <= maxFlushAbsorb) {
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

            var setTempWordText = function (str) {
                try {
                    var wd = srcPropWord.value;
                    if (wd && wd.boxText) {
                        wd.boxTextSize = [100000, 100000];
                    }
                    wd.text = str;
                    tempWord.property("Source Text").setValue(wd);
                } catch (eWd) {
                    try { tempWord.property("Source Text").setValue(str); } catch (eWd2) {}
                }
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
                    var prefixUpTo = lText.substring(0, item.charIdx + item.phrase.length);

                    setTempWordText(prefixUpTo);
                    var rUpTo = tempWord.sourceRectAtTime(comp.time, false);

                    setTempWordText(item.phrase);
                    var rWord = tempWord.sourceRectAtTime(comp.time, false);

                    var rawWOffset = (item.charIdx <= 0) ? 0 : Math.max(0, rUpTo.width - rWord.width);
                    var spacesBeforeWord = (item.charIdx > 0) ? (lText.substring(0, item.charIdx).match(/\s+/g) || []).length : 0;
                    var spacesInsideWord = (item.phrase.match(/\s+/g) || []).length;
                    var wOffset = Math.max(0, Math.round((rawWOffset + spacesBeforeWord * deltaPerSpace) * 10) / 10);
                    var finalWordW = Math.max(1, Math.round((rWord.width + spacesInsideWord * deltaPerSpace) * 10) / 10);
                    var finalWordH = Math.max(rWord.height, lineObj.height * 0.9);

                    var wordCharStart = (typeof lineObj.charStart === "number") ? (lineObj.charStart + item.charIdx) : item.charIdx;
                    var wordCharEnd = wordCharStart + item.phrase.length;

                    // قياس العروض التراكمية الدقيقة للكلمة (Exact cumulative character offsets for word)
                    var wordCOffsets = [];
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
                try { tempWord.remove(); } catch (eR) {}
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
                        try { twAnimators.property(tai).remove(); } catch (eRmTa) {}
                    }
                }
            } catch (eTwAnim) {}

            var setTempWordText = function (str) {
                try {
                    var wd = srcPropPhrase.value;
                    if (wd && wd.boxText) {
                        wd.boxTextSize = [100000, 100000];
                    }
                    wd.text = str;
                    tempWord.property("Source Text").setValue(wd);
                } catch (eWd) {
                    try { tempWord.property("Source Text").setValue(str); } catch (eWd2) {}
                }
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

                                // Compute exact word-spacing expansion delta from Area Text Paragraph Composer
                                var phrLineRawW = (typeof lineObj.rawWidth === "number" && lineObj.rawWidth > 0) ? lineObj.rawWidth : lineObj.width;
                                var extraLineW = lineObj.width - phrLineRawW;
                                var totalSpacesInLine = (lText.match(/\s+/g) || []).length;
                                var deltaPerSpace = (totalSpacesInLine > 0 && Math.abs(extraLineW) > 0.2) ? (extraLineW / totalSpacesInLine) : 0;

                                var prefixUpTo = lText.substring(0, localStart + subPhrase.length);
                                setTempWordText(prefixUpTo);
                                var rUpTo = tempWord.sourceRectAtTime(comp.time, false);

                                setTempWordText(subPhrase);
                                var rWord = tempWord.sourceRectAtTime(comp.time, false);

                                // rUpTo.width - rWord.width retains all spaces before subPhrase without trailing-space stripping
                                var rawWOffset = (localStart <= 0) ? 0 : Math.max(0, rUpTo.width - rWord.width);
                                var spacesBeforePhrase = (localStart > 0) ? (lText.substring(0, localStart).match(/\s+/g) || []).length : 0;
                                var spacesInsidePhrase = (subPhrase.match(/\s+/g) || []).length;

                                var wOffset = Math.max(0, Math.round((rawWOffset + spacesBeforePhrase * deltaPerSpace) * 10) / 10);
                                var finalW = Math.max(1, Math.round((rWord.width + spacesInsidePhrase * deltaPerSpace) * 10) / 10);
                                var finalH = Math.max(rWord.height, lineObj.height * 0.9);

                                // Word-level start/end indices for accurate synchronization when Typewriter is in Words mode
                                var wordsBeforeOnLine = (localStart > 0) ? (lText.substring(0, localStart).match(/\S+/g) || []).length : 0;
                                var wordsInSubPhrase = Math.max(1, (subPhrase.match(/\S+/g) || []).length);
                                var phrWordStart = ((typeof lineObj.wordStart === "number") ? lineObj.wordStart : 0) + wordsBeforeOnLine;
                                var phrWordEnd = phrWordStart + wordsInSubPhrase;

                                var wordCOffsets = [];
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

                                // Determine true reading direction of the line (never force false on Center-aligned Arabic lines!)
                                var rtl_line = (data.direction === "rtl") ? true : ((data.direction === "ltr") ? false : (scan.isJustified ? (scan.justifyType === "right" ? true : (scan.justifyType === "left" ? false : $._smartHighlighter.lineIsRTL(lText, fallbackRTL))) : $._smartHighlighter.lineIsRTL(lText, fallbackRTL)));
                                var wordHasArabic = $._smartHighlighter.hasArabic(subPhrase);
                                var box_rtl = (data.direction === "rtl") ? true : ((data.direction === "ltr") ? false : (wordHasArabic ? true : (/[A-Za-z]/.test(subPhrase) ? false : rtl_line)));

                                var phrSlotIdx = (typeof lineObj.slotIndex === "number") ? lineObj.slotIndex : lIdx;
                                var phrTotalSlots = (typeof scan.totalSlots === "number") ? scan.totalSlots : scan.numLines;
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
                try { tempWord.remove(); } catch (eR) {}
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
                    try { lyr.remove(); } catch (eDelAll) {}
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
                        try { lyr.remove(); } catch (eDelOverlap) {}
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

        for (var k = 0; k < totalBoxes; k++) {
            var box = boxesData[k];
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = box.name;
            var safePhrText = "";
            try { safePhrText = escape(box.phraseText); } catch(eEsc) { safePhrText = encodeURIComponent(box.phraseText); }
            shapeLayer.comment = phraseTag + "|id:" + box.phraseId + "|parent:" + textLayer.name + "|color:" + box.phraseColorHex + "|text:" + safePhrText + "|cs:" + box.charStart + "|ce:" + box.charEnd;

            shapeLayer.moveAfter(lastLayer);
            lastLayer = shapeLayer;
            shapeLayer.parent = textLayer;

            var xform = shapeLayer.property("ADBE Transform Group");
            xform.property("ADBE Position").setValue([0, 0]);
            xform.property("ADBE Anchor Point").expression = "hasParent ? parent.transform.anchorPoint : value;";
            xform.property("ADBE Scale").setValue([100, 100]);

            var hasOutro = !!box.outro;
            var holdTime = (typeof box.holdTime === "number" && box.holdTime > 0) ? box.holdTime : 1.2;
            var isSequential = !!box.sequential;
            var boxDelay = (isSequential && totalBoxes > 1) ? (k * 0.22) : 0;
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
                shapeLayer: shapeLayer,
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

            if (styleRecipe && styleRecipe.setupLayer) {
                styleRecipe.setupLayer(shapeLayer, ctx);
            } else {
                xform.property("ADBE Rotate Z").setValue(0);
                shapeLayer.blendingMode = BlendingMode.NORMAL;
            }

            // Local Effect Controls (توافقية دولية عبر الفهرس 1)
            var fx = shapeLayer.property("ADBE Effect Parade");
            var chk = fx.addProperty("ADBE Checkbox Control"); chk.name = "Use Master Controls";
            chk.property(1).setValue(0);

            var rawCol = box.color;
            var boxColor = [0.18, 0.8, 0.44, 1.0];
            if (rawCol instanceof Array && rawCol.length >= 3) {
                boxColor = [rawCol[0], rawCol[1], rawCol[2], (rawCol.length >= 4 ? rawCol[3] : 1.0)];
            } else if (typeof rawCol === "string" && rawCol.charAt(0) === "#") {
                boxColor = $._smartHighlighter.hexToRgba(rawCol);
            }

            var colFx = fx.addProperty("ADBE Color Control"); colFx.name = "Local Color";
            colFx.property(1).setValue(boxColor);

            var pXFx = fx.addProperty("ADBE Slider Control"); pXFx.name = "Local Padding X";
            pXFx.property(1).setValue(box.paddingX);

            var pYFx = fx.addProperty("ADBE Slider Control"); pYFx.name = "Local Padding Y";
            pYFx.property(1).setValue(box.paddingY);

            var offFx = fx.addProperty("ADBE Slider Control"); offFx.name = "Local Offset Y";
            offFx.property(1).setValue(0);

            var rndFx = fx.addProperty("ADBE Slider Control"); rndFx.name = "Local Roundness";
            rndFx.property(1).setValue(box.style === "pill" ? 50 : 0);

            var opacFx = fx.addProperty("ADBE Slider Control"); opacFx.name = "Local Opacity";
            opacFx.property(1).setValue(100);

            var progFx = fx.addProperty("ADBE Slider Control"); progFx.name = "Progress";
            progFx.property(1).setValue(100);

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
                // Static text layer (no typewriter animator on textLayer): animate phrase locally from comp.time
                bStart = comp.time + boxDelay;
                bEnd = bStart + 0.32;
            }
            if (bEnd <= bStart) bEnd = bStart + 0.04;

            if (boxMotion === "typewriter" && hasOutro && (!activeAnimInfo || !activeAnimInfo.hasOutro)) {
                var tExitTime = bEnd + holdTime;
                xform.property("ADBE Opacity").expression =
                    'var prog = 100; try { prog = effect("Progress")(1); } catch(eP) {}\n' +
                    'var lOp = 100; try { lOp = effect("Local Opacity")(1); } catch(eL) {}\n' +
                    'var baseOpac = (prog <= 0) ? 0 : lOp;\n' +
                    'var tExit = ' + tExitTime.toFixed(3) + ';\n' +
                    'var dExit = ' + outDur.toFixed(3) + ';\n' +
                    'if (time > tExit) {\n' +
                    '    ease(time, tExit, tExit + dExit, baseOpac, 0);\n' +
                    '} else {\n' +
                    '    baseOpac;\n' +
                    '}';
            } else {
                xform.property("ADBE Opacity").expression =
                    'var prog = 100; try { prog = effect("Progress")(1); } catch(eP) {}\n' +
                    'var lOp = 100; try { lOp = effect("Local Opacity")(1); } catch(eL) {}\n' +
                    '(prog <= 0) ? 0 : lOp;';
            }

            // Motion & Timing
            if (boxMotion === "typewriter") {
                progFx.property(1).setValueAtTime(bStart, 0);
                progFx.property(1).setValueAtTime(bEnd, 100);
                try {
                    progFx.property(1).setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                    progFx.property(1).setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                } catch (eLin) {}

                var twRecipe = $._smartHighlighter.recipes.getMotion("typewriter");
                if (twRecipe && twRecipe.getProgressExpression) {
                    progFx.property(1).expression = twRecipe.getProgressExpression(ctx);
                }
            } else if (boxMotion === "pop") {
                var t1 = comp.time + boxDelay;
                var t2 = t1 + 0.26;
                progFx.property(1).setValueAtTime(t1, 0);
                progFx.property(1).setValueAtTime(t2, 100);
                if (hasOutro) {
                    var t3 = t2 + holdTime;
                    var t4 = t3 + outDur;
                    progFx.property(1).setValueAtTime(t3, 100);
                    progFx.property(1).setValueAtTime(t4, 0);
                }

                var popRecipe = $._smartHighlighter.recipes.getMotion("pop");
                if (popRecipe && popRecipe.applyTransformScale) {
                    popRecipe.applyTransformScale(xform.property("ADBE Scale"), ctx);
                }
            } else if (boxMotion === "snap") {
                var t1 = comp.time + boxDelay;
                var t2 = t1 + 0.04;
                progFx.property(1).setValueAtTime(t1, 0);
                progFx.property(1).setValueAtTime(t2, 100);
                if (hasOutro) {
                    var t3 = t2 + holdTime;
                    var t4 = t3 + 0.04;
                    progFx.property(1).setValueAtTime(t3, 100);
                    progFx.property(1).setValueAtTime(t4, 0);
                }
            } else {
                // Smooth Vox Wipe: punchy attack, luxurious deceleration
                var t1 = comp.time + boxDelay;
                var t2 = t1 + 0.32;
                progFx.property(1).setValueAtTime(t1, 0);
                progFx.property(1).setValueAtTime(t2, 100);
                var easePunch = new KeyframeEase(0, 25);
                var easeDecel = new KeyframeEase(0, 80);
                progFx.property(1).setTemporalEaseAtKey(1, [easePunch], [easePunch]);
                progFx.property(1).setTemporalEaseAtKey(2, [easeDecel], [easeDecel]);

                if (hasOutro) {
                    var t3 = t2 + holdTime;
                    var t4 = t3 + 0.28;
                    progFx.property(1).setValueAtTime(t3, 100);
                    progFx.property(1).setValueAtTime(t4, 0);
                    var easeOutIn = new KeyframeEase(0, 30);
                    var easeOutEnd = new KeyframeEase(0, 75);
                    progFx.property(1).setTemporalEaseAtKey(3, [easeOutIn], [easeOutIn]);
                    progFx.property(1).setTemporalEaseAtKey(4, [easeOutEnd], [easeOutEnd]);
                }
            }

            // Vectors Group
            var contents = shapeLayer.property("ADBE Root Vectors Group");
            var group = contents.addProperty("ADBE Vector Group");
            group.name = "Phrase Group";
            var gContents = group.property("ADBE Vectors Group");

            var rect = gContents.addProperty("ADBE Vector Shape - Rect");
            rect.name = "Box";

            // Size expression (delegated to style recipe)
            if (styleRecipe && styleRecipe.getSizeExpression) {
                rect.property("ADBE Vector Rect Size").expression = styleRecipe.getSizeExpression(ctx);
            }

            // Position expression (delegated to style recipe)
            if (styleRecipe && styleRecipe.getPositionExpression) {
                rect.property("ADBE Vector Rect Position").expression = styleRecipe.getPositionExpression(ctx);
            }

            // Roundness (Safely clamped so it never exceeds half-height)
            rect.property("ADBE Vector Rect Roundness").expression =
                'var pLayer = hasParent ? parent : null;\n' +
                'var useM = 0; try { useM = effect("Use Master Controls")(1); } catch(eM) {}\n' +
                'var r = (useM == 1 && pLayer && pLayer.effect("Master Roundness")) ? pLayer.effect("Master Roundness")(1) : effect("Local Roundness")(1);\n' +
                'var sz = thisProperty.propertyGroup(1).size;\n' +
                'Math.min(Math.max(0, r), Math.min(sz[0], sz[1]) / 2);';

            // Graphic: Fill vs Outline (delegated to style recipe)
            if (styleRecipe && styleRecipe.buildGraphics) {
                styleRecipe.buildGraphics(gContents, ctx);
            }
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
        try { rawTextContent = textLayer.property("Source Text").value.text; } catch (eSrc) {}

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

var SMART_HL_TAGMANAGER_LOADED = true;