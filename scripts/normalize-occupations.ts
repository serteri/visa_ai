/**
 * normalize-occupations.ts
 * ------------------------
 * src/data/occupations.json verisini üç kuralla normalize eder:
 *
 *   KURAL 1 — isEligibleForMigration:false olan (çöp) kayıtlarda
 *             anzscoVersion, visa_lists ve authority alanlarını null yapar.
 *   KURAL 2 — isEligibleForMigration:true olan kayıtlarda anzscoVersion'ı
 *             string'den array'e çevirir (örn: "2022" -> ["2022"]).
 *   KURAL 3 — Liste kuralına göre versiyonu belirler:
 *             - lists'te MLTSSL/STSOL/ROL varsa   -> ["2013"] eklenir
 *             - lists'te CSOL varsa              -> ["2022"] eklenir
 *             - ikisi de varsa                   -> ["2013", "2022"]
 *             Bilinen liste yoksa mevcut versiyon korunur.
 *
 * Run (yazar):       npx tsx scripts/normalize-occupations.ts
 * Run (deneme):      npx tsx scripts/normalize-occupations.ts --dry-run
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OCC_PATH = path.join(process.cwd(), "src/data/occupations.json");
const DRY_RUN = process.argv.includes("--dry-run");

type VersionValue = string | string[] | null | undefined;

interface Occupation {
  anzsco_code?: string;
  anzscoCode?: string;
  occupation_name?: string;
  title?: string;
  isEligibleForMigration?: boolean;
  anzscoVersion?: VersionValue;
  visa_lists?: string[] | null;
  lists?: string[] | null;
  authority?: string | null;
  [key: string]: unknown;
}

interface DataFile {
  generated_on: string;
  jurisdiction: string;
  currency_note: string;
  occupations: Occupation[];
}

// ── Kurallar ────────────────────────────────────────────────────────────────
const OLD_LISTS = new Set(["MLTSSL", "STSOL", "ROL"]);
const NEW_LIST = "CSOL";
const KNOWN_LISTS = new Set<string>([...OLD_LISTS, NEW_LIST]);

function getLists(o: Occupation): string[] {
  const lists = (o.visa_lists ?? o.lists) as string[] | null | undefined;
  return Array.isArray(lists) ? lists : [];
}

function toArray(v: VersionValue): string[] | null {
  if (v === null || v === undefined) return null;
  const arr = Array.isArray(v) ? v : [v];
  return arr.map((x) => String(x));
}

/** KURAL 3: bilinen liste yoksa null döner (mevcut değer korunmalıdır). */
function deriveVersion(lists: string[]): string[] | null {
  const hasOld = lists.some((l) => OLD_LISTS.has(l));
  const hasNew = lists.includes(NEW_LIST);
  if (!hasOld && !hasNew) return null;
  const res: string[] = [];
  if (hasOld) res.push("2013");
  if (hasNew) res.push("2022");
  return res;
}

// ── Veriyi yükle ────────────────────────────────────────────────────────────
const data = JSON.parse(readFileSync(OCC_PATH, "utf8")) as DataFile;
const occs = data.occupations;

// ── İşleme ──────────────────────────────────────────────────────────────────
let cleaned = 0; // KURAL 1: null yapılan false kayıt sayısı
let cleanedWithLists = 0; // false iken visa_lists dolu olup temizlenen
let cleanedWithAuth = 0; // false iken authority dolu olup temizlenen
let convertedToArray = 0; // KURAL 2: string -> array çevrilen
let alreadyArray = 0; // zaten array olan

for (const o of occs) {
  const eligible = o.isEligibleForMigration === true;

  if (!eligible) {
    // ── KURAL 1: çöp kayıtların göç verilerini temizle ──
    if (o.anzscoVersion !== null && o.anzscoVersion !== undefined) cleaned++;
    if (getLists(o).length > 0) cleanedWithLists++;
    if (o.authority != null && o.authority !== "") cleanedWithAuth++;

    o.anzscoVersion = null;
    o.visa_lists = null;
    if ("lists" in o) o.lists = null;
    o.authority = null;
    continue;
  }

  // ── KURAL 2: string -> array ──
  if (typeof o.anzscoVersion === "string") convertedToArray++;
  else if (Array.isArray(o.anzscoVersion)) alreadyArray++;
  const existing = toArray(o.anzscoVersion);

  // ── KURAL 3: listeye göre versiyon ──
  const derived = deriveVersion(getLists(o));
  o.anzscoVersion = derived ?? existing ?? null;
}

// ── Final durum sayımı (yalnız eligible kayıtlar) ───────────────────────────
let v2013 = 0;
let v2022 = 0;
let vBoth = 0;
let vNone = 0;

for (const o of occs) {
  if (o.isEligibleForMigration !== true) continue;
  const v = toArray(o.anzscoVersion);
  if (!v) {
    vNone++;
    continue;
  }
  const has13 = v.includes("2013");
  const has22 = v.includes("2022");
  if (has13 && has22) vBoth++;
  else if (has13) v2013++;
  else if (has22) v2022++;
  else vNone++;
}

// ── Rapor ───────────────────────────────────────────────────────────────────
const total = occs.length;
const eligibleCount = occs.filter((o) => o.isEligibleForMigration === true).length;
const notEligibleCount = total - eligibleCount;

console.log("══════════════════════════════════════════════════════════════");
console.log("NORMALİZASYON ÖZETİ — src/data/occupations.json");
console.log("══════════════════════════════════════════════════════════════");
console.log(`  Toplam kayıt                    : ${total}`);
console.log(`  isEligibleForMigration = true   : ${eligibleCount}`);
console.log(`  isEligibleForMigration = false  : ${notEligibleCount}`);
console.log(`  ── KURAL 1 (false → null temizlik) ──`);
console.log(`  Null/temizlenen kayıt (tümü)    : ${cleaned} / ${notEligibleCount}`);
console.log(`    → visa_lists dolu olup temizlenen : ${cleanedWithLists}`);
console.log(`    → authority dolu olup temizlenen  : ${cleanedWithAuth}`);
console.log(`  ── KURAL 2 (string → array) ──`);
console.log(`  Array'e çevrilen kayıt          : ${convertedToArray}`);
console.log(`  Zaten array olan kayıt          : ${alreadyArray}`);
console.log(`  ── KURAL 3 (liste kuralı) ──`);
console.log(`  ["2013"] versiyonlu kayıt       : ${v2013}`);
console.log(`  ["2022"] versiyonlu kayıt       : ${v2022}`);
console.log(`  ["2013","2022"] versiyonlu kayıt: ${vBoth}`);
console.log(`  Versiyon korunan / null         : ${vNone}`);
console.log("══════════════════════════════════════════════════════════════");

if (DRY_RUN) {
  console.log("\n[dry-run] Hiçbir değişiklik yazılmadı.");
} else {
  writeFileSync(OCC_PATH, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n[SAVED] ${OCC_PATH} — ${total} kayıt yazıldı.`);
}
