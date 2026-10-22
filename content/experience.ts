export type Point = (string | { b: string })[];

export const experience = [
  {
    company: "Goldman Sachs",
    role: "Software Engineering Intern",
    location: "Bengaluru, India",
    dates: "May 2026 - Jul 2026",
    points: [
      ["I built a self-service developer platform with React, TypeScript and Go on AWS ECS Fargate. It replaced a CLI-only workflow for ", { b: "9,000+" }, " developers. A common task went from ", { b: "about a minute" }, " to ", { b: "about 2 seconds" }, " (estimated)."],
      ["I added background job processing with SQS FIFO and EventBridge. It brought batch operations and status tracking, and automated a step that used to be manual."],
      ["I designed a DynamoDB history table with TTL for an admin dashboard. I also added role-based access (RBAC) to the OIDC-authenticated APIs. It passed a security review."],
      ["I wrote unit and integration tests with ", { b: "87%" }, " backend coverage. I deployed to QA through GitLab CI/CD with security scans."],
      ["I found and fixed a QA service failure caused by an upstream tool update, and extended its schema."],
    ] as Point[],
    tags: ["React", "TypeScript", "Go", "AWS ECS Fargate", "SQS", "EventBridge", "DynamoDB", "OIDC", "GitLab CI"],
  },
];

export const education = {
  degree: "Bachelor of Technology",
  branch: "Information Technology",
  school: "Netaji Subhas University of Technology, New Delhi",
  dates: "2023 - 2027",
  coursework: [
    "Data Structures", "Database Management System", "Operating Systems", "Computer Networks",
    "OOPS", "Artificial Intelligence", "Generative AI",
  ],
  gpa: "GPA: 8.85/10",
};
