document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element Selection ---
    const elements = {
        // Basic settings
        isKo: document.getElementById('is-ko'),
        isOya: document.getElementById('is-oya'),
        hanInput: document.getElementById('han-input'),

        // Hand Type
        isChiitoitsu: document.getElementById('is-chiitoitsu'),

        // Standard Hand Fieldset
        standardHandFieldset: document.getElementById('standard-hand-fieldset'),

        // Global Modifiers
        isPinfu: document.getElementById('is-pinfu'),
        isTanyao: document.getElementById('is-tanyao'),

        // Melds
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
        fuSpecialContent: document.getElementById('fu-special-content'),
        fuBase: document.getElementById('fu-base'),
        fuWinMethod: document.getElementById('fu-win-method'),
        fuMeld1: document.getElementById('fu-meld1'),
        fuMeld2: document.getElementById('fu-meld2'),
        fuMeld3: document.getElementById('fu-meld3'),
        fuMeld4: document.getElementById('fu-meld4'),
        fuPair: document.getElementById('fu-pair'),
        fuWait: document.getElementById('fu-wait'),
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
            state.isTanyao = false;
            state.isMenzen = true;
            state.wait = 'tanki';
            state.pair = {};
            state.melds = [];
        }
    }

    function updateControlStates() {
        const isChiitoitsu = elements.isChiitoitsu.checked;
        const isPinfu = elements.isPinfu.checked;
        const isTanyao = elements.isTanyao.checked;

        // --- 1. Chiitoitsu disables everything else ---
        elements.standardHandFieldset.disabled = isChiitoitsu;
        elements.standardHandFieldset.classList.toggle('disabled', isChiitoitsu);
        if (isChiitoitsu) {
            // Uncheck Pinfu/Tanyao if Chiitoitsu is selected
            if (elements.isPinfu.checked) elements.isPinfu.checked = false;
            if (elements.isTanyao.checked) elements.isTanyao.checked = false;
            // No need to proceed further if it's chiitoitsu
            return;
        }

        // --- 2. Pinfu / Tanyao Logic ---
        // Loop through melds to set states based on global modifiers
        elements.meldGroups.forEach(group => {
            const id = group.dataset.meldId;
            const shuntsuRadio = group.querySelector(`#meld${id}-shuntsu`);
            const koutsuRadio = group.querySelector(`#meld${id}-koutsu`);
            const isOpenCheck = group.querySelector(`#meld${id}-is-open`);
            const isYaochuCheck = group.querySelector(`#meld${id}-is-yaochu`);

            const kantsuRadio = group.querySelector(`#meld${id}-kantsu`);

            // Pinfu forces closed shuntsu
            shuntsuRadio.disabled = isPinfu;
            koutsuRadio.disabled = isPinfu;
            kantsuRadio.disabled = isPinfu; // Kantsu is not allowed in Pinfu
            isOpenCheck.disabled = isPinfu;
            if (isPinfu) {
                shuntsuRadio.checked = true;
                isOpenCheck.checked = false;
            }

            // Pinfu or Tanyao force non-yaochu
            const isYaochuDisabled = isPinfu || isTanyao;
            isYaochuCheck.disabled = isYaochuDisabled;
            if (isYaochuDisabled) {
                isYaochuCheck.checked = false;
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
            fuBreakdown.unrounded = 25;
            fuBreakdown.rounded = 25;
            return fuBreakdown;
        }

        // Tsumo Pinfu is a special case, fixed at 20 fu.
        if (state.isPinfu && !state.isRon) {
            fuBreakdown.special = '平和ツモ';
            fuBreakdown.base = 20;
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
        if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
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
        elements.resultHanFu.textContent = `${state.han}ハン ${fuBreakdown.rounded}符`;

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
        const { base, melds, pair, wait, winMethod, special, unrounded, rounded } = fuBreakdown;

        // Helper to update the new display elements
        const updateFuDisplay = (element, value) => {
            if (value > 0) {
                element.textContent = value;
                element.classList.add('visible');
            } else {
                element.classList.remove('visible');
            }
        };

        if (special) {
            // Hide all individual fu displays for special hands like Chiitoitsu
            updateFuDisplay(elements.winMethodFuValue, 0);
            updateFuDisplay(elements.waitFuValue, 0);
            updateFuDisplay(elements.pairFuValue, 0);
            updateFuDisplay(elements.meld1FuValue, 0);
            updateFuDisplay(elements.meld2FuValue, 0);
            updateFuDisplay(elements.meld3FuValue, 0);
            updateFuDisplay(elements.meld4FuValue, 0);
        } else {
            // Update individual fu displays for standard hands
            updateFuDisplay(elements.winMethodFuValue, winMethod);
            updateFuDisplay(elements.waitFuValue, wait);
            updateFuDisplay(elements.pairFuValue, pair);
            melds.forEach((meldFu, index) => {
                const meldElement = elements[`meld${index + 1}FuValue`];
                if (meldElement) {
                    updateFuDisplay(meldElement, meldFu);
                }
            });
        }

        // --- Keep old logic for the hidden panel to minimize risk ---
        if (special) {
            elements.fuBreakdownContent.style.display = 'none';
            elements.fuSpecialContent.style.display = 'block';
            elements.fuSpecialContent.innerHTML = `<div class="fu-row"><span class="fu-label">${special}</span><span class="fu-value">${unrounded}</span></div>`;
        } else {
            elements.fuBreakdownContent.style.display = 'block';
            elements.fuSpecialContent.style.display = 'none';
            elements.fuSpecialContent.innerHTML = '';

            elements.fuBase.textContent = base;
            elements.fuWinMethod.textContent = winMethod;
            elements.fuWait.textContent = wait;
            elements.fuPair.textContent = pair;
            melds.forEach((meldFu, index) => {
                const meldElement = document.getElementById(`fu-meld${index + 1}`);
                if (meldElement) {
                    meldElement.textContent = meldFu;
                }
            });
        }

        elements.fuTotalUnrounded.textContent = unrounded;
        elements.fuTotalRounded.textContent = rounded;

        // Update the new display in the results area
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

        let html = '<thead><tr><th>ハン/符</th>';
        fuHeaders.forEach(fu => html += `<th>${fu}符</th>`);
        html += '</tr></thead><tbody>';

        hanHeaders.forEach(han => {
            html += `<tr><th>${han}ハン</th>`;
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
            control.addEventListener('input', mainUpdate); // Use 'input' for more responsive feel on number fields
        });

        // Initial setup
        mainUpdate();
    }

    init();
});
