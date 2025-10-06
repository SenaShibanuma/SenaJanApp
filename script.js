document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element Selection ---
    const elements = {
        // Basic settings
        isKo: document.getElementById('is-ko'),
        isOya: document.getElementById('is-oya'),
        hanInput: document.getElementById('han-input'),
        hanMinus: document.getElementById('han-minus'),
        hanPlus: document.getElementById('han-plus'),

        // Hand Type
        isChiitoitsu: document.getElementById('is-chiitoitsu'),
        chiitoitsuValueDisplay: document.getElementById('chiitoitsu-value-display'),

        // Standard Hand Fieldset
        standardHandFieldset: document.getElementById('standard-hand-fieldset'),

        // Global Modifiers
        isPinfu: document.getElementById('is-pinfu'),
        isTanyao: document.getElementById('is-tanyao'),

        // Melds - .meld-group is the class for each <tr> in the melds table
        meldGroups: document.querySelectorAll('.meld-group'),

        // Pair
        pairIsYakuhai: document.getElementById('pair-is-yakuhai'),

        // Wait and Win type
        waitType: document.getElementById('wait-type'),

        // Results
        resultHanFu: document.getElementById('result-han-fu'),
        resultPointsRon: document.getElementById('result-points-ron'),
        resultPointsTsumo: document.getElementById('result-points-tsumo'),
        resultPointsTsumoMenzen: document.getElementById('result-points-tsumo-menzen'),
        resultMenzenTsumoContainer: document.getElementById('result-menzen-tsumo-container'),
        scoreTable: document.getElementById('score-table'),
        tableViewRon: document.getElementById('table-view-ron'),
        tableViewTsumo: document.getElementById('table-view-tsumo'),
        resultFuTotalDisplay: document.getElementById('result-fu-total-display'),

        // Fu Breakdown
        fuBreakdownContent: document.getElementById('fu-breakdown-content'),
        fuBase: document.getElementById('fu-base'),
        fuMeld1: document.getElementById('fu-meld1'),
        fuMeld2: document.getElementById('fu-meld2'),
        fuMeld3: document.getElementById('fu-meld3'),
        fuMeld4: document.getElementById('fu-meld4'),
        fuPair: document.getElementById('fu-pair'),
        fuWait: document.getElementById('fu-wait'),
        fuChiitoitsu: document.getElementById('fu-chiitoitsu'), // New element for chiitoitsu fu
        fuTotalUnrounded: document.getElementById('fu-total-unrounded'),
        fuTotalRounded: document.getElementById('fu-total-rounded'),

        // New Fu Value Displays
        waitFuValue: document.getElementById('wait-fu-value'),
        pairFuValue: document.getElementById('pair-fu-value'),
        meld1FuValue: document.getElementById('meld1-fu-value'),
        meld2FuValue: document.getElementById('meld2-fu-value'),
        meld3FuValue: document.getElementById('meld3-fu-value'),
        meld4FuValue: document.getElementById('meld4-fu-value')
    };


    // --- 2. State Management & UI Logic ---
    const state = {};

    function updateState() {
        state.isOya = elements.isOya.checked;
        state.han = parseInt(elements.hanInput.value, 10) || 0;
        state.handType = elements.isChiitoitsu.checked ? 'chiitoitsu' : 'standard';

        if (state.handType === 'standard') {
            state.isPinfu = elements.isPinfu.checked;
            state.isTanyao = elements.isTanyao.checked;
            state.wait = elements.waitType.value;
            state.pair = {
                isYakuhai: elements.pairIsYakuhai.checked
            };
            state.melds = Array.from(elements.meldGroups).map(group => {
                const id = group.dataset.meldId;
                return {
                    id,
                    type: group.querySelector(`input[name="meld${id}-type"]:checked`).value,
                    isOpen: group.querySelector(`#meld${id}-is-open`).checked,
                    isYaochu: group.querySelector(`#meld${id}-is-yaochu`).checked
                };
            });
            state.isMenzen = state.melds.every(meld => !meld.isOpen);
        } else { // Chiitoitsu
            state.isPinfu = false;
            state.isTanyao = elements.isTanyao.checked; // Tanyao can be combined
            state.isMenzen = true;
            state.wait = 'tanki';
            state.pair = {};
            state.melds = [];
        }
        state.tableView = elements.tableViewRon.checked ? 'ron' : 'tsumo';
    }

    function updateYakuVisuals() {
        elements.isChiitoitsu.closest('.yaku-selector')?.classList.toggle('yaku-active', elements.isChiitoitsu.checked);
        elements.isTanyao.closest('.yaku-selector')?.classList.toggle('yaku-active', elements.isTanyao.checked);
        elements.isPinfu.closest('.yaku-selector')?.classList.toggle('yaku-active', elements.isPinfu.checked);
    }

    function updateHanButtons() {
        const han = parseInt(elements.hanInput.value, 10);
        elements.hanMinus.disabled = han <= 1;
    }

    function updateControlStates() {
        const isChiitoitsu = elements.isChiitoitsu.checked;
        const isPinfu = elements.isPinfu.checked;
        const isTanyao = elements.isTanyao.checked;

        // --- 1. Chiitoitsu disables standard hand inputs ---
        elements.standardHandFieldset.disabled = isChiitoitsu;
        elements.standardHandFieldset.classList.toggle('disabled', isChiitoitsu);
        if (isChiitoitsu && elements.isPinfu.checked) {
            elements.isPinfu.checked = false; // Ensure Pinfu is off
        }

        // --- NEW: Show/hide Chiitoitsu fu value based on checkbox ---
        elements.chiitoitsuValueDisplay.classList.toggle('visible', isChiitoitsu);

        // --- 2. Update visuals for global yaku ---
        updateYakuVisuals();

        // --- 3. Update individual meld controls based on selections ---
        elements.meldGroups.forEach(group => {
            const id = group.dataset.meldId;
            const type = group.querySelector(`input[name="meld${id}-type"]:checked`).value;
            const isShuntsu = type === 'shuntsu';

            const isOpenCheck = group.querySelector(`#meld${id}-is-open`);
            const isYaochuCheck = group.querySelector(`#meld${id}-is-yaochu`);
            const openOptionCell = isOpenCheck.closest('.meld-options');
            const yaochuOptionCell = isYaochuCheck.closest('.meld-options');

            // A. Shuntsu logic: Shuntsu cannot be open (if pinfu is not set) and cannot be yaochu.
            // This is independent of global settings but can be overridden by them.
            const isShuntsuDisabled = isShuntsu;
            isOpenCheck.disabled = isShuntsuDisabled;
            isYaochuCheck.disabled = isShuntsuDisabled;
            openOptionCell.classList.toggle('option-disabled', isShuntsuDisabled);
            yaochuOptionCell.classList.toggle('option-disabled', isShuntsuDisabled);
            if (isShuntsu) {
                isOpenCheck.checked = false;
                isYaochuCheck.checked = false;
            }

            // B. Global overrides (Pinfu / Tanyao)
            const shuntsuRadio = group.querySelector(`#meld${id}-shuntsu`);
            const koutsuRadio = group.querySelector(`#meld${id}-koutsu`);
            const kantsuRadio = group.querySelector(`#meld${id}-kantsu`);

            // Pinfu forces closed shuntsu, overriding the above.
            const isPinfuMeldLock = isPinfu && !isChiitoitsu;
            shuntsuRadio.disabled = isPinfuMeldLock;
            koutsuRadio.disabled = isPinfuMeldLock;
            kantsuRadio.disabled = isPinfuMeldLock;

            // When Pinfu is active, the "Open" checkbox MUST be disabled and unchecked.
            if (isPinfuMeldLock) {
                shuntsuRadio.checked = true; // Force shuntsu
                isOpenCheck.checked = false; // Force closed
                isOpenCheck.disabled = true; // Disable the checkbox itself
                openOptionCell.classList.add('option-disabled'); // Apply visual disabled style
            } else {
                 // Re-evaluate disabled state only if Pinfu is NOT locking it.
                isOpenCheck.disabled = isShuntsu;
            }

            // Tanyao forces non-yaochu. Pinfu also forces non-yaochu.
            // This is a stronger condition than just shuntsu.
            const isYaochuLockedOut = (isTanyao || isPinfu) && !isChiitoitsu;
            isYaochuCheck.disabled = isYaochuLockedOut || isShuntsu; // Re-evaluate disabled state
            if (isYaochuLockedOut) {
                isYaochuCheck.checked = false;
            }
            // Ensure visual state is correct if Tanyao/Pinfu is on
            if(isYaochuLockedOut) {
                 yaochuOptionCell.classList.add('option-disabled');
            } else if (!isShuntsu) {
                 yaochuOptionCell.classList.remove('option-disabled');
            }
        });

        // Pinfu forces a ryanmen wait, Chiitoitsu forces tanki
        if (isPinfu) {
            elements.waitType.disabled = true;
            elements.waitType.value = 'ryanmen';
        } else if (isChiitoitsu) {
            elements.waitType.disabled = true;
            elements.waitType.value = 'tanki';
        } else {
            elements.waitType.disabled = false;
        }

        // Pair's yakuhai status is disabled by Pinfu OR Tanyao
        const pairYakuhaiDisabled = isPinfu || isTanyao;
        elements.pairIsYakuhai.disabled = pairYakuhaiDisabled;
        if (pairYakuhaiDisabled) {
            elements.pairIsYakuhai.checked = false;
        }
    }


    // --- 3. Core Calculation Functions ---
    function calculateFu(isRon) {
        const fuBreakdown = {
            base: 0,
            chiitoitsu: 0, // New field for chiitoitsu fu
            melds: [0, 0, 0, 0],
            pair: 0,
            wait: 0,
            winMethod: 0, // Retained for special case displays
            special: null, // To store text for special cases like "Chiitoitsu"
            unrounded: 0,
            rounded: 0
        };

        if (state.handType === 'chiitoitsu') {
            fuBreakdown.special = '七対子';
            fuBreakdown.base = 20;
            fuBreakdown.chiitoitsu = 5; // This is not real fu, but a special value for this hand

            // For display consistency, we can note the win method fu, though it doesn't count.
            fuBreakdown.wait = 2; // Always tanki
            if (isRon) {
                fuBreakdown.winMethod = 10; // Menzen ron with chiitoitsu
            } else {
                fuBreakdown.winMethod = 2; // Tsumo
            }

            fuBreakdown.unrounded = 25;
            fuBreakdown.rounded = 25;
            return fuBreakdown;
        }

        // Tsumo Pinfu is a special case, fixed at 20 fu.
        if (state.isPinfu && !isRon) {
            fuBreakdown.special = '平和ツモ';
            fuBreakdown.base = 20;
            // All other fu components are 0. Tsumo fu is ignored.
            fuBreakdown.unrounded = 20;
            fuBreakdown.rounded = 20;
            return fuBreakdown;
        }

        let fu = 20;
        fuBreakdown.base = 20;

        // Win condition fu
        if (state.isMenzen && isRon) {
            fuBreakdown.winMethod = 10;
            fu += 10;
        }
        if (!isRon && !state.isPinfu) { // Tsumo win (but not for Pinfu)
            fuBreakdown.winMethod = 2;
            fu += 2;
        }

        // Wait type fu
        if (['kanchan', 'penchan', 'tanki'].includes(state.wait)) {
            fuBreakdown.wait = 2;
            fu += 2;
        }

        // Pair fu
        if (state.pair.isYakuhai) {
            fuBreakdown.pair = 2;
            fu += 2;
        }

        // Meld fu
        state.melds.forEach((meld, index) => {
            let meldFu = 0;
            if (meld.type === 'koutsu') { // Triplets
                meldFu = meld.isYaochu ? 8 : 4;
                if (meld.isOpen) meldFu /= 2;
            } else if (meld.type === 'kantsu') { // Quads
                meldFu = meld.isYaochu ? 32 : 16;
                if (meld.isOpen) meldFu /= 2;
            }
            fuBreakdown.melds[index] = meldFu;
            fu += meldFu;
        });

        fuBreakdown.unrounded = fu;
        fuBreakdown.rounded = (fu === 25) ? 25 : Math.ceil(fu / 10) * 10;

        return fuBreakdown;
    }

    function calculateScore(han, fu, isOya) {
        const getManganScore = (name, oyaScore, koScore) => ({
            name,
            ron: isOya ? oyaScore : koScore,
            tsumoKo: isOya ? Math.ceil(oyaScore / 3 / 100) * 100 : Math.ceil(koScore / 4 / 100) * 100,
            tsumoOya: isOya ? Math.ceil(oyaScore / 3 / 100) * 100 : Math.ceil(koScore / 2 / 100) * 100,
        });

        if (han >= 13) return getManganScore("役満", 48000, 32000);
        if (han >= 11) return getManganScore("三倍満", 36000, 24000);
        if (han >= 8) return getManganScore("倍満", 24000, 16000);
        if (han >= 6) return getManganScore("跳満", 18000, 12000);
        if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70) || (han === 2 && fu >= 120)) {
             return getManganScore("満貫", 12000, 8000);
        }

        const basePoints = fu * Math.pow(2, han + 2);
        if (basePoints >= 2000) return getManganScore("満貫", 12000, 8000);

        const roundUp100 = (val) => Math.ceil(val / 100) * 100;

        if (isOya) {
            return {
                ron: roundUp100(basePoints * 6),
                tsumoKo: roundUp100(basePoints * 2), // Tsumo payment per player
                tsumoOya: roundUp100(basePoints * 2)
            };
        } else {
            return {
                ron: roundUp100(basePoints * 4),
                tsumoKo: roundUp100(basePoints * 1), // Payment from other non-dealers
                tsumoOya: roundUp100(basePoints * 2)  // Payment from dealer
            };
        }
    }


    // --- 4. DOM Update Functions ---
    function updateDisplay(han, fuRon, fuTsumo, ronScore, tsumoScore, tsumoMenzenScore, isOya, isMenzen) {
        if (fuRon === fuTsumo) {
            elements.resultHanFu.textContent = `${han}飜 ${fuRon}符`;
        } else {
            // New logic to show both fu values when they differ
            elements.resultHanFu.textContent = `${han}飜 (ロン${fuRon}符 / ツモ${fuTsumo}符)`;
        }

        // Helper to generate score text, now using the new score object structure
        const getPointText = (score, isTsumo) => {
            if (!score) return 'N/A';

            // For named scores (Mangan, etc.), display the name and total points.
            // The `ron` property holds the correct total for both Ron and Tsumo in this case.
            if (score.name) {
                return `${score.name} (${score.ron}点)`;
            }

            // For regular scores
            if (isTsumo) {
                let totalPoints;
                let displayString;
                if (isOya) {
                    totalPoints = score.tsumoKo * 3;
                    displayString = `${score.tsumoKo} All`;
                } else {
                    totalPoints = score.tsumoOya + (score.tsumoKo * 2);
                    displayString = `${score.tsumoOya} / ${score.tsumoKo}`;
                }
                return `${displayString} (${totalPoints}点)`;
            }

            // Default to Ron score display
            return `${score.ron}点`;
        };

        // Update Ron score
        elements.resultPointsRon.textContent = getPointText(ronScore, false);

        // Update Tsumo score
        elements.resultPointsTsumo.textContent = getPointText(tsumoScore, true);

        // Update Menzen Tsumo score and visibility
        if (isMenzen && tsumoMenzenScore) {
            elements.resultPointsTsumoMenzen.textContent = getPointText(tsumoMenzenScore, true);
            elements.resultMenzenTsumoContainer.style.display = 'flex';
        } else {
            elements.resultMenzenTsumoContainer.style.display = 'none';
        }
    }

    function updateFuBreakdownUI(fuBreakdown) {
        const { base, chiitoitsu, melds, pair, wait, winMethod, special, unrounded, rounded } = fuBreakdown;

        // --- 1. Reset all dynamic styles ---
        const allFuRows = document.querySelectorAll('.fu-row');
        allFuRows.forEach(row => row.classList.remove('fu-strikethrough'));
        document.getElementById('fu-chiitoitsu-row').style.display = 'none';
        elements.fuChiitoitsu.classList.remove('fu-value-chiitoitsu');


        // --- 2. Update text content of all fu displays ---
        elements.fuBase.textContent = base;
        elements.fuChiitoitsu.textContent = chiitoitsu;
        // fuWinMethod element is removed
        elements.fuWait.textContent = wait;
        elements.fuPair.textContent = pair;
        melds.forEach((meldFu, index) => {
            const meldElement = document.getElementById(`fu-meld${index + 1}`);
            if (meldElement) meldElement.textContent = meldFu;
        });

        // --- 3. Apply special styling based on hand type ---
        if (special === '七対子') {
            // Show the dedicated Chiitoitsu row and highlight its value
            document.getElementById('fu-chiitoitsu-row').style.display = 'flex';
            elements.fuChiitoitsu.classList.add('fu-value-chiitoitsu');

            // Strike out all other fu components that don't apply
            ['fu-wait-row', 'fu-pair-row'].forEach(id => {
                const row = document.getElementById(id);
                if (row) row.classList.add('fu-strikethrough');
            });
            document.querySelectorAll('.fu-meld-row').forEach(row => {
                row.classList.add('fu-strikethrough');
            });

        } else if (special === '平和ツモ') {
            // Tsumo fu is ignored, but the row is gone, so no strikethrough needed.
        }

        // --- 4. Update the main fu value displays in the form ---
        const updateFuDisplay = (element, value, strikethrough = false) => {
            if (!element) return; // Guard against missing elements
            element.classList.remove('fu-strikethrough-inline'); // Reset strikethrough
            if (value > 0) {
                element.textContent = value;
                element.classList.add('visible');
                if (strikethrough) {
                    element.classList.add('fu-strikethrough-inline');
                }
            } else {
                element.classList.remove('visible');
            }
        };

        // For special hands, hide all individual fu displays on the form, with exceptions
        if (special === '七対子') {
            // winMethodFuValue is removed
            updateFuDisplay(elements.waitFuValue, wait, true); // Show wait fu with strikethrough
            updateFuDisplay(elements.pairFuValue, 0); // Hide pair fu
            melds.forEach((meldFu, index) => {
                const meldElement = elements[`meld${index + 1}FuValue`];
                if (meldElement) updateFuDisplay(meldElement, 0);
            });
        } else {
            const hideFormFu = (special === '平和ツモ');
            // winMethodFuValue is removed
            updateFuDisplay(elements.waitFuValue, hideFormFu ? 0 : wait);
            updateFuDisplay(elements.pairFuValue, hideFormFu ? 0 : pair);
            melds.forEach((meldFu, index) => {
                const meldElement = elements[`meld${index + 1}FuValue`];
                if (meldElement) updateFuDisplay(meldElement, hideFormFu ? 0 : meldFu);
            });
        }

        // --- 5. Update total fu values ---
        elements.fuTotalUnrounded.textContent = unrounded;
        elements.fuTotalRounded.textContent = rounded;
        updateFuDisplay(elements.resultFuTotalDisplay, rounded);
    }


    function highlightCell(han, fuRon, fuTsumo, scoreRon, scoreTsumo, scoreTsumoMenzen) {
        // Clear all previous highlights
        const allHighlighted = document.querySelectorAll('.highlight, .highlight-ron, .highlight-tsumo, .highlight-menzen-tsumo');
        allHighlighted.forEach(cell => {
            cell.classList.remove('highlight', 'highlight-ron', 'highlight-tsumo', 'highlight-menzen-tsumo');
        });

        // Highlight for Ron
        const ronCellId = `cell-${han}-${fuRon}`;
        const ronCell = document.getElementById(ronCellId);
        if (ronCell) {
            ronCell.classList.add('highlight-ron');
        }

        // Highlight for Tsumo
        const tsumoCellId = `cell-${han}-${fuTsumo}`;
        const tsumoCell = document.getElementById(tsumoCellId);
        if (tsumoCell) {
            tsumoCell.classList.add('highlight-tsumo');
        }


        // Highlight for Menzen Tsumo (han + 1), using the Tsumo fu
        if (scoreTsumoMenzen) {
            const hanMenzen = han + 1;
            // A more robust solution might need to parse the score name ('満貫') and find the first mangan cell in that row.
            const menzenCellId = `cell-${hanMenzen}-${fuTsumo}`;
            const menzenCell = document.getElementById(menzenCellId);
            if (menzenCell) {
                menzenCell.classList.add('highlight-menzen-tsumo');
            }
        }
    }


    // --- 5. Score Table Generation ---
    function generateScoreTable(isOya, viewType) {
        const fuHeaders = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
        const hanHeaders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

        let html = '<thead><tr><th>飜/符</th>';
        fuHeaders.forEach(fu => html += `<th>${fu}符</th>`);
        html += '</tr></thead><tbody>';

        hanHeaders.forEach(han => {
            html += `<tr><th>${han}飜</th>`;
            fuHeaders.forEach(fu => {
                // In Tsumo mode, 1 han 20 fu is possible (Tsumo Pinfu).
                if (viewType === 'ron' && han === 1 && fu === 20) {
                     html += `<td id="cell-${han}-${fu}">-</td>`;
                     return;
                }

                const score = calculateScore(han, fu, isOya);
                let displayScore;

                if (score.name) {
                    // For Mangan etc., the 'ron' field holds the total payout.
                    displayScore = score.ron;
                } else if (viewType === 'tsumo') {
                    if (isOya) {
                        displayScore = score.tsumoKo * 3;
                    } else {
                        displayScore = score.tsumoOya + (score.tsumoKo * 2);
                    }
                } else { // 'ron'
                    displayScore = score.ron;
                }
                html += `<td id="cell-${han}-${fu}">${displayScore}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody>';
        elements.scoreTable.innerHTML = html;
    }


    // --- 6. Main Update & Initialization ---
    function mainUpdate() {
        updateControlStates();
        updateState();
        updateHanButtons();

        // Calculate for both Ron and Tsumo scenarios
        const fuBreakdownRon = calculateFu(true); // isRon = true
        const fuBreakdownTsumo = calculateFu(false); // isRon = false

        const scoreRon = calculateScore(state.han, fuBreakdownRon.rounded, state.isOya);
        const scoreTsumo = calculateScore(state.han, fuBreakdownTsumo.rounded, state.isOya);
        const scoreTsumoMenzen = state.isMenzen ? calculateScore(state.han + 1, fuBreakdownTsumo.rounded, state.isOya) : null;

        // Update the display with all three scores
        updateDisplay(state.han, fuBreakdownRon.rounded, fuBreakdownTsumo.rounded, scoreRon, scoreTsumo, scoreTsumoMenzen, state.isOya, state.isMenzen);

        // Update the Fu breakdown display (using the Ron calculation as the base)
        updateFuBreakdownUI(fuBreakdownRon);

        // Generate the score table
        generateScoreTable(state.isOya, state.tableView);

        // Highlight the relevant cell in the score table
        highlightCell(state.han, fuBreakdownRon.rounded, fuBreakdownTsumo.rounded, scoreRon, scoreTsumo, scoreTsumoMenzen);
    }

    function init() {
        // Create a single list of all controls that trigger a recalculation
        const allControls = [
            elements.isKo, elements.isOya, elements.hanInput,
            elements.isChiitoitsu, elements.isPinfu, elements.isTanyao,
            elements.waitType,
            elements.pairIsYakuhai,
            elements.tableViewRon,
            elements.tableViewTsumo,
            ...document.querySelectorAll('.meld-group input')
        ];

        allControls.forEach(control => {
            control.addEventListener('input', mainUpdate);
        });

        // Han button listeners
        elements.hanMinus.addEventListener('click', () => {
            let currentValue = parseInt(elements.hanInput.value, 10);
            if (currentValue > 1) {
                elements.hanInput.value = currentValue - 1;
                mainUpdate();
            }
        });

        elements.hanPlus.addEventListener('click', () => {
            let currentValue = parseInt(elements.hanInput.value, 10);
            elements.hanInput.value = currentValue + 1;
            mainUpdate();
        });

        // Specific listeners for mutually exclusive yaku
        elements.isChiitoitsu.addEventListener('change', () => {
            if (elements.isChiitoitsu.checked && elements.isPinfu.checked) {
                elements.isPinfu.checked = false;
            }
        });

        elements.isPinfu.addEventListener('change', () => {
            if (elements.isPinfu.checked && elements.isChiitoitsu.checked) {
                elements.isChiitoitsu.checked = false;
            }
        });


        // Initial setup
        mainUpdate();
    }

    init();
});
