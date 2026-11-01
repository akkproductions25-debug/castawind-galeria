export interface Photo { id: string; name: string; size: number; w: number; h: number }
// Fuentes de imagen para archivos públicos de Drive, por orden de intento.
export const thumbSources = (id: string, w: number) => [
  `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`,
  `https://lh3.googleusercontent.com/d/${id}=w${w}`,
];
export const downloadUrl = (p: Photo) => `https://drive.google.com/uc?export=download&id=${p.id}`;
export const mb = (b: number) => (b ? `${(b / 1048576).toFixed(1)} MB` : "");
