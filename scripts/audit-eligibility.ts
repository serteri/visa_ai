/**
 * audit-eligibility.ts
 * --------------
 * Göçmenlik uygunluğu veri denetim scripti — src/data/occupations.json üzerinde çalışır.
 *
 * GÖREV 1 — Eligibility Testi: toplam meslek, isEligibleForMigration sayımları,
 *          false olanlarda anzscoVersion / lists alanlarının null|undefined kontrolü.
 * GÖREV 2 — Versiyon Etiketi Testi: true olanlarda anzscoVersion tipi,
 *          tekil string -> array normalizasyonu, liste-kuralı doğrulaması
 *          (MLTSSL/STSOL/ROL -> 2013, CSOL -> 2022).
 * GÖREV 3 — Sonuç Raporu: yalnız 2013 / yalnız 2022 / her ikisi sayıları ve schema onayı.
 *
 * Not: Script salt-okunur bir denetimdir; kaynak JSON dosyasına YAZMAZ.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = path.resolve(__dirname, '../src/data/occupations.json');

type VersionValue = string | string[] | null | undefined;

interface Occupation {
  anzsco_code?: string;
  anzscoCode?: string;
  occupation_name?: string;
  title?: string;
  isEligibleForMigration?: boolean;
  anzscoVersion?: VersionValue;
  visa_lists?: string[];
  lists?: string[];
  [key: string]: unknown;
}

const TARGET_ELIGIBLE = 693;
const KNOWN_LISTS = ['MLTSSL', 'STSOL', 'ROL', 'CSOL'];

// ---------- Yardımcılar ----------

function readData(): { occupations: Occupation[] } {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as { occupations?: Occupation[] };
  if (!parsed.occupations || !Array.isArray(parsed.occupations)) {
    throw new Error(`Beklenen "occupations" dizisi bulunamadı: ${DATA_PATH}`);
  }
  return parsed as { occupations: Occupation[] };
}

function getCode(o: Occupation): string {
  return (o.anzsco_code ?? o.anzscoCode ?? '').toString();
}

function getName(o: Occupation): string {
  return (o.occupation_name ?? o.title ?? '').toString();
}

function getLists(o: Occupation): string[] {
  const lists = (o.lists ?? o.visa_lists) as string[] | undefined;
  return Array.isArray(lists) ? lists : [];
}

function isEligible(o: Occupation): boolean {
  return o.isEligibleForMigration === true;
}

/** anzscoVersion değerini her zaman string[]'e normalize eder. null/undefined -> null. */
function normalizeVersion(v: VersionValue): string[] | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    return v.length === 0 ? null : v.map((x) => String(x));
  }
  return [String(v)];
}

/** Liste-kuralından beklenen versiyon seti. Bilinen liste yoksa null döner (kural uygulanamaz). */
function expectedVersions(lists: string[]): Set<string> | null {
  const exp = new Set<string>();
  let hasKnown = false;
  if (lists.includes('MLTSSL') || lists.includes('STSOL') || lists.includes('ROL')) {
    exp.add('2013');
    hasKnown = true;
  }
  if (lists.includes('CSOL')) {
    exp.add('2022');
    hasKnown = true;
  }
  return hasKnown ? exp : null;
}

// ---------- GÖREV 1 — Eligibility Testi ----------

function runEligibilityTest(occupations: Occupation[]) {
  console.log('\n' + '='.repeat(72));
  console.log('GÖREV 1 — ELIGIBILITY TESTİ (Eligibility Test)');
  console.log('='.repeat(72));

  const total = occupations.length;
  const eligible = occupations.filter(isEligible);
  const notEligible = occupations.filter((o) => !isEligible(o));

  console.log(`  Toplam meslek sayısı                      : ${total}`);
  console.log(`  isEligibleForMigration = true             : ${eligible.length} (hedef: ${TARGET_ELIGIBLE})`);

  const targetOk = eligible.length === TARGET_ELIGIBLE;
  console.log(`    → Hedef kontrolü: ${targetOk ? 'PASS ✔' : 'FAIL ✘'}`);

  console.log(`  isEligibleForMigration = false            : ${notEligible.length}`);

  // false olanlarda anzscoVersion / lists alanlarının null|undefined olması bekleniyor
  const falseNullVersion = notEligible.filter((o) => normalizeVersion(o.anzscoVersion) === null);
  const falseNullLists = notEligible.filter((o) => getLists(o).length === 0 && (o.visa_lists == null || o.lists == null));
  // Asıl anlam: alanın hiç tanımlı olmaması (undefined) ya da null olması
  const falseUndefVersion = notEligible.filter((o) => o.anzscoVersion === null || o.anzscoVersion === undefined);
  const falseUndefLists = notEligible.filter((o) => (o.visa_lists === null || o.visa_lists === undefined) && (o.lists === null || o.lists === undefined));

  console.log(`  [Beklenti] false olanlarda anzscoVersion null/undefined olmalı  → toplam: ${notEligible.length}, uyan: ${falseUndefVersion.length}`);
  const verOk = falseUndefVersion.length === notEligible.length;
  console.log(`    → Sonuç: ${verOk ? 'PASS ✔' : 'FAIL ✘'}`);
  if (!verOk) {
    const detail = notEligible.filter((o) => o.anzscoVersion !== null && o.anzscoVersion !== undefined).slice(0, 5);
    console.log(`    → Örnek (null/undefined OLMAYAN false kayıtlar):`);
    detail.forEach((o) =>
      console.log(`      ${getCode(o)} | ${getName(o)} | anzscoVersion=${JSON.stringify(o.anzscoVersion)} | visa_lists=${JSON.stringify(getLists(o))}`)
    );
    if (notEligible.length - falseUndefVersion.length > 5) {
      console.log(`      ... ve ${notEligible.length - falseUndefVersion.length - 5} kayıt daha`);
    }
  }

  console.log(`  [Beklenti] false olanlarda lists null/undefined olmalı         → toplam: ${notEligible.length}, uyan: ${falseUndefLists.length}`);
  const listOk = falseUndefLists.length === notEligible.length;
  console.log(`    → Sonuç: ${listOk ? 'PASS ✔' : 'FAIL ✘'}`);

  return { total, eligibleCount: eligible.length, notEligibleCount: notEligible.length, targetOk, verOk, listOk };
}

// ---------- GÖREV 2 — Versiyon Etiketi Testi ----------

function runVersionTest(occupations: Occupation[]) {
  console.log('\n' + '='.repeat(72));
  console.log('GÖREV 2 — VERSİYON ETİKETİ TESTİ (Version Tag Test)');
  console.log('='.repeat(72));

  const eligible = occupations.filter(isEligible);

  // a) anzscoVersion array mi?
  const asArray = eligible.filter((o) => Array.isArray(o.anzscoVersion));
  const asString = eligible.filter((o) => typeof o.anzscoVersion === 'string');
  const asMissing = eligible.filter((o) => o.anzscoVersion === null || o.anzscoVersion === undefined);
  console.log(`  isEligible=true mesleklerde anzscoVersion tipleri:`);
  console.log(`    Array   : ${asArray.length}`);
  console.log(`    String  : ${asString.length}`);
  console.log(`    null/undef: ${asMissing.length}`);
  console.log(`    → "array olmalı" kontrolü: ${asArray.length === eligible.length ? 'PASS ✔' : 'FAIL ✘ (string->array normalizasyonu gerekli)'}`);

  // b) Tekil string -> array'e çevir (in-memory normalizasyon)
  const normalized = new Map<Occupation, string[] | null>();
  let converted = 0;
  eligible.forEach((o) => {
    const before = o.anzscoVersion;
    const after = normalizeVersion(before);
    normalized.set(o, after);
    if (typeof before === 'string') converted++;
  });
  console.log(`  String -> array'e çevrilen kayıt sayısı   : ${converted} (örn: "2022" -> ["2022"])`);

  // c) Liste-kuralı doğrulaması: MLTSSL/STSOL/ROL -> ["2013"], CSOL -> ["2022"]
  let ruleOk = 0;
  let ruleFail = 0;
  let noRule = 0;
  const failures: { code: string; name: string; lists: string[]; actual: string[] | null; expected: Set<string> | null }[] = [];

  eligible.forEach((o) => {
    const lists = getLists(o);
    const actual = normalized.get(o) ?? null;
    const expected = expectedVersions(lists);
    if (!expected) {
      noRule++;
      return;
    }
    const actualSet = new Set(actual ?? []);
    const matches =
      actual !== null &&
      actualSet.size === expected.size &&
      [...expected].every((v) => actualSet.has(v));
    if (matches) ruleOk++;
    else {
      ruleFail++;
      failures.push({ code: getCode(o), name: getName(o), lists, actual, expected });
    }
  });

  console.log(`  Liste-kuralı (MLTSSL/STSOL/ROL->2013, CSOL->2022):`);
  console.log(`    Uyan     : ${ruleOk}`);
  console.log(`    Uymayan  : ${ruleFail}`);
  console.log(`    Kural dışı (bilinen liste yok): ${noRule}`);
  console.log(`    → Sonuç: ${ruleFail === 0 ? 'PASS ✔' : 'FAIL ✘'}`);
  if (failures.length > 0) {
    console.log('    Örnek uyumsuzluklar:');
    failures.slice(0, 8).forEach((f) =>
      console.log(`      ${f.code} | ${f.name} | lists=${JSON.stringify(f.lists)} | gerçek=${JSON.stringify(f.actual)} | beklenen=${JSON.stringify([...f.expected])}`)
    );
    if (failures.length > 8) console.log(`      ... ve ${failures.length - 8} uyumsuzluk daha`);
  }

  return { normalized, eligibleCount: eligible.length, ruleOk, ruleFail, noRule, converted, asArrayCount: asArray.length };
}

// ---------- GÖREV 3 — Sonuç Raporu ----------

function runReport(occupations: Occupation[], normalized: Map<Occupation, string[] | null>) {
  console.log('\n' + '='.repeat(72));
  console.log('GÖREV 3 — SONUÇ RAPORU (Final Report)');
  console.log('='.repeat(72));

  const eligible = occupations.filter(isEligible);

  let only2013 = 0;
  let only2022 = 0;
  let both = 0;
  let other = 0;

  eligible.forEach((o) => {
    const v = normalized.get(o);
    if (!v) {
      other++;
      return;
    }
    const has13 = v.includes('2013');
    const has22 = v.includes('2022');
    if (has13 && has22) both++;
    else if (has13) only2013++;
    else if (has22) only2022++;
    else other++;
  });

  console.log(`  Yalnız 2013 versiyonu destekleyen   : ${only2013}`);
  console.log(`  Yalnız 2022 versiyonu destekleyen   : ${only2022}`);
  console.log(`  Her iki versiyonu destekleyen       : ${both}`);
  console.log(`  Versiyonu tanımsız / diğer         : ${other}`);
  console.log(`  Toplam (eligible)                  : ${eligible.length}`);

  // Schema (Veri Yapısı) onayı
  const allFields = ['anzsco_code/anzscoCode', 'occupation_name/title', 'isEligibleForMigration', 'anzscoVersion', 'lists/visa_lists'];
  const missing = {
    code: occupations.filter((o) => getCode(o) === '').length,
    name: occupations.filter((o) => getName(o) === '').length,
    flag: occupations.filter((o) => typeof o.isEligibleForMigration !== 'boolean').length,
    version: occupations.filter((o) => o.anzscoVersion === null || o.anzscoVersion === undefined).length,
    lists: occupations.filter((o) => (o.visa_lists === null || o.visa_lists === undefined) && (o.lists === null || o.lists === undefined)).length,
  };
  console.log(`  Schema onayı (tüm ${occupations.length} kayıt):`);
  console.log(`    anzsco_code  eksik : ${missing.code}`);
  console.log(`    occupation_name eksik: ${missing.name}`);
  console.log(`    isEligibleForMigration non-boolean: ${missing.flag}`);
  console.log(`    anzscoVersion eksik : ${missing.version}`);
  console.log(`    lists        eksik : ${missing.lists}`);
  const schemaOk = Object.values(missing).every((n) => n === 0);
  console.log(`    → Schema onayı: ${schemaOk ? 'BAŞARILI ✔' : 'BAŞARISIZ ✘'}`);

  return { only2013, only2022, both, schemaOk };
}

// ---------- Ana akış ----------

function main() {
  console.log('Eligibility / Versiyon Denetim Scripti');
  console.log(`Kaynak: ${DATA_PATH}`);
  const { occupations } = readData();

  const eligRes = runEligibilityTest(occupations);
  const verRes = runVersionTest(occupations);
  const repRes = runReport(occupations, verRes.normalized);

  // ---------- Özet ----------
  console.log('\n' + '='.repeat(72));
  console.log('ÖZET');
  console.log('='.repeat(72));
  console.log(`  Toplam meslek                 : ${eligRes.total}`);
  console.log(`  Eligible (true)               : ${eligRes.eligibleCount} / hedef ${TARGET_ELIGIBLE} → ${eligRes.targetOk ? 'PASS' : 'FAIL'}`);
  console.log(`  Eligible (false)              : ${eligRes.notEligibleCount}`);
  console.log(`  false → anzscoVersion null/undef: ${eligRes.verOk ? 'PASS' : 'FAIL'}`);
  console.log(`  false → lists null/undef      : ${eligRes.listOk ? 'PASS' : 'FAIL'}`);
  console.log(`  anzscoVersion string→array    : ${verRes.converted} kayıt çevrildi`);
  console.log(`  Liste-kuralı uyumu            : ${verRes.ruleOk} uyan / ${verRes.ruleFail} uymayan → ${verRes.ruleFail === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  Yalnız 2013 / Yalnız 2022 / İkisi: ${repRes.only2013} / ${repRes.only2022} / ${repRes.both}`);
  console.log(`  Schema onayı                  : ${repRes.schemaOk ? 'BAŞARILI' : 'BAŞARISIZ'}`);
  console.log('\nNot: Script salt-okunurdur; occupations.json dosyası DEĞİŞTİRİLMEDİ.');
}

main();
