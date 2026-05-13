export interface StackTemplate {
  name: string;
  description: string;
  preferredLibraries: string[];
  antiPatterns: string[];
  designRules: string[];
  requirements: string[];
  carryOverRules: string[];
}

export const STACK_TEMPLATES: StackTemplate[] = [
  {
    name: "Next.js + Supabase",
    description: "Web app stack with auth, database, and server rendering.",
    preferredLibraries: ["Next.js", "Supabase", "TypeScript"],
    antiPatterns: ["Hardcoded secrets", "Mixed server/client concerns"],
    designRules: ["Use server components where appropriate", "Keep UI and data access separated"],
    requirements: ["Authentication works", "Database access is secure"],
    carryOverRules: ["Prefer typed data models", "Keep auth flows explicit"]
  },
  {
    name: "React + Firebase",
    description: "Frontend-first app with managed backend services.",
    preferredLibraries: ["React", "Firebase", "TypeScript"],
    antiPatterns: ["Callback nesting", "Duplicate state sources"],
    designRules: ["Prefer composable UI", "Keep effects minimal"],
    requirements: ["Offline safe auth handling", "Clear state boundaries"],
    carryOverRules: ["Prefer hooks over ad hoc state logic"]
  },
  {
    name: "Flutter + Dart",
    description: "Cross-platform mobile app stack.",
    preferredLibraries: ["Flutter", "Dart"],
    antiPatterns: ["Widget duplication", "Deep nested builders"],
    designRules: ["Keep widgets small", "Extract reusable components"],
    requirements: ["Responsive mobile UI", "Stable navigation"],
    carryOverRules: ["Prefer explicit architecture"]
  },
  {
    name: "Python + FastAPI",
    description: "Backend API and service stack.",
    preferredLibraries: ["Python", "FastAPI", "Pydantic"],
    antiPatterns: ["God modules", "Implicit magic"],
    designRules: ["Keep endpoints thin", "Validate inputs explicitly"],
    requirements: ["Typed API boundaries", "Clear service layers"],
    carryOverRules: ["Prefer readable, explicit service code"]
  },
  {
    name: "Blank",
    description: "No assumptions; configure from scratch.",
    preferredLibraries: [],
    antiPatterns: [],
    designRules: [],
    requirements: [],
    carryOverRules: []
  }
];

