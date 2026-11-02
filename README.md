# 卡片分類實驗

繁體中文卡片分類小遊戲，依 WCST 流程設計。使用原生 HTML、CSS、JavaScript，無登入、無外部程式庫。

[開啟遊戲](https://card-sort-lab-austin-1031.ms-yang.chatgpt.site/)

## 使用

直接以瀏覽器開啟 `index.html`。也可執行 `npm start`，再前往 `http://localhost:8000`。

點選固定卡片，或按鍵盤 1、2、3、4 作答。重新整理頁面可重新開始。資料只保存在頁面記憶體中，關閉或重新整理即清除。

## 流程

- 連續答對 10 題後，分類規則無提示切換；答錯則連對數歸零。
- 規則依顏色、形狀、數量的順序重複兩輪。
- 完成 6 組分類或作答 128 題時結束。
- 卡片由兩副各 64 種完整組合的獨立洗牌牌組構成，每題回饋 800 毫秒。
- 答對題數顯示為 N / 128；128 是題數上限。正確率以實際作答題數計算，提前結束時未作答題不算錯。

介面採黑白背景與新細明體優先字型；卡片保留分類所需顏色。裝置未安裝新細明體時使用 serif 替代字型。

## 研究參考

研究樣本 WCST 正確率平均 71.61%，標準差為 15.31 個百分點。

`z = (實際正確率百分比 - 71.61) / 15.31`

表格中的研究樣本參考位置以 `100 × Φ(z)` 做常態近似估計。這不是實際 PR 排名、一般人口常模、個人意識形態或人格排名。原始分布未確認為常態，且本遊戲並非原始 Inquisit 程式，未包含原研究政治問卷及其他認知測驗。

Zmigrod, L., Rentfrow, P. J., & Robbins, T. W. (2020). *The Partisan Mind: Is Extreme Political Partisanship Related to Cognitive Inflexibility?* Journal of Experimental Psychology: General, 149(3), 407–418. [論文 DOI](https://doi.org/10.1037/xge0000661) · [作者提供全文](https://www.leorzmigrod.com/_files/ugd/a64c5e_d74504da38e04b428f632aaeb64fcd61.pdf)

## 驗證

執行 `npm test` 測試核心分類流程與分數計算。
