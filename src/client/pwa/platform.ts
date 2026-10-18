export type InstallEnv = {
  userAgent: string;
  maxTouchPoints: number;
  /** True when already launched from the home screen. */
  standalone: boolean;
};

/** iPhone and iPad Safari: the only browsers where "Add to Home Screen" is a manual step. */
export function isIosSafari({ userAgent, maxTouchPoints }: InstallEnv): boolean {
  // iPadOS 13+ reports itself as a Mac, so a touch screen tells them apart.
  const ios =
    /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return ios && !otherBrowser && /Safari/.test(userAgent);
}

export function shouldShowIosHint(env: InstallEnv): boolean {
  return isIosSafari(env) && !env.standalone;
}

export function readInstallEnv(): InstallEnv {
  const standaloneIos = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: standaloneIos || window.matchMedia('(display-mode: standalone)').matches,
  };
}
