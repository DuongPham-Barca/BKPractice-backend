# 2026-11-11 — Public Swagger setup and frontend API guide

- Author: Codex, on request of the repository owner.
- Scope: Add deployable Swagger configuration templates and a frontend integration guide. No backend source, migration, dependency, or live VPS configuration was changed in this workspace.

## Spec and plan

- Spec: No new feature spec. The owner explicitly requested a deployment guide and previously asked to skip specs for this manual rollout.
- Plan: Conversation plan for a public Swagger page covering Identity, Learning, and Submission, plus a frontend integration file.
- Tasks: No formal tasks file for this operations and documentation change.
- Spec status at start: N/A for the requested guide and deployment templates.

## Questions clarified

| Question                                     | Conclusion                                                                                                              | Source                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Who can see Swagger?                         | Public HTTPS access on the existing `8443` site.                                                                        | Owner's choice during planning.                                                                                 |
| Which APIs appear?                           | Identity, Learning, and Submission; Community remains disabled and Judge is internal.                                   | Owner's choice and current deployment state.                                                                    |
| Can Swagger call the live API?               | Yes. “Try it out” is enabled and uses the production origin.                                                            | Owner's choice during planning.                                                                                 |
| Is the separate frontend guide still needed? | Yes.                                                                                                                    | Owner's choice during planning.                                                                                 |
| Where does Swagger exist in the backend?     | Each service serves `/docs` and `/docs-json`; the Gateway's proxy controller is excluded from its own Swagger document. | `libs/common/src/bootstrap.ts` and `apps/api-gateway/src/presentation/controllers/gateway-proxy.controller.ts`. |

## What was done

Added a Compose overlay that binds the three service documentation ports to
host loopback and starts a versioned Swagger UI container. Added an Nginx
location snippet for `/docs/` and three OpenAPI JSON URLs on the existing
HTTPS site. The UI initializer offers a service selector, sends browser
credentials, and adds the readable CSRF cookie to state-changing same-origin
API requests. Added a VPS application guide for these files.

Added `.docs/guides/frontend-api.md` and linked it from the repository README.
The guide covers the production origin, web login and cookies, CSRF, refresh,
logout, REST paths, Socket.IO submission results, the public Swagger page, and
the current Community and Microsoft web-login limitations.

## Why these choices

- The service OpenAPI documents describe the real frontend-facing routes;
  the Gateway's excluded proxy controller cannot provide those schemas.
- Loopback binds give host Nginx stable upstream addresses without exposing
  the service ports to the Internet.
- The separate Swagger UI has a single public path and a dropdown for the
  three documents. Its custom initializer supports the existing web-cookie
  and CSRF flow without changing backend authentication code.
- The Compose overlay leaves the manually maintained production Compose file
  intact and can be applied alongside it on the VPS.

## How the feature works

This is deployment configuration and documentation, not a product feature.
After the files are copied to the VPS and the overlay is applied, Nginx serves
`/docs/` from the loopback-bound Swagger UI container. Exact JSON routes under
`/docs/` fetch live OpenAPI documents from Identity, Learning, and Submission.
Swagger “Try it out” calls `/api` on the same public origin. The existing
Gateway continues to authenticate and route those calls. If the browser has a
CSRF cookie, the UI adds its value only to same-origin state-changing `/api`
requests. Invalid sessions, permissions, origins, or CSRF values remain
rejected by the backend.

## Configuration

- `docker/swagger/compose.swagger.yml`: loopback host ports `3101`, `3102`,
  `3103`, `3105`; Swagger UI image `v5.34.1` and `BASE_URL=/docs`.
- `docker/swagger/nginx-locations.conf`: public `/docs/` and three JSON spec
  locations within the existing HTTPS `8443` server.
- `docker/swagger/swagger-initializer.js`: service selector, browser cookies,
  and same-origin CSRF request header behavior.
- `docker/swagger/99-install-initializer.sh`: installs the custom initializer
  after the image's stock entrypoint configuration.
- No secret values were added or read.

## Verification

- Commands run and their results: pending final local syntax and Compose
  checks; record outcomes before finishing this entry.
- Not verified: live VPS Compose merge, Nginx reload, external browser access,
  and Swagger “Try it out”. They require applying the templates to the VPS.

## Remaining

- Not done: copy these files to the VPS, apply the Compose overlay, include
  the Nginx snippet in the existing `8443` server, and verify `/docs/` from
  outside the VPS.
- Risks: the public page exposes API schemas and its “Try it out” actions
  operate on production data. The three application containers are recreated
  once when the loopback ports are added.
