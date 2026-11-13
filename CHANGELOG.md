# Changelog

## 0.4.1

- On *Channel → Get* and *Get Many*, the optional **Info** setting moves into an **Options** collection and **Filter by Prefix** moves into a **Filters** collection (as *Name Prefix*), following the n8n verification guidelines. Workflows that set either one need to set it again in its new place.

## 0.4.0

- **Update Live Chart** on the Event resource: sends `chart.update` to a live chart's private channel (a KPI number, line, bars, progress bar, funnel or live poll opened through the Hibira MCP server), so a workflow can move the chart without writing JSON. Uses the Hibira API credential.

## 0.3.0

- **Waiting Room** resource on the Hibira node: *Get*, *Create or Update*, *Admit*, *Verify Pass* and *Delete* a waiting room through the signed HTTP API. Needs a Hibira server with waiting rooms.

## 0.2.0

- **Approval** resource on the Hibira node: *Request* asks a person to approve or choose through a Hibira-hosted answer link (optionally delivered by push or announced on a channel) and can wait for the answer; *Get* reads a request's status and answer. Needs a Hibira server with the approvals HTTP API.

## 0.1.2

- The package homepage on npm now links to https://hibira.io. No code changes.

## 0.1.1

- First npm release: publish with public access (0.1.0 failed to publish because provenance needs a public package).

## 0.1.0

- **Hibira** node: trigger events on channels; get one channel, many channels or a presence channel's users; terminate a user's connections; publish push notifications to interests or users; delete a push user. Usable as an AI agent tool.
- **Hibira Trigger** node: starts a workflow on Hibira webhooks (channel occupied/vacated, member added/removed, client events, cache miss, subscription count, chat messages). Registers and removes its own webhook URL on the app, and checks each request's signature.
- **Hibira API** and **Hibira Push API** credentials, both with a connection test.
