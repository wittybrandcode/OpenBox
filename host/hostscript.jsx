/**
 * OPENBOX CEP HOST ENGINE
 * Entry Point: hostscript.jsx
 * Version: 2.0.0 (Modular Architecture)
 * 
 * Central preprocessor loader that imports all system modules in topological order.
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODULE PREPROCESSOR DIRECTIVES (#include)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 1. Config & Constants (No dependencies)
#include "modules/Config.jsx"

// 2. Core Utilities & Logging (Depends on Config)
#include "modules/Utils.jsx"

// 3. Text & Paragraph Scanner (Depends on Config, Utils)
#include "modules/TextScanner.jsx"

// 4. Tag & Multi-Mode Target Resolution (Depends on Config, Utils, TextScanner)
#include "modules/TagManager.jsx"

// 5. Smart Invisible Anchors Engine (Depends on Config, Utils)
#include "modules/InvisibleAnchors.jsx"

// 6. Custom Typewriter Engine (Depends on Config, Utils)
#include "modules/TypewriterEngine.jsx"

// 7. Controller & CEP UI Bridge (Depends on Config, Utils)
#include "modules/ControllerBridge.jsx"

// 8. Style & Motion Recipe Strategies (Extensible Plugins)
#include "modules/Recipes.jsx"

// 9. Highlight Shape Layer Builder (Depends on all above modules)
#include "modules/HighlightBuilder.jsx"

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PUBLIC API ROUTING & VERIFICATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Ø§Ù„Ø¯Ø§Ù„Ø© Ø§Ù„Ø°ÙƒÙŠØ© Ø§Ù„Ù…ÙˆØ­Ø¯Ø© (Smart Apply / Update / Clear)
$._smartHighlighter.smartHighlight = function (jsonPayloadStr, isClearOnly) {
    if (isClearOnly === true || isClearOnly === "true") {
        return $._smartHighlighter.removeHighlight();
    }
    return $._smartHighlighter.createHighlight(jsonPayloadStr);
};

// Ø¯Ø§Ù„Ø© Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ© (ØªÙˆØ§ÙÙ‚ÙŠØ© ÙƒØ§Ù…Ù„Ø©)
$._smartHighlighter.syncHighlight = function (jsonPayloadStr) {
    return $._smartHighlighter.createHighlight(jsonPayloadStr);
};

// ÙØ­Øµ Ù†Ø¬Ø§Ø­ ØªØ­Ù…ÙŠÙ„ Ø¬Ù…ÙŠØ¹ Ø§Ù„ÙˆØ­Ø¯Ø§Øª ÙˆØªÙˆØ«ÙŠÙ‚Ù‡Ø§
(function () {
    var loaded = [];
    if (typeof SMART_HL_CONFIG_LOADED !== "undefined") loaded.push("Config");
    if (typeof SMART_HL_UTILS_LOADED !== "undefined") loaded.push("Utils");
    if (typeof SMART_HL_TEXTSCANNER_LOADED !== "undefined") loaded.push("TextScanner");
    if (typeof SMART_HL_TAGMANAGER_LOADED !== "undefined") loaded.push("TagManager");
    if (typeof SMART_HL_ANCHORS_LOADED !== "undefined") loaded.push("InvisibleAnchors");
    if (typeof SMART_HL_TYPEWRITER_LOADED !== "undefined") loaded.push("TypewriterEngine");
    if (typeof SMART_HL_CONTROLLER_LOADED !== "undefined") loaded.push("ControllerBridge");
    if (typeof SMART_HL_RECIPES_LOADED !== "undefined") loaded.push("Recipes");
    if (typeof SMART_HL_BUILDER_LOADED !== "undefined") loaded.push("HighlightBuilder");

    if ($._smartHighlighter && $._smartHighlighter.log) {
        $._smartHighlighter.log("Host Engine initialized. Modules loaded: " + loaded.join(", ") + " (" + loaded.length + "/9)");
    }
})();