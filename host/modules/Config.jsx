/**
 * OPENBOX - Host Engine
 * Module: Config.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * Defines global namespaces, constants, and system configurations.
 */

if (typeof $._smartHighlighter === "undefined") {
    $._smartHighlighter = {};
}

// System Constants
$._smartHighlighter.VERSION = "2.0.0";
$._smartHighlighter.META_OPEN = "[HL-META v1]";
$._smartHighlighter.META_CLOSE = "[/HL-META]";
$._smartHighlighter.LAYER_COMMENT = "SMART_HL_PRO_LAYER";
$._smartHighlighter.SCAN_TEMP_ENGINE = "_scan_temp_engine";
$._smartHighlighter.SCAN_TEMP_WORDS = "_scan_temp_words";
$._smartHighlighter.TYPEWRITER_ANIM_NAME = "Typewriter Sync";

// Smart Invisible Anchors (Zero-Width Characters)
$._smartHighlighter.ZW_START = "\u200B"; // Zero-Width Space (0px visual width, marks line start)
$._smartHighlighter.ZW_END   = "\u2060"; // Word Joiner (0px visual width, marks line end)

// Default Parameter Fallbacks
$._smartHighlighter.DEFAULTS = {
    color: [1, 0.902, 0, 1], // #FFE600
    opacity: 100,
    paddingX: 8,
    paddingY: 2,
    offsetY: 0,
    roundness: 0,
    style: "box",
    motion: "wipe",
    lineDuration: 0.35,
    stagger: 0,
    direction: "auto"
};

var SMART_HL_CONFIG_LOADED = true;
