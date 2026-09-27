/**
 * OPENBOX - Host Engine
 * Module: HighlightBuilder.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * Core Shape Layer Generator:
 * Builds shape layers, links dual-control (Master/Local) expressions,
 * injects subpixel character-tracking width calculations, and handles removal.
 */

// Ø§Ù„Ø¯Ø§Ù„Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ù„Ø¥Ù†Ø´Ø§Ø¡ ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª
$._smartHighlighter.createHighlight = function (jsonPayloadStr, _isSync, _preBoxes, _preMeta) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "ERROR: ÙŠØ±Ø¬Ù‰ ÙØªØ­ ØªØ±ÙƒÙŠØ¨Ø© (Composition) Ø£ÙˆÙ„Ø§Ù‹.";
    }
    if (comp.selectedLayers.length !== 1) {
        return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© ÙˆØ§Ø­Ø¯Ø© (Text Layer Ø£Ùˆ Shape Layer).";
    }

    var sel = comp.selectedLayers[0];
    var textLayer = (sel instanceof TextLayer) ? sel : ((sel instanceof ShapeLayer && sel.parent && sel.parent instanceof TextLayer) ? sel.parent : null);
    if (!textLayer) {
        return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© Ù†Øµ ÙˆØ§Ø­Ø¯Ø© (Text Layer) Ø£Ùˆ Ø·Ø¨Ù‚Ø© ØªØ¸Ù„ÙŠÙ„ Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡Ø§.";
    }
    var data = $._smartHighlighter.parseJSON(jsonPayloadStr);
    if (!data) return "ERROR: Ø®Ø·Ø£ ÙÙŠ ØµÙŠØ§ØºØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª.";

    // Ø¥Ù†Ù‡Ø§Ø¡ Ø£ÙŠ ØªØ­Ø±ÙŠØ± Ù†ØµÙŠ Ù†Ø´Ø· Ø¨Ø³Ù„Ø§Ø³Ø© ÙˆØ§Ù„Ø¹ÙˆØ¯Ø© Ù„Ø£Ø¯Ø§Ø© Ø§Ù„ØªØ­Ø¯ÙŠØ¯ Ù„Ù…Ù†Ø¹ ØªØ¹Ø§Ø±Ø¶ Ø§Ù„ØªØ±ÙƒÙŠØ² (76::59)
    try {
        if (app.toolType === ToolType.Tool_TextH || app.toolType === ToolType.Tool_TextV) {
            app.toolType = ToolType.Tool_Arrow;
        }
    } catch (eToolSwitch) {}

    app.beginUndoGroup("OpenBox: Apply");

    try {
        $._smartHighlighter.log("createHighlight START, isSync=" + !!_isSync);

        // ØªÙ†Ø¸ÙŠÙ Ø£ÙŠ Ø¹Ù„Ø§Ù…Ø§Øª Ø®ÙÙŠØ© Ù‚Ø¯ÙŠÙ…Ø© Ù…Ù† Ø§Ù„Ù†Øµ Ù„Ø¶Ù…Ø§Ù† Ø¯Ù‚Ø© Ø§Ù„ÙØ­Øµ Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ Ù…Ø¹ Ø§Ù„Ø­ÙØ§Ø¸ Ø§Ù„ØªØ§Ù… Ø¹Ù„Ù‰ Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ ÙˆØ§Ù„Ù…Ø­Ø§Ø°Ø§Ø©
        try {
            var srcP0 = textLayer.property("Source Text");
            var tDoc0 = srcP0.value;
            var strippedT0 = $._smartHighlighter.stripAnchors(tDoc0.text);
            if (strippedT0 !== tDoc0.text) {
                tDoc0.text = strippedT0;
                srcP0.setValue(tDoc0);
            }
        } catch (eCleanRaw0) {}

        var targetScan = $._smartHighlighter.scanTargetBoxes(textLayer, comp, data);
        if (!targetScan) {
            return "ERROR: Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ ÙØ§Ø±ØºØ© Ø£Ùˆ ØªØ¹Ø°Ø± Ù‚Ø±Ø§Ø¡ØªÙ‡Ø§.";
        }

        var scan = targetScan.scan;
        var boxesData = targetScan.boxesData;
        var totalBoxes = boxesData.length;
        var totalLines = scan.numLines;
        var baseTotalH = scan.fullH;
        var baseFS = scan.fontSize;
        var isCenter = targetScan.isCenter;
        var fallbackRTL = targetScan.fallbackRTL;

        // ØªÙ†Ø¸ÙŠÙ Ø£Ù‚ÙˆØ§Ø³ Ø§Ù„ÙˆØ³ÙˆÙ… Ù…Ù† Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù…ÙˆØ¬ÙˆØ¯Ø© ÙˆÙƒØ§Ù† Ø§Ù„Ø®ÙŠØ§Ø± Ù…ÙØ¹Ù„Ø§Ù‹
        if (targetScan.hasTags && data.stripTags !== false) {
            try {
                var curT = textLayer.property("Source Text").value.text;
                if (curT !== targetScan.cleanText) {
                    textLayer.property("Source Text").setValue(targetScan.cleanText);
                }
            } catch (eClean) {}
        }

        // 1. Master controls on the text layer.
        var masterNotes = [];
        var initOpacity = (typeof data.opacity === "number" && !isNaN(data.opacity)) ? data.opacity : 100;

        var styleName = data.style || "box"; // "box", "pill", "marker", "underline", "outline"
        var motionName = data.motion || "wipe"; // "wipe", "pop", "snap", "typewriter"
        var revealUnit = data.revealUnit || "chars"; // "chars", "words", "lines"

        var styleRecipe = ($._smartHighlighter.recipes && $._smartHighlighter.recipes.getStyle) 
            ? $._smartHighlighter.recipes.getStyle(styleName) 
            : null;
        var motionRecipe = ($._smartHighlighter.recipes && $._smartHighlighter.recipes.getMotion) 
            ? $._smartHighlighter.recipes.getMotion(motionName) 
            : null;

        var defaultRnd = (styleRecipe && typeof styleRecipe.defaultRoundness === "number") ? styleRecipe.defaultRoundness : (styleName === "pill" ? 50 : 0);
        var initRoundness = (data.roundness !== undefined && data.roundness !== null && data.roundness !== "") ? Number(data.roundness) : defaultRnd;

        $._smartHighlighter.masterFx(textLayer, "ADBE Color Control", "Master Highlight Color", data.color, true, masterNotes);
        $._smartHighlighter.masterFx(textLayer, "ADBE Slider Control", "Master Highlight Opacity", initOpacity, true, masterNotes);
        $._smartHighlighter.masterFx(textLayer, "ADBE Slider Control", "Master Padding X", data.paddingX, true, masterNotes);
        $._smartHighlighter.masterFx(textLayer, "ADBE Slider Control", "Master Padding Y", data.paddingY, true, masterNotes);
        $._smartHighlighter.masterFx(textLayer, "ADBE Slider Control", "Master Offset Y", 0, false, masterNotes);
        $._smartHighlighter.masterFx(textLayer, "ADBE Slider Control", "Master Roundness", initRoundness, true, masterNotes);

        // Ø£Ø®Ø° Ù„Ù‚Ø·Ø© Ù…Ù† Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ù‚Ø¨Ù„ Ø­Ø°ÙÙ‡Ø§ Ù„Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØ© (Snapshot & Reconcile)
        var prevBoxes = $._smartHighlighter.snapshotBoxes(comp, textLayer);

        // ÙØ­Øµ ÙˆØ­Ø°Ù Ø£ÙŠ Ø±Ø¨Ø· Ø³Ø§Ø¨Ù‚ (Previous Highlight Layers)
        var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";
        var oldBoxesRemoved = 0;
        for (var si = comp.numLayers; si >= 1; si--) {
            var lyr = comp.layer(si);
            if (lyr && lyr !== textLayer && lyr.parent === textLayer && lyr.comment === tag) {
                try {
                    lyr.remove();
                    oldBoxesRemoved++;
                } catch(eDel) {}
            }
        }
        var hadPreviousLink = (oldBoxesRemoved > 0);
        if (hadPreviousLink) {
            $._smartHighlighter.log("Previous link detected: deleted " + oldBoxesRemoved + " old shape layer(s). Preserving custom local tweaks.");
        } else {
            $._smartHighlighter.log("No previous link: creating fresh highlight.");
        }

        // Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ù‚ÙŠÙ… Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„ØµØ±ÙŠØ­Ø© Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø¨ (Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…)
        var userInPoint = (typeof data.inPoint === "number" && !isNaN(data.inPoint) && data.inPoint >= 0) ? data.inPoint : null;
        var userOutPoint = (typeof data.outPoint === "number" && !isNaN(data.outPoint) && data.outPoint >= 0) ? data.outPoint : null;
        var userInDur = (typeof data.lineDuration === "number" && !isNaN(data.lineDuration) && data.lineDuration > 0) ? data.lineDuration : 0.35;
        var userOutDur = (typeof data.outTime === "number" && !isNaN(data.outTime) && data.outTime > 0) ? data.outTime : 0.4;

        // Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ø§Ø±ÙƒØ±Ø² Ù„Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„ØµÙˆØªÙŠØ© Ø£Ùˆ Ù…Ø§Ø±ÙƒØ±Ø² Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…Ø®ØµØµØ© Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø®ÙŠØ§Ø± Ù…ÙØ¹Ù„Ø§Ù‹
        var timingMarkers = (data.syncMarkers && $._smartHighlighter.readTimingMarkers) ? $._smartHighlighter.readTimingMarkers(textLayer) : null;
        var hasTimingMarkers = (timingMarkers && timingMarkers.inStart !== null && timingMarkers.inEnd !== null);
        var outroMismatch = (data.syncMarkers && hasTimingMarkers && ((data.outro && (timingMarkers.outStart === null || timingMarkers.outEnd === null)) || (!data.outro && timingMarkers.outStart !== null)));
        var timeMismatch = false;
        if (hasTimingMarkers && userInPoint !== null && Math.abs(timingMarkers.inStart - userInPoint) > 0.02) {
            timeMismatch = true;
        }
        if (hasTimingMarkers && userOutPoint !== null && timingMarkers.outStart !== null && Math.abs(timingMarkers.outStart - userOutPoint) > 0.02) {
            timeMismatch = true;
        }
        if (data.syncMarkers && (!hasTimingMarkers || outroMismatch || timeMismatch) && $._smartHighlighter.addTimingMarkers) {
            $._smartHighlighter.addTimingMarkers(data.inPoint, data.outPoint, data.lineDuration, data.outTime, data.outro);
            timingMarkers = $._smartHighlighter.readTimingMarkers(textLayer);
            hasTimingMarkers = (timingMarkers && timingMarkers.inStart !== null && timingMarkers.inEnd !== null);
        }
        var markerTimes = (!hasTimingMarkers && data.syncMarkers) ? $._smartHighlighter.readMarkers(textLayer, comp) : [];
        var hasMarkers = (markerTimes.length > 0);

        // Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ù…Ø· ÙˆØ§Ù„Ø­Ø±ÙƒØ©
        var lastLayer = textLayer;
        var startTime = (userInPoint !== null) ? userInPoint : comp.time;
        if (textLayer && typeof startTime === "number") {
            try {
                if (textLayer.inPoint > startTime) textLayer.inPoint = Math.max(0, startTime);
            } catch(eExtLyr) {}
        }
        var style = styleName;
        var motion = motionName;

        // Ø­Ø³Ø§Ø¨ Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„ØªÙ†Ø§Ø³Ø¨ÙŠ Ù„Ù„Ø­Ø±ÙˆÙ ÙÙŠ Ù†Ù…Ø· Typewriter Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙÙ‡Ø§Ø±Ø³ Ø§Ù„Ø·Ø¨ÙŠØ¹ÙŠØ© Ø§Ù„Ù†Ø¸ÙŠÙØ©
        var totalTextChars = (scan && scan.fullText) ? scan.fullText.length : 1;
        var totalWords = (scan && scan.numWords) ? scan.numWords : 1;
        var totalLines = (scan && scan.numLines) ? scan.numLines : totalBoxes;

        if (motionRecipe && motionRecipe.isTypewriter) {
            for (var bi = 0; bi < totalBoxes; bi++) {
                boxesData[bi].anchorStart = (typeof boxesData[bi].charStart === "number") ? boxesData[bi].charStart : 0;
                boxesData[bi].anchorEnd = (typeof boxesData[bi].charEnd === "number") ? boxesData[bi].charEnd : (boxesData[bi].anchorStart + Math.max(1, (boxesData[bi].text || "").length));
            }
        }
        if (totalTextChars <= 0) totalTextChars = 1;
        if (totalWords <= 0) totalWords = 1;
        if (totalLines <= 0) totalLines = 1;

        var detectedAnim = (motionRecipe && motionRecipe.isTypewriter) ? $._smartHighlighter.detectTextAnimator(textLayer) : null;
        var typeStartTime;
        var typeTotalDur;
        var hasTextOutro = !!data.outro;
        var textOutStart = null;
        var textOutEnd = null;

        if (data.syncMarkers && hasTimingMarkers) {
            typeStartTime = timingMarkers.inStart;
            typeTotalDur = Math.max(0.04, timingMarkers.inEnd - timingMarkers.inStart);
            if (timingMarkers.outStart !== null && timingMarkers.outEnd !== null) {
                hasTextOutro = true;
                textOutStart = timingMarkers.outStart;
                textOutEnd = timingMarkers.outEnd;
            }
        } else if (userInPoint !== null) {
            typeStartTime = userInPoint;
            typeTotalDur = Math.max(0.04, userInDur);
            if (hasTextOutro) {
                textOutStart = (userOutPoint !== null && userOutPoint > (typeStartTime + typeTotalDur))
                    ? userOutPoint
                    : ((typeStartTime + typeTotalDur) + 1.5);
                textOutEnd = textOutStart + userOutDur;
            }
        } else if (detectedAnim && detectedAnim.hasKeys && detectedAnim.endTime > detectedAnim.startTime) {
            typeStartTime = detectedAnim.startTime;
            typeTotalDur = detectedAnim.endTime - detectedAnim.startTime;
            if (hasTextOutro) {
                var holdTime = userOutDur;
                textOutStart = (typeStartTime + typeTotalDur) + holdTime;
                textOutEnd = textOutStart + userOutDur;
            }
        } else {
            typeStartTime = startTime;
            typeTotalDur = Math.max(0.04, userInDur);
            if (hasTextOutro) {
                textOutStart = (userOutPoint !== null && userOutPoint > (typeStartTime + typeTotalDur))
                    ? userOutPoint
                    : ((typeStartTime + typeTotalDur) + 1.5);
                textOutEnd = textOutStart + userOutDur;
            }
        }

        if (textLayer && hasTextOutro && typeof textOutEnd === "number") {
            try {
                if (textLayer.outPoint < textOutEnd) textLayer.outPoint = textOutEnd;
            } catch(eExtOut) {}
        }

        var textOutroOrder = data.textOutroOrder || data.outroOrder || "first";
        var boxOutroOrder = (data.syncOutro !== false) ? textOutroOrder : (data.boxOutroOrder || textOutroOrder);
        var hasOutro = !!data.animate && (!!data.outro || (hasTimingMarkers && timingMarkers.outStart !== null && timingMarkers.outEnd !== null));

        var typewriterMode = data.typewriterMode || (data.sequential ? "sequential" : "parallel") || "sequential";
        var typewriterSpeedMode = data.typewriterSpeedMode || "constant";
        var isParallel = (typewriterMode === "parallel" && (totalBoxes > 1 || (scan && scan.numLines > 1)));

        if (motionRecipe && motionRecipe.isTypewriter) {
            var animStyle = (data.typewriterStyle === "pop" || data.typewriterPop === true || motion === "pop") ? "scale" : "opacity";
            var useMarkers = !!hasTimingMarkers;
            if (motionRecipe.setupTextAnimator) {
                motionRecipe.setupTextAnimator(textLayer, typeStartTime, typeStartTime + typeTotalDur, animStyle, revealUnit, hasTextOutro, textOutStart, textOutEnd, textOutroOrder, useMarkers, typewriterMode, typewriterSpeedMode, (scan ? scan.linesData : null), totalTextChars, totalWords);
            } else {
                $._smartHighlighter.ensureTextTypewriter(textLayer, typeStartTime, typeStartTime + typeTotalDur, animStyle, revealUnit, hasTextOutro, textOutStart, textOutEnd, textOutroOrder, useMarkers, typewriterMode, typewriterSpeedMode, (scan ? scan.linesData : null), totalTextChars, totalWords);
            }
            $._smartHighlighter.log("Typewriter: setup Text Animator (" + typewriterMode + ", " + typewriterSpeedMode + ") with Intro & Outro (" + typeTotalDur.toFixed(2) + "s in, hasOutro=" + hasTextOutro + ", outStart=" + textOutStart + ", textOrder=" + textOutroOrder + ", boxOrder=" + boxOutroOrder + ", useMarkers=" + useMarkers + ")");
        } else {
            // Ø¥Ø²Ø§Ù„Ø© Ø£Ù†ÙŠÙ…ÙŠØªÙˆØ± Ø§Ù„Ø¢Ù„Ø© Ø§Ù„ÙƒØ§ØªØ¨Ø© Ø¥Ø°Ø§ ØªÙ… Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ù„Ø­Ø±ÙƒØ© Ø£Ø®Ø±Ù‰ Ø­ØªÙ‰ Ù„Ø§ ÙŠØ¸Ù„ Ø§Ù„Ù†Øµ Ù…Ø®ÙÙŠØ§Ù‹ Ø¨Ù€ Opacity = 0
            $._smartHighlighter.removeTextTypewriter(textLayer);
        }

        var typeBoxTimings = [];
        var maxUnitsInLine = 1;
        if (isParallel && typewriterSpeedMode === "constant") {
            for (var mb = 0; mb < totalBoxes; mb++) {
                var mbData = boxesData[mb];
                var uCount = 1;
                if (revealUnit === "words") {
                    uCount = (typeof mbData.wordEnd === "number" && typeof mbData.wordStart === "number") ? Math.max(1, mbData.wordEnd - mbData.wordStart) : 1;
                } else {
                    var mcs = (typeof mbData.anchorStart === "number") ? mbData.anchorStart : ((typeof mbData.charStart === "number") ? mbData.charStart : 0);
                    var mce = (typeof mbData.anchorEnd === "number") ? mbData.anchorEnd : ((typeof mbData.charEnd === "number") ? mbData.charEnd : (mcs + Math.max(1, (mbData.text || "").length)));
                    uCount = Math.max(1, mce - mcs);
                }
                if (uCount > maxUnitsInLine) maxUnitsInLine = uCount;
            }
        }

        for (var tb = 0; tb < totalBoxes; tb++) {
            var bData = boxesData[tb];
            var bStart, bEnd, bDur;
            var cStartPct = 0;
            var cEndPct = 100;

            if (revealUnit === "words" && typeof bData.wordStart === "number") {
                cStartPct = (bData.wordStart / totalWords) * 100;
                cEndPct = (bData.wordEnd / totalWords) * 100;
            } else if (revealUnit === "lines") {
                var lIdx = (typeof bData.lineIndex === "number") ? bData.lineIndex : tb;
                cStartPct = (lIdx / totalLines) * 100;
                cEndPct = ((lIdx + 1) / totalLines) * 100;
            } else {
                var cStart = (motionRecipe && motionRecipe.isTypewriter && typeof bData.anchorStart === "number") ? bData.anchorStart : ((typeof bData.charStart === "number") ? bData.charStart : 0);
                var cEnd = (motionRecipe && motionRecipe.isTypewriter && typeof bData.anchorEnd === "number") ? bData.anchorEnd : ((typeof bData.charEnd === "number") ? bData.charEnd : (cStart + Math.max(1, (bData.text || "").length)));
                cStartPct = (cStart / totalTextChars) * 100;
                cEndPct = (cEnd / totalTextChars) * 100;
            }

            if (isParallel) {
                bStart = typeStartTime;
                if (typewriterSpeedMode === "synced") {
                    bDur = typeTotalDur;
                } else {
                    var uCnt = 1;
                    if (revealUnit === "words") {
                        uCnt = (typeof bData.wordEnd === "number" && typeof bData.wordStart === "number") ? Math.max(1, bData.wordEnd - bData.wordStart) : 1;
                    } else {
                        var cs = (typeof bData.anchorStart === "number") ? bData.anchorStart : ((typeof bData.charStart === "number") ? bData.charStart : 0);
                        var ce = (typeof bData.anchorEnd === "number") ? bData.anchorEnd : ((typeof bData.charEnd === "number") ? bData.charEnd : (cs + Math.max(1, (bData.text || "").length)));
                        uCnt = Math.max(1, ce - cs);
                    }
                    bDur = Math.max(0.08, (uCnt / maxUnitsInLine) * typeTotalDur);
                }
                bEnd = bStart + bDur;
            } else {
                bStart = typeStartTime + (cStartPct / 100) * typeTotalDur;
                bEnd = typeStartTime + (cEndPct / 100) * typeTotalDur;
                if (bEnd <= bStart) bEnd = bStart + 0.04;
                bDur = (bEnd - bStart);
            }

            typeBoxTimings.push({
                start: bStart,
                end: bEnd,
                dur: bDur,
                cStartPct: cStartPct,
                cEndPct: cEndPct,
                revealUnit: revealUnit,
                anchorStart: (typeof bData.anchorStart === "number") ? bData.anchorStart : 0,
                anchorEnd: (typeof bData.anchorEnd === "number") ? bData.anchorEnd : 0
            });
        }

        for (var k = 0; k < totalBoxes; k++) {
            var box = boxesData[k];
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = box.name;
            shapeLayer.comment = tag;

            shapeLayer.moveAfter(lastLayer);
            lastLayer = shapeLayer;
            shapeLayer.parent = textLayer;

            // Context for strategy recipes
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
                timing: typeBoxTimings[k],
                boxOutroOrder: boxOutroOrder,
                textOutroOrder: textOutroOrder,
                hasOutro: hasOutro
            };

            var xform = shapeLayer.property("ADBE Transform Group");
            xform.property("ADBE Position").setValue([0, 0]);
            xform.property("ADBE Anchor Point").expression = "hasParent ? parent.transform.anchorPoint : value;";
            xform.property("ADBE Scale").setValue([100, 100]);

            var opacityCond = (motionRecipe && motionRecipe.getOpacityCondition)
                ? motionRecipe.getOpacityCondition(ctx)
                : ((motion === "typewriter" && revealUnit === "lines") ? '(prog < 50) ? 0 : baseOp;' : '(prog <= 0) ? 0 : baseOp;');

            xform.property("ADBE Opacity").expression = 
                'var pLayer = hasParent ? parent : null;\n' +
                'var useM = effect("Use Master Controls")(1);\n' +
                'var mOp = pLayer ? pLayer.effect("Master Highlight Opacity")(1) : 100;\n' +
                'var lOp = effect("Local Opacity")(1);\n' +
                'var baseOp = (useM == 1) ? mOp : lOp;\n' +
                'var prog = effect("Progress")(1);\n' +
                opacityCond;

            // Visual setup: blending mode & rotation (delegated to style recipe)
            if (styleRecipe && styleRecipe.setupLayer) {
                styleRecipe.setupLayer(shapeLayer, ctx);
            } else {
                if (style === "marker") {
                    var tilts = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.7];
                    xform.property("ADBE Rotate Z").setValue(tilts[k % tilts.length]);
                    shapeLayer.blendingMode = BlendingMode.MULTIPLY;
                } else {
                    xform.property("ADBE Rotate Z").setValue(0);
                    shapeLayer.blendingMode = BlendingMode.NORMAL;
                }
            }

            // Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø£ÙŠ ØªØ®ØµÙŠØµ Ù…Ø­Ù„ÙŠ Ø³Ø§Ø¨Ù‚ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø³Ø·Ø±/Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ (Ø¥Ù† ÙˆØ¬Ø¯)
            var prevSnap = (prevBoxes && k < prevBoxes.length) ? prevBoxes[k] : null;
            var isLocalCustom = (prevSnap && prevSnap.useMaster === 0);

            // Per-line / Per-box effect controls (ØªÙˆØ§ÙÙ‚ÙŠØ© Ø¯ÙˆÙ„ÙŠØ© Ø¹Ø¨Ø± Ø§Ù„ÙÙ‡Ø±Ø³ 1)
            var fx = shapeLayer.property("ADBE Effect Parade");
            var chk = fx.addProperty("ADBE Checkbox Control"); chk.name = "Use Master Controls";
            chk.property(1).setValue(isLocalCustom ? 0 : 1);

            var colFx = fx.addProperty("ADBE Color Control"); colFx.name = "Local Color";
            colFx.property(1).setValue((isLocalCustom && prevSnap.color) ? prevSnap.color : data.color);

            var pXFx = fx.addProperty("ADBE Slider Control"); pXFx.name = "Local Padding X";
            pXFx.property(1).setValue((isLocalCustom && prevSnap.padX !== null) ? prevSnap.padX : data.paddingX);

            var pYFx = fx.addProperty("ADBE Slider Control"); pYFx.name = "Local Padding Y";
            pYFx.property(1).setValue((isLocalCustom && prevSnap.padY !== null) ? prevSnap.padY : data.paddingY);

            var offFx = fx.addProperty("ADBE Slider Control"); offFx.name = "Local Offset Y";
            offFx.property(1).setValue((isLocalCustom && prevSnap.offY !== null) ? prevSnap.offY : 0);

            var rndFx = fx.addProperty("ADBE Slider Control"); rndFx.name = "Local Roundness";
            rndFx.property(1).setValue((isLocalCustom && prevSnap.round !== null) ? prevSnap.round : initRoundness);

            var opacFx = fx.addProperty("ADBE Slider Control"); opacFx.name = "Local Opacity";
            opacFx.property(1).setValue((isLocalCustom && prevSnap.opacity !== null && prevSnap.opacity !== undefined) ? prevSnap.opacity : initOpacity);

            var progFx = fx.addProperty("ADBE Slider Control"); progFx.name = "Progress";

            // Scale transform expression (delegated to motion recipe)
            if (motionRecipe && motionRecipe.applyTransformScale) {
                motionRecipe.applyTransformScale(xform.property("ADBE Scale"), ctx);
            }

            if (data.animate) {
                var lineDur = (motionRecipe && typeof motionRecipe.lineDur === "number")
                    ? motionRecipe.lineDur
                    : ((motion === "snap") ? 0.04 : ((data.lineDuration && data.lineDuration > 0) ? data.lineDuration : 0.35));
                var gapOrStagger = (typeof data.stagger === "number" && !isNaN(data.stagger)) ? data.stagger : 0;
                var holdTime = (typeof data.outTime === "number" && data.outTime > 0) ? data.outTime : 1.5;
                var boxDurFrac = (typeBoxTimings && typeBoxTimings[k] && typeTotalDur > 0) ? (typeBoxTimings[k].dur / typeTotalDur) : 1.0;
                var t1, t2;

                if (hasTimingMarkers && motionRecipe && motionRecipe.isTypewriter) {
                    // Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„ØªÙ†Ø§Ø³Ø¨ÙŠ Ø§Ù„Ø¯Ù‚ÙŠÙ‚ Ù„Ù„Ø­Ø±ÙˆÙ Ø¹Ø¨Ø± Ù†Ø§ÙØ°Ø© Ø§Ù„Ù…Ø§Ø±ÙƒØ±Ø²
                    var typeMarkerDur = Math.max(0.04, timingMarkers.inEnd - timingMarkers.inStart);
                    if (isParallel) {
                        t1 = timingMarkers.inStart;
                        t2 = (typewriterSpeedMode === "synced")
                            ? timingMarkers.inEnd
                            : (timingMarkers.inStart + Math.max(0.08, typeMarkerDur * boxDurFrac));
                    } else {
                        t1 = timingMarkers.inStart + ((typeBoxTimings[k].cStartPct / 100) * typeMarkerDur);
                        t2 = timingMarkers.inStart + ((typeBoxTimings[k].cEndPct / 100) * typeMarkerDur);
                    }
                    if (t2 <= t1) t2 = t1 + 0.04;
                    if (timingMarkers.outStart !== null && timingMarkers.outEnd !== null) {
                        hasOutro = true;
                    }
                } else if (hasTimingMarkers) {
                    // Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù…Ø§Ø±ÙƒØ±Ø² Ø§Ù„Ø­ÙŠØ© Ø§Ù„Ù…Ø®ØµØµØ©
                    t1 = timingMarkers.inStart + (k * gapOrStagger);
                    t2 = timingMarkers.inEnd + (k * gapOrStagger);
                    if (timingMarkers.outStart !== null && timingMarkers.outEnd !== null) {
                        hasOutro = true;
                    }
                } else if (motionRecipe && motionRecipe.isTypewriter) {
                    // Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„ØªÙ†Ø§Ø³Ø¨ÙŠ Ø§Ù„Ø¯Ù‚ÙŠÙ‚ Ù„Ù„Ø­Ø±ÙˆÙ (Character-Proportional Distribution)
                    t1 = typeBoxTimings[k].start;
                    t2 = typeBoxTimings[k].end;
                } else if (hasMarkers && k < markerTimes.length) {
                    // Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù…Ø§Ø±ÙƒØ±Ø²: Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙŠØ¨Ø¯Ø£ Ø¨Ø¯Ù‚Ø© Ø¹Ù†Ø¯ ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…Ø§Ø±ÙƒØ± Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚
                    t1 = markerTimes[k];
                    t2 = t1 + lineDur;
                } else if (hasMarkers && markerTimes.length > 0) {
                    var lastMTime = markerTimes[markerTimes.length - 1];
                    var extraIdx = k - markerTimes.length + 1;
                    t1 = lastMTime + (extraIdx * (lineDur + gapOrStagger));
                    t2 = t1 + lineDur;
                } else if (data.sequential) {
                    t1 = startTime + (k * (lineDur + gapOrStagger));
                    t2 = t1 + lineDur;
                } else {
                    t1 = startTime + (k * gapOrStagger);
                    t2 = t1 + lineDur;
                }

                progFx.property(1).setValueAtTime(t1, 0);
                progFx.property(1).setValueAtTime(t2, 100);

                if (hasTimingMarkers) {
                    var outOrder = boxOutroOrder;
                    var exitK = (outOrder === "last") ? (totalBoxes - 1 - k) : k;
                    var rS = (typeBoxTimings && typeBoxTimings[k]) ? (typeBoxTimings[k].cStartPct / 100) : 0;
                    var rE = (typeBoxTimings && typeBoxTimings[k]) ? (typeBoxTimings[k].cEndPct / 100) : 1;
                    var isType = (motionRecipe && motionRecipe.isTypewriter);
                    var exitIndex = exitK;

                    var markerExpr = 
                        "var res = value;\n" +
                        "var p = null; try { p = thisLayer.parent; } catch(e) {}\n" +
                        "if (p && p.marker && p.marker.numKeys > 0) {\n" +
                        "    var m = p.marker;\n" +
                        "    var inS = null, inE = null, outS = null, outE = null;\n" +
                        "    for (var i = 1; i <= m.numKeys; i++) {\n" +
                        "        var comm = m.key(i).comment;\n" +
                        "        var mt = m.key(i).time;\n" +
                        "        if (comm === 'HL_IN_START') inS = mt;\n" +
                        "        else if (comm === 'HL_IN_END') inE = mt;\n" +
                        "        else if (comm === 'HL_OUT_START') outS = mt;\n" +
                        "        else if (comm === 'HL_OUT_END') outE = mt;\n" +
                        "    }\n" +
                        "    if (inS !== null && inE !== null) {\n" +
                        (isType ? (
                            "        var inDur = Math.max(0.01, inE - inS);\n" +
                            (isParallel ? (
                            "        var startT = inS;\n" +
                            "        var endT = inS + (" + (typewriterSpeedMode === "synced" ? "inDur" : ("Math.max(0.08, inDur * " + boxDurFrac.toFixed(4) + ")")) + ");\n"
                            ) : (
                            "        var startT = inS + (" + rS.toFixed(4) + " * inDur);\n" +
                            "        var endT = inS + (" + rE.toFixed(4) + " * inDur);\n"
                            ))
                        ) : (
                        "        var delay = " + (k * gapOrStagger) + ";\n" +
                        "        var startT = inS + delay;\n" +
                        "        var endT = inE + delay;\n"
                        )) +
                        "        var cur = time;\n" +
                        "        if (outS !== null && outE !== null) {\n" +
                        (isType ? (
                            "            var outDur = Math.max(0.01, outE - outS);\n" +
                            (isParallel ? (
                            "            var oStartT = outS;\n" +
                            "            var oEndT = outS + (" + (typewriterSpeedMode === "synced" ? "outDur" : ("Math.max(0.08, outDur * " + boxDurFrac.toFixed(4) + ")")) + ");\n"
                            ) : (
                            (outOrder === "last" ? (
                            "            var oStartT = outS + ((1 - " + rE.toFixed(4) + ") * outDur);\n" +
                            "            var oEndT = outS + ((1 - " + rS.toFixed(4) + ") * outDur);\n"
                            ) : (
                            "            var oStartT = outS + (" + rS.toFixed(4) + " * outDur);\n" +
                            "            var oEndT = outS + (" + rE.toFixed(4) + " * outDur);\n"
                            ))
                            ))
                        ) : (
                        "            var exitDelay = " + (exitK * gapOrStagger) + ";\n" +
                        "            var oStartT = outS + exitDelay;\n" +
                        "            var oEndT = outE + exitDelay;\n"
                        )) +
                        "            if (cur < startT) res = 0;\n" +
                        "            else if (cur <= endT) res = " + (isType ? "linear" : "ease") + "(cur, startT, endT, 0, 100);\n" +
                        "            else if (cur < oStartT) res = 100;\n" +
                        "            else if (cur <= oEndT) res = " + (isType ? "linear" : "ease") + "(cur, oStartT, oEndT, 100, 0);\n" +
                        "            else res = 0;\n" +
                        "        } else {\n" +
                        "            if (cur < startT) res = 0;\n" +
                        "            else if (cur <= endT) res = " + (isType ? "linear" : "ease") + "(cur, startT, endT, 0, 100);\n" +
                        "            else res = 100;\n" +
                        "        }\n" +
                        "    }\n" +
                        "}\n" +
                        "res;";
                    progFx.property(1).expression = markerExpr;
                } else if (motionRecipe && motionRecipe.isTypewriter) {
                    try {
                        progFx.property(1).setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR);
                        progFx.property(1).setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
                    } catch(eLin) {}
                } else if (motionRecipe && motionRecipe.applyKeyframeEasing) {
                    motionRecipe.applyKeyframeEasing(progFx.property(1), 1, 2);
                } else if (motion !== "snap") {
                    var easePunch = new KeyframeEase(0, 25);
                    var easeDecel = new KeyframeEase(0, 80);
                    progFx.property(1).setTemporalEaseAtKey(1, [easePunch], [easePunch]);
                    progFx.property(1).setTemporalEaseAtKey(2, [easeDecel], [easeDecel]);
                }

                // Ø­Ø±ÙƒØ© Ø§Ù„Ø®Ø±ÙˆØ¬ (Ø§Ø®ØªÙŠØ§Ø±ÙŠØ©)
                if (hasOutro) {
                    var outroOrder = boxOutroOrder;
                    var exitIndex = (outroOrder === "last") ? (totalBoxes - 1 - k) : k;
                    var t3, t4;

                    if (motionRecipe && motionRecipe.isTypewriter) {
                        var totalOutroDur = (typeof textOutEnd === "number" && typeof textOutStart === "number" && textOutEnd > textOutStart)
                            ? (textOutEnd - textOutStart)
                            : Math.max(0.04, (data.outTime && data.outTime > 0) ? data.outTime : typeTotalDur);
                        var baseOutStart = (typeof textOutStart === "number")
                            ? textOutStart
                            : ((typeBoxTimings.length > 0 ? typeBoxTimings[typeBoxTimings.length - 1].end : (startTime + typeTotalDur)) + holdTime);

                        if (isParallel) {
                            // ÙÙŠ Ø§Ù„Ù†Ù…Ø· Ø§Ù„Ù…ØªÙˆØ§Ø²ÙŠ: ÙƒØ§ÙØ© Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ ØªØ¨Ø¯Ø£ Ø§Ù„Ø®Ø±ÙˆØ¬ Ù…Ø¹Ø§Ù‹ Ø¨Ø§Ù„ØªÙˆØ§Ø²ÙŠ Ø¹Ù†Ø¯ baseOutStart
                            t3 = baseOutStart;
                            var boxOutDur = (typewriterSpeedMode === "synced") ? totalOutroDur : Math.max(0.08, totalOutroDur * boxDurFrac);
                            t4 = baseOutStart + boxOutDur;
                        } else {
                            var rS = (typeBoxTimings && typeBoxTimings[k]) ? (typeBoxTimings[k].cStartPct / 100) : 0;
                            var rE = (typeBoxTimings && typeBoxTimings[k]) ? (typeBoxTimings[k].cEndPct / 100) : 1;

                            if (outroOrder === "last") {
                                t3 = baseOutStart + ((1 - rE) * totalOutroDur);
                                t4 = baseOutStart + ((1 - rS) * totalOutroDur);
                            } else {
                                t3 = baseOutStart + (rS * totalOutroDur);
                                t4 = baseOutStart + (rE * totalOutroDur);
                            }
                        }
                    } else if (hasTimingMarkers && timingMarkers.outStart !== null && timingMarkers.outEnd !== null) {
                        t3 = timingMarkers.outStart + (exitIndex * gapOrStagger);
                        t4 = timingMarkers.outEnd + (exitIndex * gapOrStagger);
                    } else {
                        var totalEntryFinish;
                        if (data.sequential) {
                            totalEntryFinish = startTime + (totalBoxes * lineDur) + ((totalBoxes - 1) * gapOrStagger);
                        } else {
                            totalEntryFinish = startTime + ((totalBoxes - 1) * gapOrStagger) + lineDur;
                        }

                        var exitBaseTime = (typeof data.outPoint === "number" && data.outPoint > totalEntryFinish) ? data.outPoint : (totalEntryFinish + holdTime);
                        var outroLineDur = (typeof data.outTime === "number" && data.outTime > 0) ? data.outTime : lineDur;
                        if (data.sequential) {
                            t3 = exitBaseTime + (exitIndex * (outroLineDur + gapOrStagger));
                            t4 = t3 + outroLineDur;
                        } else {
                            t3 = exitBaseTime + (exitIndex * gapOrStagger);
                            t4 = t3 + outroLineDur;
                        }
                    }

                    progFx.property(1).setValueAtTime(t3, 100);
                    progFx.property(1).setValueAtTime(t4, 0);

                    if (motionRecipe && motionRecipe.isTypewriter) {
                        try {
                            progFx.property(1).setInterpolationTypeAtKey(3, KeyframeInterpolationType.LINEAR);
                            progFx.property(1).setInterpolationTypeAtKey(4, KeyframeInterpolationType.LINEAR);
                        } catch(eLinOut) {}
                    } else if (motionRecipe && motionRecipe.applyOutroKeyframeEasing) {
                        motionRecipe.applyOutroKeyframeEasing(progFx.property(1), 3, 4);
                    } else if (motion !== "snap") {
                        var easeOutIn = new KeyframeEase(0, 30);
                        var easeOutEnd = new KeyframeEase(0, 75);
                        progFx.property(1).setTemporalEaseAtKey(3, [easeOutIn], [easeOutIn]);
                        progFx.property(1).setTemporalEaseAtKey(4, [easeOutEnd], [easeOutEnd]);
                    }
                }
            } else {
                progFx.property(1).setValue(100);
            }

            var contents = shapeLayer.property("ADBE Root Vectors Group");
            var group = contents.addProperty("ADBE Vector Group");
            group.name = "Box Group";
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

            // Roundness (Safely clamped so it never exceeds half-height, fully controllable by Master & Local)
            rect.property("ADBE Vector Rect Roundness").expression = 
                'var pLayer = hasParent ? parent : null;\n' +
                'var useM = effect("Use Master Controls")(1);\n' +
                'var r = (useM == 1 && pLayer) ? pLayer.effect("Master Roundness")(1) : effect("Local Roundness")(1);\n' +
                'var sz = thisProperty.propertyGroup(1).size;\n' +
                'Math.min(Math.max(0, r), Math.min(sz[0], sz[1]) / 2);';

            // Graphic: Fill vs Outline (delegated to style recipe)
            if (styleRecipe && styleRecipe.buildGraphics) {
                styleRecipe.buildGraphics(gContents, ctx);
            }

            $._smartHighlighter.log("  Box " + (k + 1) + " created: [" + box.text + "] w=" + box.width.toFixed(1) + " h=" + box.height.toFixed(1));
        }

        $._smartHighlighter.writeMeta(textLayer, scan);

        var unitName = (targetScan.mode === "lines") ? "line(s)" : (targetScan.mode === "tagged" ? "tagged keyword(s)" : "word(s)");
        var report = hadPreviousLink
            ? "SUCCESS: Updated highlight (" + totalBoxes + " " + unitName + ", refreshed link)."
            : "SUCCESS: Created highlight (" + totalBoxes + " " + unitName + ").";
        if (masterNotes.length > 0) report += " Note: " + masterNotes.join("; ") + ".";
        $._smartHighlighter.log("createHighlight DONE: " + report);
        return report;

    } catch (err) {
        $._smartHighlighter.log("createHighlight ERROR: " + err.toString() + " line:" + err.line);
        return "ERROR: " + err.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

// Ø¯Ø§Ù„Ø© Ø§Ù„Ø¥Ø²Ø§Ù„Ø© ÙˆØ§Ù„ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø´Ø§Ù…Ù„ (Ø­Ø°Ù Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ ÙˆØ§Ù„Ù…ØªØ­ÙƒÙ…Ø§Øª ÙˆØ§Ù„Ù…Ø§Ø±ÙƒØ±Ø² Ù…Ù† Ø§Ù„Ù†Øµ)
$._smartHighlighter.removeHighlight = function () {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERROR: Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ±ÙƒÙŠØ¨Ø© Ù…ÙØªÙˆØ­Ø©.";
    if (comp.selectedLayers.length !== 1) {
        return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø£Ùˆ Ø¥Ø­Ø¯Ù‰ Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª.";
    }

    var sel = comp.selectedLayers[0];
    var textLayer = null;
    if (sel instanceof TextLayer) {
        textLayer = sel;
    } else if (sel instanceof ShapeLayer && sel.parent && (sel.parent instanceof TextLayer)) {
        textLayer = sel.parent;
    }

    if (!textLayer) {
        return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø£Ùˆ Ø¥Ø­Ø¯Ù‰ Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡Ø§.";
    }

    app.beginUndoGroup("OpenBox: Clear All");

    try {
        var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";
        var removedBoxes = 0;

        // 1. Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø·Ø¨Ù‚Ø§Øª Ø£Ø´ÙƒØ§Ù„ Ø§Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ (Line-by-line Ùˆ Phrase Highlights)
        for (var i = comp.numLayers; i >= 1; i--) {
            var l = comp.layer(i);
            if (l && l !== textLayer && l.parent === textLayer) {
                var c = l.comment || "";
                var n = l.name || "";
                if (c === tag || c.indexOf("SMART_HL") !== -1 || n.indexOf("HL_") === 0 || n.indexOf("Highlight_") === 0 || n.indexOf("Phrase_") === 0 || n.indexOf("[HL-Phrase]") !== -1) {
                    try {
                        l.remove();
                        removedBoxes++;
                    } catch(eDelBox) {}
                }
            }
        }

        // 2. Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ù…ØªØ­ÙƒÙ…Ø§Øª ÙˆÙ…Ø¤Ø«Ø±Ø§Øª Ø§Ù„Ù…Ø§Ø³ØªØ± (Master Effects) Ù…Ù† Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ
        var fxGroup = textLayer.property("ADBE Effect Parade");
        var removedEffects = 0;
        if (fxGroup) {
            var masterNames = [
                "Master Highlight Color",
                "Master Highlight Opacity",
                "Master Padding X",
                "Master Padding Y",
                "Master Offset Y",
                "Master Roundness"
            ];
            for (var mi = 0; mi < masterNames.length; mi++) {
                try {
                    var fx = fxGroup.property(masterNames[mi]);
                    if (fx) {
                        fx.remove();
                        removedEffects++;
                    }
                } catch(eFxName) {}
            }
            // ÙØ­Øµ Ø¥Ø¶Ø§ÙÙŠ Ù„Ø£ÙŠ ØªØ£Ø«ÙŠØ±Ø§Øª Ù…ØªØ¨Ù‚ÙŠØ© ØªØ¨Ø¯Ø£ Ø¨ÙƒÙ„Ù…Ø© Master Highlight Ø£Ùˆ Master Padding Ø£Ùˆ Master Offset Ø£Ùˆ Master Roundness
            for (var fi = fxGroup.numProperties; fi >= 1; fi--) {
                try {
                    var pName = fxGroup.property(fi).name || "";
                    if (pName.indexOf("Master Highlight") === 0 ||
                        pName.indexOf("Master Padding") === 0 ||
                        pName.indexOf("Master Offset") === 0 ||
                        pName.indexOf("Master Roundness") === 0) {
                        fxGroup.property(fi).remove();
                        removedEffects++;
                    }
                } catch(eFxRest) {}
            }
        }

        // 3. Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ù…Ø§Ø±ÙƒØ±Ø² Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…Ø®ØµØµØ© Ù„Ù„Ø¥Ø¶Ø§ÙØ© Ù…Ù† Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ (HL_IN_START, HL_IN_END, HL_OUT_START, HL_OUT_END)
        var mProp = textLayer.property("ADBE Marker");
        var removedMarkers = 0;
        if (mProp && mProp.numKeys > 0) {
            for (var ki = mProp.numKeys; ki >= 1; ki--) {
                try {
                    var mComm = mProp.keyValue(ki).comment || "";
                    if (mComm.indexOf("HL_") === 0) {
                        mProp.removeKey(ki);
                        removedMarkers++;
                    }
                } catch(eMk) {}
            }
        }

        // 4. ØªÙ†Ø¸ÙŠÙ Ø£ÙŠ Text Animator Ù…Ù† Ù†ÙˆØ¹ Typewriter Sync Ø£Ùˆ Typewriter Ø£Ù†Ø´Ø£ØªÙ‡ Ø§Ù„Ø¥Ø¶Ø§ÙØ©
        $._smartHighlighter.removeTextTypewriter(textLayer);

        // 5. Ù…Ø³Ø­ Ø§Ù„Ù…ÙŠØªØ§ Ø¯Ø§ØªØ§ Ù…Ù† ØªØ¹Ù„ÙŠÙ‚ Ø§Ù„Ù†Øµ
        try {
            var cText = textLayer.comment || "";
            var a = cText.indexOf($._smartHighlighter.META_OPEN);
            var b = cText.indexOf($._smartHighlighter.META_CLOSE);
            if (a !== -1 && b !== -1 && b > a) {
                textLayer.comment = (cText.substring(0, a) + cText.substring(b + $._smartHighlighter.META_CLOSE.length)).replace(/^\s+|\s+$/g, "");
            }
        } catch (eC) {}

        // 6. ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø®ÙÙŠØ© Ø§Ù„Ø°ÙƒÙŠØ© Ù…Ù† Ø§Ù„Ù†Øµ ÙÙŠ Ø­Ø§Ù„ ÙƒØ§Ù†Øª Ù…ÙˆØ¬ÙˆØ¯Ø©
        try {
            var sProp = textLayer.property("Source Text");
            if (sProp && sProp.value) {
                var cleaned = $._smartHighlighter.stripAnchors(sProp.value.text);
                if (cleaned !== sProp.value.text) {
                    sProp.setValue(cleaned);
                }
            }
        } catch (eAnc) {}

        $._smartHighlighter.log("removeHighlight: " + removedBoxes + " boxes, " + removedEffects + " master effects, " + removedMarkers + " markers removed");
        
        var summary = [];
        if (removedBoxes > 0) summary.push(removedBoxes + " box(es)");
        if (removedEffects > 0) summary.push(removedEffects + " controller(s)");
        if (removedMarkers > 0) summary.push(removedMarkers + " marker(s)");
        
        var details = (summary.length > 0) ? summary.join(", ") : "All highlights and controls";
        return "SUCCESS: Cleared everything (" + details + " removed).";
    } catch (e) {
        $._smartHighlighter.log("removeHighlight ERROR: " + e.toString());
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

var SMART_HL_BUILDER_LOADED = true;
