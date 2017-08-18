function rgba(red: number, green: number, blue: number, alpha: number) {
  return "rgba(" + Math.round(red * 255) + "," + Math.round(green * 255) +
      "," + Math.round(blue * 255) + "," + alpha + ")";
}

export function flameColor(fraction: number, brightness = 1, opacity = 1) {
  if (isNaN(fraction)) return rgba(brightness, brightness, brightness, opacity);
  fraction = Math.sqrt(fraction);  // Or everything is depressing and red.
  return (fraction < 0.5) ?
    rgba(brightness, 2 * fraction * brightness, 0, opacity) :
    rgba(2 * (1 - fraction) * brightness, brightness, 0, opacity);
}

export function utilization(item) {
  if (!item || !item.metrics) return 0/0;
  return item.metrics.flops / item.metrics.time;
}

export function percent(fraction: number) {
  return fraction >= 0.995 ? "100%" : fraction < 0.00001 ? "0.00%" :
    (fraction * 100).toPrecision(2) + "%";
}
