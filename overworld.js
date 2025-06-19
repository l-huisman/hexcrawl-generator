import { Terrain, Hex, HexMap, MapState } from './models.js';
import { hexDistance, getNeighbors } from './hex-utils.js';

export class Overworld {
    /**
     * @param {number} rows
     * @param {number} cols
     * @param {number} [size]
     */
    constructor(rows, cols, size) {
        this.hexMap = new HexMap(rows, cols);
        this.rows = rows;
        this.cols = cols;
        this.size = size || 36;
        this.currentHex = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
        this.visited = new Set();
        this.revealed = new Set();
        this.generateIslands();
    }

    generateIslands() {
        // Reduce the number of islands for a sparser map
        let islandCount = Math.max(1, Math.floor((this.rows * this.cols) / 28));
        let placed = [];
        let attempts = 0;
        while (placed.length < islandCount && attempts < 4000) {
            let row = Math.floor(Math.random() * this.rows);
            let col = Math.floor(Math.random() * this.cols);
            let minDist = Math.random() < 0.4 ? 3 : 8;
            let tooClose = placed.some(p => hexDistance(p, { row, col }) < minDist);
            let adjacent = placed.some(p => hexDistance(p, { row, col }) === 1);
            if (!tooClose && !adjacent) {
                this.hexMap.grid[row][col].terrain = new Terrain('Island', '#e2e2a0');
                placed.push({ row, col });
            }
            attempts++;
            if (attempts > 2000 && placed.length < islandCount) break;
        }
        let playerIsland = placed[Math.floor(Math.random() * placed.length)];
        this.currentHex = { row: playerIsland.row, col: playerIsland.col };
        this.visited = new Set();
        this.revealed = new Set();
        this.visited.add(`${this.currentHex.row},${this.currentHex.col}`);
        this.revealRing(this.currentHex.row, this.currentHex.col);
    }

    revealRing(row, col) {
        this.revealed.add(`${row},${col}`);
        for (let n of getNeighbors(row, col, this.rows, this.cols)) {
            this.revealed.add(`${n.row},${n.col}`);
        }
    }

    moveTo(row, col) {
        this.currentHex = { row, col };
        this.visited.add(`${row},${col}`);
        this.revealRing(row, col);
    }

    getNeighbors(row, col) {
        // Fix: add this method so main.js can call it!
        return getNeighbors(row, col, this.rows, this.cols);
    }

    getState() {
        return new MapState(this.hexMap, this.currentHex, new Set(this.visited), new Set(this.revealed));
    }

    setState(state) {
        this.hexMap = state.hexMap;
        this.currentHex = state.currentHex;
        this.visited = new Set(state.visited);
        this.revealed = new Set(state.revealed);
    }
}
