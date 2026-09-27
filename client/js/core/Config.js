/**
 * OPENBOX â€” Config Module
 * Core configuration defaults, presets, and constants.
 */
(function (window) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.Config = {
        defaults: {
            color: "#3C4BB9",
            style: "box",
            direction: "auto",
            paddingX: 10,
            paddingY: 10,
            roundness: 0,
            opacity: 100,
            animate: true,
            motion: "typewriter",
            typewriterMode: "sequential",
            typewriterSpeedMode: "constant",
            revealUnit: "chars",
            sequential: true,
            lineDuration: 0.35,
            stagger: 0.00,
            outro: true,
            outTime: 1.50,
            outroOrder: "first",
            textOutroOrder: "first",
            boxOutroOrder: "first",
            syncOutro: true,
            scope: "all",
            syncMarkers: false
        },
        presets: {
            typewriter: { name: "Typewriter Sync (Core)", color: "#3C4BB9", padX: 10, padY: 10, round: 0, opacity: 100, style: "box", motion: "typewriter", typewriterMode: "sequential", typewriterSpeedMode: "constant", revealUnit: "chars", dur: 0.35, stagger: 0.00, sequential: true },
            vox:        { name: "Vox Documentary",       color: "#FFE600", padX: 8,  padY: 2,  round: 2,  opacity: 90,  style: "marker", motion: "wipe", revealUnit: "chars", dur: 0.35, stagger: 0.00, sequential: true },
            clean:      { name: "Clean Underline",       color: "#0D99FF", padX: 6,  padY: 2,  round: 0,  opacity: 100, style: "underline", motion: "wipe", revealUnit: "chars", dur: 0.25, stagger: 0.00, sequential: true }
        }
    };
})(window);
