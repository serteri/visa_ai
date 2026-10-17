import assert from "node:assert/strict";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AssessmentSection } from "../components/landing/AssessmentSection";
import { AssessmentOverview } from "../components/assessment-overview";
import { assessmentStepErrors } from "../lib/intake/assessment-validation";
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
for(const locale of ["en","tr","zh-Hans"]){const home=renderToStaticMarkup(<AssessmentSection locale={locale}/>);const overview=renderToStaticMarkup(<AssessmentOverview locale={locale}/>);assert(home.includes('data-assessment-entry="homepage"'));assert(home.includes('/full-check'));assert(overview.includes('<h1'));assert(overview.includes('PDF'));assert(!/\d+\s*(minutes|mins)/.test(overview));}
const step3=fs.readFileSync("app/[locale]/(main)/full-check/step-3-language.tsx","utf8");for(const field of ["biggestConcern","estimatedBudgetRange","timeline","occupationConfirmed"])assert(!step3.includes(`name="${field}"`));
assert(!/report_id:\s*reportId/.test(fs.readFileSync("components/premium-feature-gate.tsx","utf8")));
console.log("PASS assessment step validation, unknown/optional inputs, entry payload privacy, three-locale introduction and reduced intake");
