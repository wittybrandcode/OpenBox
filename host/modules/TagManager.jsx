/**
 * OPENBOX - Host Engine
 * Module: TagManager.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * Manages tagged word parsing ([word], *word*, {word}), word stripping,
 * and multi-mode target box resolution (lines, tagged keywords, karaoke words).
 */

// Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„ÙƒÙ„Ù…Ø§Øª ÙˆØ§Ù„Ø¹Ø¨Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø­Ø§Ø·Ø© Ø¨Ø§Ù„Ø£Ù‚ÙˆØ§Ø³ Ø£Ùˆ Ø§Ù„ÙˆØ³ÙˆÙ… [Ø¹Ø¨Ø§Ø±Ø©] Ø£Ùˆ *Ø¹Ø¨Ø§Ø±Ø©* Ø£Ùˆ {Ø¹Ø¨Ø§Ø±Ø©}
// ÙŠØ¯Ø¹Ù… Ø§Ù…ØªØ¯Ø§Ø¯ Ø§Ù„Ø¹Ø¨Ø§Ø±Ø§Øª Ø¹Ø¨Ø± Ø§Ù„Ø£Ø³Ø·Ø± Ø§Ù„Ù…ØªØ¹Ø¯Ø¯Ø© (Multi-line Tagged Phrases)
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

// ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ù†Øµ Ù…Ù† Ø£Ù‚ÙˆØ§Ø³ Ø§Ù„ÙˆØ³ÙˆÙ… Ù„Ø¹Ø±Ø¶Ù‡ Ø¨Ø´ÙƒÙ„ Ø·Ø¨ÙŠØ¹ÙŠ
$._smartHighlighter.stripTags = function (text) {
    if (!text) return "";
    return text.replace(/\[([^\]]+)\]/g, "$1")
               .replace(/\*([^\*]+)\*/g, "$1")
               .replace(/\{([^\}]+)\}/g, "$1");
};

// Ù‚ÙŠØ§Ø³ ÙˆØ§Ø³ØªØ®Ø±Ø§Ø¬ Ø£Ø¨Ø¹Ø§Ø¯ ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„ØªØ¸Ù„ÙŠÙ„ Ø³ÙˆØ§Ø¡ Ù„Ù„Ø£Ø³Ø·Ø± Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø£Ùˆ Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©
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

    if (mode === "lines") {
        for (var k = 0; k < scan.numLines; k++) {
            var ld = scan.linesData[k];
            var rtl_k = isCenter ? false : ((data.direction === "auto") ? (scan.isJustified ? (scan.justifyType === "right") : $._smartHighlighter.lineIsRTL(ld.text, fallbackRTL)) : (data.direction === "rtl"));
            var cStart = (typeof ld.charStart === "number") ? ld.charStart : 0;
            var cEnd = (typeof ld.charEnd === "number") ? ld.charEnd : (cStart + ld.text.length);

            // Ø¶Ù…Ø§Ù† Ø§ØµØ·ÙØ§Ù Ø¹Ù…ÙˆØ¯ÙŠ Ù…Ø³ØªÙ‚ÙŠÙ… 100% Ù„Ø¨Ø¯Ø§ÙŠØ§Øª Ø§Ù„Ø£Ø³Ø·Ø± (Flush Vertical Alignment for Start Side):
            // ÙÙŠ Ù†Ù…Ø· Ø§Ù„Ø£Ø³Ø·Ø±ØŒ ÙŠØ¬Ø¨ Ø£Ù† ØªØµØ·Ù Ø¨Ø¯Ø§ÙŠØ§Øª Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ø§ÙˆÙŠØ§Øª Ø¹Ù„Ù‰ Ø®Ø· Ø¹Ù…ÙˆØ¯ÙŠ ÙˆØ§Ø­Ø¯ ÙƒØ§Ù„Ù…Ø³Ø·Ø±Ø© Ø¯ÙˆÙ† Ø£ÙŠ ØªØ¹Ø±Ø¬ Ù†Ø§ØªØ¬ Ø¹Ù† Ù‡ÙˆØ§Ù…Ø´ Ø§Ù„Ø­Ø±ÙˆÙ
            // Ø¨ÙŠÙ†Ù…Ø§ ØªØ¸Ù„ Ù†Ù‡Ø§ÙŠØ§Øª Ø§Ù„Ø£Ø³Ø·Ø± Ø­Ø±Ø© ÙˆØ¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠØ© ÙˆÙÙ‚Ø§Ù‹ Ù„Ø·ÙˆÙ„ ÙˆÙƒÙ„Ù…Ø§Øª ÙƒÙ„ Ø³Ø·Ø±
            var boxWidth = ld.width;
            var lOff = (typeof ld.leftOffset === "number") ? ld.leftOffset : 0;
            var rOff = (typeof ld.rightOffset === "number") ? ld.rightOffset : 0;
            var cOff = (typeof ld.centerOffset === "number") ? ld.centerOffset : 0;
            var lineCOffsets = (ld.cOffsets && ld.cOffsets.length > 0) ? ld.cOffsets.slice(0) : [];
            var lineWOffsets = (ld.wOffsets && ld.wOffsets.length > 0) ? ld.wOffsets.slice(0) : [];

            if (!isCenter) {
                if (scan.isJustified) {
                    if (scan.isJustifyFullAll || !ld.isLastOfPara) {
                        // Ø£Ø³Ø·Ø± ÙƒØ§Ù…Ù„Ø© Ø§Ù„Ø¶Ø¨Ø·: Ø§Ù„Ø¹Ø±Ø¶ ÙŠÙ…Ù„Ø£ Ø§Ù„ÙÙ‚Ø±Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŒ ÙˆØ§Ù„Ø¨Ø¯Ø§ÙŠØ© ÙˆØ§Ù„Ù†Ù‡Ø§ÙŠØ© Ø®Ø· Ù…Ø³ØªÙ‚ÙŠÙ…
                        lOff = 0;
                        rOff = 0;
                        boxWidth = scan.fullW;
                    } else if (scan.justifyType === "right" || rtl_k) {
                        // Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ø£Ø®ÙŠØ± Ù…Ø¶Ø¨ÙˆØ· Ù„Ù„ÙŠÙ…ÙŠÙ†: Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© (Ø§Ù„ÙŠÙ…ÙŠÙ†) Ù…Ø³ØªÙ‚ÙŠÙ…Ø© ÙƒØ§Ù„Ù…Ø³Ø·Ø±Ø©
                        if (rOff > 0) {
                            boxWidth = Math.round((boxWidth + rOff) * 10) / 10;
                            if (lineCOffsets.length > 0) {
                                for (var coR = 0; coR < lineCOffsets.length; coR++) {
                                    lineCOffsets[coR] = Math.round((lineCOffsets[coR] + rOff) * 10) / 10;
                                }
                            }
                            if (lineWOffsets.length > 0) {
                                for (var woR = 0; woR < lineWOffsets.length; woR++) {
                                    lineWOffsets[woR] = Math.round((lineWOffsets[woR] + rOff) * 10) / 10;
                                }
                            }
                            rOff = 0;
                        }
                    } else if (scan.justifyType === "center") {
                        // Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ø£Ø®ÙŠØ± Ù…ÙˆØ³Ø·
                    } else {
                        // Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ø£Ø®ÙŠØ± Ù…Ø¶Ø¨ÙˆØ· Ù„Ù„ÙŠØ³Ø§Ø±: Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© (Ø§Ù„ÙŠØ³Ø§Ø±) Ù…Ø³ØªÙ‚ÙŠÙ…Ø© ÙƒØ§Ù„Ù…Ø³Ø·Ø±Ø©
                        if (lOff > 0) {
                            boxWidth = Math.round((boxWidth + lOff) * 10) / 10;
                            if (lineCOffsets.length > 0) {
                                for (var coL = 0; coL < lineCOffsets.length; coL++) {
                                    lineCOffsets[coL] = Math.round((lineCOffsets[coL] + lOff) * 10) / 10;
                                }
                            }
                            if (lineWOffsets.length > 0) {
                                for (var woL = 0; woL < lineWOffsets.length; woL++) {
                                    lineWOffsets[woL] = Math.round((lineWOffsets[woL] + lOff) * 10) / 10;
                                }
                            }
                            lOff = 0;
                        }
                    }
                } else if (rtl_k) {
                    // RTL (Ø¹Ø±Ø¨ÙŠ): Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø£Ø³Ø·Ø± Ù…Ù† Ø¬Ù‡Ø© Ø§Ù„ÙŠÙ…ÙŠÙ†ØŒ ØªØ´ÙƒÙ„ Ø®Ø·Ø§Ù‹ Ø¹Ù…ÙˆØ¯ÙŠØ§Ù‹ Ù…Ø³ØªÙ‚ÙŠÙ…Ø§Ù‹ 100%
                    if (rOff > 0) {
                        boxWidth = Math.round((boxWidth + rOff) * 10) / 10;
                        if (lineCOffsets.length > 0) {
                            for (var coR2 = 0; coR2 < lineCOffsets.length; coR2++) {
                                lineCOffsets[coR2] = Math.round((lineCOffsets[coR2] + rOff) * 10) / 10;
                            }
                        }
                        if (lineWOffsets.length > 0) {
                            for (var woR2 = 0; woR2 < lineWOffsets.length; woR2++) {
                                lineWOffsets[woR2] = Math.round((lineWOffsets[woR2] + rOff) * 10) / 10;
                            }
                        }
                        rOff = 0;
                    }
                } else {
                    // LTR (Ù„Ø§ØªÙŠÙ†ÙŠ): Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø£Ø³Ø·Ø± Ù…Ù† Ø¬Ù‡Ø© Ø§Ù„ÙŠØ³Ø§Ø±ØŒ ØªØ´ÙƒÙ„ Ø®Ø·Ø§Ù‹ Ø¹Ù…ÙˆØ¯ÙŠØ§Ù‹ Ù…Ø³ØªÙ‚ÙŠÙ…Ø§Ù‹ 100%
                    if (lOff > 0) {
                        boxWidth = Math.round((boxWidth + lOff) * 10) / 10;
                        if (lineCOffsets.length > 0) {
                            for (var coL2 = 0; coL2 < lineCOffsets.length; coL2++) {
                                lineCOffsets[coL2] = Math.round((lineCOffsets[coL2] + lOff) * 10) / 10;
                            }
                        }
                        if (lineWOffsets.length > 0) {
                            for (var woL2 = 0; woL2 < lineWOffsets.length; woL2++) {
                                lineWOffsets[woL2] = Math.round((lineWOffsets[woL2] + lOff) * 10) / 10;
                            }
                        }
                        lOff = 0;
                    }
                }
            }

            boxesData.push({
                boxIndex: k,
                lineIndex: k,
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
                name: textLayer.name + " - [Line " + (k + 1) + "]",
                cOffsets: lineCOffsets,
                wOffsets: lineWOffsets,
                wordStart: (typeof ld.wordStart === "number") ? ld.wordStart : 0,
                wordEnd: (typeof ld.wordEnd === "number") ? ld.wordEnd : 0
            });
        }
    } else {
        // Ù†Ù…Ø· Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ© (Tagged Words) Ø£Ùˆ ÙƒØ§Ø±ÙŠÙˆÙƒÙŠ ÙƒÙ„ Ø§Ù„ÙƒÙ„Ù…Ø§Øª (Words Mode)
        var tempWord = null;
        try {
            tempWord = textLayer.duplicate();
            tempWord.name = $._smartHighlighter.SCAN_TEMP_WORDS;
            tempWord.enabled = true;
            tempWord.guideLayer = true;

            var setTempWordText = function (str) {
                try {
                    var wd = tempWord.property("Source Text").value;
                    wd.text = str;
                    tempWord.property("Source Text").setValue(wd);
                } catch (eWd) {
                    try { tempWord.property("Source Text").setValue(str); } catch (eWd2) {}
                }
            };

            for (var lIdx = 0; lIdx < scan.numLines; lIdx++) {
                var lineObj = scan.linesData[lIdx];
                var lText = lineObj.text;
                var rtl_line = isCenter ? false : ((data.direction === "auto") ? (scan.isJustified ? (scan.justifyType === "right") : $._smartHighlighter.lineIsRTL(lText, fallbackRTL)) : (data.direction === "rtl"));

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

                    var wOffset = Math.max(0, rUpTo.width - rWord.width);
                    var finalWordW = rWord.width;
                    var finalWordH = Math.max(rWord.height, lineObj.height * 0.9);

                    var wordCharStart = (typeof lineObj.charStart === "number") ? (lineObj.charStart + item.charIdx) : item.charIdx;
                    var wordCharEnd = wordCharStart + item.phrase.length;

                    // Ù‚ÙŠØ§Ø³ Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ© Ø§Ù„Ø¯Ù‚ÙŠÙ‚Ø© Ù„Ù„ÙƒÙ„Ù…Ø© (Exact cumulative character offsets for word)
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

                    boxesData.push({
                        boxIndex: boxesData.length,
                        lineIndex: lIdx,
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

    // Ø¥Ø°Ø§ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø£ÙŠ ÙƒÙ„Ù…Ø§Øª ÙÙŠ Ù†Ù…Ø· taggedØŒ Ù†ØªØ±Ø§Ø¬Ø¹ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù„Ù†Ù…Ø· Ø§Ù„Ø£Ø³Ø·Ø±
    if (boxesData.length === 0) {
        mode = "lines";
        for (var k2 = 0; k2 < scan.numLines; k2++) {
            var ld2 = scan.linesData[k2];
            var rtl_k2 = isCenter ? false : ((data.direction === "auto") ? (scan.isJustified ? (scan.justifyType === "right") : $._smartHighlighter.lineIsRTL(ld2.text, fallbackRTL)) : (data.direction === "rtl"));
            var cStart2 = (typeof ld2.charStart === "number") ? ld2.charStart : 0;
            var cEnd2 = (typeof ld2.charEnd === "number") ? ld2.charEnd : (cStart2 + ld2.text.length);
            boxesData.push({
                boxIndex: k2,
                lineIndex: k2,
                text: ld2.text,
                width: ld2.width,
                height: ld2.height,
                lineH: ld2.height,
                lineTop: ld2.top,
                charStart: cStart2,
                charEnd: cEnd2,
                totalChars: scan.fullText.length,
                isWord: false,
                wordOffset: 0,
                lineWidth: ld2.width,
                rtl_k: rtl_k2,
                name: textLayer.name + " - [Line " + (k2 + 1) + "]",
                cOffsets: ld2.cOffsets || [],
                wOffsets: ld2.wOffsets || [],
                wordStart: (typeof ld2.wordStart === "number") ? ld2.wordStart : 0,
                wordEnd: (typeof ld2.wordEnd === "number") ? ld2.wordEnd : 0
            });
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
                textLayer = comp.layer(pName);
            }
        }
        if (!textLayer || !(textLayer instanceof TextLayer)) {
            return "ERROR: Please select a Text Layer";
        }

        var data = $._smartHighlighter.parseJSON(jsonPayloadStr);
        if (!data) return "ERROR: Invalid JSON payload";

        var textLayerIndex = textLayer.index;
        var textLayerName = textLayer.name;

        // Remove any previous phrase highlight shape layers for this text layer
        var phraseTag = "SMART_HL_PHRASE";
        for (var si = comp.numLayers; si >= 1; si--) {
            var lyr = comp.layer(si);
            if (!lyr || lyr.index === textLayerIndex) continue;
            var isParent = false;
            try {
                if (lyr.parent && (lyr.parent.index === textLayerIndex || lyr.parent.name === textLayerName || lyr.parent === textLayer)) {
                    isParent = true;
                }
            } catch (ePar) {}
            var isPhrase = (lyr.comment && lyr.comment.indexOf(phraseTag) !== -1) || (lyr.name && lyr.name.indexOf("[HL-Phrase]") !== -1);
            if (isParent && isPhrase) {
                try { lyr.remove(); } catch (eDel) {}
            }
        }

        // If no phrases passed, treat as clean clear
        if (!data.phrases || data.phrases.length === 0) {
            return "SUCCESS: Cleared phrase highlights";
        }

        // Read source text non-destructively (Source Text is NOT touched)
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

        // Create temporary text layer for subpixel phrase measurements
        var tempWord = null;
        var boxesData = [];
        try {
            tempWord = textLayer.duplicate();
            tempWord.name = $._smartHighlighter.SCAN_TEMP_WORDS;
            tempWord.enabled = true;
            tempWord.guideLayer = true;

            var setTempWordText = function (str) {
                try {
                    var wd = tempWord.property("Source Text").value;
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
                var pId = "phr_" + (new Date().getTime()) + "_" + pIdx + "_" + Math.floor(Math.random() * 1000);
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

                                var prefixUpTo = lText.substring(0, localStart + subPhrase.length);
                                setTempWordText(prefixUpTo);
                                var rUpTo = tempWord.sourceRectAtTime(comp.time, false);

                                setTempWordText(subPhrase);
                                var rWord = tempWord.sourceRectAtTime(comp.time, false);

                                var wOffset = Math.max(0, rUpTo.width - rWord.width);
                                var finalW = rWord.width;
                                var finalH = Math.max(rWord.height, lineObj.height * 0.9);

                                var wordCOffsets = [];
                                var prevWordOffW = 0;
                                var fontSpaceW = scan.fontSpaceW || 5;
                                for (var pwc = 1; pwc <= subPhrase.length; pwc++) {
                                    setTempWordText(subPhrase.substring(0, pwc));
                                    var rPWSub = tempWord.sourceRectAtTime(comp.time, false);
                                    var curPWSubW = rPWSub.width;
                                    if (/\s/.test(subPhrase.charAt(pwc - 1)) && curPWSubW <= prevWordOffW) {
                                        curPWSubW = prevWordOffW + fontSpaceW;
                                    } else {
                                        curPWSubW = Math.max(prevWordOffW, curPWSubW);
                                    }
                                    wordCOffsets.push(Math.round(curPWSubW * 10) / 10);
                                    prevWordOffW = curPWSubW;
                                }

                                var rtl_line = isCenter ? false : ((data.direction === "auto" || !data.direction) ? (scan.isJustified ? (scan.justifyType === "right") : $._smartHighlighter.lineIsRTL(lText, fallbackRTL)) : (data.direction === "rtl"));

                                boxesData.push({
                                    boxIndex: boxesData.length,
                                    lineIndex: lIdx,
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
                                    totalChars: scan.fullText.length,
                                    isWord: true,
                                    wordOffset: wOffset,
                                    lineWidth: lineObj.width,
                                    rtl_k: rtl_line,
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

        // Build Shape Layers for phrase highlight boxes
        app.beginUndoGroup("OpenBox: Apply Phrase Highlight");

        var totalBoxes = boxesData.length;
        var totalTextChars = scan.fullText.length || 1;
        var baseTotalH = scan.fullH;
        var baseFS = scan.fontSize;
        var totalLines = scan.numLines;
        var globalMotion = data.motion || "typewriter";

        var detectedAnim = (globalMotion === "typewriter") ? $._smartHighlighter.detectTextAnimator(textLayer) : null;
        var typeStartTime = (detectedAnim && detectedAnim.hasKeys) ? detectedAnim.startTime : comp.time;
        var revealUnit = data.revealUnit || "chars";
        var typeTotalDur;
        if (detectedAnim && detectedAnim.hasKeys && detectedAnim.endTime > detectedAnim.startTime) {
            typeTotalDur = detectedAnim.endTime - detectedAnim.startTime;
            if (globalMotion === "typewriter") {
                $._smartHighlighter.ensureTextTypewriter(textLayer, typeStartTime, typeStartTime + typeTotalDur, "opacity", revealUnit, false, null, null, null, false);
            }
        } else {
            typeTotalDur = 1.2;
            if (globalMotion === "typewriter") {
                $._smartHighlighter.ensureTextTypewriter(textLayer, typeStartTime, typeStartTime + typeTotalDur, "opacity", revealUnit, false, null, null, null, false);
            }
        }

        var lastLayer = textLayer;

        for (var k = 0; k < totalBoxes; k++) {
            var box = boxesData[k];
            var shapeLayer = comp.layers.addShape();
            var phraseTag = "SMART_HL_PHRASE";
            shapeLayer.name = box.name;
            shapeLayer.comment = phraseTag + "|id:" + box.phraseId + "|parent:" + textLayer.name + "|color:" + box.phraseColorHex + "|text:" + encodeURIComponent(box.phraseText) + "|cs:" + box.charStart + "|ce:" + box.charEnd;

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

            if (box.motion === "typewriter" && hasOutro) {
                var bCStartPct = (box.charStart / totalTextChars) * 100;
                var bCEndPct = (box.charEnd / totalTextChars) * 100;
                var bStartT = typeStartTime + (bCStartPct / 100) * typeTotalDur;
                var bEndT = typeStartTime + (bCEndPct / 100) * typeTotalDur;
                var tExitTime = bEndT + holdTime;
                xform.property("ADBE Opacity").expression =
                    'var prog = effect("Progress")(1);\n' +
                    'var baseOpac = (prog <= 0) ? 0 : effect("Local Opacity")(1);\n' +
                    'var tExit = ' + tExitTime.toFixed(3) + ';\n' +
                    'var dExit = ' + outDur.toFixed(3) + ';\n' +
                    'if (time > tExit) {\n' +
                    '    ease(time, tExit, tExit + dExit, baseOpac, 0);\n' +
                    '} else {\n' +
                    '    baseOpac;\n' +
                    '}';
            } else {
                xform.property("ADBE Opacity").expression =
                    'var prog = effect("Progress")(1);\n' +
                    '(prog <= 0) ? 0 : effect("Local Opacity")(1);';
            }

            var boxMotion = box.motion || globalMotion;
            var styleRecipe = $._smartHighlighter.recipes.getStyle(box.style || data.style || "box");
            var motionRecipe = $._smartHighlighter.recipes.getMotion(boxMotion || "wipe");

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
                totalWords: totalWords,
                totalChars: totalTextChars,
                baseFS: baseFS,
                baseTotalH: baseTotalH,
                isCenter: isCenter,
                timing: {
                    revealUnit: "characters",
                    cStartPct: (box.charStart / totalTextChars) * 100,
                    cEndPct: (box.charEnd / totalTextChars) * 100
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

            // Local Effect Controls (ØªÙˆØ§ÙÙ‚ÙŠØ© Ø¯ÙˆÙ„ÙŠØ© Ø¹Ø¨Ø± Ø§Ù„ÙÙ‡Ø±Ø³ 1)
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

            // Motion & Timing
            if (boxMotion === "typewriter") {
                var cStartPct = (box.charStart / totalTextChars) * 100;
                var cEndPct = (box.charEnd / totalTextChars) * 100;

                var bStart = typeStartTime + (cStartPct / 100) * typeTotalDur;
                var bEnd = typeStartTime + (cEndPct / 100) * typeTotalDur;
                if (bEnd <= bStart) bEnd = bStart + 0.04;

                progFx.property(1).setValueAtTime(bStart, 0);
                progFx.property(1).setValueAtTime(bEnd, 100);
                try {
                    progFx.property(1).setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                    progFx.property(1).setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                } catch (eLin) {}

                var progExpr =
                    'var pLayer = hasParent ? parent : null;\n' +
                    'if (!pLayer) value;\n' +
                    'var anim = null;\n' +
                    'try { anim = pLayer.text.animator("Typewriter Sync"); } catch(e) {}\n' +
                    'if (!anim) { try { anim = pLayer.text.animator("Typewriter"); } catch(e2) {} }\n' +
                    'if (anim && anim.numProperties >= 1) {\n' +
                    '    try {\n' +
                    '        var sel = anim.property("ADBE Text Selectors").property(1);\n' +
                    '        var pVal = 0;\n' +
                    '        var pStart = null; try { pStart = sel.property("ADBE Text Percent Start"); } catch(e1) { try { pStart = sel.property("Start"); } catch(e11) {} }\n' +
                    '        var pEnd = null; try { pEnd = sel.property("ADBE Text Percent End"); } catch(e2) { try { pEnd = sel.property("End"); } catch(e22) {} }\n' +
                    '        if (pStart && pStart.numKeys > 0) { pVal = pStart.value; }\n' +
                    '        else if (pEnd && pEnd.numKeys > 0) { pVal = pEnd.value; }\n' +
                    '        else if (pStart) { pVal = pStart.value; }\n' +
                    '        else if (pEnd) { pVal = pEnd.value; }\n' +
                    '        var c1 = ' + cStartPct.toFixed(4) + ';\n' +
                    '        var c2 = ' + cEndPct.toFixed(4) + ';\n' +
                    '        (pVal <= c1) ? 0 : ((pVal >= c2) ? 100 : linear(pVal, c1, c2, 0, 100));\n' +
                    '    } catch(err) { value; }\n' +
                    '} else {\n' +
                    '    value;\n' +
                    '}';
                progFx.property(1).expression = progExpr;

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

                var popExpr =
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
                xform.property("ADBE Scale").expression = popExpr;

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
 * Ø¥Ø²Ø§Ù„Ø© Ø¬Ù…ÙŠØ¹ ØµÙ†Ø§Ø¯ÙŠÙ‚ ØªØ¸Ù„ÙŠÙ„ Ø§Ù„Ø¹Ø¨Ø§Ø±Ø§Øª (Phrase Highlights) Ù…Ù† Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©
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
 * Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¹Ø¨Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø¸Ù„Ù„Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†ØµÙŠØ© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©
 * ØªØ±Ø¬Ø¹ Ù…ØµÙÙˆÙØ© JSON ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ù…Ø¹Ø±Ù ÙƒÙ„ Ø¹Ø¨Ø§Ø±Ø©ØŒ Ù†ØµÙ‡Ø§ØŒ ÙˆÙ„ÙˆÙ†Ù‡Ø§ØŒ ÙˆØ¥Ø­Ø¯Ø§Ø«ÙŠØ§ØªÙ‡Ø§
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
                        pText = decodeURIComponent(textMatch[1]);
                    } catch (eDec) {
                        pText = textMatch[1];
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
 * Ø­Ø°Ù Ø¹Ø¨Ø§Ø±Ø© Ù…Ø¸Ù„Ù„Ø© Ù…Ø­Ø¯Ø¯Ø© Ø¨Ø­Ø³Ø¨ Ù…Ø¹Ø±ÙÙ‡Ø§ Ø§Ù„ÙØ±ÙŠØ¯ Ø¯ÙˆÙ† Ø§Ù„ØªØ£Ø«ÙŠØ± Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ø¨Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø®Ø±Ù‰
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
