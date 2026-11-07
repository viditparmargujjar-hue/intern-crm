declare const __BUILD_TIME__: string;
declare const __BUILD_ID__: string;

/** Build stamp injected at build time; publishing creates a new build. */
export const BUILD_TIME: string = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";
export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
