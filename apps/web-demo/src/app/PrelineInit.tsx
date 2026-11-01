import { useEffect } from "react";
import { useLocation } from "react-router";

/** Initializes Preline plugins after React renders / on route change. */
export function PrelineInit() {
  const { pathname } = useLocation();

  useEffect(() => {
    let active = true;
    (async () => {
      const { HSStaticMethods } = await import("preline/non-auto");
      if (!active) return;
      HSStaticMethods.cleanCollection();
      HSStaticMethods.autoInit();
    })().catch((error: unknown) => {
      console.error("Failed to initialize Preline UI", error);
    });
    return () => {
      active = false;
      window.$hsFileUploadCollection?.forEach(({ element }) => element.destroy());
    };
  }, [pathname]);

  return null;
}
