> ## Documentation Index
>
> Fetch the complete documentation index at: [/docs/llms.txt](https://platform.minimax.io/docs/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://platform.minimax.io/docs/guides/video-generation#content-area)

MiniMax currently offers two video generation models — **MiniMax H3** and **MiniMax H3 Max**:

- **MiniMax H3**: an open, general-purpose multimodal video model. It understands text, image, video, and audio inputs in a unified way, and supports video generation, reference-based creation, and video editing.
- **MiniMax H3 Max**: jointly released by MiniMax and [fal.ai](https://fal.ai/); a video generation model post-trained by fal.ai on MiniMax H3 and optimized for high-speed generation. It delivers mainstream 480P and 768P output and generates faster than MiniMax H3. It currently supports T2V (Text-to-Video) and I2V (Image-to-Video); Reference Generation is coming soon.

Note: To use MiniMax H3 or MiniMax H3 Max, please select the [Pay-as-you-go API](https://platform.minimax.io/docs/guides/pricing-paygo#video).

## [​](https://platform.minimax.io/docs/guides/video-generation\#supported-generation-modes)  Supported Generation Modes

### [​](https://platform.minimax.io/docs/guides/video-generation\#minimax-h3)  MiniMax H3

| Mode | Input | Typical Use Case |
| --- | --- | --- |
| Text-to-Video | Prompt | Generate a video from a text description, from scratch |
| Image-to-Video | Prompt + first-frame image and/or last-frame image | Control the starting or ending frame; bring a specific frame naturally to life |
| Reference Generation | Prompt + reference images, videos, or audio | Reference character, motion, camera, style, voice, or editing rhythm |

### [​](https://platform.minimax.io/docs/guides/video-generation\#minimax-h3-max)  MiniMax H3 Max

| Mode | Input | Typical Use Case |
| --- | --- | --- |
| Text-to-Video (T2V) | Prompt | Generate a video from a text description, from scratch |
| Image-to-Video (I2V) | Prompt + first-frame image and/or last-frame image | Control the starting or ending frame; bring a specific frame naturally to life |

## [​](https://platform.minimax.io/docs/guides/video-generation\#model-specs-&-input-requirements)  Model Specs & Input Requirements

### [​](https://platform.minimax.io/docs/guides/video-generation\#output-specs)  Output Specs

| Item | MiniMax H3 | MiniMax H3 Max |
| --- | --- | --- |
| Model name | `MiniMax-H3` | `MiniMax-H3-Max` |
| Output resolution | 768P / 2K | 480P / 768P |
| Output duration | 4–15 seconds, integer values only | 5–15 seconds, integer values only |
| Aspect ratio | Common ratios supported, or adaptive; [see the API reference](https://platform.minimax.io/docs/api-reference/video-generation-v2-create) for details | Common ratios supported, or adaptive; [see the API reference](https://platform.minimax.io/docs/api-reference/video-generation-v2-create) for details |

### [​](https://platform.minimax.io/docs/guides/video-generation\#input-requirements)  Input Requirements

| Item | Requirement |
| --- | --- |
| **First/last-frame entry** | Images: 0, 1, or 2; width/height in \[256, 5760\]; aspect ratio (width/height) in 2:5 – 5:2 |
|  | With no image input, this becomes Text-to-Video |
| **Reference entry** | Images: ≤ 9; width/height in \[256, 5760\] |
|  | Videos: ≤ 3 clips; per-clip duration \[2, 15\] s; total duration ≤ 15 s; width/height in \[256, 5760\]; aspect ratio (width/height) in 2:5 – 5:2 |
|  | Audio: ≤ 3 clips; per-clip duration \[2, 15\] s; total duration ≤ 15 s |
|  | Mixed input is capped at 12 files in total |
|  | With no image, video, or audio input, this becomes Text-to-Video |
| **Supported input formats** | Video: H.264/AVC, H.265/HEVC; in-video audio: AAC, MP3 |
|  | Image: JPG, JPEG, PNG, WEBP, HEIC, HEIF |
|  | Audio: WAV, MP3 |
| **File size limits** | Video ≤ 50 MB per file; image ≤ 30 MB per file; audio ≤ 15 MB per file (limits apply per asset, not in aggregate) |
|  | API request body ≤ 64 MB (URL input is recommended for large assets) |
| **Prompt length limit** | ≤ 7000 characters |

## [​](https://platform.minimax.io/docs/guides/video-generation\#workflow)  Workflow

Video generation is an asynchronous process consisting of three steps:

1. **Create a generation task**: Submit a video generation request and receive a task ID (`task_id`).
2. **Check task status**: Poll the task status using the `task_id`. Once successful, the response directly returns the video download URL (`content.url`).
3. **Retrieve video file**: Download the video from `content.url` and save it locally.

## [​](https://platform.minimax.io/docs/guides/video-generation\#features-and-code-examples)  Features and Code Examples

For simplicity, we encapsulate polling and downloading logic into reusable functions. The following examples demonstrate how to create tasks in four different modes.

```
import os
import time
import requests

api_key = os.environ["MINIMAX_API_KEY"]
headers = {"Authorization": f"Bearer {api_key}"}
BASE_URL = "https://api.minimax.io"
MODEL = "MiniMax-H3"

# --- Step 1: Create a video generation task ---
# MiniMax-H3 uses a multimodal content[] structure: each element is distinguished by type
# (text / image_url / video_url / audio_url) and can be labeled with a role. Each function below
# corresponds to one mode (text-to-video, image-to-video, first-and-last-frame, reference-to-video),
# starts an asynchronous task, and returns a unique task_id.

def invoke_text_to_video() -> str:
    """(Mode 1) Text-to-video (t2va). For t2va, ratio is required and cannot be 'adaptive'."""
    url = f"{BASE_URL}/v2/video_generation"
    payload = {
        "model": MODEL,
        "content": [\
            # A type=text item is required and defines the video's content and motion.\
            {"type": "text", "text": "A tiktok dancer is dancing on a drone, doing flips and tricks."},\
        ],
        "duration": 5,
        "resolution": "2K",
        "ratio": "16:9",
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()["task_id"]

def invoke_image_to_video() -> str:
    """(Mode 2) Image-to-video (i2va) using a first-frame image and text."""
    url = f"{BASE_URL}/v2/video_generation"
    payload = {
        "model": MODEL,
        "content": [\
            {"type": "text", "text": "Contemporary dance, the people in the picture are performing contemporary dance."},\
            # role=first_frame specifies the opening frame; for image-to-video the aspect ratio is\
            # determined by the input image and ratio is always 'adaptive'.\
            {"type": "image_url", "image_url": {"url": "https://filecdn.minimax.chat/public/85c96368-6ead-4eae-af9c-116be878eac3.png"}, "role": "first_frame"},\
        ],
        "duration": 5,
        "resolution": "2K",
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()["task_id"]

def invoke_start_end_to_video() -> str:
    """(Mode 3) First-frame + last-frame image + text."""
    url = f"{BASE_URL}/v2/video_generation"
    payload = {
        "model": MODEL,
        "content": [\
            {"type": "text", "text": "A little girl grows up."},\
            # role=first_frame specifies the opening frame\
            {"type": "image_url", "image_url": {"url": "https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg"}, "role": "first_frame"},\
            # role=last_frame specifies the ending frame\
            {"type": "image_url", "image_url": {"url": "https://filecdn.minimax.chat/public/97b7cd08-764e-4b8b-a7bf-87a0bd898575.jpeg"}, "role": "last_frame"},\
        ],
        "duration": 5,
        "resolution": "2K",
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()["task_id"]

def invoke_reference_to_video() -> str:
    """(Mode 4) Reference-to-video (r2va): combine reference images / videos / audio."""
    url = f"{BASE_URL}/v2/video_generation"
    payload = {
        "model": MODEL,
        "content": [\
            {"type": "text", "text": "The character performs street dance, following the motion in reference video 1; the character's appearance follows reference images 1 and 2."},\
            {"type": "image_url", "image_url": {"url": "https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/9d5c7a33fa6e_01_%E5%9B%BE1_MHGgbVga3o_gpt4o-image-1780651118146.png"}, "role": "reference_image"},\
            {"type": "image_url", "image_url": {"url": "https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/7af326902315_00_%E5%9B%BE2_YqtKbY1jpo_u4391985813_Young_male_wearing_cream_hoodie_and_dark_brown_sh_45d56ed0-d626-4c37-9a5b-77f51f374982_1.png"}, "role": "reference_image"},\
            {"type": "video_url", "video_url": {"url": "https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/d9060f5cb9ab_02_%E8%A7%86%E9%A2%911_HDvmbpQrEo_%E8%A1%97%E8%88%9E3.mp4"}, "role": "reference_video"},\
        ],
        "duration": 5,
        "resolution": "2K",
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()["task_id"]

# --- Step 2: Poll task status ---
# Since video generation is time-consuming, the API works asynchronously.
# After submitting a task, poll its status using the task_id. On success the response directly
# returns the video download URL (content.url) — no file_id exchange is needed.
def query_task_status(task_id: str) -> str:
    """Poll task status by task_id and return the video download URL on success."""
    url = f"{BASE_URL}/v2/query/video_generation/{task_id}"
    while True:
        # A recommended polling interval is 10 seconds to avoid unnecessary server load.
        time.sleep(10)
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        task = response.json()["task"]
        status = task["status"]
        print(f"Current task status: {status}")
        # On success, task.content.url is the video download URL.
        if status == "succeeded":
            return task["content"]["url"]
        # Terminal failure states: failed / cancelled.
        if status in ("failed", "cancelled"):
            raise Exception(f"Video generation did not succeed: status={status}, error={task.get('error')}")

# --- Step 3: Download and save the video file ---
# On success you get the download URL directly; download the content and save it locally.
def fetch_video(download_url: str):
    """Download the video and save it locally."""
    with open("output.mp4", "wb") as f:
        video_response = requests.get(download_url)
        video_response.raise_for_status()
        f.write(video_response.content)
    print("Video successfully saved as output.mp4")

# --- Main process: end-to-end example ---
# Demonstrates the full workflow from task creation to video retrieval.
if __name__ == "__main__":
    # Choose a task creation mode
    task_id = invoke_text_to_video()  # Mode 1: Text-to-Video
    # task_id = invoke_image_to_video() # Mode 2: Image-to-Video
    # task_id = invoke_start_end_to_video() # Mode 3: First-and-Last-Frame Video
    # task_id = invoke_reference_to_video() # Mode 4: Reference-to-Video
    print(f"Video generation task submitted, Task ID: {task_id}")
    download_url = query_task_status(task_id)
    print(f"Task succeeded, video URL: {download_url}")
    fetch_video(download_url)
```

## [​](https://platform.minimax.io/docs/guides/video-generation\#video-generation-results)  Video Generation Results

### [​](https://platform.minimax.io/docs/guides/video-generation\#text-to-video)  Text-to-Video

Provide a text description only, and the model generates a video from it. For finer control, add camera motion instructions (e.g., \[pan\], \[zoom\], \[static\]) directly after key descriptions to guide the camera work.Example output:

### [​](https://platform.minimax.io/docs/guides/video-generation\#first/last-frame-image-to-video)  First/Last-Frame Image-to-Video

Provide a first-frame image, a last-frame image, or both, along with a text description. The opening or ending frame is fully controlled — ideal for bringing a static image to life or filling in a natural transition.Example output:

### [​](https://platform.minimax.io/docs/guides/video-generation\#reference-generation)  Reference Generation

Provide reference images, reference videos, or reference audio (any combination), together with a text description. The model keeps the features of the reference subject or asset consistent throughout the generated video.Example output:

## [​](https://platform.minimax.io/docs/guides/video-generation\#create-h3-context-ir-task)  Create H3-Context-IR Task

To obtain a more complete prompt before generating a video, [create an H3-Context-IR task](https://platform.minimax.io/docs/api-reference/video-generation-v2-h3-context-ir). H3-Context-IR deeply interprets multimodal context across text, images, audio, and video, reasons about the relationships among those inputs, and produces a structured representation with richer semantic detail while preserving the user’s original intent as much as possible. This endpoint only returns an enhanced prompt and does not create a video.H3-Context-IR runs asynchronously. After creating the task, use [Query Task](https://platform.minimax.io/docs/api-reference/video-generation-v2-query) or [List Tasks](https://platform.minimax.io/docs/api-reference/video-generation-v2-list); retrieve the enhanced prompt from `content.prompt` when the task succeeds and identify the task by `task_type=h3_context_ir`.

## [​](https://platform.minimax.io/docs/guides/video-generation\#video-regeneration)  Video Regeneration

If you have a video that meets the MiniMax-H3 768P output specifications, use [Create Video Regeneration Task](https://platform.minimax.io/docs/api-reference/video-generation-v2-regeneration) to produce a 2K video. The request must reproduce all `content` used to generate the 768P video and add exactly one source-video item with `type=video_url` and `role=base_video`.Regeneration tasks share [Query Task](https://platform.minimax.io/docs/api-reference/video-generation-v2-query), [List Tasks](https://platform.minimax.io/docs/api-reference/video-generation-v2-list), and [Cancel or Delete Task](https://platform.minimax.io/docs/api-reference/video-generation-v2-delete) with other H3 tasks. Identify them by `task_type=regeneration`.

## [​](https://platform.minimax.io/docs/guides/video-generation\#recommended-reading)  Recommended Reading

[**Create Video Generation Task** \\
\\
Use this API to create a MiniMax-H3 video generation task from multimodal content input.\\
\\
Click here](https://platform.minimax.io/docs/api-reference/video-generation-v2-create)

[**Create H3-Context-IR Task** \\
\\
Deeply interpret multimodal video-generation context and produce a structured, enhanced prompt.\\
\\
Click here](https://platform.minimax.io/docs/api-reference/video-generation-v2-h3-context-ir)

[**Create Video Regeneration Task** \\
\\
Regenerate a source video that meets the MiniMax-H3 768P output specifications and produce a 2K video.\\
\\
Click here](https://platform.minimax.io/docs/api-reference/video-generation-v2-regeneration)

[**Query Task** \\
\\
Use this API to query task status by task\_id and retrieve the video download URL.\\
\\
Click here](https://platform.minimax.io/docs/api-reference/video-generation-v2-query)

[**List Tasks** \\
\\
List tasks from the last 7 days and distinguish task types with task\_type.\\
\\
Click here](https://platform.minimax.io/docs/api-reference/video-generation-v2-list)

[**Cancel or Delete Task** \\
\\
Cancel a queued task or delete a succeeded or failed task record.\\
\\
Click here](https://platform.minimax.io/docs/api-reference/video-generation-v2-delete)

[**Pricing** \\
\\
Detailed information on model pricing and API packages.\\
\\
Click here](https://platform.minimax.io/docs/guides/pricing-paygo#video)

### Cookie Consent

We use cookies to analyze website usage to improve your experience.

By clicking "Accept All Cookies", you agree to the storing of cookies on your device to enhance site navigation, analyze site usage, and assist in our marketing efforts. You may click **Reject All** to reject non-essential cookies.

[Read our Cookies Policy](https://platform.minimax.io/protocol/cookie-policy)

Reject AllAccept All Cookies