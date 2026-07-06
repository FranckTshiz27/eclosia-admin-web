export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  fileName?: string;
}

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
}

const DEFAULT_MAX_WIDTH = 1280;
const DEFAULT_MAX_HEIGHT = 1280;
const DEFAULT_QUALITY = 0.82;

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(dataUrl);
  return compressImageElement(image, {
    ...options,
    fileName: options.fileName ?? buildCompressedFileName(file.name)
  });
}

export async function compressCanvasImage(
  canvas: HTMLCanvasElement,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const image = await loadImageElement(canvas.toDataURL('image/png'));
  return compressImageElement(image, {
    ...options,
    fileName: options.fileName ?? `enrollment-photo-${Date.now()}.jpg`
  });
}

async function compressImageElement(
  image: HTMLImageElement,
  options: CompressImageOptions
): Promise<CompressedImageResult> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const fileName = options.fileName ?? `photo-${Date.now()}.jpg`;

  const { width, height } = fitWithinBounds(image.naturalWidth || image.width, image.naturalHeight || image.height, maxWidth, maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Compression image indisponible.');
  }

  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const compressedFile = dataUrlToFile(dataUrl, fileName);
  if (!compressedFile) {
    throw new Error('Compression image indisponible.');
  }

  return {
    file: compressedFile,
    dataUrl
  };
}

function fitWithinBounds(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger l'image."));
    image.src = source;
  });
}

function buildCompressedFileName(originalName: string): string {
  const baseName = String(originalName || 'photo')
    .replace(/\.[^.]+$/, '')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${baseName || 'enrollment-photo'}-${Date.now()}.jpg`;
}

function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  const parts = String(dataUrl || '').split(',');
  if (parts.length !== 2) {
    return null;
  }

  const mime = parts[0].match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

  try {
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
  } catch {
    return null;
  }
}
