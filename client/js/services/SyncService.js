/**
 * OPENBOX â€” Sync Service Module
 * Handles two-way live synchronization between After Effects layers and the extension panel.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.Sync = {
        isSyncing: false,

        fromAE: function (force) {
            // Pause polling when tab is hidden or backgrounded
            if (document.hidden && !force) return;
            if (HS.Sync.isSyncing && !force) return;
            HS.Sync.isSyncing = true;

            // Protect active user input from being overwritten by background polling
            var isRecentEdit = (Date.now() - HS.State.lastUserInteraction < 2500);

            // Only query full text content when user is actively on Phrase Highlight tab
            var needText = (HS.State.mainTab === "phrases");
            HS.Bridge.eval("$._smartHighlighter.getLayerState(" + needText + ")", function (resStr) {
                HS.Sync.isSyncing = false;
                if (!resStr || resStr === "EvalScript error.") return;
                try {
                    var state = JSON.parse(resStr);

                    // Live Composition & FPS Synchronization
                    if (state) {
                        if (typeof state.fps === "number" && state.fps > 0) {
                            HS.State.fps = state.fps;
                            HS.State.frameDuration = state.frameDuration || (1 / state.fps);
                            HS.State.hasComp = !!state.hasComp;
                            HS.State.compName = state.compName || "";
                            HS.Sync.updateFpsUI(state.fps, state.hasComp, state.compName);
                        } else if (state.hasComp === false) {
                            HS.State.hasComp = false;
                            HS.Sync.updateFpsUI(HS.State.fps || 30, false, "");
                        }
                    }

                    if (state && state.ok) {
                        var layerChanged = (state.layerName && state.layerName !== HS.State.lastSyncedLayer);
                        if (state.layerName) HS.State.lastSyncedLayer = state.layerName;
                        HS.State.hasHighlight = !!state.hasHighlight;

                        // Target Info Strip
                        if (HS.DOM && HS.DOM.targetInfoName) {
                            var rawName = state.layerName || "Text Layer";
                            var truncName = rawName.length > 28 ? (rawName.substring(0, 26) + "...") : rawName;
                            HS.DOM.targetInfoName.textContent = truncName;
                            HS.DOM.targetInfoName.title = rawName;
                        }

                        // Parameter values update
                        if (state.hasHighlight) {
                            if (state.color && HS.DOM.colorPicker && document.activeElement !== HS.DOM.colorPicker && (!isRecentEdit || layerChanged || force)) {
                                HS.DOM.colorPicker.value = state.color;
                                if (HS.DOM.colorHex) HS.DOM.colorHex.textContent = state.color.toUpperCase();
                            }
                            if (!isRecentEdit || layerChanged || force) {
                                if (typeof state.paddingX === "number" && HS.DOM.padXInput && document.activeElement !== HS.DOM.padXInput) {
                                    HS.DOM.padXInput.value = state.paddingX;
                                }
                                if (typeof state.paddingY === "number" && HS.DOM.padYInput && document.activeElement !== HS.DOM.padYInput) {
                                    HS.DOM.padYInput.value = state.paddingY;
                                }
                                if (typeof state.roundness === "number" && HS.DOM.roundInput && document.activeElement !== HS.DOM.roundInput) {
                                    HS.DOM.roundInput.value = state.roundness;
                                }
                                if (typeof state.opacity === "number" && HS.DOM.opacityInput && document.activeElement !== HS.DOM.opacityInput) {
                                    HS.DOM.opacityInput.value = state.opacity;
                                }
                            }
                        }

                        // Tokens board sync for Phrase Highlight tab (only if text was fetched)
                        if (typeof state.text === "string") {
                            if (HS.PhraseManager && HS.PhraseManager.renderBoard) {
                                HS.PhraseManager.renderBoard(state.text, state.layerName);
                                HS.PhraseManager.syncAppliedPhrases();
                            }
                        }

                        // Live Timing Markers Sync to 2-Row Matrix
                        if (state.timingMarkers && (!isRecentEdit || layerChanged || force)) {
                            var tm = state.timingMarkers;
                            if (HS.TimeEngine) {
                                if (typeof tm.inPoint === "number" && HS.DOM && HS.DOM.timeInPoint && document.activeElement !== HS.DOM.timeInPoint) {
                                    HS.DOM.timeInPoint.value = HS.TimeEngine.fromSeconds(tm.inPoint, "tc");
                                    HS.Controls.updateTimeInputTooltip(HS.DOM.timeInPoint);
                                }
                                if (typeof tm.outPoint === "number" && HS.DOM && HS.DOM.timeOutPoint && document.activeElement !== HS.DOM.timeOutPoint) {
                                    HS.DOM.timeOutPoint.value = HS.TimeEngine.fromSeconds(tm.outPoint, "tc");
                                    HS.Controls.updateTimeInputTooltip(HS.DOM.timeOutPoint);
                                }
                                if (typeof tm.inDur === "number" && HS.DOM && HS.DOM.lineDurInput && document.activeElement !== HS.DOM.lineDurInput) {
                                    HS.DOM.lineDurInput.value = HS.TimeEngine.fromSeconds(tm.inDur, "tc");
                                    HS.Controls.updateTimeInputTooltip(HS.DOM.lineDurInput);
                                }
                                if (typeof tm.outDur === "number" && HS.DOM && HS.DOM.outTimeInput && document.activeElement !== HS.DOM.outTimeInput) {
                                    HS.DOM.outTimeInput.value = HS.TimeEngine.fromSeconds(tm.outDur, "tc");
                                    HS.Controls.updateTimeInputTooltip(HS.DOM.outTimeInput);
                                }
                                if (HS.Controls && typeof HS.Controls.syncAllSegmentedFromMaster === "function") {
                                    HS.Controls.syncAllSegmentedFromMaster();
                                }
                            }
                            if (typeof tm.hasOutro === "boolean" && HS.DOM && HS.DOM.outroCheck && document.activeElement !== HS.DOM.outroCheck) {
                                HS.DOM.outroCheck.checked = tm.hasOutro;
                                HS.Controls.syncChipClasses();
                            }
                            if (HS.DOM && HS.DOM.markerSyncCheck && !HS.DOM.markerSyncCheck.checked) {
                                HS.DOM.markerSyncCheck.checked = true;
                                HS.Controls.syncChipClasses();
                            }
                        }
                    } else {
                        HS.State.hasHighlight = false;
                        if (HS.DOM && HS.DOM.targetInfoName) {
                            HS.DOM.targetInfoName.textContent = "Select Text or Shape Layer";
                            HS.DOM.targetInfoName.title = "";
                        }
                        if (HS.PhraseManager && HS.PhraseManager.renderBoard) {
                            HS.PhraseManager.renderBoard("", "");
                            HS.PhraseManager.syncAppliedPhrases();
                        }
                    }
                } catch (e) {}
            });
        },

        updateFpsUI: function (fps, hasComp, compName) {
            var fpsFormatted = Math.round(fps * 1000) / 1000;
            var label = fpsFormatted + " FPS";
            var title = hasComp
                ? ("Active Comp: " + (compName || "Composition") + " (" + fpsFormatted + " FPS)")
                : ("No Active Comp detected. Defaulting to " + fpsFormatted + " FPS");

            if (HS.DOM) {
                [HS.DOM.targetFpsBadge, HS.DOM.phraseFpsBadge].forEach(function (badge) {
                    if (badge) {
                        badge.textContent = label;
                        badge.title = title;
                        badge.classList.toggle("no-comp", !hasComp);
                    }
                });
            }

            if (HS.Controls && typeof HS.Controls.updateTimeInputsForFps === "function") {
                HS.Controls.updateTimeInputsForFps(fps);
            }
        },

        initPolling: function () {
            // Auto-polling listeners:
            // 1. Sync immediately when panel window gains focus
            window.addEventListener("focus", function () { HS.Sync.fromAE(true); });

            // 2. Sync immediately when user moves mouse into the extension panel from AE workspace
            if (document.body) {
                document.body.addEventListener("mouseenter", function () {
                    HS.Sync.fromAE();
                });
            }

            document.addEventListener("visibilitychange", function () {
                if (!document.hidden) HS.Sync.fromAE(true);
            });

            // 3. Gentle background interval: ONLY poll when panel has active focus
            setInterval(function () {
                var isPanelActive = (typeof document.hasFocus === "function") ? document.hasFocus() : true;
                if (isPanelActive && !document.hidden && Date.now() - HS.State.lastUserInteraction > 2500) {
                    HS.Sync.fromAE();
                }
            }, 3000);

            // Initial sync on startup
            HS.Sync.fromAE();
        }
    };
})(window, document);
