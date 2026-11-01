// Lista las fotografías de la carpeta de Drive. La clave de Google vive SOLO aquí (variable de entorno).
import { siteConfig } from "../../site.config";

const API = "https://www.googleapis.com/drive/v3/files";

export default async (): Promise<Response> => {
  const key = process.env.GOOGLE_API_KEY;
  const folder = process.env.DRIVE_FOLDER_ID || siteConfig.driveFolderId;
  if (!key) return json({ error: "Falta la variable GOOGLE_API_KEY en Netlify." }, 500);
  if (!folder) return json({ error: "Falta el ID de la carpeta de Drive." }, 500);

  const photos: unknown[] = [];
  let pageToken = "";
  try {
    do {
      const url = new URL(API);
      url.searchParams.set("q", `'${folder}' in parents and trashed=false and mimeType contains 'image/'`);
      url.searchParams.set("fields", "nextPageToken,files(id,name,size,mimeType,imageMediaMetadata(width,height,rotation))");
      url.searchParams.set("orderBy", "name");
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("includeItemsFromAllDrives", "true");
      url.searchParams.set("key", key);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url);
      if (!res.ok) {
        const detail = await res.text();
        return json({ error: `Google Drive respondió ${res.status}`, detail: detail.slice(0, 400) }, 502);
      }
      const data = await res.json();
      for (const f of data.files ?? []) {
        const m = f.imageMediaMetadata ?? {};
        const swap = m.rotation === 1 || m.rotation === 3; // la miniatura ya viene girada
        photos.push({
          id: f.id,
          name: f.name,
          size: Number(f.size) || 0,
          w: (swap ? m.height : m.width) || 3,
          h: (swap ? m.width : m.height) || 2,
        });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
  } catch (e) {
    return json({ error: "No se pudo contactar con Google Drive.", detail: String(e) }, 502);
  }

  return json({ folderId: folder, count: photos.length, photos }, 200, {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
