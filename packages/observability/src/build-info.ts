export interface BuildInfo {
  service: string;
  gitSha: string;
  buildTime: string;
  nodeEnv: string;
}

/** Runtime build identity from env (set at Docker build / compose). */
export function getBuildInfo(serviceFallback = "unknown"): BuildInfo {
  return {
    service: process.env.APP_SERVICE_NAME?.trim() || serviceFallback,
    gitSha: process.env.APP_GIT_SHA?.trim() || "unknown",
    buildTime: process.env.APP_BUILD_TIME?.trim() || "unknown",
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
  };
}
