import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type AnalysisMilestone =
  | "scanning_occupations"
  | "analyzing_trends"
  | "applying_deductions"
  | "generating_report"
  | "completed"
  | "error";

type ProgressSnapshot = {
  milestone: AnalysisMilestone;
  message?: string;
  updatedAt: number;
};

const progressDir = path.join(process.cwd(), ".next", "cache", "full-check-progress");

const STALE_AFTER_MS = 10 * 60 * 1000;

function now(): number {
  return Date.now();
}

async function ensureDir() {
  await mkdir(progressDir, { recursive: true });
}

function progressFilePath(id: string): string {
  return path.join(progressDir, `${id}.json`);
}

async function writeSnapshot(id: string, snapshot: ProgressSnapshot) {
  await ensureDir();
  await writeFile(progressFilePath(id), JSON.stringify(snapshot), "utf8");
}

export async function initFullCheckProgress(id: string) {
  await writeSnapshot(id, {
    milestone: "scanning_occupations",
    updatedAt: now(),
  });
}

export async function updateFullCheckProgress(id: string, milestone: Exclude<AnalysisMilestone, "completed" | "error">) {
  await writeSnapshot(id, {
    milestone,
    updatedAt: now(),
  });
}

export async function completeFullCheckProgress(id: string) {
  await writeSnapshot(id, {
    milestone: "completed",
    updatedAt: now(),
  });
}

export async function failFullCheckProgress(id: string, message?: string) {
  await writeSnapshot(id, {
    milestone: "error",
    message,
    updatedAt: now(),
  });
}

export async function getFullCheckProgress(id: string): Promise<ProgressSnapshot | null> {
  try {
    const filePath = progressFilePath(id);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as ProgressSnapshot;
    if (!parsed?.updatedAt || now() - parsed.updatedAt > STALE_AFTER_MS) {
      await rm(filePath, { force: true });
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
