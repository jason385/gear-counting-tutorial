# 齒輪計數偵測教學 (Gear Counting Tutorial)

以 5 種傳統影像處理方法計算影像中齒輪數量的互動式教學網站。

**🌐 部署網址**：<https://jason385.github.io/gear-counting-tutorial/>

## 內容

涵蓋 5 種傳統方法：

1. 霍夫圓形偵測 (Hough Circle Transform)
2. 形態學 + 輪廓分析 (Morphology + Contour Analysis)
3. Canny 邊緣偵測 (Canny Edge Detection)
4. 模板匹配 (Template Matching)
5. Blob 偵測 (Blob Detection)

每種方法皆包含概念說明、動態視覺化、完整 Python 程式碼及優缺點對比，並支援手機 / 平板 / 桌面響應式排版。

## 作者

**黃傑翔**
國立雲林科技大學 電子工程系
課程：數位影像處理導論

## 技術棧

React 19 + Vite，部署於 GitHub Pages。

## 本地開發

```bash
npm install
npm run dev
```

## 部署

```bash
npm run deploy
```
