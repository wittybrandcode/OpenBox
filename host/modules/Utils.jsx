/**
 * OPENBOX - Host Engine
 * Module: Utils.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * General helper functions: logging, JSON parsing, RTL detection, color conversions.
 */

// ===== DEBUG SYSTEM =====
if (!$._smartHighlighter._debugLog) {
    $._smartHighlighter._debugLog = [];
}

$._smartHighlighter.log = function (msg) {
    var ts = new Date().toTimeString().split(" ")[0];
    $._smartHighlighter._debugLog.push("[" + ts + "] " + msg);
    // Keep max 200 entries
    if ($._smartHighlighter._debugLog.length > 200) {
        $._smartHighlighter._debugLog.shift();
    }
};

$._smartHighlighter.getDebugLog = function () {
    return $._smartHighlighter._debugLog.join("\n");
};

$._smartHighlighter.clearDebugLog = function () {
    $._smartHighlighter._debugLog = [];
    return "Log cleared.";
};

// Ø¯Ø§Ù„Ø© Ø¥ØºÙ„Ø§Ù‚ Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø§Ù„Ø¢Ù…Ù†Ø© Ù„Ù…Ù†Ø¹ Ø£Ø®Ø·Ø§Ø¡ Undo Group Ø§Ù„Ù…Ø²Ø¯ÙˆØ¬Ø© Ø£Ùˆ Ø§Ù„Ù…ÙØªÙˆØ­Ø©
$._smartHighlighter.safeEndUndoGroup = function () {
    try {
        app.endUndoGroup();
    } catch (eGrp) {}
};

// Ù…Ø­Ø§ÙƒÙŠ ÙˆÙ…Ø­ÙˆÙ„ JSON Ù„Ù„ØªÙˆØ§ÙÙ‚ÙŠØ© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ù…Ø¹ Ù…Ø­Ø±ÙƒØ§Øª ExtendScript Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© (ES3)
$._smartHighlighter.parseJSON = function (str) {
    try {
        return eval("(" + str + ")");
    } catch (e) {
        $._smartHighlighter.log("parseJSON ERROR: " + e.toString());
        return null;
    }
};

// Ø¯Ø§Ù„Ø© ØªÙ‡Ø±ÙŠØ¨ Ø³Ù„Ø§Ø³Ù„ Ø§Ù„Ù†ØµÙˆØµ Ø§Ù„Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ Ù…Ø¹Ø§ÙŠÙŠØ± JSON (ECMA-262) Ù„Ù…Ù†Ø¹ Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„ØªØ­Ù„ÙŠÙ„
$._smartHighlighter.escapeJSON = function (s) {
    if (s === null || s === undefined) return "";
    return String(s)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        .replace(/[\b]/g, "\\b")
        .replace(/\f/g, "\\f");
};

$._smartHighlighter.stringifyJSON = function (val) {
    if (val === null || val === undefined) return "null";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "string") {
        return '"' + $._smartHighlighter.escapeJSON(val) + '"';
    }
    if (val instanceof Array) {
        var aRes = [];
        for (var ai = 0; ai < val.length; ai++) {
            aRes.push($._smartHighlighter.stringifyJSON(val[ai]));
        }
        return "[" + aRes.join(",") + "]";
    }
    if (typeof val === "object") {
        var oRes = [];
        for (var key in val) {
            if (val.hasOwnProperty(key)) {
                var v = val[key];
                if (typeof v !== "undefined" && typeof v !== "function") {
                    oRes.push($._smartHighlighter.stringifyJSON(key) + ":" + $._smartHighlighter.stringifyJSON(v));
                }
            }
        }
        return "{" + oRes.join(",") + "}";
    }
    return "null";
};

// Polyfill global JSON object in ExtendScript environment if absent
if (typeof JSON === "undefined") {
    JSON = {
        parse: $._smartHighlighter.parseJSON,
        stringify: $._smartHighlighter.stringifyJSON
    };
} else {
    if (!JSON.parse) JSON.parse = $._smartHighlighter.parseJSON;
    if (!JSON.stringify) JSON.stringify = $._smartHighlighter.stringifyJSON;
}

// ØªØ´ÙÙŠØ± Ø§Ù„Ù†ØµÙˆØµ Ù„Ù„ØªØ¹Ù„ÙŠÙ‚Ø§Øª ÙˆØ§Ù„Ù…ÙŠØªØ§ Ø¯Ø§ØªØ§ Ø¨Ø£Ù…Ø§Ù†
$._smartHighlighter.escMeta = function (s) {
    return $._smartHighlighter.escapeJSON(s);
};

// ÙØ­Øµ ÙˆØ¬ÙˆØ¯ Ø§Ù„Ø­Ø±ÙˆÙ Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ù„ØªØ­Ø¯ÙŠØ¯ Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ù†Øµ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠØ§Ù‹
$._smartHighlighter.hasArabic = function (text) {
    var arabicPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicPattern.test(text);
};

// Ù‚Ø±Ø§Ø¡Ø© ÙˆØªÙØ³ÙŠØ± Ù…Ø­Ø§Ø°Ø§Ø© Ø§Ù„Ø¨Ø§Ø±Ø§Ø¬Ø±Ø§Ù ÙÙŠ After Effects
$._smartHighlighter.detectJustification = function (justification) {
    if (justification === null || justification === undefined) return null;
    try {
        if (typeof ParagraphJustification !== "undefined") {
            if (justification === ParagraphJustification.CENTER_JUSTIFY || 
                justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_CENTER) {
                return "center";
            }
            if (justification === ParagraphJustification.RIGHT_JUSTIFY || 
                justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_RIGHT) {
                return "rtl";
            }
            if (justification === ParagraphJustification.LEFT_JUSTIFY || 
                justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT ||
                justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_FULL) {
                return "ltr";
            }
        }
        var jStr = String(justification).toUpperCase();
        if (jStr.indexOf("CENTER") !== -1 || justification === 7415 || justification === 7418) return "center";
        if (jStr.indexOf("RIGHT") !== -1 || justification === 7414 || justification === 7417) return "rtl";
        if (jStr.indexOf("LEFT") !== -1 || justification === 7413 || justification === 7416) return "ltr";
    } catch (e) {}
    return null;
};

// Ø¥Ø­ØµØ§Ø¡ Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ø£Ø­Ø±Ù (RTL vs LTR)
$._smartHighlighter.countDir = function (s) {
    var rtl = 0, ltr = 0, m;
    m = s.match(/[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g);
    if (m) rtl = m.length;
    m = s.match(/[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g);
    if (m) ltr = m.length;
    return { rtl: rtl, ltr: ltr };
};

// ØªØ­Ø¯ÙŠØ¯ Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø³Ø·Ø± RTL Ø£Ù… LTR Ù…Ø¹ Ø§Ø¹ØªÙ…Ø§Ø¯ fallback
$._smartHighlighter.lineIsRTL = function (lineText, fallbackRTL) {
    var c = $._smartHighlighter.countDir(lineText);
    if (c.rtl === 0 && c.ltr === 0) return fallbackRTL;
    if (c.rtl === c.ltr) return fallbackRTL;
    return c.rtl > c.ltr;
};

// ØªØ­ÙˆÙŠÙ„ Ù…ØµÙÙˆÙØ© Ø§Ù„Ù„ÙˆÙ† [r, g, b, a] Ø¥Ù„Ù‰ ÙƒÙˆØ¯ HEX
$._smartHighlighter.rgbToHex = function (rgba) {
    if (!rgba || rgba.length < 3) return "#FFE600";
    var r = Math.round(rgba[0] * 255);
    var g = Math.round(rgba[1] * 255);
    var b = Math.round(rgba[2] * 255);
    var toH = function (n) {
        var s = Math.max(0, Math.min(255, n)).toString(16).toUpperCase();
        return s.length === 1 ? "0" + s : s;
    };
    return "#" + toH(r) + toH(g) + toH(b);
};

// ØªØ­ÙˆÙŠÙ„ ÙƒÙˆØ¯ HEX Ø¥Ù„Ù‰ Ù…ØµÙÙˆÙØ© [r, g, b, 1.0]
$._smartHighlighter.hexToRgba = function (hex) {
    if (!hex) return null;
    var c = String(hex).replace("#", "");
    if (c.length === 3) {
        c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
    }
    if (c.length !== 6) return null;
    var r = parseInt(c.substring(0, 2), 16) / 255;
    var g = parseInt(c.substring(2, 4), 16) / 255;
    var b = parseInt(c.substring(4, 6), 16) / 255;
    return [r, g, b, 1.0];
};

var SMART_HL_UTILS_LOADED = true;
