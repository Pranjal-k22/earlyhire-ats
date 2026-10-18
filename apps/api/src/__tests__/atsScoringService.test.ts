import { describe, it, expect } from "vitest";
import {
  hasSkillMatch,
  evaluateSkills,
  evaluateResumeStructure,
  evaluateAchievements,
  computeDeterministicAtsScore,
} from "../services/ai/atsScoringService.js";

describe("Deterministic ATS Scoring Service (Rubric v2.0)", () => {
  describe("Skill Taxonomy & Boundary Matching", () => {
    it("matches canonical skills and common aliases", () => {
      const resume = "Experienced software engineer specializing in nodejs, react.js, and typescript.";
      expect(hasSkillMatch(resume, "Node.js")).toBe(true);
      expect(hasSkillMatch(resume, "React")).toBe(true);
      expect(hasSkillMatch(resume, "TypeScript")).toBe(true);
      expect(hasSkillMatch(resume, "Python")).toBe(false);
    });

    it("handles special characters like C++, C#, and .NET correctly", () => {
      const resumeWithCpp = "Proficient in modern C++ and STL algorithms.";
      expect(hasSkillMatch(resumeWithCpp, "C++")).toBe(true);
      expect(hasSkillMatch(resumeWithCpp, "C#")).toBe(false);

      const resumeWithCSharp = "Built enterprise microservices using C# and ASP.NET Core.";
      expect(hasSkillMatch(resumeWithCSharp, "C#")).toBe(true);
      expect(hasSkillMatch(resumeWithCSharp, ".NET")).toBe(true);
    });

    it("respects word boundaries for short acronyms without false positives", () => {
      // 'go' should not match 'good' or 'algorithm'
      const resumeWithoutGo = "Implemented good search algorithms for database indexing.";
      expect(hasSkillMatch(resumeWithoutGo, "Go")).toBe(false);

      const resumeWithGo = "Backend development in Go and PostgreSQL.";
      expect(hasSkillMatch(resumeWithGo, "Go")).toBe(true);

      // 'ts' should not match 'datasets' or 'tests'
      const resumeWithoutTs = "Conducted unit tests on large datasets.";
      expect(hasSkillMatch(resumeWithoutTs, "TypeScript")).toBe(false);
    });

    it("evaluates required vs missing skills accurately", () => {
      const resume = "Experienced in Node.js, TypeScript, PostgreSQL, and Docker containerization.";
      const required = ["Node.js", "TypeScript", "PostgreSQL", "Kubernetes"];

      const result = evaluateSkills(resume, required);
      expect(result.matchedSkills).toContain("Node.js");
      expect(result.matchedSkills).toContain("TypeScript");
      expect(result.matchedSkills).toContain("PostgreSQL");
      expect(result.missingSkills).toHaveLength(1);
      expect(result.missingSkills[0]).toContain("Kubernetes");
      expect(result.skillScore).toBe(75); // 3 of 4 = 75%
    });

    it("handles empty or generic required criteria gracefully", () => {
      const resume = "Built web apps with JavaScript and React.";
      const result = evaluateSkills(resume, []);
      expect(result.matchedSkills.length).toBeGreaterThan(0);
      expect(result.skillScore).toBe(75);
    });
  });

  describe("Resume Structure & Parseability", () => {
    it("detects standard resume sections and contact information", () => {
      const resume = `
        Jane Doe | jane@example.com | (555) 123-4567
        Professional Summary: Senior Engineer with 6 years experience.
        Work Experience: Led backend engineering team at TechCorp.
        Education: B.S. in Computer Science from State University.
        Technical Skills: Node.js, React, Docker, SQL.
        Key Projects: Created real-time data sync engine.
      `;

      const result = evaluateResumeStructure(resume);
      expect(result.detectedSections).toContain("Summary");
      expect(result.detectedSections).toContain("Experience");
      expect(result.detectedSections).toContain("Education");
      expect(result.detectedSections).toContain("Skills");
      expect(result.detectedSections).toContain("Projects");
      expect(result.hasContactInfo).toBe(true);
      expect(result.contactIssues).toHaveLength(0);
      expect(result.sectionScore).toBeGreaterThanOrEqual(90);
    });

    it("flags missing contact info and sections for sparse resumes", () => {
      const sparseResume = "Just a short resume with some coding words.";
      const result = evaluateResumeStructure(sparseResume);
      expect(result.hasContactInfo).toBe(false);
      expect(result.contactIssues).toContain("Email address not clearly detected");
      expect(result.contactIssues).toContain("Phone number not clearly detected");
      expect(result.sectionScore).toBeLessThan(50);
    });
  });

  describe("Achievement & Metric Analysis", () => {
    it("detects quantitative achievements and metrics", () => {
      const resume = `
        - Reduced API latency by 35% across 12 microservices.
        - Scaled distributed database to 50k users, handling 2500 rps.
        - Saved $120k in annual AWS cloud infrastructure expenses.
      `;

      const result = evaluateAchievements(resume);
      expect(result.metricCount).toBeGreaterThanOrEqual(3);
      expect(result.achievementScore).toBeGreaterThanOrEqual(80);
    });

    it("assigns baseline score when no quantitative metrics are found", () => {
      const resume = "Worked on web applications and fixed bugs with team members.";
      const result = evaluateAchievements(resume);
      expect(result.metricCount).toBe(0);
      expect(result.achievementScore).toBe(40);
    });
  });

  describe("Overall Rubric v2.0 Calculation & Determinism", () => {
    const completeResume = `
      Alex Morgan | alex.morgan@example.com | (555) 987-6543 | San Francisco, CA
      Summary: Senior Full-Stack Engineer with 7+ years developing scalable SaaS applications.
      Skills: Node.js, TypeScript, React, PostgreSQL, Docker, Kubernetes, AWS, REST API, CI/CD.
      Experience:
      Senior Software Engineer at CloudScale Inc (2021 - Present)
      - Architected event-driven microservices processing 15,000 rps with 99.99% uptime.
      - Reduced database query latency by 45% using PostgreSQL indexing and Redis caching.
      - Managed deployment of 25+ microservices on AWS Kubernetes clusters.
      Software Engineer at DataFlow (2018 - 2021)
      - Delivered React and TypeScript web portal serving 100k users.
      - Automated CI/CD pipelines reducing deployment time by 60%.
      Education:
      Bachelor of Science in Computer Science, University of California (2018).
      Projects:
      Open Source Distributed Queue: Built high-throughput task queue in Go with 500+ GitHub stars.
    `;

    const jobSkills = ["Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"];

    it("computes a high, well-balanced score for an exemplary matching resume", () => {
      const result = computeDeterministicAtsScore({
        resumeText: completeResume,
        requiredSkills: jobSkills,
        jobTitle: "Senior Backend Engineer",
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(80);
      expect(result.rubricVersion).toBe("v2.0-deterministic-hybrid");
      expect(result.breakdown.skillsScore).toBe(100);
      expect(result.breakdown.experienceScore).toBeGreaterThanOrEqual(80);
      expect(result.breakdown.sectionScore).toBeGreaterThanOrEqual(90);
      expect(result.breakdown.achievementScore).toBeGreaterThanOrEqual(80);
      expect(result.breakdown.clarityScore).toBeGreaterThanOrEqual(75);
      expect(result.matchedSkills).toEqual(expect.arrayContaining(jobSkills));
      expect(result.missingCriteria).toHaveLength(0);
    });

    it("is strictly deterministic: identical inputs yield identical score breakdowns", () => {
      const run1 = computeDeterministicAtsScore({
        resumeText: completeResume,
        requiredSkills: jobSkills,
      });

      const run2 = computeDeterministicAtsScore({
        resumeText: completeResume,
        requiredSkills: jobSkills,
      });

      expect(run1.overallScore).toBe(run2.overallScore);
      expect(run1.breakdown).toEqual(run2.breakdown);
      expect(run1.matchedSkills).toEqual(run2.matchedSkills);
      expect(run1.missingCriteria).toEqual(run2.missingCriteria);
    });

    it("produces actionable recommendations when required skills or metrics are lacking", () => {
      const basicResume = `
        John Smith | john@example.com | (555) 111-2222
        Experience: Junior developer writing simple HTML and CSS websites.
        Education: High School Diploma.
      `;

      const result = computeDeterministicAtsScore({
        resumeText: basicResume,
        requiredSkills: ["Node.js", "TypeScript", "Docker", "Kubernetes"],
      });

      expect(result.overallScore).toBeLessThan(60);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].whyItMatters).toBeDefined();
      expect(result.recommendations[0].suggestedAction).toContain("Do not fabricate experience");
    });

    it("never produces a misleading 100 score for empty or malformed inputs", () => {
      const result = computeDeterministicAtsScore({
        resumeText: "   ",
        requiredSkills: ["Node.js", "React"],
      });

      expect(result.overallScore).toBeLessThan(35);
      expect(result.parseabilityWarnings).toContain(
        "Extracted resume text is under 100 words. If scanned, OCR may be required."
      );
    });
  });
});
