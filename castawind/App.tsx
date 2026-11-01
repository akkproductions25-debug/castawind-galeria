import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "../site.config";
import { Photo, thumbSources } from "./types";
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
      const r = await fetch("/.netlify/functions/photos");
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

function Tile({ p, i, onOpen }: { p: Photo; i: number; onOpen: () => void }) {
  const [ok, setOk] = useState(false);
  const [n, setN] = useState(0);
  const srcs = thumbSources(p.id, 640);
  return (
    <button className={"tile" + (ok ? " in" : "")} style={{ aspectRatio: `${p.w} / ${p.h}`, transitionDelay: `${(i % 6) * 60}ms` }} onClick={onOpen} aria-label={`Abrir fotografía ${i + 1}`}>
      <img src={srcs[n]} alt="" loading="lazy" decoding="async" onLoad={() => setOk(true)} onError={() => n < srcs.length - 1 && setN(n + 1)} />
      <span className="tile-ov" aria-hidden><em>{String(i + 1).padStart(3, "0")}</em><b>Ver</b></span>
    </button>
  );
}

export default function App() {
  const { photos, error, reload } = useCatalog();
  const cols = useCols();
  const [shown, setShown] = useState(BATCH);
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [heroN, setHeroN] = useState(0);
  const [heroOk, setHeroOk] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 60); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  const hero = useMemo(() => {
    if (!photos) return null;
    return photos.find((p) => p.name === siteConfig.heroPhotoName) ?? photos.find((p) => p.w > p.h * 1.3) ?? null;
  }, [photos]);
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
      <nav className={"nav" + (scrolled ? " solid" : "")}>
        <a href="#top" aria-label="Inicio"><img src="/img/laasso.png" alt="La Asso" width={1562} height={908} /></a>
        <a className="nav-link" href="#galeria">Galería</a>
      </nav>

      <header className="hero" id="top">
        <div className="hero-bg">
          <img className="fallback" src="/img/cartel.jpg" alt="" />
          {hero && <img className={"photo" + (heroOk ? " in" : "")} src={thumbSources(hero.id, 1920)[heroN]} alt="" onLoad={() => setHeroOk(true)} onError={() => heroN < 1 && setHeroN(1)} />}
        </div>
        <div className="hero-shade" aria-hidden />
        <figure className="poster-card"><img src="/img/cartel.jpg" alt="Cartel oficial de CASTAWIND: La Asso, 31 d’octubre, Pavelló Municipal" /></figure>
        <div className="hero-content">
          <p className="when">{siteConfig.eventDate} · {siteConfig.eventPlace}</p>
          <h1 aria-label={siteConfig.eventName}>{siteConfig.eventName.split("").map((l, i) => <span key={i} aria-hidden style={{ animationDelay: `${0.25 + i * 0.07}s` }}>{l}</span>)}</h1>
          <p className="sub">GALERÍA OFICIAL</p>
          <p className="phrase">«{siteConfig.tagline}».</p>
          <a className="cta" href="#galeria"><span>VER GALERÍA</span><i aria-hidden /></a>
        </div>
        <a className="scroll-cue" href="#galeria" aria-label="Bajar a la galería"><i /></a>
      </header>

      <main id="galeria" className="gallery">
        <div className="g-head">
          <div className="g-count">
            <strong>{photos ? total : "···"}</strong>
            <div><h2>fotografías</h2><p className="muted">Toca una imagen para verla en grande y descargarla en calidad original.</p></div>
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
            <div className="col" key={ci}>{c.items.map((i) => <Tile key={photos![i].id} p={photos![i]} i={i} onOpen={() => setOpen(i)} />)}</div>
          ))}
        </div>
        {photos && shown < total && <div className="more" aria-label="Cargando más fotografías"><span className="ring" /></div>}
        <div ref={sentinel} style={{ height: 1 }} />
      </main>

      <footer className="foot">
        <p className="foot-mark" aria-hidden>{siteConfig.eventName}</p>
        <div className="foot-logos">
          <figure><img src="/img/laasso.png" alt="La Asso" width={1562} height={908} /><figcaption>Organiza</figcaption></figure>
          <span className="bar" aria-hidden />
          <figure><img src="/img/akk.png" alt="AKKProductions" width={486} height={208} /><figcaption>Fotografía</figcaption></figure>
        </div>
        <p className="muted small">{siteConfig.eventName} · {siteConfig.eventDate} · {siteConfig.eventPlace}</p>
        <a className="nav-link" href="#top">Volver arriba ↑</a>
      </footer>

      {open !== null && photos && <Viewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
