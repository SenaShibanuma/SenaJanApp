document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element Selection ---
    const elements = {
        // Basic settings
        isKo: document.getElementById('is-ko'),
        isOya: document.getElementById('is-oya'),
        hanInput: document.getElementById('han-input'),

        // Hand Type
        handTypeStandard: document.getElementById('hand-type-standard'),
        handTypeChiitoitsu: document.getElementById('hand-type-chiitoitsu'),

        // Global Modifiers
        isPinfu: document.getElementById('is-pinfu'),
        isTanyao: document.getElementById('is-tanyao'),

        // Standard Hand Fieldset
        standardHandFieldset: document.getElementById('standard-hand-fieldset'),

        // Melds (within the fieldset)
        meldGroups: document.querySelectorAll('.meld-group'),

        // Pair (within the fieldset)
        pairIsYakuhai: document.getElementById('pair-is-yakuhai'),

        // Wait and Win type (within the fieldset)
        waitType: document.getElementById('wait-type'),
        winRon: document.getElementById('win-ron'),
        winTsumo: document.getElementById('win-tsumo'),

        // Results
        resultHanFu: document.getElementById('result-han-fu'),
        resultPoints: document.getElementById('result-points'),
        scoreTable: document.getElementById('score-table')
    };


    // --- 2. State Management & UI Logic ---
    const state = {};

    function updateState() {
        state.isOya = elements.isOya.checked;
        state.han = parseInt(elements.hanInput.value, 10) || 0;
        state.handType = elements.handTypeChiitoitsu.checked ? 'chiitoitsu' : 'standard';

        state.isPinfu = elements.isPinfu.checked;
        state.isTanyao = elements.isTanyao.checked;
        state.isRon = elements.winRon.checked;

        if (state.handType === 'standard') {
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
            // A hand is menzen (closed) if no melds are open.
            state.isMenzen = state.melds.every(meld => !meld.isOpen);
        } else {
            // Chiitoitsu is always a closed hand, pair wait.
            state.isMenzen = true;
            state.wait = 'tanki'; // Technically a pair wait, tanki is the closest for fu.
            state.pair = {};
            state.melds = [];
        }
    }

    function updateControlStates() {
        const isChiitoitsu = elements.handTypeChiitoitsu.checked;
        const isPinfu = elements.isPinfu.checked;
        const isTanyao = elements.isTanyao.checked;

        // --- Global Hand Type ---
        elements.standardHandFieldset.disabled = isChiitoitsu;
        elements.isPinfu.disabled = isChiitoitsu;
        elements.isTanyao.disabled = isChiitoitsu;
        if (isChiitoitsu) {
            if (elements.isPinfu.checked) elements.isPinfu.checked = false;
            if (elements.isTanyao.checked) elements.isTanyao.checked = false;
        }

        // --- Pinfu / Tanyao Logics ---
        // Loop through melds to set states based on global modifiers
        elements.meldGroups.forEach(group => {
            const id = group.dataset.meldId;
            const shuntsuRadio = group.querySelector(`#meld${id}-shuntsu`);
            const koutsuRadio = group.querySelector(`#meld${id}-koutsu`);
            const isOpenCheck = group.querySelector(`#meld${id}-is-open`);
            const isYaochuCheck = group.querySelector(`#meld${id}-is-yaochu`);

            // Pinfu forces all melds to be closed shuntsu
            shuntsuRadio.disabled = isPinfu;
            koutsuRadio.disabled = isPinfu;
            isOpenCheck.disabled = isPinfu;
            if (isPinfu) {
                shuntsuRadio.checked = true;
                koutsuRadio.checked = false;
                isOpenCheck.checked = false;
            }

            // Tanyao forces melds to not be yaochu
            isYaochuCheck.disabled = isTanyao;
            if (isTanyao) {
                isYaochuCheck.checked = false;
            }
        });

        // Pinfu forces a ryanmen wait
        elements.waitType.disabled = isPinfu;
        if (isPinfu) {
            elements.waitType.value = 'ryanmen';
        }

        // Pair's yakuhai status is disabled by Pinfu OR Tanyao
        const pairDisabled = isPinfu || isTanyao;
        elements.pairIsYakuhai.disabled = pairDisabled;
        if (pairDisabled) {
            elements.pairIsYakuhai.checked = false;
        }
    }


    // --- 3. Core Calculation Functions ---
    function calculateFu() {
        if (state.handType === 'chiitoitsu') {
            return 25;
        }

        // Pinfu is a special case.
        // If the Pinfu checkbox is checked, we follow the rules for Pinfu.
        if (state.isPinfu) {
            // A menzen (closed) ron Pinfu is 30 fu.
            // A tsumo Pinfu is 20 fu.
            return state.isRon ? 30 : 20;
        }

        // Standard calculation starts with a base of 20 fu.
        let fu = 20;

        // Add 2 fu for tsumo, unless it's an open hand (kuikae is complex, ignore for now).
        if (!state.isRon && state.isMenzen) {
            fu += 2;
        }

        // Add 10 fu for a closed-hand ron.
        if (state.isRon && state.isMenzen) {
            fu += 10;
        }

        // Add fu for the wait type.
        if (['kanchan', 'penchan', 'tanki'].includes(state.wait)) {
            fu += 2;
        }
        // Shanpon wait gets its fu from the resulting koutsu, so it's not added here.

        // Add fu for the pair.
        if (state.pair.isYakuhai) {
            fu += 2; // Assuming single yakuhai, not double for now.
        }

        // Add fu for melds.
        state.melds.forEach(meld => {
            if (meld.type === 'koutsu') {
                let meldFu = meld.isYaochu ? 8 : 4; // Base for anko (closed triplet)
                if (meld.isOpen) {
                    meldFu /= 2; // Half for minko (open triplet)
                }
                fu += meldFu;
            }
        });

        return fu;
    }

    function roundUpFu(fu) {
        if (fu === 25) return 25; // Chiitoitsu doesn't round
        // All other fu totals are rounded up to the nearest 10.
        return Math.ceil(fu / 10) * 10;
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
    function updateDisplay(fu, roundedFu, score) {
        elements.resultHanFu.textContent = `${state.han}ハン ${roundedFu}符`;

        let pointText;
        if (score.name) { // Yakuman, Mangan etc.
            pointText = `${score.name} (${state.isOya ? score.oya : score.ko}点)`;
        } else { // Regular score
             if (state.isRon) {
                pointText = `ロン: ${score.ron}点`;
            } else {
                pointText = `ツモ: ${score.tsumo}点`;
            }
        }
        elements.resultPoints.textContent = pointText;
    }

    function highlightCell(han, fu) {
        // Remove previous highlight
        const highlighted = document.querySelector('.highlight');
        if (highlighted) {
            highlighted.classList.remove('highlight');
        }

        // Add new highlight
        const cellId = `cell-${han}-${fu}`;
        const cell = document.getElementById(cellId);
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
                if (han === 1 && fu === 20) {
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
                    } else { // Tsumo
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
        updateState();
        const unroundedFu = calculateFu();
        const roundedFu = roundUpFu(unroundedFu);
        const score = calculateScore(state.han, roundedFu);

        updateDisplay(unroundedFu, roundedFu, score);
        generateScoreTable();
        highlightCell(state.han, roundedFu);
    }

    function init() {
        const controlsToUpdate = [
            elements.isKo, elements.isOya, elements.hanInput,
            elements.handTypeStandard, elements.handTypeChiitoitsu,
            elements.isPinfu, elements.isTanyao,
            elements.winRon, elements.winTsumo,
            elements.waitType, elements.pairIsYakuhai
        ];

        controlsToUpdate.forEach(control => {
            control.addEventListener('change', () => {
                updateControlStates();
                mainUpdate();
            });
        });

        elements.meldGroups.forEach(group => {
            const inputs = group.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    updateControlStates();
                    mainUpdate();
                });
            });
        });

        // Initial setup
        updateControlStates();
        mainUpdate();
    }

    init();
});
