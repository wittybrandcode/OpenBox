/**
 * OPENBOX â€” Actions & Dispatcher Module
 * Assembles parameter payloads and executes Smart Highlight and Phrase Highlight actions.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.Actions = {
        getPayload: function () {
            var currentTypewriterMode = HS.State.typewriterMode || "sequential";
            var currentTypewriterSpeedMode = HS.State.typewriterSpeedMode || "constant";
            var isSequential = (currentTypewriterMode === "sequential");
            var isOutro = (HS.DOM && HS.DOM.outroCheck) ? !!HS.DOM.outroCheck.checked : true;
            var currentMotion = (HS.DOM && HS.DOM.motionSelect) ? HS.DOM.motionSelect.value : "typewriter";
            var currentRevealUnit = (HS.DOM && HS.DOM.revealUnitSelect) ? HS.DOM.revealUnitSelect.value : "chars";

            return {
                direction: (HS.DOM && HS.DOM.alignSelect) ? HS.DOM.alignSelect.value : "auto",
                mode: "lines",
                style: (HS.DOM && HS.DOM.styleSelect) ? HS.DOM.styleSelect.value : "box",
                motion: currentMotion,
                typewriterMode: currentTypewriterMode,
                typewriterSpeedMode: currentTypewriterSpeedMode,
                revealUnit: currentRevealUnit,
                syncMarkers: (HS.DOM && HS.DOM.markerSyncCheck) ? HS.DOM.markerSyncCheck.checked : false,
                color: (HS.DOM && HS.DOM.colorPicker) ? HS.Bridge.hexToRgba(HS.DOM.colorPicker.value) : [1, 0.9, 0, 1],
                opacity: (HS.DOM && HS.DOM.opacityInput) ? (parseFloat(HS.DOM.opacityInput.value) || 100) : 100,
                paddingX: (HS.DOM && HS.DOM.padXInput) ? (parseFloat(HS.DOM.padXInput.value) || 10) : 10,
                paddingY: (HS.DOM && HS.DOM.padYInput) ? (parseFloat(HS.DOM.padYInput.value) || 10) : 10,
                roundness: (HS.DOM && HS.DOM.roundInput) ? (parseFloat(HS.DOM.roundInput.value) || 0) : 0,
                animate: (HS.DOM && HS.DOM.animCheck) ? HS.DOM.animCheck.checked : true,
                sequential: isSequential,
                outro: isOutro,
                outroOrder: HS.State.textOutroOrder || HS.State.outroOrder || "first",
                textOutroOrder: HS.State.textOutroOrder || "first",
                boxOutroOrder: (HS.State.syncOutro !== false) ? (HS.State.textOutroOrder || "first") : (HS.State.boxOutroOrder || "first"),
                syncOutro: (HS.State.syncOutro !== false),
                lineDuration: (HS.DOM && HS.DOM.lineDurInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.lineDurInput.value) : (parseFloat(HS.DOM.lineDurInput.value) || 0.35)) : 0.35,
                outTime: (HS.DOM && HS.DOM.outTimeInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.outTimeInput.value) : (parseFloat(HS.DOM.outTimeInput.value) || 1.5)) : 1.5,
                inPoint: (HS.DOM && HS.DOM.timeInPoint) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.timeInPoint.value) : 0) : 0,
                outPoint: (HS.DOM && HS.DOM.timeOutPoint) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.timeOutPoint.value) : 2.5) : 2.5,
                stagger: (HS.DOM && HS.DOM.staggerInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.staggerInput.value) : (parseFloat(HS.DOM.staggerInput.value) || 0)) : 0
            };
        },

        executeSmartAction: function (isClearOnly) {
            HS.Bridge.ensureLoaded(function () {
                if (isClearOnly) {
                    HS.setStatus("Removing highlight & controls...");
                    HS.Bridge.eval("$._smartHighlighter.removeHighlight()", function (res) {
                        if (res && res.indexOf("SUCCESS") !== -1) {
                            HS.showReport(res);
                            HS.State.hasHighlight = false;
                            if (HS.Sync && HS.Sync.fromAE) {
                                setTimeout(function () { HS.Sync.fromAE(true); }, 150);
                            }
                        } else {
                            HS.setStatus(res ? res.replace("ERROR:", "") : "Unknown error", true);
                        }
                    });
                } else {
                    HS.setStatus("Generating highlight...");
                    var payloadStr = JSON.stringify(HS.Actions.getPayload());
                    HS.Bridge.eval("$._smartHighlighter.smartHighlight(" + JSON.stringify(payloadStr) + ")", function (res) {
                        if (res && res.indexOf("SUCCESS") !== -1) {
                            HS.showReport(res);
                        } else {
                            HS.setStatus(res ? res.replace("ERROR:", "") : "Unknown error", true);
                        }
                    });
                }
            });
        },

        applyPhraseHighlight: function () {
            if (!HS.PhraseManager) return;
            var phrases = HS.PhraseManager.getSelectedPhrases();
            if (phrases.length === 0) {
                HS.setStatus("Please select words in the board first", true);
                return;
            }

            var hexCol = (HS.DOM && HS.DOM.phraseColorInput) ? HS.DOM.phraseColorInput.value : "#2ECC71";
            var col = HS.Bridge.hexToRgba(hexCol);
            var style = (HS.DOM && HS.DOM.phraseStyleSelect) ? HS.DOM.phraseStyleSelect.value : "box";
            var padX = (HS.DOM && HS.DOM.phrasePadX) ? (parseFloat(HS.DOM.phrasePadX.value) || 10) : 10;
            var padY = (HS.DOM && HS.DOM.phrasePadY) ? (parseFloat(HS.DOM.phrasePadY.value) || 4) : 4;
            var motion = (HS.DOM && HS.DOM.phraseMotionSelect) ? HS.DOM.phraseMotionSelect.value : "typewriter";
            var currentRevealUnit = (HS.DOM && HS.DOM.revealUnitSelect) ? HS.DOM.revealUnitSelect.value : "chars";
            var isOutro = (HS.DOM && HS.DOM.phraseOutroCheck) ? HS.DOM.phraseOutroCheck.checked : false;
            var holdTime = (HS.DOM && HS.DOM.phraseHoldTime) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.phraseHoldTime.value) : (parseFloat(HS.DOM.phraseHoldTime.value) || 1.2)) : 1.2;
            var isSeq = (HS.DOM && HS.DOM.phraseSeqCheck) ? HS.DOM.phraseSeqCheck.checked : false;

            var payload = {
                phrases: phrases,
                color: col,
                colorHex: hexCol,
                style: style,
                paddingX: padX,
                paddingY: padY,
                motion: motion,
                revealUnit: currentRevealUnit,
                outro: isOutro,
                holdTime: holdTime,
                sequential: isSeq
            };

            HS.setStatus("Applying phrase highlight...");
            HS.Bridge.ensureLoaded(function () {
                var jsonStr = JSON.stringify(payload);
                HS.Bridge.eval("$._smartHighlighter.buildPhraseHighlights(" + JSON.stringify(jsonStr) + ")", function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.showReport(res);
                        HS.State.selectedTokenIndices = [];
                        HS.State.lastClickedTokenIndex = -1;
                        HS.PhraseManager.syncTokenStyles();
                        HS.PhraseManager.updateBadge();
                        HS.PhraseManager.syncAppliedPhrases();
                    } else {
                        HS.setStatus(res ? res.replace("ERROR:", "").trim() : "Failed to apply phrase highlight", true);
                    }
                });
            });
        },

        clearPhraseHighlight: function () {
            HS.setStatus("Clearing phrase highlight...");
            HS.Bridge.ensureLoaded(function () {
                HS.Bridge.eval("$._smartHighlighter.clearPhraseHighlights()", function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.showReport(res);
                        if (HS.PhraseManager) HS.PhraseManager.syncAppliedPhrases();
                    } else {
                        HS.setStatus(res ? res.replace("ERROR:", "").trim() : "Failed to clear phrase highlight", true);
                    }
                });
            });
        },

        applyDefaultSettings: function (custom) {
            var cfg = Object.assign({}, HS.Config.defaults, custom || {});
            if (HS.DOM && HS.DOM.colorPicker && cfg.color) {
                HS.DOM.colorPicker.value = cfg.color;
                if (HS.DOM.colorHex) HS.DOM.colorHex.textContent = cfg.color.toUpperCase();
            }
            if (HS.DOM && HS.DOM.styleSelect && cfg.style) HS.DOM.styleSelect.value = cfg.style;
            if (HS.DOM && HS.DOM.alignSelect && cfg.direction) HS.DOM.alignSelect.value = cfg.direction;
            if (HS.DOM && HS.DOM.padXInput && typeof cfg.paddingX === "number") HS.DOM.padXInput.value = cfg.paddingX;
            if (HS.DOM && HS.DOM.padYInput && typeof cfg.paddingY === "number") HS.DOM.padYInput.value = cfg.paddingY;
            if (HS.DOM && HS.DOM.roundInput && typeof cfg.roundness === "number") HS.DOM.roundInput.value = cfg.roundness;
            if (HS.DOM && HS.DOM.opacityInput && typeof cfg.opacity === "number") HS.DOM.opacityInput.value = cfg.opacity;
            if (HS.DOM && HS.DOM.animCheck && typeof cfg.animate === "boolean") {
                HS.DOM.animCheck.checked = cfg.animate;
                if (HS.DOM.animControls) HS.DOM.animControls.classList.toggle("disabled", !cfg.animate);
            }
            if (HS.DOM && HS.DOM.motionSelect && cfg.motion) HS.DOM.motionSelect.value = cfg.motion;
            if (HS.DOM && HS.DOM.sequentialCheck && typeof cfg.sequential === "boolean") {
                HS.DOM.sequentialCheck.checked = cfg.sequential;
            }
            if (HS.DOM && HS.DOM.timeInPoint) {
                var inPt = (typeof cfg.inPoint === "number") ? cfg.inPoint : 0;
                HS.DOM.timeInPoint.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(inPt, "tc") : "00:00:00";
                if (HS.Controls && HS.Controls.updateTimeInputTooltip) HS.Controls.updateTimeInputTooltip(HS.DOM.timeInPoint);
            }
            if (HS.DOM && HS.DOM.timeOutPoint) {
                var outPt = (typeof cfg.outPoint === "number") ? cfg.outPoint : 2.5;
                HS.DOM.timeOutPoint.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(outPt, "tc") : "00:02:15";
                if (HS.Controls && HS.Controls.updateTimeInputTooltip) HS.Controls.updateTimeInputTooltip(HS.DOM.timeOutPoint);
            }
            if (HS.DOM && HS.DOM.lineDurInput && typeof cfg.lineDuration === "number") {
                HS.DOM.lineDurInput.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(cfg.lineDuration, "tc") : "00:00:15";
                if (HS.Controls && HS.Controls.updateTimeInputTooltip) HS.Controls.updateTimeInputTooltip(HS.DOM.lineDurInput);
            }
            if (HS.DOM && HS.DOM.staggerInput && typeof cfg.stagger === "number") {
                HS.DOM.staggerInput.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(cfg.stagger) : cfg.stagger;
                if (HS.Controls && HS.Controls.updateTimeInputTooltip) HS.Controls.updateTimeInputTooltip(HS.DOM.staggerInput);
            }
            if (HS.DOM && HS.DOM.outroCheck && typeof cfg.outro === "boolean") {
                HS.DOM.outroCheck.checked = cfg.outro;
                if (HS.DOM.outTimeInput) HS.DOM.outTimeInput.disabled = !cfg.outro;
                if (HS.DOM.outTimeCol) HS.DOM.outTimeCol.classList.toggle("disabled", !cfg.outro);
                if (HS.DOM.timeOutPoint) HS.DOM.timeOutPoint.disabled = !cfg.outro;
                if (HS.DOM.timeOutPointBox) HS.DOM.timeOutPointBox.classList.toggle("disabled", !cfg.outro);
                if (HS.DOM.outroDirectionBar) HS.DOM.outroDirectionBar.classList.toggle("disabled", !cfg.outro);
            }
            if (HS.DOM && HS.DOM.outTimeInput && typeof cfg.outTime === "number") {
                HS.DOM.outTimeInput.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(cfg.outTime, "tc") : "00:00:10";
                if (HS.Controls && HS.Controls.updateTimeInputTooltip) HS.Controls.updateTimeInputTooltip(HS.DOM.outTimeInput);
            }
            if (typeof cfg.syncOutro === "boolean") HS.State.syncOutro = cfg.syncOutro;
            if (cfg.textOutroOrder) HS.State.textOutroOrder = cfg.textOutroOrder;
            if (cfg.boxOutroOrder) HS.State.boxOutroOrder = cfg.boxOutroOrder;
            if (cfg.typewriterMode) HS.State.typewriterMode = cfg.typewriterMode;
            if (cfg.typewriterSpeedMode) HS.State.typewriterSpeedMode = cfg.typewriterSpeedMode;
            if (HS.DOM && HS.DOM.sequentialCheck) HS.DOM.sequentialCheck.checked = (HS.State.typewriterMode === "sequential");
            if (HS.Controls && HS.Controls.syncOutroDirectionUI) HS.Controls.syncOutroDirectionUI();
            if (HS.DOM && HS.DOM.markerSyncCheck && typeof cfg.syncMarkers === "boolean") HS.DOM.markerSyncCheck.checked = cfg.syncMarkers;
            if (HS.Controls && HS.Controls.syncChipClasses) HS.Controls.syncChipClasses();
            if (HS.Controls && HS.Controls.syncShapeButtons) HS.Controls.syncShapeButtons();
            if (HS.Controls && HS.Controls.syncDirectionButtons) HS.Controls.syncDirectionButtons();
            if (HS.Controls && HS.Controls.syncMotionButtons) HS.Controls.syncMotionButtons();
            if (HS.Controls && HS.Controls.syncTypewriterButtons) HS.Controls.syncTypewriterButtons();
            if (HS.Controls && HS.Controls.syncRevealButtons) HS.Controls.syncRevealButtons();
            if (HS.Controls && HS.Controls.updateColorIndicator && cfg.color) HS.Controls.updateColorIndicator(cfg.color);
        },

        initEvents: function () {
            if (!HS.DOM) return;

            // Smart Apply & Clear Buttons
            if (HS.DOM.btnSmartApply) {
                HS.DOM.btnSmartApply.addEventListener("click", function (e) {
                    var isClear = e.altKey || e.shiftKey;
                    HS.Actions.executeSmartAction(isClear);
                });
                HS.DOM.btnSmartApply.addEventListener("contextmenu", function (e) {
                    e.preventDefault();
                    HS.Actions.executeSmartAction(true);
                });
            }

            if (HS.DOM.btnClear) {
                HS.DOM.btnClear.addEventListener("click", function () {
                    HS.Actions.executeSmartAction(true);
                });
            }

            if (HS.DOM.btnApplyPhrase) {
                HS.DOM.btnApplyPhrase.addEventListener("click", HS.Actions.applyPhraseHighlight);
            }

            if (HS.DOM.btnClearPhrase) {
                HS.DOM.btnClearPhrase.addEventListener("click", HS.Actions.clearPhraseHighlight);
            }
        }
    };
})(window, document);
