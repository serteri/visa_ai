const fs = require('fs');

let code = fs.readFileSync('app/[locale]/checker/page.tsx', 'utf8');

// Update input classes
code = code.replace(/h-14 w-full rounded-xl border border-border bg-card px-4 text-base shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500\/20/g, 
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20");

code = code.replace(/h-14 w-full rounded-xl border border-destructive bg-card px-4 text-base shadow-sm outline-none transition-all focus-visible:border-destructive focus-visible:ring-4 focus-visible:ring-destructive\/20/g,
  "h-11 w-full rounded-lg border border-destructive bg-white px-3 text-sm shadow-sm outline-none transition-all focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20");

code = code.replace(/h-14 w-full rounded-xl border bg-card px-4 text-base shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500\/20 \${/g,
  `h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 \${`);

code = code.replace(/"border-destructive focus-visible:border-destructive focus-visible:ring-destructive\/20" : "border-border"/g,
  `"border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-gray-200"`);

// Replace layout structure
// We will replace from `<main className="ambient-bg flex-1 py-12">`
// up to `{quickCheckVisible && (`

const startMarker = '<main className="ambient-bg flex-1 py-12">';
const endMarker = '{quickCheckVisible && (';

const newStructure = `<main className="flex-1 bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                {t("checker.heading")}
              </p>
              <h1 className="text-3xl font-bold text-slate-900">{t("checker.title")}</h1>
              <p className="text-sm text-slate-500">
                {t("checker.subtitle")}
              </p>
            </div>

            {quickCheckVisible ? (
`;

let startIndex = code.indexOf(startMarker);
let endIndex = code.indexOf(endMarker);

if(startIndex !== -1 && endIndex !== -1) {
    let replaced = code.substring(0, startIndex) + newStructure + code.substring(endIndex + endMarker.length);
    code = replaced;
}

// Now replace the Card wrapper of the form
code = code.replace('<div className="relative mt-8">\n          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur-2xl"></div>\n          <Card id="quick-pathway-check" className="relative border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-black/40">',
  '<div id="quick-pathway-check" className="bg-white/60 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8">');

// Since we replaced the top wrapper, we need to find the ending tags of the form
// The form previously ended with `</Card>\n        </div>\n        )}`
// Then it had `<ComplianceNotice />` etc.
// We will replace `</Card>\n        </div>\n        )}` with `</div>\n            ) : (\n              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">\n                 <p className="text-slate-500">Please select an option from the right to begin.</p>\n              </div>\n            )}`

code = code.replace('</Card>\n        </div>\n        )}',
  `</div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                   <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </div>
                 <h3 className="mb-2 text-lg font-medium text-slate-900">Select an option</h3>
                 <p className="text-sm text-slate-500">Please select an assessment option from the right panel to begin.</p>
              </div>
            )}
            
            <p className="text-center text-xs text-slate-400">
              {choiceCopy.compliance}
            </p>
          </div>
          
          {/* Right Column: Choices */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-5">
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">{choiceCopy.quickTitle}</CardTitle>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">{choiceCopy.quickLabel}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {choiceCopy.quickDescription}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Button asChild variant="outline" className="w-full border-gray-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                    <Link
                      href={\`/\${locale}/checker?quick=1#quick-pathway-check\`}
                      onClick={() => setShowQuickCheck(true)}
                    >
                      {choiceCopy.quickButton}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/10">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base text-indigo-900">{choiceCopy.fullTitle}</CardTitle>
                    <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">{choiceCopy.fullLabel}</Badge>
                  </div>
                  <p className="text-sm text-indigo-700/80">
                    {choiceCopy.fullDescription}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Button asChild className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                    <Link href={\`/\${locale}/full-check\`}>{choiceCopy.fullButton}</Link>
                  </Button>
                  <p className="text-center text-xs font-medium text-indigo-600/80">{choiceCopy.fullTrustNote}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
`
);

// Remove the old `<ComplianceNotice />` and footer that was previously after the form
// since we integrated it or cleaned it.
code = code.replace(/<ComplianceNotice \/>\s*<p className="text-center text-sm text-muted-foreground">[\s\S]*<\/p>\s*<\/section>\s*<\/main>/, '');

fs.writeFileSync('app/[locale]/checker/page.tsx', code);
console.log('Checker layout updated');
