

# Features

## Chat:
 This feature allows you to create chat completions, similar to how you would interact with other popular large language models. The API is compatible with the OpenAI library, which simplifies the integration process.

 ## Audio
 The API provides two main audio functionalities:
Text-to-Speech: 
Convert text into spoken audio. Note that this feature requires special authorization.
Speech-to-Text: 
Transcribe audio files into text. The API offers different models for short and long audio clips.

## Images
You can generate images from text prompts using the Fanar-ImageGen-1 model.

## Translations
The API can be used for translation tasks.
## Tokens
This feature allows you to get information about tokens.
## Models
You can retrieve a list of the available models.

# How to Use the API

The Fanar API is designed for ease of use, and a key advantage is its compatibility with the OpenAI library. This means you can often use the same code you would use for OpenAI's API, with a few minor adjustments.

When using the OpenAI library, you will need to set the base_url to https://api.fanar.qa/v1. The documentation provides request samples in various formats, including:

cURL: For making requests from the command line.
Python - OpenAI: Demonstrating how to use the official OpenAI Python library.
Python - requests: For making direct HTTP requests with the requests library in Python.

# Key Endpoints
## POST /v1/chat/completions
This is the endpoint for the chat functionality. You can send a series of messages and receive a response from the model.

## POST /v1/audio/speech
Use this endpoint to generate audio from text. Remember, this requires special authorization.

## POST /v1/audio/transcriptions
This endpoint is for transcribing audio files. You'll need to specify the appropriate model based on the length of your audio.

## POST /v1/images/generations
Generate images from a text prompt with this endpoint.

## GET /v1/models
Retrieve a list of all the models available through the API.

## POST /v1/translations
This endpoint is used for translation tasks.

## GET /v1/tokens
Get information about tokens.

# Open AI Specification

## 1. info - General Information

## 2. paths - The API Endpoints

This is the most important section, as it details all the functions the API can perform. Each entry under paths is a specific URL endpoint you can send requests to.

Here's a summary of the available endpoints and what they do:

### /v1/chat/completions (POST):

What it does: This is the main endpoint for interacting with the chat models. You send a list of messages, and it returns a response from the AI.
Special Models: It supports various models like Fanar, Islamic-RAG (for Islamic knowledge retrieval), and Fanar-Oryx-IVU-1 (for image understanding). Note that some specialized models like "thinking mode" and image understanding require special authorization.
Code Samples: It provides examples in cURL and Python (using both the openai library and the requests library).

### /v1/audio/speech (POST):

What it does: Converts text into spoken audio (Text-to-Speech).
Authorization: This feature requires special permission from the Fanar team.
Model: Uses the Fanar-Aura-TTS-1 model.

### /v1/audio/transcriptions (POST):

What it does: Transcribes an audio file into text (Speech-to-Text).
Authorization: This also requires special permission.
Models: It offers Fanar-Aura-STT-1 for short audio and Fanar-Aura-STT-LF-1 for longer audio files.

### /v1/images/generations (POST):

What it does: Creates an image based on a text prompt.
Authorization: Requires special permission.
Model: Uses the Fanar-ImageGen-1 model.

### /v1/tokens (POST):

What it does: Takes a piece of text and a model name, and tells you how many tokens that text represents for that model. This is useful for understanding and managing your usage.

### /v1/translations (POST):

What it does: Translates text from one language to another (e.g., Arabic to English).
Authorization: Requires special permission.
Model: Uses the Fanar-Shaheen-MT-1 model.

### /v1/models (GET):

What it does: Provides a list of all the AI models that are currently available through the API.

## 3. components - Data Structures

his section is like a dictionary or a glossary for the API. It defines the structure of all the data that is sent to and received from the API.

schemas: These are the blueprints for the JSON objects. For example:

ChatCompletionRequest: Defines exactly what fields you need to send when you want to chat with the model (e.g., messages, model, temperature, max_tokens).
ChatCompletionResponse: Defines the structure of the answer you get back (e.g., id, choices, created, model, usage).
ImageGenerationRequest: Specifies that you need to provide a model and a prompt to generate an image.
securitySchemes: This part defines how you authenticate your requests.

Bearer: It specifies that you need to use "Bearer Authentication." This means you must include an Authorization header in your requests with the value Bearer YOUR_API_KEY, where YOUR_API_KEY is the secret key you receive after getting access.

# Details

## Crafting Your Request (The "Request Body")

Required Parameters (You MUST include these):

### messages (Array of objects)
This is the conversation history. You provide a list of messages, each with a role (system, user, or assistant) and content (the text of the message). The conversation always starts with a user message.
### model (string): 
You have to specify which AI model you want to use. Your options are:
"Fanar": The default, general-purpose model.
"Fanar-S-1-7B", "Fanar-C-1-8.7B": Specific versions of the Fanar model.
"Islamic-RAG": A specialized model that answers questions based on a curated set of Islamic knowledge sources.
"Fanar-Oryx-IVU-1": The model for understanding images (requires special authorization).

### Common Optional Parameters (For fine-tuning the response):

#### temperature (number, default: 0): 
Controls the randomness of the output.
0 makes the output highly deterministic and focused (good for factual answers).
A higher value like 0.8 will make the response more creative and diverse (good for writing stories or brainstorming).

#### max_tokens (integer): 
The maximum number of tokens (words/pieces of words) the AI is allowed to generate for its response. This helps control the length and cost of the response.
#### top_p (number):
An alternative to temperature for controlling randomness. It tells the model to only consider the most probable words that add up to a certain percentage.
#### frequency_penalty (number)
A value that discourages the model from repeating the same words or phrases too often.
#### presence_penalty (number)
Similar to the above, but it discourages the model from repeating any topic that has already been mentioned, pushing it to talk about new things

## Interpreting the Answer (The "Response Schema")
If your request is successful (a 200 response), you will get a JSON object back with the following structure:

### id (string): 
A unique ID for this specific API call.

### created (integer):
 A timestamp of when the response was generated.
### model (string): 
The name of the model that was used to generate the response.
### object (string):
 Will always be "chat.completion".
### choices (Array of objects): 

This is the most important part. It's a list containing the AI's response(s). You almost always want the first item: choices[0]. Inside that, you'll find a message object. Inside the message object, the content field holds the actual text of the AI's reply.

### usage (object)
Provides details on how many tokens were used for this request.
### prompt_tokens
How many tokens were in your input messages.
### completion_tokens
How many tokens the AI generated in its response.
### total_tokens
The sum of the two, which is what your usage is typically billed against.