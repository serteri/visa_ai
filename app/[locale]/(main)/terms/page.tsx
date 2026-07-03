import type { Metadata } from "next";

// Plain string title -- the locale layout (app/[locale]/(main)/layout.tsx)
// owns the "%s | LogiVisa" template, applied automatically.
export const metadata: Metadata = {
  title: "Terms of Service & Refund Policy",
  description:
    "LogiVisa's Terms of Service, digital product refund policy, and immigration advice disclaimer.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-gray-800 prose prose-slate dark:prose-invert">
      <h1>Terms of Service &amp; Refund Policy</h1>
      <p className="text-sm text-gray-500">Last updated: 3 July 2026</p>

      <h2>1. Introduction and Acceptance of Terms</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        website logivisa.com, its associated tools (including the Points Calculator,
        ANZSCO Finder, AI Visa Pathway Matcher, and related occupation-classification
        tools), and all digital products offered for sale, including PDF migration
        guides (collectively, the &quot;Services&quot;), operated by LogiVisa
        (&quot;LogiVisa,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
      </p>
      <p>
        By accessing the Services, creating an account, downloading a free guide, or
        completing a purchase, you (&quot;you,&quot; the &quot;User,&quot; or the
        &quot;Customer&quot;) agree to be bound by these Terms in full. If you do not
        agree with any part of these Terms, you must not use the Services or complete a
        purchase. We may update these Terms from time to time in accordance with Section
        9 below.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li>
          <strong>&quot;Digital Products&quot;</strong> means any PDF guide, migration
          blueprint, downloadable document, or other digital content made available for
          purchase or free download through the Services, including but not limited to
          the Turkish Edition (&quot;Avustralya PR Başvuru Rehberi&quot;) and the Global
          English Edition (&quot;The Ultimate Australia Migration &amp; Living
          Blueprint&quot;).
        </li>
        <li>
          <strong>&quot;AI Tools&quot;</strong> means any artificial intelligence or
          machine-learning-assisted feature of the Services, including the AI Visa
          Pathway Matcher, ANZSCO occupation classification tool, points calculators, and
          any similar automated analysis feature.
        </li>
        <li>
          <strong>&quot;Order&quot;</strong> means a completed purchase transaction for a
          Digital Product processed through our third-party payment processor (Stripe).
        </li>
      </ul>

      <h2>3. Digital Goods &amp; Refund Policy</h2>
      <p>
        <strong>
          All Digital Products sold through the Services are delivered electronically
          and are accessible instantly upon completion of your Order.
        </strong>{" "}
        Because of the nature of digital goods — which cannot be returned, and where
        access to the complete content is granted immediately at the point of sale —{" "}
        <strong>all sales are final</strong>.
      </p>
      <p>
        <strong>
          LogiVisa does not offer refunds, exchanges, or cancellations for any Digital
          Product once an Order has been successfully completed and payment has been
          processed, regardless of whether the Digital Product has been downloaded,
          opened, or read.
        </strong>{" "}
        By completing an Order, you expressly acknowledge and agree that you are waiving
        any statutory right to a change-of-mind refund to the fullest extent permitted by
        applicable law, on the basis that the Digital Product is supplied as fully
        accessible digital content from the moment of purchase.
      </p>
      <p>
        This policy does not affect any non-excludable consumer guarantees available to
        you under the Australian Consumer Law (Schedule 2 of the Competition and Consumer
        Act 2010 (Cth)) where those guarantees apply and cannot lawfully be excluded — for
        example, where a Digital Product is materially defective, is not fit for its
        stated purpose, or is not delivered at all due to a technical failure on our
        part. In such circumstances, please contact us using the details in Section 10
        and we will investigate in good faith.
      </p>

      <div className="not-prose my-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-950/40">
        <h2 className="mt-0 text-xl font-bold text-amber-900 dark:text-amber-200">
          4. Immigration Advice Disclaimer (MARA)
        </h2>
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          LogiVisa and its AI tools are NOT registered migration agents (MARA). All
          content, PDFs, and AI classifications are for educational and informational
          purposes only and do not constitute legal or official immigration advice.
        </p>
        <p className="text-amber-900 dark:text-amber-100">
          Nothing in the Services, including any ANZSCO occupation code suggested by our
          AI Tools, any points estimate generated by our calculators, or any content in
          our Digital Products, should be relied upon as a substitute for personalised
          advice from a migration agent registered with the Office of the Migration
          Agents Registration Authority (MARA), or from an Australian legal practitioner
          authorised to give immigration assistance. Australian immigration law and
          policy change frequently, and outcomes depend on your individual
          circumstances. You are solely responsible for verifying any information
          obtained through the Services against official sources, including the
          Australian Department of Home Affairs, before relying on it or lodging any visa
          application. LogiVisa accepts no liability for decisions made, or visa
          applications lodged, in reliance on the Services.
        </p>
      </div>

      <h2>5. Intellectual Property and Licence to Use</h2>
      <p>
        All Digital Products, website content, tool outputs, trademarks, logos, and
        underlying software are the property of LogiVisa or its licensors and are
        protected by applicable copyright and intellectual property laws.
      </p>
      <p>
        Upon completing an Order, you are granted a limited, non-exclusive,
        non-transferable licence to download and use the purchased Digital Product{" "}
        <strong>for your own personal, non-commercial use only</strong>. You may not:
      </p>
      <ul>
        <li>
          Copy, reproduce, distribute, publish, sell, resell, sublicense, or otherwise
          make any Digital Product available to any third party, whether for payment or
          free of charge;
        </li>
        <li>
          Upload any Digital Product, in whole or in part, to any file-sharing service,
          public repository, forum, or social media platform;
        </li>
        <li>
          Remove, obscure, or alter any copyright notice, watermark, or attribution
          contained in a Digital Product; or
        </li>
        <li>
          Use any Digital Product to create a derivative work intended for distribution
          or resale.
        </li>
      </ul>
      <p>
        Any breach of this Section 5 may result in the immediate termination of your
        access to the Services without refund, and LogiVisa reserves the right to pursue
        all available legal remedies.
      </p>

      <h2>6. Acceptable Use of the Services and AI Tools</h2>
      <p>
        You agree to use the Services, including the AI Tools, only for their intended
        purpose of assessing your own migration pathway. You must not: submit another
        person&apos;s personal or identifying documents without their consent; attempt to
        reverse-engineer, scrape, or systematically extract data from the Services;
        interfere with the proper functioning of the Services; or use the Services in any
        way that is unlawful, fraudulent, or misleading.
      </p>

      <h2>7. No Warranty and Limitation of Liability</h2>
      <p>
        The Services and all Digital Products are provided &quot;as is&quot; and
        &quot;as available,&quot; without warranty of any kind, express or implied,
        including as to accuracy, completeness, currency, or fitness for a particular
        purpose, except for guarantees that cannot be excluded under the Australian
        Consumer Law.
      </p>
      <p>
        To the maximum extent permitted by law, LogiVisa, its directors, employees, and
        contractors will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits, visa application
        fees, or opportunity, arising out of or in connection with your use of, or
        inability to use, the Services or any Digital Product, even where a visa
        application is refused, delayed, or otherwise unsuccessful.
      </p>

      <h2>8. Payment Processing</h2>
      <p>
        All payments for Digital Products are processed securely by Stripe, Inc. LogiVisa
        does not store your full payment card details. By completing an Order, you also
        agree to Stripe&apos;s applicable terms of service and privacy policy governing
        the processing of your payment.
      </p>

      <h2>9. Changes to These Terms</h2>
      <p>
        We may revise these Terms at any time by updating this page. Material changes
        will be reflected by an updated &quot;Last updated&quot; date at the top of this
        page. Your continued use of the Services after any such update constitutes your
        acceptance of the revised Terms.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of Australia. You irrevocably submit to the
        exclusive jurisdiction of the courts of Australia in respect of any dispute
        arising out of or in connection with these Terms or the Services.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have any questions about these Terms, the Refund Policy, or wish to raise
        a concern about a Digital Product, please contact us at{" "}
        <a href="mailto:info@logivisa.com">info@logivisa.com</a>.
      </p>
    </div>
  );
}
