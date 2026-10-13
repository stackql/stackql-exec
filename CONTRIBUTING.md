# Contributing

Before contributing, read [README.md](./README.md) for project scope.

## Setup

1. Fork and clone the repository, then create a branch for your change.
2. Install Node.js 24, matching CI.
3. From the repository root, install dependencies and run the unit tests:

   ```sh
   npm ci --ignore-scripts
   npm test -- --runInBand
   ```

The unit tests use Jest and mock StackQL execution. They do not require a StackQL installation or cloud credentials.

## Project layout

- [action.yml](./action.yml): composite action inputs, outputs, and steps.
- [lib/utils.js](./lib/utils.js): authentication setup, command construction, and execution.
- [lib/tests](./lib/tests): unit tests, including platform-specific behavior.
- [stackql_scripts](./stackql_scripts): query and data files used by provider integration tests.

## CI tests

The [test workflow](./.github/workflows/stackql-exec-test.yml) runs unit tests and smoke tests on Linux, Windows, and macOS, for both x64 and ARM64. Smoke tests require no cloud credentials and cover automatic setup, preinstalled wrapped binaries, and preinstalled plain binaries. On macOS, setup uses Homebrew without a wrapper.

Provider integration tests additionally require the `STACKQL_GITHUB_USERNAME`, `STACKQL_GITHUB_PASSWORD`, and `GOOGLE_CREDENTIALS` repository secrets, plus the `GOOGLE_PROJECT` and `GOOGLE_ZONE` repository variables. Repository secrets are unavailable to [pull request workflows from forks](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflows-in-forked-repositories), so provider tests may fail there because credentials are missing.

## Pull requests

- Keep changes focused on one feature or fix.
- Include tests with functional changes, including platform-specific cases where relevant.
- Update [README.md](./README.md) when changing inputs, outputs, usage, or supported platforms.
- Describe the change and the tests run, including any CI failures caused by unavailable credentials.
- Preserve input validation and authentication isolation between action invocations.

## Security reports

Follow [SECURITY.md](./SECURITY.md) to report suspected vulnerabilities privately. Do not include credentials in issues, pull requests, or test fixtures.
