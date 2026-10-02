# Contribution Guide

Status: proposed workflow for review by both contributors. It does not establish a mandatory tracker, branch convention or approval process.

## Start a change

Agree on the outcome, affected app and acceptance criteria. Read relevant architecture, domain and API documentation, then inspect current source. Record unanswered questions before selecting behavior.

Issue templates can capture scope and dependencies; a shared task discussion is also valid. Keep task progress separate from durable project documentation.

## Implement and review

- Keep unrelated changes separate so the other contributor can review them.
- Run application commands in the correct app directory; there is no root npm workspace.
- Preserve existing API and authorization contracts unless the agreed task changes them.
- For frontend work, identify Figma frames, responsive behavior and API dependencies.
- Report the commands and manual checks actually performed, including failures or missing coverage.
- Update architecture, API or product documentation when durable behavior changes.

A Pull Request template is available for scope, review and verification. The team can choose its branch and merge practices separately.

## Shared and personal configuration

Shared files describe the project and team-reviewed practices. Skills, prompts, machine paths and AI orchestration are personal configuration maintained separately. Contributors do not need the same AI tool to work on the project.
