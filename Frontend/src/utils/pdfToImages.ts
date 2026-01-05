/**
 * PDF to Images Utility
 *
 * Converts PDF files into individual image files (one per page)
 * Uses Mozilla's PDF.js library for reliable PDF processing
 */

import * as pdfjsLib from "pdfjs-dist";

// Import PDF worker using Vite's URL import - this bundles the worker properly
// Vite will resolve this at build time and provide a proper URL
// Using a simple static import which Vite handles automatically
// @ts-expect-error - Vite handles ?url imports at build time, TypeScript may not recognize it
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set up PDF.js worker
// The worker is required for PDF.js to function in the browser
let workerInitialized = false;
let workerInitializationError: Error | null = null;

/**
 * Initialize PDF.js worker if not already initialized
 * Should be called before using any PDF.js functionality
 *
 * Uses Vite's URL import to bundle the worker from node_modules
 * This is the most reliable method as it doesn't depend on external CDN
 */
function initializePdfWorker(): void {
  if (workerInitialized) {
    return;
  }

  if (workerInitializationError) {
    throw workerInitializationError;
  }

  try {
    if (typeof window !== "undefined") {
      // Primary method: Use Vite's bundled worker URL (most reliable - works offline and in production)
      // Vite will bundle the worker file and provide a proper URL
      if (pdfWorkerUrl && typeof pdfWorkerUrl === "string") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        workerInitialized = true;
        console.debug(
          "PDF.js worker initialized successfully using Vite bundle:",
          pdfWorkerUrl
        );
        return;
      }

      // Fallback 1: Try unpkg CDN with exact version match (more reliable than cdnjs)
      const pdfjsVersion = pdfjsLib.version || "5.4.449";
      const unpkgWorkerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = unpkgWorkerUrl;
      workerInitialized = true;
      console.warn(
        `PDF.js worker using fallback CDN (unpkg): ${unpkgWorkerUrl}. Consider using Vite bundle for better reliability.`
      );
      return;
    }
  } catch (error) {
    const initError = new Error(
      `Failed to initialize PDF.js worker: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    workerInitializationError = initError;
    console.error("PDF.js worker initialization error:", initError);
    throw initError;
  }
}

/**
 * Configuration options for PDF to image conversion
 */
export interface PdfToImagesOptions {
  /**
   * Scale factor for rendering (default: 2.0)
   * Higher values = better quality but larger file size
   * Recommended range: 1.0 - 3.0
   */
  scale?: number;

  /**
   * Output image format (default: 'image/png')
   */
  format?: "image/png" | "image/jpeg";

  /**
   * JPEG quality (0-1, default: 0.92)
   * Only used when format is 'image/jpeg'
   */
  quality?: number;

  /**
   * Maximum number of pages to process (optional)
   * If not specified, processes all pages
   */
  maxPages?: number;

  /**
   * Base name for output files (optional)
   * If not specified, uses the PDF file name
   */
  outputFileName?: string;
}

/**
 * Result of PDF to image conversion
 */
export interface PdfToImagesResult {
  /**
   * Array of image files, one per page
   */
  images: File[];

  /**
   * Total number of pages in the PDF
   */
  totalPages: number;

  /**
   * Number of pages successfully converted
   */
  convertedPages: number;
}

/**
 * Convert a PDF file into individual image files (one per page)
 *
 * @param pdfFile - The PDF file to convert
 * @param options - Conversion options
 * @returns Promise resolving to an object containing the image files and metadata
 *
 * @example
 * ```typescript
 * const pdfFile = event.target.files[0]; // PDF file from input
 * const result = await convertPdfToImages(pdfFile, {
 *   scale: 2.0,
 *   format: 'image/png',
 *   maxPages: 10
 * });
 *
 * // result.images contains File objects for each page
 * result.images.forEach((image, index) => {
 *   console.log(`Page ${index + 1}: ${image.name}`);
 * });
 * ```
 *
 * @throws {Error} If PDF file is invalid or cannot be processed
 */
export async function convertPdfToImages(
  pdfFile: File,
  options: PdfToImagesOptions = {}
): Promise<PdfToImagesResult> {
  // Validate input
  if (!pdfFile) {
    throw new Error("PDF file is required");
  }

  if (!(pdfFile instanceof File)) {
    throw new Error("Input must be a File object");
  }

  if (
    pdfFile.type !== "application/pdf" &&
    !pdfFile.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("Input file must be a PDF");
  }

  // Initialize worker
  initializePdfWorker();

  // Set default options
  const {
    scale = 2.0,
    format = "image/png",
    quality = 0.92,
    maxPages,
    outputFileName,
  } = options;

  // Validate scale
  if (scale <= 0 || scale > 5) {
    throw new Error("Scale must be between 0 and 5");
  }

  // Validate quality for JPEG
  if (format === "image/jpeg" && (quality < 0 || quality > 1)) {
    throw new Error("Quality must be between 0 and 1 for JPEG format");
  }

  try {
    // Convert File to ArrayBuffer for PDF.js
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true, // Better font rendering
      verbosity: 0, // Suppress console warnings
    });

    const pdfDocument = await loadingTask.promise;
    const totalPages = pdfDocument.numPages;

    if (totalPages === 0) {
      throw new Error("PDF has no pages");
    }

    // Determine how many pages to process
    const pagesToProcess = maxPages
      ? Math.min(maxPages, totalPages)
      : totalPages;

    // Generate base file name
    const baseFileName = outputFileName || pdfFile.name.replace(/\.pdf$/i, "");
    const fileExtension = format === "image/png" ? "png" : "jpg";

    // Process each page
    const imageFiles: File[] = [];
    const errors: Error[] = [];

    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      try {
        // Get the page
        const page = await pdfDocument.getPage(pageNum);

        // Get viewport with scale
        const viewport = page.getViewport({ scale });

        // Create canvas element
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Get canvas context
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error(`Failed to get canvas context for page ${pageNum}`);
        }

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas, // Required in newer pdfjs-dist versions
        };

        await page.render(renderContext).promise;

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error(`Failed to convert page ${pageNum} to blob`));
                return;
              }
              
              // Ensure blob has the correct MIME type
              // If blob type doesn't match format, create a new blob with correct type
              let correctedBlob = blob;
              if (blob.type !== format) {
                // Create a new blob with the correct MIME type
                correctedBlob = new Blob([blob], { type: format });
              }
              
              resolve(correctedBlob);
            },
            format,
            format === "image/jpeg" ? quality : undefined
          );
        });

        // Validate blob has correct MIME type
        if (!blob.type || !blob.type.startsWith('image/')) {
          throw new Error(`Invalid blob MIME type for page ${pageNum}: ${blob.type || 'unknown'}`);
        }

        // Convert blob to File - use blob.type to ensure consistency
        const fileName = `${baseFileName}_page_${pageNum}.${fileExtension}`;
        const imageFile = new File([blob], fileName, {
          type: blob.type || format, // Use blob's actual type, fallback to format
          lastModified: Date.now(),
        });

        // Final validation: ensure File has valid image MIME type
        if (!imageFile.type.startsWith('image/')) {
          throw new Error(`Invalid image MIME type for page ${pageNum}: ${imageFile.type}`);
        }

        imageFiles.push(imageFile);
      } catch (error) {
        const pageError =
          error instanceof Error
            ? error
            : new Error(`Failed to convert page ${pageNum}: ${String(error)}`);
        errors.push(pageError);
        console.error(`Error processing page ${pageNum}:`, pageError);

        // Continue processing other pages even if one fails
        // You might want to modify this behavior based on requirements
      }
    }

    // Clean up PDF document
    await pdfDocument.destroy();

    // If no pages were successfully converted, throw an error
    if (imageFiles.length === 0) {
      const errorMessage =
        errors.length > 0
          ? `Failed to convert any pages. Errors: ${errors
              .map((e) => e.message)
              .join("; ")}`
          : "Failed to convert any pages";
      throw new Error(errorMessage);
    }

    return {
      images: imageFiles,
      totalPages,
      convertedPages: imageFiles.length,
    };
  } catch (error) {
    // Re-throw with more context if it's already an Error
    if (error instanceof Error) {
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
    throw new Error(`PDF conversion failed: ${String(error)}`);
  }
}

/**
 * Check if a file is a PDF
 *
 * @param file - File to check
 * @returns true if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

/**
 * Get the number of pages in a PDF file
 *
 * @param pdfFile - The PDF file
 * @returns Promise resolving to the number of pages
 * @throws {Error} If PDF cannot be read
 */
export async function getPdfPageCount(pdfFile: File): Promise<number> {
  if (!isPdfFile(pdfFile)) {
    throw new Error("Input file must be a PDF");
  }

  initializePdfWorker();

  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      verbosity: 0,
    });

    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    await pdfDocument.destroy();

    return pageCount;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read PDF: ${error.message}`);
    }
    throw new Error(`Failed to read PDF: ${String(error)}`);
  }
}

