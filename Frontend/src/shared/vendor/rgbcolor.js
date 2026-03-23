const FALLBACK = { r: 0, g: 0, b: 0, a: 1 };

function clampChannel(value) {
  return Math.max(0, Math.min(255, Number(value) || 0));
}

function clampAlpha(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

function hexToChannels(hex) {
  const normalized = hex.replace("#", "");

  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
      a: 1,
    };
  }

  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
      a: 1,
    };
  }

  return FALLBACK;
}

function parseColor(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return FALLBACK;

  if (input.startsWith("#")) {
    return hexToChannels(input);
  }

  const rgbMatch = input.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => part.trim());
    return {
      r: clampChannel(parts[0]),
      g: clampChannel(parts[1]),
      b: clampChannel(parts[2]),
      a: parts[3] == null ? 1 : clampAlpha(parts[3]),
    };
  }

  return FALLBACK;
}

export default class RGBColor {
  constructor(value) {
    const parsed = parseColor(value);
    this.ok = true;
    this.r = parsed.r;
    this.g = parsed.g;
    this.b = parsed.b;
    this.a = parsed.a;
  }

  toHex() {
    return `#${[this.r, this.g, this.b]
      .map((value) => clampChannel(value).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  toRGB() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  toRGBA() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}
