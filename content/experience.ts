export type Point = (string | { b: string })[];

export const experience = [
  {
    company: "Goldman Sachs",
    role: "Software Engineering Intern",
    location: "Bengaluru, India",
    dates: "May 2026 - Jul 2026",
    summary: "I built a self-service web platform as an alternative to the CLI-only workflow developers rely on for installing packages on their systems.",
    about: [
      ["At Goldman Sachs I built a self-service web platform, an alternative to the CLI-only workflow developers use to install packages."],
      ["I worked across the stack: ", { b: "React" }, " and ", { b: "TypeScript" }, " on the front, ", { b: "Go" }, " on ", { b: "AWS" }, " with ", { b: "DynamoDB" }, " behind it, and role-based access over ", { b: "OIDC" }, "."],
      ["It passed a security review and shipped to QA through ", { b: "GitLab CI/CD" }, ". I also fixed a service my features depended on and optimised a slow manual process."],
    ] as Point[],
  },
];

// Shown as the timeline next to the experience write-up.
export const timeline = [
  { when: "Summer 2026", title: "Goldman Sachs", note: "Software Engineering Intern" },
  { when: "Next", title: "Your team", note: "Let's talk", href: "#contact" },
];
