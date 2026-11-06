import { execFileSync } from "node:child_process";

const commitEnvironmentVariables = ["CF_PAGES_COMMIT_SHA", "GITHUB_SHA", "VERCEL_GIT_COMMIT_SHA"];

function getGitCommitHash() {
  for (const variable of commitEnvironmentVariables) {
    const commitHash = process.env[variable];
    if (commitHash) return commitHash.slice(0, 7);
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export { getGitCommitHash };
