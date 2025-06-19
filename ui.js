import { drawHex, getNeighbors, hexDistance } from './hex-utils.js';

export class UI {
    static resizeCanvas(rows, cols, size) {
        const canvas = document.getElementById('hex-canvas');
        const w = (cols - 1) * 1.5 * size + 2 * size + 20;
        const h = Math.sqrt(3) * size * rows + Math.sqrt(3) * size + 20;
        canvas.width = Math.ceil(w);
        canvas.height = Math.ceil(h);
    }

    static drawHexGrid(hexMap, currentHex, revealed, rows, cols, size, revealAll = false) {
        this.resizeCanvas(rows, cols, size);
        const canvas = document.getElementById('hex-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const fillSize = size - 2.5;
        const w = 2 * size;
        const h = Math.sqrt(3) * size;
        const gridWidth = (cols - 1) * 1.5 * size + w;
        const gridHeight = h * rows;
        const xOffset = (canvas.width - gridWidth) / 2 + size;
        const yOffset = (canvas.height - gridHeight) / 2 + h / 2;
        let visible = new Set();
        if (!revealAll && currentHex) {
            visible.add(`${currentHex.row},${currentHex.col}`);
            for (let n of getNeighbors(currentHex.row, currentHex.col, rows, cols)) {
                visible.add(`${n.row},${n.col}`);
            }
        }
        const isIslandView = revealAll && size === 24;
        const now = performance.now();
        const shimmerPhase = (now / 3200) % (2 * Math.PI);

        // --- Assign ocean depth using BFS from land (islands) ---
        // 0 = land, 1 = shallow, 2-3 = sea, 4+ = deep (no abyss)
        let depthMap = Array.from({ length: rows }, () => Array(cols).fill(-1));
        let queue = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const hex = Array.isArray(hexMap) ? hexMap[row][col] : hexMap.grid[row][col];
                if (hex.terrain.name !== 'Water') {
                    depthMap[row][col] = 0;
                    queue.push({ row, col });
                }
            }
        }
        // BFS to assign depth
        while (queue.length) {
            let { row, col } = queue.shift();
            let d = depthMap[row][col];
            if (d >= 4) continue;
            for (let n of getNeighbors(row, col, rows, cols)) {
                if (depthMap[n.row][n.col] === -1) {
                    depthMap[n.row][n.col] = d + 1;
                    queue.push({ row: n.row, col: n.col });
                }
            }
        }
        // If there are water hexes with depth -1 (no land/island nearby), assign them max depth (deep)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (depthMap[row][col] === -1) {
                    depthMap[row][col] = 4;
                }
            }
        }

        // Define colors for each depth (no abyss, just deep as last)
        const depthColors = [
            null, // 0 = land, not used
            "#4fa3c7", // 1 = shallow
            "#2976b8", // 2 = sea
            "#2976b8", // 3 = sea
            "#18406a"  // 4+ = deep (no abyss)
        ];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = xOffset + col * 1.5 * size;
                const y = yOffset + row * h + (col % 2) * (h / 2);
                const hex = Array.isArray(hexMap) ? hexMap[row][col] : hexMap.grid[row][col];
                let key = `${row},${col}`;
                let isCurrent = (row === currentHex.row && col === currentHex.col);
                let isVisible = revealAll ? true : visible.has(key);
                let isRevealed = revealAll ? true : revealed.has(key);
                let fill = hex.terrain.color;

                // --- Visual: subtle drop shadow for all hexes ---
                ctx.save();
                ctx.shadowColor = "#bbb";
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                // Fog of war: unrevealed hexes are filled with a fog color
                if (!isVisible && !isRevealed) {
                    ctx.globalAlpha = 1;
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#555';
                    drawHex(ctx, x, y, fillSize, "#bfc4c9");
                    ctx.restore();
                    continue;
                }

                // --- Water hexes: assign color by BFS depth ---
                if (hex.terrain.name === 'Water') {
                    let depth = depthMap[row][col];
                    let base = depthColors[Math.min(Math.max(depth, 1), 4)];
                    // Slightly less darkening for vibrancy
                    let r = Math.floor(parseInt(base.slice(1, 3), 16) * 0.85);
                    let g = Math.floor(parseInt(base.slice(3, 5), 16) * 0.88);
                    let b = Math.floor(parseInt(base.slice(5, 7), 16) * 0.92);
                    // Remove shimmer/wave effect: just use the static color
                    let waterColor = `rgb(${r},${g},${b})`;
                    ctx.globalAlpha = isVisible ? 1 : 0.4;
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#3a4a5a';
                    drawHex(ctx, x, y, fillSize, waterColor);

                    // Remove white highlight shimmer as well
                    ctx.restore();
                    continue;
                }

                // Draw the hex fill (non-water)
                ctx.globalAlpha = isVisible ? 1 : 0.4;
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#555';
                drawHex(ctx, x, y, fillSize, fill);
                ctx.restore();

                // --- Visual: highlight islands with a gold border and a faint glow ---
                if (hex.terrain && hex.terrain.name === 'Island') {
                    ctx.save();
                    ctx.shadowColor = "#ffd700";
                    ctx.shadowBlur = 12;
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath();
                    for (let i = 0; i <= 6; i++) {
                        const angle = Math.PI / 3 * i;
                        const px = x + fillSize * Math.cos(angle);
                        const py = y + fillSize * Math.sin(angle);
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.strokeStyle = "#ffd700";
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.restore();
                }

                // --- Visual: terrain name always visible in DM view, faded in player view ---
                if ((revealAll && !isIslandView) || (isCurrent && (!revealAll || (revealAll && !isIslandView)))) {
                    ctx.save();
                    ctx.globalAlpha = revealAll ? 0.7 : 0.95;
                    ctx.font = `${Math.floor(size * 0.32)}px sans-serif`;
                    ctx.fillStyle = "#444";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    ctx.fillText(hex.terrain.name, x, y - size * 0.45);
                    ctx.restore();
                }

                // --- Visual: coordinates always visible in DM view, faded in player view ---
                if ((revealAll && !isIslandView) || (isCurrent && (!revealAll || (revealAll && !isIslandView)))) {
                    ctx.save();
                    ctx.globalAlpha = revealAll ? 0.5 : 0.85;
                    ctx.font = `${Math.floor(size * 0.32)}px sans-serif`;
                    ctx.fillStyle = "#333";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(`(${row},${col})`, x, y + size * 0.45);
                    ctx.restore();
                }

                // Draw a "ship" text for the current hex
                if (isCurrent && (!revealAll || (revealAll && !isIslandView))) {
                    ctx.save();
                    ctx.globalAlpha = 1;
                    ctx.font = `bold ${Math.floor(size * 0.7)}px sans-serif`;
                    ctx.fillStyle = "#222";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.shadowColor = "#fff";
                    ctx.shadowBlur = 8;
                    ctx.fillText("🚢", x, y);
                    ctx.restore();
                }
            }
        }

        // --- Animate: request next frame if any water hexes are present ---
        if (hexMap && canvas) {
            if (hexMap.some
                ? hexMap.some(row => row.some(hex => hex.terrain && hex.terrain.name === 'Water'))
                : hexMap.grid.some(row => row.some(hex => hex.terrain && hex.terrain.name === 'Water'))
            ) {
                window.requestAnimationFrame(() => {
                    // Redraw with the same parameters to animate water
                    UI.drawHexGrid(hexMap, currentHex, revealed, rows, cols, size, revealAll);
                });
            }
        }
    }

    static drawLegend() {
        let legend = document.getElementById('hex-legend');
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'hex-legend';
            legend.style.textAlign = 'center';
            legend.style.margin = '10px 0 0 0';
            document.querySelector('.container').appendChild(legend);
        }
        legend.innerHTML = `
            <span style="display:inline-block;width:18px;height:18px;background:#f7e9a0;border:1px solid #555;margin-right:4px;"></span> Sand
            <span style="display:inline-block;width:18px;height:18px;background:#7bb661;border:1px solid #555;margin:0 4px 0 16px;"></span> Forest
            <span style="display:inline-block;width:18px;height:18px;background:#e2e2a0;border:1px solid #555;margin:0 4px 0 16px;"></span> Grassland
            <span style="display:inline-block;width:18px;height:18px;background:#b0b0b0;border:1px solid #555;margin:0 4px 0 16px;"></span> Mountain
            <span style="display:inline-block;width:18px;height:18px;background:#d94f2a;border:1px solid #555;margin:0 4px 0 16px;"></span> Volcano
            <span style="display:inline-block;width:18px;height:18px;background:#bfa76f;border:1px solid #555;margin:0 4px 0 16px;"></span> Outpost
            <span style="display:inline-block;width:18px;height:18px;background:#6b3fa0;border:1px solid #555;margin:0 4px 0 16px;"></span> Dungeon
            <span style="display:inline-block;width:18px;height:18px;background:#7ec8e3;border:1px solid #555;margin:0 4px 0 16px;"></span> Water
        `;
    }

    static getGridParams() {
        // Helper for main.js
        const rows = parseInt(document.getElementById('rows-input').value, 10);
        const cols = parseInt(document.getElementById('cols-input').value, 10);
        const size = parseInt(document.getElementById('size-input').value, 10);
        return { rows, cols, size };
    }

    static updateControls(inIsland) {
        document.getElementById('back-btn').style.display = inIsland ? '' : 'none';
        document.getElementById('player-map-btn').style.display = inIsland ? 'none' : '';
        document.getElementById('dm-map-btn').style.display = inIsland ? 'none' : '';
        document.getElementById('generate-btn').style.display = inIsland ? 'none' : '';
        document.getElementById('rows-input').style.display = inIsland ? 'none' : '';
        document.getElementById('cols-input').style.display = inIsland ? 'none' : '';
        document.getElementById('size-input').style.display = inIsland ? 'none' : '';
        document.getElementById('force-generate-btn').style.display = inIsland ? '' : 'none';
    }
}