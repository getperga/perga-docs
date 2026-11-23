# Website

Perga documentation, built with [Docusaurus](https://docusaurus.io/).

## Installation

```bash
nvm use
npm ci
```

## Local Development

```bash
npm start
```

Opens the site locally and reloads it as you edit.

## Build

```bash
npm run build
```

Creates the site in `build`, ready for static hosting.

## Deployment

Use the Node.js version in `.nvmrc` and run `npm ci`. Record the source and
published Pages commits in the release notes.

Using SSH:

```bash
USE_SSH=true npm run deploy
```

Using HTTPS:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

These commands build the site and publish it to the `gh-pages` branch.
