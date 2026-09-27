/**
 * OPENBOX â€” State Module
 * Central reactive runtime state repository.
 */
(function (window) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.State = {
        scope: "all",               // "all" | "line"
        mainTab: "paragraph",       // "paragraph" | "phrases"
        typewriterMode: "sequential",      // "sequential" (cascading lines) | "parallel" (concurrent lines)
        typewriterSpeedMode: "constant",   // "constant" (equal word pacing) | "synced" (synchronized line finish)
        outroOrder: "first",        // "first" (1->N) | "last" (N->1)
        textOutroOrder: "first",    // "first" (1->N) | "last" (N->1)
        boxOutroOrder: "first",     // "first" (1->N) | "last" (N->1)
        syncOutro: true,            // true (containers follow text) | false (independent)
        liveUpdate: true,           // true (auto push changes to AE) | false (manual push via lightning bolt)
        lastUserInteraction: 0,
        lastSyncedLayer: "",
        lastTokensRawText: null,
        phraseTokens: [],
        selectedTokenIndices: [],
        lastClickedTokenIndex: -1,
        isDraggingTokenSelect: false,
        dragSelectActive: true,
        appliedPhrases: [],
        hasHighlight: false,
        fps: 30,
        frameDuration: 1 / 30,
        compName: "",
        hasComp: false
    };

    // Mark user interaction timestamp to prevent background polling overwrites
    HS.markInteraction = function () {
        HS.State.lastUserInteraction = Date.now();
    };
})(window);
