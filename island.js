import { Terrain, Hex } from './models.js';
import { hexDistance } from './hex-utils.js';

export class IslandMap {
    // Store all generated islands by key
    static islandMaps = {};

    // Generate and return a 2D array of Hex objects for the island
    static generateIslandMapForKey(key) {
        // --- This is a direct port of your previous generateIslandMapForKey logic ---
        let size = 13;
        let gridType = Math.random();
        let rows, cols, edgeBase;
        if (gridType < 0.1) {
            rows = cols = 13;
            edgeBase = 4.5 + Math.random();
        } else if (gridType > 0.9) {
            rows = cols = 25;
            edgeBase = 9 + Math.random() * 1.5;
        } else {
            rows = cols = 19;
            edgeBase = 6.5 + Math.random() * 1.5;
        }
        const center = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
        let mainIsland;
        let attempts = 0;
        do {
            let mask = Array.from({ length: rows }, () => Array(cols).fill(0));
            mask[center.row][center.col] = 1;
            for (let i = 0; i < 30; i++) {
                let angle = Math.random() * 2 * Math.PI;
                let r = center.row + Math.round(Math.sin(angle) * (3 + Math.random() * (rows / 3)));
                let c = center.col + Math.round(Math.cos(angle) * (3 + Math.random() * (cols / 3)));
                if (r > 1 && r < rows - 2 && c > 1 && c < cols - 2) mask[r][c] = 1;
            }
            for (let step = 0; step < 7; step++) {
                let newMask = mask.map(arr => arr.slice());
                for (let row = 1; row < rows - 1; row++) {
                    for (let col = 1; col < cols - 1; col++) {
                        let count = 0;
                        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                            if (mask[row + dr][col + dc]) count++;
                        }
                        if (mask[row][col]) {
                            if (count < 2) newMask[row][col] = 0;
                        } else {
                            if (count > 2) newMask[row][col] = 1;
                        }
                    }
                }
                mask = newMask;
            }
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (!mask[row][col]) continue;
                    let dx = col - center.col;
                    let dy = row - center.row;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    let angle = Math.atan2(dy, dx);
                    let edge = edgeBase + Math.sin(angle * 2 + Math.random() * 2) * 2.5 + Math.cos(angle * 3 + Math.random()) * 2.5;
                    if (dist > edge) mask[row][col] = 0;
                }
            }
            let visited = Array.from({ length: rows }, () => Array(cols).fill(false));
            let queue = [[center.row, center.col]];
            mainIsland = Array.from({ length: rows }, () => Array(cols).fill(0));
            while (queue.length) {
                let [r, c] = queue.pop();
                if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
                if (visited[r][c] || !mask[r][c]) continue;
                visited[r][c] = true;
                mainIsland[r][c] = 1;
                for (let [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
                    queue.push([r + dr, c + dc]);
                }
            }
            attempts++;
        } while (!mainIsland[center.row][center.col] && attempts < 10);

        let volcanoCount = 0;
        let maxVolcano = Math.random() < 0.5 ? 0 : (Math.random() < 0.7 ? 1 : 2);
        let volcanoLocations = [];
        let forestMask = Array.from({ length: rows }, () => Array(cols).fill(false));
        let forestCenters = [];
        let forestClusterCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < forestClusterCount; i++) {
            let tries = 0;
            while (tries < 20) {
                let r = center.row + Math.floor(Math.random() * Math.floor(rows / 2)) - Math.floor(rows / 4);
                let c = center.col + Math.floor(Math.random() * Math.floor(cols / 2)) - Math.floor(cols / 4);
                if (r > 2 && r < rows - 3 && c > 2 && c < cols - 3 && mainIsland[r][c]) {
                    forestCenters.push({ r, c });
                    break;
                }
                tries++;
            }
        }
        for (let fc of forestCenters) {
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    let rr = fc.r + dr, cc = fc.c + dc;
                    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && mainIsland[rr][cc]) {
                        let dist = Math.abs(dr) + Math.abs(dc);
                        if (dist <= 2 && Math.random() < 0.7 - 0.15 * dist) {
                            forestMask[rr][cc] = true;
                        }
                    }
                }
            }
        }
        let volcanoMask = Array.from({ length: rows }, () => Array(cols).fill(false));
        let mountainMask = Array.from({ length: rows }, () => Array(cols).fill(false));
        for (let row = 1; row < rows - 1; row++) {
            for (let col = 1; col < cols - 1; col++) {
                let dist = hexDistance(center, { row, col });
                if (mainIsland[row][col] && volcanoCount < maxVolcano && dist <= 2 && Math.random() < 0.18) {
                    let canPlace = true;
                    let hexDirs = [[-1, 0], [0, 1], [1, 1], [1, 0], [0, -1], [-1, -1]];
                    for (let [dr, dc] of hexDirs) {
                        let rr = row + dr, cc = col + dc;
                        if (!mainIsland[rr][cc] || volcanoMask[rr][cc]) {
                            canPlace = false;
                            break;
                        }
                    }
                    if (canPlace) {
                        volcanoMask[row][col] = true;
                        volcanoLocations.push({ row, col });
                        volcanoCount++;
                        for (let [dr, dc] of hexDirs) {
                            let rr = row + dr, cc = col + dc;
                            if (mainIsland[rr][cc] && !volcanoMask[rr][cc]) {
                                mountainMask[rr][cc] = true;
                            }
                        }
                    }
                }
            }
        }
        let outpostCandidates = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (!mainIsland[row][col]) continue;
                let waterNeighbors = 0;
                let landNeighbors = 0;
                for (let [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
                    let rr = row + dr, cc = col + dc;
                    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                        if (!mainIsland[rr][cc]) waterNeighbors++;
                        else landNeighbors++;
                    }
                }
                let tooCloseToVolcano = volcanoLocations.some(v => hexDistance({ row, col }, v) < 2);
                if (waterNeighbors >= 2 && landNeighbors >= 3 && !tooCloseToVolcano) outpostCandidates.push({ row, col });
            }
        }
        let outpostLoc = null;
        if (outpostCandidates.length && Math.random() < 0.7) {
            outpostLoc = outpostCandidates[Math.floor(Math.random() * outpostCandidates.length)];
        }
        let mountainRanges = [];
        let numRanges = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numRanges; i++) {
            let tries = 0;
            let start = null;
            while (tries < 30) {
                let r = Math.floor(Math.random() * rows);
                let c = Math.floor(Math.random() * cols);
                if (mainIsland[r][c] && !mountainMask[r][c]) {
                    start = { r, c };
                    break;
                }
                tries++;
            }
            if (!start) continue;
            let length = 3 + Math.floor(Math.random() * 4);
            let dir = Math.floor(Math.random() * 6);
            let r = start.r, c = start.c;
            for (let j = 0; j < length; j++) {
                if (r < 0 || r >= rows || c < 0 || c >= cols) break;
                if (!mainIsland[r][c]) break;
                mountainMask[r][c] = true;
                let dirs = [[-1, 0], [0, 1], [1, 1], [1, 0], [0, -1], [-1, -1]];
                let d = (dir + Math.floor(Math.random() * 3) - 1 + 6) % 6;
                r += dirs[d][0];
                c += dirs[d][1];
            }
        }
        let dungeonLoc = null;
        if (Math.random() < 0.05) {
            let candidates = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (mainIsland[row][col] && !volcanoMask[row][col]) {
                        candidates.push({ row, col });
                    }
                }
            }
            if (candidates.length) {
                dungeonLoc = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }
        // Terrain assignment
        function randomIslandTerrain(type) {
            if (type === 'center') return new Terrain('Mountain', '#b0b0b0');
            if (type === 'volcano') return new Terrain('Volcano', '#d94f2a');
            if (type === 'town') return new Terrain('Outpost', '#bfa76f');
            if (type === 'beach') return new Terrain('Sand', '#f7e9a0');
            if (type === 'forest') return new Terrain('Forest', '#388e3c');
            if (type === 'mountain') return new Terrain('Mountain', '#b0b0b0');
            if (type === 'dungeon') return new Terrain('Dungeon', '#6b3fa0');
            return new Terrain('Grassland', '#b6e36b');
        }
        let map = [];
        for (let row = 0; row < rows; row++) {
            let rowArr = [];
            for (let col = 0; col < cols; col++) {
                let dist = hexDistance(center, { row, col });
                let t;
                if (!mainIsland[row][col]) {
                    t = new Terrain('Water', '#7ec8e3');
                } else if (dungeonLoc && row === dungeonLoc.row && col === dungeonLoc.col) {
                    t = randomIslandTerrain('dungeon');
                } else if (outpostLoc && row === outpostLoc.row && col === outpostLoc.col) {
                    t = randomIslandTerrain('town');
                } else if (volcanoMask[row][col]) {
                    t = randomIslandTerrain('volcano');
                } else if (mountainMask[row][col]) {
                    t = randomIslandTerrain('mountain');
                } else if (dist <= 2 && Math.random() < 0.25) {
                    t = randomIslandTerrain('mountain');
                } else if (forestMask[row][col]) {
                    t = randomIslandTerrain('forest');
                } else if (dist >= Math.floor(rows / 4) && dist <= Math.floor(rows / 2.7)) {
                    t = randomIslandTerrain('beach');
                } else if (dist <= Math.floor(rows / 3)) {
                    t = randomIslandTerrain('grass');
                } else {
                    t = randomIslandTerrain('beach');
                }
                rowArr.push(new Hex(row, col, t));
            }
            map.push(rowArr);
        }
        return map;
    }
}
