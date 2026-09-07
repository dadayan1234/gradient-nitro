// Gradient Nitro — language-aware colors in a native rounded workspace.

export interface Theme {
  name: string;
  radius: number;
  palette: readonly string[];
}

const DEFAULT_RADIUS = 12;

export const theme: Theme = {
  name: "Gradient Nitro",
  radius: DEFAULT_RADIUS,
  palette: ["#8BD5FF", "#F49AC2", "#ADE580"],
};

export function describeTheme(theme: Theme): string {
  const { name, radius } = theme;
  return `${name} · ${radius}px corners`;
}

export async function loadPalette(): Promise<readonly string[]> {
  const enabled = true;
  if (!enabled) return [];
  return theme.palette;
}

console.log(describeTheme(theme));
