export const randomDelayMs = (min = 120, max = 1200): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomScrollSpeed = (base = 1): number => {
  const modifier = Math.random() * 0.8 + 0.6;
  return Number((base * modifier).toFixed(2));
};

export const randomDwellTimeMs = (): number => randomDelayMs(600, 8000);
