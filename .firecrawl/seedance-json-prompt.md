[Home](https://aicontentdrop.com/)/ [Blog](https://aicontentdrop.com/blog)/Seedance 2.0 JSON Prompt Guide — doubao-seedance-2-0 on the ARK Video API

![Seedance 2.0 JSON prompt guide — Bytedance video API for newcomers](https://aicontentdrop.com/blog/seedance-2-0-json-prompt-guide-header.webp?v=1)

**Short answer:** Seedance 2.0 is called with `POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`, and it is **asynchronous** — the POST returns a task ID, then you poll `GET /api/v3/contents/generations/tasks/{id}` until the status is `succeeded`. The model IDs are `doubao-seedance-2-0-260128` and `doubao-seedance-2-0-fast-260128`. **There is no `doubao-seedance-2-0-pro`** — that string is repeated all over the web and returns model-not-found. Full field table, three copy-paste bodies and the polling loop are below.

## What this guide does

This is a beginner-friendly breakdown of Bytedance's Seedance 2.0 video model — every field in its JSON request body explained, three ready-to-paste examples, and a plain-English answer to when you should pick it over other video models. By the end you will be able to send your first request to Seedance 2.0 and understand exactly what every field in the JSON controls.

If you have never called an AI model API before, that is completely fine. This guide defines every term the first time it comes up. You do not need to know how to code — but if you want to experiment with raw API calls, there are working curl and JavaScript snippets in section 7. If you want to generate a video right now without any setup, you can skip straight to [AI Content Drop's video generator](https://aicontentdrop.com/best-ai-video-generator) and paste your prompt there. No API key required.

## What is Seedance 2.0?

Seedance 2.0 is a video generation model from [Bytedance's Volcano Engine ARK platform](https://docs.volcengine.com/docs/82379). “T2V” (text-to-video) means you give it a text description and it generates a video matching that description. “I2V” (image-to-video) means you give it a still image and it animates it into a video. Seedance 2.0 supports both modes in the same API. It also generates native audio — speech and ambient sound — in a single pass, without a separate step. What it is genuinely best at is lip-synced, audio-first content: product demos where a spokesperson speaks to camera, UGC-style ads, and any clip where dialogue must match mouth movement naturally. It outputs at 480p, 720p, or 1080p and maintains visual consistency across multiple shots in one generation. What it cannot do is produce still images — it is a video-only model.

On [AI Content Drop](https://aicontentdrop.com/best-ai-video-generator) Seedance 2.0 costs **56 credits per generation** — confirmed directly from the platform's credit table. A cheaper sibling, Seedance 2 Fast, is available at **22 credits** — roughly half the cost — with the same native audio and image-to-video API. AI Content Drop uses post-deduct billing: credits are only charged after a video successfully completes. If the generation fails, no credits leave your account. For a deeper look at what Seedance 2.0 produces in practice, see our [Seedance 2.0 Pro review](https://aicontentdrop.com/blog/seedance-2-0-pro-review).

## The complete doubao-seedance-2-0-260128 JSON request body

Below is the full request body you send to the Volcano Engine ARK API to generate a video with Seedance 2.0. JSON stands for JavaScript Object Notation — it is the text format APIs use to send structured requests. You can copy this, fill in your own prompt, and run it immediately once you have an ARK API key.

```json
{
  "model": "doubao-seedance-2-0-260128",
  "content": [\
    {\
      "type": "text",\
      "text": "A confident founder in a clean home office, speaking directly to camera, natural window light from the left. She says: 'Our product ships in 24 hours.' Cinematic shallow depth of field, 16:9, 1080p."\
    }\
  ],
  "resolution": "1080p",
  "aspect_ratio": "16:9",
  "duration": 5,
  "with_audio": true
}
```

The `model` field tells ARK which Seedance version to run. The `content` array holds your prompt as a text item (and optionally an image for image-to-video mode). The remaining fields — `resolution`, `aspect_ratio`, `duration`, and `with_audio` — control the output quality, canvas shape, clip length, and whether speech and ambient audio are generated alongside the video. All fields are covered in detail in the next section.

## Field-by-field breakdown

Let's go through every field in that JSON request one at a time. For each field you will find: what type of value it expects, whether you must include it, what the default is if you leave it out, and a side-by-side comparison of a well-set value versus a poorly-set one.

### model

**Type:** string  \|  **Required:** Yes  \|  **Default:** none

This tells the Volcano Engine ARK API which model to run your request through. **A correction worth making first, because it is the single most common reason a first Seedance request 404s: there is no `doubao-seedance-2-0-pro` SKU.** That string circulates widely — it is probably what brought you here — but ARK does not serve it. On Volcengine `cn-beijing` the two real Seedance 2.0 video IDs are `doubao-seedance-2-0-260128` (standard) and `doubao-seedance-2-0-fast-260128` (faster, lower fidelity). On the BytePlus international host the same models drop the `doubao-` prefix. Pick the ID that matches the host you are calling.

- **Good:**`"doubao-seedance-2-0-260128"` on `ark.cn-beijing.volces.com` — the standard quality tier.
- **Good:**`"doubao-seedance-2-0-fast-260128"` when you are iterating and want the cheaper, quicker render.
- **Bad:**`"doubao-seedance-2-0-pro"` or `"seedance-2-0"` — neither is a real ARK model ID; both return model-not-found.

### content

**Type:** array of objects  \|  **Required:** Yes  \|  **Default:** none

The `content` array contains the instructions for the video. For text-to-video mode, include one object with `"type": "text"` and a `"text"` field holding your natural-language description. For image-to-video mode, add a second object with `"type": "image_url"` and an `"image_url"` object containing a `"url"` field pointing to your source image. The model reads both the text description and the image together to animate the image according to the prompt.

- **Good (T2V):** _One item: type "text", detailed description of the scene, subject action, camera movement, and lighting._
- **Bad:** _An empty array or a single item with a vague one-word text like "woman" — the model will generate something, but it will not match any specific intent._

For broader prompt-writing technique for video models, see our [AI prompt engineering secrets](https://aicontentdrop.com/blog/ai-prompt-engineering-secrets) guide.

### resolution

**Type:** string (enum)  \|  **Required:** No  \|  **Default:**`"720p"`

Controls the pixel height of the output video. Allowed values are `"480p"`, `"720p"`, and `"1080p"`. Higher resolution produces sharper footage but takes longer to generate. For ad creative that will run on social platforms or be embedded in a web page, use `"1080p"`. Use `"480p"` only for rapid concept tests where you want to check motion and composition before committing to a full-quality generation.

- **Good:**`"1080p"` for any video you plan to publish — platforms compress 720p further, compounding quality loss
- **Bad:**`"480p"` for a finished ad creative — the result will look soft on any modern screen

### aspect\_ratio

**Type:** string (enum)  \|  **Required:** No  \|  **Default:**`"16:9"`

Controls the width-to-height ratio of the output video canvas. Pick the ratio that matches where the video will be shown. Seedance 2.0 supports `"16:9"` (landscape — YouTube, standard web), `"9:16"` (portrait — TikTok, Instagram Reels, Stories), and `"1:1"` (square — Instagram feed, some ad placements).

- **Good:**`"9:16"` for a TikTok or Instagram Reel ad — portrait fills the phone screen without cropping
- **Bad:**`"16:9"` for TikTok — the video is pillarboxed with black bars and the subject appears small

### duration

**Type:** integer  \|  **Required:** No  \|  **Default:**`5`

Controls how many seconds long the generated video will be. Allowed values are `5` and `10` seconds. Five seconds is the right choice for most social ad formats. Ten seconds works for product demo clips or brand videos where you need more time to tell the story. If you include dialogue in your prompt, make sure the spoken content fits comfortably within the chosen duration — native audio generation will pace the speech to match.

- **Good:**`5` for a hook-style TikTok ad where attention drops after 3–5 seconds
- **Bad:**`10` with a one-line prompt — the model will pad the video with repetitive motion to fill the time

### with\_audio

**Type:** boolean  \|  **Required:** No  \|  **Default:**`false`

When set to `true`, Seedance 2.0 generates speech and ambient audio alongside the video in a single pass. This is Seedance 2.0's standout feature: most video models require a separate text-to-speech step and manual audio sync. Seedance 2.0 handles both at once, and if your prompt includes spoken dialogue, it will lip-sync the character to the generated speech. Set this to `false` only if you plan to add your own audio in post-production.

- **Good:**`true` for any spokesperson, founder testimonial, or product demo where someone speaks to camera
- **Bad:**`false` when your prompt includes dialogue — the video will show lip movement but produce a silent clip

## Allowed values reference table

Here is a single table you can bookmark and return to when choosing values for your Seedance 2.0 request.

| Field | Allowed values | Best for |
| --- | --- | --- |
| model | `doubao-seedance-2-0-260128` | Seedance 2.0 standard — 1080p, native audio, lip-sync. There is no `-pro` SKU. |
| resolution: 480p | 854 × 480 (16:9 base) | Fast concept tests; not for publishing |
| resolution: 720p | 1280 × 720 (16:9 base) | Draft-quality review; social secondary placements |
| resolution: 1080p | 1920 × 1080 (16:9 base) | All published ad creative, YouTube, social |
| aspect\_ratio: 16:9 | Landscape (wide) | YouTube, web embeds, Facebook feed |
| aspect\_ratio: 9:16 | Portrait (tall) | TikTok, Instagram Reels, Stories, Shorts |
| aspect\_ratio: 1:1 | Square | Instagram feed, Twitter/X video posts |
| duration | `5`, `10` (seconds) | 5s for hooks and ads; 10s for demos and brand films |
| with\_audio | `true`, `false` | true whenever dialogue or ambient sound is needed |

## 3 working copy-paste examples

### Example 1: E-commerce product demo

```json
{
  "model": "doubao-seedance-2-0-260128",
  "content": [\
    {\
      "type": "text",\
      "text": "A sleek wireless earbud product floats slowly on a white studio surface. Camera slowly orbits the product from left to right. Soft ambient product photography lighting. Text appears briefly at the bottom: 'AirMax Pro — $79'. Clean, premium, minimalist commercial aesthetic."\
    }\
  ],
  "resolution": "1080p",
  "aspect_ratio": "1:1",
  "duration": 5,
  "with_audio": false
}
```

This is a square 1:1 video sized for Instagram feed or Facebook carousel ads. The camera orbit instruction gives the model a clear motion directive, and the minimalist prompt keeps the composition clean for a product-first commercial look. Audio is off because the finished ad will have a voiceover added in post-production. Expect a polished rotating product reveal — the kind of clip that feels expensive without a studio budget. For a comparison of how this performs against other video models on e-commerce, see our [Seedance 2.0 vs Kling 3.0 e-commerce ads breakdown](https://aicontentdrop.com/blog/seedance-2-0-vs-kling-3-0-ecommerce-ads).

### Example 2: Portrait spokesperson (image-to-video with audio)

```json
{
  "model": "doubao-seedance-2-0-260128",
  "content": [\
    {\
      "type": "text",\
      "text": "A friendly entrepreneur in her 30s looks directly at camera and says: 'I scaled from zero to ten thousand subscribers in 90 days using this one tool.' Natural home office background, bookshelves softly blurred, warm afternoon window light. Documentary style, handheld slight movement."\
    },\
    {\
      "type": "image_url",\
      "image_url": {\
        "url": "https://your-cdn.com/founder-photo.jpg"\
      }\
    }\
  ],
  "resolution": "1080p",
  "aspect_ratio": "9:16",
  "duration": 5,
  "with_audio": true
}
```

This is the image-to-video (I2V) mode: a real photo of the spokesperson is passed alongside the text prompt, and Seedance 2.0 animates it with lip-synced speech and ambient audio in one pass. The 9:16 portrait ratio fills a TikTok or Reel natively. The dialogue line is written directly into the prompt — the model generates speech to match it and syncs the character's mouth to the audio. Replace the image URL with a hosted photo of your actual spokesperson. This is the format where Seedance 2.0 has the clearest quality advantage over alternatives. For detailed prompt templates for this use case, see our [Seedance 2.0 product demo prompt collection](https://aicontentdrop.com/blog/seedance-2-0-product-demo-video-prompts).

### Example 3: Cinematic scene for brand storytelling

```json
{
  "model": "doubao-seedance-2-0-260128",
  "content": [\
    {\
      "type": "text",\
      "text": "A lone figure walks along a fog-covered coastal cliff at dawn, silhouetted against a pale gold horizon. Slow cinematic dolly push forward. Wind sounds, distant ocean waves. The mood is contemplative and expansive. Anamorphic lens flare on the right edge. No dialogue."\
    }\
  ],
  "resolution": "1080p",
  "aspect_ratio": "16:9",
  "duration": 10,
  "with_audio": true
}
```

A 10-second cinematic wide shot with ambient audio — fog, wind, and ocean waves — generated natively in one pass. The 16:9 landscape canvas suits YouTube pre-roll, brand films, or hero sections on a landing page. The explicit “no dialogue” line prevents the model from generating unwanted speech while still enabling ambient sound. The dolly push instruction gives the model a camera movement target, which produces more intentional motion than an unspecified prompt.

## POST /api/v3/contents/generations/tasks — how to send and poll

An _API endpoint_ is a specific URL address on a server that listens for your request and sends back a response. Seedance 2.0 uses the Volcano Engine ARK API from Bytedance. The generation endpoint creates an asynchronous task — meaning it does not wait for the video to finish. Instead, it returns a task ID immediately, and you check back every few seconds (a process called _polling_) until the video is ready.

You will need a Volcano Engine ARK API key to call the endpoint directly. Get yours at [volcengine.com/docs/82379](https://docs.volcengine.com/docs/82379). The key is passed as a Bearer token in the Authorization header.

The official ARK endpoint for video task submission is:

```json
POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
```

Here is how to call it from a terminal using **curl** (a command-line tool available on macOS, Linux, and Windows 11):

```json
curl -X POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{
    "model": "doubao-seedance-2-0-260128",
    "content": [\
      {\
        "type": "text",\
        "text": "A confident founder speaks to camera: Our product ships in 24 hours. Clean home office, natural light, 9:16, 1080p."\
      }\
    ],
    "resolution": "1080p",
    "aspect_ratio": "9:16",
    "duration": 5,
    "with_audio": true
  }'
```

And here is the same request in **JavaScript** using the browser-native `fetch` API, followed by a polling loop:

```json
const ARK_API_KEY = process.env.ARK_API_KEY;

// Submit the generation task
const submitRes = await fetch(
  "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ARK_API_KEY,
    },
    body: JSON.stringify({
      model: "doubao-seedance-2-0-260128",
      content: [\
        {\
          type: "text",\
          text: "A confident founder speaks to camera: Our product ships in 24 hours. Clean home office, natural light.",\
        },\
      ],
      resolution: "1080p",
      aspect_ratio: "9:16",
      duration: 5,
      with_audio: true,
    }),
  }
);

const task = await submitRes.json();
const taskId = task.id;
console.log("Task created:", taskId);

// Poll every 5 seconds until the video is ready
async function pollTask(id) {
  const res = await fetch(
    `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${id}`,
    { headers: { "Authorization": "Bearer " + ARK_API_KEY } }
  );
  const data = await res.json();
  if (data.status === "succeeded") {
    console.log("Video URL:", data.content[0].video_url);
    return data;
  }
  if (data.status === "failed") throw new Error("Task failed: " + data.error);
  await new Promise((r) => setTimeout(r, 5000));
  return pollTask(id);
}

const result = await pollTask(taskId);
```

Or skip the API key entirely — paste your prompt into [Chat-to-Ads Studio](https://aicontentdrop.com/) or [AI Content Drop's video generator](https://aicontentdrop.com/best-ai-video-generator), and we'll handle the request for you. No API key, no JSON, no terminal — just type and generate.

## What the response looks like

The ARK API is asynchronous — it does not make you wait for the full video in one HTTP call. Instead, submitting a task returns a task record immediately. Polling means you ask the server every few seconds whether the job is done by calling the status endpoint with the task ID from step one.

A task submission response looks like this:

```json
{
  "id": "task-abc123xyz",
  "status": "pending",
  "created_at": 1746500000,
  "model": "doubao-seedance-2-0-260128"
}
```

This means: the task was accepted and is queued. Use the `id` value to poll for status.

When you poll `GET /api/v3/contents/generations/tasks/{task_id}`, the response transitions through states: `pending` (queued), `running` (actively generating), and `succeeded` (done). A completed response looks like:

```json
{
  "id": "task-abc123xyz",
  "status": "succeeded",
  "content": [\
    {\
      "type": "video_url",\
      "video_url": "https://cdn.volcengine.com/ark-videos/task-abc123xyz/output.mp4"\
    }\
  ],
  "created_at": 1746500000,
  "finished_at": 1746500180
}
```

The `video_url` inside `content[0]` is the download link for your generated video. Seedance 2.0 at 1080p typically takes 60–180 seconds to complete depending on duration and server load. The URL is temporary — download the video to your own storage promptly. Consult the latest Volcano Engine ARK docs at [volcengine.com/docs/82379](https://docs.volcengine.com/docs/82379) to confirm exact field names, as the API may evolve.

## Common errors and fixes

- **401 AuthenticationError** — Your API key is missing, expired, or copied incorrectly. Fix: Check that you passed `Authorization: Bearer $ARK_API_KEY` in the request header. Make sure the key is copied exactly from your Volcano Engine ARK console with no leading or trailing spaces. If you recently rotated your key, the old one is invalidated immediately.
- **400 invalid\_model / ModelNotFound** — You passed a model ID the API does not recognise. This is almost always `doubao-seedance-2-0-pro`, a widely-repeated string that is not a real SKU. Fix: use `doubao-seedance-2-0-260128` or `doubao-seedance-2-0-fast-260128` on `ark.cn-beijing.volces.com`, and drop the `doubao-` prefix on the BytePlus international host.
- **400 invalid\_aspect\_ratio** — You passed an aspect ratio not in the allowed list. Fix: Use one of `16:9`, `9:16`, or `1:1`. You cannot request arbitrary ratios like `4:3` or `3:4` — pick the closest match and crop the output in a video editor afterwards.
- **Content policy rejection** — Your prompt triggered Bytedance's content moderation. Fix: Remove any terms referencing violence, explicit content, real named individuals, or other policy-violating content. Rephrase descriptively. Safety filters cannot be disabled.
- **Task status stays "pending" for more than 5 minutes** — The generation queue is backed up, or the task silently failed. Fix: Poll the status endpoint again. If the status remains stuck, submit a new task. Seedance 2.0 at 1080p can legitimately take 2–3 minutes at peak load, but should not stay `pending` indefinitely.
- **429 RateLimitExceeded** — You have hit the per-minute or per-day request limit for your ARK tier. Fix: Add a delay between requests or upgrade your Volcano Engine ARK quota. On AI Content Drop, the credit system naturally paces usage so you are unlikely to hit provider rate limits directly.
- **Audio is missing even though with\_audio is true** — Your prompt did not include any dialogue or audio-triggering description, and the model generated a silent clip. Fix: Add an explicit instruction like _"ambient ocean waves and wind sounds"_ or include a dialogue line. Also confirm the `with_audio` field is a boolean `true` — not the string `"true"`.

## Seedance 2.0 vs alternatives — when to use this

Not every video job calls for Seedance 2.0 Pro. Here is a quick decision table to help you pick the right model. You can browse all available models in the [AI Content Drop marketplace](https://aicontentdrop.com/marketplace).

| Use case | Best model | Why |
| --- | --- | --- |
| Spokesperson ads, UGC-style testimonials, lip-synced dialogue, or any video where a person speaks to camera | Seedance 2.0 Pro — 56 credits | Native audio + lip-sync in one pass; no separate TTS step needed. See our [full Seedance 2.0 review](https://aicontentdrop.com/blog/seedance-2-0-pro-review) |
| High-fidelity cinematic scenes, complex motion, or creative films without dialogue requirements | Kling 3.0 — 22 credits | Kling 3.0 produces exceptional motion quality at roughly 60% the credit cost of Seedance 2.0 Pro when audio is not required. See our [Kling vs Sora comparison](https://aicontentdrop.com/blog/kling-vs-sora-comparison) |
| High-volume concept tests (10+ variants quickly) or audio-enabled clips where cost is the primary constraint | Seedance 2 Fast — 22 credits | Same native audio + image-to-video API as the Pro tier at less than half the credit cost — ideal for rapid iteration before committing to a full-quality Pro generation |

For a broader look at how all major 2026 video models compare across ad use cases, see our [best AI video generators for 2026](https://aicontentdrop.com/blog/best-ai-video-generators-2026) guide.

## Cost math for newcomers

Here is a concrete example to make the credit system tangible. Say you are launching a new product and you want 10 spokesperson ad variants — different hooks, different dialogue lines, different aspect ratios — to A/B test across TikTok and Instagram.

10 videos × 56 credits each = **560 credits**.

The Professional plan at $49/month gives you 450 base credits. A 10-variant Seedance 2.0 Pro batch uses slightly more than one full month of Professional budget — you would need a small credit top-up of about 110 credits to complete the batch. Alternatively, you could run the same 10 variants with Seedance 2 Fast at 22 credits each (220 credits total) to validate your hooks first, then regenerate only the winning variants at full Pro quality, spending roughly 280 credits total — well within the Professional plan.

On the Starter plan ($19/month, 150 credits), 150 ÷ 56 = 2 full Seedance 2.0 Pro generations before you need to top up. The Starter plan is better suited to 2–3 final-quality clips per month with Seedance Fast handling the iteration loop. Because AI Content Drop uses post-deduct billing, none of these credits leave your account if a generation fails — you only pay for what successfully completes.

## Glossary

PromptThe text description you give the AI model. It is your instruction for what the generated video should contain, what motion should happen, what mood or style to follow, and — for Seedance 2.0 — what dialogue or audio to generate.

JSONJavaScript Object Notation — a plain-text format APIs use to send and receive structured data. It looks like a set of key–value pairs wrapped in curly braces. Every request body in this guide is JSON.

API requestA message you send to a server asking it to do something — in this case, generate a video. The request contains your instructions in JSON format and is sent to the provider's endpoint URL.

EndpointA specific URL on a server that is set up to receive a particular type of request. For Seedance 2.0, the task submission endpoint is `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`.

Task IDA unique identifier the server returns when you submit a generation request. You use it to check the status of your job and retrieve the finished video URL once the task completes.

PollingAsking the server every few seconds whether an asynchronous job is finished. Because video generation takes 1–3 minutes, the ARK API returns a task ID immediately and you poll the status endpoint until the state changes to “succeeded”.

Aspect ratioThe width-to-height proportion of the video canvas. `16:9` is widescreen (landscape), `9:16` is portrait (phone-native), and `1:1` is a square. Pick the ratio that matches the placement where the video will be shown.

Native audioSpeech and ambient sound generated by the model alongside the video in a single pass — no separate text-to-speech or audio-sync step. Seedance 2.0 is one of the few models that supports native audio with lip-sync.

Post-deduct billingA billing model where credits are only deducted from your account after a generation succeeds. Failed or errored generations do not cost you anything.

## FAQ

### Can I just use the chat instead of writing JSON?

Yes. If writing JSON feels like too much right now, open the [Chat-to-Ads Studio](https://aicontentdrop.com/) and describe the video you want in plain English. The studio builds the API request for you — you can say "make a 9:16 spokesperson video where she says 'our product ships in 24 hours'" and it will set `aspect_ratio`, `with_audio`, and the dialogue correctly without you touching any JSON.

### What if I get a 401 error?

A 401 means the server rejected your API key. Check that the `Authorization` header is spelled correctly, that it reads `Bearer` followed by a space and then your key, and that the key is pasted exactly from your Volcano Engine ARK console — no extra spaces at the start or end. If you recently regenerated your key, the old one is invalidated immediately.

### How do I get an aspect ratio not in the list?

You cannot request a custom ratio like `4:3` or `21:9` directly — the model only accepts the three enum values listed in the reference table. Pick the closest match (`16:9` for any wide format, `9:16` for any tall format), generate the video, then crop or letterbox it to your exact target dimensions in any video editor or with `ffmpeg`.

### Does Seedance 2.0 support audio in every output?

Audio is opt-in: you must set `"with_audio": true` in your request. When enabled, the model generates speech (if your prompt includes dialogue) and ambient environmental sound in the same generation pass. Lip-sync is automatic — the character's mouth movements are aligned to the generated speech without any extra step. If you need a silent clip (because you plan to add your own voiceover), set `"with_audio": false` or omit the field entirely, since the default is `false`.