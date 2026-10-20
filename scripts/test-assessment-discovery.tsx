import assert from "node:assert/strict";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SampleReportIntro } from "../components/landing/SampleReportSection";
import { HowItWorks } from "../components/landing/HowItWorks";
import { findBannedPhrases } from "../lib/seo/banned-phrases";
import { AssessmentSection, ASSESSMENT_PRICE_LABEL } from "../components/landing/AssessmentSection";
import { AssessmentOverview } from "../components/assessment-overview";
import { assessmentStepErrors } from "../lib/intake/assessment-validation";
import { PREMIUM_PRICE_AUD_CENTS } from "../lib/pricing";
import { getCheckoutLineItem } from "../lib/stripe/line-items";
import { sanitizeParams } from "../lib/analytics/events";

const context = {fullName:"Synthetic Test",contactEmail:"test@example.com",targetCountry:"AU",currentCountry:"TR",passportCountry:"TR",age:"30",visaInterest:"189",employerSponsorship:"none"};
assert.deepEqual(assessmentStepErrors(1,context,false,true),{});
assert.equal(assessmentStepErrors(1,{...context,contactEmail:"wrong"},false,true).contactEmail,"email");
assert.equal(assessmentStepErrors(1,{...context,age:"-1"},false,true).age,"number");
assert.equal(assessmentStepErrors(1,{...context,currentCountry:"AU"},false,true).residenceState,"required");
assert.equal(assessmentStepErrors(2,{},false,true).occupation,"required");
assert.equal(Object.keys(assessmentStepErrors(2,{},true,true)).length,4);
assert.deepEqual(assessmentStepErrors(3,{englishLevel:"none",qualificationLevel:"Bachelor",sponsorOrFamily:"Not provided"},false,true),{});
assert.equal(assessmentStepErrors(3,{annualSalaryAud:"-5"},false,true).annualSalaryAud,"number");
assert.equal(assessmentStepErrors(3,{offshoreExperienceYears:"-1"},false,true).offshoreExperienceYears,"number");
assert.deepEqual(sanitizeParams({entry_source:"homepage",locale:"en",reportId:"private-report",report_id:"private-report",email:"test@example.com",occupation:"free text",answers:{age:30}}),{locale:"en",entry_source:"homepage"});
assert.deepEqual(sanitizeParams({entry_source:"someone@example.com",product_type:"arbitrary"}),{});
for(const locale of ["en","tr","zh-Hans"]){const home=renderToStaticMarkup(<AssessmentSection locale={locale}/>);const overview=renderToStaticMarkup(<AssessmentOverview locale={locale}/>);assert(home.includes('data-assessment-entry="homepage_assessment_section"'));assert(home.includes(ASSESSMENT_PRICE_LABEL));assert(!/eligibility (assessment|checker)/i.test(home));assert(home.includes('/full-check'));assert(overview.includes('<h1'));assert(overview.includes('PDF'));assert(!/\d+\s*(minutes|mins)/.test(overview));}
for(const locale of ["en","tr","zh-Hans"]){
  const intro=renderToStaticMarkup(<SampleReportIntro locale={locale}/>);const page=renderToStaticMarkup(<SampleReportIntro locale={locale} sequence/>);const how=renderToStaticMarkup(<HowItWorks locale={locale}/>);
  assert(intro.includes(ASSESSMENT_PRICE_LABEL),"sample section shows the canonical price");assert(page.includes(ASSESSMENT_PRICE_LABEL));assert(intro.includes('data-assessment-entry="homepage_sample_report"'));assert(page.includes('data-assessment-entry="sample_report_page"'));assert(intro.includes("/sample-report"));
  assert((how.match(/<li/g)||[]).length===4&&how.includes("/full-check"));
  if(locale==="en"){for(const html of [intro,page,how])assert.deepEqual(findBannedPhrases(html.replace(/<[^>]+>/g," ").replace(/(Information and research support only|Illustration of structure only)[^.]*\.[^.]*\./g,"")),[]);assert(!/best visa|find your pathway|what you qualify|migration strategy|choose your/i.test(intro+page+how));}
}
// The homepage and /sample-report show the REAL report-page screenshots (PremiumReportShowcase); the static HTML mock is gone.
const read=(f:string)=>fs.readFileSync(f,"utf8");
assert(/SampleReportSection/.test(read("components/home-content.tsx")));assert(/PremiumReportShowcase/.test(read("components/landing/SampleReportSection.tsx")));
assert(/PremiumReportShowcase[^>]*mode="sequence"/.test(read("app/[locale]/(main)/sample-report/page.tsx")));
assert(!fs.existsSync("components/landing/SampleReportDocument.tsx"));for(const f of ["components/home-content.tsx","components/landing/SampleReportSection.tsx","app/[locale]/(main)/sample-report/page.tsx","components/sections/PremiumReportShowcase.tsx"])assert(!/SampleReportDocument/.test(read(f)));
const homeOrder=read("components/home-content.tsx");assert(homeOrder.indexOf("<AssessmentSection")<homeOrder.indexOf("<SampleReportSection")&&homeOrder.indexOf("<SampleReportSection")<homeOrder.indexOf("<HowItWorks"));
for(const L of ["en","tr","zh-Hans"])for(const k of ["cover","glance","requirements","costs"])assert(fs.existsSync(`public/images/report-previews/${L}/${k}.png`),`${L}/${k}.png`);
const render=read("scripts/render-showcase-images.ts");assert(/targetVisa: "not_sure"/.test(render)&&!/preferredPathway/.test(render.replace(/\/\/.*$/gm,"")),"showcase profile pre-selects no visa");
const samplePage=fs.readFileSync("app/[locale]/(main)/sample-report/page.tsx","utf8");assert(/index:\s*false/.test(samplePage));assert(!fs.readFileSync("app/sitemap.ts","utf8").includes("sample-report"));
// Price consistency: homepage headline price must equal the amount the checkout line item charges.
assert.equal(getCheckoutLineItem("premium").price_data.unit_amount,PREMIUM_PRICE_AUD_CENTS);assert.equal(ASSESSMENT_PRICE_LABEL,`A$${(getCheckoutLineItem("premium").price_data.unit_amount/100).toFixed(2)}`);
const step3=fs.readFileSync("app/[locale]/(main)/full-check/step-3-language.tsx","utf8");for(const field of ["biggestConcern","estimatedBudgetRange","timeline","occupationConfirmed"])assert(!step3.includes(`name="${field}"`));
assert(!/report_id:\s*reportId/.test(fs.readFileSync("components/premium-feature-gate.tsx","utf8")));
console.log("PASS assessment step validation, unknown/optional inputs, entry payload privacy, three-locale introduction and reduced intake");
