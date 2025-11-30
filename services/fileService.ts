

import { MarkdownFile, Quiz, QuizQuestion } from '../types';
import { GoogleGenAI } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Papa from 'papaparse';

// Configure PDF.js Worker
// Handle ESM import inconsistencies (sometimes it's on .default, sometimes root)
const pdfjs: any = pdfjsLib;
if (typeof window !== 'undefined' && pdfjs) {
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  } else if (pdfjs.default && pdfjs.default.GlobalWorkerOptions) {
    pdfjs.default.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
}

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

// Supported Extensions for Folder Scan
export const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.csv', '.pdf', '.docx', '.doc'];

export const isExtensionSupported = (filename: string): boolean => {
  const name = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext));
};

// Helper to read a directory recursively with better performance
export const readDirectory = async (
  dirHandle: FileSystemDirectoryHandle
): Promise<MarkdownFile[]> => {
  const results: MarkdownFile[] = [];
  
  // Internal recursive function that pushes to shared array to avoid O(N^2) spread ops
  const traverse = async (dir: FileSystemDirectoryHandle, currentPath: string) => {
    const entries = [];
    // Collect entries first
    for await (const entry of dir.values()) {
      entries.push(entry);
    }

    // Process entries (parallel promises for speed)
    await Promise.all(entries.map(async (entry) => {
        try {
            // Skip hidden system files/folders (except .writer)
            if (entry.name.startsWith('.') && entry.name !== '.writer') return;

            const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

            if (entry.kind === 'file') {
                if (isExtensionSupported(entry.name)) {
                    const fileHandle = entry as FileSystemFileHandle;
                    const file = await fileHandle.getFile();
                    // Basic text extraction
                    const content = await extractTextFromFile(file);

                    results.push({
                        // Unique ID based on path + random to prevent collisions
                        id: `local-${entryPath.replace(/[^\w-]/g, '_')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: entry.name.replace(/\.[^/.]+$/, ""), // Display name
                        content: content,
                        lastModified: file.lastModified,
                        handle: fileHandle,
                        isLocal: true,
                        path: entryPath
                    });
                }
            } else if (entry.kind === 'directory') {
                await traverse(entry as FileSystemDirectoryHandle, entryPath);
            }
        } catch (e) {
            console.warn(`Failed to process ${entry.name}`, e);
        }
    }));
  };

  await traverse(dirHandle, '');
  return results;
};

export const saveFileToDisk = async (file: MarkdownFile): Promise<void> => {
  if (file.handle) {
    const writable = await file.handle.createWritable();
    await writable.write(file.content);
    await writable.close();
  }
};

// Generic Text Extractor for Import
export const extractTextFromFile = async (file: File, apiKey?: string): Promise<string> => {
  const name = file.name.toLowerCase();
  
  try {
    if (name.endsWith('.pdf')) {
      return await processPdfFile(file, apiKey);
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      return await processDocxFile(file);
    } else if (name.endsWith('.csv')) {
       return await processCsvToMarkdown(file);
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      return await file.text();
    } else {
      // Fallback for others
      return await file.text();
    }
  } catch (e: any) {
    console.error(`Extraction failed for ${file.name}`, e);
    return `[Error reading file: ${e.message}]`;
  }
};

const processDocxFile = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (e: any) {
        console.error("DOCX Error", e);
        return `[Error extracting DOCX: ${e.message}]`;
    }
};

const processCsvToMarkdown = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          resolve(""); 
          return;
        }
        // Convert array of arrays to Markdown Table
        const rows = results.data as string[][];
        // Filter out empty rows
        const cleanRows = rows.filter(r => r.some(c => c && c.toString().trim() !== ""));
        
        if(cleanRows.length === 0) { resolve(""); return; }

        let md = "";
        // Header
        md += "| " + cleanRows[0].map((h: any) => h || " ").join(" | ") + " |\n";
        // Separator
        md += "| " + cleanRows[0].map(() => "---").join(" | ") + " |\n";
        // Body
        for(let i = 1; i < cleanRows.length; i++) {
           md += "| " + cleanRows[i].map((c: any) => (c || " ").toString().replace(/\n/g, "<br>")).join(" | ") + " |\n";
        }
        resolve(md);
      },
      error: () => resolve(`[Error parsing CSV]`)
    });
  });
}

// Programmatic CSV Parser for Quiz Mode
export const parseCsvToQuiz = (file: File): Promise<Quiz | null> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                const rows = results.data;
                if (!rows || rows.length === 0) {
                    resolve(null); 
                    return;
                }

                // Check for standard headers vaguely
                const firstRow = rows[0];
                const keys = Object.keys(firstRow).map(k => k.toLowerCase());
                
                // Heuristic: Does it look like a quiz?
                const hasQuestion = keys.some(k => k.includes('question') || k.includes('题目') || k === 'q');
                
                if (!hasQuestion) {
                    // Not a standard quiz CSV, fallback to AI text processing
                    resolve(null);
                    return;
                }

                const questions: QuizQuestion[] = rows.map((row: any, index: number) => {
                    // Map fields
                    const getVal = (keywords: string[]) => {
                        for (const key in row) {
                            if (keywords.some(kw => key.toLowerCase().includes(kw))) {
                                return row[key]?.toString().trim();
                            }
                        }
                        return null;
                    };
                    
                    // Simple Options Mapping (A, B, C, D or Option A, etc)
                    const options = [];
                    const optA = getVal(['option a', 'option_a', 'choice a', 'a)', 'a.']);
                    const optB = getVal(['option b', 'option_b', 'choice b', 'b)', 'b.']);
                    const optC = getVal(['option c', 'option_c', 'choice c', 'c)', 'c.']);
                    const optD = getVal(['option d', 'option_d', 'choice d', 'd)', 'd.']);
                    
                    // Specific check for single column "A" "B" etc
                    const rawOptA = row['A'] || row['a'];
                    const rawOptB = row['B'] || row['b'];
                    const rawOptC = row['C'] || row['c'];
                    const rawOptD = row['D'] || row['d'];

                    if(rawOptA) options.push(rawOptA); else if (optA) options.push(optA);
                    if(rawOptB) options.push(rawOptB); else if (optB) options.push(optB);
                    if(rawOptC) options.push(rawOptC); else if (optC) options.push(optC);
                    if(rawOptD) options.push(rawOptD); else if (optD) options.push(optD);

                    return {
                        id: `csv-${index}`,
                        type: options.length > 0 ? 'single' : 'text',
                        question: getVal(['question', '题目', 'q', 'content']) || 'Untitled Question',
                        options: options.length > 0 ? options : undefined,
                        correctAnswer: getVal(['answer', 'correct', 'ans', '答案']),
                        explanation: getVal(['explanation', '解析', 'reason']) || ''
                    };
                }).filter((q: QuizQuestion) => q.question);

                if (questions.length === 0) {
                    resolve(null);
                    return;
                }

                resolve({
                    id: `imported-csv-${Date.now()}`,
                    title: file.name.replace('.csv', ''),
                    description: 'Imported from CSV',
                    questions: questions,
                    isGraded: false
                });
            },
            error: (err: any) => {
                console.warn("CSV Parse Error", err);
                resolve(null);
            }
        });
    });
};

// PDF Processing
export const processPdfFile = async (file: File, apiKey?: string): Promise<string> => {
  try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Use the imported module, handling potential default export wrapper
      const docInit = pdfjs.default?.getDocument ? pdfjs.default.getDocument : pdfjs.getDocument;
      const pdf = await docInit({ data: arrayBuffer }).promise;
      
      let fullText = "";
      let useVision = false;

      // First pass: Try to extract text normally
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        
        // Heuristic: If page has very little text, it might be a scan/image
        if (pageText.trim().length < 50) {
          useVision = true;
          // If we don't have an API key (e.g. bulk directory read), we can't use vision.
          if (apiKey) break; 
        }
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }

      // If detected as scan and we have an API Key, use Vision Model
      if (useVision && apiKey) {
        fullText = ""; // Reset
        const ai = new GoogleGenAI({ apiKey });
        
        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to 5 pages for demo performance
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context!, viewport: viewport }).promise;
          const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                parts: [
                  { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                  { text: "Transcribe the text in this document image to Markdown exactly. Preserve numbering." }
                ]
              }
            });
            fullText += `--- Page ${i} (OCR) ---\n${response.text}\n\n`;
          } catch (e) {
            console.error(`Error processing page ${i} with vision:`, e);
            fullText += `[Error processing page ${i} with AI Vision]\n`;
          }
        }
        if (pdf.numPages > 5) {
          fullText += `\n... (PDF truncated at 5 pages for efficiency in this demo) ...`;
        }
      } else if (useVision && !apiKey) {
        // Graceful fallback for directory reads
        fullText += "\n[Note: Some pages appear to be scanned images. Open individual file and provide API Key for OCR.]";
      }

      return fullText;
  } catch (e: any) {
      console.error("PDF Process Error", e);
      return `[Error processing PDF: ${e.message}]`;
  }
};
