# Releasing

This document describes how to publish a new version of the NocoDB CLI and SDK packages.

## Prerequisites

- Push access to `main` on GitHub
- [GitHub CLI](https://cli.github.com/) (`gh`) authenticated — run `gh auth login` if needed
- Trusted publishers configured on [npmjs.com](https://www.npmjs.com/) for both packages (see [Setup](#trusted-publisher-setup) below)

## Release Steps

### 1. Bump the version

```bash
node scripts/bump-version.mjs <new-version>
```

This updates:
- `package.json` (root, SDK, CLI) — `version` field
- `packages/cli/src/index.ts` — `.version()` string
- Any `@stagware/*` dependency ranges

Example:

```bash
node scripts/bump-version.mjs 0.2.0
```

### 2. Commit and push

```bash
git add -A
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

### 3. Create a GitHub Release

```bash
gh release create v0.2.0 --title "v0.2.0" --generate-notes
```

This triggers the `release.yml` workflow which will:

1. Install dependencies, build, and run tests
2. Publish `@stagware/nocodb-sdk` to npm
3. Publish `@stagware/nocodb-cli` to npm
4. Compile cross-platform binaries (Windows, Linux, macOS)
5. Upload `.tgz` tarballs and binaries to the GitHub Release

### 4. Verify

```bash
npm view @stagware/nocodb-sdk version
npm view @stagware/nocodb-cli version
```

Check the [Actions tab](https://github.com/stagware/nocodb-cli/actions) to confirm the workflow completed successfully.

---

## Trusted Publisher Setup

npm publish uses OIDC trusted publishers — no tokens or secrets needed. This must be configured **once per package** on npmjs.com.

For each package (`@stagware/nocodb-sdk` and `@stagware/nocodb-cli`):

1. Go to `https://www.npmjs.com/package/<package-name>/access`
2. Under **Trusted Publishers**, add a configuration:
   - **Owner:** `stagware`
   - **Repository:** `nocodb-cli`
   - **Workflow filename:** `release.yml`
   - **Environment:** `release`

You also need a `release` environment in GitHub:
- Go to `https://github.com/stagware/nocodb-cli/settings/environments`
- Create an environment named `release` (protection rules are optional)

---

## Troubleshooting

### `404 Not Found` on `npm publish`

This usually means OIDC authentication was rejected, **not** that the package doesn't exist.

**Check the following in order:**

1. **Trusted publisher configured?** — Verify the configuration exists on npmjs.com for the failing package (see [Setup](#trusted-publisher-setup)).
2. **Owner / Repo / Workflow / Environment match exactly?** — All four fields must match the workflow file. The environment must be `release` and the workflow filename must be `release.yml`.
3. **npm version >= 11.5.1?** — The workflow upgrades npm automatically. If it's not running the upgrade step, the tag may point to an old commit (see [Tag points to old commit](#tag-points-to-old-commit)).
4. **`.npmrc` interfering?** — `actions/setup-node` with `registry-url` writes an `.npmrc` with a placeholder `NODE_AUTH_TOKEN` that blocks OIDC. The workflow removes this before publishing. If you see `NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX` in the logs, the removal step isn't running.

### `422 Unprocessable Entity` / provenance error

The `repository.url` in `package.json` must match the GitHub remote exactly. Run `npm pkg fix` in both packages to normalize the URL:

```bash
npm pkg fix --prefix packages/sdk
npm pkg fix --prefix packages/cli
```

### Tag points to old commit

If the workflow runs an old version of `release.yml`, the tag was created before your latest push. Fix by re-tagging:

```bash
# Delete old tag locally and remotely
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Recreate on latest commit
git tag v0.2.0
git push origin v0.2.0

# Delete the old GitHub Release and create a new one
gh release delete v0.2.0 --yes
gh release create v0.2.0 --title "v0.2.0" --generate-notes
```

### `Access token expired or revoked`

This misleading message appears when OIDC auth fails. It does **not** mean you need to log in. Follow the [404 troubleshooting](#404-not-found-on-npm-publish) steps above.

### Version already exists

If npm returns `403 You cannot publish over the previously published versions`, the version was already published. Bump to a new version and release again.

### Workflow not triggered

The release workflow triggers on `release: types: [published]`. Make sure you are **publishing** a release (not just creating a draft). Using `gh release create` publishes by default.
