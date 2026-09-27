/**
 * ============================================================
 * OPENBOX â€” CLIENT APPLICATION BOOTSTRAPPER
 * Architecture: Modular Layered Micro-Kernel Architecture
 * Layer 1 (Core):     Config.js, State.js, DOM.js, Bridge.js
 * Layer 2 (Services): SyncService.js, Actions.js
 * Layer 3 (Modules):  Controls.js, PresetsManager.js, PhraseManager.js
 * Layer 4 (Boot):     app.js
 * Version: 2.2.0 (Ultra-Clean Modular Orchestrator)
 * ============================================================
 */

(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    // ============================================================
    // APPLICATION BOOTSTRAP ORCHESTRATION
    // ============================================================
    function bootstrap() {
        // 1. Initialize DOM cache
        HS.DOM.init();

        // 2. Self-contained Event Listeners for each architectural layer
        if (HS.Bridge && HS.Bridge.initEvents) HS.Bridge.initEvents();
        if (HS.Controls && HS.Controls.initEvents) HS.Controls.initEvents();
        if (HS.Presets && HS.Presets.init) HS.Presets.init();
        if (HS.PhraseManager && HS.PhraseManager.initEvents) HS.PhraseManager.initEvents();
        if (HS.Actions && HS.Actions.initEvents) HS.Actions.initEvents();

        // 3. Initial UI state & polling services
        if (HS.Actions && HS.Actions.applyDefaultSettings) HS.Actions.applyDefaultSettings();
        if (HS.Controls && HS.Controls.syncChipClasses) HS.Controls.syncChipClasses();
        if (HS.Sync && HS.Sync.initPolling) HS.Sync.initPolling();

        // 4. Initial tab routing from URL query if provided
        if (window.location && window.location.search && window.location.search.indexOf("tab=phrases") !== -1) {
            HS.switchMainTab("phrases");
            if (window.location.search.indexOf("demo=1") !== -1 && HS.PhraseManager) {
                HS.PhraseManager.renderBoard("OpenBox provides ultra fast kinetic text highlighting for After Effects", "Title_Main");
                HS.State.selectedTokenIndices = [0, 1];
                var t0 = HS.DOM.tokensBoard ? HS.DOM.tokensBoard.querySelector('[data-token-index="0"]') : null;
                var t1 = HS.DOM.tokensBoard ? HS.DOM.tokensBoard.querySelector('[data-token-index="1"]') : null;
                if (t0) t0.classList.add("selected");
                if (t1) t1.classList.add("selected");
                HS.PhraseManager.updateBadge();
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }

    // Export HS to window for debugging, automation, and testing
    window.HIGHLIGHT_STUDIO_DEFAULTS = (HS.Config && HS.Config.defaults) ? HS.Config.defaults : {};
    window.applyDefaultSettings = (HS.Actions && HS.Actions.applyDefaultSettings) ? HS.Actions.applyDefaultSettings : null;
    window.syncChipClasses = (HS.Controls && HS.Controls.syncChipClasses) ? HS.Controls.syncChipClasses : null;

})(window, document);