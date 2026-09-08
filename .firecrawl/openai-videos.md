[Skip to content](https://developers.openai.com/api/reference/resources/videos/methods/create#_top)

For the complete documentation index, see [llms.txt](https://developers.openai.com/llms.txt). Markdown versions of documentation pages are available by appending
`.md` to the page URL.

[API Reference](https://developers.openai.com/api/reference)

[Videos](https://developers.openai.com/api/reference/resources/videos)

Copy Markdown

Open in **ChatGPT**

* * *

**Copy Markdown**

**View as Markdown**

# Create video

POST/videos

Create a new video generation job from a prompt and optional reference assets.

##### Body ParametersJSONExpand Collapse

prompt: string

Text prompt that describes the video to generate.

minLength1

maxLength32000

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20prompt%20%3E%20(schema))

input\_reference: optional [ImageInputReferenceParam](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20image_input_reference_param%20%3E%20(schema)) { file\_id, image\_url }

Optional reference object that guides generation. Provide exactly one of `image_url` or `file_id`.

file\_id: optional string

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20input_reference%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20image_input_reference_param%20%3E%20(schema)%20%3E%20(property)%20file_id)

image\_url: optional string

A fully qualified URL or base64-encoded data URL.

maxLength20971520

formaturi

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20input_reference%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20image_input_reference_param%20%3E%20(schema)%20%3E%20(property)%20image_url)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20input_reference%20%3E%20(schema))

model: optional [VideoModel](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema))

The video generation model to use (allowed values: sora-2, sora-2-pro). Defaults to `sora-2`.

One of the following:

string

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%200)

"sora-2"or"sora-2-pro"or"sora-2-2025-10-06"or2 more

One of the following:

"sora-2"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%200)

"sora-2-pro"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%201)

"sora-2-2025-10-06"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%202)

"sora-2-pro-2025-10-06"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%203)

"sora-2-2025-12-08"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%204)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20model%20%3E%20(schema))

seconds: optional [VideoSeconds](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20video_seconds%20%3E%20(schema))

Clip duration in seconds (allowed values: 4, 8, 12). Defaults to 4 seconds.

One of the following:

"4"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20seconds%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_seconds%20%3E%20(schema)%20%3E%20(member)%200)

"8"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20seconds%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_seconds%20%3E%20(schema)%20%3E%20(member)%201)

"12"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20seconds%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_seconds%20%3E%20(schema)%20%3E%20(member)%202)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20seconds%20%3E%20(schema))

size: optional [VideoSize](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema))

Output resolution formatted as width x height (allowed values: 720x1280, 1280x720, 1024x1792, 1792x1024). Defaults to 720x1280.

One of the following:

"720x1280"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20size%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%200)

"1280x720"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20size%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%201)

"1024x1792"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20size%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%202)

"1792x1024"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20size%20%3E%20(schema)%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%203)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(method)%20create%20%3E%20(params)%200%20%3E%20(param)%20size%20%3E%20(schema))

##### ReturnsExpand Collapse

Videoobject {id, completed\_at, created\_at, 10 more}

Structured information describing a generated video job.

id: string

Unique identifier for the video job.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20id)

completed\_at: numberornull

Unix timestamp (seconds) for when the job completed, if finished.

formatunixtime

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20completed_at)

created\_at: number

Unix timestamp (seconds) for when the job was created.

formatunixtime

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20created_at)

error: [VideoCreateError](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)) { code, message, misalignment } ornull

Error payload that explains why generation failed, if applicable.

code: string

A machine-readable error code that was returned.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20code)

message: string

A human-readable description of the error that was returned.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20message)

misalignment: optional object {detailed\_explanation, error\_type, steer}

detailed\_explanation: optional string

The public explanation for this block.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20detailed_explanation)

error\_type: optional stringor"potentially\_unintended\_data\_transfer"or"potentially\_unintended\_data\_access"or"potentially\_unintended\_destructive\_activity"or"other"

An optional classification; clients must accept additional values.

One of the following:

string

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type%20%3E%20(variant)%200)

SafetyAlertErrorType = "potentially\_unintended\_data\_transfer"or"potentially\_unintended\_data\_access"or"potentially\_unintended\_destructive\_activity"or"other"

An optional classification; clients must accept additional values.

One of the following:

"potentially\_unintended\_data\_transfer"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type%20%3E%20(variant)%201%20%3E%20(member)%200)

"potentially\_unintended\_data\_access"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type%20%3E%20(variant)%201%20%3E%20(member)%201)

"potentially\_unintended\_destructive\_activity"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type%20%3E%20(variant)%201%20%3E%20(member)%202)

"other"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type%20%3E%20(variant)%201%20%3E%20(member)%203)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type%20%3E%20(variant)%201)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20error_type)

steer: optional object {message}

An optional public continuation instruction.

message: string

The public continuation instruction.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20steer%20%3E%20(property)%20message)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment%20%3E%20(property)%20steer)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error%20%2B%20(resource)%20videos%20%3E%20(model)%20video_create_error%20%3E%20(schema)%20%3E%20(property)%20misalignment)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20error)

expires\_at: numberornull

Unix timestamp (seconds) for when the downloadable assets expire, if set.

formatunixtime

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20expires_at)

model: [VideoModel](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema))

The video generation model that produced the job.

One of the following:

string

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%200)

"sora-2"or"sora-2-pro"or"sora-2-2025-10-06"or2 more

One of the following:

"sora-2"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%200)

"sora-2-pro"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%201)

"sora-2-2025-10-06"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%202)

"sora-2-pro-2025-10-06"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%203)

"sora-2-2025-12-08"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201%20%3E%20(member)%204)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model%20%2B%20(resource)%20videos%20%3E%20(model)%20video_model%20%3E%20(schema)%20%3E%20(variant)%201)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20model)

object: "video"

The object type, which is always `video`.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20object)

progress: number

Approximate completion percentage for the generation task.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20progress)

prompt: stringornull

The prompt that was used to generate the video.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20prompt)

remixed\_from\_video\_id: stringornull

Identifier of the source video if this video is a remix.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20remixed_from_video_id)

seconds: string

Duration of the generated clip in seconds. For extensions, this is the stitched total duration.

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20seconds)

size: [VideoSize](https://developers.openai.com/api/reference/resources/videos#(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema))

The resolution of the generated video.

One of the following:

"720x1280"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20size%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%200)

"1280x720"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20size%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%201)

"1024x1792"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20size%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%202)

"1792x1024"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20size%20%2B%20(resource)%20videos%20%3E%20(model)%20video_size%20%3E%20(schema)%20%3E%20(member)%203)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20size)

status: "queued"or"in\_progress"or"completed"or"failed"

Current lifecycle status of the video job.

One of the following:

"queued"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20status%20%3E%20(member)%200)

"in\_progress"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20status%20%3E%20(member)%201)

"completed"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20status%20%3E%20(member)%202)

"failed"

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20status%20%3E%20(member)%203)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema)%20%3E%20(property)%20status)

[Link to this property](https://developers.openai.com/api/reference/resources/videos/methods/create#(resource)%20videos%20%3E%20(model)%20video%20%3E%20(schema))

### Create video

HTTP

HTTP

HTTP

Python

Python

TypeScript

TypeScript

Go

Go

Ruby

Ruby

Java

Java

CLI Tool

CLI Tool

```
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "model=sora-2" \
  -F "prompt=A calico cat playing a piano on stage"
```

```
{
  "id": "video_123",
  "object": "video",
  "model": "sora-2",
  "status": "queued",
  "progress": 0,
  "created_at": 1712697600,
  "size": "1024x1792",
  "seconds": "8",
  "quality": "standard"
}
```

##### Returns Examples

```
{
  "id": "video_123",
  "object": "video",
  "model": "sora-2",
  "status": "queued",
  "progress": 0,
  "created_at": 1712697600,
  "size": "1024x1792",
  "seconds": "8",
  "quality": "standard"
}
```