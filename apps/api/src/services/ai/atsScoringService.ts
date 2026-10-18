/**
 * atsScoringService.ts
 *
 * Deterministic ATS Scoring & Compatibility Engine for EarlyAI ATS.
 * Evaluates resume quality, section parseability, skill taxonomy matches,
 * quantitative achievements, and computes a versioned 5-part rubric score (0–100).
 */

export interface SkillMatchResult {
  matchedSkills: string[];
  missingSkills: string[];
  skillScore: number;
}

export interface SectionAnalysisResult {
  detectedSections: string[];
  missingSections: string[];
  sectionScore: number;
  wordCount: number;
  hasContactInfo: boolean;
  contactIssues: string[];
}

export interface AchievementAnalysisResult {
  metricCount: number;
  achievementSnippets: string[];
  achievementScore: number;
}

export interface DeterministicAtsScoreResult {
  overallScore: number;
  rubricVersion: string;
  breakdown: {
    skillsScore: number; // 40%
    experienceScore: number; // 25%
    sectionScore: number; // 15%
    achievementScore: number; // 10%
    clarityScore: number; // 10%
  };
  matchedSkills: string[];
  missingCriteria: string[];
  detectedSections: string[];
  missingSections: string[];
  contactIssues: string[];
  parseabilityWarnings: string[];
  recommendations: Array<{
    issue: string;
    whyItMatters: string;
    existingEvidence: string;
    suggestedAction: string;
    source: "rule";
  }>;
}

/**
 * Standard software engineering skill taxonomy and normalization dictionary.
 */
export const SKILL_TAXONOMY: Record<string, string[]> = {
  "Node.js": ["nodejs", "node.js", "node js", "node"],
  "React": ["reactjs", "react.js", "react js", "react"],
  "TypeScript": ["typescript", "ts"],
  "JavaScript": ["javascript", "js", "ecmascript"],
  "Python": ["python", "py"],
  "Go": ["golang", "go"],
  "Rust": ["rust", "rustlang"],
  "Java": ["java", "jvm"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", "csharp", "c sharp"],
  ".NET": [".net", "dotnet", "asp.net"],
  "PostgreSQL": ["postgresql", "postgres", "psql"],
  "MongoDB": ["mongodb", "mongo"],
  "MySQL": ["mysql"],
  "Redis": ["redis"],
  "Docker": ["docker", "containerization", "containers"],
  "Kubernetes": ["kubernetes", "k8s"],
  "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
  "GCP": ["gcp", "google cloud platform", "google cloud"],
  "Azure": ["azure", "microsoft azure"],
  "Git": ["git", "github", "gitlab"],
  "GraphQL": ["graphql"],
  "REST API": ["rest api", "restful api", "rest", "restful"],
  "CI/CD": ["ci/cd", "cicd", "continuous integration", "github actions", "jenkins"],
  "Microservices": ["microservices", "microservice architecture", "distributed systems"],
  "System Design": ["system design", "software architecture", "high availability"],
  "Tailwind CSS": ["tailwind", "tailwindcss", "tailwind css"],
  "Next.js": ["nextjs", "next.js", "next js"],
  "Express": ["express", "expressjs", "express.js"],
  "Linux": ["linux", "unix", "ubuntu"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3"],
  "SQL": ["sql", "relational database", "rdbms"],
};

/**
 * Escapes regex special characters safely.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a skill or any of its aliases exists in text using boundary-aware matching.
 */
export function hasSkillMatch(text: string, canonicalSkill: string): boolean {
  const aliases = SKILL_TAXONOMY[canonicalSkill] || [canonicalSkill.toLowerCase()];
  const lowerText = text.toLowerCase();

  for (const alias of aliases) {
    // Handle special symbols like C++, C#, .NET
    if (alias === "c++") {
      if (/(?:^|\b|\s)c\+\+(?!\w)/i.test(text)) return true;
    } else if (alias === "c#") {
      if (/(?:^|\b|\s)c#(?!\w)/i.test(text)) return true;
    } else if (alias === ".net" || alias === "asp.net") {
      if (/(?:^|\s)\.net(?!\w)/i.test(text) || /asp\.net/i.test(text)) return true;
    } else if (alias.length <= 2) {
      // Short acronyms like 'go', 'ts', 'js' require strict word boundaries
      const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
      if (regex.test(text)) return true;
    } else {
      const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
      if (regex.test(lowerText)) return true;
    }
  }

  return false;
}

/**
 * Evaluates skill matches between job requirements and resume text.
 */
export function evaluateSkills(
  resumeText: string,
  requiredSkills: string[],
  preferredSkills: string[] = []
): SkillMatchResult {
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  const allCriteria = Array.from(new Set([...requiredSkills, ...preferredSkills])).filter(
    (s) => s && s.trim().length > 0 && !s.toLowerCase().includes("none")
  );

  if (allCriteria.length === 0) {
    // If no explicit skills specified, credit baseline engineering
    return {
      matchedSkills: ["General Software Engineering"],
      missingSkills: [],
      skillScore: 75,
    };
  }

  for (const skill of allCriteria) {
    // Check against taxonomy or direct string matching
    let matched = false;

    // Check if skill matches any taxonomy entry
    for (const [canonical, aliases] of Object.entries(SKILL_TAXONOMY)) {
      if (
        skill.toLowerCase() === canonical.toLowerCase() ||
        aliases.some((a) => a.toLowerCase() === skill.toLowerCase())
      ) {
        if (hasSkillMatch(resumeText, canonical)) {
          matched = true;
          matchedSkills.push(canonical);
          break;
        }
      }
    }

    if (!matched) {
      // Direct boundary check
      const escaped = escapeRegex(skill.trim());
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(resumeText)) {
        matched = true;
        matchedSkills.push(skill.trim());
      }
    }

    if (!matched) {
      missingSkills.push(`${skill.trim()} (not evidenced in resume)`);
    }
  }

  const ratio = matchedSkills.length / allCriteria.length;
  // Bounded between 20 and 100
  const skillScore = Math.round(Math.min(100, Math.max(20, ratio * 100)));

  return {
    matchedSkills: Array.from(new Set(matchedSkills)),
    missingSkills,
    skillScore,
  };
}

/**
 * Analyzes resume structural completeness, contact information, and parseability.
 */
export function evaluateResumeStructure(resumeText: string): SectionAnalysisResult {
  const text = resumeText.trim();
  const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;

  const sectionPatterns: Record<string, RegExp> = {
    Experience: /\b(experience|work history|employment|professional background|career history)\b/i,
    Education: /\b(education|academic|university|degree|college|bachelor|master|phd)\b/i,
    Skills: /\b(skills|technical skills|technologies|proficiencies|core competencies)\b/i,
    Projects: /\b(projects|portfolio|personal projects|key projects)\b/i,
    Summary: /\b(summary|objective|about me|professional summary|profile)\b/i,
  };

  const detectedSections: string[] = [];
  const missingSections: string[] = [];

  for (const [section, pattern] of Object.entries(sectionPatterns)) {
    if (pattern.test(text)) {
      detectedSections.push(section);
    } else {
      missingSections.push(section);
    }
  }

  // Contact info inspection
  const contactIssues: string[] = [];
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);

  if (!hasEmail) contactIssues.push("Email address not clearly detected");
  if (!hasPhone) contactIssues.push("Phone number not clearly detected");

  // Section score calculation
  let sectionScore = 50;
  if (detectedSections.includes("Experience")) sectionScore += 20;
  if (detectedSections.includes("Skills")) sectionScore += 15;
  if (detectedSections.includes("Education")) sectionScore += 10;
  if (detectedSections.includes("Projects")) sectionScore += 5;
  if (detectedSections.includes("Summary")) sectionScore += 5;

  if (wordCount < 15) {
    sectionScore = Math.min(sectionScore, 30);
  }

  return {
    detectedSections,
    missingSections,
    sectionScore: Math.min(100, Math.max(20, sectionScore)),
    wordCount,
    hasContactInfo: hasEmail,
    contactIssues,
  };
}

/**
 * Evaluates achievement specificity, metrics, and quantitative evidence.
 */
export function evaluateAchievements(resumeText: string): AchievementAnalysisResult {
  // Regex for quantitative metrics: percentages, dollar amounts, scaling numbers, multipliers, and units
  const metricRegex = /(?:\b\d+(?:\.\d+)?%|\$\d+[\d,.]*(?:k|m|b)?\b|\b\d+(?:k|m|b)?\+?\s*(?:users|clients|requests|rps|tps|ms|microservices|services|endpoints|engineers|developers|nodes|containers|servers)\b|\b\d+x\b|\b(?:reduced|increased|improved|scaled|saved)\b[^\n,.]*?\b\d+)/gi;

  const matches = resumeText.match(metricRegex) || [];
  const uniqueMetrics = Array.from(new Set(matches.map((m) => m.toLowerCase().trim())));

  let achievementScore = 40; // baseline
  if (uniqueMetrics.length >= 4) {
    achievementScore = 95;
  } else if (uniqueMetrics.length >= 2) {
    achievementScore = 80;
  } else if (uniqueMetrics.length >= 1) {
    achievementScore = 65;
  }

  return {
    metricCount: uniqueMetrics.length,
    achievementSnippets: uniqueMetrics.slice(0, 5),
    achievementScore,
  };
}

/**
 * Computes the authoritative deterministic ATS score using rubric v2.0.
 *
 * Rubric Weights:
 * - Skills coverage: 40%
 * - Experience & project evidence: 25%
 * - Section completeness & parseability: 15%
 * - Achievement specificity & metrics: 10%
 * - Clarity & contact quality: 10%
 */
export function computeDeterministicAtsScore(params: {
  resumeText: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  jobTitle?: string;
  jobDescription?: string;
}): DeterministicAtsScoreResult {
  const { resumeText, requiredSkills, preferredSkills = [] } = params;

  const parseabilityWarnings: string[] = [];
  const recommendations: DeterministicAtsScoreResult["recommendations"] = [];

  // 1. Evaluate Skills (40% weight)
  const skillEval = evaluateSkills(resumeText, requiredSkills, preferredSkills);

  // 2. Evaluate Resume Structure (15% weight)
  const structureEval = evaluateResumeStructure(resumeText);

  // 3. Evaluate Achievements & Metrics (10% weight)
  const achievementEval = evaluateAchievements(resumeText);

  // 4. Evaluate Experience Depth (25% weight)
  let experienceScore = 60;
  if (structureEval.wordCount >= 100 && structureEval.detectedSections.includes("Experience")) {
    experienceScore = structureEval.wordCount >= 250 ? 90 : 80;
  } else if (structureEval.detectedSections.includes("Experience")) {
    experienceScore = 70;
  } else {
    experienceScore = 40;
    parseabilityWarnings.push("Resume content is brief; work experience section not detected.");
  }

  // 5. Evaluate Clarity & Contact Quality (10% weight)
  let clarityScore = 80;
  if (structureEval.contactIssues.length > 0) {
    clarityScore -= structureEval.contactIssues.length * 15;
    structureEval.contactIssues.forEach((issue) => parseabilityWarnings.push(issue));
  }
  if (structureEval.wordCount < 100) {
    clarityScore = Math.min(clarityScore, 30);
    parseabilityWarnings.push("Extracted resume text is under 100 words. If scanned, OCR may be required.");
  }
  clarityScore = Math.max(20, Math.min(100, clarityScore));

  // Synthesize Recommendations
  if (skillEval.missingSkills.length > 0) {
    const topMissing = skillEval.missingSkills.slice(0, 3).map((s) => s.replace(/\s*\(not evidenced in resume\)/, ""));
    recommendations.push({
      issue: `Missing evidence for required skills: ${topMissing.join(", ")}`,
      whyItMatters: "Recruiters and automated matching engines filter by core required technical competencies.",
      existingEvidence: "Skill terms were not detected in the current resume text.",
      suggestedAction: `If you have authentic experience with ${topMissing.join(", ")}, incorporate specific project context or responsibilities demonstrating it. Do not fabricate experience.`,
      source: "rule",
    });
  }

  if (achievementEval.metricCount < 2) {
    recommendations.push({
      issue: "Limited quantifiable metrics or business impact figures",
      whyItMatters: "High-impact engineering resumes highlight specific outcomes (e.g. latency reduced by 30%, scaled to 50k users) rather than only listing duties.",
      existingEvidence: `Detected ${achievementEval.metricCount} quantitative impact metric(s).`,
      suggestedAction: "Enhance bullet points with concrete metrics: scale, performance gains, team size, or operational savings.",
      source: "rule",
    });
  }

  if (structureEval.missingSections.includes("Projects")) {
    recommendations.push({
      issue: "No distinct Projects section detected",
      whyItMatters: "Technical projects provide tangible proof of hands-on stack implementation.",
      existingEvidence: "A section heading matching 'Projects' or 'Portfolio' was not found.",
      suggestedAction: "Add a dedicated 'Projects' section detailing notable software applications, tools, or open-source contributions.",
      source: "rule",
    });
  }

  // Calculate Weighted Overall Score
  // Skills: 40%, Experience: 25%, Sections: 15%, Achievements: 10%, Clarity: 10%
  const overallScore = Math.round(
    skillEval.skillScore * 0.4 +
      experienceScore * 0.25 +
      structureEval.sectionScore * 0.15 +
      achievementEval.achievementScore * 0.1 +
      clarityScore * 0.1
  );

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    rubricVersion: "v2.0-deterministic-hybrid",
    breakdown: {
      skillsScore: skillEval.skillScore,
      experienceScore,
      sectionScore: structureEval.sectionScore,
      achievementScore: achievementEval.achievementScore,
      clarityScore,
    },
    matchedSkills: skillEval.matchedSkills,
    missingCriteria: skillEval.missingSkills,
    detectedSections: structureEval.detectedSections,
    missingSections: structureEval.missingSections,
    contactIssues: structureEval.contactIssues,
    parseabilityWarnings,
    recommendations,
  };
}
