document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element Selection ---
    const elements = {
        isKo: document.getElementById('is-ko'),
        isOya: document.getElementById('is-oya'),
        hanInput: document.getElementById('han-input'),
        winRon: document.getElementById('win-ron'),
        winTsumo: document.getElementById('win-tsumo'),
        isMenzen: document.getElementById('is-menzen'),
        waitType: document.getElementById('wait-type'),
        pairType: document.getElementById('pair-type'),
        isPinfuTsumo: document.getElementById('is-pinfu-tsumo'),
        isChiitoitsu: document.getElementById('is-chiitoitsu'),
        resultHanFu: document.getElementById('result-han-fu'),
        resultPoints: document.getElementById('result-points'),
        scoreTable: document.getElementById('score-table'),
        fuFieldset: document.getElementById('fu-fieldset'),
        meldInputs: document.querySelectorAll('.meld-input')
    };

    // --- 2. State Management & Initial Calculation ---
    const state = {};

    function updateState() {
        state.isOya = elements.isOya.checked;
        state.han = parseInt(elements.hanInput.value, 10) || 0;
        state.isRon = elements.winRon.checked;
        state.isMenzen = elements.isMenzen.checked;
        state.wait = elements.waitType.value;
        state.pair = elements.pairType.value;
        state.pinfuTsumo = elements.isPinfuTsumo.checked;
        state.chiitoitsu = elements.isChiitoitsu.checked;

        state.melds = {};
        elements.meldInputs.forEach(input => {
            state.melds[input.id] = parseInt(input.value, 10) || 0;
        });
    }

    // --- 3. Core Calculation Functions ---
    function calculateFu() {
        // Special case: Chiitoitsu is always 25 fu
        if (state.chiitoitsu) {
            elements.fuFieldset.disabled = true;
            return 25;
        }
        elements.fuFieldset.disabled = false;

        let fu = 20; // Base fu (futei)

        // A hand is Pinfu-shaped if it has no fu from melds, pair, or wait type.
        let isPinfuShape = true;
        if (state.wait !== 'ryanmen') isPinfuShape = false;
        if (state.pair !== 'other') isPinfuShape = false;
        for (const key in state.melds) {
            if (state.melds[key] > 0) {
                isPinfuShape = false;
                break;
            }
        }

        // Now, calculate fu based on whether it's a Pinfu hand or not.
        if (isPinfuShape && state.isMenzen) {
            // It's a Pinfu hand.
            if (state.isRon) {
                fu = 30; // 20 base + 10 menzen ron.
            } else {
                fu = 20; // Tsumo Pinfu is just 20.
            }
        } else {
            // It's not a Pinfu hand, so calculate fu normally.
            if (state.isRon && state.isMenzen) {
                fu += 10;
            }
            if (!state.isRon) {
                fu += 2; // Tsumo fu
            }

            // Wait
            if (['kanchan', 'penchan', 'tanki', 'shanpon'].includes(state.wait)) {
                fu += 2;
            }

            // Pair
            if (state.pair === 'yakuhai') fu += 2;
            if (state.pair === 'double-yakuhai') fu += 4;

            // Melds
            fu += (state.melds['minko-open-simples'] || 0) * 2;
            fu += (state.melds['anko-simples'] || 0) * 4;
            fu += (state.melds['minko-open-honors'] || 0) * 4;
            fu += (state.melds['anko-honors'] || 0) * 8;
            fu += (state.melds['minkan-open-simples'] || 0) * 8;
            fu += (state.melds['ankan-simples'] || 0) * 16;
            fu += (state.melds['minkan-open-honors'] || 0) * 16;
            fu += (state.melds['ankan-honors'] || 0) * 32;
        }

        return fu;
    }

    function roundUpFu(fu) {
        if (fu === 25) return 25; // Chiitoitsu doesn't round
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
            if (state.isRon) {
                 pointText = `${score.name} (ロン: ${state.isOya ? score.oya : score.ko}点)`;
            } else {
                 pointText = `${score.name} (ツモ: ${state.isOya ? `${score.oya / 3} All` : `${score.ko/2} / ${score.ko/4}` })`;
                 if(state.isOya) pointText = `${score.name} (ツモ: ${score.oya / 3} All)`;
                 else {
                     const oyaPay = Math.ceil((score.ko/2)/100)*100;
                     const koPay = Math.ceil((score.ko/4)/100)*100;
                     pointText = `${score.name} (ツモ: ${oyaPay} / ${koPay})`;
                 }
            }
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
                // Pinfu tsumo on 1 han is 20 fu, but there is no 1-han 20-fu score.
                if (han === 1 && fu === 20) {
                     html += `<td id="cell-${han}-${fu}">-</td>`;
                     return;
                }
                const score = calculateScore(han, fu);
                let displayScore;
                 if(score.name) {
                    displayScore = state.isOya ? score.oya : score.ko;
                } else {
                    displayScore = state.isRon ? score.ron : (state.isOya ? score.raw.tsumo * 3 : score.raw.tsumoOya + score.raw.tsumoKo * 2);
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
        generateScoreTable(); // Regenerate table to reflect oya/ko/ron/tsumo changes
        highlightCell(state.han, roundedFu);
    }

    function init() {
        // More robust way to add listeners, avoiding the .length bug on <select>
        const singleElements = [
            'isKo', 'isOya', 'hanInput', 'winRon', 'winTsumo',
            'isMenzen', 'waitType', 'pairType', 'isPinfuTsumo', 'isChiitoitsu'
        ];

        singleElements.forEach(key => {
            // Using both change and input is redundant but safe for all element types.
            elements[key].addEventListener('change', mainUpdate);
            elements[key].addEventListener('input', mainUpdate);
        });

        // Add listeners to the NodeList of meld inputs separately
        elements.meldInputs.forEach(input => {
            input.addEventListener('input', mainUpdate);
        });

        mainUpdate(); // Initial calculation
    }

    init();
});
