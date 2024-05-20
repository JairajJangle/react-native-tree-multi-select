module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer', // Analyzes commits for version bumping
    '@semantic-release/release-notes-generator', // Generates release notes
    '@semantic-release/changelog', // Generates the changelog
    '@semantic-release/npm', // Handles npm publishing
    '@semantic-release/github', // Handles GitHub releases
    ['@semantic-release/git', {
      assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }],
  ],
};
