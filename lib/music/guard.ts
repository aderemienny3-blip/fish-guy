/** True when another website is trying to load our audio (hotlinking). Our own pages send same-origin. */
export const crossSite = (request: Request) => request.headers.get("sec-fetch-site") === "cross-site";
