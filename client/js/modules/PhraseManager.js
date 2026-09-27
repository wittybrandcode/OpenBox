/**
 * OPENBOX â€” Phrase Manager Module
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

            var lines = rawText.split(/\r\n|\r|\n/);
            var lineStartOffset = 0;
            var tokenIdx = 0;
            var frag = document.createDocumentFragment();

            for (var li = 0; li < lines.length; li++) {
                var lineText = lines[li];
                var wordRegex = /\S+/g;
                var match;

                while ((match = wordRegex.exec(lineText)) !== null) {
                    var wordStr = match[0];
                    var exactPos = lineStartOffset + match.index;
                    var exactEnd = exactPos + wordStr.length;

                    var tokenObj = {
                        index: tokenIdx,
                        text: wordStr,
                        charStart: exactPos,
                        charEnd: exactEnd,
                        lineIndex: li
                    };
                    HS.State.phraseTokens.push(tokenObj);

                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "word-token";
                    btn.dataset.tokenIndex = tokenIdx;
                    btn.textContent = wordStr;
                    btn.title = 'Word #' + (tokenIdx + 1) + ' (Chars ' + tokenObj.charStart + '..' + tokenObj.charEnd + ')';

                    (function (idx, element) {
                        element.addEventListener("click", function (e) {
                            // If this word is already highlighted in AE, click acts as an instant Eraser
                            var appliedId = element.dataset.appliedPhraseId;
                            if (appliedId) {
                                e.stopPropagation();
                                e.preventDefault();
                                HS.PhraseManager.removePhrase(appliedId);
                                return;
                            }

                            if (e.shiftKey && HS.State.lastClickedTokenIndex !== -1) {
                                var fromIdx = Math.min(HS.State.lastClickedTokenIndex, idx);
                                var toIdx = Math.max(HS.State.lastClickedTokenIndex, idx);
                                for (var k = fromIdx; k <= toIdx; k++) {
                                    var btnK = HS.DOM.tokensBoard ? HS.DOM.tokensBoard.querySelector('.word-token[data-token-index="' + k + '"]') : null;
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
                        });

                        element.addEventListener("mousedown", function (e) {
                            if (element.dataset.appliedPhraseId) return;
                            if (e.button === 0 && !e.shiftKey) {
                                HS.State.isDraggingTokenSelect = true;
                                HS.State.dragSelectActive = (HS.State.selectedTokenIndices.indexOf(idx) === -1);
                            }
                        });

                        element.addEventListener("mouseenter", function () {
                            var phrId = element.dataset.appliedPhraseId;
                            if (phrId) {
                                if (HS.DOM.tokensBoard) {
                                    HS.DOM.tokensBoard.querySelectorAll('.word-token[data-applied-phrase-id="' + phrId + '"]').forEach(function (el) {
                                        el.classList.add("eraser-hover");
                                    });
                                }
                                return;
                            }

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

                        element.addEventListener("mouseleave", function () {
                            var phrId = element.dataset.appliedPhraseId;
                            if (phrId && HS.DOM.tokensBoard) {
                                HS.DOM.tokensBoard.querySelectorAll('.word-token[data-applied-phrase-id="' + phrId + '"]').forEach(function (el) {
                                    el.classList.remove("eraser-hover");
                                });
                            }
                        });
                    })(tokenIdx, btn);

                    frag.appendChild(btn);
                    tokenIdx++;
                }

                if (li < lines.length - 1) {
                    var brEl = document.createElement("div");
                    brEl.className = "token-line-break";
                    frag.appendChild(brEl);

                    // Advance lineStartOffset: length of line + length of delimiter
                    lineStartOffset += lineText.length;
                    if (rawText.substring(lineStartOffset, lineStartOffset + 2) === "\r\n") {
                        lineStartOffset += 2;
                    } else if (rawText.charAt(lineStartOffset) === "\r" || rawText.charAt(lineStartOffset) === "\n") {
                        lineStartOffset += 1;
                    }
                }
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

                            HS.State.appliedPhrases.forEach(function (phr) {
                                var tag = document.createElement("div");
                                tag.className = "applied-phrase-tag";
                                tag.dataset.phraseId = phr.id;

                                var dot = document.createElement("span");
                                dot.className = "applied-phrase-dot";
                                dot.style.background = phr.color || "#2ECC71";

                                var txt = document.createElement("span");
                                txt.className = "applied-phrase-text";
                                txt.textContent = phr.text || "Phrase";
                                txt.title = (phr.text || "") + " (" + (phr.boxCount || 1) + " box)";

                                var delBtn = document.createElement("button");
                                delBtn.type = "button";
                                delBtn.className = "applied-phrase-del";
                                delBtn.innerHTML = "&times;";
                                delBtn.title = "Remove this phrase highlight from AE";
                                delBtn.addEventListener("click", function (e) {
                                    e.stopPropagation();
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

                                tag.appendChild(dot);
                                tag.appendChild(txt);
                                tag.appendChild(delBtn);
                                HS.DOM.appliedPhrasesList.appendChild(tag);
                            });
                        }

                        HS.PhraseManager.syncAppliedTokensHighlight();
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
                    b.title = 'Highlighted: "' + (matchedPhrase.text || tokenObj.text) + '" â€” Click to erase from AE';

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

            // Phrase Selection Clear
            if (HS.DOM.btnPhraseClearSel) {
                HS.DOM.btnPhraseClearSel.addEventListener("click", function () {
                    HS.State.selectedTokenIndices = [];
                    HS.State.lastClickedTokenIndex = -1;
                    HS.PhraseManager.syncTokenStyles();
                    HS.PhraseManager.updateBadge();
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
                        pRecentEl.title = "Last Chosen Color: " + savedPRecent.toUpperCase() + " (Ø¢Ø®Ø± Ù„ÙˆÙ† ØªÙ… Ø§Ø®ØªÙŠØ§Ø±Ù‡)";
                    }
                }
            } catch (e) {}

            // Phrase Color Input
            if (HS.DOM.phraseColorInput) {
                HS.DOM.phraseColorInput.addEventListener("input", function () {
                    if (HS.DOM.phraseColorHex) HS.DOM.phraseColorHex.textContent = this.value.toUpperCase();
                    if (HS.Controls && HS.Controls.updatePhraseColorIndicator) {
                        HS.Controls.updatePhraseColorIndicator(this.value);
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
                    var col = this.dataset.color;
                    if (HS.DOM.phraseColorInput) HS.DOM.phraseColorInput.value = col;
                    if (HS.DOM.phraseColorHex) HS.DOM.phraseColorHex.textContent = col.toUpperCase();
                    if (HS.Controls && HS.Controls.updatePhraseColorIndicator) {
                        HS.Controls.updatePhraseColorIndicator(col);
                    }
                });
            });

            // Phrase Motion & Outro Listeners
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
        }
    };

    window.addEventListener("mouseup", function () {
        HS.State.isDraggingTokenSelect = false;
    });
})(window, document);
