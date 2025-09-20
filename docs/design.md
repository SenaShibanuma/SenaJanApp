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
- スマートフォンでの利用に最適化した、単一カラムの縦長レイアウトを基本とする。
- 各設定項目（基本設定、手牌構成、詳細設定など）を`<section class="card">`で意味的に分割する。
- **手牌構成:**
  - 「七対子」チェックボックスを最上部に配置。
  - 「断幺九」「平和」チェックボックスを面子設定の上に配置。
  - 4つの面子を`<div class="meld-group">`として個別に定義し、それぞれがラジオボタンやチェックボックスを持つ。
  - 雀頭を`<div class="pair-group">`として定義する。
  - 面子と雀頭の設定全体を`<fieldset id="standard-hand-fieldset">`で囲み、一括での有効/無効化を容易にする。

## 3. JavaScript設計 (`script.js`)
- **イベント駆動:** ユーザーの入力イベント（`input`）をトリガーとして、計算処理と画面更新を実行する。
- **状態管理:**
  - `updateState()`: UIから現在の入力状態を読み取り、JavaScriptオブジェクトに格納する。
  - `updateControlStates()`: マスターコントロール（七対子、平和、断幺九）の状態に基づき、従属するUI要素の有効/無効状態を更新する。
- **責務の分離:**
  - **UI更新ロジック:** `updateControlStates`がUIの見た目（`disabled`属性やCSSクラス）を制御する。
  - **計算ロジック:** `calculateFu`, `calculateScore`が状態オブジェクトを元に計算のみを行う。
  - **表示ロジック:** `updateDisplay`, `generateScoreTable`, `highlightCell`が計算結果を画面に描画する。
- **初期化:** `init()`関数が全てのイベントリスナーを設定し、初期表示を生成する。

## 4. CSS設計 (`style.css`)
- **レイアウト:** `max-width: 480px`を持つコンテナで、スマートフォン表示に固定する。Flexboxの`flex-direction: column`で縦一列のレイアウトを構築。
- **UI状態の可視化:**
  - `:disabled`擬似クラスや、JSによって動的に付与される`.disabled`クラスセレクタを使用して、操作不能なUI要素を明確にグレーアウト表示する。
- **変数:** CSSカスタムプロパティでカラーテーマを管理し、一貫性を保つ。

## 5. UIの動的制御
- **七対子選択時:** `standard-hand-fieldset`全体を無効化し、CSSで`opacity`を下げるなどして視覚的に非アクティブであることを示す。
- **平和/断幺九選択時:** 関連するチェックボックスやラジオボタンを個別に`disabled`にし、ユーザーが操作できないようにする。これらの変更は即座に`mainUpdate`関数を呼び出し、UI全体が再評価・再描画される。
