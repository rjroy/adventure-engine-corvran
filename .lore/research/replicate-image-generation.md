---
title: Replicate Image Generation
date: 2026-03-17
status: resolved
tags: [replicate, image-generation, api-reference]
---

# Research: Replicate Image Generation

## Summary

Replicate is a hosted inference platform that runs open-source ML models via HTTP API. This document covers the API surface, model landscape, and practical design considerations for integrating Replicate's image generation capabilities.

## 1. Replicate API Surface

### Authentication

Bearer token in the `Authorization` header. Tokens are created at `replicate.com/account/api-tokens`. A single token covers all API operations.

```
Authorization: Bearer r8_<token>
```

Source: [Replicate HTTP API Reference](https://replicate.com/docs/reference/http)

### Prediction Lifecycle

Predictions are the core unit of work. The lifecycle for image generation:

1. **Create** (`POST /v1/models/{owner}/{name}/predictions` for official models, `POST /v1/predictions` for community models with version hash)
2. **Poll** (`GET /v1/predictions/{id}`) or use `Prefer: wait` header for synchronous mode
3. **Result**: `output` field contains HTTPS URL(s) to generated images

Six statuses: `starting` → `processing` → `succeeded` | `failed` | `canceled` | `aborted` (deadline exceeded before start).

**Synchronous mode**: Adding `Prefer: wait` or `Prefer: wait=60` holds the HTTP connection until the prediction completes or times out. This eliminates polling for fast models (FLUX Schnell completes in ~2s).

**Webhook mode**: Set `webhook` URL and `webhook_events_filter` at creation. Events: `start`, `output`, `logs`, `completed`. Payloads match the GET response shape. Handlers must be idempotent (retries on failure).

**Critical detail**: API prediction outputs auto-delete after 1 hour. Images must be downloaded within that window. Web UI predictions persist indefinitely.

Source: [Prediction Lifecycle](https://replicate.com/docs/topics/predictions/lifecycle), [Output Files](https://replicate.com/docs/topics/predictions/output-files)

### Model Selection

Two categories with different API patterns:

| Type | Format | Endpoint | Versioning |
|------|--------|----------|-----------|
| Official | `owner/model-name` | `/v1/models/{owner}/{name}/predictions` | Always latest, non-breaking updates |
| Community | `owner/model:version_hash` | `/v1/predictions` (version in body) | 64-char hash, immutable |

Official models (e.g., `black-forest-labs/flux-1.1-pro`) are always warm, have stable APIs, and use per-output pricing. Community models may cold-boot and charge per-second GPU time.

Source: [Official Models](https://replicate.com/docs/topics/models/official-models)

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Create prediction | 600/min |
| All other endpoints | 3,000/min |

HTTP 429 on throttle. Higher limits available via support.

Source: [Replicate HTTP API Reference](https://replicate.com/docs/reference/http)

## 2. Model Landscape

### Popular Image Generation Models (March 2026)

| Model | Runs | Pricing | Notes |
|-------|------|---------|-------|
| FLUX.1 Schnell | 633.8M | $0.003/image | Fastest, lowest quality. Good for drafts |
| FLUX.1 Dev | ~50M | $0.025-0.030/image | Good balance of speed and quality |
| FLUX.1 Pro | ~20M | $0.04-0.055/image | High quality, slower |
| FLUX.2 Pro | 4.1M | Not confirmed | Newer, improved quality |
| Ideogram v3 Turbo | 8.3M | $0.03/image | Strong text rendering |
| Recraft V3/V4 | varies | $0.04/image | Best for design/vector, native SVG output |
| Stable Diffusion 3 | varies | $0.035/image | Stability AI's latest |

**Pricing model**: Official models charge per image (flat rate). Community models charge per-second GPU time: T4 at $0.000225/sec, A40 at $0.000575/sec, A100 at $0.001400/sec, H100 at $0.001525/sec.

**Practical cost range**: $0.003/image (FLUX Schnell) to $0.055/image (FLUX Pro).

Source: [Replicate Pricing](https://replicate.com/pricing), [Text-to-Image Collection](https://replicate.com/collections/text-to-image)

## 3. Existing Tools

### Official `replicate-mcp` Server

Replicate ships an official MCP server as npm package `replicate-mcp` (also available as a hosted remote server at `mcp.replicate.com`).

Tools: `models.search`, `models.list`, `models.get`, `predictions.create`, `predictions.get`.

This is a thin API wrapper. It provides generic access to all Replicate models but has no image-specific affordances (no curated model list, no parameter discovery per model, no output file handling).

Source: [Replicate MCP Docs](https://replicate.com/docs/reference/mcp)

### `art-gen-mcp` (Existing Plugin)

A purpose-built Replicate MCP server at `/home/rjroy/Projects/wyrd-gateway/art-gen-mcp/`. Python MCP server (`mcp>=1.0.0`, `replicate>=0.34.0`) distributed via the `vibe-garden` marketplace.

**16 tools** across five workflows:
- Text-to-image generation (Replicate + local diffusers)
- Image-to-video generation
- Image-to-image editing (style transfer, portrait editing)
- Background removal
- Model listing and parameter discovery (per-model)

Key capabilities beyond `replicate-mcp`:
- Curated model registries with descriptions and use-case categorization
- Per-model parameter discovery (the agent can ask what knobs a model exposes)
- Automatic image download and save to disk (handles the 1-hour output expiry)
- Cost information per model
- Multiple generation backends (Replicate remote, local diffusers)

## 4. Design Considerations

### Async Handling

Most image generation completes in 2-15 seconds. FLUX Schnell is ~2s, FLUX Pro is ~10-15s.

**Recommended approach**: Use `Prefer: wait=60` for synchronous predictions. This holds the HTTP connection until the prediction completes or times out. For models that exceed 60s (rare for image generation), fall back to create-then-poll with a sleep loop.

### Output Handling

**Key constraint**: Replicate output URLs expire after 1 hour. Any integration must download images immediately and store them locally. Return the local file path, not the Replicate URL.

### Credential Management

Standard approach: `REPLICATE_API_TOKEN` environment variable. This matches Replicate's own convention and how most tools expect it.

### Cost Awareness

At $0.003-0.055 per image, costs are low for individual generations. The cheapest useful approach: log each generation with model and estimated cost. Add hard limits later if costs become a problem.

### Tool-Level Design Sketch

A minimal integration needs three operations:

```
generate_image(
  prompt: string,          // Required. Text description
  model?: string,          // Default: "black-forest-labs/flux-schnell"
  output_path?: string,    // Where to save the downloaded image
  width?: number,          // Model-dependent
  height?: number,         // Model-dependent
  num_outputs?: number,    // Default: 1
) → { path: string, model: string, prediction_id: string, cost_estimate: string }

list_models() → { models: Array<{ id, name, description, cost_per_image, speed }> }

check_prediction(
  prediction_id: string
) → { status, output_urls?, error?, elapsed_seconds }
```

The `generate_image` tool handles the full lifecycle: create prediction, wait for completion, download image, return local path. Callers don't need to think about Replicate's async model.

## Sources

- [Replicate HTTP API Reference](https://replicate.com/docs/reference/http)
- [Prediction Lifecycle](https://replicate.com/docs/topics/predictions/lifecycle)
- [Output Files](https://replicate.com/docs/topics/predictions/output-files)
- [Official Models](https://replicate.com/docs/topics/models/official-models)
- [Webhooks](https://replicate.com/docs/topics/webhooks)
- [Replicate Pricing](https://replicate.com/pricing)
- [Text-to-Image Collection](https://replicate.com/collections/text-to-image)
- [Replicate MCP Docs](https://replicate.com/docs/reference/mcp)
