import { useState, useEffect, useRef } from "react";

// ── 教學資料 ─────────────────────────────────────────────────────────────────
const METHODS = [
  {
    id: 1,
    name: "霍夫圓形偵測",
    eng: "Hough Circle Transform",
    tag: "傳統方法",
    tagColor: "#0ea5e9",
    difficulty: 2,
    speed: 5,
    accuracy: 3,
    desc: "利用霍夫變換在影像中搜尋圓形結構。齒輪的外輪廓本身就是圓，適合先找出每個齒輪的圓心與半徑，再計算個數。",
    steps: [
      "灰階化 → 高斯模糊（降低牙齒干擾）",
      "Canny 邊緣偵測取得輪廓",
      "HoughCircles 搜尋特定半徑範圍",
      "計算偵測到的圓形總數即齒輪數",
    ],
    pros: ["實作簡單", "速度最快", "OpenCV 內建支援"],
    cons: ["齒輪齒紋易造成誤判", "需設定適當半徑範圍", "重疊齒輪難區分"],
    code: `import cv2
import numpy as np

img = cv2.imread("gears.jpg")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blur = cv2.GaussianBlur(gray, (9, 9), 2)

# 搜尋圓形（對應齒輪外圓）
circles = cv2.HoughCircles(
    blur,
    cv2.HOUGH_GRADIENT,
    dp=1,
    minDist=60,       # 齒輪圓心最近距離
    param1=50,
    param2=30,
    minRadius=20,     # 最小齒輪半徑
    maxRadius=150,    # 最大齒輪半徑
)

count = 0
if circles is not None:
    circles = np.round(circles[0]).astype(int)
    count = len(circles)
    for x, y, r in circles:
        cv2.circle(img, (x, y), r, (0, 255, 0), 2)
        cv2.circle(img, (x, y), 3, (0, 0, 255), -1)

print(f"偵測到 {count} 個齒輪")`,
    viz: "hough",
  },
  {
    id: 2,
    name: "形態學 + 輪廓分析",
    eng: "Morphology + Contour Analysis",
    tag: "傳統方法",
    tagColor: "#0ea5e9",
    difficulty: 3,
    speed: 4,
    accuracy: 4,
    desc: "先將影像二值化，以形態學閉運算填平齒齒縫隙，使整個齒輪變成實心圓，再找輪廓並以圓形度篩選，計算有效輪廓數。",
    steps: [
      "灰階化 → Otsu 自適應二值化",
      "形態學閉運算（填平齒縫 → 實心圓）",
      "findContours 取得所有輪廓",
      "以面積 + 圓形度篩選出齒輪輪廓並計數",
    ],
    pros: ["填平齒縫後準確度高", "不依賴固定半徑", "對不同大小齒輪均適用"],
    cons: ["需要精確二值化", "光照不均時困難", "齒輪間距過近易合併"],
    code: `import cv2
import numpy as np

img = cv2.imread("gears.jpg")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blur = cv2.GaussianBlur(gray, (5, 5), 0)

# Otsu 二值化
_, binary = cv2.threshold(
    blur, 0, 255,
    cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
)

# 閉運算：填平齒輪齒縫，變成實心圓
kernel = cv2.getStructuringElement(
    cv2.MORPH_ELLIPSE, (15, 15))
closed = cv2.morphologyEx(
    binary, cv2.MORPH_CLOSE, kernel, iterations=3)

# 找外輪廓
contours, _ = cv2.findContours(
    closed, cv2.RETR_EXTERNAL,
    cv2.CHAIN_APPROX_SIMPLE)

count = 0
for cnt in contours:
    area = cv2.contourArea(cnt)
    peri = cv2.arcLength(cnt, True)
    if peri == 0 or area < 1000: continue
    # 圓形度 ≈ 1 表示接近圓形（填平後的齒輪）
    circularity = 4 * np.pi * area / (peri ** 2)
    if circularity > 0.55:
        count += 1
        cv2.drawContours(img, [cnt], -1, (0,255,0), 2)

print(f"偵測到 {count} 個齒輪")`,
    viz: "morph",
  },
  {
    id: 3,
    name: "Canny 邊緣偵測",
    eng: "Canny Edge Detection",
    tag: "傳統方法",
    tagColor: "#0ea5e9",
    difficulty: 2,
    speed: 5,
    accuracy: 3,
    desc: "利用 Canny 找出齒輪的完整邊緣，再對邊緣影像做形態學膨脹連接斷點，最後從連通區域計算齒輪數量。",
    steps: [
      "灰階化 → 高斯模糊",
      "Canny 邊緣偵測",
      "形態學膨脹連接邊緣",
      "連通域分析 (connectedComponentsWithStats) 計數",
    ],
    pros: ["速度快", "細節豐富（可見齒形）", "不需設定閾值以外的形狀假設"],
    cons: ["齒紋邊緣噪音多", "需額外連通處理", "背景複雜時誤判率高"],
    code: `import cv2
import numpy as np

img = cv2.imread("gears.jpg")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blur = cv2.GaussianBlur(gray, (5, 5), 0)

# Canny 邊緣偵測
edges = cv2.Canny(blur, 50, 150)

# 膨脹：把齒輪輪廓連接成封閉環
kernel = cv2.getStructuringElement(
    cv2.MORPH_ELLIPSE, (7, 7))
dilated = cv2.dilate(edges, kernel, iterations=2)

# 填充內部（flood fill）
filled = dilated.copy()
h, w = filled.shape
mask = np.zeros((h+2, w+2), np.uint8)
cv2.floodFill(filled, mask, (0, 0), 255)
filled = cv2.bitwise_not(filled)
combined = dilated | filled

# 連通域分析
num_labels, stats = cv2.connectedComponentsWithStats(
    combined, connectivity=8)[:2]

count = 0
for i in range(1, num_labels):  # 跳過背景(0)
    area = stats[i, cv2.CC_STAT_AREA]
    if area > 2000:   # 面積閾值過濾雜點
        count += 1

print(f"偵測到 {count} 個齒輪")`,
    viz: "canny",
  },
  {
    id: 4,
    name: "模板匹配",
    eng: "Template Matching",
    tag: "傳統方法",
    tagColor: "#0ea5e9",
    difficulty: 2,
    speed: 3,
    accuracy: 3,
    desc: "裁出一個標準齒輪影像作為模板，在目標影像上滑動比對，透過 Non-Maximum Suppression 避免重複計算，找出所有齒輪位置。",
    steps: [
      "準備齒輪標準模板影像（normalize 處理）",
      "在目標影像上滑動比對（TM_CCOEFF_NORMED）",
      "取相似度超過閾值的所有候選位置",
      "NMS 去除重疊候選，剩餘數量即齒輪數",
    ],
    pros: ["直觀好理解", "對特定款式準確", "不需形態學前處理"],
    cons: ["對旋轉/縮放敏感", "需多尺度搜尋", "多款式需多模板"],
    code: `import cv2
import numpy as np

img = cv2.imread("gears.jpg")
template = cv2.imread("gear_template.jpg", 0)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

th, tw = template.shape[:2]

# 多尺度模板匹配
count = 0
all_rects = []
for scale in [0.7, 0.85, 1.0, 1.2, 1.5]:
    w_ = int(tw * scale)
    h_ = int(th * scale)
    if w_ < 10 or h_ < 10: continue
    tpl = cv2.resize(template, (w_, h_))
    result = cv2.matchTemplate(
        gray, tpl, cv2.TM_CCOEFF_NORMED)
    locs = np.where(result >= 0.65)
    for pt in zip(*locs[::-1]):
        all_rects.append((*pt, w_, h_,
                          result[pt[1], pt[0]]))

# NMS：移除高度重疊的框
all_rects.sort(key=lambda r: -r[4])
used = []
for r in all_rects:
    overlap = False
    for u in used:
        ix = max(0, min(r[0]+r[2], u[0]+u[2])
                 - max(r[0], u[0]))
        iy = max(0, min(r[1]+r[3], u[1]+u[3])
                 - max(r[1], u[1]))
        if ix * iy > 0.3 * r[2] * r[3]:
            overlap = True; break
    if not overlap:
        used.append(r)
        count += 1
        cv2.rectangle(img, (r[0],r[1]),
            (r[0]+r[2],r[1]+r[3]), (0,255,0), 2)

print(f"偵測到 {count} 個齒輪")`,
    viz: "template",
  },
  {
    id: 5,
    name: "Blob 偵測",
    eng: "Blob Detection",
    tag: "傳統方法",
    tagColor: "#0ea5e9",
    difficulty: 2,
    speed: 4,
    accuracy: 3,
    desc: "使用 SimpleBlobDetector 設定面積、圓形度、凸性等多個特徵同時過濾，精確找出影像中每個齒輪的圓形主體。",
    steps: [
      "設定 Blob 參數：面積、圓形度、凸性",
      "SimpleBlobDetector 偵測所有 Blob",
      "以面積下限過濾細小雜訊",
      "統計 keypoints 數量即齒輪數",
    ],
    pros: ["多特徵同時過濾", "程式碼簡潔", "抗雜訊能力佳"],
    cons: ["需手動設定多組參數", "對光照變化敏感", "不同大小齒輪需調整範圍"],
    code: `import cv2
import numpy as np

img = cv2.imread("gears.jpg")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# 設定 Blob 偵測參數
params = cv2.SimpleBlobDetector_Params()

# 二值化閾值
params.minThreshold = 10
params.maxThreshold = 220

# 面積篩選（依齒輪大小調整）
params.filterByArea = True
params.minArea = 2000
params.maxArea = 80000

# 圓形度（齒輪填平後接近圓形）
params.filterByCircularity = True
params.minCircularity = 0.5

# 凸性篩選
params.filterByConvexity = True
params.minConvexity = 0.7

# 慣性比（長寬比，排除細長物體）
params.filterByInertia = True
params.minInertiaRatio = 0.5

detector = cv2.SimpleBlobDetector_create(params)
keypoints = detector.detect(gray)

count = len(keypoints)
result = cv2.drawKeypoints(
    img, keypoints, np.array([]),
    (0, 255, 0),
    cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS
)
print(f"偵測到 {count} 個齒輪")`,
    viz: "blob",
  },
];

// ── Canvas：繪製齒輪場景 ─────────────────────────────────────────────────────
function drawGearShape(ctx, cx, cy, R, r, teeth, color, fillColor) {
  // R = 外徑, r = 齒根圓, teeth = 齒數
  const toothAngle = (2 * Math.PI) / teeth;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = toothAngle * i - Math.PI / 2;
    const a1 = a0 + toothAngle * 0.35;
    const a2 = a1 + toothAngle * 0.15;
    const a3 = a2 + toothAngle * 0.35;
    ctx.lineTo(r * Math.cos(a0) + cx, r * Math.sin(a0) + cy);
    ctx.lineTo(R * Math.cos(a1) + cx, R * Math.sin(a1) + cy);
    ctx.lineTo(R * Math.cos(a2) + cx, R * Math.sin(a2) + cy);
    ctx.lineTo(r * Math.cos(a3) + cx, r * Math.sin(a3) + cy);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor || "#1e3a5f";
  ctx.fill();
  ctx.strokeStyle = color || "#334155";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 中心孔
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#060d1a";
  ctx.fill();
  ctx.strokeStyle = color || "#334155";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// 場景：3 個齒輪
const GEARS = [
  { cx: 80,  cy: 110, R: 58, r: 48, teeth: 18, label: "齒輪 A" },
  { cx: 160, cy: 85,  R: 38, r: 31, teeth: 12, label: "齒輪 B" },
  { cx: 155, cy: 160, R: 42, r: 35, teeth: 14, label: "齒輪 C" },
];

function GearCanvas({ method, animated }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const frameRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const drawScene = (frame) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#060d1a";
      ctx.fillRect(0, 0, W, H);

      // 畫基本齒輪
      GEARS.forEach((g, i) => {
        const hues = ["#1e3a5f", "#1a3040", "#1c3550"];
        drawGearShape(ctx, g.cx, g.cy, g.R, g.r, g.teeth, "#2d4a6a", hues[i]);
      });

      // 各方法特效
      if (method === "hough")    drawHoughViz(ctx, frame);
      if (method === "morph")    drawMorphViz(ctx, frame);
      if (method === "canny")    drawCannyViz(ctx, frame);
      if (method === "template") drawTemplateViz(ctx, frame);
      if (method === "blob")     drawBlobViz(ctx, frame);
    };

    if (animated) {
      const animate = () => {
        frameRef.current += 1;
        drawScene(frameRef.current);
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      drawScene(100);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [method, animated]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={220}
      style={{ borderRadius: 12, border: "1px solid #1e293b", maxWidth: "100%", height: "auto" }}
    />
  );
}

function drawHoughViz(ctx, frame) {
  // 掃描圓圈
  GEARS.forEach((g, i) => {
    const delay = i * 30;
    if (frame < delay) return;
    const f = frame - delay;
    const scanR = 10 + ((g.R + 5) * ((f % 70) / 70));
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, scanR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(14,165,233,${0.25 + 0.2 * Math.sin(f * 0.2)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (f > 35) {
      const alpha = Math.min(1, (f - 35) / 20);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16,185,129,${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = `rgba(16,185,129,${alpha})`;
      ctx.font = "bold 9px monospace";
      ctx.fillText(`✓ ${g.label}`, g.cx - 18, g.cy - g.R - 8);
    }
  });
  const allDone = frame > 120;
  if (allDone) {
    const alpha = Math.min(1, (frame - 120) / 20);
    ctx.fillStyle = `rgba(16,185,129,${alpha})`;
    ctx.font = "bold 11px monospace";
    ctx.fillText("共 3 個齒輪", 70, 200);
  }
}

function drawMorphViz(ctx, frame) {
  const progress = Math.min(1, frame / 60);
  GEARS.forEach((g, i) => {
    const delay = i * 20;
    if (frame < delay) return;
    const f = frame - delay;
    const fillR = g.r * 0.5 + g.R * Math.min(1, f / 50) * 1.1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, fillR, 0, Math.PI * 2);
    ctx.fillStyle = "#0ea5e9";
    ctx.fill();
    ctx.globalAlpha = 1;
    if (f > 40) {
      const a = Math.min(1, (f - 40) / 20);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16,185,129,${a})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = `rgba(16,185,129,${a})`;
      ctx.font = "9px monospace";
      ctx.fillText(`圓形度:0.8${i + 2}`, g.cx - 22, g.cy + g.R + 13);
    }
  });
}

function drawCannyViz(ctx, frame) {
  GEARS.forEach((g, i) => {
    const delay = i * 15;
    if (frame < delay) return;
    const f = frame - delay;
    const alpha = Math.min(0.85, f / 40);
    // 邊緣虛線圓
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.R + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r - 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(99,102,241,${alpha * 0.6})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (f > 50) {
      const a2 = Math.min(1, (f - 50) / 15);
      ctx.fillStyle = `rgba(99,102,241,${a2 * 0.15})`;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  if (frame > 100) {
    const a = Math.min(1, (frame - 100) / 20);
    ctx.fillStyle = `rgba(99,102,241,${a})`;
    ctx.font = "bold 11px monospace";
    ctx.fillText("連通域: 3", 75, 200);
  }
}

function drawTemplateViz(ctx, frame) {
  // 滑動框掃描
  const scanX = 20 + (frame % 160);
  const scanY = 60 + 40 * Math.sin(frame * 0.04);
  ctx.strokeStyle = "rgba(251,191,36,0.8)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(scanX - 25, scanY - 25, 50, 50);

  GEARS.forEach((g, i) => {
    const dist = Math.hypot(scanX - g.cx, scanY - g.cy);
    const sim = Math.max(0, 1 - dist / 80);
    if (sim > 0.3) {
      ctx.fillStyle = `rgba(251,191,36,${sim * 0.3})`;
      ctx.fillRect(scanX - 25, scanY - 25, 50, 50);
    }
    const delay = 80 + i * 30;
    if (frame > delay) {
      const a = Math.min(1, (frame - delay) / 20);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16,185,129,${a})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });
}

function drawBlobViz(ctx, frame) {
  GEARS.forEach((g, i) => {
    const delay = i * 25;
    if (frame < delay) return;
    const f = frame - delay;

    if (f < 40) {
      // 掃描閃爍
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.4);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${pulse * 0.2})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(168,85,247,${pulse * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const a = Math.min(1, (f - 40) / 20);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16,185,129,${a})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = `rgba(16,185,129,${a})`;
      ctx.font = "bold 9px monospace";
      ctx.fillText(`area=${g.R * g.R * 2 | 0}`, g.cx - 18, g.cy + g.R + 13);
    }
  });
  if (frame > 130) {
    const a = Math.min(1, (frame - 130) / 15);
    ctx.fillStyle = `rgba(168,85,247,${a})`;
    ctx.font = "bold 11px monospace";
    ctx.fillText("Blobs: 3", 80, 200);
  }
}

// ── 評分星星 ─────────────────────────────────────────────────
function Stars({ value, max = 5, color = "#f59e0b" }) {
  return (
    <span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? color : "#1e293b", fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

// ── 響應式 hook ──────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  });
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}

// ── 方法卡片 ─────────────────────────────────────────────────
function MethodCard({ m, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? "#1e293b" : "#0d1424",
        border: selected ? "1px solid #6366f1" : "1px solid #1e293b",
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: m.tagColor + "22",
          border: `2px solid ${m.tagColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: m.tagColor, flexShrink: 0,
        }}
      >
        {m.id}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: selected ? "#e2e8f0" : "#94a3b8", lineHeight: 1.3 }}>
          {m.name}
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>{m.eng}</div>
      </div>
    </button>
  );
}

// ── 主元件 ───────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState(METHODS[1]); // 預設形態學法
  const [tab, setTab]           = useState("concept");
  const [animating, setAnimating] = useState(true);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const tabs = [
    { key: "concept", label: "📖 概念" },
    { key: "code",    label: "💻 程式碼" },
    { key: "compare", label: "📊 比較" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060d1a",
      color: "#e2e8f0",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: isMobile ? "10px 14px 8px" : "14px 20px 12px",
        borderBottom: "1px solid #1e293b",
        background: "linear-gradient(135deg,#0a0f1e,#10162a)",
      }}>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 6 : 10,
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: isMobile ? 22 : 26 }}>⚙️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
                齒輪計數偵測
                <span style={{ marginLeft: 8, fontSize: isMobile ? 10 : 11, background: "#14532d", color: "#86efac", padding: "2px 8px", borderRadius: 99, fontWeight: 600, verticalAlign: "middle" }}>
                  傳統影像處理
                </span>
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: isMobile ? 11 : 12, color: "#475569" }}>
                5 種傳統方法 · 動態視覺化 · 完整 Python 程式碼
              </p>
            </div>
          </div>
          <div style={{ textAlign: isMobile ? "left" : "right", lineHeight: 1.5 }}>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: "#e2e8f0" }}>黃傑翔</div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }}>國立雲林科技大學－電子工程系</div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        flex: 1,
        overflow: isMobile ? "visible" : "hidden",
        minHeight: 0,
      }}>

        {/* ── 左側方法列表 ── */}
        <div style={{
          background: "#080e1c",
          flexShrink: 0,
          ...(isMobile ? {
            width: "100%",
            borderBottom: "1px solid #1e293b",
            padding: "8px",
            display: "flex",
            gap: 6,
            overflowX: "auto",
            overflowY: "hidden",
          } : {
            width: isTablet ? 170 : 195,
            borderRight: "1px solid #1e293b",
            padding: "10px 8px",
            overflowY: "auto",
          }),
        }}>
          {!isMobile && (
            <div style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>
              選擇偵測方法
            </div>
          )}
          {METHODS.map(m => (
            <div key={m.id} style={isMobile ? { flexShrink: 0, width: 175 } : { marginBottom: 6 }}>
              <MethodCard
                m={m}
                selected={selected.id === m.id}
                onClick={() => { setSelected(m); setTab("concept"); setAnimating(true); }}
              />
            </div>
          ))}

          {/* 場景說明（手機版隱藏） */}
          {!isMobile && (
            <div style={{ marginTop: 16, padding: "10px", background: "#0d1424", borderRadius: 8, border: "1px solid #1e293b" }}>
              <div style={{ fontSize: 9, color: "#6366f1", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                測試場景
              </div>
              <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.6 }}>
                3 個不同大小的正齒輪<br />
                齒數：18 / 12 / 14<br />
                外徑：58 / 38 / 42 px
              </div>
            </div>
          )}
        </div>

        {/* ── 右側內容 ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: isMobile ? "visible" : "hidden", minWidth: 0 }}>

          {/* 方法標題 */}
          <div style={{ padding: isMobile ? "10px 14px 8px" : "14px 20px 10px", borderBottom: "1px solid #1e293b", background: "#0a1020" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: selected.tagColor + "22",
                border: `2px solid ${selected.tagColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: selected.tagColor,
              }}>
                {selected.id}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{selected.eng}</div>
              </div>
              <span style={{
                marginLeft: "auto",
                fontSize: 10, fontWeight: 700,
                background: selected.tagColor + "22",
                color: selected.tagColor,
                padding: "3px 10px", borderRadius: 99,
              }}>
                {selected.tag}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: tab === t.key ? "#6366f1" : "#1e293b",
                  color: tab === t.key ? "#fff" : "#64748b",
                  transition: "all 0.15s",
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 內容區 */}
          <div style={{ flex: 1, overflowY: isMobile ? "visible" : "auto", padding: isMobile ? "12px 14px" : "16px 20px" }}>

            {/* ── 概念分頁 ── */}
            {tab === "concept" && (
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  <GearCanvas method={selected.viz} animated={animating} />
                  <button
                    onClick={() => setAnimating(a => !a)}
                    style={{
                      background: "#1e293b", border: "1px solid #334155",
                      color: "#94a3b8", borderRadius: 6, padding: "4px 14px",
                      fontSize: 11, cursor: "pointer",
                    }}
                  >
                    {animating ? "⏸ 暫停" : "▶ 播放"}
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8, marginTop: 0 }}>
                    {selected.desc}
                  </p>

                  <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                    {[
                      { label: "難易度", value: selected.difficulty, color: "#ef4444" },
                      { label: "速度",   value: selected.speed,      color: "#f59e0b" },
                      { label: "精度",   value: selected.accuracy,   color: "#10b981" },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{r.label}</div>
                        <Stars value={r.value} color={r.color} />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>執行步驟</div>
                    {selected.steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#6366f1", color: "#fff",
                          fontSize: 10, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6, paddingTop: 2 }}>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, background: "#0d2018", border: "1px solid #14532d", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, marginBottom: 6 }}>✓ 優點</div>
                      {selected.pros.map((p, i) => (
                        <div key={i} style={{ color: "#6ee7b7", fontSize: 11, marginBottom: 3 }}>• {p}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1, background: "#1a0d0d", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 6 }}>✗ 缺點</div>
                      {selected.cons.map((c, i) => (
                        <div key={i} style={{ color: "#fca5a5", fontSize: 11, marginBottom: 3 }}>• {c}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 程式碼分頁 ── */}
            {tab === "code" && (
              <div>
                <div style={{ background: "#020817", borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", background: "#0d1117", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#475569" }}>
                      {selected.eng.toLowerCase().replace(/ /g, "_")}.py
                    </span>
                  </div>
                  <pre style={{
                    margin: 0, padding: "16px 18px",
                    color: "#7dd3fc", fontSize: 12, lineHeight: 1.8,
                    overflowX: "auto",
                    fontFamily: "'Fira Code','Cascadia Code',monospace",
                    whiteSpace: "pre",
                  }}>
                    {selected.code}
                  </pre>
                </div>
                <div style={{ marginTop: 10, padding: "10px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", fontSize: 11, color: "#64748b" }}>
                  💡 安裝依賴：<code style={{ color: "#7dd3fc" }}>pip install opencv-python numpy matplotlib</code>
                </div>
              </div>
            )}

            {/* ── 比較分頁 ── */}
            {tab === "compare" && (
              <div>
                <div style={{ marginBottom: 12, fontSize: 13, color: "#94a3b8" }}>
                  5 種傳統方法的綜合評比（點擊列名可切換方法）
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #1e293b" }}>
                        {["方法", "難易度", "速度", "精度", "適用場景"].map((h, i) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: i === 0 || i === 4 ? "left" : "center", color: ["#475569","#ef4444","#f59e0b","#10b981","#475569"][i], fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {METHODS.map((m, idx) => {
                        const scenarios = [
                          "光照穩定、齒輪外輪廓清晰",
                          "複雜背景、多種大小齒輪",
                          "需要快速初步偵測",
                          "款式固定、批量生產線",
                          "需要多特徵聯合篩選",
                        ];
                        const isSel = m.id === selected.id;
                        return (
                          <tr key={m.id} onClick={() => { setSelected(m); setTab("concept"); }}
                            style={{ borderBottom: "1px solid #1e293b", background: isSel ? "#1a2035" : "transparent", cursor: "pointer" }}>
                            <td style={{ padding: "10px" }}>
                              <span style={{ fontWeight: isSel ? 700 : 400, color: isSel ? "#e2e8f0" : "#94a3b8" }}>{m.name}</span>
                              {isSel && <span style={{ marginLeft: 6, fontSize: 9, color: "#6366f1" }}>← 目前</span>}
                            </td>
                            <td style={{ padding: "10px", textAlign: "center" }}><Stars value={m.difficulty} color="#ef4444" /></td>
                            <td style={{ padding: "10px", textAlign: "center" }}><Stars value={m.speed} color="#f59e0b" /></td>
                            <td style={{ padding: "10px", textAlign: "center" }}><Stars value={m.accuracy} color="#10b981" /></td>
                            <td style={{ padding: "10px", color: "#64748b", fontSize: 11 }}>{scenarios[idx]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 20, padding: "14px 16px", background: "#0d1424", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginBottom: 10 }}>🗺 方法選擇決策流程</div>
                  {[
                    { q: "齒輪是否為標準圓形外觀？",   yes: "→ 霍夫圓形偵測（最簡單）" },
                    { q: "背景是否複雜、齒輪大小不一？", yes: "→ 形態學 + 輪廓分析（推薦）" },
                    { q: "只需快速初步計數？",           yes: "→ Canny + 連通域（最快）" },
                    { q: "款式固定、批量生產？",         yes: "→ 模板匹配或 Blob 偵測" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ color: "#334155", fontSize: 11, minWidth: 18 }}>{i + 1}.</span>
                      <div>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{item.q}</span>
                        <span style={{ color: "#10b981", fontSize: 11, marginLeft: 8 }}>{item.yes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
