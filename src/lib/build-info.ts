declare const __BUILD_TIME__: string;
declare const __BUILD_ID__: string;

/** Immutable stamp for the code being served, not the time publication finished. */
export const BUILD_TIME: string = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";
export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
