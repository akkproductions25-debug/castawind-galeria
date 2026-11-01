import { useCallback, useEffect, useRef, useState } from "react";
import { Photo, downloadUrl, fallbackUrl, mb, thumbUrl } from "./types";

interface Props { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void }
const MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function Viewer({ photos, index, onIndex, onClose }: Props) {
  const p = photos[index];
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const [hiLoaded, setHiLoaded] = useState(false);
  const [hiSrc, setHiSrc] = useState(thumbUrl(p, 1920));
  const stage = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const st = useRef({ d: 0, s: 1, x: 0, y: 0, tx: 0, ty: 0 });

  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);
  const limit = (s: number, x: number, y: number) => {
    const r = stage.current?.getBoundingClientRect();
    const mx = r ? (r.width * (s - 1)) / 2 : 0, my = r ? (r.height * (s - 1)) / 2 : 0;
    return { s, x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
  };
  const zoom = (s: number) => setT((o) => (s <= 1 ? { s: 1, x: 0, y: 0 } : limit(clamp(s, 1, MAX), o.x, o.y)));

  useEffect(() => { setT({ s: 1, x: 0, y: 0 }); setHiLoaded(false); setHiSrc(thumbUrl(p, 1920)); }, [p.id]);
  useEffect(() => {
    // precarga las vecinas en 1920 px
    [1, -1].forEach((d) => { const q = photos[(index + d + photos.length) % photos.length]; new Image().src = thumbUrl(q, 1920); });
  }, [index, photos]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") zoom(t.s + 0.5);
      else if (e.key === "-") zoom(t.s - 0.5);
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  });

  const dist = () => { const a = [...pts.current.values()]; return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    st.current = { d: dist(), s: t.s, x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2 && st.current.d) zoom(st.current.s * (dist() / st.current.d));
    else if (pts.current.size === 1 && t.s > 1) setT(limit(t.s, st.current.tx + e.clientX - st.current.x, st.current.ty + e.clientY - st.current.y));
  };
  const up = (e: React.PointerEvent) => {
    const wasSingle = pts.current.size === 1;
    pts.current.delete(e.pointerId);
    const dx = e.clientX - st.current.x, dy = e.clientY - st.current.y;
    if (wasSingle && t.s === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    const rest = [...pts.current.values()][0];
    if (rest) st.current = { d: 0, s: t.s, x: rest.x, y: rest.y, tx: t.x, ty: t.y };
  };

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`Fotografía ${index + 1} de ${photos.length}`}>
      <div className="v-top">
        <span className="v-count">{index + 1} / {photos.length}</span>
        <div className="v-actions">
          <button onClick={() => zoom(t.s - 0.5)} aria-label="Alejar">−</button>
          <button onClick={() => zoom(t.s + 0.5)} aria-label="Acercar">+</button>
          <a className="v-dl" href={downloadUrl(p)} rel="noopener" download={p.name}>Descargar original{p.size ? ` · ${mb(p.size)}` : ""}</a>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div ref={stage} className="v-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={() => zoom(t.s > 1 ? 1 : 2.5)}
        onWheel={(e) => zoom(t.s - e.deltaY * 0.004)}
        onClick={(e) => { if (e.target === e.currentTarget && t.s === 1) onClose(); }}>
        <div className="v-img" key={p.id} style={{ transform: `translate(${t.x}px,${t.y}px) scale(${t.s})`, transition: pts.current.size ? "none" : "transform .2s ease" }}>
          <img className="lo" src={thumbUrl(p, 640)} alt="" draggable={false} onError={(e) => { e.currentTarget.src = fallbackUrl(p, 640); }} />
          <img className={"hi" + (hiLoaded ? " in" : "")} src={hiSrc} alt={`Fotografía ${p.name}`} draggable={false}
            onLoad={() => setHiLoaded(true)} onError={() => { if (!hiSrc.includes("drive.google.com")) setHiSrc(fallbackUrl(p, 1920)); }} />
        </div>
        {!hiLoaded && <div className="v-spin" aria-hidden />}
      </div>

      <button className="v-nav prev" onClick={() => go(-1)} aria-label="Anterior">‹</button>
      <button className="v-nav next" onClick={() => go(1)} aria-label="Siguiente">›</button>
    </div>
  );
}
