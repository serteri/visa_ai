import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

type DocumentType = "Passport" | "English Test" | "Skills Assessment" | "Unknown";
type ValidationStatus = "VALID" | "EXPIRED" | "MISMATCH";

type AnalysisResult = {
  documentType: DocumentType;
  extractedFields: Record<string, unknown>;
  validationStatus: ValidationStatus;
  reasoning: string;
};

type LeadData = {
  fullName?: string;
  email?: string;
  occupation?: string;
  englishLevel?: string;
  age?: string;
  currentCountry?: string;
  targetVisa?: string;
};

const SYSTEM_PROMPT =
  "You are an expert Australian Migration Document Validator. Extract information from the provided document. Determine the document type (Passport, English Test, Skills Assessment). Compare the extracted data against the provided 'leadData'. Return a strict JSON containing: 1. documentType, 2. extractedFields (e.g., expiry date, test scores), 3. validationStatus ('VALID', 'EXPIRED', 'MISMATCH'), 4. reasoning.";

export const runtime = "nodejs";

function toDataUrl(mimeType: string, bytes: ArrayBuffer): string {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseOpenAiJson(raw: string): AnalysisResult | null {
  const trimmed = raw.trim();
  const noFence = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(noFence) as Partial<AnalysisResult>;
    if (!parsed || typeof parsed !== "object") return null;

    const documentType: DocumentType =
      parsed.documentType === "Passport" ||
      parsed.documentType === "English Test" ||
      parsed.documentType === "Skills Assessment"
        ? parsed.documentType
        : "Unknown";

    const validationStatus: ValidationStatus =
      parsed.validationStatus === "VALID" ||
      parsed.validationStatus === "EXPIRED" ||
      parsed.validationStatus === "MISMATCH"
        ? parsed.validationStatus
        : "MISMATCH";

    return {
      documentType,
      extractedFields:
        parsed.extractedFields && typeof parsed.extractedFields === "object"
          ? (parsed.extractedFields as Record<string, unknown>)
          : {},
      validationStatus,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "AI analysis completed.",
    };
  } catch {
    return null;
  }
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length < 6) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const normalized = value.replace(/\./g, "-").replace(/\//g, "-").trim();
  const parts = normalized.split("-").map((part) => part.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      const iso = new Date(`${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`);
      if (!Number.isNaN(iso.getTime())) return iso;
    }
    if (c.length === 4) {
      const dmy = new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
      if (!Number.isNaN(dmy.getTime())) return dmy;
    }
  }

  return null;
}

function extractScore(text?: string): number | null {
  if (!text) return null;
  const matches = text.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const asNumber = Number(matches[matches.length - 1]);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function resolveValidation(analysis: AnalysisResult, leadData: LeadData): AnalysisResult {
  const fields = analysis.extractedFields;

  if (analysis.documentType === "Passport") {
    const expiryCandidates = [
      fields.expiryDate,
      fields.expiry,
      fields.passportExpiry,
      fields.documentExpiry,
    ];

    const expiryDate = expiryCandidates.map(parseDate).find((value) => value !== null) ?? null;
    if (expiryDate) {
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (expiryDate.getTime() <= Date.now()) {
        return {
          ...analysis,
          validationStatus: "EXPIRED",
          reasoning: `${analysis.reasoning} Passport expiry appears in the past.`,
        };
      }
      if (expiryDate.getTime() > sixMonthsLater.getTime()) {
        return {
          ...analysis,
          validationStatus: "VALID",
          reasoning: `${analysis.reasoning} Passport validity is longer than 6 months.`,
        };
      }
      return {
        ...analysis,
        validationStatus: "MISMATCH",
        reasoning: `${analysis.reasoning} Passport is not expired but has less than 6 months validity.`,
      };
    }
  }

  if (analysis.documentType === "English Test") {
    const declared = extractScore(leadData.englishLevel);
    const extractedCandidates: unknown[] = [
      fields.overallScore,
      fields.overall,
      fields.pteOverall,
      fields.ieltsOverall,
      fields.score,
      fields.listening,
      fields.reading,
      fields.writing,
      fields.speaking,
    ];
    const extracted = extractedCandidates
      .map((candidate) => (typeof candidate === "number" ? candidate : extractScore(String(candidate ?? ""))))
      .find((score) => typeof score === "number" && Number.isFinite(score));

    if (declared !== null && typeof extracted === "number") {
      if (Math.abs(declared - extracted) < 0.001) {
        return {
          ...analysis,
          validationStatus: "VALID",
          reasoning: `${analysis.reasoning} Test score matches declared lead data.`,
        };
      }
      return {
        ...analysis,
        validationStatus: "MISMATCH",
        reasoning: `${analysis.reasoning} Inconsistency detected: declared score ${declared}, extracted score ${extracted}.`,
      };
    }
  }

  return analysis;
}

async function callOpenAiForAnalysis(args: {
  file: File;
  leadData: LeadData;
}): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const mimeType = args.file.type || "application/octet-stream";
  const fileBytes = await args.file.arrayBuffer();

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: [
        "Analyze the document and compare against this leadData JSON:",
        JSON.stringify(args.leadData),
        "",
        "Return ONLY a strict JSON object with keys: documentType, extractedFields, validationStatus, reasoning.",
      ].join("\n"),
    },
  ];

  if (mimeType.startsWith("image/")) {
    content.push({
      type: "image_url",
      image_url: {
        url: toDataUrl(mimeType, fileBytes),
      },
    });
  } else if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: Buffer.from(fileBytes) });
    const parsedPdf = await parser.getText();
    await parser.destroy();
    content.push({
      type: "text",
      text: [
        "PDF extracted text:",
        parsedPdf.text.slice(0, 14000),
      ].join("\n"),
    });
  } else {
    throw new Error("Unsupported file format. Upload an image or PDF.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider error: ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const contentText = json.choices?.[0]?.message?.content;
  if (!contentText) {
    throw new Error("No analysis content received from AI provider.");
  }

  const parsed = parseOpenAiJson(contentText);
  if (!parsed) {
    throw new Error("AI response is not valid JSON for analysis schema.");
  }

  return resolveValidation(parsed, args.leadData);
}

function getLeadData(raw: FormDataEntryValue | null): LeadData {
  if (typeof raw !== "string") return {};
  return safeJsonParse<LeadData>(raw, {});
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!fileEntry.type.startsWith("image/") && fileEntry.type !== "application/pdf") {
      return NextResponse.json({ error: "Only image and PDF files are supported." }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024;
    if (fileEntry.size > maxBytes) {
      return NextResponse.json({ error: "File is too large. Max 10MB." }, { status: 400 });
    }

    const leadData = getLeadData(formData.get("leadData"));
    const analysis = await callOpenAiForAnalysis({ file: fileEntry, leadData });

    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
