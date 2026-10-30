/**
 * OPENBOX - Host Engine
 * Module: ControllerBridge.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * Manages Master & Local controls, CEP Two-Way Sync, Layer State,
 * Snapshotting & Reconciling local adjustments, and Metadata persistence.
 */

// Ø¥Ù†Ø´Ø§Ø¡ Ø£Ùˆ Ø¬Ù„Ø¨ ØªØ£Ø«ÙŠØ± Ø§Ù„Ù…Ø§Ø³ØªØ± Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø¨Ø£Ù…Ø§Ù† (ØªÙˆØ§ÙÙ‚ÙŠØ© Ù„ØºÙˆÙŠØ© Ø¯ÙˆÙ„ÙŠØ© Ø¹Ø¨Ø± Ø§Ù„ÙÙ‡Ø±Ø³ 1)
$._smartHighlighter.masterFx = function (layer, type, name, val, force, masterNotes) {
    var fx = layer.effect(name);
    if (!fx) {
        fx = layer.property("ADBE Effect Parade").addProperty(type);
        fx.name = name;
        fx.property(1).setValue(val);
        return fx;
    }
    if (val !== undefined && force) {
        var prop = fx.property(1);
        if (prop.numKeys > 0) {
            masterNotes.push(name + " is animated - keyframes kept");
        } else {
            prop.setValue(val);
        }
    }
    return fx;
};

// Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØ­Øµ ÙˆØ§Ù„Ù…Ø­Ø§Ø°Ø§Ø© ÙÙŠ ØªØ¹Ù„ÙŠÙ‚ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ ÙƒÙ€ Metadata
$._smartHighlighter.writeMeta = function (textLayer, scan) {
    var items = [];
    for (var i = 0; i < scan.linesData.length; i++) {
        items.push('{"t":"' + $._smartHighlighter.escMeta(scan.linesData[i].text) +
            '","w":' + scan.linesData[i].width.toFixed(2) + '}');
    }
    var json = '{"v":1,"n":' + scan.numLines +
        ',"full":"' + $._smartHighlighter.escMeta(scan.fullText) + '"' +
        ',"lines":[' + items.join(",") + ']}';
    var block = $._smartHighlighter.META_OPEN + json + $._smartHighlighter.META_CLOSE;

    // 1. Write to textLayer.comment for file persistence across AE reboots
    var c = "";
    try { c = textLayer.comment || ""; } catch (e) { c = ""; }
    var a = c.indexOf($._smartHighlighter.META_OPEN);
    var b = c.indexOf($._smartHighlighter.META_CLOSE);
    if (a !== -1 && b !== -1 && b > a) {
        c = c.substring(0, a) + c.substring(b + $._smartHighlighter.META_CLOSE.length);
    }
    c = c.replace(/\s+$/, "");
    try { textLayer.comment = c + (c.length > 0 ? "\n" : "") + block; } catch (eC) {}

    // 2. [AP-09 REMEDIATION] Store in resilient memory cache (prevents loss if user clears comment)
    if (!$._smartHighlighter._metaCache) $._smartHighlighter._metaCache = {};
    try {
        var key = textLayer.id ? String(textLayer.id) : (textLayer.name || "default");
        $._smartHighlighter._metaCache[key] = $._smartHighlighter.parseJSON(json);
    } catch (eCache) {}
};

// قراءة الـ Metadata بأمان مع التحقق المزدوج من الذاكرة والتعليق
$._smartHighlighter.readMeta = function (textLayer) {
    try {
        // Priority 1: In-memory metadata cache (impervious to user comment clearing)
        if ($._smartHighlighter._metaCache) {
            var key = textLayer.id ? String(textLayer.id) : (textLayer.name || "default");
            if ($._smartHighlighter._metaCache[key]) {
                var cached = $._smartHighlighter._metaCache[key];
                if (cached && cached.v === 1 && cached.lines && cached.n === cached.lines.length) {
                    return cached;
                }
            }
        }

        // Priority 2: Fallback to reading layer comment
        var c = textLayer.comment || "";
        var a = c.indexOf($._smartHighlighter.META_OPEN);
        var b = c.indexOf($._smartHighlighter.META_CLOSE);
        if (a === -1 || b === -1 || b <= a) return null;
        var m = $._smartHighlighter.parseJSON(c.substring(a + $._smartHighlighter.META_OPEN.length, b));
        if (!m || m.v !== 1 || !m.lines || m.n !== m.lines.length) return null;
        return m;
    } catch (e) {
        return null;
    }
};

$._smartHighlighter.snapshotBoxes = function (comp, textLayer) {
    var out = [];
    var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";
    for (var i = 1; i <= comp.numLayers; i++) {
        var l = comp.layer(i);
        if (l.parent === textLayer && l.comment === tag) {
            var snap = { layer: l, color: null, opacity: null, padX: null, padY: null, offY: null, round: null, useMaster: 1, progT: [], progV: [], progStatic: null };
            try {
                var e1 = l.effect("Local Color");
                if (e1) snap.color = e1.property(1).value;
                var eOp = l.effect("Local Opacity");
                if (eOp) snap.opacity = eOp.property(1).value;
                var e2 = l.effect("Local Padding X");
                if (e2) snap.padX = e2.property(1).value;
                var e3 = l.effect("Local Padding Y");
                if (e3) snap.padY = e3.property(1).value;
                var e4 = l.effect("Local Offset Y");
                if (e4) snap.offY = e4.property(1).value;
                var e5 = l.effect("Local Roundness");
                if (e5) snap.round = e5.property(1).value;
                var e6 = l.effect("Use Master Controls");
                if (e6) snap.useMaster = e6.property(1).value ? 1 : 0;
                var e7 = l.effect("Progress");
                if (e7) {
                    var pp = e7.property(1);
                    if (pp.numKeys > 0) {
                        for (var k = 1; k <= pp.numKeys; k++) {
                            snap.progT.push(pp.keyTime(k));
                            snap.progV.push(pp.keyValue(k));
                        }
                    } else {
                        snap.progStatic = pp.value;
                    }
                }
            } catch (e) {}
            out.push(snap);
        }
    }
    return out;
};

// Ù‚Ø±Ø§Ø¡Ø© ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…Ø§Ø±ÙƒØ±Ø² Ù…Ù† Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø£Ùˆ Ø§Ù„ØªØ±ÙƒÙŠØ¨Ø© Ù„Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„ØµÙˆØªÙŠØ©
$._smartHighlighter.readMarkers = function (textLayer, comp) {
    var times = [];
    try {
        if (textLayer) {
            var mProp = textLayer.property("ADBE Marker");
            if (mProp && mProp.numKeys > 0) {
                for (var i = 1; i <= mProp.numKeys; i++) {
                    times.push(mProp.keyTime(i));
                }
            }
        }
        if (times.length === 0 && comp) {
            var compM = comp.markerProperty;
            if (compM && compM.numKeys > 0) {
                for (var j = 1; j <= compM.numKeys; j++) {
                    times.push(compM.keyTime(j));
                }
            }
        }
    } catch (e) {
        $._smartHighlighter.log("readMarkers ERROR: " + e.toString());
    }
    return times;
};

// Ù‚Ø±Ø§Ø¡Ø© Ù…Ø§Ø±ÙƒØ±Ø² Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…Ø®ØµØµØ© Ù„Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª (HL_IN_START, HL_IN_END, HL_OUT_START, HL_OUT_END)
$._smartHighlighter.readTimingMarkers = function (textLayer) {
    var timing = { inPoint: null, outPoint: null, inDur: null, outDur: null, inStart: null, inEnd: null, outStart: null, outEnd: null, hasOutro: false };
    if (!textLayer) return timing;
    try {
        var mProp = textLayer.property("ADBE Marker");
        if (mProp && mProp.numKeys > 0) {
            for (var i = 1; i <= mProp.numKeys; i++) {
                var c = mProp.keyValue(i).comment || "";
                var t = mProp.keyTime(i);
                if (c === "HL_IN_START") timing.inStart = t;
                else if (c === "HL_IN_END") timing.inEnd = t;
                else if (c === "HL_OUT_START") timing.outStart = t;
                else if (c === "HL_OUT_END") timing.outEnd = t;
            }
        }
        if (timing.inStart !== null) timing.inPoint = timing.inStart;
        if (timing.outStart !== null) timing.outPoint = timing.outStart;
        if (timing.inStart !== null && timing.inEnd !== null) timing.inDur = Math.max(0, timing.inEnd - timing.inStart);
        if (timing.outStart !== null && timing.outEnd !== null) {
            timing.outDur = Math.max(0, timing.outEnd - timing.outStart);
            timing.hasOutro = true;
        }
    } catch (e) {}
    return timing;
};

// Ø¥Ù†Ø´Ø§Ø¡ Ø£Ùˆ ØªØ­Ø¯ÙŠØ« Ù…Ø§Ø±ÙƒØ±Ø² Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ø£Ø±Ø¨Ø¹Ø© Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ
$._smartHighlighter.addTimingMarkers = function (inPoint, outPoint, inDur, outDur, hasOutro) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERROR: Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ±ÙƒÙŠØ¨Ø© Ù…ÙØªÙˆØ­Ø©.";
    if (comp.selectedLayers.length !== 1) return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø£ÙˆÙ„Ø§Ù‹.";

    var lyr = comp.selectedLayers[0];
    var textLayer = (lyr instanceof TextLayer) ? lyr : ((lyr instanceof ShapeLayer && lyr.parent) ? lyr.parent : null);
    if (!textLayer) return "ERROR: Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ù„ÙŠØ³Øª Ø·Ø¨Ù‚Ø© Ù†Øµ.";

    var mProp = textLayer.property("ADBE Marker");
    if (!mProp) return "ERROR: ØªØ¹Ø°Ø± Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø®Ø§ØµÙŠØ© Ø§Ù„Ù…Ø§Ø±ÙƒØ±Ø².";

    app.beginUndoGroup("OpenBox: Update Timing Markers");
    try {
        // ØªÙ†Ø¸ÙŠÙ Ø£ÙŠ Ù…Ø§Ø±ÙƒØ±Ø² Ø³Ø§Ø¨Ù‚Ø© Ø®Ø§ØµØ© Ø¨Ù€ HL
        if (mProp.numKeys > 0) {
            for (var i = mProp.numKeys; i >= 1; i--) {
                var comm = mProp.keyValue(i).comment || "";
                if (comm.indexOf("HL_") === 0) {
                    mProp.removeKey(i);
                }
            }
        }

        var tInStart = (typeof inPoint === "number" && inPoint >= 0) ? inPoint : comp.time;
        try {
            if (textLayer.inPoint > tInStart) {
                textLayer.inPoint = Math.max(0, tInStart);
            }
        } catch (eInP) {}
        var dIn = (typeof inDur === "number" && inDur > 0) ? inDur : 0.6;
        var tInEnd = tInStart + dIn;

        var dOut = (typeof outDur === "number" && outDur > 0) ? outDur : 0.4;
        var tOutStart = (typeof outPoint === "number" && outPoint > tInEnd) ? outPoint : (tInEnd + 1.5);
        var tOutEnd = tOutStart + dOut;

        try {
            if (textLayer.outPoint < tOutEnd) {
                textLayer.outPoint = tOutEnd;
            }
        } catch (eOutP) {}

        // 1. HL_IN_START (Green = 8)
        var m1 = new MarkerValue("HL_IN_START");
        try { m1.label = 8; } catch(e1) {}
        mProp.setValueAtTime(tInStart, m1);

        // 2. HL_IN_END (Green = 8)
        var m2 = new MarkerValue("HL_IN_END");
        try { m2.label = 8; } catch(e2) {}
        mProp.setValueAtTime(tInEnd, m2);

        // 3 & 4. OUT Markers (Orange/Red = 1)
        if (hasOutro !== false) {
            var m3 = new MarkerValue("HL_OUT_START");
            try { m3.label = 1; } catch(e3) {}
            mProp.setValueAtTime(tOutStart, m3);

            var m4 = new MarkerValue("HL_OUT_END");
            try { m4.label = 1; } catch(e4) {}
            mProp.setValueAtTime(tOutEnd, m4);
        }

        return "SUCCESS: ØªÙ… ØªØ­Ø¯ÙŠØ« Ù…Ø§Ø±ÙƒØ±Ø² Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø©: " + textLayer.name;
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

// Ù‚Ø±Ø§Ø¡Ø© Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© ÙˆÙ…Ø¹Ø¯Ù„ Ø¥Ø·Ø§Ø±Ø§Øª Ø§Ù„ØªØ±ÙƒÙŠØ¨Ø© Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù„ÙˆØ­Ø© Ù…Ø¹ After Effects (Two-way sync)
$._smartHighlighter.getLayerState = function (fetchText) {
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) {
        return $._smartHighlighter.stringifyJSON({
            ok: false,
            hasComp: false,
            layerName: "",
            error: "No active composition found"
        });
    }

    var rawFps = comp.frameRate || 30;
    var fps = Math.round(rawFps * 1000) / 1000;
    var frameDuration = comp.frameDuration || (1 / rawFps);
    var compName = comp.name || "";

    var baseInfo = {
        hasComp: true,
        fps: fps,
        frameDuration: parseFloat(frameDuration.toFixed(6)),
        compName: compName
    };

    if (comp.selectedLayers.length !== 1) {
        baseInfo.ok = false;
        baseInfo.layerName = "";
        return $._smartHighlighter.stringifyJSON(baseInfo);
    }

    var lyr = comp.selectedLayers[0];
    var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";

    var isTextToolActive = false;
    try {
        if (app.toolType === ToolType.Tool_TextH || app.toolType === ToolType.Tool_TextV) {
            isTextToolActive = true;
        }
    } catch (eTool) {
        if ($._smartHighlighter.logError) $._smartHighlighter.logError("toolType", eTool);
    }

    try {
        var textLayer = (lyr instanceof TextLayer) ? lyr : ((lyr instanceof ShapeLayer && lyr.parent) ? lyr.parent : null);
        var tMarkers = textLayer ? $._smartHighlighter.readTimingMarkers(textLayer) : null;

        if (lyr instanceof TextLayer) {
            var mColFx = lyr.effect("Master Highlight Color");
            var mOpFx = lyr.effect("Master Highlight Opacity");
            var pXFx = lyr.effect("Master Padding X");
            var pYFx = lyr.effect("Master Padding Y");
            var rndFx = lyr.effect("Master Roundness");
            var txtContent = "";
            if (fetchText === true && !isTextToolActive) {
                try {
                    txtContent = lyr.property("Source Text").value.text;
                    if ($._smartHighlighter.stripAnchors) txtContent = $._smartHighlighter.stripAnchors(txtContent);
                } catch (eTxt) {
                    if ($._smartHighlighter.logError) $._smartHighlighter.logError("getText", eTxt);
                }
            }

            if (!mColFx) {
                var resNoHl = {
                    ok: true,
                    type: "text",
                    hasHighlight: false,
                    hasComp: baseInfo.hasComp,
                    fps: baseInfo.fps,
                    frameDuration: baseInfo.frameDuration,
                    compName: baseInfo.compName,
                    layerName: lyr.name,
                    text: txtContent
                };
                if (tMarkers && tMarkers.inStart !== null) resNoHl.timingMarkers = tMarkers;
                return $._smartHighlighter.stringifyJSON(resNoHl);
            }

            var cVal = mColFx.property(1).value;
            var hex = $._smartHighlighter.rgbToHex(cVal);
            var resWithHl = {
                ok: true,
                type: "text",
                hasHighlight: true,
                scope: "all",
                hasComp: baseInfo.hasComp,
                fps: baseInfo.fps,
                frameDuration: baseInfo.frameDuration,
                compName: baseInfo.compName,
                color: hex,
                opacity: mOpFx ? mOpFx.property(1).value : 100,
                paddingX: pXFx ? pXFx.property(1).value : 8,
                paddingY: pYFx ? pYFx.property(1).value : 2,
                roundness: rndFx ? rndFx.property(1).value : 0,
                layerName: lyr.name,
                text: txtContent
            };
            if (tMarkers && tMarkers.inStart !== null) resWithHl.timingMarkers = tMarkers;
            return $._smartHighlighter.stringifyJSON(resWithHl);
        }

        if (lyr instanceof ShapeLayer && lyr.comment && (lyr.comment === tag || lyr.comment.indexOf("SMART_HL_PHRASE") !== -1) && lyr.parent) {
            var locColFx = lyr.effect("Local Color");
            var locOpFx = lyr.effect("Local Opacity");
            var locPXFx = lyr.effect("Local Padding X");
            var locPYFx = lyr.effect("Local Padding Y");
            var locRndFx = lyr.effect("Local Roundness");
            var useMFx = lyr.effect("Use Master Controls");

            var parentMCol = lyr.parent.effect("Master Highlight Color");
            var parentMOp = lyr.parent.effect("Master Highlight Opacity");
            var parentMPX = lyr.parent.effect("Master Padding X");
            var parentMPY = lyr.parent.effect("Master Padding Y");
            var parentMRnd = lyr.parent.effect("Master Roundness");

            var useMVal = useMFx ? useMFx.property(1).value : 1;
            var isLocal = (useMVal === 0);

            var cArray = (isLocal && locColFx) ? locColFx.property(1).value : (parentMCol ? parentMCol.property(1).value : (locColFx ? locColFx.property(1).value : [1,0.9,0,1]));
            var hexS = $._smartHighlighter.rgbToHex(cArray);

            var curPX = (isLocal && locPXFx) ? locPXFx.property(1).value : (parentMPX ? parentMPX.property(1).value : 8);
            var curPY = (isLocal && locPYFx) ? locPYFx.property(1).value : (parentMPY ? parentMPY.property(1).value : 2);
            var curRnd = (isLocal && locRndFx) ? locRndFx.property(1).value : (parentMRnd ? parentMRnd.property(1).value : 0);
            var curOp = (isLocal && locOpFx) ? locOpFx.property(1).value : (parentMOp ? parentMOp.property(1).value : 100);
            var parentTxt = "";
            if (fetchText === true && !isTextToolActive) {
                try {
                    if (lyr.parent instanceof TextLayer) {
                        parentTxt = lyr.parent.property("Source Text").value.text;
                        if ($._smartHighlighter.stripAnchors) parentTxt = $._smartHighlighter.stripAnchors(parentTxt);
                    }
                } catch (ePTxt) {
                    if ($._smartHighlighter.logError) $._smartHighlighter.logError("getParentText", ePTxt);
                }
            }

            var resShape = {
                ok: true,
                type: "shape",
                hasHighlight: true,
                scope: "line",
                isLocal: isLocal,
                hasComp: baseInfo.hasComp,
                fps: baseInfo.fps,
                frameDuration: baseInfo.frameDuration,
                compName: baseInfo.compName,
                color: hexS,
                opacity: curOp,
                paddingX: curPX,
                paddingY: curPY,
                roundness: curRnd,
                layerName: lyr.name,
                text: parentTxt
            };
            if (tMarkers && tMarkers.inStart !== null) resShape.timingMarkers = tMarkers;
            return $._smartHighlighter.stringifyJSON(resShape);
        }

        // Unknown layer type selected
        baseInfo.ok = false;
        baseInfo.layerName = lyr.name || "";
        return $._smartHighlighter.stringifyJSON(baseInfo);

    } catch (e) {
        baseInfo.ok = false;
        baseInfo.error = e.toString();
        return $._smartHighlighter.stringifyJSON(baseInfo);
    }
};

// Ø§Ø³ØªØ¹Ù„Ø§Ù… Ù…Ø¨Ø§Ø´Ø± ÙˆØ³Ø±ÙŠØ¹ Ø¹Ù† Ù…Ø¹Ø¯Ù„ Ø¥Ø·Ø§Ø±Ø§Øª Ø§Ù„ØªØ±ÙƒÙŠØ¨Ø© Ø§Ù„Ù†Ø´Ø·Ø© ÙÙŠ After Effects
$._smartHighlighter.getCompFps = function () {
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) {
        return $._smartHighlighter.stringifyJSON({
            ok: false,
            hasComp: false,
            fps: 30,
            frameDuration: 0.033333
        });
    }
    var rawFps = comp.frameRate || 30;
    var fps = Math.round(rawFps * 1000) / 1000;
    var frameDuration = comp.frameDuration || (1 / rawFps);
    return $._smartHighlighter.stringifyJSON({
        ok: true,
        hasComp: true,
        fps: fps,
        frameDuration: parseFloat(frameDuration.toFixed(6)),
        compName: comp.name || ""
    });
};

// ØªØ¨Ø¯ÙŠÙ„ Ù†Ù…Ø· Ø§Ù„ØªØ­ÙƒÙ… (Master vs Local) Ù„Ù„Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© ÙÙŠ After Effects
$._smartHighlighter.setScopeMode = function (targetScope) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERROR: Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ±ÙƒÙŠØ¨Ø© Ù…ÙØªÙˆØ­Ø©.";
    if (comp.selectedLayers.length !== 1) return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© ÙˆØ§Ø­Ø¯Ø©.";

    var lyr = comp.selectedLayers[0];
    var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";
    var textLayer = (lyr instanceof TextLayer) ? lyr : ((lyr instanceof ShapeLayer && lyr.parent) ? lyr.parent : null);
    if (!textLayer) return "ERROR: Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ù†Øµ Ù…Ø±ØªØ¨Ø·Ø©.";

    app.beginUndoGroup("OpenBox: Scope Mode (" + targetScope + ")");
    try {
        if (targetScope === "all") {
            // Ø¥Ø¹Ø§Ø¯Ø© Ø±Ø¨Ø· ÙƒÙ„ Ø§Ù„Ø£Ø³Ø·Ø± Ø¨Ø§Ù„Ù…Ø§Ø³ØªØ±
            for (var j = 1; j <= comp.numLayers; j++) {
                var lBox = comp.layer(j);
                if (lBox && lBox.parent === textLayer && lBox.comment === tag) {
                    var boxUseM = lBox.effect("Use Master Controls");
                    if (boxUseM) boxUseM.property(1).setValue(1);
                }
            }
            return "SUCCESS: Linked all lines to Master Controls.";
        } else if (targetScope === "line") {
            // ÙØµÙ„ Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ù…Ø­Ø¯Ø¯ Ù„ÙŠØ¹ØªÙ…Ø¯ Ø§Ù„ØªØ­ÙƒÙ… Ø§Ù„Ù…Ø­Ù„ÙŠ
            var targetShape = (lyr instanceof ShapeLayer && lyr.comment === tag) ? lyr : null;
            if (!targetShape) {
                for (var si = 1; si <= comp.numLayers; si++) {
                    var chk = comp.layer(si);
                    if (chk && chk.parent === textLayer && chk.comment === tag) {
                        targetShape = chk;
                        break;
                    }
                }
            }
            if (targetShape) {
                var targetUseM = targetShape.effect("Use Master Controls");
                if (targetUseM) targetUseM.property(1).setValue(0);
                return "SUCCESS: Decoupled " + targetShape.name + " for Local Control.";
            }
        }
        return "NO_OP";
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

// ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù„ÙˆÙ† Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ø¨Ù†Ù…Ø·ÙŠÙ†: Ø¹Ù„Ù‰ ÙƒÙ„ Ø§Ù„Ø£Ø³Ø·Ø± (all) Ø£Ùˆ Ø¹Ù„Ù‰ Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ù…Ø­Ø¯Ø¯ ÙÙ‚Ø· (line)
$._smartHighlighter.setQuickColor = function (hexColorStr, targetScope) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERROR: Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ±ÙƒÙŠØ¨Ø© Ù…ÙØªÙˆØ­Ø©.";
    if (comp.selectedLayers.length !== 1) return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© ÙˆØ§Ø­Ø¯Ø©.";

    var lyr = comp.selectedLayers[0];
    var rgba = $._smartHighlighter.hexToRgba(hexColorStr);
    if (!rgba) return "ERROR: Ø®Ø·Ø£ ÙÙŠ ØµÙŠØ§ØºØ© Ø§Ù„Ù„ÙˆÙ†.";

    var scope = targetScope || "all";
    var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";

    var textLayer = null;
    var shapeLayer = null;

    if (lyr instanceof TextLayer) {
        textLayer = lyr;
    } else if (lyr instanceof ShapeLayer && lyr.comment === tag) {
        shapeLayer = lyr;
        textLayer = lyr.parent;
    }

    if (!textLayer && !shapeLayer) {
        return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ Ø£Ùˆ Ø¥Ø­Ø¯Ù‰ Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ù‡Ø§ÙŠÙ„Ø§ÙŠØª.";
    }

    app.beginUndoGroup("OpenBox: Quick Color (" + scope + ")");
    try {
        if (scope === "line") {
            // ØªÙ„ÙˆÙŠÙ† Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ù…Ø­Ø¯Ø¯ ÙÙ‚Ø·
            if (!shapeLayer && textLayer) {
                for (var si = 1; si <= comp.numLayers; si++) {
                    var chk = comp.layer(si);
                    if (chk && chk.parent === textLayer && chk.comment === tag) {
                        shapeLayer = chk;
                        break;
                    }
                }
            }
            if (shapeLayer) {
                var locColFx = shapeLayer.effect("Local Color");
                var useMFx = shapeLayer.effect("Use Master Controls");
                if (locColFx) locColFx.property(1).setValue(rgba);
                if (useMFx) useMFx.property(1).setValue(0); // ÙÙƒ Ø§Ù„Ø§Ø±ØªØ¨Ø§Ø· Ù„ÙŠØ¹ØªÙ…Ø¯ Ø§Ù„Ù„ÙˆÙ† Ø§Ù„Ù…Ø­Ù„ÙŠ ÙÙˆØ±Ø§Ù‹
                return "SUCCESS: Color applied to " + shapeLayer.name + " only.";
            } else {
                return "ERROR: Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø³Ø·Ø± Ù…Ø­Ø¯Ø¯Ø©.";
            }
        } else {
            // ØªÙ„ÙˆÙŠÙ† ÙƒÙ„ Ø§Ù„Ø£Ø³Ø·Ø± Ù…Ø¹Ø§Ù‹ (All Lines / Master)
            if (textLayer) {
                var mColFx = textLayer.effect("Master Highlight Color");
                if (mColFx) {
                    mColFx.property(1).setValue(rgba);
                }
                for (var j = 1; j <= comp.numLayers; j++) {
                    var lBox = comp.layer(j);
                    if (lBox && lBox.parent === textLayer && lBox.comment === tag) {
                        var boxUseM = lBox.effect("Use Master Controls");
                        if (boxUseM) boxUseM.property(1).setValue(1);
                    }
                }
                return "SUCCESS: Color applied to all lines (Master).";
            }
        }
        return "NO_OP";
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

// ØªØ·Ø¨ÙŠÙ‚ ØªØ¹Ø¯ÙŠÙ„ ÙÙˆØ±ÙŠ ÙˆÙ…Ø¨Ø§Ø´Ø± Ù„Ù„Ù…Ù‚Ø§ÙŠÙŠØ³ (ØªØ¯ÙˆÙŠØ± Ø§Ù„Ø²ÙˆØ§ÙŠØ§ØŒ Ø§Ù„Ø­ÙˆØ§ÙØŒ Ø§Ù„Ø´ÙØ§ÙÙŠØ©) ÙÙŠ After Effects
$._smartHighlighter.setQuickParam = function (paramName, numVal, targetScope) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERROR: Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ±ÙƒÙŠØ¨Ø© Ù…ÙØªÙˆØ­Ø©.";
    if (comp.selectedLayers.length !== 1) return "ERROR: ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© ÙˆØ§Ø­Ø¯Ø©.";

    var lyr = comp.selectedLayers[0];
    var val = parseFloat(numVal);
    if (isNaN(val)) return "ERROR: Ù‚ÙŠÙ…Ø© ØºÙŠØ± ØµØ§Ù„Ø­Ø©.";

    var scope = targetScope || "all";
    var tag = $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";
    var fxMasterName = "";
    var fxLocalName = "";

    if (paramName === "roundness") {
        fxMasterName = "Master Roundness";
        fxLocalName = "Local Roundness";
    } else if (paramName === "padX") {
        fxMasterName = "Master Padding X";
        fxLocalName = "Local Padding X";
    } else if (paramName === "padY") {
        fxMasterName = "Master Padding Y";
        fxLocalName = "Local Padding Y";
    } else if (paramName === "opacity") {
        fxMasterName = "Master Highlight Opacity";
        fxLocalName = "Local Opacity";
    } else {
        return "ERROR: Ù…Ø¹Ù„Ù…Ø© ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙØ©.";
    }

    var textLayer = null;
    var shapeLayer = null;

    if (lyr instanceof TextLayer) {
        textLayer = lyr;
    } else if (lyr instanceof ShapeLayer && lyr.comment === tag) {
        shapeLayer = lyr;
        textLayer = lyr.parent;
    }

    if (!textLayer && !shapeLayer) {
        return "NO_HIGHLIGHT";
    }

    app.beginUndoGroup("OpenBox: " + fxMasterName);
    try {
        if (scope === "line") {
            if (!shapeLayer && textLayer) {
                for (var si = 1; si <= comp.numLayers; si++) {
                    var chk = comp.layer(si);
                    if (chk && chk.parent === textLayer && chk.comment === tag) {
                        shapeLayer = chk;
                        break;
                    }
                }
            }
            if (shapeLayer) {
                var locFx = shapeLayer.effect(fxLocalName);
                var useMFx = shapeLayer.effect("Use Master Controls");
                if (locFx) locFx.property(1).setValue(val);
                if (useMFx) useMFx.property(1).setValue(0);
                return "SUCCESS: " + paramName + " -> " + val + " (" + shapeLayer.name + ")";
            } else {
                return "ERROR: Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø³Ø·Ø±.";
            }
        } else {
            // Ù†Ù…Ø· All Lines: ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø§Ø³ØªØ± Ø¹Ù„Ù‰ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù†Øµ
            if (textLayer) {
                var mFx = textLayer.effect(fxMasterName);
                if (mFx) {
                    mFx.property(1).setValue(val);
                }
                for (var j = 1; j <= comp.numLayers; j++) {
                    var lBox = comp.layer(j);
                    if (lBox && lBox.parent === textLayer && lBox.comment === tag) {
                        var boxUseM = lBox.effect("Use Master Controls");
                        if (boxUseM && boxUseM.property(1).value === 0) {
                            var locProp = lBox.effect(fxLocalName);
                            if (locProp) locProp.property(1).setValue(val);
                        }
                    }
                }
                return "SUCCESS: " + paramName + " -> " + val;
            }
        }
        return "NO_OP";
    } catch (e) {
        return "ERROR: " + e.toString();
    } finally {
        $._smartHighlighter.safeEndUndoGroup();
    }
};

var SMART_HL_CONTROLLER_LOADED = true;
