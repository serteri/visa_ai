const base = "https://anzsco.com.au";

function uniq(arr) {
  return [...new Set(arr)];
}

const html = await (await fetch(`${base}/search`)).text();
const scriptSrcs = uniq(
  [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s.endsWith(".js"))
);

console.log("scriptCount", scriptSrcs.length);

const interestingStrings = [
  "anzsco_code",
  "occupation_name",
  "/api/",
  "occupations",
  ".json",
  ".csv",
  "MLTSSL",
  "STSOL",
  "ROL",
  "_next/data",
];

for (const src of scriptSrcs) {
  const url = src.startsWith("http") ? src : `${base}${src}`;
  try {
    const txt = await (await fetch(url)).text();
    const hitMap = {};
    for (const key of interestingStrings) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const count = (txt.match(new RegExp(escaped, "g")) || []).length;
      if (count > 0) hitMap[key] = count;
    }

    const hasStrongSignal =
      hitMap["anzsco_code"] ||
      hitMap["occupation_name"] ||
      hitMap["/api/"] ||
      hitMap["occupations"] ||
      hitMap["_next/data"];

    if (!hasStrongSignal) continue;

    console.log("---", url);
    console.log(JSON.stringify(hitMap));

    const urls = uniq(txt.match(/https?:\/\/[^\"'\s)]+/g) || []).filter(
      (u) =>
        u.includes("anzsco") ||
        u.includes("api") ||
        u.includes(".json") ||
        u.includes(".csv") ||
        u.includes("_next/data")
    );
    if (urls.length) {
      console.log("embeddedUrls", JSON.stringify(urls.slice(0, 30)));
    }

    const paths = uniq(txt.match(/\/(api|_next\/data)\/[A-Za-z0-9_\-./]+/g) || []);
    if (paths.length) {
      console.log("embeddedPaths", JSON.stringify(paths.slice(0, 40)));
    }
  } catch (err) {
    console.log("ERR", url, String(err));
  }
}
