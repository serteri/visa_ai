import { SKILLED_OCCUPATIONS } from "@/lib/occupations/skilled-occupations";

export type VisaAssistantIntent = "study" | "work" | "pr" | "unknown";

type SuggestedVisa = {
  subclass: "500" | "482" | "189" | "190";
  title: string;
  reason: string;
};

type NextAction = {
  label: string;
  href: string;
};

export type VisaAssistantResult = {
  intent: VisaAssistantIntent;
  occupation?: string;
  hasSponsor?: boolean;
  suggestedVisas: SuggestedVisa[];
  safeResponse: string;
  nextActions: NextAction[];
};

const HARD_SAFETY_REPLY =
  "I can't determine eligibility or tell you what to apply for. I can help you explore general Australian visa pathways based on the information you share.";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function hasAnyKeyword(message: string, keywords: string[]): boolean {
  return keywords.some((keyword) => message.includes(keyword));
}

function detectOccupation(message: string): string | undefined {
  const lower = normalize(message);
  const match = SKILLED_OCCUPATIONS.find((occupation) =>
    lower.includes(occupation.title.toLowerCase())
  );

  return match?.title;
}

function isHardSafetyQuestion(message: string): boolean {
  return hasAnyKeyword(message, [
    "can i get a visa",
    "am i eligible",
    "will i be approved",
    "what visa should i apply for",
  ]);
}

function defaultActions(): NextAction[] {
  return [
    {
      label: "Speak with a registered migration agent",
      href: "/{locale}/agent-referral",
    },
  ];
}

export function analyzeVisaMessage(message: string): VisaAssistantResult {
  const lower = normalize(message);
  const occupation = detectOccupation(lower);

  if (!lower) {
    return {
      intent: "unknown",
      occupation,
      suggestedVisas: [],
      safeResponse:
        "I can help you explore Australian visa pathways based on general information only. You may share your study, work, or migration goals, and consider speaking with a registered migration agent.",
      nextActions: defaultActions(),
    };
  }

  if (isHardSafetyQuestion(lower)) {
    return {
      intent: "unknown",
      occupation,
      suggestedVisas: [],
      safeResponse: HARD_SAFETY_REPLY,
      nextActions: defaultActions(),
    };
  }

  const studyIntent = hasAnyKeyword(lower, [
    "study",
    "student",
    "course",
    "university",
    "college",
    "school",
  ]);

  const workIntent = hasAnyKeyword(lower, [
    "work",
    "employer",
    "sponsor",
    "job offer",
    "sponsored",
  ]);

  const prIntent = hasAnyKeyword(lower, [
    "pr",
    "permanent",
    "migrate",
    "migration",
    "skilled",
    "points",
  ]);

  const hasSponsor = hasAnyKeyword(lower, ["sponsor", "sponsored", "employer", "job offer"]);

  if (studyIntent) {
    return {
      intent: "study",
      occupation,
      hasSponsor,
      suggestedVisas: [
        {
          subclass: "500",
          title: "Student visa",
          reason:
            "Study-related goals were detected, so a student pathway may be relevant to explore based on general information only.",
        },
      ],
      safeResponse:
        "Based on what you shared, a student pathway such as subclass 500 may be relevant and could be worth exploring. This is general information only, and you may consider speaking with a registered migration agent.",
      nextActions: [
        ...defaultActions(),
        { label: "View Student visa", href: "/{locale}/visas/500" },
      ],
    };
  }

  if (workIntent) {
    if (hasSponsor) {
      return {
        intent: "work",
        occupation,
        hasSponsor,
        suggestedVisas: [
          {
            subclass: "482",
            title: "Skills in Demand visa",
            reason:
              "Sponsor-related keywords were detected, so employer-sponsored work pathways may be relevant to explore.",
          },
        ],
        safeResponse:
          "Based on what you shared, an employer-sponsored pathway such as subclass 482 may be relevant and could be worth exploring. This is general information only, and you may consider speaking with a registered migration agent.",
        nextActions: [
          ...defaultActions(),
          { label: "View 482 details", href: "/{locale}/visas/482" },
          { label: "Check occupation", href: "/{locale}/occupation-checker" },
        ],
      };
    }

    return {
      intent: "work",
      occupation,
      hasSponsor,
      suggestedVisas: [],
      safeResponse:
        "Employer-sponsored pathways usually depend on sponsor details, and these pathways may be relevant only when sponsorship context is clear. This is general information only, and you may consider speaking with a registered migration agent.",
      nextActions: [
        ...defaultActions(),
        { label: "Check occupation", href: "/{locale}/occupation-checker" },
      ],
    };
  }

  if (prIntent) {
    return {
      intent: "pr",
      occupation,
      hasSponsor,
      suggestedVisas: [
        {
          subclass: "189",
          title: "Skilled Independent visa",
          reason:
            "Permanent migration keywords were detected, so points-tested skilled pathways may be relevant to explore.",
        },
        {
          subclass: "190",
          title: "Skilled Nominated visa",
          reason:
            "Permanent migration keywords were detected, and state nomination pathways could also be worth exploring.",
        },
      ],
      safeResponse:
        "Based on what you shared, skilled migration pathways such as subclass 189 and subclass 190 may be relevant and could be worth exploring. This is general information only, and you may consider speaking with a registered migration agent.",
      nextActions: [
        ...defaultActions(),
        { label: "View 189 details", href: "/{locale}/visas/189" },
        { label: "View 190 details", href: "/{locale}/visas/190" },
        { label: "Estimate points", href: "/{locale}/points-calculator" },
        { label: "Check occupation", href: "/{locale}/occupation-checker" },
      ],
    };
  }

  return {
    intent: "unknown",
    occupation,
    hasSponsor,
    suggestedVisas: [],
    safeResponse:
      "I can help you explore Australian visa pathways based on general information only. You may share whether your goal is study, work, or permanent migration, and consider speaking with a registered migration agent.",
    nextActions: defaultActions(),
  };
}
