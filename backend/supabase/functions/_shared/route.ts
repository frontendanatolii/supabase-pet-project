export function getRoute(req: Request, functionName = "api") {
  const url = new URL(req.url);
  let p = url.pathname;

  // Local: /functions/v1/api/...
  const localPrefix = `/functions/v1/${functionName}`;
  // Deployed: /api/...
  const deployedPrefix = `/${functionName}`;

  if (p.startsWith(localPrefix)) p = p.slice(localPrefix.length);
  else if (p.startsWith(deployedPrefix)) p = p.slice(deployedPrefix.length);

  if (!p.startsWith("/")) p = "/" + p;
  if (p === "/") return { url, route: "/" };

  const route = p.endsWith("/") ? p.slice(0, -1) : p;
  return { url, route };
}
