module.exports = {
  branches: [
    "main",
    {
      name: "beta",
      prerelease: true // Marks this as a prerelease channel
    }
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          { type: "chore", scope: "deps", release: "patch" },
          { type: "chore", breaking: true, release: "major" },
          { type: "chore", scope: "breaking", release: "major" },
        ],
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES"],
        },
      },
    ],
    "@semantic-release/release-notes-generator", // Generates release notes
    "@semantic-release/changelog", // Generates the changelog
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
        tag: "beta" // Publishes with a 'beta' tag to npm
      }
    ],
    "@semantic-release/github", // Handles GitHub releases
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "yarn.lock", "CHANGELOG.md"],
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
};
