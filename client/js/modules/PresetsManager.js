/**
 * OPENBOX â€” Presets Manager Module
 * Handles built-in and custom user presets, local storage persistence, and modal dialogs.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;

    HS.Presets = {
        STORAGE_KEY: "highlight_studio_custom_presets_v1",
        builtins: (HS.Config && HS.Config.presets) ? HS.Config.presets : {},
        custom: {},
        activePresetId: "typewriter",

        init: function () {
            if (HS.Config && HS.Config.presets) {
                HS.Presets.builtins = HS.Config.presets;
            }
            HS.Presets.loadFromStorage();
            HS.Presets.populateDropdown();
            HS.Presets.initEvents();
        },

        sanitizePreset: function (raw) {
            if (!raw || typeof raw !== "object") return null;
            return {
                name: String(raw.name || "Custom Preset").substring(0, 24),
                color: (typeof raw.color === "string" && raw.color.charAt(0) === "#") ? raw.color : "#3C4BB9",
                style: String(raw.style || "box"),
                motion: String(raw.motion || "typewriter"),
                revealUnit: String(raw.revealUnit || "chars"),
                padX: (typeof raw.padX === "number") ? raw.padX : 10,
                padY: (typeof raw.padY === "number") ? raw.padY : 10,
                round: (typeof raw.round === "number") ? raw.round : 0,
                opacity: (typeof raw.opacity === "number") ? raw.opacity : 100,
                dur: (typeof raw.dur === "number") ? raw.dur : 0.35,
                stagger: (typeof raw.stagger === "number") ? raw.stagger : 0,
                sequential: (typeof raw.sequential === "boolean") ? raw.sequential : true,
                typewriterMode: (raw.typewriterMode === "parallel" || raw.sequential === false) ? "parallel" : "sequential",
                typewriterSpeedMode: (raw.typewriterSpeedMode === "synced") ? "synced" : "constant",
                outro: (typeof raw.outro === "boolean") ? raw.outro : false,
                outTime: (typeof raw.outTime === "number") ? raw.outTime : 1.2
            };
        },

        loadFromStorage: function () {
            try {
                var raw = localStorage.getItem(HS.Presets.STORAGE_KEY);
                if (raw) {
                    var parsed = JSON.parse(raw);
                    var cleanCustom = {};
                    if (parsed && typeof parsed === "object") {
                        for (var k in parsed) {
                            if (parsed.hasOwnProperty(k)) {
                                var s = HS.Presets.sanitizePreset(parsed[k].data || parsed[k]);
                                if (s) {
                                    cleanCustom[k] = {
                                        name: (parsed[k].name || s.name),
                                        data: s
                                    };
                                }
                            }
                        }
                    }
                    HS.Presets.custom = cleanCustom;
                }
            } catch (e) {
                console.warn("[OpenBox] Could not load presets:", e);
                HS.Presets.custom = {};
            }
        },

        saveToStorage: function () {
            try {
                localStorage.setItem(HS.Presets.STORAGE_KEY, JSON.stringify(HS.Presets.custom));
            } catch (e) {
                console.warn("[OpenBox] Could not save presets:", e);
            }
        },

        populateDropdown: function () {
            if (!HS.DOM || !HS.DOM.presetSelect) return;
            var sel = HS.DOM.presetSelect;
            sel.innerHTML = "";

            var menu = document.getElementById("preset-dropdown-menu");
            if (menu) menu.innerHTML = "";

            var activeName = "Typewriter Sync (Core)";

            // 1. Built-in Core Presets
            var coreGroup = document.createElement("optgroup");
            coreGroup.label = "Default Presets";

            if (menu) {
                var hdr1 = document.createElement("div");
                hdr1.className = "custom-dropdown-header";
                hdr1.textContent = "Default Presets";
                menu.appendChild(hdr1);
            }

            var builtinKeys = Object.keys(HS.Presets.builtins);
            builtinKeys.forEach(function (id) {
                var b = HS.Presets.builtins[id];
                var name = b.name || id;

                // Native option (backup & sync)
                var opt = document.createElement("option");
                opt.value = id;
                opt.textContent = name;
                if (id === HS.Presets.activePresetId) {
                    opt.selected = true;
                    activeName = name;
                }
                coreGroup.appendChild(opt);

                // Custom dropdown item
                if (menu) {
                    var item = document.createElement("div");
                    item.className = "custom-dropdown-item" + (id === HS.Presets.activePresetId ? " active" : "");
                    item.dataset.value = id;
                    item.textContent = name;
                    item.addEventListener("click", function (e) {
                        e.stopPropagation();
                        HS.Presets.selectCustomItem(id);
                    });
                    menu.appendChild(item);
                }
            });
            sel.appendChild(coreGroup);

            // 2. Custom Presets
            var customKeys = Object.keys(HS.Presets.custom);
            if (customKeys.length > 0) {
                var custGroup = document.createElement("optgroup");
                custGroup.label = "Custom Presets";

                if (menu) {
                    var div = document.createElement("div");
                    div.className = "custom-dropdown-divider";
                    menu.appendChild(div);

                    var hdr2 = document.createElement("div");
                    hdr2.className = "custom-dropdown-header";
                    hdr2.textContent = "Custom Presets";
                    menu.appendChild(hdr2);
                }

                customKeys.forEach(function (id) {
                    var c = HS.Presets.custom[id];
                    var name = c.name || "Custom";

                    var opt = document.createElement("option");
                    opt.value = id;
                    opt.textContent = name;
                    if (id === HS.Presets.activePresetId) {
                        opt.selected = true;
                        activeName = name;
                    }
                    custGroup.appendChild(opt);

                    if (menu) {
                        var item = document.createElement("div");
                        item.className = "custom-dropdown-item" + (id === HS.Presets.activePresetId ? " active" : "");
                        item.dataset.value = id;
                        item.textContent = name;
                        item.addEventListener("click", function (e) {
                            e.stopPropagation();
                            HS.Presets.selectCustomItem(id);
                        });
                        menu.appendChild(item);
                    }
                });
                sel.appendChild(custGroup);
            }

            sel.value = HS.Presets.activePresetId;

            // Update custom label
            var lbl = document.getElementById("preset-dropdown-label");
            if (lbl) lbl.textContent = activeName;

            HS.Presets.updateDeleteButton();
        },

        selectCustomItem: function (id) {
            HS.markInteraction();
            HS.Presets.closeCustomDropdown();
            HS.Presets.apply(id);
        },

        toggleCustomDropdown: function () {
            var menu = document.getElementById("preset-dropdown-menu");
            var trigger = document.getElementById("preset-dropdown-trigger");
            if (!menu || !trigger) return;
            var isVisible = (menu.style.display === "block" || menu.classList.contains("open"));
            if (isVisible) {
                HS.Presets.closeCustomDropdown();
            } else {
                HS.Presets.openCustomDropdown();
            }
        },

        openCustomDropdown: function () {
            var menu = document.getElementById("preset-dropdown-menu");
            var trigger = document.getElementById("preset-dropdown-trigger");
            if (menu) {
                menu.style.display = "block";
                menu.classList.add("open");
            }
            if (trigger) trigger.classList.add("open");
        },

        closeCustomDropdown: function () {
            var menu = document.getElementById("preset-dropdown-menu");
            var trigger = document.getElementById("preset-dropdown-trigger");
            if (menu) {
                menu.style.display = "none";
                menu.classList.remove("open");
            }
            if (trigger) trigger.classList.remove("open");
        },

        updateDeleteButton: function () {
            if (!HS.DOM || !HS.DOM.btnDeletePreset) return;
            var isCustom = !!(HS.Presets.custom && HS.Presets.custom[HS.Presets.activePresetId]);
            HS.DOM.btnDeletePreset.style.display = isCustom ? "inline-flex" : "none";
        },

        getPresetData: function (id) {
            if (HS.Presets.builtins[id]) {
                return HS.Presets.builtins[id];
            }
            if (HS.Presets.custom[id]) {
                return HS.Presets.custom[id].data;
            }
            return null;
        },

        apply: function (id) {
            var p = HS.Presets.getPresetData(id);
            if (!p) return;

            HS.Presets.activePresetId = id;
            if (HS.DOM.presetSelect && HS.DOM.presetSelect.value !== id) {
                HS.DOM.presetSelect.value = id;
            }

            var pName = (HS.Presets.builtins[id] && HS.Presets.builtins[id].name) ||
                        (HS.Presets.custom[id] && HS.Presets.custom[id].name) || id;
            var lbl = document.getElementById("preset-dropdown-label");
            if (lbl) lbl.textContent = pName;

            document.querySelectorAll("#preset-dropdown-menu .custom-dropdown-item").forEach(function (el) {
                el.classList.toggle("active", el.dataset.value === id);
            });

            HS.Presets.updateDeleteButton();

            if (HS.DOM.colorPicker && p.color) {
                HS.DOM.colorPicker.value = p.color;
                if (HS.DOM.colorHex) HS.DOM.colorHex.textContent = p.color.toUpperCase();
                if (HS.Controls && HS.Controls.updateColorIndicator) {
                    HS.Controls.updateColorIndicator(p.color);
                }
            }
            if (HS.DOM.padXInput && typeof p.padX === "number") HS.DOM.padXInput.value = p.padX;
            if (HS.DOM.padYInput && typeof p.padY === "number") HS.DOM.padYInput.value = p.padY;
            if (HS.DOM.roundInput && typeof p.round === "number") HS.DOM.roundInput.value = p.round;
            if (HS.DOM.opacityInput && typeof p.opacity === "number") HS.DOM.opacityInput.value = p.opacity;
            if (HS.DOM.lineDurInput && typeof p.dur === "number") HS.DOM.lineDurInput.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(p.dur) : p.dur;
            if (HS.DOM.staggerInput && typeof p.stagger === "number") HS.DOM.staggerInput.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(p.stagger) : p.stagger;
            if (p.style && HS.DOM.styleSelect) HS.DOM.styleSelect.value = p.style;
            if (p.motion && HS.DOM.motionSelect) HS.DOM.motionSelect.value = p.motion;
            if (p.revealUnit && HS.DOM.revealUnitSelect) HS.DOM.revealUnitSelect.value = p.revealUnit;
            if (p.typewriterMode) {
                HS.State.typewriterMode = p.typewriterMode;
            } else if (typeof p.sequential === "boolean") {
                HS.State.typewriterMode = p.sequential ? "sequential" : "parallel";
            }
            if (p.typewriterSpeedMode) {
                HS.State.typewriterSpeedMode = p.typewriterSpeedMode;
            }
            if (HS.DOM.sequentialCheck) {
                HS.DOM.sequentialCheck.checked = (HS.State.typewriterMode === "sequential");
            }
            if (HS.DOM.outroCheck && typeof p.outro === "boolean") {
                HS.DOM.outroCheck.checked = p.outro;
                if (HS.DOM.outTimeInput) HS.DOM.outTimeInput.disabled = !p.outro;
                if (HS.DOM.outTimeCol) HS.DOM.outTimeCol.classList.toggle("disabled", !p.outro);
            }
            if (HS.DOM.outTimeInput && typeof p.outTime === "number") HS.DOM.outTimeInput.value = HS.TimeEngine ? HS.TimeEngine.fromSeconds(p.outTime) : p.outTime;
            if (p.textOutroOrder) HS.State.textOutroOrder = p.textOutroOrder;
            if (p.boxOutroOrder) HS.State.boxOutroOrder = p.boxOutroOrder;
            if (typeof p.syncOutro === "boolean") HS.State.syncOutro = p.syncOutro;
            if (p.outroOrder && !p.textOutroOrder) HS.State.textOutroOrder = p.outroOrder;
            if (HS.Controls && HS.Controls.syncOutroDirectionUI) HS.Controls.syncOutroDirectionUI();

            if (HS.Controls && HS.Controls.updateTimeInputTooltip) {
                if (HS.DOM.lineDurInput) HS.Controls.updateTimeInputTooltip(HS.DOM.lineDurInput);
                if (HS.DOM.staggerInput) HS.Controls.updateTimeInputTooltip(HS.DOM.staggerInput);
                if (HS.DOM.outTimeInput) HS.Controls.updateTimeInputTooltip(HS.DOM.outTimeInput);
            }
            if (HS.Controls && typeof HS.Controls.syncAllSegmentedFromMaster === "function") {
                HS.Controls.syncAllSegmentedFromMaster();
            }

            if (HS.Controls && HS.Controls.syncChipClasses) HS.Controls.syncChipClasses();
            if (HS.Controls && HS.Controls.syncShapeButtons) HS.Controls.syncShapeButtons();
            if (HS.Controls && HS.Controls.syncDirectionButtons) HS.Controls.syncDirectionButtons();
            if (HS.Controls && HS.Controls.syncMotionButtons) HS.Controls.syncMotionButtons();
            if (HS.Controls && HS.Controls.syncTypewriterButtons) HS.Controls.syncTypewriterButtons();
            if (HS.Controls && HS.Controls.syncRevealButtons) HS.Controls.syncRevealButtons();
            if (HS.Controls && HS.Controls.updateColorIndicator && p.color) HS.Controls.updateColorIndicator(p.color);
            if (p.color && HS.Controls && HS.Controls.applyLiveColor) HS.Controls.applyLiveColor(p.color);
            if (typeof p.round === "number" && HS.Controls && HS.Controls.applyLiveParam) HS.Controls.applyLiveParam("roundness", p.round);
            if (typeof p.padX === "number" && HS.Controls && HS.Controls.applyLiveParam) HS.Controls.applyLiveParam("padX", p.padX);
            if (typeof p.padY === "number" && HS.Controls && HS.Controls.applyLiveParam) HS.Controls.applyLiveParam("padY", p.padY);
            if (typeof p.opacity === "number" && HS.Controls && HS.Controls.applyLiveParam) HS.Controls.applyLiveParam("opacity", p.opacity);

            var pName = (HS.Presets.custom[id] ? HS.Presets.custom[id].name : (p.name || id));
            HS.setStatus("Preset: '" + pName + "' applied");
        },

        getCurrentSettings: function () {
            var col = HS.DOM.colorPicker ? HS.DOM.colorPicker.value : "#3C4BB9";
            var st = HS.DOM.styleSelect ? HS.DOM.styleSelect.value : "box";
            var mot = HS.DOM.motionSelect ? HS.DOM.motionSelect.value : "typewriter";
            var rev = HS.DOM.revealUnitSelect ? HS.DOM.revealUnitSelect.value : "chars";
            var px = HS.DOM.padXInput ? (parseFloat(HS.DOM.padXInput.value) || 10) : 10;
            var py = HS.DOM.padYInput ? (parseFloat(HS.DOM.padYInput.value) || 10) : 10;
            var rnd = HS.DOM.roundInput ? (parseFloat(HS.DOM.roundInput.value) || 0) : 0;
            var opac = HS.DOM.opacityInput ? (parseFloat(HS.DOM.opacityInput.value) || 100) : 100;
            var dur = HS.DOM.lineDurInput ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.lineDurInput.value) : (parseFloat(HS.DOM.lineDurInput.value) || 0.35)) : 0.35;
            var stag = HS.DOM.staggerInput ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.staggerInput.value) : (parseFloat(HS.DOM.staggerInput.value) || 0)) : 0;
            var seq = HS.DOM.sequentialCheck ? HS.DOM.sequentialCheck.checked : true;
            var out = HS.DOM.outroCheck ? HS.DOM.outroCheck.checked : false;
            var outT = HS.DOM.outTimeInput ? (HS.TimeEngine ? HS.TimeEngine.toSeconds(HS.DOM.outTimeInput.value) : (parseFloat(HS.DOM.outTimeInput.value) || 1.5)) : 1.5;

            return {
                color: col,
                style: st,
                motion: mot,
                revealUnit: rev,
                padX: px,
                padY: py,
                round: rnd,
                opacity: opac,
                dur: dur,
                stagger: stag,
                sequential: seq,
                typewriterMode: HS.State.typewriterMode || (seq ? "sequential" : "parallel"),
                typewriterSpeedMode: HS.State.typewriterSpeedMode || "constant",
                outro: out,
                outTime: outT,
                textOutroOrder: HS.State.textOutroOrder || "first",
                boxOutroOrder: HS.State.boxOutroOrder || "first",
                syncOutro: (HS.State.syncOutro !== false)
            };
        },

        openSaveModal: function () {
            if (!HS.DOM || !HS.DOM.presetModal) return;
            var cur = HS.Presets.getCurrentSettings();

            if (HS.DOM.modalPresetColorPreview) {
                HS.DOM.modalPresetColorPreview.style.background = cur.color;
            }
            if (HS.DOM.modalPresetDetails) {
                HS.DOM.modalPresetDetails.textContent = cur.style.toUpperCase() + " â€¢ " + cur.padX + "px Pad â€¢ " + cur.motion;
            }
            if (HS.DOM.presetNameInput) {
                HS.DOM.presetNameInput.value = "";
            }
            HS.DOM.presetModal.style.display = "flex";
            if (HS.DOM.presetNameInput) {
                setTimeout(function () { HS.DOM.presetNameInput.focus(); }, 50);
            }
        },

        closeSaveModal: function () {
            if (HS.DOM && HS.DOM.presetModal) HS.DOM.presetModal.style.display = "none";
        },

        saveCustomPreset: function () {
            var name = (HS.DOM && HS.DOM.presetNameInput) ? HS.DOM.presetNameInput.value.trim() : "";
            if (!name) {
                name = "Custom " + (Object.keys(HS.Presets.custom).length + 1);
            }
            var id = "cust_" + Date.now();
            HS.Presets.custom[id] = {
                name: name,
                data: HS.Presets.getCurrentSettings()
            };
            HS.Presets.saveToStorage();
            HS.Presets.populateDropdown();
            HS.Presets.closeSaveModal();
            HS.Presets.apply(id);
            HS.setStatus("Preset '" + name + "' saved");
        },

        remove: function (id) {
            if (HS.Presets.custom[id]) {
                var name = HS.Presets.custom[id].name;
                delete HS.Presets.custom[id];
                HS.Presets.saveToStorage();
                HS.Presets.activePresetId = "typewriter";
                HS.Presets.populateDropdown();
                HS.Presets.apply("typewriter");
                HS.setStatus("Preset '" + name + "' deleted");
            }
        },

        pendingDeleteId: null,

        openDeleteModal: function (id) {
            if (!id || !HS.Presets.custom || !HS.Presets.custom[id]) return;
            HS.Presets.pendingDeleteId = id;
            var pName = HS.Presets.custom[id].name;
            if (HS.DOM && HS.DOM.deletePresetMsg) {
                HS.DOM.deletePresetMsg.textContent = 'Are you sure you want to delete preset "' + pName + '"?';
            }
            if (HS.DOM && HS.DOM.deletePresetModal) {
                HS.DOM.deletePresetModal.style.display = "flex";
            }
        },

        closeDeleteModal: function () {
            HS.Presets.pendingDeleteId = null;
            if (HS.DOM && HS.DOM.deletePresetModal) {
                HS.DOM.deletePresetModal.style.display = "none";
            }
        },

        confirmDeletePreset: function () {
            var id = HS.Presets.pendingDeleteId;
            if (id) {
                HS.Presets.remove(id);
            }
            HS.Presets.closeDeleteModal();
        },

        initEvents: function () {
            // Custom Dropdown Trigger
            var trigger = document.getElementById("preset-dropdown-trigger");
            if (trigger) {
                trigger.onclick = function (e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    HS.Presets.toggleCustomDropdown();
                };
            }

            // Dropdown Menu Item Click Delegation
            var menu = document.getElementById("preset-dropdown-menu");
            if (menu) {
                menu.onclick = function (e) {
                    if (e) e.stopPropagation();
                    var target = e.target;
                    var item = target ? target.closest(".custom-dropdown-item") : null;
                    if (item && item.getAttribute("data-value")) {
                        HS.Presets.selectCustomItem(item.getAttribute("data-value"));
                    }
                };
            }

            // Close on click outside
            document.addEventListener("click", function (e) {
                var wrap = document.getElementById("preset-dropdown-wrap");
                if (wrap && !wrap.contains(e.target)) {
                    HS.Presets.closeCustomDropdown();
                }
            });

            // Close on Escape
            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape") {
                    HS.Presets.closeCustomDropdown();
                    HS.Presets.closeDeleteModal();
                }
            });

            // Presets Dropdown Change (Backup & Sync)
            if (HS.DOM && HS.DOM.presetSelect) {
                HS.DOM.presetSelect.addEventListener("change", function () {
                    HS.markInteraction();
                    var pid = this.value;
                    if (pid) HS.Presets.apply(pid);
                });
            }

            // Presets Delete Button (Triggers Custom In-Panel Modal)
            if (HS.DOM && HS.DOM.btnDeletePreset) {
                HS.DOM.btnDeletePreset.addEventListener("click", function () {
                    HS.markInteraction();
                    var activeId = HS.Presets.activePresetId;
                    if (activeId && HS.Presets.custom && HS.Presets.custom[activeId]) {
                        HS.Presets.openDeleteModal(activeId);
                    }
                });
            }

            // Delete Modal Buttons
            if (HS.DOM && HS.DOM.btnCancelDeletePreset) {
                HS.DOM.btnCancelDeletePreset.addEventListener("click", HS.Presets.closeDeleteModal);
            }
            if (HS.DOM && HS.DOM.btnCloseDeletePresetModal) {
                HS.DOM.btnCloseDeletePresetModal.addEventListener("click", HS.Presets.closeDeleteModal);
            }
            if (HS.DOM && HS.DOM.btnConfirmDeletePreset) {
                HS.DOM.btnConfirmDeletePreset.addEventListener("click", HS.Presets.confirmDeletePreset);
            }

            // Save Preset Modal Triggers & Actions
            if (HS.DOM && HS.DOM.btnSavePreset) {
                HS.DOM.btnSavePreset.addEventListener("click", HS.Presets.openSaveModal);
            }
            if (HS.DOM && HS.DOM.btnClosePresetModal) {
                HS.DOM.btnClosePresetModal.addEventListener("click", HS.Presets.closeSaveModal);
            }
            if (HS.DOM && HS.DOM.btnCancelPreset) {
                HS.DOM.btnCancelPreset.addEventListener("click", HS.Presets.closeSaveModal);
            }
            if (HS.DOM && HS.DOM.btnConfirmSavePreset) {
                HS.DOM.btnConfirmSavePreset.addEventListener("click", HS.Presets.saveCustomPreset);
            }
            if (HS.DOM && HS.DOM.presetNameInput) {
                HS.DOM.presetNameInput.addEventListener("keydown", function (e) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        HS.Presets.saveCustomPreset();
                    } else if (e.key === "Escape") {
                        HS.Presets.closeSaveModal();
                    }
                });
            }
        }
    };
})(window, document);
