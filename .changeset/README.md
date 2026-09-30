# Changesets

Releases are driven by [changesets](https://changesets.dev). Run `pnpm changeset` in a pull request that changes a published package (`@thrum/core`, `@thrum/solid`) and commit the generated file.

On merge to `main`, the `Publish` workflow opens or updates a "Version Packages" PR. Merging that PR publishes to npm via trusted publishing.
