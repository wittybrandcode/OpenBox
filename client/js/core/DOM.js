/**
 * OPENBOX â€” DOM Repository Module
 * Cached references to all extension HTML elements.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.DOM = {
        init: function () {
            // Presets & Tabs
            this.presetSelect = document.getElementById("preset-select");
            this.btnSavePreset = document.getElementById("btn-save-preset");
            this.btnDeletePreset = document.getElementById("btn-delete-preset");
            this.presetModal = document.getElementById("preset-modal");
            this.btnClosePresetModal = document.getElementById("btn-close-preset-modal");
            this.presetNameInput = document.getElementById("preset-name-input");
            this.modalPresetColorPreview = document.getElementById("modal-preset-color-preview");
            this.modalPresetDetails = document.getElementById("modal-preset-details");
            this.btnCancelPreset = document.getElementById("btn-cancel-preset");
            this.btnConfirmSavePreset = document.getElementById("btn-confirm-save-preset");
            this.deletePresetModal = document.getElementById("delete-preset-modal");
            this.btnCloseDeletePresetModal = document.getElementById("btn-close-delete-preset-modal");
            this.deletePresetMsg = document.getElementById("delete-preset-msg");
            this.btnCancelDeletePreset = document.getElementById("btn-cancel-delete-preset");
            this.btnConfirmDeletePreset = document.getElementById("btn-confirm-delete-preset");
            this.tabBtnParagraph = document.getElementById("tab-btn-paragraph");
            this.tabBtnPhrases = document.getElementById("tab-btn-phrases");
            this.viewParagraph = document.getElementById("view-paragraph");
            this.viewPhrases = document.getElementById("view-phrases");

            // Tab 1: Paragraph & Lines
            this.targetInfoName = document.getElementById("target-info-name");
            this.targetFpsBadge = document.getElementById("target-fps-badge");
            this.styleSelect = document.getElementById("style-select");
            this.alignSelect = document.getElementById("align-select");
            this.colorPicker = document.getElementById("color-picker");
            this.colorHex = document.getElementById("color-hex");
            this.recentColorSwatch = document.getElementById("recent-color-swatch");
            this.padXInput = document.getElementById("pad-x");
            this.padYInput = document.getElementById("pad-y");
            this.roundInput = document.getElementById("roundness");
            this.opacityInput = document.getElementById("opacity-input");
            this.animCheck = document.getElementById("anim-check");
            this.animControls = document.getElementById("anim-controls");
            this.motionSelect = document.getElementById("motion-select");
            this.btnTypewriterSeq = document.getElementById("btn-typewriter-seq");
            this.btnTypewriterPara = document.getElementById("btn-typewriter-para");
            this.btnTypewriterSpeedToggle = document.getElementById("btn-typewriter-speed-toggle");
            this.revealUnitSelect = document.getElementById("reveal-unit-select");
            this.timeInPoint = document.getElementById("time-in-point");
            this.timeOutPoint = document.getElementById("time-out-point");
            this.timeOutPointBox = document.getElementById("time-out-point-box");
            this.lineDurInput = document.getElementById("line-dur");
            this.outTimeInput = document.getElementById("out-time");
            this.outTimeCol = document.getElementById("out-time-col");
            this.staggerInput = document.getElementById("stagger");
            this.staggerLabel = document.getElementById("stagger-label");
            this.sequentialCheck = document.getElementById("sequential-check");
            this.outroCheck = document.getElementById("outro-check");
            this.outroDirectionBar = document.getElementById("outro-direction-bar");
            this.btnTextOutroOrder = document.getElementById("btn-text-outro-order");
            this.textOrderLabel = document.getElementById("text-order-label");
            this.btnSyncOutroOrder = document.getElementById("btn-sync-outro-order");
            this.btnBoxOutroOrder = document.getElementById("btn-box-outro-order");
            this.boxOrderLabel = document.getElementById("box-order-label");
            this.markerSyncCheck = document.getElementById("marker-sync-check");
            this.btnPlaceMarkers = document.getElementById("btn-place-markers");
            this.btnLiveUpdate = document.getElementById("btn-live-update");
            this.btnSmartApply = document.getElementById("btn-smart-apply");
            this.btnClear = document.getElementById("btn-clear");

            // Tab 2: Phrase Highlight
            this.phraseTargetName = document.getElementById("phrase-target-name");
            this.phraseFpsBadge = document.getElementById("phrase-fps-badge");
            this.phraseCountBadge = document.getElementById("phrase-count-badge");
            this.phraseCharBadge = document.getElementById("phrase-char-badge");
            this.btnPhraseClearSel = document.getElementById("btn-phrase-clear-sel");
            this.tokensBoard = document.getElementById("tokens-board");
            this.tokensResizeHandle = document.getElementById("tokens-resize-handle");
            this.appliedPhrasesWrap = document.getElementById("applied-phrases-wrap");
            this.appliedPhrasesCount = document.getElementById("applied-phrases-count");
            this.appliedPhrasesList = document.getElementById("applied-phrases-list");
            this.phraseStyleSelect = document.getElementById("phrase-style-select");
            this.phraseMotionSelect = document.getElementById("phrase-motion-select");
            this.phraseColorInput = document.getElementById("phrase-color-input");
            this.phraseColorHex = document.getElementById("phrase-color-hex");
            this.phraseRecentColorSwatch = document.getElementById("phrase-recent-color-swatch");
            this.phrasePadX = document.getElementById("phrase-pad-x");
            this.phrasePadY = document.getElementById("phrase-pad-y");
            this.chipPhraseOutro = document.getElementById("chip-phrase-outro");
            this.phraseOutroCheck = document.getElementById("phrase-outro-check");
            this.chipPhraseSeq = document.getElementById("chip-phrase-seq");
            this.phraseSeqCheck = document.getElementById("phrase-seq-check");
            this.phraseHoldCol = document.getElementById("phrase-hold-col");
            this.phraseHoldTime = document.getElementById("phrase-hold-time");
            this.btnApplyPhrase = document.getElementById("btn-apply-phrase");
            this.btnClearPhrase = document.getElementById("btn-clear-phrase");

            // Global Status & Debug
            this.statusBar = document.getElementById("status-bar");
            this.statusText = document.getElementById("status-text");
            this.debugSection = document.getElementById("debug-section");
            this.btnDebug = document.getElementById("btn-debug");
            this.debugPanel = document.getElementById("debug-panel");
            this.debugLog = document.getElementById("debug-log");
            this.btnRefreshLog = document.getElementById("btn-refresh-log");
            this.btnClearLog = document.getElementById("btn-clear-log");
        }
    };

    // Auto-initialize if DOM is ready, or when loaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { HS.DOM.init(); });
    } else {
        HS.DOM.init();
    }
})(window, document);
