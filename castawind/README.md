# CASTAWIND · Galería oficial

Web propia (React + Vite + TypeScript) que lee las fotos de una carpeta de Google Drive mediante una Netlify Function y las muestra con diseño propio. Las fotos **no** se suben a Netlify.

- Previsualización (≈1920 px) y miniaturas: las genera Google Drive; el navegador las pide directamente a Google.
- Original: botón "Descargar original" → Drive entrega el archivo sin tocar.
- Toda la colección: botón que abre la carpeta en Drive para descargarla desde allí (no se genera ZIP en el navegador).
- La clave de Google vive solo en Netlify (variable de entorno), nunca en el código del navegador.

## Paso a paso (sin programar)

### 1. Carpeta en Google Drive
1. Entra en drive.google.com → **Nuevo → Carpeta nueva** → llámala `CASTAWIND`.
2. Ábrela y arrastra dentro las 155 fotos (1,70 GB: espera a que Drive termine la subida).
   Sube JPG/PNG. Los archivos RAW o HEIC no tienen miniatura fiable.

### 2. Compartir la carpeta
1. Clic derecho en la carpeta → **Compartir**.
2. En *Acceso general* elige **Cualquier persona con el enlace** → rol **Lector**.
3. No desactives "Los lectores pueden descargar" (en ⚙ Ajustes de compartir), o las descargas no funcionarán.

### 3. ID de la carpeta
Abre la carpeta. La dirección es `https://drive.google.com/drive/folders/XXXXXXXX`. El ID es la parte `XXXXXXXX`.
Ya está puesto en `site.config.ts` (`driveFolderId`). Si cambias de carpeta, edita ese valor o crea la variable `DRIVE_FOLDER_ID` en Netlify (tiene prioridad).

### 4. Clave de Google Drive API (gratis)
1. Ve a console.cloud.google.com e inicia sesión. **Seleccionar proyecto → Proyecto nuevo** → nombre `castawind` → Crear.
2. Menú **APIs y servicios → Biblioteca** → busca **Google Drive API** → **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**. Copia la clave.
4. En la clave, **Editar**: en *Restricciones de API* elige **Restringir clave → Google Drive API** → Guardar.
   (No pongas restricción de sitios web: la clave la usa el servidor de Netlify, no el navegador.)

Como la carpeta es pública, basta una clave de API; no hace falta OAuth ni cuenta de servicio.

### 5. Subir el proyecto a GitHub
1. Crea cuenta en github.com → **New repository** → nombre `castawind-galeria` → Create.
2. **uploading an existing file** → arrastra el *contenido* de esta carpeta (sin `node_modules` ni `dist`) → **Commit changes**.

### 6. Publicar en Netlify
1. Crea cuenta en netlify.com (puedes entrar con GitHub).
2. **Add new site → Import an existing project → GitHub** → elige `castawind-galeria`.
3. Los ajustes se rellenan solos desde `netlify.toml`. Antes de desplegar, abre **Environment variables** y añade `GOOGLE_API_KEY` = tu clave del paso 4.
4. **Deploy**. Tarda ~1 minuto.

### 7. Enlace definitivo
**Site configuration → Change site name** → p. ej. `castawind` → tu enlace será `https://castawind.netlify.app`. Ese es el que compartes.

### 8. Añadir fotos más adelante
Súbelas a la carpeta de Drive y recarga la web. El catálogo se refresca solo (caché de unos 5 minutos).

## Limitaciones de Google Drive que debes conocer
- **Descarga de la carpeta completa:** Drive la comprime al vuelo y, a 1,70 GB, la parte en varios ZIP. No hay un enlace directo a "un solo ZIP"; por eso el botón abre Drive. Alternativa más sencilla si falla: subir tú un ZIP único por partes (p. ej. 2 ZIP de ~850 MB) a la misma carpeta y enlazarlos.
- **Cuota de descarga:** si muchísima gente baja los mismos archivos el mismo día, Drive puede bloquear temporalmente ("demasiados usuarios han visto o descargado este archivo"). Se resuelve solo en ~24 h.
- **Miniaturas:** son un servicio de Google no garantizado a perpetuidad; si una falla, la web usa automáticamente una URL alternativa de Drive. Calidad de la previsualización: la que genera Google (JPEG a 1920 px de lado largo).
- **Plan gratuito de Netlify:** la web solo consume las llamadas de la función (el catálogo, cacheado) y los archivos de la web; las imágenes salen de Google. Revisa los límites vigentes de tu plan en netlify.com/pricing.
- La clave de API es de uso público-solo-lectura, pero mantenla en Netlify y no la publiques.

## Probar en tu ordenador (opcional)
Necesitas Node 20. `npm install`, copia `.env.example` a `.env` con tu clave, y `npx netlify dev`.
