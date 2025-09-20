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
- **符の内訳表示:**
  - `fu-breakdown-area`内に、符計算の各項目のためのプレースホルダー要素を配置する。
  - `fu-breakdown-content`と`fu-special-content`の2つのコンテナを持ち、通常手と特殊役（七対子など）で表示を切り替える。
- **手牌構成:**
  - `<div class="section-header">`を追加し、タイトル(`h2`)と符底(`span.fu-base-display`)を横並びに配置。
  - 「七対子」チェックボックスを最上部に配置。
  - 「断幺九」「平和」チェックボックスを面子設定の上に配置。
  - **`<div class="melds-grid">`**:
    - CSS Gridを使用して、面子と雀頭の入力を表形式で整列させるためのコンテナ。
    - 4列（ラベル、種類、オプション、符）で構成される。
    - 先頭に`<div class="grid-header">`を配置し、各列のタイトルを表示する。
    - 4つの面子と雀頭の各行は、`<div class="meld-group">`と`<div class="pair-group">`をそのまま使用する。これらの要素に`display: contents`を適用することで、内部の要素が直接グリッドアイテムとして扱われる。
  - 面子と雀頭の設定全体を`<fieldset id="standard-hand-fieldset">`で囲み、一括での有効/無効化を容易にする。

## 3. JavaScript設計 (`script.js`)
- **イベント駆動:** ユーザーの入力イベント（`input`）をトリガーとして、計算処理と画面更新を実行する。
- **状態管理:**
  - `updateState()`: UIから現在の入力状態を読み取り、JavaScriptオブジェクトに格納する。
  - `updateControlStates()`: マスターコントロール（七対子、平和、断幺九）の状態に基づき、従属するUI要素の有効/無効状態を更新する。
- **責務の分離:**
  - **UI更新ロジック:** `updateControlStates`がUIの見た目（`disabled`属性やCSSクラス）を制御する。
  - **計算ロジック:** `calculateFu`, `calculateScore`が状態オブジェクトを元に計算のみを行う。
    - `calculateFu`: 符計算を行い、各項目の符（符底、面子、待ちなど）、特殊役情報、切り上げ前後の合計符を含む詳細な**オブジェクト**を返す。
  - **表示ロジック:** `updateDisplay`, `generateScoreTable`, `highlightCell`が計算結果を画面に描画する。
    - `updateFuBreakdownUI` (新規): `calculateFu`から返されたオブジェクトを元に、符の内訳表示エリアを更新する。
- **初期化:** `init()`関数が全てのイベントリスナーを設定し、初期表示を生成する。
- **メインループ:** `mainUpdate()`が上記関数群を呼び出し、UIの変更から再計算、再描画までの一連の流れを制御する。

## 4. CSS設計 (`style.css`)
- **レイアウト:**
  - Flexboxを使い、PCなどの幅広の画面では2カラムレイアウトを実現 (`.container`に`display: flex`)。
  - `fu-breakdown-area`は`position: sticky`で画面右側に固定表示する。
  - **手牌構成エリア**:
    - `.melds-grid`に`display: grid`を適用し、ヘッダー付きの表形式レイアウトを実装。
    - `display: contents`を`.meld-group`と`.pair-group`に適用し、HTML構造を変更せずにグリッドレイアウトを実現。
  - **レスポンシブデザイン**:
    - `@media (max-width: 800px)`: 全体を1カラムにスタック。
    - `@media (max-width: 640px)`: `.melds-grid`のレイアウトを`display: block`に戻し、各面子入力をカード形式で縦に積むことで、狭い画面での可読性を確保。
- **UI状態の可視化:**
  - `:disabled`擬似クラスや、JSによって動的に付与される`.disabled`クラスセレクタを使用して、操作不能なUI要素を明確にグレーアウト表示する。
- **変数:** CSSカスタムプロパティでカラーテーマを管理し、一貫性を保つ。

## 5. UIの動的制御
- **七対子選択時:** `standard-hand-fieldset`全体を無効化し、CSSで`opacity`を下げるなどして視覚的に非アクティブであることを示す。符の内訳表示も「七対子: 25符」という専用の表示に切り替わる。
- **平和/断幺九選択時:** 関連するチェックボックスやラジオボタンを個別に`disabled`にし、ユーザーが操作できないようにする。これらの変更は即座に`mainUpdate`関数を呼び出し、UI全体が再評価・再描画される。
