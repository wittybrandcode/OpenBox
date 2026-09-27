/**
 * OPENBOX â€” Bridge Module
 * CSInterface wrapper, ExtendScript communication, color utilities, and global status/tabs.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    var csInterface = new CSInterface();
    HS.csInterface = csInterface;

    HS.Bridge = {
        // Ensure hostscript.jsx is live loaded from disk
        ensureLoaded: function (callback) {
            try {
                var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
                if (extPath) {
                    var scriptPath = (extPath + "/host/hostscript.jsx").replace(/\\/g, "/");
                    csInterface.evalScript('$.evalFile("' + scriptPath + '")', function () {
                        if (callback) callback();
                    });
                    return;
                }
            } catch (e) {}
            if (callback) callback();
        },

        // Evaluate script with safety logging
        eval: function (cmd, cb) {
            csInterface.evalScript(cmd, function (res) {
                if (cb) cb(res);
            });
        },

        // Hex to RGBA array [0..1]
        hexToRgba: function (hex) {
            var c = (hex || "#FFFFFF").replace("#", "");
            if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
            var r = parseInt(c.substring(0, 2), 16) / 255;
            var g = parseInt(c.substring(2, 4), 16) / 255;
            var b = parseInt(c.substring(4, 6), 16) / 255;
            return [r, g, b, 1.0];
        },

        // Hex to CSS rgba(r, g, b, a) string
        hexToRgbaCss: function (hex, alpha) {
            var c = (hex || "#2ECC71").replace("#", "");
            if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
            var r = parseInt(c.substring(0, 2), 16) || 46;
            var g = parseInt(c.substring(2, 4), 16) || 204;
            var b = parseInt(c.substring(4, 6), 16) || 113;
            var a = (alpha !== undefined) ? alpha : 0.25;
            return "rgba(" + r + "," + g + "," + b + "," + a + ")";
        }
    };

    // Initialize host script on launch
    HS.Bridge.ensureLoaded();

    // Global Status & Messaging
    HS.setStatus = function (msg, isError) {
        if (!HS.DOM || !HS.DOM.statusText || !HS.DOM.statusBar) return;
        HS.DOM.statusText.textContent = msg;
        HS.DOM.statusText.title = msg;
        HS.DOM.statusBar.classList.toggle("error", !!isError);
    };

    HS.showReport = function (res) {
        var msg = (res || "").replace("SUCCESS:", "").replace("SUCCESS", "").trim();
        HS.setStatus(msg || "Done.");
    };

    // Main Tabs Switching (Paragraph vs Phrases)
    HS.switchMainTab = function (tab) {
        HS.State.mainTab = tab;
        var isPhrases = (tab === "phrases");

        if (HS.DOM.tabBtnParagraph) HS.DOM.tabBtnParagraph.classList.toggle("active", !isPhrases);
        if (HS.DOM.tabBtnPhrases) HS.DOM.tabBtnPhrases.classList.toggle("active", isPhrases);

        if (HS.DOM.viewParagraph) {
            HS.DOM.viewParagraph.style.display = isPhrases ? "none" : "block";
            HS.DOM.viewParagraph.classList.toggle("active", !isPhrases);
        }
        if (HS.DOM.viewPhrases) {
            HS.DOM.viewPhrases.style.display = isPhrases ? "block" : "none";
            HS.DOM.viewPhrases.classList.toggle("active", isPhrases);
        }

        if (isPhrases) {
            if (HS.Sync && HS.Sync.fromAE) HS.Sync.fromAE(true);
            HS.setStatus("Phrase Highlight: Click words or select text to highlight");
        } else {
            HS.setStatus("Paragraph & Lines: Full text highlight");
        }
    };

    // Adobe Host Theme Adaptation (Automatic Dark / Medium / Light sync)
    HS.Bridge.syncTheme = function () {
        try {
            var hostEnv = csInterface.getHostEnvironment ? csInterface.getHostEnvironment() : null;
            if (!hostEnv || !hostEnv.appSkinInfo) return;
            var skin = hostEnv.appSkinInfo;
            var panelColor = skin.panelBackgroundColor ? skin.panelBackgroundColor.color : null;
            if (!panelColor) return;

            var r = Math.round(panelColor.red);
            var g = Math.round(panelColor.green);
            var b = Math.round(panelColor.blue);

            var brightness = (r * 299 + g * 587 + b * 114) / 1000;
            var isLight = brightness > 128;
            var root = document.documentElement;

            if (isLight) {
                root.style.setProperty("--bg-base", "#e8e8e8");
                root.style.setProperty("--bg-card", "#f2f2f2");
                root.style.setProperty("--bg-card-hover", "#dadada");
                root.style.setProperty("--bg-surface", "#dcdcdc");
                root.style.setProperty("--bg-surface-hi", "#cecece");
                root.style.setProperty("--bg-input", "#ffffff");
                root.style.setProperty("--bg-input-hover", "#f8f8f8");
                root.style.setProperty("--bg-input-focus", "#ffffff");
                root.style.setProperty("--border-subtle", "rgba(0, 0, 0, 0.12)");
                root.style.setProperty("--border-contrast", "rgba(0, 0, 0, 0.25)");
                root.style.setProperty("--text-bright", "#111111");
                root.style.setProperty("--text-primary", "#222222");
                root.style.setProperty("--text-secondary", "#555555");
                root.style.setProperty("--text-muted", "#777777");
                root.style.setProperty("--text-dim", "#999999");
                root.style.setProperty("--btn-solid-bg", "#d8d8d8");
                root.style.setProperty("--btn-solid-hover", "#cccccc");
                root.style.setProperty("--btn-solid-active", "#333333");
            } else {
                var baseHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                root.style.setProperty("--bg-base", baseHex);
                var cardR = Math.min(255, r + 6);
                var cardG = Math.min(255, g + 6);
                var cardB = Math.min(255, b + 6);
                root.style.setProperty("--bg-card", "rgb(" + cardR + "," + cardG + "," + cardB + ")");
                var surfR = Math.min(255, r + 14);
                var surfG = Math.min(255, g + 14);
                var surfB = Math.min(255, b + 14);
                root.style.setProperty("--bg-surface", "rgb(" + surfR + "," + surfG + "," + surfB + ")");
                var inpR = Math.max(0, r - 8);
                var inpG = Math.max(0, g - 8);
                var inpB = Math.max(0, b - 8);
                root.style.setProperty("--bg-input", "rgb(" + inpR + "," + inpG + "," + inpB + ")");
            }
        } catch (eTheme) {}
    };

    // Global Bridge, Tab, and Debug Event Listeners
    HS.Bridge.initEvents = function () {
        // Adobe Host Theme Adaptation (ThemeColorChanged)
        HS.Bridge.syncTheme();
        try {
            var themeEvt = (typeof CSInterface !== "undefined" && CSInterface.THEME_COLOR_CHANGED_EVENT)
                ? CSInterface.THEME_COLOR_CHANGED_EVENT
                : "com.adobe.csxs.events.ThemeColorChanged";
            csInterface.addEventListener(themeEvt, function () {
                HS.Bridge.syncTheme();
            });
        } catch (eTh) {}

        // Keyboard shortcuts (F5 / Ctrl+R) for development reload
        window.addEventListener("keydown", function (e) {
            if (e.key === "F5" || (e.ctrlKey && (e.key === "r" || e.key === "R"))) {
                e.preventDefault();
                HS.Bridge.ensureLoaded(function () { location.reload(true); });
            }
        });

        // Tabs Switching
        if (HS.DOM.tabBtnParagraph) {
            HS.DOM.tabBtnParagraph.addEventListener("click", function () { HS.switchMainTab("paragraph"); });
        }
        if (HS.DOM.tabBtnPhrases) {
            HS.DOM.tabBtnPhrases.addEventListener("click", function () { HS.switchMainTab("phrases"); });
        }

        // Debug Console (Hidden by default for production)
        HS.toggleDebug = function () {
            var sec = HS.DOM.debugSection || document.getElementById("debug-section");
            var panel = HS.DOM.debugPanel || document.getElementById("debug-panel");
            if (!sec) return;
            var isHidden = (sec.style.display === "none");
            sec.style.display = isHidden ? "block" : "none";
            if (isHidden && panel) {
                panel.style.display = "block";
                if (HS.DOM.btnRefreshLog) HS.DOM.btnRefreshLog.click();
            }
        };

        // Keyboard Shortcut for Developer: Ctrl + Shift + D
        window.addEventListener("keydown", function (e) {
            if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
                e.preventDefault();
                HS.toggleDebug();
            }
        });

        // Double-click on Status Bar to toggle Debug Console
        if (HS.DOM.statusBar) {
            HS.DOM.statusBar.addEventListener("dblclick", function () {
                HS.toggleDebug();
            });
        }

        // Auto-show Debug Console if URL contains debug=1
        try {
            if (window.location && window.location.search && window.location.search.indexOf("debug=1") !== -1) {
                HS.toggleDebug();
            }
        } catch (eDebugUrl) {}

        if (HS.DOM.btnDebug && HS.DOM.debugPanel) {
            HS.DOM.btnDebug.addEventListener("click", function () {
                var isHidden = HS.DOM.debugPanel.style.display === "none";
                HS.DOM.debugPanel.style.display = isHidden ? "block" : "none";
                if (isHidden && HS.DOM.btnRefreshLog) HS.DOM.btnRefreshLog.click();
            });
        }

        if (HS.DOM.btnRefreshLog) {
            HS.DOM.btnRefreshLog.addEventListener("click", function () {
                if (!HS.DOM.debugLog) return;
                HS.Bridge.eval("$._smartHighlighter.getDebugLog()", function (res) {
                    HS.DOM.debugLog.textContent = (res && res !== "EvalScript error." && res.length > 0) ? res : "No logs yet.";
                    HS.DOM.debugLog.scrollTop = HS.DOM.debugLog.scrollHeight;
                });
            });
        }

        if (HS.DOM.btnClearLog) {
            HS.DOM.btnClearLog.addEventListener("click", function () {
                HS.Bridge.eval("$._smartHighlighter.clearDebugLog()", function () {
                    if (HS.DOM.debugLog) HS.DOM.debugLog.textContent = "Log cleared.";
                });
            });
        }
    };
})(window, document);
