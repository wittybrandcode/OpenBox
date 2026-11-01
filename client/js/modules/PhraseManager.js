/**
 * OPENBOX — Phrase Manager Module
 * Interactive word tokens board, multi-selection, strict positional matching, and instant eraser.
 */
(function (window, document) {
    "use strict";

    var HS = window.HS || {};
    window.HS = HS;
    HS.PhraseManager = {
        updateBadge: function () {
            if (!HS.DOM) return;
            var numWords = HS.State.selectedTokenIndices.length;
            var numChars = 0;
            for (var i = 0; i < numWords; i++) {
                var idx = HS.State.selectedTokenIndices[i];
                var tok = HS.State.phraseTokens[idx];
                if (tok && tok.text) {
                    numChars += tok.text.length;
                }
            }

            if (HS.DOM.phraseCountBadge) {
                HS.DOM.phraseCountBadge.textContent = numWords;
            }
            if (HS.DOM.phraseCharBadge) {
                HS.DOM.phraseCharBadge.textContent = numChars;
            }
        },

        getSelectedPhrases: function () {
            if (HS.State.selectedTokenIndices.length === 0) return [];
            var sorted = HS.State.selectedTokenIndices.slice().sort(function (a, b) { return a - b; });
            var groups = [];
            var currentGroup = [sorted[0]];

            for (var i = 1; i < sorted.length; i++) {
                if (sorted[i] === sorted[i - 1] + 1) {
                    currentGroup.push(sorted[i]);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [sorted[i]];
                }
            }
            groups.push(currentGroup);

            var phrases = [];
            for (var g = 0; g < groups.length; g++) {
                var grp = groups[g];
                var firstT = HS.State.phraseTokens[grp[0]];
                var lastT = HS.State.phraseTokens[grp[grp.length - 1]];
                if (!firstT || !lastT) continue;
                var phraseWords = [];
                for (var w = 0; w < grp.length; w++) {
                    if (HS.State.phraseTokens[grp[w]]) phraseWords.push(HS.State.phraseTokens[grp[w]].text);
                }
                phrases.push({
                    charStart: firstT.charStart,
                    charEnd: lastT.charEnd,
                    text: phraseWords.join(" "),
                    tokens: grp
                });
            }
            return phrases;
        },

        renderBoard: function (rawText, layerName) {
            if (HS.DOM && HS.DOM.phraseTargetName) {
                HS.DOM.phraseTargetName.textContent = layerName ? (layerName + " (Text)") : "Select Text Layer in AE";
            }

            if (!rawText || rawText.replace(/^\s+|\s+$/g, "").length === 0) {
                HS.State.lastTokensRawText = "";
                HS.State.phraseTokens = [];
                HS.State.selectedTokenIndices = [];
                if (HS.DOM && HS.DOM.tokensBoard) {
                    HS.DOM.tokensBoard.innerHTML = '<div class="tokens-empty-state"><span>Select a Text Layer in After Effects to load words</span></div>';
                }
                HS.PhraseManager.updateBadge();
                return;
            }

            if (rawText === HS.State.lastTokensRawText && HS.DOM && HS.DOM.tokensBoard && HS.DOM.tokensBoard.querySelectorAll(".word-token").length > 0) {
                return;
            }

            HS.State.lastTokensRawText = rawText;
            HS.State.phraseTokens = [];
            HS.State.selectedTokenIndices = [];
            HS.State.lastClickedTokenIndex = -1;

            if (!HS.DOM || !HS.DOM.tokensBoard) return;
            HS.DOM.tokensBoard.innerHTML = "";
            HS.PhraseManager.initDelegation();

            var hasArabic = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(rawText);
            HS.DOM.tokensBoard.dir = hasArabic ? "rtl" : "ltr";
            HS.DOM.tokensBoard.classList.toggle("rtl-mode", hasArabic);

            var wordRegex = /[^\s\u0000-\u001f]+/g;
            var match;
            var tokenIdx = 0;
            var lastWordEnd = 0;
            var curLineIndex = 0;
            var frag = document.createDocumentFragment();

            while ((match = wordRegex.exec(rawText)) !== null) {
                var wordStr = match[0];
                var exactPos = match.index;
                var exactEnd = exactPos + wordStr.length;

                // Check for newline(s) between previous word end and current word start
                if (lastWordEnd > 0) {
                    var between = rawText.substring(lastWordEnd, exactPos);
                    var nlMatches = between.match(/\r\n|[\r\n\u0003]/g);
                    if (nlMatches && nlMatches.length > 0) {
                        for (var nli = 0; nli < nlMatches.length; nli++) {
                            var brEl = document.createElement("div");
                            brEl.className = "token-line-break";
                            frag.appendChild(brEl);
                            curLineIndex++;
                        }
                    }
                }
                lastWordEnd = exactEnd;

                var tokenObj = {
                    index: tokenIdx,
                    text: wordStr,
                    charStart: exactPos,
                    charEnd: exactEnd,
                    lineIndex: curLineIndex
                };
                HS.State.phraseTokens.push(tokenObj);

                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "word-token";
                    btn.dataset.tokenIndex = tokenIdx;
                    btn.textContent = wordStr;
                    btn.title = 'Word #' + (tokenIdx + 1) + ' (Chars ' + tokenObj.charStart + '..' + tokenObj.charEnd + ')';

                    frag.appendChild(btn);
                    tokenIdx++;
            }

            HS.DOM.tokensBoard.appendChild(frag);

            HS.PhraseManager.updateBadge();
            HS.PhraseManager.syncAppliedPhrases();
        },

        syncTokenStyles: function () {
            if (!HS.DOM || !HS.DOM.tokensBoard) return;
            var buttons = HS.DOM.tokensBoard.querySelectorAll(".word-token");
            buttons.forEach(function (b) {
                var idx = parseInt(b.dataset.tokenIndex, 10);
                var isSel = (HS.State.selectedTokenIndices.indexOf(idx) !== -1);
                b.classList.toggle("selected", isSel);
            });
        },

        syncAppliedPhrases: function () {
            var lyrArg = JSON.stringify(HS.State.lastSyncedLayer || "");
            HS.Bridge.ensureLoaded(function () {
                HS.Bridge.eval("$._smartHighlighter.getAppliedPhrases(" + lyrArg + ")", function (resStr) {
                    if (!resStr || resStr === "EvalScript error.") return;
                    try {
                        var list = JSON.parse(resStr);
                        HS.State.appliedPhrases = (list instanceof Array) ? list : [];

                        if (HS.DOM && HS.DOM.appliedPhrasesWrap && HS.DOM.appliedPhrasesList) {
                            var count = HS.State.appliedPhrases.length;
                            if (HS.DOM.appliedPhrasesCount) HS.DOM.appliedPhrasesCount.textContent = count;
                            HS.DOM.appliedPhrasesWrap.style.display = (count > 0) ? "flex" : "none";
                            HS.DOM.appliedPhrasesList.innerHTML = "";

                            // [EV-05 / TASK-601] Populate Interactive Mini-Sequencer Track
                            var seqWrap = document.getElementById("phrase-mini-sequencer");
                            var seqBars = document.getElementById("sequencer-timeline-bars");
                            if (seqWrap && seqBars) {
                                seqWrap.style.display = (count > 0) ? "block" : "none";
                                seqBars.innerHTML = "";
                                HS.State.appliedPhrases.forEach(function (sqPhr, sqIdx) {
                                    var barEl = document.createElement("div");
                                    barEl.className = "sequencer-bar-item";
                                    barEl.style.backgroundColor = sqPhr.color || "#2ECC71";
                                    barEl.style.flex = "1";
                                    barEl.textContent = sqPhr.text || ("Phrase " + (sqIdx + 1));
                                    barEl.dataset.phraseId = sqPhr.id;
                                    barEl.title = 'Click to select & edit: ' + sqPhr.text;
                                    barEl.addEventListener("click", function (e) {
                                        e.stopPropagation();
                                        HS.PhraseManager.selectPhrase(sqPhr.id);
                                    });
                                    seqBars.appendChild(barEl);
                                });
                            }

                            HS.State.appliedPhrases.forEach(function (phr) {
                                var tag = document.createElement("div");
                                tag.className = "applied-phrase-tag";
                                tag.dataset.phraseId = phr.id;

                                // Live Color Switcher via invisible input
                                var colInput = document.createElement("input");
                                colInput.type = "color";
                                colInput.value = phr.color || "#2ECC71";
                                colInput.style.display = "none";
                                colInput.addEventListener("change", function (e) {
                                    e.stopPropagation();
                                    var newCol = this.value;
                                    dot.style.background = newCol;
                                    HS.PhraseManager.setPhraseColor(phr.id, newCol);
                                });

                                var dot = document.createElement("span");
                                dot.className = "applied-phrase-dot";
                                dot.style.background = phr.color || "#2ECC71";
                                dot.title = "Click to change color live in AE (تغيير اللون حياً)";
                                dot.addEventListener("click", function (e) {
                                    e.stopPropagation();
                                    colInput.click();
                                });

                                var txt = document.createElement("span");
                                txt.className = "applied-phrase-text";
                                txt.textContent = phr.text || "Phrase";
                                txt.title = (phr.text || "") + " — Click to select & edit properties (انقر لتحديد وتعديل الخصائص)";
                                txt.addEventListener("click", function (e) {
                                    e.stopPropagation();
                                    HS.PhraseManager.selectPhrase(phr.id);
                                });
                                tag.addEventListener("click", function (e) {
                                    HS.PhraseManager.selectPhrase(phr.id);
                                });

                                var delBtn = document.createElement("button");
                                delBtn.type = "button";
                                delBtn.className = "applied-phrase-del";
                                delBtn.innerHTML = "&times;";
                                delBtn.title = "Remove this phrase highlight from AE";
                                delBtn.addEventListener("click", function (e) {
                                    e.stopPropagation();
                                    if (HS.State.selectedPhraseId === phr.id) {
                                        HS.PhraseManager.deselectPhrase();
                                    }
                                    HS.PhraseManager.removePhrase(phr.id);
                                });

                                tag.addEventListener("mouseenter", function () {
                                    if (!HS.DOM.tokensBoard) return;
                                    HS.DOM.tokensBoard.querySelectorAll('.word-token[data-applied-phrase-id="' + phr.id + '"]').forEach(function (el) {
                                        el.classList.add("eraser-hover");
                                    });
                                });
                                tag.addEventListener("mouseleave", function () {
                                    if (!HS.DOM.tokensBoard) return;
                                    HS.DOM.tokensBoard.querySelectorAll('.word-token[data-applied-phrase-id="' + phr.id + '"]').forEach(function (el) {
                                        el.classList.remove("eraser-hover");
                                    });
                                });

                                tag.appendChild(colInput);
                                tag.appendChild(dot);
                                tag.appendChild(txt);

                                if (phr.boxCount && phr.boxCount > 1) {
                                    var badge = document.createElement("span");
                                    badge.className = "applied-phrase-line-badge";
                                    badge.textContent = phr.boxCount + " lines";
                                    badge.title = "Multi-line wrapped phrase (" + phr.boxCount + " lines linked)";
                                    tag.appendChild(badge);
                                }

                                tag.appendChild(delBtn);
                                HS.DOM.appliedPhrasesList.appendChild(tag);
                            });
                        }

                        HS.PhraseManager.syncAppliedTokensHighlight();
                        HS.PhraseManager.syncSelectedPhraseUI();
                    } catch (e) {}
                });
            });
        },

        syncAppliedTokensHighlight: function () {
            if (!HS.DOM || !HS.DOM.tokensBoard) return;
            var buttons = HS.DOM.tokensBoard.querySelectorAll(".word-token");
            var applied = HS.State.appliedPhrases || [];

            buttons.forEach(function (b) {
                var idx = parseInt(b.dataset.tokenIndex, 10);
                var tokenObj = HS.State.phraseTokens[idx];
                if (!tokenObj) return;

                var matchedPhrase = null;
                for (var i = 0; i < applied.length; i++) {
                    var ap = applied[i];
                    // Strict character index overlap: ensures ONLY the exact selected word occurrence is matched
                    if (typeof ap.charStart === "number" && typeof ap.charEnd === "number" && ap.charEnd > ap.charStart) {
                        if (tokenObj.charStart < ap.charEnd && tokenObj.charEnd > ap.charStart) {
                            matchedPhrase = ap;
                            break;
                        }
                    } else if (ap.text && tokenObj.text === ap.text && applied.length === 1) {
                        matchedPhrase = ap;
                        break;
                    }
                }

                if (matchedPhrase) {
                    var col = matchedPhrase.color || "#2ECC71";
                    b.classList.add("applied-highlight");
                    b.dataset.appliedPhraseId = matchedPhrase.id;
                    b.dataset.appliedPhraseText = matchedPhrase.text || tokenObj.text;
                    b.style.setProperty("--applied-color", col);
                    b.style.setProperty("--applied-bg", HS.Bridge.hexToRgbaCss(col, 0.28));
                    b.style.setProperty("--applied-border", HS.Bridge.hexToRgbaCss(col, 0.75));
                    b.style.setProperty("--applied-glow", HS.Bridge.hexToRgbaCss(col, 0.40));
                    b.title = 'Highlighted: "' + (matchedPhrase.text || tokenObj.text) + '" — Click to erase from AE';

                    // Ensure applied tokens are not counted in pending selection
                    var selPos = HS.State.selectedTokenIndices.indexOf(idx);
                    if (selPos !== -1) {
                        HS.State.selectedTokenIndices.splice(selPos, 1);
                        b.classList.remove("selected");
                    }
                } else {
                    b.classList.remove("applied-highlight");
                    b.classList.remove("eraser-hover");
                    delete b.dataset.appliedPhraseId;
                    delete b.dataset.appliedPhraseText;
                    b.style.removeProperty("--applied-color");
                    b.style.removeProperty("--applied-bg");
                    b.style.removeProperty("--applied-border");
                    b.style.removeProperty("--applied-glow");
                    b.title = 'Word #' + (idx + 1) + ' (Chars ' + tokenObj.charStart + '..' + tokenObj.charEnd + ')';
                }
            });

            HS.PhraseManager.updateBadge();
        },

        
        selectPhrase: function (phraseId) {
            HS.markInteraction();
            if (HS.State.selectedPhraseId === phraseId) {
                HS.PhraseManager.locatePhrase(phraseId);
                return;
            }
            HS.State.selectedPhraseId = phraseId;
            var phr = null;
            var applied = HS.State.appliedPhrases || [];
            for (var i = 0; i < applied.length; i++) {
                if (applied[i].id === phraseId) {
                    phr = applied[i];
                    break;
                }
            }
            if (!phr) return;

            // Clear any pending unapplied tokens selection so controls strictly edit the active phrase
            HS.State.selectedTokenIndices = [];
            HS.PhraseManager.syncTokenStyles();
            HS.PhraseManager.updateBadge();

            // Populate Controls with Phrase properties
            if (phr.color) {
                if (HS.DOM.phraseColorInput) HS.DOM.phraseColorInput.value = phr.color;
                if (HS.DOM.phraseColorHex) HS.DOM.phraseColorHex.textContent = phr.color.toUpperCase();
                if (HS.Controls && HS.Controls.updatePhraseColorIndicator) {
                    HS.Controls.updatePhraseColorIndicator(phr.color);
                }
                var swatches = document.querySelectorAll("#phrase-swatches .swatch-btn");
                swatches.forEach(function (sw) {
                    sw.classList.toggle("active", sw.dataset.color && sw.dataset.color.toLowerCase() === phr.color.toLowerCase());
                });
            }

            if (typeof phr.padX === "number") {
                var pXInput = document.getElementById("phrase-pad-x");
                if (pXInput) pXInput.value = phr.padX;
            }
            if (typeof phr.padY === "number") {
                var pYInput = document.getElementById("phrase-pad-y");
                if (pYInput) pYInput.value = phr.padY;
            }

            if (phr.shape && HS.Controls && HS.Controls.setPhraseShape) {
                HS.Controls.setPhraseShape(phr.shape, true);
            }
            if (phr.motion && HS.Controls && HS.Controls.setPhraseMotion) {
                HS.Controls.setPhraseMotion(phr.motion, true);
            }

            HS.PhraseManager.syncSelectedPhraseUI();
            HS.PhraseManager.locatePhrase(phraseId);
            HS.setStatus("Editing Phrase: \"" + (phr.text || "Phrase") + "\" — modify color, padding or shape below");
        },

        deselectPhrase: function () {
            HS.markInteraction();
            HS.State.selectedPhraseId = null;
            HS.PhraseManager.syncSelectedPhraseUI();
            HS.setStatus("Phrase deselected");
        },

        syncSelectedPhraseUI: function () {
            var selId = HS.State.selectedPhraseId;
            var tags = document.querySelectorAll(".applied-phrase-tag");
            tags.forEach(function (t) {
                t.classList.toggle("selected", t.dataset.phraseId === selId);
            });

            var bars = document.querySelectorAll(".sequencer-bar-item");
            bars.forEach(function (b) {
                b.classList.toggle("selected", b.dataset.phraseId === selId);
            });

            var editBar = document.getElementById("phrase-editing-bar");
            var editName = document.getElementById("phrase-editing-name");
            var editDot = document.getElementById("phrase-editing-dot");
            if (editBar) {
                if (selId) {
                    var phr = null;
                    var applied = HS.State.appliedPhrases || [];
                    for (var i = 0; i < applied.length; i++) {
                        if (applied[i].id === selId) { phr = applied[i]; break; }
                    }
                    if (phr) {
                        editBar.style.display = "flex";
                        if (editName) editName.textContent = phr.text || "Phrase";
                        if (editDot) editDot.style.background = phr.color || "#ffd13b";
                    } else {
                        editBar.style.display = "none";
                    }
                } else {
                    editBar.style.display = "none";
                }
            }

            if (HS.DOM.tokensBoard) {
                var tokens = HS.DOM.tokensBoard.querySelectorAll(".word-token");
                tokens.forEach(function (tk) {
                    var isTokenOfSel = selId && (tk.dataset.appliedPhraseId === selId);
                    tk.classList.toggle("editing-phrase-token", !!isTokenOfSel);
                });
            }
        },

        updatePhraseColorInUI: function (phraseId, hex) {
            if (!phraseId || !hex) return;
            var tag = document.querySelector('.applied-phrase-tag[data-phrase-id="' + phraseId + '"]');
            if (tag) {
                var dot = tag.querySelector(".applied-phrase-dot");
                if (dot) dot.style.background = hex;
            }
            var bar = document.querySelector('.sequencer-bar-item[data-phrase-id="' + phraseId + '"]');
            if (bar) {
                bar.style.backgroundColor = hex;
            }
            var editDot = document.getElementById("phrase-editing-dot");
            if (editDot && HS.State.selectedPhraseId === phraseId) {
                editDot.style.background = hex;
            }
            if (HS.DOM.tokensBoard) {
                HS.DOM.tokensBoard.querySelectorAll('.word-token[data-applied-phrase-id="' + phraseId + '"]').forEach(function (el) {
                    el.style.setProperty("--applied-color", hex);
                    el.style.setProperty("--applied-bg", HS.Bridge.hexToRgbaCss(hex, 0.28));
                    el.style.setProperty("--applied-border", HS.Bridge.hexToRgbaCss(hex, 0.75));
                    el.style.setProperty("--applied-glow", HS.Bridge.hexToRgbaCss(hex, 0.40));
                });
            }
        },

        _phraseParamTimers: {},
        setPhraseParamDebounced: function (phraseId, propName, value, delayMs) {
            HS.markInteraction();
            var key = phraseId + "_" + propName;
            if (HS.PhraseManager._phraseParamTimers[key]) {
                clearTimeout(HS.PhraseManager._phraseParamTimers[key]);
            }
            var d = (typeof delayMs === "number" && delayMs >= 0) ? delayMs : 120;
            HS.PhraseManager._phraseParamTimers[key] = setTimeout(function () {
                delete HS.PhraseManager._phraseParamTimers[key];
                HS.PhraseManager.setPhraseParam(phraseId, propName, value);
            }, d);
        },

        setPhraseParam: function (phraseId, propName, value) {
            HS.markInteraction();
            HS.Bridge.ensureLoaded(function () {
                var evalCmd = "$._smartHighlighter.setPhraseProperty(" + JSON.stringify(phraseId) + ", " + JSON.stringify(propName) + ", " + JSON.stringify(value) + ")";
                HS.Bridge.eval(evalCmd, function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.setStatus("Phrase " + propName + " updated in AE");
                        var applied = HS.State.appliedPhrases || [];
                        for (var i = 0; i < applied.length; i++) {
                            if (applied[i].id === phraseId) {
                                applied[i][propName] = value;
                                break;
                            }
                        }
                    } else if (res && res.indexOf("ERROR") !== -1) {
                        HS.setStatus(res.replace("ERROR:", "").trim(), true);
                    }
                });
            });
        },

        setPhraseColor: function (phraseId, hexColor) {
            HS.setStatus("Updating phrase color in AE...");
            HS.Bridge.ensureLoaded(function () {
                var evalCmd = "$._smartHighlighter.setPhraseColor(" + JSON.stringify(phraseId) + ", " + JSON.stringify(hexColor) + ")";
                HS.Bridge.eval(evalCmd, function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.setStatus("Phrase color updated");
                        HS.PhraseManager.syncAppliedPhrases();
                    } else {
                        HS.setStatus(res ? res.replace("ERROR:", "").trim() : "Failed to update color", true);
                    }
                });
            });
        },

        locatePhrase: function (phraseId) {
            HS.setStatus("Locating phrase in AE timeline...");
            HS.Bridge.ensureLoaded(function () {
                var evalCmd = "$._smartHighlighter.locatePhrase(" + JSON.stringify(phraseId) + ")";
                HS.Bridge.eval(evalCmd, function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.setStatus(res.replace("SUCCESS: ", ""));
                    } else {
                        HS.setStatus(res ? res.replace("ERROR:", "").trim() : "Failed to locate phrase", true);
                    }
                });
            });
        },

        resyncPhrases: function () {
            HS.setStatus("Re-syncing phrase highlight bounds...");
            HS.Bridge.ensureLoaded(function () {
                HS.Bridge.eval("$._smartHighlighter.resyncPhraseHighlights()", function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.showReport(res);
                        HS.PhraseManager.syncAppliedPhrases();
                    } else {
                        HS.setStatus(res ? res.replace("ERROR:", "").trim() : "Re-sync failed", true);
                    }
                });
            });
        },

        removePhrase: function (phraseId) {
            HS.setStatus("Removing phrase highlight...");
            HS.Bridge.ensureLoaded(function () {
                HS.Bridge.eval("$._smartHighlighter.removeSinglePhrase(" + JSON.stringify(phraseId) + ")", function (res) {
                    if (res && res.indexOf("SUCCESS") !== -1) {
                        HS.showReport(res);
                        HS.PhraseManager.syncAppliedPhrases();
                    } else {
                        HS.setStatus(res ? res.replace("ERROR:", "").trim() : "Failed to remove phrase", true);
                    }
                });
            });
        },

        initEvents: function () {
            if (!HS.DOM) return;
            // Phrase Re-Sync Button
            var btnResync = document.getElementById("btn-phrase-resync");
            if (btnResync) {
                btnResync.addEventListener("click", function () {
                    HS.PhraseManager.resyncPhrases();
                });
            }

            // Phrase Selection Clear
            var btnDeselect = document.getElementById("btn-phrase-deselect");
            if (btnDeselect) {
                btnDeselect.addEventListener("click", function (e) {
                    e.stopPropagation();
                    HS.PhraseManager.deselectPhrase();
                });
            }

            if (HS.DOM.btnPhraseClearSel) {
                HS.DOM.btnPhraseClearSel.addEventListener("click", function () {
                    HS.State.selectedTokenIndices = [];
                    HS.State.lastClickedTokenIndex = -1;
                    HS.PhraseManager.syncTokenStyles();
            HS.PhraseManager.updateBadge();
            if (HS.State.phraseLiveUpdate !== false && HS.State.selectedTokenIndices.length > 0) {
                if (HS.Actions && HS.Actions.applyPhraseHighlightDebounced) {
                    HS.Actions.applyPhraseHighlightDebounced(180);
                }
            }
        });
            }

            // Restore saved phrase recent color if exists
            try {
                var savedPRecent = localStorage.getItem("hs_phrase_recent_color");
                if (savedPRecent) {
                    var pRecentEl = document.getElementById("phrase-recent-color-swatch");
                    if (pRecentEl) {
                        pRecentEl.style.backgroundColor = savedPRecent;
                        pRecentEl.dataset.color = savedPRecent;
                        pRecentEl.title = "Last Chosen Color: " + savedPRecent.toUpperCase() + " (آخر لون تم اختياره)";
                    }
                }
            } catch (e) {}

            // Phrase Color Input
            if (HS.DOM.phraseColorInput) {
                HS.DOM.phraseColorInput.addEventListener("input", function () {
                    HS.markInteraction();
                    var val = this.value;
                    if (HS.DOM.phraseColorHex) HS.DOM.phraseColorHex.textContent = val.toUpperCase();
                    if (HS.Controls && HS.Controls.updatePhraseColorIndicator) {
                        HS.Controls.updatePhraseColorIndicator(val);
                    }
                    if (HS.State.selectedPhraseId) {
                        HS.PhraseManager.setPhraseColor(HS.State.selectedPhraseId, val);
                        HS.PhraseManager.updatePhraseColorInUI(HS.State.selectedPhraseId, val);
                    } else if (HS.State.phraseLiveUpdate !== false) {
                        if (HS.State.selectedTokenIndices.length > 0) {
                            if (HS.Actions && HS.Actions.applyPhraseHighlightDebounced) HS.Actions.applyPhraseHighlightDebounced(100);
                        } else if (HS.State.appliedPhrases && HS.State.appliedPhrases.length > 0) {
                            var lastPhr = HS.State.appliedPhrases[HS.State.appliedPhrases.length - 1];
                            if (lastPhr && lastPhr.id) {
                                HS.PhraseManager.setPhraseColor(lastPhr.id, val);
                                HS.PhraseManager.updatePhraseColorInUI(lastPhr.id, val);
                            }
                        }
                    }
                });
                HS.DOM.phraseColorInput.addEventListener("change", function () {
                    if (HS.Controls && HS.Controls.updatePhraseColorIndicator) {
                        HS.Controls.updatePhraseColorIndicator(this.value);
                    }
                });
            }

            // Phrase Color Swatches
            document.querySelectorAll("#phrase-swatches .swatch-btn").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    HS.markInteraction();
                    var col = this.dataset.color;
                    if (HS.DOM.phraseColorInput) HS.DOM.phraseColorInput.value = col;
                    if (HS.DOM.phraseColorHex) HS.DOM.phraseColorHex.textContent = col.toUpperCase();
                    if (HS.Controls && HS.Controls.updatePhraseColorIndicator) {
                        HS.Controls.updatePhraseColorIndicator(col);
                    }
                    if (HS.State.selectedPhraseId) {
                        HS.PhraseManager.setPhraseColor(HS.State.selectedPhraseId, col);
                        HS.PhraseManager.updatePhraseColorInUI(HS.State.selectedPhraseId, col);
                    } else if (HS.State.phraseLiveUpdate !== false) {
                        if (HS.State.selectedTokenIndices.length > 0) {
                            if (HS.Actions && HS.Actions.applyPhraseHighlightDebounced) HS.Actions.applyPhraseHighlightDebounced(100);
                        } else if (HS.State.appliedPhrases && HS.State.appliedPhrases.length > 0) {
                            var lastPhr = HS.State.appliedPhrases[HS.State.appliedPhrases.length - 1];
                            if (lastPhr && lastPhr.id) {
                                HS.PhraseManager.setPhraseColor(lastPhr.id, col);
                                HS.PhraseManager.updatePhraseColorInUI(lastPhr.id, col);
                            }
                        }
                    }
                });
            });

            // Phrase Motion & Outro Listeners
            
            // Live Padding inputs for Phrase Highlight
            ["phrase-pad-x", "phrase-pad-y"].forEach(function (id) {
                var inp = document.getElementById(id);
                if (!inp) return;
                inp.addEventListener("input", function () {
                    HS.markInteraction();
                    if (HS.State.selectedPhraseId) {
                        var pProp = (id === "phrase-pad-x") ? "paddingX" : "paddingY";
                        HS.PhraseManager.setPhraseParamDebounced(HS.State.selectedPhraseId, pProp, parseFloat(this.value) || 0, 80);
                    } else if (HS.State.phraseLiveUpdate !== false && HS.State.selectedTokenIndices.length > 0) {
                        if (HS.Actions && HS.Actions.applyPhraseHighlightDebounced) {
                            HS.Actions.applyPhraseHighlightDebounced(150);
                        }
                    }
                });
                inp.addEventListener("change", function () {
                    HS.markInteraction();
                    if (HS.State.selectedPhraseId) {
                        var pProp = (id === "phrase-pad-x") ? "paddingX" : "paddingY";
                        HS.PhraseManager.setPhraseParam(HS.State.selectedPhraseId, pProp, parseFloat(this.value) || 0);
                    } else if (HS.State.phraseLiveUpdate !== false && HS.State.selectedTokenIndices.length > 0) {
                        if (HS.Actions && HS.Actions.applyPhraseHighlightDebounced) {
                            HS.Actions.applyPhraseHighlightDebounced(50);
                        }
                    }
                });
            });

            if (HS.DOM.phraseOutroCheck) {
                HS.DOM.phraseOutroCheck.addEventListener("change", function () {
                    var enabled = this.checked;
                    if (HS.DOM.phraseHoldTime) HS.DOM.phraseHoldTime.disabled = !enabled;
                    if (HS.DOM.phraseHoldCol) HS.DOM.phraseHoldCol.classList.toggle("disabled", !enabled);
                    if (HS.Controls && HS.Controls.syncChipClasses) HS.Controls.syncChipClasses();
                });
            }
            if (HS.DOM.phraseSeqCheck) {
                HS.DOM.phraseSeqCheck.addEventListener("change", function () {
                    if (HS.Controls && HS.Controls.syncChipClasses) HS.Controls.syncChipClasses();
                });
            }

            // Movable Resizer Handle for Tokens Board
            var resizeHandle = (HS.DOM && HS.DOM.tokensResizeHandle) ? HS.DOM.tokensResizeHandle : document.getElementById("tokens-resize-handle");
            var board = (HS.DOM && HS.DOM.tokensBoard) ? HS.DOM.tokensBoard : document.getElementById("tokens-board");
            if (resizeHandle && board) {
                try {
                    var savedHeight = localStorage.getItem("hs_tokens_board_height");
                    if (savedHeight) {
                        board.style.height = savedHeight + "px";
                    }
                } catch (e) {}

                var startY = 0;
                var startHeight = 0;
                var onMouseMove = function (e) {
                    var dy = e.clientY - startY;
                    var newH = Math.max(65, Math.min(480, startHeight + dy));
                    board.style.height = newH + "px";
                };
                var onMouseUp = function () {
                    resizeHandle.classList.remove("active");
                    window.removeEventListener("mousemove", onMouseMove);
                    window.removeEventListener("mouseup", onMouseUp);
                    try {
                        localStorage.setItem("hs_tokens_board_height", board.offsetHeight);
                    } catch (e) {}
                };

                resizeHandle.addEventListener("mousedown", function (e) {
                    e.preventDefault();
                    startY = e.clientY;
                    startHeight = board.offsetHeight;
                    resizeHandle.classList.add("active");
                    window.addEventListener("mousemove", onMouseMove);
                    window.addEventListener("mouseup", onMouseUp);
                });
            }
        },
        parseSubtitles: function (subText, format) {
            if (!subText || typeof subText !== "string") return [];
            var lines = subText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
            var cues = [];
            var currentCue = null;
            var timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

            function parseSeconds(h, m, s, ms) {
                var hours = h ? parseInt(h, 10) : 0;
                var minutes = parseInt(m, 10) || 0;
                var seconds = parseInt(s, 10) || 0;
                var millis = parseInt(ms, 10) || 0;
                return hours * 3600 + minutes * 60 + seconds + (millis / 1000);
            }

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].replace(/^\s+|\s+$/g, "");
                if (!line) {
                    if (currentCue && currentCue.text) {
                        cues.push(currentCue);
                        currentCue = null;
                    }
                    continue;
                }
                if (line === "WEBVTT" || line.indexOf("NOTE") === 0) continue;
                var match = line.match(timeRegex);
                if (match) {
                    var startSec = parseSeconds(match[1], match[2], match[3], match[4]);
                    var endSec = parseSeconds(match[5], match[6], match[7], match[8]);
                    currentCue = {
                        start: startSec,
                        end: endSec,
                        duration: Math.max(0.04, endSec - startSec),
                        text: ""
                    };
                } else if (currentCue) {
                    var cleanLine = line.replace(/<[^>]+>/g, "");
                    if (currentCue.text) {
                        currentCue.text += " " + cleanLine;
                    } else {
                        currentCue.text = cleanLine;
                    }
                }
            }
            if (currentCue && currentCue.text) {
                cues.push(currentCue);
            }
            return cues;
        },

        matchCuesToTokens: function (cues, tokens) {
            if (!cues || !cues.length || !tokens || !tokens.length) return [];
            var matched = [];
            var tokenCursor = 0;
            for (var c = 0; c < cues.length; c++) {
                var cue = cues[c];
                var cueWords = cue.text.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, " ").replace(/^\s+|\s+$/g, "").split(/\s+/);
                if (!cueWords.length || !cueWords[0]) continue;
                var matchedIndices = [];
                for (var t = tokenCursor; t < tokens.length; t++) {
                    var tokClean = tokens[t].text.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, "");
                    var cueTarget = cueWords[matchedIndices.length];
                    if (tokClean === cueTarget || tokClean.indexOf(cueTarget) !== -1 || cueTarget.indexOf(tokClean) !== -1) {
                        matchedIndices.push(t);
                        if (matchedIndices.length === cueWords.length) {
                            tokenCursor = t + 1;
                            break;
                        }
                    } else if (matchedIndices.length > 0) {
                        matchedIndices = [];
                    }
                }
                if (matchedIndices.length > 0) {
                    matched.push({
                        cueIndex: c,
                        start: cue.start,
                        end: cue.end,
                        duration: cue.duration,
                        text: cue.text,
                        tokenIndices: matchedIndices
                    });
                }
            }
            return matched;
        }
    };

    // [AP-08 REMEDIATION] Centralized Event Delegation on tokensBoard (O(1) memory footprint)
    HS.PhraseManager.initDelegation = function () {
        if (!HS.DOM || !HS.DOM.tokensBoard || HS.PhraseManager._boardDelegationInitialized) return;
        HS.PhraseManager._boardDelegationInitialized = true;

        var board = HS.DOM.tokensBoard;

        board.addEventListener("click", function (e) {
            var element = e.target.closest(".word-token");
            if (!element) return;
            var idx = parseInt(element.dataset.tokenIndex, 10);
            if (isNaN(idx)) return;

            // If already highlighted in AE, click acts as an instant Eraser
            var appliedId = element.dataset.appliedPhraseId;
            if (appliedId) {
                e.stopPropagation();
                e.preventDefault();
                HS.PhraseManager.removePhrase(appliedId);
                return;
            }

            if (HS.State.selectedPhraseId) {
                HS.PhraseManager.deselectPhrase();
            }

            if (e.shiftKey && HS.State.lastClickedTokenIndex !== -1) {
                var fromIdx = Math.min(HS.State.lastClickedTokenIndex, idx);
                var toIdx = Math.max(HS.State.lastClickedTokenIndex, idx);
                for (var k = fromIdx; k <= toIdx; k++) {
                    var btnK = board.querySelector('.word-token[data-token-index="' + k + '"]');
                    if (btnK && btnK.dataset.appliedPhraseId) continue;
                    if (HS.State.selectedTokenIndices.indexOf(k) === -1) {
                        HS.State.selectedTokenIndices.push(k);
                    }
                }
            } else {
                var pos = HS.State.selectedTokenIndices.indexOf(idx);
                if (pos === -1) {
                    HS.State.selectedTokenIndices.push(idx);
                } else {
                    HS.State.selectedTokenIndices.splice(pos, 1);
                }
                HS.State.lastClickedTokenIndex = idx;
            }
            HS.PhraseManager.syncTokenStyles();
            HS.PhraseManager.updateBadge();
            if (HS.State.phraseLiveUpdate !== false && HS.State.selectedTokenIndices.length > 0) {
                if (HS.Actions && HS.Actions.applyPhraseHighlightDebounced) {
                    HS.Actions.applyPhraseHighlightDebounced(180);
                }
            }
        });

        board.addEventListener("mousedown", function (e) {
            var element = e.target.closest(".word-token");
            if (!element || element.dataset.appliedPhraseId) return;
            var idx = parseInt(element.dataset.tokenIndex, 10);
            if (isNaN(idx)) return;

            if (e.button === 0 && !e.shiftKey) {
                HS.State.isDraggingTokenSelect = true;
                HS.State.dragSelectActive = (HS.State.selectedTokenIndices.indexOf(idx) === -1);
            }
        });

        board.addEventListener("mouseover", function (e) {
            var element = e.target.closest(".word-token");
            if (!element) return;
            var phrId = element.dataset.appliedPhraseId;
            if (phrId) {
                board.querySelectorAll('.word-token[data-applied-phrase-id="' + phrId + '"]').forEach(function (el) {
                    el.classList.add("eraser-hover");
                });
                return;
            }

            var idx = parseInt(element.dataset.tokenIndex, 10);
            if (isNaN(idx)) return;

            if (HS.State.isDraggingTokenSelect) {
                var p = HS.State.selectedTokenIndices.indexOf(idx);
                if (HS.State.dragSelectActive && p === -1) {
                    HS.State.selectedTokenIndices.push(idx);
                } else if (!HS.State.dragSelectActive && p !== -1) {
                    HS.State.selectedTokenIndices.splice(p, 1);
                }
                HS.PhraseManager.syncTokenStyles();
                HS.PhraseManager.updateBadge();
            }
        });

        board.addEventListener("mouseout", function (e) {
            var element = e.target.closest(".word-token");
            if (!element) return;
            var phrId = element.dataset.appliedPhraseId;
            if (phrId) {
                board.querySelectorAll('.word-token[data-applied-phrase-id="' + phrId + '"]').forEach(function (el) {
                    el.classList.remove("eraser-hover");
                });
            }
        });
    };

    window.addEventListener("mouseup", function () {
        HS.State.isDraggingTokenSelect = false;
    });
})(window, document);