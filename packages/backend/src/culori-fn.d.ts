declare module "culori/fn" {
  interface Color {
    mode: string;
    [channel: string]: number | string | undefined;
  }

  interface OklchColor extends Color {
    mode: "oklch";
    l: number;
    c: number;
    h?: number;
  }

  interface ModeDefinition {
    mode: string;
  }

  export function useMode(mode: ModeDefinition): void;
  export const modeOklch: ModeDefinition;
  export function converter(
    targetMode: string,
  ): (color: Color) => OklchColor | undefined;
}
