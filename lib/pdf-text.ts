/**
 * Text of a PDF, page by page. unpdf (a serverless build of pdf.js) is imported here, inside the function, never at module level: a PDF library that
 * expects browser globals (DOMMatrix) must not be evaluated when a route or page bundle loads (production regression since 58dae80).
 */
export class PdfReadError extends Error {
  constructor(message = "The PDF could not be read.") {
    super(message);
    this.name = "PdfReadError";
  }
}

export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  } catch {
    throw new PdfReadError();
  }
}
