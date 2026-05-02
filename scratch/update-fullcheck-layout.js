const fs = require('fs');

// 1. Update full-check/page.tsx
let pageCode = fs.readFileSync('app/[locale]/full-check/page.tsx', 'utf8');

// The layout replacement
pageCode = pageCode.replace(
  '<div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.5fr_1fr] items-start">\n          {/* Glassmorphism Form Container */}\n          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">\n            <div className="pointer-events-none absolute -mr-16 -mt-16 right-0 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-[50px]"></div>',
  `<div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          {/* Form Container */}
          <div className="lg:col-span-7 bg-white/60 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8">`
);

// Update badge pill shape
pageCode = pageCode.replace(
  'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium'
);

// Update right sidebar
pageCode = pageCode.replace(
  '{/* Sidebar: What you\'ll get */}\n          <div className="space-y-6">',
  `{/* Sidebar: What you'll get */}
          <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">`
);

fs.writeFileSync('app/[locale]/full-check/page.tsx', pageCode);
console.log('full-check/page.tsx updated');

// 2. Update full-check-waitlist-form.tsx
let formCode = fs.readFileSync('app/[locale]/full-check/full-check-waitlist-form.tsx', 'utf8');

// Standardize Input and Textarea to the Vercel minimal style
const oldInputClass = 'className="h-12 w-full rounded-xl border border-white/40 bg-white/50 px-4 shadow-sm backdrop-blur-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20"';
const newInputClass = 'className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"';

formCode = formCode.replace(/className="h-12 w-full rounded-xl border border-white\/40 bg-white\/50 px-4 shadow-sm backdrop-blur-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500\/20"/g, newInputClass);

const oldTextareaClass = 'className="min-h-[100px] w-full rounded-xl border border-white/40 bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20"';
const newTextareaClass = 'className="min-h-[100px] w-full rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"';

formCode = formCode.replace(/className="min-h-\[100px\] w-full rounded-xl border border-white\/40 bg-white\/50 p-4 shadow-sm backdrop-blur-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500\/20"/g, newTextareaClass);

// Check if there are any other inputs like select
const oldSelectClass = 'className="h-12 w-full rounded-xl border border-white/40 bg-white/50 px-4 shadow-sm backdrop-blur-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20"';
formCode = formCode.replace(/className="h-12 w-full rounded-xl border border-white\/40 bg-white\/50 px-4 shadow-sm backdrop-blur-sm transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500\/20"/g, newInputClass);

fs.writeFileSync('app/[locale]/full-check/full-check-waitlist-form.tsx', formCode);
console.log('full-check-waitlist-form.tsx updated');
