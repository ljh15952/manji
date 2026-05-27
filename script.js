const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const toolbar = document.getElementById("toolbar");
const lineWidthInput = document.getElementById("lineWidth");
const lineWidthValue = document.getElementById("lineWidthValue");
const colorModeSelect = document.getElementById("colorMode");
const clearButton = document.getElementById("clearButton");

const STAMP_SIZE = 84;
const TOUCH_PREVIEW_OFFSET_Y = 96;

const MIN_ZOOM = 0.0001;
const MAX_ZOOM = 8;

const stamps = [];
const activePointers = new Map();

let deviceRatio = 1;

let viewport = {
    x: 0,
    y: 0,
    scale: 1
};

let interactionMode = null;
let stampPointerId = null;
let pinchStart = null;

let previewPoint = null;
let previewVisible = false;

function createPreviewStyle() {
    let mode = colorModeSelect.value;

    if (mode === "random") {
        mode = "classic";
    }

    if (mode === "classic") {
        return {
            type: "solid",
            color: "rgba(17, 24, 39, 0.42)"
        };
    }

    if (mode === "mono") {
        return {
            type: "solid",
            color: "rgba(17, 24, 39, 0.38)"
        };
    }

    if (mode === "pastel") {
        return {
            type: "pastel",
            colors: ["#dbeafe", "#e9d5ff", "#fce7f3"],
            glow: "#c4b5fd"
        };
    }

    if (mode === "neon") {
        return {
            type: "neon",
            colors: ["#00d9ff", "#9b8cff", "#ff8de1"],
            glow: "#7dd3fc"
        };
    }

    if (mode === "cyberpunk") {
        return {
            type: "cyberpunk",
            colors: ["#00eaff", "#ff4fd8", "#ffe45c"],
            glow: "#67e8f9"
        };
    }

    if (mode === "vaporwave") {
        return {
            type: "vaporwave",
            colors: ["#ff8ad8", "#8be9fd", "#c4b5fd"],
            glow: "#f0abfc"
        };
    }

    if (mode === "fire") {
        return {
            type: "neon",
            colors: ["#ff8a3d", "#ff5e5e", "#ffd36e"],
            glow: "#ffb86b"
        };
    }

    if (mode === "ocean") {
        return {
            type: "neon",
            colors: ["#67e8f9", "#60a5fa", "#a78bfa"],
            glow: "#67e8f9"
        };
    }

    return {
        type: "solid",
        color: "rgba(17, 24, 39, 0.42)"
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomHue() {
    return Math.floor(Math.random() * 360);
}

function hsl(h, s, l) {
    return `hsl(${h} ${s}% ${l}%)`;
}

function getReservedBottomSpace() {
    const toolbarRect = toolbar.getBoundingClientRect();
    return Math.ceil(toolbarRect.height + 28);
}

function resizeCanvas() {
    deviceRatio = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(window.innerWidth * deviceRatio);
    canvas.height = Math.floor(window.innerHeight * deviceRatio);

    redraw();
}

function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - viewport.x) / viewport.scale,
        y: (screenY - viewport.y) / viewport.scale
    };
}

function getScreenPoint(event) {
    const rect = canvas.getBoundingClientRect();

    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    const adjustedY =
        event.pointerType === "touch"
            ? rawY - TOUCH_PREVIEW_OFFSET_Y
            : rawY;

    const halfStampOnScreen = Math.min(
        (STAMP_SIZE * viewport.scale) / 2,
        Math.min(window.innerWidth, window.innerHeight) / 2 - 8
    );

    const minX = halfStampOnScreen;
    const maxX = window.innerWidth - halfStampOnScreen;

    const minY = halfStampOnScreen;
    const maxY =
        window.innerHeight - getReservedBottomSpace() - halfStampOnScreen;

    return {
        x: clamp(rawX, minX, Math.max(minX, maxX)),
        y: clamp(adjustedY, minY, Math.max(minY, maxY))
    };
}

function getWorldPoint(event) {
    const screenPoint = getScreenPoint(event);
    return screenToWorld(screenPoint.x, screenPoint.y);
}

function makeClassicStyle() {
    const hue = randomHue();

    return {
        type: "solid",
        color: hsl(hue, 82, 52)
    };
}

function makeNeonStyle() {
    const palettes = [
        ["#00f5ff", "#ff00ff", "#ffffff"],
        ["#ff00e6", "#00ff85", "#fff700"],
        ["#9d00ff", "#00e5ff", "#ff2bd6"],
        ["#39ff14", "#00d9ff", "#ff00aa"],
        ["#ff3131", "#ff00f5", "#00fff0"]
    ];

    const colors = randomItem(palettes);

    return {
        type: "neon",
        colors,
        glow: randomItem(colors)
    };
}

function makeCyberpunkStyle() {
    const palettes = [
        ["#00fff0", "#ff007f", "#faff00"],
        ["#00c8ff", "#ff2df7", "#7cff00"],
        ["#ff0099", "#00ffcc", "#fffb00"],
        ["#7b2cff", "#00eaff", "#ff005d"]
    ];

    const colors = randomItem(palettes);

    return {
        type: "cyberpunk",
        colors,
        glow: randomItem(colors)
    };
}

function makePastelStyle() {
    const palettes = [
        ["#ffd6e8", "#c8f7ff", "#fff1a8"],
        ["#d8c7ff", "#b8ffe2", "#ffd1dc"],
        ["#ffe0b5", "#c7f9cc", "#bde0fe"],
        ["#ffc8dd", "#cdb4db", "#bde0fe"]
    ];

    const colors = randomItem(palettes);

    return {
        type: "pastel",
        colors,
        glow: colors[1]
    };
}

function makeVaporwaveStyle() {
    const palettes = [
        ["#ff71ce", "#01cdfe", "#05ffa1"],
        ["#b967ff", "#fffb96", "#ff6ec7"],
        ["#ff00c8", "#00fff9", "#f3ff00"],
        ["#fe53bb", "#09fbd3", "#f5d300"]
    ];

    const colors = randomItem(palettes);

    return {
        type: "vaporwave",
        colors,
        glow: colors[0]
    };
}

function makeFireStyle() {
    const palettes = [
        ["#ff2a00", "#ff8c00", "#fff700"],
        ["#ff0040", "#ff6a00", "#ffd000"],
        ["#ff3131", "#ffb000", "#fff4a3"],
        ["#ff5f1f", "#ff006e", "#ffe600"]
    ];

    const colors = randomItem(palettes);

    return {
        type: "fire",
        colors,
        glow: colors[1]
    };
}

function makeOceanStyle() {
    const palettes = [
        ["#00ffff", "#008cff", "#003cff"],
        ["#00ffcc", "#00a6ff", "#6a5cff"],
        ["#48cae4", "#00b4d8", "#0077b6"],
        ["#64ffda", "#00e5ff", "#2979ff"]
    ];

    const colors = randomItem(palettes);

    return {
        type: "ocean",
        colors,
        glow: colors[0]
    };
}

function makeMonoStyle() {
    const colors = [
        "#111827",
        "#374151",
        "#6b7280",
        "#e5e7eb",
        "#ffffff"
    ];

    return {
        type: "solid",
        color: randomItem(colors)
    };
}

function createStampStyle() {
    let mode = colorModeSelect.value;

    if (mode === "random") {
        mode = randomItem([
            "classic",
            "neon",
            "cyberpunk",
            "pastel",
            "vaporwave",
            "fire",
            "ocean",
            "mono"
        ]);
    }

    if (mode === "classic") return makeClassicStyle();
    if (mode === "neon") return makeNeonStyle();
    if (mode === "cyberpunk") return makeCyberpunkStyle();
    if (mode === "pastel") return makePastelStyle();
    if (mode === "vaporwave") return makeVaporwaveStyle();
    if (mode === "fire") return makeFireStyle();
    if (mode === "ocean") return makeOceanStyle();
    if (mode === "mono") return makeMonoStyle();

    return makeClassicStyle();
}

function createGradient(size, style) {
    const gradient = ctx.createLinearGradient(
        -size / 2,
        -size / 2,
        size / 2,
        size / 2
    );

    gradient.addColorStop(0, style.colors[0]);
    gradient.addColorStop(0.5, style.colors[1]);
    gradient.addColorStop(1, style.colors[2]);

    return gradient;
}

function buildManjiPath(size) {
    const unit = size / 4;

    ctx.beginPath();

    ctx.moveTo(0, -2 * unit);
    ctx.lineTo(0, 0);
    ctx.lineTo(2 * unit, 0);
    ctx.lineTo(2 * unit, -unit);

    ctx.moveTo(2 * unit, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 2 * unit);
    ctx.lineTo(unit, 2 * unit);

    ctx.moveTo(0, 2 * unit);
    ctx.lineTo(0, 0);
    ctx.lineTo(-2 * unit, 0);
    ctx.lineTo(-2 * unit, unit);

    ctx.moveTo(-2 * unit, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, -2 * unit);
    ctx.lineTo(-unit, -2 * unit);
}

function drawSolidStamp(size, lineWidth, style, alpha) {
    buildManjiPath(size);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = 0;
    ctx.stroke();
}

function drawSoftGradientStamp(size, lineWidth, style, alpha, isPreview = false) {
    const gradient = createGradient(size, style);

    if (!isPreview) {
        buildManjiPath(size);

        ctx.globalAlpha = alpha * 0.42;
        ctx.strokeStyle = style.glow;
        ctx.lineWidth = lineWidth * 1.8;
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = lineWidth * 1.2;
        ctx.stroke();
    }

    buildManjiPath(size);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = isPreview ? 0 : 0;
    ctx.stroke();
}

function drawNeonStamp(size, lineWidth, style, alpha, isPreview = false) {
    const gradient = createGradient(size, style);

    if (isPreview) {
        buildManjiPath(size);

        ctx.globalAlpha = alpha * 0.16;
        ctx.strokeStyle = style.glow;
        ctx.lineWidth = lineWidth * 1.9;
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = lineWidth * 1.2;
        ctx.stroke();

        buildManjiPath(size);

        ctx.globalAlpha = alpha * 0.72;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth * 1.08;
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = lineWidth * 0.7;
        ctx.stroke();

        buildManjiPath(size);

        ctx.globalAlpha = alpha * 0.92;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
        ctx.lineWidth = Math.max(1, lineWidth * 0.12);
        ctx.shadowBlur = 0;
        ctx.stroke();

        return;
    }

    buildManjiPath(size);

    ctx.globalAlpha = alpha * 0.32;
    ctx.strokeStyle = style.glow;
    ctx.lineWidth = lineWidth * 3.2;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = lineWidth * 4.2;
    ctx.stroke();

    buildManjiPath(size);

    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth * 1.6;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = lineWidth * 2.2;
    ctx.stroke();

    buildManjiPath(size);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = lineWidth * 0.9;
    ctx.stroke();

    buildManjiPath(size);

    ctx.globalAlpha = alpha * 0.86;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
    ctx.lineWidth = Math.max(1, lineWidth * 0.2);
    ctx.shadowBlur = 0;
    ctx.stroke();
}

function drawManjiStamp(x, y, size, lineWidth, style, alpha = 1, isPreview = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";

    if (style.type === "solid") {
        drawSolidStamp(size, lineWidth, style, alpha);
    } else if (style.type === "pastel") {
        drawSoftGradientStamp(size, lineWidth, style, alpha, isPreview);
    } else {
        drawNeonStamp(size, lineWidth, style, alpha, isPreview);
    }

    ctx.restore();
}

function drawBackground() {
    ctx.save();

    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.restore();
}

function getAdaptiveGridSize() {
    let gridSize = 80;

    while (gridSize * viewport.scale < 36) {
        gridSize *= 2;
    }

    while (gridSize * viewport.scale > 150) {
        gridSize /= 2;
    }

    return gridSize;
}

function drawCyberGrid() {
    const leftTop = screenToWorld(0, 0);
    const rightBottom = screenToWorld(window.innerWidth, window.innerHeight);

    const gridSize = getAdaptiveGridSize();

    const startX = Math.floor(leftTop.x / gridSize) * gridSize;
    const endX = Math.ceil(rightBottom.x / gridSize) * gridSize;

    const startY = Math.floor(leftTop.y / gridSize) * gridSize;
    const endY = Math.ceil(rightBottom.y / gridSize) * gridSize;

    ctx.save();

    ctx.lineWidth = 1 / viewport.scale;
    ctx.strokeStyle = "rgba(17, 24, 39, 0.06)";
    ctx.beginPath();

    for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }

    for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }

    ctx.stroke();

    ctx.strokeStyle = "rgba(17, 24, 39, 0.04)";
    ctx.lineWidth = 2 / viewport.scale;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += gridSize * 4) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }

    for (let y = startY; y <= endY; y += gridSize * 4) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }

    ctx.stroke();

    ctx.restore();
}

function redraw() {
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    drawBackground();

    ctx.save();

    ctx.setTransform(
        deviceRatio * viewport.scale,
        0,
        0,
        deviceRatio * viewport.scale,
        deviceRatio * viewport.x,
        deviceRatio * viewport.y
    );

    drawCyberGrid();

    for (const stamp of stamps) {
        drawManjiStamp(
            stamp.x,
            stamp.y,
            stamp.size,
            stamp.lineWidth,
            stamp.style
        );
    }

    if (previewVisible && previewPoint) {
        drawManjiStamp(
            previewPoint.x,
            previewPoint.y,
            STAMP_SIZE,
            Number(lineWidthInput.value),
            createPreviewStyle(),
            0.72,
            true
        );
    }

    ctx.restore();
}

function updatePreview(event) {
    previewPoint = getWorldPoint(event);
    previewVisible = true;
    redraw();
}

function placeStampFromPreview() {
    if (!previewPoint) {
        return;
    }

    stamps.push({
        x: previewPoint.x,
        y: previewPoint.y,
        size: STAMP_SIZE,
        lineWidth: Number(lineWidthInput.value),
        style: createStampStyle()
    });

    redraw();
}

function zoomCanvasAt(screenX, screenY, nextScale) {
    const worldPoint = screenToWorld(screenX, screenY);

    viewport.scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    viewport.x = screenX - worldPoint.x * viewport.scale;
    viewport.y = screenY - worldPoint.y * viewport.scale;

    redraw();
}

function handleWheel(event) {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const zoomAmount = Math.exp(-event.deltaY * 0.0012);
    const nextScale = viewport.scale * zoomAmount;

    zoomCanvasAt(screenX, screenY, nextScale);

    previewPoint = screenToWorld(screenX, screenY);
    previewVisible = true;

    redraw();
}

function setPointer(event) {
    activePointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType
    });
}

function removePointer(event) {
    activePointers.delete(event.pointerId);
}

function getPinchInfo() {
    const points = Array.from(activePointers.values());

    if (points.length < 2) {
        return null;
    }

    const first = points[0];
    const second = points[1];

    const rect = canvas.getBoundingClientRect();

    const firstX = first.clientX - rect.left;
    const firstY = first.clientY - rect.top;
    const secondX = second.clientX - rect.left;
    const secondY = second.clientY - rect.top;

    const centerX = (firstX + secondX) / 2;
    const centerY = (firstY + secondY) / 2;

    const distance = Math.hypot(secondX - firstX, secondY - firstY);

    return {
        centerX,
        centerY,
        distance
    };
}

function startPinchZoom() {
    const pinchInfo = getPinchInfo();

    if (!pinchInfo) {
        return;
    }

    interactionMode = "pinch";
    stampPointerId = null;
    previewVisible = false;

    pinchStart = {
        distance: pinchInfo.distance,
        scale: viewport.scale,
        worldCenter: screenToWorld(pinchInfo.centerX, pinchInfo.centerY)
    };

    redraw();
}

function updatePinchZoom() {
    const pinchInfo = getPinchInfo();

    if (!pinchInfo || !pinchStart) {
        return;
    }

    const ratio = pinchInfo.distance / pinchStart.distance;
    const nextScale = clamp(pinchStart.scale * ratio, MIN_ZOOM, MAX_ZOOM);

    viewport.scale = nextScale;
    viewport.x = pinchInfo.centerX - pinchStart.worldCenter.x * nextScale;
    viewport.y = pinchInfo.centerY - pinchStart.worldCenter.y * nextScale;

    redraw();
}

lineWidthInput.addEventListener("input", () => {
    lineWidthValue.textContent = lineWidthInput.value;
    redraw();
});

colorModeSelect.addEventListener("change", () => {
    redraw();
});

clearButton.addEventListener("click", () => {
    stamps.length = 0;
    redraw();
});

canvas.addEventListener("wheel", handleWheel, {
    passive: false
});

canvas.addEventListener("pointerenter", (event) => {
    if (activePointers.size > 0) {
        return;
    }

    if (event.pointerType === "touch") {
        return;
    }

    updatePreview(event);
});

canvas.addEventListener("pointermove", (event) => {
    if (activePointers.has(event.pointerId)) {
        setPointer(event);

        if (interactionMode === "pinch") {
            updatePinchZoom();
            return;
        }

        if (
            interactionMode === "stamp" &&
            event.pointerId === stampPointerId
        ) {
            updatePreview(event);
            return;
        }

        return;
    }

    if (activePointers.size === 0 && event.pointerType !== "touch") {
        updatePreview(event);
    }
});

canvas.addEventListener("pointerleave", () => {
    if (activePointers.size > 0) {
        return;
    }

    previewVisible = false;
    redraw();
});

canvas.addEventListener("pointerdown", (event) => {
    if (event.target !== canvas) {
        return;
    }

    event.preventDefault();

    canvas.setPointerCapture(event.pointerId);
    setPointer(event);

    if (activePointers.size === 1) {
        interactionMode = "stamp";
        stampPointerId = event.pointerId;
        updatePreview(event);
        return;
    }

    if (activePointers.size === 2) {
        startPinchZoom();
    }
});

canvas.addEventListener("pointerup", (event) => {
    if (!activePointers.has(event.pointerId)) {
        return;
    }

    event.preventDefault();

    if (
        interactionMode === "stamp" &&
        event.pointerId === stampPointerId
    ) {
        updatePreview(event);
        placeStampFromPreview();
    }

    removePointer(event);

    if (interactionMode === "pinch" && activePointers.size < 2) {
        interactionMode = null;
        pinchStart = null;
        previewVisible = false;
        redraw();
        return;
    }

    if (activePointers.size === 0) {
        interactionMode = null;
        stampPointerId = null;
    }
});

canvas.addEventListener("pointercancel", (event) => {
    removePointer(event);

    if (activePointers.size === 0) {
        interactionMode = null;
        stampPointerId = null;
        pinchStart = null;
        previewVisible = false;
        redraw();
    }
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});

resizeCanvas();