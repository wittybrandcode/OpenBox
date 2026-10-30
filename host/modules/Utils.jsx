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
$._smartHighlighter.logError = function (scope, err) {
    var msg = (err && err.toString) ? err.toString() : String(err);
    $._smartHighlighter.log("[ERROR:" + (scope || "General") + "] " + msg);
};

// دالة إغلاق مجموعة التراجع الآمنة لمنع أخطاء Undo Group المزدوجة أو المفتوحة
$._smartHighlighter.safeEndUndoGroup = function () {
    try {
        app.endUndoGroup();
    } catch (eGrp) {
        if ($._smartHighlighter.logError) $._smartHighlighter.logError("safeEndUndoGroup", eGrp);
    }
};

// دالة الاستبانة الذكية والشاملة لطبقة النص الهدف (Resilient Target Text Layer Resolution)
$._smartHighlighter.resolveTargetTextLayer = function (comp) {
    if (!comp || !(comp instanceof CompItem)) return null;

    // 1. تحديد طبقة واحدة مباشرة
    if (comp.selectedLayers && comp.selectedLayers.length === 1) {
        var sel = comp.selectedLayers[0];
        if (sel instanceof TextLayer) return sel;
        if (sel instanceof ShapeLayer && sel.parent && (sel.parent instanceof TextLayer)) return sel.parent;
        if (sel.comment && sel.comment.indexOf("PARENT:") !== -1) {
            var pName = sel.comment.replace("PARENT:", "").replace(/^\s+|\s+$/g, "");
            try { var pLay = comp.layer(pName); if (pLay instanceof TextLayer) return pLay; } catch (eP) {}
        }
    }

    // 2. إذا تم تحديد طبقات متعددة (مثلاً النص وطبقة الشكل معاً)
    if (comp.selectedLayers && comp.selectedLayers.length > 1) {
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var l = comp.selectedLayers[i];
            if (l instanceof TextLayer) return l;
            if (l instanceof ShapeLayer && l.parent && (l.parent instanceof TextLayer)) return l.parent;
        }
    }

    // 3. حالة عدم تحديد أي طبقة (مثلاً التركيز على لوحة CEP): إذا كانت التركيبة تحتوي على طبقة نص وحيدة، يتم استهدافها تلقائياً
    var foundText = null;
    var textCount = 0;
    for (var j = 1; j <= comp.numLayers; j++) {
        var cand = comp.layer(j);
        if (cand instanceof TextLayer) {
            foundText = cand;
            textCount++;
        }
    }
    if (textCount === 1) {
        return foundText;
    }

    return null;
};

// محاكي ومحول JSON للتوافقية الكاملة مع محركات ExtendScript القديمة (ES3) والمحصن أمنياً (RFC 4627)
$._smartHighlighter.parseJSON = function (str) {
    if (!str) return null;
    if (typeof str === "object") return str;
    if (typeof str !== "string") return null;

    // تنظيف المسافات المحيطة
    str = str.replace(/^\s+|\s+$/g, "");
    if (!str) return null;

    // معالجة النصوص المغلفة مرتين بسلاسل اقتباس (Double-stringified JSON)
    if (str.length > 2 && ((str.charAt(0) === '"' && str.charAt(str.length - 1) === '"') || (str.charAt(0) === "'" && str.charAt(str.length - 1) === "'"))) {
        if (str.indexOf('{') !== -1 || str.indexOf('[') !== -1) {
            try { str = eval(str); } catch (eUnwrap) {}
            if (typeof str === "object") return str;
            if (typeof str !== "string") return null;
            str = str.replace(/^\s+|\s+$/g, "");
        }
    }

    // المحاولة عبر JSON.parse الأصلي في حال توفره
    try {
        if (typeof JSON !== "undefined" && typeof JSON.parse === "function" && JSON.parse !== $._smartHighlighter.parseJSON) {
            var nativeParsed = JSON.parse(str);
            if (nativeParsed) return nativeParsed;
        }
    } catch (eNative) {}

    // التحصين الأمني الصارم: منع الكلمات المفتاحية الخطرة لمنع تنفيذ شفرات عشوائية (Security Invariant)
    if (/(?:^|[^a-zA-Z0-9_$])(?:function|eval|window|document|app|Folder|File|Socket|system|prototype|constructor|this)\b/i.test(str)) {
        $._smartHighlighter.log("parseJSON SECURITY WARNING: string contains prohibited keywords: " + str.substring(0, 50));
        return null;
    }

    // فحص صحة حدود هيكل الـ JSON (كائن {...} أو مصفوفة [...])
    if ((str.charAt(0) === "{" && str.charAt(str.length - 1) === "}") || (str.charAt(0) === "[" && str.charAt(str.length - 1) === "]")) {
        try {
            return eval("(" + str + ")");
        } catch (eEval) {
            $._smartHighlighter.log("parseJSON eval ERROR: " + eEval.toString());
            return null;
        }
    }

    // التحقق القياسي عبر RFC 4627 للقيم البسيطة
    try {
        var filtered = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
            .replace(/(?:^|:|,)(?:\s*\[)+/g, "");

        if (/^[\],:{}\s]*$/.test(filtered)) {
            return eval("(" + str + ")");
        }
    } catch (eRfc) {}

    $._smartHighlighter.log("parseJSON syntax validation failed: " + str.substring(0, 50));
    return null;
};

// Ø¯Ø§Ù„Ø© ØªÙ‡Ø±ÙŠØ¨ Ø³Ù„Ø§Ø³Ù„ Ø§Ù„Ù†ØµÙˆØµ Ø§Ù„Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ Ù…Ø¹Ø§ÙŠÙŠØ± JSON (ECMA-262) Ù„Ù…Ù†Ø¹ Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„ØªØ­Ù„ÙŠÙ„
$._smartHighlighter.escapeJSON = function (s) {
    if (s === null || s === undefined) return "";
    return String(s)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/[\x00-\x1f]/g, function (c) {
            switch (c) {
                case '\b': return '\\b';
                case '\t': return '\\t';
                case '\n': return '\\n';
                case '\f': return '\\f';
                case '\r': return '\\r';
                default:
                    var code = c.charCodeAt(0).toString(16);
                    return '\\u' + ('0000' + code).slice(-4);
            }
        });
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
                justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT) {
                return "ltr";
            }
            if (justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_FULL) {
                return null; // Neutral full justification: defer to text language content
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
