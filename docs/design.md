# 設計書

## 1. ファイル構成
```
/
|-- index.html      (アプリケーションのメインHTML)
|-- script.js       (計算ロジックやDOM操作を記述)
|-- style.css       (アプリケーションのスタイルを定義)
|-- docs/
|   |-- requirements.md (要件定義書)
|   |-- design.md       (本書)
|-- README.md
```

## 2. HTML設計 (`index.html`)
- メインコンテンツを`<div class="input-area">`と`<div class="fu-breakdown-area">`に分割した2カラムレイアウトを基本とする。
- 各設定項目（基本設定、手牌構成、詳細設定など）を`<section class="card">`で意味的に分割し、`input-area`内に配置する。
- **計算結果表示:**
  - 点数表示エリアは`<div class="result-score-container">`で囲み、その中に各点数（ロン、ツモ、面前ツモ）の項目を`<div class="result-score-item">`として配置する。
  - 面前ツモの項目は`isMenzen`フラグに応じてJavaScriptで表示/非表示を切り替える。
- **符の内訳表示:**
  - `fu-breakdown-area`内に、符計算の各項目のためのプレースホルダー要素を配置する。
  - `fu-breakdown-content`に通常の内訳を表示。
- **手牌構成:**
  - 「七対子」と「断幺九」のチェックボックスを`<fieldset>`の外に配置し、常に選択可能にする。
  - 「平和」チェックボックスは`<fieldset>`内に配置し、七対子選択時に無効化されるようにする。
  - **`melds-table`**: `<table>`レイアウトを使用して面子入力を構成する。
  - 面子と雀頭、待ち方など、七対子と両立しない設定項目を`<fieldset id="standard-hand-fieldset">`で囲み、一括での有効/無効化を容易にする。

## 3. JavaScript設計 (`script.js`)
- **イベント駆動:** ユーザーの入力イベント（`input`, `change`）をトリガーとして、計算処理と画面更新を実行する。
- **状態管理:**
  - `updateState()`: UIから現在の入力状態を読み取り、JavaScriptオブジェクトに格納する。七対子と断幺九の複合を許容するように修正。
  - `updateControlStates()`: UI要素の有効/無効状態を更新する。
    - **順子選択時の制御:** 面子種別で「順子」が選択された場合、その面子の「鳴き」「幺九牌」チェックボックスを無効化し、CSSクラス `.option-disabled` を付与する。
    - **グローバル役の制御:** 「平和」や「断幺九」が選択された場合、関連する面子や雀頭のオプションを上書きして無効化する。
- **責務の分離:**
  - **UI更新ロジック:** `updateControlStates`がUIの見た目（`disabled`属性やCSSクラス）を制御する。`updateYakuVisuals`ヘルパー関数が役選択の見た目を更新する。
  - **計算ロジック:** `calculateFu`, `calculateScore`が状態オブジェクトを元に計算のみを行う。
    - `calculateFu`: 特殊役（七対子、平和ツモ）の場合でも、`special`キーを含む完全な内訳オブジェクトを返すように修正。
  - **表示ロジック:** `updateDisplay`, `generateScoreTable`, `highlightCell`が計算結果を画面に描画する。
    - `updateDisplay`: 3つの点数（ロン、ツモ、面前ツモ）を受け取り、対応するHTML要素に値を設定する。面前ツモは`isMenzen`フラグに基づいて表示を切り替える。
    - `highlightCell`: 3つの点数に対応する点数表のセルIDを特定し、それぞれに`.highlight-ron`, `.highlight-tsumo`, `.highlight-menzen-tsumo`クラスを付与する。
    - `updateFuBreakdownUI`: `calculateFu`から返されたオブジェクトを元に、符の内訳表示エリアを更新する。
- **初期化:** `init()`関数が全ての`input`イベントリスナーを設定する。
  - **排他制御:** `isChiitoitsu`と`isPinfu`に`change`イベントリスナーを追加し、一方がチェックされたらもう一方のチェックを外すことで、役の複合をUIレベルで防止する。
- **メインループ:** `mainUpdate()`が上記関数群を呼び出し、UIの変更から再計算、再描画までの一連の流れを制御する。`scoreTsumoMenzen`を計算し、表示ロジック関数に渡す役割を担う。

## 4. CSS設計 (`style.css`)
- **レイアウト:**
  - `<table>` を使用して面子入力エリアを構成 (`.melds-table`)。
  - `.result-score-container` をFlexboxでレイアウトし、点数表示を整理する。
- **UI状態の可視化:**
  - **アクティブな役:** JSによって`.yaku-selector`に`.yaku-active`クラスが付与され、背景色を変更して選択状態を明確にする。
  - **非アクティブなUI:**
    - `fieldset.disabled`クラスで関連エリア全体を囲む。
    - `.option-disabled`クラス: `label`に`text-decoration: line-through`などを適用し、個別のオプションが無効であることを示す。
  - **点数表のハイライト:**
    - `.highlight-ron`, `.highlight-tsumo`, `.highlight-menzen-tsumo`クラスを作成し、それぞれ異なる背景色を指定する。
    - 2つのクラスが同一要素に付与された場合（例: `.highlight-ron.highlight-tsumo`）のために、`linear-gradient`を使用して2色表示を実現する。
- **変数:** CSSカスタムプロパティでカラーテーマを管理し、一貫性を保つ。

## 5. UIの動的制御
- **七対子選択時:** `standard-hand-fieldset`全体が無効化される。「断幺九」は選択可能なまま残る。符の内訳表示は、各項目が打ち消し線で表示され、「25符」が別途表示される。
- **平和選択時:** 関連するチェックボックスやラジオボタンが個別に`disabled`になり、平和の条件に固定される。
- **順子選択時:** 各面子行で「順子」が選択されると、その行の「鳴き」「幺九牌」オプションが `.option-disabled` スタイルで非活性表示になる。
