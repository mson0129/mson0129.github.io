// BGI Slide advances four pixels on the dominant axis and waits 30 ms per step.
export function slideFrame(from, to, elapsed) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const steps = Math.max(0, Math.trunc(distance / 4 - 1));
    const frame = Math.floor(elapsed / 30);
    if (frame >= steps) return {x: to[0], y: to[1], done: true};
    const xStep = Math.fround(dx * 4 / distance);
    const yStep = Math.fround(dy * 4 / distance);
    return {x: Math.trunc(from[0] + frame*xStep), y: Math.trunc(from[1] + frame*yStep), done: false};
}
export function notation(square) {
    return String(square % 9) + String((Math.floor(square/9)+1)%10);
}
export function kibo(record, army, selected, cursor, turn) {
    let number = record.length + 1;
    if (turn === army) {
        const from = selected >= 0 ? selected : cursor;
        return {number, from, to: cursor, selecting: selected >= 0, current:true};
    }
    for (let i = record.length-1; i >= 0; i--) {
        if (i%2 === army/8) return {number:i+1, from:record[i][0], to:record[i][1], selecting:false,current:false};
    }
    return null;
}
