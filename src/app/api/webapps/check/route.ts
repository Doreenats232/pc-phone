export const dynamic = "force-dynamic";

// Can this site be shown inside the phone? (Many sites forbid being embedded.)
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad");
    const r = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) PCPhone" },
    });
    r.body?.cancel().catch(() => {});
    const xfo = (r.headers.get("x-frame-options") ?? "").toLowerCase();
    const csp = (r.headers.get("content-security-policy") ?? "").toLowerCase();
    const fa = /frame-ancestors([^;]*)/.exec(csp)?.[1]?.trim();
    const blockedByXfo = xfo.includes("deny") || xfo.includes("sameorigin");
    const blockedByCsp = fa !== undefined && fa !== "*" && !fa.includes("https:") ;
    return Response.json({ embeddable: !(blockedByXfo || blockedByCsp) });
  } catch {
    return Response.json({ embeddable: true }); // can't tell: try it
  }
}
