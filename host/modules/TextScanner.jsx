/**
 * OPENBOX - Host Engine
 * Module: TextScanner.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * High-precision Paragraph & Line Geometry Scanner:
 * Dissects visual line wraps, measures subpixel font metrics, and computes
 * exact cumulative character offsets (cOffsets) for subpixel typewriter tracking.
 */

// ÙØ­Øµ Ø£Ø³Ø·Ø± Ø§Ù„ÙÙ‚Ø±Ø© Ø¨Ø¯Ù‚Ø© ØªØ§Ù…Ø© Ù…Ø¹ Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ (ÙŠØ¯Ø¹Ù… ØªÙ…Ø±ÙŠØ± Ù†Øµ Ù†Ø¸ÙŠÙ Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
$._smartHighlighter.scanParagraph = function (textLayer, comp, optText) {
    var temp = null;
    try {
        var srcProp = textLayer.property("Source Text");
        var textDoc = srcProp.value;
        var fullText = $._smartHighlighter.stripAnchors((typeof optText === "string") ? optText : textDoc.text);
        var fontSize = textDoc.fontSize;

        // Ø§Ù„ØªÙ‚Ø§Ø· Ù…Ø­Ø§Ø°Ø§Ø© Ø§Ù„Ù†Øµ Ù…Ù† Ù„ÙˆØ­Ø© Paragraph
        var justification = null;
        try {
            justification = textDoc.justification;
        } catch (eJ) {}

        // Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØªØ­Ù…Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ø¤Ù‚Øª Ù†ØªÙŠØ¬Ø© Ø®Ø·Ø£ Ø³Ø§Ø¨Ù‚ØŒ Ù†Ø¹ÙŠØ¯ ØªØ³Ù…ÙŠØªÙ‡Ø§ ÙÙˆØ±Ø§Ù‹ Ù„Ø­Ù…Ø§ÙŠØªÙ‡Ø§
        if (textLayer.name === $._smartHighlighter.SCAN_TEMP_ENGINE) {
            textLayer.name = "Highlight Text";
        }

        // ØªÙ†Ø¸ÙŠÙ Ø£ÙŠ Ø·Ø¨Ù‚Ø§Øª ÙØ­Øµ Ù…Ø¤Ù‚ØªØ© Ù‚Ø¯ÙŠÙ…Ø© Ø¹Ø§Ù„Ù‚Ø© Ù…Ø¹ Ø§Ø³ØªØ«Ù†Ø§Ø¡ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø§Ù„Ø£ØµÙ„ÙŠØ© Ù‚Ø·Ø¹Ø§Ù‹
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
        temp.enabled = true; // ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ù…ÙØ¹Ù„Ø© Ù„ÙŠØªÙ…ÙƒÙ† After Effects Ù…Ù† Ø­Ø³Ø§Ø¨ Ø£Ø¨Ø¹Ø§Ø¯ sourceRectAtTime
        temp.guideLayer = true; // Ø·Ø¨Ù‚Ø© Ø¥Ø±Ø´Ø§Ø¯ÙŠØ© Ù„Ø§ ØªØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø´Ù‡Ø¯ Ø£Ùˆ Ø§Ù„Ø±ÙŠÙ†Ø¯Ø±

        // Ø¯Ø§Ù„Ø© Ù…Ø³Ø§Ø¹Ø¯Ø© Ù„ØªØ­Ø¯ÙŠØ« Ù†Øµ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø¤Ù‚ØªØ© Ù…Ø¹ Ø§Ù„Ø­ÙØ§Ø¸ Ø§Ù„ØªØ§Ù… 100% Ø¹Ù„Ù‰ ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø®Ø· ÙˆØ§Ù„Ù…Ø­Ø§Ø°Ø§Ø© ÙˆØ§Ù„ØªØ¨Ø§Ø¹Ø¯
        var setTempText = function (str) {
            try {
                var d = temp.property("Source Text").value;
                d.text = str;
                temp.property("Source Text").setValue(d);
            } catch (eDoc) {
                try { temp.property("Source Text").setValue(str); } catch (eRaw) {}
            }
        };

        // Ù‚ÙŠØ§Ø³ Ø§Ù„Ø§Ø±ØªÙØ§Ø¹ Ø§Ù„Ù…Ø±Ø¬Ø¹ÙŠ Ù„Ù„Ø³Ø·Ø± Ø¨Ø¹ÙŠÙ†Ø© Ù‚ÙŠØ§Ø³ÙŠØ© Ø´Ø§Ù…Ù„Ø© (Ø£Ø­Ø±Ù Ø¹Ù„ÙˆÙŠØ© ÙˆØ³ÙÙ„ÙŠØ© ÙˆØ¹Ø±Ø¨ÙŠØ© ÙˆØ£Ø±Ù‚Ø§Ù…)
        setTempText("AgÃ‰ÙŠÙ€1");
        var sampleR = temp.sourceRectAtTime(comp.time, false);
        var refLineH = Math.max(sampleR.height, fontSize * 1.15);
        if (refLineH <= 0) refLineH = Math.max(fontSize, 24);

        var wrapThreshold = refLineH * 0.55;

        var rawParagraphs = fullText.split(/\r\n|[\r\n\u0003]/);
        var visualLines = [];

        for (var p = 0; p < rawParagraphs.length; p++) {
            var para = rawParagraphs[p];
            if (para.replace(/\s/g, "").length === 0) continue;

            var words = para.match(/\S+|\s+/g) || [];
            if (words.length === 0) continue;

            var curLine = "";
            setTempText(words[0]);
            var prevH = temp.sourceRectAtTime(comp.time, false).height;

            for (var w = 0; w < words.length; w++) {
                var token = words[w];
                var testStr = curLine + token;
                setTempText(testStr);
                var r = temp.sourceRectAtTime(comp.time, false);

                if (r.height > prevH + wrapThreshold && curLine.replace(/\s/g, "").length > 0) {
                    visualLines.push({
                        text: curLine.replace(/\s+$/, ""),
                        isLastOfPara: false
                    });
                    curLine = token.replace(/^\s+/, "");
                    setTempText(curLine);
                    prevH = temp.sourceRectAtTime(comp.time, false).height;
                } else {
                    curLine = testStr;
                    prevH = r.height;
                }
            }
            if (curLine.replace(/\s/g, "").length > 0) {
                visualLines.push({
                    text: curLine.replace(/\s+$/, ""),
                    isLastOfPara: true
                });
            }
        }

        var numLines = visualLines.length;
        if (numLines === 0) {
            return null;
        }

        // ÙØ­Øµ Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ù†Øµ Ù…Ø¶Ø¨ÙˆØ·Ø§Ù‹ (Justified)
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

        setTempText(visualLines[0].text);
        var rFirst = temp.sourceRectAtTime(comp.time, false);

        setTempText(fullText);
        var rFull = temp.sourceRectAtTime(comp.time, false);

        // Ù‚ÙŠØ§Ø³ Ø¹Ø±Ø¶ Ø§Ù„Ù…Ø³Ø§ÙØ© Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„Ø®Ø· (Exact font space width)
        setTempText("n n");
        var rWS = temp.sourceRectAtTime(comp.time, false).width;
        setTempText("nn");
        var rNS = temp.sourceRectAtTime(comp.time, false).width;
        var fontSpaceW = Math.max(2, rWS - rNS);

        var linesData = [];
        for (var i = 0; i < numLines; i++) {
            var lineObj = visualLines[i];
            setTempText(lineObj.text);
            var rLine = temp.sourceRectAtTime(comp.time, false);

            var finalW = rLine.width;
            if (isJustified) {
                // ÙÙŠ Ø§Ù„Ù†Øµ Ø§Ù„Ù…Ø¶Ø¨ÙˆØ·: Ø§Ù„Ø³Ø·ÙˆØ± Ø§Ù„Ù…Ù…ØªØ¯Ø© (ØºÙŠØ± Ø§Ù„Ø£Ø®ÙŠØ±Ø©) ØªØ£Ø®Ø° Ø¹Ø±Ø¶ Ø§Ù„ÙÙ‚Ø±Ø© Ø§Ù„ÙƒØ§Ù…Ù„ rFull.width
                if (isJustifyFullAll || !lineObj.isLastOfPara) {
                    finalW = rFull.width;
                }
            }

            // Ù‚ÙŠØ§Ø³ Ø§Ù„Ø¹Ø±Ø¶ Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ Ø¨Ø§Ù„Ø¨ÙŠÙƒØ³Ù„ Ù„ÙƒÙ„ Ø­Ø±Ù (Exact Cumulative Character Offsets)
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

            // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø³Ø·Ø± Ù…Ø¶Ø¨ÙˆØ·Ø§Ù‹ ÙˆÙ„Ù‡ Ø¹Ø±Ø¶ Ù†Ù‡Ø§Ø¦ÙŠ Ø£ÙƒØ¨Ø±ØŒ Ù†Ø¶Ø¨Ø· Ø§Ù„Ù†Ø³Ø¨Ø© Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ© Ù„Ù„Ø­Ø±ÙˆÙ Ù„ØªØµÙ„ Ù„Ù€ finalW
            if (isJustified && finalW > 0 && cOffsets.length > 0 && prevOffW > 0 && Math.abs(finalW - prevOffW) > 1) {
                var justRatio = finalW / prevOffW;
                for (var jc = 0; jc < cOffsets.length; jc++) {
                    cOffsets[jc] = Math.round(cOffsets[jc] * justRatio * 10) / 10;
                }
            }

            // Ø­Ø³Ø§Ø¨ Ø¥Ø²Ø§Ø­Ø§Øª Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø¯Ù‚ÙŠÙ‚Ø© Ù„ØªØ²Ø§Ù…Ù† Ø§Ù„ÙƒÙ„Ù…Ø§Øª (Word Offsets)
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
            }

            // Ù‚ÙŠØ§Ø³ Ø§Ù„Ø¥Ø²Ø§Ø­Ø§Øª Ø§Ù„Ø£ÙÙ‚ÙŠØ© Ø§Ù„Ø¯Ù‚ÙŠÙ‚Ø© Ù„Ù„Ø³Ø·Ø± Ù†Ø³Ø¨Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø¹Ø§Ù…Ø© Ù„Ù„ÙÙ‚Ø±Ø©
            // Exact per-line horizontal offsets relative to paragraph bounding box
            var rFullRight = rFull.left + rFull.width;
            var rLineRight = rLine.left + rLine.width;
            var lineRightOffset = Math.max(0, Math.round((rFullRight - rLineRight) * 10) / 10);
            var lineLeftOffset = Math.max(0, Math.round((rLine.left - rFull.left) * 10) / 10);
            var lineCenterOffset = Math.round(((rLine.left + rLine.width / 2) - (rFull.left + rFull.width / 2)) * 10) / 10;

            linesData.push({
                lineIndex: i,
                text: lineObj.text,
                width: finalW,
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

        // ØªÙˆØ²ÙŠØ¹ Ù‚Ù…Ù… Ø§Ù„Ø£Ø³Ø·Ø± Ø¨ØªÙ†Ø§Ø³Ù‚ Ù‡Ù†Ø¯Ø³ÙŠ Ù…ÙˆØ­Ø¯ Ø£Ùˆ Ù‚ÙŠØ§Ø³ Ø§Ù„Ù…ÙˆØ¶Ø¹ Ø§Ù„ÙØ¹Ù„ÙŠ Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ ÙÙˆØ§ØµÙ„
        var linePitch = (numLines > 1) ? ((rFull.height - refLineH) / (numLines - 1)) : 0;
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

            linesData[t].top = Math.round((t * linePitch) * 10) / 10;

            // ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ù„Ù„Ø³Ø·Ø± (wordStart Ùˆ wordEnd)
            linesData[t].wordStart = totalWords;
            var numWordsInLine = (linesData[t].wOffsets) ? linesData[t].wOffsets.length : 1;
            linesData[t].wordEnd = totalWords + numWordsInLine;
            totalWords += numWordsInLine;
        }
        if (totalWords <= 0) totalWords = 1;

        $._smartHighlighter.log("scan: " + numLines + " lines, " + totalWords + " words, isJustified=" + isJustified + " (" + justifyType + "), fullW=" + rFull.width.toFixed(1) + ", refH=" + refLineH.toFixed(1));

        return {
            linesData: linesData,
            numLines: numLines,
            numWords: totalWords,
            singleH: refLineH,
            fullH: rFull.height,
            fullW: rFull.width,
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
        // Ø¶Ù…Ø§Ù† Ø§Ù„Ø­Ø°Ù Ø§Ù„ÙÙˆØ±ÙŠ Ù„Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø¤Ù‚ØªØ©
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
