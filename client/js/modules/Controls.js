/**
 * OPENBOX â€” Controls Module
 * Handles UI input controls: live color, steppers, scrubbing, chips, and outro direction.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.Controls = {
        setLiveUpdate: function (enabled) {
            HS.markInteraction();
            HS.State.liveUpdate = !!enabled;
            try {
                var storage = (typeof localStorage !== "undefined") ? localStorage : (window && window.localStorage ? window.localStorage : null);
                if (storage) storage.setItem("hs_live_update", HS.State.liveUpdate ? "true" : "false");
            } catch (e) {}
            HS.Controls.syncLiveUpdateUI();
            var msg = HS.State.liveUpdate
                ? "Live Auto-Update: ENABLED (Ø§Ù„ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…ÙØ¹Ù‘Ù„)"
                : "Live Auto-Update: PAUSED (Ø§Ù„ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…Ø¹Ø·Ù‘Ù„ - Ø§Ø³ØªØ®Ø¯Ù… Ø²Ø± Ø§Ù„Ø¨Ø±Ù‚ Ù„Ù„ØªØ·Ø¨ÙŠÙ‚)";
            HS.setStatus(msg);
        },

        toggleLiveUpdate: function () {
            HS.Controls.setLiveUpdate(!HS.State.liveUpdate);
        },

        syncLiveUpdateUI: function () {
            if (!HS.DOM || !HS.DOM.btnLiveUpdate) return;
            var isActive = (HS.State.liveUpdate !== false);
            HS.DOM.btnLiveUpdate.classList.toggle("active", isActive);
            HS.DOM.btnLiveUpdate.setAttribute("data-active", isActive ? "true" : "false");
            HS.DOM.btnLiveUpdate.title = isActive
                ? "Live Auto-Update: ON (ØªØ­Ø¯ÙŠØ« Ù…Ø¨Ø§Ø´Ø± ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù†Ø´Ø· - Ø§Ù†Ù‚Ø± Ù„Ù„ØªØ¹Ø·ÙŠÙ„ ÙˆØ§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ Ø²Ø± Ø§Ù„Ø¨Ø±Ù‚)"
                : "Live Auto-Update: OFF (ØªØ­Ø¯ÙŠØ« Ù…Ø¨Ø§Ø´Ø± Ù…Ø¹Ø·Ù‘Ù„ - Ø§Ù†Ù‚Ø± Ù„Ù„ØªÙØ¹ÙŠÙ„ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ)";
        },

        applyLiveColor: function (hex) {
            if (HS.State.liveUpdate === false) return;
            HS.Bridge.eval("$._smartHighlighter.setQuickColor('" + hex + "', 'all')", function (res) {
                if (res && res.indexOf("SUCCESS") !== -1) {
                    HS.setStatus(res.replace("SUCCESS:", "").trim());
                } else if (res && res.indexOf("ERROR") !== -1) {
                    HS.setStatus(res.replace("ERROR:", "").trim(), true);
                }
            });
        },

        liveParamTimers: {},
        applyLiveParamThrottled: function (paramName, val) {
            HS.markInteraction();
            if (HS.State.liveUpdate === false) return;
            if (HS.Controls.liveParamTimers[paramName]) {
                cancelAnimationFrame(HS.Controls.liveParamTimers[paramName]);
            }
            HS.Controls.liveParamTimers[paramName] = requestAnimationFrame(function () {
                HS.Controls.applyLiveParam(paramName, val);
                delete HS.Controls.liveParamTimers[paramName];
            });
        },

        applyLiveParam: function (paramName, val) {
            HS.markInteraction();
            if (HS.State.liveUpdate === false) return;
            HS.Bridge.eval("$._smartHighlighter.setQuickParam('" + paramName + "', " + val + ", 'all')", function (res) {
                if (res && res.indexOf("SUCCESS") !== -1) {
                    HS.setStatus(res.replace("SUCCESS:", "").trim());
                }
            });
        },

        isTimeInput: function (input) {
            if (!input || !input.id) return false;
            return (input.id === "time-in-point" || input.id === "time-out-point" || input.id === "line-dur" || input.id === "out-time" || input.id === "stagger" || input.id === "phrase-hold-time");
        },

        updateTimeInputTooltip: function (input) {
            if (!HS.Controls.isTimeInput(input)) return;
            var allowZero = (input.id === "stagger" || input.id === "time-in-point");
            var tip = HS.TimeEngine ? HS.TimeEngine.getTooltipText(input.value, allowZero) : input.value;
            input.title = tip;
            var box = input.closest(".precision-input-box");
            if (box) {
                var lbl = box.querySelector(".scrub-label");
                if (lbl) lbl.title = tip;
            }
        },

        pad2: function (num) {
            var n = parseInt(num, 10) || 0;
            return (n < 10 ? "0" : "") + Math.max(0, n);
        },

        timecodeToFrames: function (tc, fps) {
            if (HS.TimeEngine) {
                if (typeof fps === "number" && fps > 0) {
                    var prevFps = HS.TimeEngine.getFPS();
                    HS.TimeEngine.setFPS(fps);
                    var frames = HS.TimeEngine.getFrameCount(tc, true);
                    HS.TimeEngine.setFPS(prevFps);
                    return frames;
                }
                return HS.TimeEngine.getFrameCount(tc, true);
            }
            return 0;
        },

        framesToTimecodeObj: function (totalFrames, fps) {
            fps = fps || (HS.TimeEngine ? HS.TimeEngine.getFPS() : 25) || 25;
            var tf = Math.max(0, Math.round(totalFrames));
            var sec = tf / fps;
            var prevFps = (HS.TimeEngine && typeof fps === "number" && fps > 0) ? HS.TimeEngine.getFPS() : null;
            if (prevFps !== null) HS.TimeEngine.setFPS(fps);
            var str = HS.TimeEngine ? HS.TimeEngine.fromSeconds(sec, "tc") : "00:00:00";
            if (prevFps !== null) HS.TimeEngine.setFPS(prevFps);
            var parts = str.split(":");
            return {
                m: parts[0] || "00",
                s: parts[1] || "00",
                f: parts[2] || "00",
                str: str,
                seconds: sec
            };
        },

        syncClusterFromMaster: function (clusterOrId) {
            var cluster = (typeof clusterOrId === "string")
                ? document.querySelector('.time-segmented-cluster[data-target="' + clusterOrId + '"]')
                : clusterOrId;
            if (!cluster) return;
            var targetId = cluster.getAttribute("data-target");
            var master = document.getElementById(targetId);
            if (!master) return;
            var fps = (HS.TimeEngine ? HS.TimeEngine.getFPS() : 25) || 25;
            var tcObj = HS.Controls.framesToTimecodeObj(HS.Controls.timecodeToFrames(master.value, fps), fps);
            var mInp = cluster.querySelector('.time-seg-input[data-unit="m"]');
            var sInp = cluster.querySelector('.time-seg-input[data-unit="s"]');
            var fInp = cluster.querySelector('.time-seg-input[data-unit="f"]');
            if (mInp && document.activeElement !== mInp) mInp.value = tcObj.m;
            if (sInp && document.activeElement !== sInp) sInp.value = tcObj.s;
            if (fInp && document.activeElement !== fInp) fInp.value = tcObj.f;
            HS.Controls.updateTimeInputTooltip(master);
        },

        syncAllSegmentedFromMaster: function () {
            document.querySelectorAll('.time-segmented-cluster').forEach(function (cluster) {
                HS.Controls.syncClusterFromMaster(cluster);
            });
        },

        updateMasterFromCluster: function (cluster) {
            if (!cluster) return;
            var targetId = cluster.getAttribute("data-target");
            var master = document.getElementById(targetId);
            if (!master) return;
            var fps = (HS.TimeEngine ? HS.TimeEngine.getFPS() : 25) || 25;
            var mInp = cluster.querySelector('.time-seg-input[data-unit="m"]');
            var sInp = cluster.querySelector('.time-seg-input[data-unit="s"]');
            var fInp = cluster.querySelector('.time-seg-input[data-unit="f"]');
            var m = mInp ? mInp.value : 0;
            var s = sInp ? sInp.value : 0;
            var f = fInp ? fInp.value : 0;
            var totalF = HS.Controls.timecodeToFrames(HS.Controls.pad2(m) + ":" + HS.Controls.pad2(s) + ":" + HS.Controls.pad2(f), fps);
            var tcObj = HS.Controls.framesToTimecodeObj(totalF, fps);
            master.value = tcObj.str;
            HS.Controls.syncClusterFromMaster(cluster);
            master.dispatchEvent(new Event("change", { bubbles: true }));
        },

        stepSegmentUnit: function (cluster, unit, isUp, multiplier) {
            multiplier = multiplier || 1;
            if (!cluster) return;
            var targetId = cluster.getAttribute("data-target");
            var master = document.getElementById(targetId);
            if (!master) return;
            var fps = (HS.TimeEngine ? HS.TimeEngine.getFPS() : 25) || 25;

            var curFrames = HS.Controls.timecodeToFrames(master.value, fps);
            var frameDelta = 0;
            if (unit === "m") {
                frameDelta = (isUp ? 1 : -1) * (fps * 60) * multiplier;
            } else if (unit === "s") {
                frameDelta = (isUp ? 1 : -1) * fps * multiplier;
            } else if (unit === "f") {
                frameDelta = (isUp ? 1 : -1) * multiplier;
            }

            var allowZero = (targetId === "stagger" || targetId === "time-in-point");
            var minFrames = allowZero ? 0 : 1;
            var newFrames = Math.max(minFrames, curFrames + frameDelta);
            var tcObj = HS.Controls.framesToTimecodeObj(newFrames, fps);
            master.value = tcObj.str;
            HS.Controls.syncClusterFromMaster(cluster);
            master.dispatchEvent(new Event("change", { bubbles: true }));
        },

        updateTimeInputsForFps: function (fps) {
            if (HS.TimeEngine && typeof HS.TimeEngine.setFPS === "function") {
                HS.TimeEngine.setFPS(fps);
            }
            var timeIds = ["time-in-point", "time-out-point", "line-dur", "out-time", "stagger", "phrase-hold-time"];
            timeIds.forEach(function (id) {
                var inp = document.getElementById(id);
                if (!inp) return;
                // Never overwrite while the user is actively focused/typing in this input!
                if (document.activeElement === inp) return;
                var allowZero = (id === "stagger" || id === "time-in-point");
                if (HS.TimeEngine) {
                    inp.value = HS.TimeEngine.normalize(inp.value, undefined, allowZero);
                }
                HS.Controls.updateTimeInputTooltip(inp);
            });

            // Update all unit toggle button labels
            var fmt = (HS.TimeEngine ? HS.TimeEngine.getFormat() : "sf");
            var fmtLabel = (fmt === "sf") ? "s:f" : ((fmt === "f") ? "f" : "s");
            document.querySelectorAll(".unit-toggle-btn").forEach(function (btn) {
                btn.textContent = fmtLabel;
            });

            // Sync segmented timecode clusters to new FPS values
            if (HS.Controls && HS.Controls.syncAllSegmentedFromMaster) {
                HS.Controls.syncAllSegmentedFromMaster();
            }
        },

        cycleTimeFormat: function () {
            if (!HS.TimeEngine) return;
            var newFmt = HS.TimeEngine.cycleFormat();
            HS.Controls.updateTimeInputsForFps(HS.TimeEngine.getFPS());
            var fmtDesc = (newFmt === "sf") ? "Seconds:Frames (s:f)" : ((newFmt === "f") ? "Pure Frames (f)" : "Decimal Seconds (s)");
            HS.setStatus("Time Format: " + fmtDesc);
        },

        placeTimingMarkers: function () {
            HS.markInteraction();
            var inPoint = (HS.DOM && HS.DOM.timeInPoint) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.timeInPoint.value) : 0) : 0;
            var outPoint = (HS.DOM && HS.DOM.timeOutPoint) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.timeOutPoint.value) : 2.5) : 2.5;
            var inDur = (HS.DOM && HS.DOM.lineDurInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.lineDurInput.value) : 0.6) : 0.6;
            var outDur = (HS.DOM && HS.DOM.outTimeInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.outTimeInput.value) : 0.4) : 0.4;
            var hasOutro = (HS.DOM && HS.DOM.outroCheck) ? !!HS.DOM.outroCheck.checked : true;

            HS.setStatus("Placing timing markers on text layer...");
            var code = "$._smartHighlighter.addTimingMarkers(" + inPoint + ", " + outPoint + ", " + inDur + ", " + outDur + ", " + hasOutro + ")";
            HS.Bridge.eval(code, function (res) {
                if (res && res.indexOf("SUCCESS") !== -1) {
                    HS.setStatus(res.replace("SUCCESS:", "").trim());
                    // Auto-enable marker sync toggle
                    if (HS.DOM && HS.DOM.markerSyncCheck && !HS.DOM.markerSyncCheck.checked) {
                        HS.DOM.markerSyncCheck.checked = true;
                        HS.Controls.syncChipClasses();
                    }
                    if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                        HS.Actions.executeSmartAction(false);
                    }
                } else if (res && res.indexOf("ERROR") !== -1) {
                    HS.setStatus(res.replace("ERROR:", "").trim(), true);
                }
            });
        },

        syncMarkersToAE: function (immediate) {
            if (HS.State.liveUpdate === false) return;
            if (!HS.DOM || !HS.DOM.markerSyncCheck || !HS.DOM.markerSyncCheck.checked) return;

            var doSync = function () {
                var inPoint = (HS.DOM && HS.DOM.timeInPoint) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.timeInPoint.value) : 0) : 0;
                var outPoint = (HS.DOM && HS.DOM.timeOutPoint) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.timeOutPoint.value) : 2.5) : 2.5;
                var inDur = (HS.DOM && HS.DOM.lineDurInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.lineDurInput.value) : 0.6) : 0.6;
                var outDur = (HS.DOM && HS.DOM.outTimeInput) ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.outTimeInput.value) : 0.4) : 0.4;
                var hasOutro = (HS.DOM && HS.DOM.outroCheck) ? !!HS.DOM.outroCheck.checked : true;

                var code = "$._smartHighlighter.addTimingMarkers(" + inPoint + ", " + outPoint + ", " + inDur + ", " + outDur + ", " + hasOutro + ")";
                HS.Bridge.eval(code, function () {});
            };

            if (HS.Controls._markerDebounceTimer) {
                clearTimeout(HS.Controls._markerDebounceTimer);
                HS.Controls._markerDebounceTimer = null;
            }

            if (immediate === true) {
                doSync();
            } else {
                HS.Controls._markerDebounceTimer = setTimeout(doSync, 120);
            }
        },

        adjustStepper: function (input, isUp, multiplier) {
            HS.markInteraction();
            if (!input || input.disabled) return;
            multiplier = multiplier || 1;

            if (HS.Controls.isTimeInput(input)) {
                var delta = (multiplier >= 10) ? (isUp ? 5 : -5) : (isUp ? 1 : -1);
                var allowZero = (input.id === "stagger");
                if (HS.TimeEngine) {
                    input.value = HS.TimeEngine.addFrames(input.value, delta, undefined, allowZero);
                }
                HS.Controls.updateTimeInputTooltip(input);
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                return;
            }

            var step = (parseFloat(input.step) || 1) * multiplier;
            var val = parseFloat(input.value) || 0;
            val = isUp ? val + step : val - step;
            var min = input.min !== "" ? parseFloat(input.min) : -Infinity;
            var max = input.max !== "" ? parseFloat(input.max) : Infinity;
            val = Math.max(min, Math.min(max, val));

            var stepStr = input.step || "1";
            if (stepStr.indexOf(".") !== -1) {
                var decimals = stepStr.split(".")[1].length;
                input.value = val.toFixed(decimals);
            } else {
                input.value = Math.round(val);
            }

            input.dispatchEvent(new Event("change", { bubbles: true }));
        },

        syncChipClasses: function () {
            if (!HS.DOM) return;
            var chips = [
                { id: "chip-seq", chk: HS.DOM.sequentialCheck },
                { id: "chip-outro", chk: HS.DOM.outroCheck },
                { id: "chip-markers", chk: HS.DOM.markerSyncCheck },
                { id: "chip-phrase-outro", chk: HS.DOM.phraseOutroCheck },
                { id: "chip-phrase-seq", chk: HS.DOM.phraseSeqCheck }
            ];
            chips.forEach(function (item) {
                var el = document.getElementById(item.id);
                if (!el || !item.chk) return;
                var isActive = !!item.chk.checked;
                el.classList.toggle("active", isActive);
                el.setAttribute("data-active", isActive ? "true" : "false");
            });
        },

        setOutroOrder: function (order) {
            HS.Controls.setTextOutroOrder(order);
        },

        setTextOutroOrder: function (order) {
            HS.markInteraction();
            HS.State.textOutroOrder = order;
            HS.State.outroOrder = order;
            if (HS.State.syncOutro !== false) {
                HS.State.boxOutroOrder = order;
            }
            HS.Controls.syncOutroDirectionUI();
            var label = (order === "last") ? "Reverse (â†)" : "Forward (â†’)";
            HS.setStatus("Text Exit Direction: " + label);
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        setBoxOutroOrder: function (order) {
            HS.markInteraction();
            HS.State.boxOutroOrder = order;
            HS.Controls.syncOutroDirectionUI();
            var label = (order === "last") ? "Reverse (â†)" : "Forward (â†’)";
            HS.setStatus("Containers Exit Direction: " + label);
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        setOutroSync: function (isSynced) {
            HS.markInteraction();
            HS.State.syncOutro = !!isSynced;
            if (HS.State.syncOutro) {
                HS.State.boxOutroOrder = HS.State.textOutroOrder || "first";
            }
            HS.Controls.syncOutroDirectionUI();
            var desc = HS.State.syncOutro ? "Containers Synced to Text (ØªØ²Ø§Ù…Ù† Ø§Ù„Ø­Ø§ÙˆÙŠØ§Øª Ù…Ø¹ Ø§Ù„Ù†Øµ)" : "Independent Exit (Ø®Ø±ÙˆØ¬ Ù…Ù†ÙØµÙ„ Ù„Ù„Ø­Ø§ÙˆÙŠØ§Øª)";
            HS.setStatus("Outro Sync: " + desc);
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        syncOutroDirectionUI: function () {
            var tOrder = HS.State.textOutroOrder || "first";
            var bOrder = (HS.State.syncOutro !== false) ? tOrder : (HS.State.boxOutroOrder || tOrder);
            var isSynced = (HS.State.syncOutro !== false);

            var svgTextForward = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7h7M6 7v10"/><path d="M12 12h9.5m-4.5-5 4.5 5-4.5 5"/></svg>';
            var svgTextReverse = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12H2.5m4.5-5-4.5 5 4.5 5"/><path d="M14.5 7h7M18 7v10"/></svg>';

            var svgBoxForward = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="7" height="10" rx="1.5"/><path d="M12 12h9.5m-4.5-5 4.5 5-4.5 5"/></svg>';
            var svgBoxReverse = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12H2.5m4.5-5-4.5 5 4.5 5"/><rect x="14.5" y="7" width="7" height="10" rx="1.5"/></svg>';

            if (HS.DOM) {
                if (HS.DOM.btnTextOutroOrder) {
                    HS.DOM.btnTextOutroOrder.dataset.order = tOrder;
                    HS.DOM.btnTextOutroOrder.innerHTML = (tOrder === "last") ? svgTextReverse : svgTextForward;
                    HS.DOM.btnTextOutroOrder.title = (tOrder === "last")
                        ? "Text Exit Direction: Reverse (â† / Backspace). Click to toggle: Forward (â†’)"
                        : "Text Exit Direction: Forward (â†’). Click to toggle: Reverse (â†)";
                }

                if (HS.DOM.btnSyncOutroOrder) {
                    HS.DOM.btnSyncOutroOrder.classList.toggle("active", isSynced);
                    HS.DOM.btnSyncOutroOrder.dataset.synced = isSynced ? "true" : "false";
                    HS.DOM.btnSyncOutroOrder.title = isSynced
                        ? "Containers Synced to Text: Click to unlink for independent container direction"
                        : "Containers Unlinked: Click to lock containers to text direction";
                }

                if (HS.DOM.btnBoxOutroOrder) {
                    HS.DOM.btnBoxOutroOrder.dataset.order = bOrder;
                    HS.DOM.btnBoxOutroOrder.disabled = isSynced;
                    HS.DOM.btnBoxOutroOrder.classList.toggle("disabled", isSynced);
                    HS.DOM.btnBoxOutroOrder.innerHTML = (bOrder === "last") ? svgBoxReverse : svgBoxForward;
                    HS.DOM.btnBoxOutroOrder.title = isSynced
                        ? "Box Exit Direction (Locked to Text via ðŸ”—): " + (tOrder === "last" ? "Reverse (â†)" : "Forward (â†’)") + " (Unlink to customize)"
                        : "Box Exit Direction: " + (bOrder === "last" ? "Reverse (â†)" : "Forward (â†’)") + ". Click to toggle.";
                }
            }
        },

        setShape: function (shape) {
            HS.markInteraction();
            if (HS.DOM && HS.DOM.styleSelect) {
                HS.DOM.styleSelect.value = shape;
            }
            HS.Controls.syncShapeButtons();
            var shapeLabels = {
                box: "Box (Ù…Ø³ØªØ·ÙŠÙ„)",
                pill: "Pill (ÙƒØ¨Ø³ÙˆÙ„Ø©)",
                marker: "Marker (Ù…Ø§Ø±ÙƒØ±)",
                underline: "Underline (ØªØ³Ø·ÙŠØ±)",
                outline: "Outline (Ø¥Ø·Ø§Ø±)"
            };
            HS.setStatus("Shape: " + (shapeLabels[shape] || shape));
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        syncShapeButtons: function () {
            var cur = (HS.DOM && HS.DOM.styleSelect) ? HS.DOM.styleSelect.value : "box";
            document.querySelectorAll(".shape-btn").forEach(function (b) {
                b.classList.toggle("active", b.dataset.shape === cur);
            });
        },

        setDirection: function (dir) {
            HS.markInteraction();
            if (HS.DOM && HS.DOM.alignSelect) {
                HS.DOM.alignSelect.value = dir;
            }
            HS.Controls.syncDirectionButtons();
            var dirLabels = {
                auto: "Auto (ØªÙ„Ù‚Ø§Ø¦ÙŠ)",
                ltr: "LTR (ÙŠØ³Ø§Ø± Ù„ÙŠÙ…ÙŠÙ†)",
                rtl: "RTL (ÙŠÙ…ÙŠÙ† Ù„ÙŠØ³Ø§Ø±)",
                center: "Center (Ù…Ù†ØªØµÙ)"
            };
            HS.setStatus("Direction: " + (dirLabels[dir] || dir));
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        syncDirectionButtons: function () {
            var cur = (HS.DOM && HS.DOM.alignSelect) ? HS.DOM.alignSelect.value : "auto";
            document.querySelectorAll(".dir-btn").forEach(function (b) {
                b.classList.toggle("active", b.dataset.dir === cur);
            });
        },

        setMotion: function (motion) {
            HS.markInteraction();
            if (HS.DOM && HS.DOM.motionSelect) {
                HS.DOM.motionSelect.value = motion;
                HS.DOM.motionSelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
            HS.Controls.syncMotionButtons();
            HS.Controls.syncTypewriterButtons();
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        setTypewriterMode: function (mode) {
            HS.markInteraction();
            HS.State.typewriterMode = mode;
            if (HS.DOM && HS.DOM.sequentialCheck) {
                HS.DOM.sequentialCheck.checked = (mode === "sequential");
            }
            if (HS.DOM && HS.DOM.motionSelect) {
                HS.DOM.motionSelect.value = "typewriter";
            }
            HS.Controls.syncTypewriterButtons();
            var modeLabel = (mode === "sequential") ? "Sequential (ØªØªØ§Ø¨Ø¹ Ø§Ù„Ø£Ø³Ø·Ø±)" : "Parallel Lines (Ø¨Ø¯Ø¡ Ø§Ù„Ø£Ø³Ø·Ø± Ø¨Ø§Ù„ØªÙˆØ§Ø²ÙŠ)";
            HS.setStatus("Typewriter Mode: " + modeLabel);
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        toggleTypewriterSpeedMode: function () {
            HS.markInteraction();
            var cur = HS.State.typewriterSpeedMode || "constant";
            var next = (cur === "constant") ? "synced" : "constant";
            HS.State.typewriterSpeedMode = next;
            // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙÙŠ Ø§Ù„Ù†Ù…Ø· Ø§Ù„Ù…ØªØ³Ù„Ø³Ù„ ÙˆØ¶ØºØ· Ø²Ø± Ø§Ù„Ø³Ø±Ø¹Ø©ØŒ Ù†Ø­ÙˆÙ„Ù‡ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù„Ù„Ù…ØªÙˆØ§Ø²ÙŠ Ù„ÙŠØ±Ù‰ Ø§Ù„Ù†ØªÙŠØ¬Ø©
            if (HS.State.typewriterMode === "sequential") {
                HS.State.typewriterMode = "parallel";
                if (HS.DOM && HS.DOM.sequentialCheck) {
                    HS.DOM.sequentialCheck.checked = false;
                }
            }
            HS.Controls.syncTypewriterButtons();
            var speedLabel = (next === "synced") ? "Synchronized Finish (Ø§Ù†ØªÙ‡Ø§Ø¡ Ù…ØªØ²Ø§Ù…Ù†)" : "Constant Speed (Ø«Ø¨Ø§Øª Ø³Ø±Ø¹Ø© Ø§Ù„ÙƒÙ„Ù…Ø§Øª)";
            HS.setStatus("Typewriter Speed: " + speedLabel);
            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                HS.Actions.executeSmartAction(false);
            }
        },

        syncTypewriterButtons: function () {
            var mode = HS.State.typewriterMode || "sequential";
            var speed = HS.State.typewriterSpeedMode || "constant";

            if (HS.DOM && HS.DOM.btnTypewriterSeq) {
                HS.DOM.btnTypewriterSeq.classList.toggle("active", mode === "sequential");
            }
            if (HS.DOM && HS.DOM.btnTypewriterPara) {
                HS.DOM.btnTypewriterPara.classList.toggle("active", mode === "parallel");
            }
            if (HS.DOM && HS.DOM.btnTypewriterSpeedToggle) {
                var btn = HS.DOM.btnTypewriterSpeedToggle;
                var isSynced = (speed === "synced");
                btn.classList.toggle("mode-synced", isSynced);
                btn.classList.toggle("mode-constant", !isSynced);
                btn.classList.toggle("active", isSynced);
                btn.dataset.speedMode = speed;
                btn.title = isSynced
                    ? "Synchronized Finish: All lines complete typing simultaneously (Ø§Ù†ØªÙ‡Ø§Ø¡ Ù…ØªØ²Ø§Ù…Ù† Ù„ÙƒØ§ÙØ© Ø§Ù„Ø£Ø³Ø·Ø±)"
                    : "Constant Word Speed: Slower/Longer lines finish naturally (Ø«Ø¨Ø§Øª Ø³Ø±Ø¹Ø© Ø§Ù„ÙƒÙ„Ù…Ø§Øª)";
            }
            var fieldRev = document.getElementById("field-reveal-unit");
            if (fieldRev) {
                fieldRev.style.opacity = "1";
                fieldRev.style.pointerEvents = "auto";
            }
        },

        syncMotionButtons: function () {
            var cur = (HS.DOM && HS.DOM.motionSelect) ? HS.DOM.motionSelect.value : "typewriter";
            document.querySelectorAll(".motion-btn").forEach(function (b) {
                b.classList.toggle("active", b.dataset.motion === cur);
            });
            HS.Controls.syncTypewriterButtons();
            var isTypewriter = (cur === "typewriter");
            var fieldRev = document.getElementById("field-reveal-unit");
            if (fieldRev) {
                fieldRev.style.opacity = isTypewriter ? "1" : "0.4";
                fieldRev.style.pointerEvents = isTypewriter ? "auto" : "none";
            }
        },

        setRevealUnit: function (unit) {
            HS.markInteraction();
            if (HS.DOM && HS.DOM.revealUnitSelect) {
                HS.DOM.revealUnitSelect.value = unit;
                HS.DOM.revealUnitSelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
            HS.Controls.syncRevealButtons();
        },

        syncRevealButtons: function () {
            var cur = (HS.DOM && HS.DOM.revealUnitSelect) ? HS.DOM.revealUnitSelect.value : "chars";
            document.querySelectorAll(".reveal-btn").forEach(function (b) {
                b.classList.toggle("active", b.dataset.unit === cur);
            });
        },

        updateColorIndicator: function (hex) {
            if (!hex) return;
            var dot = document.getElementById("color-indicator-dot");
            if (dot) dot.style.backgroundColor = hex;

            var recent = HS.DOM && HS.DOM.recentColorSwatch ? HS.DOM.recentColorSwatch : document.getElementById("recent-color-swatch");
            if (recent) {
                recent.style.backgroundColor = hex;
                recent.dataset.color = hex;
                recent.title = "Last Chosen Color: " + hex.toUpperCase() + " (Ø¢Ø®Ø± Ù„ÙˆÙ† ØªÙ… Ø§Ø®ØªÙŠØ§Ø±Ù‡)";
                try { localStorage.setItem("hs_recent_color", hex); } catch (e) {}
            }

            var normHex = hex.toLowerCase();
            var foundPreset = false;
            document.querySelectorAll("#view-paragraph .swatches-bar .swatch-btn:not(.swatch-recent)").forEach(function (b) {
                var isMatch = b.dataset.color && b.dataset.color.toLowerCase() === normHex;
                b.classList.toggle("active", isMatch);
                if (isMatch) foundPreset = true;
            });
            if (recent) {
                recent.classList.toggle("active", !foundPreset);
            }
        },

        setPhraseShape: function (shape) {
            HS.markInteraction();
            if (HS.DOM && HS.DOM.phraseStyleSelect) {
                HS.DOM.phraseStyleSelect.value = shape;
            }
            HS.Controls.syncPhraseShapeButtons();
            var shapeLabels = {
                box: "Box (Ù…Ø³ØªØ·ÙŠÙ„)",
                pill: "Pill (ÙƒØ¨Ø³ÙˆÙ„Ø©)",
                marker: "Marker (Ù…Ø§Ø±ÙƒØ±)",
                underline: "Underline (ØªØ³Ø·ÙŠØ±)",
                outline: "Outline (Ø¥Ø·Ø§Ø±)"
            };
            HS.setStatus("Phrase Shape: " + (shapeLabels[shape] || shape));
        },

        syncPhraseShapeButtons: function () {
            var cur = (HS.DOM && HS.DOM.phraseStyleSelect) ? HS.DOM.phraseStyleSelect.value : "box";
            document.querySelectorAll(".phrase-shape-btn").forEach(function (b) {
                b.classList.toggle("active", b.dataset.shape === cur);
            });
        },

        setPhraseMotion: function (motion) {
            HS.markInteraction();
            if (HS.DOM && HS.DOM.phraseMotionSelect) {
                HS.DOM.phraseMotionSelect.value = motion;
                HS.DOM.phraseMotionSelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
            HS.Controls.syncPhraseMotionButtons();
            var motionLabels = {
                typewriter: "Typewriter Sync (ÙƒØªØ§Ø¨Ø© Ù…ØªØ²Ø§Ù…Ù†Ø©)",
                wipe: "Smooth Wipe (Ù…Ø³Ø­ ØªØ¯Ø±ÙŠØ¬ÙŠ)",
                pop: "Scale Pop (Ø¸Ù‡ÙˆØ± Ø¨ØªÙƒØ¨ÙŠØ±)",
                snap: "Snap Jump (Ù‚ÙØ² ÙÙˆØ±ÙŠ)"
            };
            HS.setStatus("Phrase Motion: " + (motionLabels[motion] || motion));
        },

        syncPhraseMotionButtons: function () {
            var cur = (HS.DOM && HS.DOM.phraseMotionSelect) ? HS.DOM.phraseMotionSelect.value : "typewriter";
            document.querySelectorAll(".phrase-motion-btn").forEach(function (b) {
                b.classList.toggle("active", b.dataset.motion === cur);
            });
        },

        updatePhraseColorIndicator: function (hex) {
            if (!hex) return;
            var dot = document.getElementById("phrase-color-indicator-dot");
            if (dot) dot.style.backgroundColor = hex;

            var recent = HS.DOM && HS.DOM.phraseRecentColorSwatch ? HS.DOM.phraseRecentColorSwatch : document.getElementById("phrase-recent-color-swatch");
            if (recent) {
                recent.style.backgroundColor = hex;
                recent.dataset.color = hex;
                recent.title = "Last Chosen Color: " + hex.toUpperCase() + " (Ø¢Ø®Ø± Ù„ÙˆÙ† ØªÙ… Ø§Ø®ØªÙŠØ§Ø±Ù‡)";
                try { localStorage.setItem("hs_phrase_recent_color", hex); } catch (e) {}
            }

            var normHex = hex.toLowerCase();
            var foundPreset = false;
            document.querySelectorAll("#phrase-swatches .swatch-btn:not(.swatch-recent)").forEach(function (b) {
                var isMatch = b.dataset.color && b.dataset.color.toLowerCase() === normHex;
                b.classList.toggle("active", isMatch);
                if (isMatch) foundPreset = true;
            });
            if (recent) {
                recent.classList.toggle("active", !foundPreset);
            }
        },

        initEvents: function () {
            if (!HS.DOM) return;

            // Shape Buttons Click Listeners (Tab 1)
            document.querySelectorAll(".shape-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var shape = this.dataset.shape;
                    if (shape) HS.Controls.setShape(shape);
                });
            });

            // Direction Buttons Click Listeners (Tab 1)
            document.querySelectorAll(".dir-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var dir = this.dataset.dir;
                    if (dir) HS.Controls.setDirection(dir);
                });
            });

            // Motion Buttons Click Listeners (Tab 1)
            document.querySelectorAll(".motion-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var motion = this.dataset.motion;
                    if (motion) HS.Controls.setMotion(motion);
                });
            });

            // Typewriter Mode Buttons Click Listeners (Sequential vs Parallel)
            document.querySelectorAll(".typewriter-mode-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var mode = this.dataset.typewriterMode;
                    if (mode) HS.Controls.setTypewriterMode(mode);
                });
            });

            // Typewriter Speed Toggle Button Click Listener
            if (HS.DOM.btnTypewriterSpeedToggle) {
                HS.DOM.btnTypewriterSpeedToggle.addEventListener("click", function () {
                    HS.Controls.toggleTypewriterSpeedMode();
                });
            }

            // Reveal Unit Buttons Click Listeners (Tab 1)
            document.querySelectorAll(".reveal-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var unit = this.dataset.unit;
                    if (unit) HS.Controls.setRevealUnit(unit);
                });
            });

            // Phrase Shape Buttons Click Listeners (Tab 2)
            document.querySelectorAll(".phrase-shape-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var shape = this.dataset.shape;
                    if (shape) HS.Controls.setPhraseShape(shape);
                });
            });

            // Phrase Motion Buttons Click Listeners (Tab 2)
            document.querySelectorAll(".phrase-motion-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var motion = this.dataset.motion;
                    if (motion) HS.Controls.setPhraseMotion(motion);
                });
            });

            // Phrase Color Trigger Button Click Listener
            var btnPhraseColorTrigger = document.getElementById("btn-phrase-color-trigger");
            if (btnPhraseColorTrigger && HS.DOM.phraseColorInput) {
                btnPhraseColorTrigger.addEventListener("click", function () {
                    HS.DOM.phraseColorInput.click();
                });
            }

            // Sync initial state of Shape, Direction, Motion, & Reveal buttons
            HS.Controls.syncShapeButtons();
            HS.Controls.syncDirectionButtons();
            HS.Controls.syncMotionButtons();
            HS.Controls.syncTypewriterButtons();
            HS.Controls.syncRevealButtons();
            HS.Controls.syncOutroDirectionUI();
            HS.Controls.syncPhraseShapeButtons();
            HS.Controls.syncPhraseMotionButtons();
            if (HS.DOM.phraseColorInput) {
                HS.Controls.updatePhraseColorIndicator(HS.DOM.phraseColorInput.value);
            }

            // Restore saved recent color if exists
            try {
                var savedRecent = localStorage.getItem("hs_recent_color");
                if (savedRecent) {
                    var recentEl = document.getElementById("recent-color-swatch");
                    if (recentEl) {
                        recentEl.style.backgroundColor = savedRecent;
                        recentEl.dataset.color = savedRecent;
                        recentEl.title = "Last Chosen Color: " + savedRecent.toUpperCase() + " (Ø¢Ø®Ø± Ù„ÙˆÙ† ØªÙ… Ø§Ø®ØªÙŠØ§Ø±Ù‡)";
                    }
                }
            } catch (e) {}

            // Color Picker & Swatches in Tab 1
            if (HS.DOM.colorPicker) {
                HS.Controls.updateColorIndicator(HS.DOM.colorPicker.value);
                HS.DOM.colorPicker.addEventListener("input", function () {
                    HS.markInteraction();
                    HS.Controls.updateColorIndicator(this.value);
                    if (HS.DOM.colorHex) HS.DOM.colorHex.textContent = this.value.toUpperCase();
                    HS.Controls.applyLiveColor(this.value);
                });
                HS.DOM.colorPicker.addEventListener("change", function () {
                    HS.markInteraction();
                    HS.Controls.updateColorIndicator(this.value);
                    HS.Controls.applyLiveColor(this.value);
                });
            }

            // Click on color square button triggers color picker
            var btnColorTrigger = document.getElementById("btn-color-trigger");
            if (btnColorTrigger && HS.DOM.colorPicker) {
                btnColorTrigger.addEventListener("click", function () {
                    HS.DOM.colorPicker.click();
                });
            }

            document.querySelectorAll("#view-paragraph .swatches-bar .swatch-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    HS.markInteraction();
                    var col = this.dataset.color;
                    if (HS.DOM.colorPicker) HS.DOM.colorPicker.value = col;
                    HS.Controls.updateColorIndicator(col);
                    if (HS.DOM.colorHex) HS.DOM.colorHex.textContent = col.toUpperCase();
                    HS.Controls.applyLiveColor(col);
                });
            });

            // Live Parameter Inputs (padX, padY, roundness, opacity)
            if (HS.DOM.roundInput) {
                HS.DOM.roundInput.addEventListener("input", function () { HS.Controls.applyLiveParamThrottled("roundness", parseFloat(this.value) || 0); });
                HS.DOM.roundInput.addEventListener("change", function () { HS.Controls.applyLiveParam("roundness", parseFloat(this.value) || 0); });
            }
            if (HS.DOM.padXInput) {
                HS.DOM.padXInput.addEventListener("input", function () { HS.Controls.applyLiveParamThrottled("padX", parseFloat(this.value) || 0); });
                HS.DOM.padXInput.addEventListener("change", function () { HS.Controls.applyLiveParam("padX", parseFloat(this.value) || 0); });
            }
            if (HS.DOM.padYInput) {
                HS.DOM.padYInput.addEventListener("input", function () { HS.Controls.applyLiveParamThrottled("padY", parseFloat(this.value) || 0); });
                HS.DOM.padYInput.addEventListener("change", function () { HS.Controls.applyLiveParam("padY", parseFloat(this.value) || 0); });
            }
            if (HS.DOM.opacityInput) {
                HS.DOM.opacityInput.addEventListener("input", function () { HS.Controls.applyLiveParamThrottled("opacity", parseFloat(this.value) || 100); });
                HS.DOM.opacityInput.addEventListener("change", function () { HS.Controls.applyLiveParam("opacity", parseFloat(this.value) || 100); });
            }

            // Animation check & Motion Select
            if (HS.DOM.animCheck) {
                HS.DOM.animCheck.addEventListener("change", function () {
                    if (HS.DOM.animControls) HS.DOM.animControls.classList.toggle("disabled", !this.checked);
                });
            }
            if (HS.DOM.motionSelect) {
                HS.DOM.motionSelect.addEventListener("change", function () {
                    HS.markInteraction();
                    var isTypewriter = (this.value === "typewriter");
                    var fieldRev = document.getElementById("field-reveal-unit");
                    if (fieldRev) {
                        fieldRev.style.opacity = isTypewriter ? "1" : "0.4";
                        fieldRev.style.pointerEvents = isTypewriter ? "auto" : "none";
                    }
                    if (this.value === "typewriter") {
                        HS.setStatus("Motion: Typewriter Sync");
                        if (HS.DOM.sequentialCheck && !HS.DOM.sequentialCheck.checked) {
                            HS.DOM.sequentialCheck.checked = true;
                            HS.Controls.syncChipClasses();
                        }
                    } else if (this.value === "pop") {
                        HS.setStatus("Motion: Scale Pop (Snappy Elastic)");
                    } else if (this.value === "snap") {
                        HS.setStatus("Motion: Snap Cut (Instant 0-frame)");
                    } else {
                        HS.setStatus("Motion: Smooth Wipe");
                    }
                });
            }

            if (HS.DOM.revealUnitSelect) {
                HS.DOM.revealUnitSelect.addEventListener("change", function () {
                    HS.markInteraction();
                    var uVal = this.value || "chars";
                    var uLabel = (uVal === "words") ? "Words (ÙƒÙ„Ù…Ø© Ø¨ÙƒÙ„Ù…Ø©)" : ((uVal === "lines") ? "Lines (Ø³Ø·Ø± Ø¨Ø³Ø·Ø±)" : "Characters (Ø­Ø±Ù Ø¨Ø­Ø±Ù)");
                    HS.setStatus("Reveal Unit: " + uLabel);
                    if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                        HS.Actions.executeSmartAction(false);
                    }
                });
            }

            // Outro Toggle & Direction Controls
            if (HS.DOM.outroCheck) {
                HS.DOM.outroCheck.addEventListener("change", function () {
                    HS.markInteraction();
                    var isEnabled = !!this.checked;
                    if (HS.DOM.outTimeInput) HS.DOM.outTimeInput.disabled = !isEnabled;
                    if (HS.DOM.outTimeCol) HS.DOM.outTimeCol.classList.toggle("disabled", !isEnabled);
                    if (HS.DOM.timeOutPoint) HS.DOM.timeOutPoint.disabled = !isEnabled;
                    if (HS.DOM.timeOutPointBox) HS.DOM.timeOutPointBox.classList.toggle("disabled", !isEnabled);
                    if (HS.DOM.outroDirectionBar) HS.DOM.outroDirectionBar.classList.toggle("disabled", !isEnabled);
                    HS.Controls.syncChipClasses();
                    HS.Controls.syncOutroDirectionUI();
                    HS.setStatus("Outro Exit: " + (isEnabled ? "Enabled" : "Disabled"));

                    // Auto sync markers if marker sync is active and liveUpdate is enabled
                    if (HS.State.liveUpdate !== false && HS.DOM.markerSyncCheck && HS.DOM.markerSyncCheck.checked && HS.Controls.syncMarkersToAE) {
                        HS.Controls.syncMarkersToAE();
                    }

                    if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                        HS.Actions.executeSmartAction(false);
                    }
                });
            }

            // Text Outro Order Button (TXT 1âž”N / Nâž”1)
            if (HS.DOM.btnTextOutroOrder) {
                HS.DOM.btnTextOutroOrder.addEventListener("click", function () {
                    var cur = HS.State.textOutroOrder || "first";
                    HS.Controls.setTextOutroOrder(cur === "first" ? "last" : "first");
                });
            }

            // Sync Outro Toggle Button (ðŸ”— Link / Unlink)
            if (HS.DOM.btnSyncOutroOrder) {
                HS.DOM.btnSyncOutroOrder.addEventListener("click", function () {
                    HS.Controls.setOutroSync(!HS.State.syncOutro);
                });
            }

            // Box Outro Order Button (BOX 1âž”N / Nâž”1)
            if (HS.DOM.btnBoxOutroOrder) {
                HS.DOM.btnBoxOutroOrder.addEventListener("click", function () {
                    if (this.disabled || this.classList.contains("disabled")) return;
                    var cur = HS.State.boxOutroOrder || "first";
                    HS.Controls.setBoxOutroOrder(cur === "first" ? "last" : "first");
                });
            }

            // Chips sync
            [
                { id: "chip-seq", chk: HS.DOM.sequentialCheck },
                { id: "chip-outro", chk: HS.DOM.outroCheck },
                { id: "chip-markers", chk: HS.DOM.markerSyncCheck }
            ].forEach(function (item) {
                if (item.chk) {
                    item.chk.addEventListener("change", function () {
                        HS.markInteraction();
                        HS.Controls.syncChipClasses();
                        if (item.id === "chip-markers") {
                            if (this.checked && HS.Controls.syncMarkersToAE) {
                                HS.Controls.syncMarkersToAE();
                            }
                            if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                                HS.Actions.executeSmartAction(false);
                            }
                        }
                    });
                }
                var chipEl = document.getElementById(item.id);
                if (chipEl) {
                    chipEl.addEventListener("click", function () {
                        setTimeout(HS.Controls.syncChipClasses, 10);
                    });
                }
            });

            // Precision Steppers Click (â–² â–¼)
            document.addEventListener("click", function (e) {
                var segBtn = e.target.closest(".time-seg-btn");
                if (segBtn) {
                    var cluster = segBtn.closest(".time-segmented-cluster");
                    var unit = segBtn.getAttribute("data-unit");
                    var isUp = segBtn.getAttribute("data-dir") === "up";
                    var mult = e.shiftKey ? 5 : 1;
                    HS.Controls.stepSegmentUnit(cluster, unit, isUp, mult);
                    return;
                }

                var upBtn = e.target.closest(".step-up");
                var downBtn = e.target.closest(".step-down");
                if (upBtn) {
                    var box = upBtn.closest(".precision-input-box");
                    if (box) {
                        var mult = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
                        var targetInp = box.querySelector("input");
                        HS.Controls.adjustStepper(targetInp, true, mult);
                    }
                } else if (downBtn) {
                    var box = downBtn.closest(".precision-input-box");
                    if (box) {
                        var mult = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
                        var targetInp = box.querySelector("input");
                        HS.Controls.adjustStepper(targetInp, false, mult);
                    }
                }
            });

            // Mouse Wheel Scrubbing with Shift / Alt modifiers
            document.querySelectorAll(".precision-input-box input:not(.time-seg-input)").forEach(function (inp) {
                inp.addEventListener("wheel", function (e) {
                    e.preventDefault();
                    var mult = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
                    HS.Controls.adjustStepper(inp, e.deltaY < 0, mult);
                }, { passive: false });
            });

            // Segmented Time Input Listeners (MM, SS, FF)
            document.querySelectorAll(".time-seg-input").forEach(function (inp) {
                inp.addEventListener("wheel", function (e) {
                    e.preventDefault();
                    var cluster = inp.closest(".time-segmented-cluster");
                    var unit = inp.getAttribute("data-unit");
                    var mult = e.shiftKey ? 5 : 1;
                    HS.Controls.stepSegmentUnit(cluster, unit, e.deltaY < 0, mult);
                }, { passive: false });

                inp.addEventListener("input", function () {
                    HS.markInteraction();
                    var cluster = inp.closest(".time-segmented-cluster");
                    HS.Controls.updateMasterFromCluster(cluster);
                });

                inp.addEventListener("change", function () {
                    HS.markInteraction();
                    var cluster = inp.closest(".time-segmented-cluster");
                    HS.Controls.updateMasterFromCluster(cluster);
                });

                inp.addEventListener("keydown", function (e) {
                    var cluster = inp.closest(".time-segmented-cluster");
                    var unit = inp.getAttribute("data-unit");
                    if (e.key === "Enter") {
                        inp.blur();
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        HS.Controls.stepSegmentUnit(cluster, unit, true, e.shiftKey ? 5 : 1);
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        HS.Controls.stepSegmentUnit(cluster, unit, false, e.shiftKey ? 5 : 1);
                    }
                });
            });

            // Interactive Horizontal Drag Scrubbing (Native AE Feel)
            document.querySelectorAll(".scrub-label").forEach(function (lbl) {
                lbl.addEventListener("mousedown", function (e) {
                    if (e.button !== 0) return;
                    var targetId = this.dataset.target;
                    var input = document.getElementById(targetId);
                    if (!input || input.disabled) return;

                    e.preventDefault();
                    var startX = e.clientX;
                    var isTime = HS.Controls.isTimeInput(input);
                    var allowZero = (input.id === "stagger");
                    var startVal = isTime ? input.value : (parseFloat(input.value) || 0);
                    var startFrames = (isTime && HS.TimeEngine) ? HS.TimeEngine.getFrameCount(startVal, allowZero) : 0;
                    var step = parseFloat(input.step) || 1;
                    var min = input.min !== "" ? parseFloat(input.min) : -Infinity;
                    var max = input.max !== "" ? parseFloat(input.max) : Infinity;

                    document.body.classList.add("is-scrubbing");

                    function onMouseMove(ev) {
                        HS.markInteraction();
                        var deltaX = ev.clientX - startX;
                        var mult = ev.shiftKey ? 10 : (ev.altKey ? 0.1 : 1);

                        if (isTime) {
                            var frameStep = (mult >= 10) ? 5 : 1;
                            var frameDelta = Math.round((deltaX / 5) * frameStep);
                            var minF = allowZero ? 0 : 1;
                            var newFrames = Math.max(minF, startFrames + frameDelta);
                            if (HS.TimeEngine) {
                                input.value = HS.TimeEngine.fromSeconds(newFrames / HS.TimeEngine.getFPS());
                            }
                            HS.Controls.updateTimeInputTooltip(input);
                            input.dispatchEvent(new Event("input", { bubbles: true }));
                            return;
                        }

                        var change = (deltaX / 4) * step * mult;
                        var newVal = Math.max(min, Math.min(max, startVal + change));

                        var stepStr = input.step || "1";
                        if (stepStr.indexOf(".") !== -1) {
                            input.value = newVal.toFixed(stepStr.split(".")[1].length);
                        } else {
                            input.value = Math.round(newVal);
                        }
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                    }

                    function onMouseUp() {
                        document.body.classList.remove("is-scrubbing");
                        window.removeEventListener("mousemove", onMouseMove);
                        window.removeEventListener("mouseup", onMouseUp);
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                    }

                    window.addEventListener("mousemove", onMouseMove);
                    window.addEventListener("mouseup", onMouseUp);
                });
            });

            // Live validation and frame-snapping on direct input change for time fields
            ["time-in-point", "time-out-point", "line-dur", "out-time", "stagger", "phrase-hold-time"].forEach(function (id) {
                var timeInp = document.getElementById(id);
                if (!timeInp) return;

                timeInp.addEventListener("input", function () {
                    HS.markInteraction();
                    HS.Controls.updateTimeInputTooltip(this);
                });

                timeInp.addEventListener("change", function () {
                    HS.markInteraction();
                    var allowZero = (this.id === "stagger" || this.id === "time-in-point");
                    if (HS.TimeEngine) {
                        this.value = HS.TimeEngine.normalize(this.value, undefined, allowZero);
                    }
                    HS.Controls.updateTimeInputTooltip(this);
                    if (this.id === "time-in-point" || this.id === "time-out-point" || this.id === "line-dur" || this.id === "out-time" || this.id === "stagger") {
                        HS.Controls.syncMarkersToAE();
                        if (HS.State.liveUpdate !== false && HS.State.mainTab === "paragraph" && HS.State.hasHighlight) {
                            if (HS.Controls._timeDebounceTimer) clearTimeout(HS.Controls._timeDebounceTimer);
                            HS.Controls._timeDebounceTimer = setTimeout(function () {
                                HS.Actions.executeSmartAction(false);
                            }, 120);
                        }
                    }
                });
            });

            // Click listener on unit toggle buttons to cycle formats (s:f âž” f âž” s)
            document.querySelectorAll(".unit-toggle-btn").forEach(function (btn) {
                btn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    HS.Controls.cycleTimeFormat();
                });
            });

            // Place / Refresh Markers button
            var btnPlace = document.getElementById("btn-place-markers");
            if (btnPlace) {
                btnPlace.addEventListener("click", function () {
                    HS.Controls.placeTimingMarkers();
                });
            }

            // Restore saved Live Update preference if exists
            try {
                var storage = (typeof localStorage !== "undefined") ? localStorage : (window && window.localStorage ? window.localStorage : null);
                if (storage) {
                    var savedLive = storage.getItem("hs_live_update");
                    if (savedLive !== null) {
                        HS.State.liveUpdate = (savedLive === "true");
                    }
                }
            } catch (e) {}
            HS.Controls.syncLiveUpdateUI();

            // Live Update Toggle Button Click Listener
            if (HS.DOM.btnLiveUpdate) {
                HS.DOM.btnLiveUpdate.addEventListener("click", function () {
                    HS.Controls.toggleLiveUpdate();
                });
            }

            // Initialize time inputs for current FPS
            HS.Controls.updateTimeInputsForFps((HS.State && HS.State.fps) ? HS.State.fps : 25);

            // Sync initial values to segmented clusters
            if (HS.Controls && HS.Controls.syncAllSegmentedFromMaster) {
                HS.Controls.syncAllSegmentedFromMaster();
            }
        }
    };
})(window, document);
