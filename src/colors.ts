export function blend(hex: string, base: string, ratio: number): string {
    return '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * ratio + parseInt(base.slice(i, i + 2), 16) * (1 - ratio)).toString(16).padStart(2, '0')).join('');
}
export function luminance(hex: string): number {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
export function contrast(a: string, b: string): number {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readable(color: string, background: string, minimum = 4.5): string {
    if (contrast(color, background) >= minimum) return color;
    const target = contrast('#000000', background) > contrast('#ffffff', background) ? '#000000' : '#ffffff';
    for (let i = 1; i <= 100; i++) {
        const result = blend(target, color, i / 100);
        if (contrast(result, background) >= minimum) return result;
    }
    return target;
}
export function onColor(background: string): string {
    return contrast('#000000', background) > contrast('#ffffff', background) ? '#000000' : '#ffffff';
}
