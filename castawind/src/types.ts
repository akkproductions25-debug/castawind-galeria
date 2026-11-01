export interface Photo { id: string; name: string; size: number; w: number; h: number; tb: string | null }
export const thumbUrl = (p: Photo, w: number) =>
  p.tb ? `${p.tb}=w${w}` : `https://drive.google.com/thumbnail?id=${p.id}&sz=w${w}`;
export const fallbackUrl = (p: Photo, w: number) => `https://drive.google.com/thumbnail?id=${p.id}&sz=w${w}`;
export const downloadUrl = (p: Photo) => `https://drive.google.com/uc?export=download&id=${p.id}`;
export const mb = (b: number) => (b ? `${(b / 1048576).toFixed(1)} MB` : "");
