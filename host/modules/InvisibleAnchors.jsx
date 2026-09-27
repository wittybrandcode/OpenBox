/**
 * OPENBOX - Host Engine
 * Module: InvisibleAnchors.jsx
 * Version: 2.0.0 (Smart Invisible Waypoints Engine)
 * 
 * Injects and manages Zero-Width Unicode Waypoints:
 * - \u200B (Zero-Width Space) at line/box starts (visual width = 0.00px)
 * - \u2060 (Word Joiner) at line/box ends (visual width = 0.00px)
 * 
 * Provides subpixel-exact character boundary tracking for the Typewriter engine
 * across multi-line paragraphs without any visual artifacts or rendering side-effects.
 */

// Ø¥Ø²Ø§Ù„Ø© ÙƒÙ„ Ø§Ù„Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø®ÙÙŠØ© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ù…Ù† Ø§Ù„Ù†Øµ Ù„ØªÙØ§Ø¯ÙŠ Ø§Ù„ØªÙƒØ±Ø§Ø± ÙˆØ¶Ù…Ø§Ù† Ù†Ù‚Ø§Ø¡ Ø§Ù„Ù†Øµ
$._smartHighlighter.stripAnchors = function (text) {
    if (!text) return "";
    return text.replace(/[\u200B\u2060\uFEFF\u200C\u200D\u200E\u200F\u061C]/g, "");
};

// Ø­Ù‚Ù† Ø§Ù„Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø®ÙÙŠØ© Ø§Ù„Ø°ÙƒÙŠØ© Ø¹Ù†Ø¯ Ø¨Ø¯Ø§ÙŠØ© ÙˆÙ†Ù‡Ø§ÙŠØ© ÙƒÙ„ Ø³Ø·Ø± Ø£Ùˆ ØµÙ†Ø¯ÙˆÙ‚ Ù…Ø³ØªÙ‡Ø¯Ù ÙÙŠ Ø§Ù„Ù†Øµ
$._smartHighlighter.injectAnchors = function (text, items) {
    if (!text || !items || items.length === 0) return text;

    var clean = $._smartHighlighter.stripAnchors(text);
    var zwStart = $._smartHighlighter.ZW_START;
    var zwEnd = $._smartHighlighter.ZW_END;

    var result = clean;
    var searchCursor = 0;

    // Ù†Ø¨Ù†ÙŠ Ø§Ù„Ù†Øµ Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ù…Ø¹ ÙˆØ¶Ø¹ zwStart ÙÙŠ Ø¨Ø¯Ø§ÙŠØ© ÙƒÙ„ Ø¹Ù†ØµØ± Ùˆ zwEnd ÙÙŠ Ù†Ù‡Ø§ÙŠØªÙ‡
    for (var i = 0; i < items.length; i++) {
        var targetText = items[i].text;
        if (!targetText) continue;
        var fIdx = result.indexOf(targetText, searchCursor);
        if (fIdx !== -1) {
            var before = result.substring(0, fIdx);
            var target = result.substring(fIdx, fIdx + targetText.length);
            var after = result.substring(fIdx + targetText.length);

            // ØªØºÙ„ÙŠÙ Ø§Ù„Ø¹Ù†ØµØ± Ø¨Ø§Ù„Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø®ÙÙŠØ©
            result = before + zwStart + target + zwEnd + after;
            // ØªØ­Ø¯ÙŠØ« Ù…Ø¤Ø´Ø± Ø§Ù„Ø¨Ø­Ø« Ù…ØªØ®Ø·ÙŠØ§Ù‹ Ø§Ù„Ø¹Ù†ØµØ± ÙˆØ§Ù„Ø¹Ù„Ø§Ù…ØªÙŠÙ†
            searchCursor = fIdx + zwStart.length + target.length + zwEnd.length;
        }
    }

    return result;
};

// Ø§Ø³ØªØ®Ø±Ø§Ø¬ ÙÙ‡Ø§Ø±Ø³ Ø§Ù„Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø®ÙÙŠØ© Ù…Ù† Ø§Ù„Ù†Øµ Ù„ØªØ­Ø¯ÙŠØ¯ Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© ÙˆØ§Ù„Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ø¯Ù‚ÙŠÙ‚Ø© Ù„ÙƒÙ„ ØµÙ†Ø¯ÙˆÙ‚
$._smartHighlighter.getAnchorIndices = function (text) {
    if (!text) return [];

    var zwStart = $._smartHighlighter.ZW_START;
    var zwEnd = $._smartHighlighter.ZW_END;
    var anchors = [];
    var searchIdx = 0;
    var idx = 0;

    while (searchIdx < text.length) {
        var sPos = text.indexOf(zwStart, searchIdx);
        if (sPos === -1) break;

        var ePos = text.indexOf(zwEnd, sPos + zwStart.length);
        if (ePos === -1) break;

        anchors.push({
            index: idx,
            lineIndex: idx,
            boxIndex: idx,
            startPos: sPos,
            endPos: ePos,
            innerLength: ePos - (sPos + zwStart.length),
            text: text.substring(sPos + zwStart.length, ePos)
        });

        idx++;
        searchIdx = ePos + zwEnd.length;
    }

    return anchors;
};

var SMART_HL_ANCHORS_LOADED = true;
