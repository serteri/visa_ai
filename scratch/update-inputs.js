const fs = require('fs');
let code = fs.readFileSync('app/[locale]/checker/page.tsx', 'utf8');

// Replace select classes
code = code.replace(
  '// Shared select class\nconst selectCls =\n  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60";\nconst selectErrorCls =\n  "h-10 w-full rounded-md border border-destructive bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60";',
  `// Shared select class
const selectCls =
  "h-14 w-full rounded-xl border border-border bg-card px-4 text-base shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20";
const selectErrorCls =
  "h-14 w-full rounded-xl border border-destructive bg-card px-4 text-base shadow-sm outline-none transition-all focus-visible:border-destructive focus-visible:ring-4 focus-visible:ring-destructive/20";

const getInputCls = (isErr: boolean) => 
  \`h-14 rounded-xl text-base transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20 \${
    isErr ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-border"
  }\`;`
);

// Replace Card wrapper
code = code.replace(
  '{quickCheckVisible && (\n        <Card id="quick-pathway-check">',
  `{quickCheckVisible && (
        <div className="relative mt-8">
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur-2xl"></div>
          <Card id="quick-pathway-check" className="relative border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-black/40">`
);

code = code.replace(
  '</Card>\n        )}',
  '</Card>\n        </div>\n        )}'
);

// Replace Inputs
code = code.replace(/className=\{err\.([a-zA-Z0-9_]+)\s*\?\s*"border-destructive"\s*:\s*""\}/g, 'className={getInputCls(!!err.$1)}');

fs.writeFileSync('app/[locale]/checker/page.tsx', code);
console.log('Done!');
