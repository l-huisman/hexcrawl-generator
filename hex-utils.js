export function hexDistance(a, b) {
    function toCube(row, col) {
        let x = col - (row - (row & 1)) / 2;
        let z = row;
        let y = -x - z;
        return { x, y, z };
    }
    const ac = toCube(a.row, a.col);
    const bc = toCube(b.row, b.col);
    return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

export function getNeighbors(row, col, rows, cols) {
    const even = col % 2 === 0;
    const directions = even
        ? [[-1, 0], [-1, 1], [0, 1], [1, 0], [0, -1], [-1, -1]]
        : [[-1, 0], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
    let neighbors = [];
    for (let [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
            neighbors.push({ row: r, col: c });
        }
    }
    return neighbors;
}

export function drawHex(ctx, x, y, size, fillColor) {
    // Standard upright hex (no isometric squash)
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
        const angle = Math.PI / 3 * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = ctx.strokeStyle || '#555';
    ctx.lineWidth = ctx.lineWidth || 2;
    ctx.stroke();
    ctx.restore();
}
