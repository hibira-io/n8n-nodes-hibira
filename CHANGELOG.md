# Changelog

## 0.1.1

- First npm release: publish with public access (0.1.0 failed to publish because provenance needs a public package).

## 0.1.0

- **Hibira** node: trigger events on channels; get one channel, many channels or a presence channel's users; terminate a user's connections; publish push notifications to interests or users; delete a push user. Usable as an AI agent tool.
- **Hibira Trigger** node: starts a workflow on Hibira webhooks (channel occupied/vacated, member added/removed, client events, cache miss, subscription count, chat messages). Registers and removes its own webhook URL on the app, and checks each request's signature.
- **Hibira API** and **Hibira Push API** credentials, both with a connection test.
