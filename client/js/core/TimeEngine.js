/**
 * OPENBOX â€” Time Engine Module
 * Composition-Aware Time Calculation & 00:00:00 Timecode Engine (MM:SS:FF)
 * 
 * Accurately translates between Seconds, Frames, and MM:SS:FF timecode notation
 * strictly adhering to the active composition's exact FPS (e.g. 24, 25, 29.97, 30, 60).
 */
(function (globalScope) {
    "use strict";

    var window = globalScope;
    var HS = window.HS || {};
    window.HS = HS;

    var currentFps = 25; // Default fallback until AE comp syncs
    var currentFormat = "tc"; // "tc" (00:00:00 MM:SS:FF) | "sf" (0:11) | "f" (11) | "s" (0.44)

    function pad2(num) {
        var n = Math.floor(Math.abs(num || 0));
        return (n < 10 ? "0" : "") + n;
    }

    HS.TimeEngine = {
        /**
         * Set active composition FPS
         * @param {number} fps 
         */
        setFPS: function (fps) {
            if (typeof fps === "number" && fps > 0) {
                currentFps = Math.round(fps * 1000) / 1000;
            }
        },

        /**
         * Get active FPS
         * @returns {number}
         */
        getFPS: function () {
            return currentFps;
        },

        /**
         * Set current display format: "tc" | "sf" | "f" | "s"
         * @param {string} fmt 
         */
        setFormat: function (fmt) {
            if (fmt === "tc" || fmt === "sf" || fmt === "f" || fmt === "s") {
                currentFormat = fmt;
                try { localStorage.setItem("hs_time_format", fmt); } catch (e) {}
            }
        },

        /**
         * Get current display format
         * @returns {string}
         */
        getFormat: function () {
            return currentFormat;
        },

        /**
         * Parse any input string or number to REAL SECONDS based on current FPS
         * Supports:
         *   - "00:01:12" (MM:SS:FF)
         *   - "01:12" (SS:FF)
         *   - "15f" (Frames)
         *   - "1.5s" or "1.5" (Seconds)
         *   - naked integers (treated as frames)
         * @param {string|number} val 
         * @returns {number} Real seconds
         */
        toSeconds: function (val) {
            if (val === null || val === undefined || val === "") return 0;
            var fps = currentFps || 25;
            var intFps = Math.max(1, Math.round(fps));

            if (typeof val === "number") {
                return Math.max(0, val);
            }

            var str = String(val).trim().toLowerCase();
            if (str === "") return 0;

            // Format "15f" or "15 f"
            if (str.indexOf("f") !== -1 && str.indexOf(":") === -1) {
                var rawFrames = parseFloat(str.replace(/f/g, "").trim()) || 0;
                return Math.max(0, rawFrames / fps);
            }

            // Format "1.5s" or "0.36s"
            if (str.indexOf("s") !== -1 && str.indexOf(":") === -1) {
                var rawSec = parseFloat(str.replace(/s/g, "").trim()) || 0;
                return Math.max(0, rawSec);
            }

            // Format with colons: "MM:SS:FF" or "SS:FF"
            if (str.indexOf(":") !== -1) {
                var parts = str.split(":");
                if (parts.length >= 3) {
                    var m = parseInt(parts[0], 10) || 0;
                    var s = parseInt(parts[1], 10) || 0;
                    var f = parseInt(parts[2], 10) || 0;

                    // Handle carry: frames >= intFps rolls into seconds
                    if (f >= intFps) {
                        s += Math.floor(f / intFps);
                        f = f % intFps;
                    }
                    if (s >= 60) {
                        m += Math.floor(s / 60);
                        s = s % 60;
                    }
                    return Math.max(0, (m * 60) + s + (f / fps));
                } else if (parts.length === 2) {
                    var sc = parseInt(parts[0], 10) || 0;
                    var fr = parseInt(parts[1], 10) || 0;

                    if (fr >= intFps) {
                        sc += Math.floor(fr / intFps);
                        fr = fr % intFps;
                    }
                    return Math.max(0, sc + (fr / fps));
                }
            }

            // Decimal number like "0.36" or "1.5"
            if (str.indexOf(".") !== -1) {
                var dNum = parseFloat(str);
                return isNaN(dNum) ? 0 : Math.max(0, dNum);
            }

            // Pure integer without decimal or colon:
            var intVal = parseInt(str, 10);
            if (isNaN(intVal)) return 0;
            intVal = Math.max(0, intVal);

            // In timecode or frames mode, naked integer represents frames
            if (currentFormat === "s") {
                return intVal;
            } else {
                return intVal / fps;
            }
        },

        /**
         * Format real seconds into a string according to format ("tc" = MM:SS:FF, "sf", "f", "s")
         * @param {number} seconds 
         * @param {string} [formatOverride] Optional format override ("tc", "sf", "f", "s")
         * @returns {string}
         */
        fromSeconds: function (seconds, formatOverride) {
            var fps = currentFps || 25;
            var fmt = formatOverride || currentFormat || "tc";
            seconds = Math.max(0, seconds || 0);

            var totalFrames = Math.max(0, Math.round(seconds * fps));
            var intFps = Math.max(1, Math.round(fps));

            if (fmt === "f") {
                return String(totalFrames);
            }

            if (fmt === "s") {
                var exactSec = totalFrames / fps;
                return exactSec.toFixed(2);
            }

            if (fmt === "sf") {
                var sfSec = Math.floor(totalFrames / intFps);
                var sfFr = totalFrames % intFps;
                return sfSec + ":" + (sfFr < 10 ? "0" : "") + sfFr;
            }

            // Standard: "tc" -> 00:00:00 (MM:SS:FF)
            var mins = Math.floor(totalFrames / (intFps * 60));
            var remFrames = totalFrames % (intFps * 60);
            var secs = Math.floor(remFrames / intFps);
            var frames = remFrames % intFps;

            return pad2(mins) + ":" + pad2(secs) + ":" + pad2(frames);
        },

        /**
         * Add or subtract whole frames from a value string/number
         * @param {string|number} currentVal 
         * @param {number} frameDelta (+1, -1, +5, etc.)
         * @param {string} [formatOverride]
         * @param {boolean} [allowZero] Allow result to reach 0 frames
         * @returns {string} Formatted string
         */
        addFrames: function (currentVal, frameDelta, formatOverride, allowZero) {
            var fps = currentFps || 25;
            var sec = HS.TimeEngine.toSeconds(currentVal);
            var frames = Math.round(sec * fps);
            var minFrames = (allowZero === false) ? 1 : 0;
            frames = Math.max(minFrames, frames + frameDelta);
            return HS.TimeEngine.fromSeconds(frames / fps, formatOverride);
        },

        /**
         * Normalize and clean an input value string to adhere strictly to the active FPS & format
         * @param {string|number} val 
         * @param {string} [formatOverride]
         * @param {boolean} [allowZero]
         * @returns {string}
         */
        normalize: function (val, formatOverride, allowZero) {
            var sec = HS.TimeEngine.toSeconds(val);
            var fps = currentFps || 25;
            var frames = Math.round(sec * fps);
            var minFrames = (allowZero === false) ? 1 : 0;
            frames = Math.max(minFrames, frames);
            return HS.TimeEngine.fromSeconds(frames / fps, formatOverride);
        },

        /**
         * Get frame count integer for a value
         * @param {string|number} val 
         * @param {boolean} [allowZero]
         * @returns {number}
         */
        getFrameCount: function (val, allowZero) {
            var fps = currentFps || 25;
            var sec = HS.TimeEngine.toSeconds(val);
            var minFrames = (allowZero === false) ? 1 : 0;
            return Math.max(minFrames, Math.round(sec * fps));
        },

        /**
         * Get descriptive tooltip text for a value
         * Example: "15 frames @ 25 FPS (0.60s)"
         * @param {string|number} val 
         * @param {boolean} [allowZero]
         * @returns {string}
         */
        getTooltipText: function (val, allowZero) {
            var fps = currentFps || 25;
            var sec = HS.TimeEngine.toSeconds(val);
            var minFrames = (allowZero === false) ? 1 : 0;
            var frames = Math.max(minFrames, Math.round(sec * fps));
            var exactSec = (frames / fps).toFixed(2);
            var fpsFormatted = (Math.round(fps * 100) / 100);
            return frames + "f @ " + fpsFormatted + " FPS (" + exactSec + "s)";
        }
    };

    // Restore saved format or default to "tc" (00:00:00)
    try {
        var savedFmt = localStorage.getItem("hs_time_format");
        if (savedFmt === "tc" || savedFmt === "sf" || savedFmt === "f" || savedFmt === "s") {
            currentFormat = savedFmt;
        } else {
            currentFormat = "tc";
        }
    } catch (e) {
        currentFormat = "tc";
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = HS.TimeEngine;
    }

})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
