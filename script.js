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
        winRon: document.getElementById('win-ron'),
        winTsumo: document.getElementById('win-tsumo'),

        // Results
        resultHanFu: document.getElementById('result-han-fu'),
        resultPoints: document.getElementById('result-points'),
        scoreTable: document.getElementById('score-table'),
        resultFuTotalDisplay: document.getElementById('result-fu-total-display'),

        // Fu Breakdown
        fuBreakdownContent: document.getElementById('fu-breakdown-content'),
        fuBase: document.getElementById('fu-base'),
        fuWinMethod: document.getElementById('fu-win-method'),
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
        winMethodFuValue: document.getElementById('win-method-fu-value'),
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
        state.isRon = elements.winRon.checked;

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

        // Pinfu forces a ryanmen wait
        elements.waitType.disabled = isPinfu;
        if (isPinfu) {
            elements.waitType.value = 'ryanmen';
        }

        // Pair's yakuhai status is disabled by Pinfu OR Tanyao
        const pairYakuhaiDisabled = isPinfu || isTanyao;
        elements.pairIsYakuhai.disabled = pairYakuhaiDisabled;
        if (pairYakuhaiDisabled) {
            elements.pairIsYakuhai.checked = false;
        }
    }


    // --- 3. Core Calculation Functions ---
    function calculateFu() {
        const fuBreakdown = {
            base: 0,
            chiitoitsu: 0, // New field for chiitoitsu fu
            melds: [0, 0, 0, 0],
            pair: 0,
            wait: 0,
            winMethod: 0,
            special: null, // To store text for special cases like "Chiitoitsu"
            unrounded: 0,
            rounded: 0
        };

        if (state.handType === 'chiitoitsu') {
            fuBreakdown.special = '七対子';
            fuBreakdown.base = 20;
            fuBreakdown.chiitoitsu = 5;

            // Calculate fu for win method and wait type for display purposes, but don't add to total.
            // Chiitoitsu is always a single wait (tanki).
            fuBreakdown.wait = 2;
            // Win method fu depends on Ron or Tsumo.
            if (state.isRon) {
                fuBreakdown.winMethod = 10;
            } else {
                fuBreakdown.winMethod = 2;
            }

            fuBreakdown.unrounded = 25; // Total remains 25
            fuBreakdown.rounded = 25;  // Total remains 25
            return fuBreakdown;
        }

        // Tsumo Pinfu is a special case, fixed at 20 fu.
        // The only fu awarded is the base 20 fu.
        if (state.isPinfu && !state.isRon) {
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
        if (state.isMenzen && state.isRon) {
            fuBreakdown.winMethod = 10;
            fu += 10;
        }
        if (!state.isRon && !state.isPinfu) { // Tsumo win (but not for Pinfu)
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

    function calculateScore(han, fu) {
        if (han >= 13) return { name: "役満", oya: 48000, ko: 32000 };
        if (han >= 11) return { name: "三倍満", oya: 36000, ko: 24000 };
        if (han >= 8) return { name: "倍満", oya: 24000, ko: 16000 };
        if (han >= 6) return { name: "跳満", oya: 18000, ko: 12000 };
        if (han >= 5 || (han === 4 && fu >= 30) || (han === 3 && fu >= 60)) {
             return { name: "満貫", oya: 12000, ko: 8000 };
        }

        const basePoints = fu * Math.pow(2, han + 2);
        if (basePoints > 2000) return { name: "満貫", oya: 12000, ko: 8000 };

        const roundUp100 = (val) => Math.ceil(val / 100) * 100;

        if (state.isOya) {
            const ron = roundUp100(basePoints * 6);
            const tsumo = roundUp100(basePoints * 2);
            return { ron: ron, tsumo: `${tsumo} All`, raw: {ron, tsumo}};
        } else {
            const ron = roundUp100(basePoints * 4);
            const tsumoOya = roundUp100(basePoints * 2);
            const tsumoKo = roundUp100(basePoints * 1);
            return { ron: ron, tsumo: `${tsumoOya} / ${tsumoKo}`, raw: {ron, tsumoOya, tsumoKo} };
        }
    }


    // --- 4. DOM Update Functions ---
    function updateDisplay(fuBreakdown, score) {
        elements.resultHanFu.textContent = `${state.han}飜 ${fuBreakdown.rounded}符`;

        let pointText;
        if (score.name) {
            // For limit hands, display the name and total points
            const totalPoints = state.isOya ? score.oya : score.ko;
            pointText = `${score.name} (${totalPoints}点)`;
        } else {
             if (state.isRon) {
                // For Ron, just display the Ron score
                pointText = `ロン: ${score.ron}点`;
            } else {
                // For Tsumo, calculate and display the total
                let totalPoints;
                if (state.isOya) {
                    // Oya tsumo: payment from each Ko player
                    totalPoints = score.raw.tsumo * 3;
                    pointText = `ツモ: ${score.tsumo} (${totalPoints}点)`;
                } else {
                    // Ko tsumo: payment from Oya and other Ko players
                    totalPoints = score.raw.tsumoOya + (score.raw.tsumoKo * 2);
                    pointText = `ツモ: ${score.tsumo} (${totalPoints}点)`;
                }
            }
        }
        elements.resultPoints.textContent = pointText;
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
        elements.fuWinMethod.textContent = winMethod;
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
            ['fu-win-method-row', 'fu-wait-row', 'fu-pair-row'].forEach(id => {
                document.getElementById(id).classList.add('fu-strikethrough');
            });
            document.querySelectorAll('.fu-meld-row').forEach(row => {
                row.classList.add('fu-strikethrough');
            });

        } else if (special === '平和ツモ') {
            // Only strike out the win method fu (tsumo fu)
            document.getElementById('fu-win-method-row').classList.add('fu-strikethrough');
        }

        // --- 4. Update the main fu value displays in the form ---
        const updateFuDisplay = (element, value) => {
            if (value > 0) {
                element.textContent = value;
                element.classList.add('visible');
            } else {
                element.classList.remove('visible');
            }
        };

        // For special hands, hide all individual fu displays on the form
        const hideFormFu = (special === '七対子' || special === '平和ツモ');
        updateFuDisplay(elements.winMethodFuValue, hideFormFu ? 0 : winMethod);
        updateFuDisplay(elements.waitFuValue, hideFormFu ? 0 : wait);
        updateFuDisplay(elements.pairFuValue, hideFormFu ? 0 : pair);
        melds.forEach((meldFu, index) => {
            const meldElement = elements[`meld${index + 1}FuValue`];
            if (meldElement) updateFuDisplay(meldElement, hideFormFu ? 0 : meldFu);
        });

        // --- 5. Update total fu values ---
        elements.fuTotalUnrounded.textContent = unrounded;
        elements.fuTotalRounded.textContent = rounded;
        updateFuDisplay(elements.resultFuTotalDisplay, rounded);
    }


    function highlightCell(han, fu) {
        const highlighted = document.querySelector('.highlight');
        if (highlighted) {
            highlighted.classList.remove('highlight');
        }
        const cell = document.getElementById(`cell-${han}-${fu}`);
        if (cell) {
            cell.classList.add('highlight');
        }
    }


    // --- 5. Score Table Generation ---
    function generateScoreTable() {
        const fuHeaders = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
        const hanHeaders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

        let html = '<thead><tr><th>飜/符</th>';
        fuHeaders.forEach(fu => html += `<th>${fu}符</th>`);
        html += '</tr></thead><tbody>';

        hanHeaders.forEach(han => {
            html += `<tr><th>${han}飜</th>`;
            fuHeaders.forEach(fu => {
                if (han === 1 && fu === 20 && state.isRon) {
                     html += `<td id="cell-${han}-${fu}">-</td>`;
                     return;
                }
                const score = calculateScore(han, fu);
                let displayScore;
                 if(score.name) {
                    displayScore = state.isOya ? score.oya : score.ko;
                } else {
                    if (state.isRon) {
                        displayScore = score.ron;
                    } else {
                        displayScore = state.isOya ? score.raw.tsumo * 3 : score.raw.tsumoOya + score.raw.tsumoKo * 2;
                    }
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

        const fuBreakdown = calculateFu();
        const score = calculateScore(state.han, fuBreakdown.rounded);

        updateDisplay(fuBreakdown, score);
        updateFuBreakdownUI(fuBreakdown);
        generateScoreTable();
        highlightCell(state.han, fuBreakdown.rounded);
    }

    function init() {
        // Create a single list of all controls that trigger a recalculation
        const allControls = [
            elements.isKo, elements.isOya, elements.hanInput,
            elements.isChiitoitsu, elements.isPinfu, elements.isTanyao,
            elements.winRon, elements.winTsumo, elements.waitType,
            elements.pairIsYakuhai,
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
