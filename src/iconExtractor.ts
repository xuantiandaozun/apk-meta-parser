import type JSZip from "jszip";
import { getString } from "./axml/attributes";

/** Density bucket regex patterns */
const DENSITY_PATTERN = /^res\/drawable-([^-]+)/;

/** Default density priority order (highest to lowest) */
export const DEFAULT_DENSITY_PRIORITY = [
  "xxxhdpi",
  "xxhdpi", 
  "xhdpi",
  "hdpi",
  "mdpi",
  "ldpi",
  "nodpi",
  "anydpi",
];

/** Image MIME type mapping */
const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

export interface IconCandidate {
  fileName: string;
  density: string;
  densityPriority: number;
  blob: Blob;
}

/**
 * Extract app icons from APK file.
 * Looks for icon files in res/drawable-* directories and MIPMAP directories.
 * Returns icons sorted by density priority.
 */
export async function extractApkIcons(
  zipFiles: Record<string, JSZip.JSZipObject>,
  options: {
    maxCount?: number;
    densityPriority?: string[];
    iconResourceName?: string;
  } = {}
): Promise<IconCandidate[]> {
  const { 
    maxCount = 0, 
    densityPriority = DEFAULT_DENSITY_PRIORITY,
    iconResourceName 
  } = options;

  const iconCandidates: IconCandidate[] = [];
  const priorityMap = new Map(densityPriority.map((d, i) => [d, i]));

  // Common icon file names to look for
  const iconFileNames = [
    "icon.png",
    "icon.jpg",
    "icon.jpeg",
    "icon.webp",
    "app_icon.png",
    "launcher_icon.png",
  ];

  // If we have a specific icon resource name, prioritize it
  if (iconResourceName) {
    const specificEntry = Object.values(zipFiles).find(entry => 
      entry.name.toLowerCase().includes(iconResourceName.toLowerCase())
    );
    if (specificEntry && isImageFile(specificEntry.name)) {
      const density = extractDensityFromPath(specificEntry.name);
      const priority = priorityMap.get(density) ?? 999;
      
      iconCandidates.push({
        fileName: specificEntry.name,
        density,
        densityPriority: priority,
        blob: await specificEntry.async("blob"),
      });
    }
  }

  // Search for icons in drawable and mipmap directories
  for (const entry of Object.values(zipFiles)) {
    if (!isImageFile(entry.name)) continue;
    
    const path = entry.name.toLowerCase();
    
    // Skip if already found via resource name
    if (iconResourceName && path.includes(iconResourceName.toLowerCase())) {
      continue;
    }

    // Check if it's in a drawable or mipmap directory
    const densityMatch = path.match(/res\/(?:drawable|mipmap)-([^-]+)/);
    if (!densityMatch) continue;

    const density = densityMatch[1];
    
    // Check if filename suggests it's an icon
    const fileName = entry.name.split("/").pop() || "";
    const isLikelyIcon = iconFileNames.some(name => 
      fileName.toLowerCase().includes(name.replace(/\.[^.]+$/, ""))
    );

    // Also check for common icon naming patterns
    const hasIconName = /(?:icon|launcher|app_?icon|default_?icon)/i.test(fileName);
    
    if (!isLikelyIcon && !hasIconName) continue;

    const priority = priorityMap.get(density) ?? 999;
    
    iconCandidates.push({
      fileName: entry.name,
      density,
      densityPriority: priority,
      blob: await entry.async("blob"),
    });
  }

  // Sort by density priority, then by file size (prefer smaller for same density)
  iconCandidates.sort((a, b) => {
    if (a.densityPriority !== b.densityPriority) {
      return a.densityPriority - b.densityPriority;
    }
    return a.blob.size - b.blob.size;
  });

  // Limit results if maxCount is specified
  if (maxCount > 0 && iconCandidates.length > maxCount) {
    return iconCandidates.slice(0, maxCount);
  }

  return iconCandidates;
}

/**
 * Get the best icon from extracted candidates.
 * Returns the highest priority icon based on density.
 */
export function getBestIcon(candidates: IconCandidate[]): IconCandidate | null {
  if (candidates.length === 0) return null;
  return candidates[0];
}

/**
 * Extract density bucket from file path.
 */
function extractDensityFromPath(path: string): string {
  const match = path.match(DENSITY_PATTERN);
  if (match) {
    return match[1];
  }
  
  // Check for mipmap directories
  const mipmapMatch = path.match(/res\/mipmap-([^-]+)/);
  if (mipmapMatch) {
    return mipmapMatch[1];
  }
  
  return "nodpi";
}

/**
 * Check if file is a supported image format.
 */
function isImageFile(path: string): boolean {
  const ext = path.toLowerCase().match(/\.[^.]+$/);
  if (!ext) return false;
  return ext[0] in IMAGE_MIME_TYPES;
}

/**
 * Get MIME type from file extension.
 */
export function getMimeTypeFromPath(path: string): string {
  const ext = path.toLowerCase().match(/\.[^.]+$/);
  if (!ext) return "application/octet-stream";
  return IMAGE_MIME_TYPES[ext[0]] || "application/octet-stream";
}

/**
 * Create ApkIcon objects from candidates with additional metadata.
 */
export async function createApkIcons(
  candidates: IconCandidate[]
): Promise<Array<{
  fileName: string;
  density: string;
  width: number;
  height: number;
  mimeType: string;
  iconBlob: Blob;
}>> {
  const icons: Array<{
    fileName: string;
    density: string;
    width: number;
    height: number;
    mimeType: string;
    iconBlob: Blob;
  }> = [];

  for (const candidate of candidates) {
    try {
      // Try to get image dimensions
      const dimensions = await getImageDimensions(candidate.blob);
      
      icons.push({
        fileName: candidate.fileName,
        density: candidate.density,
        width: dimensions.width,
        height: dimensions.height,
        mimeType: getMimeTypeFromPath(candidate.fileName),
        iconBlob: candidate.blob,
      });
    } catch {
      // If we can't read dimensions, use placeholder values
      icons.push({
        fileName: candidate.fileName,
        density: candidate.density,
        width: 0,
        height: 0,
        mimeType: getMimeTypeFromPath(candidate.fileName),
        iconBlob: candidate.blob,
      });
    }
  }

  return icons;
}

/**
 * Get image dimensions from a Blob.
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}
