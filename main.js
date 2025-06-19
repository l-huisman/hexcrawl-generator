import { Overworld } from './overworld.js';
import { IslandMap } from './island.js';
import { UI } from './ui.js';
import { hexDistance } from './hex-utils.js';

// App state
let overworld;
let currentIslandMap = null;
let isIslandView = false;
let overworldState = null;
let currentIslandKey = null;

// Add pirate crew names and display them above their emoji
let pirateCrews = [];

// Helper to spawn pirate crews at least minDist away from player
function spawnPirateCrews(numCrews, minDist = 10) {
    pirateCrews = [];
    const { rows, cols } = overworld;
    const playerHex = overworld.currentHex;
    let attempts = 0;
    let maxAttempts = 2000;
    let used = new Set();
    // If the map is too small, reduce minDist so pirates can spawn
    let effectiveMinDist = Math.min(minDist, Math.floor((rows + cols) / 2) - 1);
    if (effectiveMinDist < 2) effectiveMinDist = 2;
    while (pirateCrews.length < numCrews && attempts < maxAttempts) {
        let row = Math.floor(Math.random() * rows);
        let col = Math.floor(Math.random() * cols);
        let key = `${row},${col}`;
        if (used.has(key)) {
            attempts++;
            continue;
        }
        used.add(key);
        // Must be water or land, not an island
        let hex = overworld.hexMap.grid[row][col];
        if (hex.terrain.name === 'Island') {
            attempts++;
            continue;
        }
        // Must be at least effectiveMinDist from player
        if (hexDistance(playerHex, { row, col }) < effectiveMinDist) {
            attempts++;
            continue;
        }
        // Must not overlap another pirate
        if (pirateCrews.some(c => c.row === row && c.col === col)) {
            attempts++;
            continue;
        }
        // Pick emoji and name
        let pirateList = [
            { emoji: "🏴‍☠️", name: "Blackbeard" },
            { emoji: "⛵", name: "Red Sails" },
            { emoji: "🚤", name: "Sea Serpent" },
            { emoji: "🦜", name: "Parrot Crew" },
            { emoji: "🦑", name: "Kraken's Eye" },
            { emoji: "⚓", name: "Iron Anchor" },
            { emoji: "🦈", name: "Sharktooth" },
            { emoji: "🛶", name: "Canoe Bandits" },
            { emoji: "🧜‍♂️", name: "Merman Mob" },
            { emoji: "🦀", name: "Crab Claws" }
        ];
        let pirate = pirateList[pirateCrews.length % pirateList.length];
        pirateCrews.push({ row, col, emoji: pirate.emoji, name: pirate.name });
        attempts++;
    }
}

// Start or restart the overworld
function startOverworld() {
    const { rows, cols } = UI.getGridParams();
    const size = 32; // Standard overworld hex size
    overworld = new Overworld(rows, cols, size);
    spawnPirateCrews(2, 10);
    const grid = overworld.hexMap && overworld.hexMap.grid ? overworld.hexMap.grid : overworld.hexMap;
    UI.drawHexGrid(grid, overworld.currentHex, overworld.revealed, rows, cols, size);
    UI.updateControls(false);
}

// Save/restore overworld state
function saveOverworldState() {
    overworldState = overworld.getState();
}
function restoreOverworldState() {
    if (!overworldState) return;
    overworld.setState(overworldState);
    const grid = overworld.hexMap && overworld.hexMap.grid ? overworld.hexMap.grid : overworld.hexMap;
    UI.drawHexGrid(
        grid,
        overworld.currentHex,
        overworld.revealed,
        overworld.rows,
        overworld.cols,
        overworld.size
    );
}

// Helper to move pirate crews randomly
function movePirateCrews(rows, cols) {
    for (let crew of pirateCrews) {
        // Get all valid neighbors (including staying in place)
        let neighbors = overworld.getNeighbors(crew.row, crew.col);
        neighbors.push({ row: crew.row, col: crew.col }); // allow staying in place
        let choice = neighbors[Math.floor(Math.random() * neighbors.length)];
        crew.row = choice.row;
        crew.col = choice.col;
    }
}

// Patch UI.drawHexGrid to draw pirate crews with names
const origDrawHexGrid = UI.drawHexGrid;
window.pirateCrews = pirateCrews; // Make pirates globally accessible for DM view drawing
UI.drawHexGrid = function (hexMap, currentHex, revealed, rows, cols, size, revealAll = false) {
    origDrawHexGrid.call(UI, hexMap, currentHex, revealed, rows, cols, size, revealAll);

    if (isIslandView) return;
    UI.updateControls(false);

    // --- Ensure the player ship is always rendered at the correct center of the hex ---
    if (currentHex && !isIslandView) {
        const canvas = document.getElementById('hex-canvas');
        const ctx = canvas.getContext('2d');
        const fillSize = size - 2.5;
        const w = 2 * size;
        const h = Math.sqrt(3) * size;
        const gridWidth = (cols - 1) * 1.5 * size + w;
        const gridHeight = h * rows;
        const xOffset = (canvas.width - gridWidth) / 2 + size;
        const yOffset = (canvas.height - gridHeight) / 2 + h / 2;
        // Use the same center calculation as in UI.drawHexGrid for the ship:
        const x = xOffset + currentHex.col * 1.5 * size;
        const y = yOffset + currentHex.row * h + (currentHex.col % 2) * (h / 2);

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

    // Compute visible set for this draw (only current and neighbors)
    let visible = new Set();
    if (currentHex) {
        visible.add(`${currentHex.row},${currentHex.col}`);
        let neighbors;
        if (overworld && typeof overworld.getNeighbors === "function") {
            neighbors = overworld.getNeighbors(currentHex.row, currentHex.col);
        } else if (typeof getNeighbors === "function") {
            neighbors = getNeighbors(currentHex.row, currentHex.col, rows, cols);
        } else {
            neighbors = [];
        }
        for (let n of neighbors) {
            visible.add(`${n.row},${n.col}`);
        }
    }

    // Draw pirate crews:
    // - In DM view (revealAll && !isIslandView): show all pirates
    // - In player view: only show if visible
    const canvas = document.getElementById('hex-canvas');
    const ctx = canvas.getContext('2d');
    const fillSize = size - 2;
    const w = 2 * size;
    const h = Math.sqrt(3) * size;
    const gridWidth = (cols - 1) * 1.5 * size + w;
    const gridHeight = h * rows;
    const xOffset = (canvas.width - gridWidth) / 2 + size;
    const yOffset = (canvas.height - gridHeight) / 2 + h / 2;

    for (let crew of pirateCrews) {
        if (crew.row === currentHex.row && crew.col === currentHex.col) continue;
        let key = `${crew.row},${crew.col}`;
        // In DM view (revealAll && !isIslandView), always draw
        if (revealAll && !((size <= 20 && rows > 5 && cols > 5))) {
            // DM view, always show pirates
        } else if (!revealAll && !visible.has(key)) {
            // Player view, only show if in vision
            continue;
        } else if (revealAll && (size <= 20 && rows > 5 && cols > 5)) {
            // Island view, never show pirates
            continue;
        }
        const x = xOffset + crew.col * 1.5 * size;
        const y = yOffset + crew.row * h + (crew.col % 2) * (h / 2);
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.font = `bold ${Math.floor(size * 0.7)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(crew.emoji, x, y);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.font = `${Math.floor(size * 0.32)}px sans-serif`;
        ctx.fillStyle = "#800";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(crew.name, x, y - size * 0.45);
        ctx.restore();
    }
};

// --- Event Handlers ---

document.getElementById('hex-canvas').addEventListener('click', function (e) {
    if (isIslandView) return;
    const { rows, cols, size } = UI.getGridParams();
    const canvas = this;
    const rect = canvas.getBoundingClientRect();
    const w = 2 * size;
    const h = Math.sqrt(3) * size;
    const gridWidth = (cols - 1) * 1.5 * size + w;
    const gridHeight = h * rows;
    const xOffset = (canvas.width - gridWidth) / 2 + size;
    const yOffset = (canvas.height - gridHeight) / 2 + h / 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const hx = xOffset + col * 1.5 * size;
            const hy = yOffset + row * h + (col % 2) * (h / 2);
            const dx = x - hx;
            const dy = y - hy;
            if (Math.abs(dx) < size && Math.abs(dy) < h / 2) {
                let key = row + ',' + col;
                let neighbors = overworld.getNeighbors(overworld.currentHex.row, overworld.currentHex.col).map(n => n.row + ',' + n.col);
                // Enter island view
                if (row === overworld.currentHex.row && col === overworld.currentHex.col && overworld.hexMap.grid[row][col].terrain.name === 'Island') {
                    saveOverworldState();
                    isIslandView = true;
                    currentIslandKey = key;
                    UI.updateControls(true);
                    document.getElementById('back-btn').style.display = '';
                    if (!IslandMap.islandMaps) IslandMap.islandMaps = {};
                    if (!IslandMap.islandMaps[key]) {
                        IslandMap.islandMaps[key] = IslandMap.generateIslandMapForKey(key);
                    }
                    currentIslandMap = JSON.parse(JSON.stringify(IslandMap.islandMaps[key]));
                    let islandRows = currentIslandMap.length;
                    let islandCols = currentIslandMap[0].length;
                    let islandSize = 24; // Standard island hex size
                    let islandRevealed = new Set();
                    let islandCurrentHex = { row: Math.floor(islandRows / 2), col: Math.floor(islandCols / 2) };
                    islandRevealed.add(islandCurrentHex.row + ',' + islandCurrentHex.col);

                    function redrawIsland(newSize) {
                        UI.drawHexGrid(currentIslandMap, islandCurrentHex, islandRevealed, islandRows, islandCols, newSize, true);
                        UI.drawLegend();
                    }
                    UI.drawHexGrid(currentIslandMap, islandCurrentHex, islandRevealed, islandRows, islandCols, islandSize, true);
                    UI.drawLegend();
                    showIslandSizeControls(islandRows, islandCols, islandSize, redrawIsland);
                    return;
                }
                // Move in overworld
                if (neighbors.includes(key)) {
                    overworld.moveTo(row, col);
                    movePirateCrews(rows, cols); // Move pirates when player moves
                    const grid = overworld.hexMap && overworld.hexMap.grid ? overworld.hexMap.grid : overworld.hexMap;
                    UI.drawHexGrid(grid, overworld.currentHex, overworld.revealed, rows, cols, size);
                }
                return;
            }
        }
    }
});

document.getElementById('back-btn').addEventListener('click', function () {
    isIslandView = false;
    currentIslandKey = null;
    UI.updateControls(false);
    document.getElementById('back-btn').style.display = 'none';
    hideIslandSizeControls();
    restoreOverworldState();
});

document.getElementById('generate-btn').addEventListener('click', function () {
    startOverworld();
});

document.getElementById('player-map-btn').addEventListener('click', function () {
    const { rows, cols } = UI.getGridParams();
    const size = 32;
    const grid = overworld.hexMap && overworld.hexMap.grid ? overworld.hexMap.grid : overworld.hexMap;
    UI.drawHexGrid(grid, overworld.currentHex, overworld.revealed, rows, cols, size, false);
    UI.updateControls(false);
});
document.getElementById('dm-map-btn').addEventListener('click', function () {
    const { rows, cols } = UI.getGridParams();
    const size = 32;
    const grid = overworld.hexMap && overworld.hexMap.grid ? overworld.hexMap.grid : overworld.hexMap;
    UI.drawHexGrid(grid, overworld.currentHex, overworld.revealed, rows, cols, size, true);
    UI.updateControls(false);
});

document.getElementById('force-generate-btn').addEventListener('click', function () {
    if (isIslandView && currentIslandKey) {
        const key = currentIslandKey;
        if (!IslandMap.islandMaps) IslandMap.islandMaps = {};
        const newIsland = IslandMap.generateIslandMapForKey(key);
        IslandMap.islandMaps[key] = newIsland;
        currentIslandMap = JSON.parse(JSON.stringify(newIsland));
        let rows = currentIslandMap.length;
        let cols = currentIslandMap[0].length;
        let size = 24; // Standard island hex size
        let islandRevealed = new Set();
        let islandCurrentHex = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
        islandRevealed.add(islandCurrentHex.row + ',' + islandCurrentHex.col);
        UI.drawHexGrid(currentIslandMap, islandCurrentHex, islandRevealed, rows, cols, size, true);
        UI.drawLegend();
    }
});

// Initial map
startOverworld();

// Add controls for island view sizing
function showIslandSizeControls(islandRows, islandCols, islandSize, redrawIsland) {
    let controls = document.getElementById('island-size-controls');
    if (!controls) {
        controls = document.createElement('div');
        controls.id = 'island-size-controls';
        controls.style.textAlign = 'center';
        controls.style.margin = '10px 0';
        // Insert after #controls if present, else before #hex-legend
        let controlsParent = document.querySelector('.container');
        let after = document.getElementById('controls');
        if (after && after.nextSibling) {
            controlsParent.insertBefore(controls, after.nextSibling);
        } else {
            controlsParent.insertBefore(controls, document.getElementById('hex-legend'));
        }
    }
    controls.innerHTML = `
        <label>Island Hex Size: <input id="island-size-input" type="number" min="6" max="40" value="${islandSize}" style="width:3em;"></label>
        <button id="island-size-apply-btn">Apply</button>
    `;
    document.getElementById('island-size-apply-btn').onclick = function () {
        let newSize = parseInt(document.getElementById('island-size-input').value, 10);
        if (isNaN(newSize) || newSize < 6 || newSize > 40) return;
        redrawIsland(newSize);
    };
    controls.style.display = '';
}
function hideIslandSizeControls() {
    let controls = document.getElementById('island-size-controls');
    if (controls) controls.style.display = 'none';
}

// --- Overworld to Island view ---
document.getElementById('hex-canvas').addEventListener('click', function (e) {
    if (isIslandView) return;
    const { rows, cols, size } = UI.getGridParams();
    const canvas = this;
    const rect = canvas.getBoundingClientRect();
    const w = 2 * size;
    const h = Math.sqrt(3) * size;
    const gridWidth = (cols - 1) * 1.5 * size + w;
    const gridHeight = h * rows;
    const xOffset = (canvas.width - gridWidth) / 2 + size;
    const yOffset = (canvas.height - gridHeight) / 2 + h / 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const hx = xOffset + col * 1.5 * size;
            const hy = yOffset + row * h + (col % 2) * (h / 2);
            const dx = x - hx;
            const dy = y - hy;
            if (Math.abs(dx) < size && Math.abs(dy) < h / 2) {
                let key = row + ',' + col;
                let neighbors = overworld.getNeighbors(overworld.currentHex.row, overworld.currentHex.col).map(n => n.row + ',' + n.col);
                // Enter island view
                if (row === overworld.currentHex.row && col === overworld.currentHex.col && overworld.hexMap.grid[row][col].terrain.name === 'Island') {
                    saveOverworldState();
                    isIslandView = true;
                    currentIslandKey = key;
                    UI.updateControls(true);
                    document.getElementById('back-btn').style.display = '';
                    if (!IslandMap.islandMaps) IslandMap.islandMaps = {};
                    if (!IslandMap.islandMaps[key]) {
                        IslandMap.islandMaps[key] = IslandMap.generateIslandMapForKey(key);
                    }
                    currentIslandMap = JSON.parse(JSON.stringify(IslandMap.islandMaps[key]));
                    let islandRows = currentIslandMap.length;
                    let islandCols = currentIslandMap[0].length;
                    let islandSize = 24; // Standard island hex size
                    let islandRevealed = new Set();
                    let islandCurrentHex = { row: Math.floor(islandRows / 2), col: Math.floor(islandCols / 2) };
                    islandRevealed.add(islandCurrentHex.row + ',' + islandCurrentHex.col);

                    function redrawIsland(newSize) {
                        UI.drawHexGrid(currentIslandMap, islandCurrentHex, islandRevealed, islandRows, islandCols, newSize, true);
                        UI.drawLegend();
                    }
                    UI.drawHexGrid(currentIslandMap, islandCurrentHex, islandRevealed, islandRows, islandCols, islandSize, true);
                    UI.drawLegend();
                    showIslandSizeControls(islandRows, islandCols, islandSize, redrawIsland);
                    return;
                }
                // Move in overworld
                if (neighbors.includes(key)) {
                    overworld.moveTo(row, col);
                    movePirateCrews(rows, cols); // Move pirates when player moves
                    const grid = overworld.hexMap && overworld.hexMap.grid ? overworld.hexMap.grid : overworld.hexMap;
                    UI.drawHexGrid(grid, overworld.currentHex, overworld.revealed, rows, cols, size);
                }
                return;
            }
        }
    }
});

document.getElementById('back-btn').addEventListener('click', function () {
    isIslandView = false;
    currentIslandKey = null;
    UI.updateControls(false);
    document.getElementById('back-btn').style.display = 'none';
    hideIslandSizeControls();
    restoreOverworldState();
});

// Initial map
startOverworld();
