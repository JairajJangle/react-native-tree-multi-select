module.exports = {
  branches: [
    "main",
    {
      name: "beta",
      prerelease: true
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
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "angular",
        writerOpts: {
          footerPartial: [
            "{{#if noteGroups}}",
            "{{#each noteGroups}}",
            "",
            "### {{title}}",
            "",
            "{{#each notes}}",
            "* {{#if commit.scope}}**{{commit.scope}}:** {{/if}}{{text}}",
            "{{/each}}",
            "{{/each}}",
            "",
            "{{/if}}",
            "{{#if contributors.length}}",
            "",
            "### Contributors",
            "",
            "{{#each contributors}}",
            "* {{this.displayName}}",
            "{{/each}}",
            "{{/if}}",
          ].join("\n"),
          finalizeContext: (context, writerOpts, filteredCommits, keyCommit, commits) => {
            const contributors = new Map();
            const allCommits = commits || filteredCommits || [];

            for (const commit of allCommits) {
              if (commit.authorName) {
                contributors.set(commit.authorName, {
                  name: commit.authorName,
                  email: commit.authorEmail || "",
                });
              }

              // Extract co-authors from body and footer trailers
              const fullText = [commit.body, commit.footer]
                .filter(Boolean)
                .join("\n");
              const coAuthorRegex =
                /Co-Authored-By:\s*(.+?)\s*<(.+?)>/gi;
              let match;
              while ((match = coAuthorRegex.exec(fullText)) !== null) {
                const name = match[1].trim();
                contributors.set(name, {
                  name,
                  email: match[2].trim(),
                });
              }
            }

            context.contributors = Array.from(contributors.values()).map(
              (c) => {
                // Link GitHub users by email pattern, show others as bold text
                const ghMatch = c.email.match(
                  /^(\d+\+)?(.+)@users\.noreply\.github\.com$/
                );
                return {
                  ...c,
                  displayName: ghMatch
                    ? `@${ghMatch[2]}`
                    : `**${c.name}**`,
                };
              }
            );

            return context;
          },
        },
      },
    ],
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
      }
    ],
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "yarn.lock", "CHANGELOG.md"],
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
};
