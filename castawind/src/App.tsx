import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "../site.config";
import { Photo, fallbackUrl, thumbUrl } from "./types";
import Viewer from "./Viewer";

const CACHE_KEY = "castawind:catalog:v1";
const BATCH = 48;

function useCatalog() {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setPhotos(JSON.parse(cached)); // muestra al instante lo último que vio
    } catch { /* sin caché */ }
    try {
      const r = await fetch("/api/photos");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al cargar la galería");
      setPhotos(d.photos);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(d.photos)); } catch { /* ignorar */ }
    } catch (e) {
      setPhotos((p) => p); setError(e instanceof Error ? e.message : "Error al cargar la galería");
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { photos, error, reload: load };
}

function useCols() {
  const calc = () => { const w = window.innerWidth; return w < 560 ? 2 : w < 900 ? 3 : w < 1360 ? 4 : 5; };
  const [c, setC] = useState(calc);
  useEffect(() => { const f = () => setC(calc()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return c;
}

function Tile({ p, onOpen }: { p: Photo; onOpen: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <button className={"tile" + (ok ? " in" : "")} style={{ aspectRatio: `${p.w} / ${p.h}` }} onClick={onOpen} aria-label={`Abrir ${p.name}`}>
      <img src={thumbUrl(p, 640)} alt="" loading="lazy" decoding="async" onLoad={() => setOk(true)}
        onError={(e) => { const f = fallbackUrl(p, 640); if (e.currentTarget.src !== f) e.currentTarget.src = f; }} />
    </button>
  );
}

export default function App() {
  const { photos, error, reload } = useCatalog();
  const cols = useCols();
  const [shown, setShown] = useState(BATCH);
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const total = photos?.length ?? 0;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((en) => en[0].isIntersecting && setShown((n) => n + BATCH), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [total]);

  const columns = useMemo(() => {
    const cs: { items: number[]; h: number }[] = Array.from({ length: cols }, () => ({ items: [], h: 0 }));
    (photos ?? []).slice(0, shown).forEach((p, i) => {
      const c = cs.reduce((a, b) => (b.h < a.h ? b : a));
      c.items.push(i); c.h += p.h / p.w;
    });
    return cs;
  }, [photos, shown, cols]);

  return (
    <>
      <header className="hero">
        <div className="poster"><img src="/img/cartel.jpg" alt="Cartel oficial de CASTAWIND: La Asso, 31 d’octubre, Pavelló Municipal" /></div>
        <div className="hero-text">
          <img className="logo-asso-top" src="/img/laasso.png" alt="La Asso" width={1562} height={908} />
          <h1>{siteConfig.eventName}</h1>
          <p className="sub">GALERÍA OFICIAL</p>
          <p className="phrase">«{siteConfig.tagline}».</p>
          <a className="cta" href="#galeria">VER GALERÍA</a>
          <p className="when">{siteConfig.eventDate} · {siteConfig.eventPlace}</p>
        </div>
      </header>

      <main id="galeria" className="gallery">
        <div className="g-head">
          <div>
            <h2>Todas las fotografías</h2>
            <p className="muted">{photos ? `${total} fotografías` : "Cargando…"} · toca una para verla en grande</p>
          </div>
          <div className="g-all">
            <a className="btn" href={`https://drive.google.com/drive/folders/${siteConfig.driveFolderId}`} target="_blank" rel="noopener">Descargar toda la galería</a>
            <p className="muted small">Se abre Google Drive: selecciona todo y pulsa Descargar. Drive la entregará en varios ZIP.</p>
          </div>
        </div>

        {error && (
          <div className="notice" role="alert">
            <p>{error}</p><button className="btn" onClick={reload}>Reintentar</button>
          </div>
        )}
        {!photos && !error && <div className="skeleton" aria-hidden>{Array.from({ length: cols * 3 }, (_, i) => <i key={i} style={{ aspectRatio: i % 3 ? "3/2" : "2/3" }} />)}</div>}
        {photos && photos.length === 0 && <p className="notice">Todavía no hay fotografías en la carpeta.</p>}

        <div className="masonry">
          {columns.map((c, ci) => (
            <div className="col" key={ci}>{c.items.map((i) => <Tile key={photos![i].id} p={photos![i]} onOpen={() => setOpen(i)} />)}</div>
          ))}
        </div>
        <div ref={sentinel} style={{ height: 1 }} />
      </main>

      <footer className="foot">
        <img src="/img/laasso.png" alt="La Asso" width={1562} height={908} />
        <span className="bar" aria-hidden />
        <img src="/img/akk.png" alt="AKKProductions" width={486} height={208} />
        <p className="muted small">Fotografía: AKKProductions · Organiza: La Asso</p>
      </footer>

      {open !== null && photos && <Viewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
