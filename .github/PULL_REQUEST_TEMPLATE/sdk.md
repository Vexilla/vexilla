<!--
     For Work In Progress Pull Requests, please use the Draft PR feature,
     see https://github.blog/2019-02-14-introducing-draft-pull-requests/ for further details.

     For a timely review/response, please avoid force-pushing additional
     commits if your PR already received reviews or comments.

     Before submitting a Pull Request, please ensure you've done the following:
     - 📖 Read the Vexilla Contributing Guide: https://vexilla.dev/documentation/contributing
     - 📖 Read the Vexilla Code of Conduct: https://github.com/Vexilla/vexilla/blob/main/CODE_OF_CONDUCT.md
     - ✅ Provide tests for your changes.
     - 📝 Use conventional commits with appropriate descriptions https://www.conventionalcommits.org/en/v1.0.0/
     - 📗 Update any related documentation and include any relevant screenshots.

     NOTE: Pull Requests from forked repositories will need to be reviewed by
     a Vexilla Team member before any CI builds will run. Once your PR is approved
     with a `/ci` reply to the PR, it will be allowed to run subsequent builds without
     manual approval.
-->

## Make sure you have completed this checklist

- [ ] Create client sdk in `clients` directory. Some languages exist using the older schema. They start with `client-`. You can modify these to use the new schema, or you can create a new sdk folder.
- [ ] Include unit tests for the hasher and scheduling functionality. Example unit tests can be found in the JS/TS client:
  - `clients/js/src/test_gradual.ts`
  - `clients/js/src/test_scheduling.ts`
- [ ] Include integration tests that consume the fixture data in `packages/test-server`. Example integration tests can be found in the JS/TS client:
  - `clients/js/src/test_client.ts`
- [ ] Add support for CLI tool in `packages/cli`
  - [ ] Template in `packages/cli/src/templates.ts`
  - [ ] Transformer in `packages/cli/src/transform.ts`

## [optional] Related Tickets & Documents

<!--
For pull requests that relate or close an issue, please include them
below.  We like to follow [Github's guidance on linking issues to pull requests](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue).

For example having the text: "closes #1234" would connect the current pull
request to issue 1234.  And when we merge the pull request, Github will
automatically close the issue.
-->

- Related Issue #
- Closes #

## [optional] What gif best describes this PR or how it makes you feel?

![alt_text](gif_link)
