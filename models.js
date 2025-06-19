export class Terrain {
    /**
     * @param {string} name
     * @param {string} color
     */
    constructor(name, color) {
        this.name = name;
        this.color = color;
    }
}

export class Hex {
    /**
     * @param {number} row
     * @param {number} col
     * @param {Terrain} terrain
     */
    constructor(row, col, terrain) {
        this.row = row;
        this.col = col;
        this.terrain = terrain;
    }
}

export class HexMap {
    /**
     * @param {number} rows
     * @param {number} cols
     */
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        /** @type {Hex[][]} */
        this.grid = Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) =>
                new Hex(row, col, new Terrain('Water', '#7ec8e3'))
            )
        );
    }
}

export class MapState {
    /**
     * @param {HexMap} hexMap
     * @param {{row:number, col:number}} currentHex
     * @param {Set<string>} visited
     * @param {Set<string>} revealed
     */
    constructor(hexMap, currentHex, visited, revealed) {
        this.hexMap = hexMap;
        this.currentHex = currentHex;
        this.visited = visited;
        this.revealed = revealed;
    }
}
