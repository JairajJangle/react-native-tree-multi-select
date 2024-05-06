module.exports = {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    {
      "@semantic-release/github": {
        assets: [
          { path: "build/package.zip", label: "Package" },
          { path: "CHANGELOG.md", label: "Changelog" }
        ]
      }
    },
    "@semantic-release/git"
  ]
};