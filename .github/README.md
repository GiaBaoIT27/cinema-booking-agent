# GitHub Configuration

This directory contains the [implementation task form](ISSUE_TEMPLATE/implementation-task.yml) and [pull request template](PULL_REQUEST_TEMPLATE.md).

The team can use these templates for task scope, review and verification. Their presence does not establish a mandatory workflow or create remote tasks, labels or comments.

The [frontend CI workflow](workflows/frontend-ci.yml) checks formatting, lint,
TypeScript, unit tests, and the production build on frontend pull requests,
relevant pushes to `main`, and manual runs. Browser tests remain local.
Deployment automation is not configured.
