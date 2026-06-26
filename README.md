# Gnani Speaker Diarization API

This is a FastAPI-based application that provides a wrapper around the **Gnani Batch STT (Speech-to-Text)** API. It handles submitting an audio file for transcription, polling for the job status, and returning a formatted transcript with speaker diarization.

## Prerequisites

- Python 3.8+
- An API key for the Gnani STT API

## Setup Instructions

1. **Create and activate a virtual environment** (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Linux/Mac
   # On Windows: venv\Scripts\activate
   ```

2. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your environment variables**:
   Create a `.env` file in the root directory (alongside `main.py`) and add your Gnani API key:
   ```env
   GNANI_API_KEY=your_gnani_api_key_here
   ```

## Running the Application

To start the FastAPI development server, run the following command:

```bash
uvicorn main:app --reload
```

The API will now be running locally at `http://127.0.0.1:8000`.

## Web Interface (UI)

The application comes with a built-in modern Web UI. Once the server is running, simply navigate to `http://127.0.0.1:8000/` in your browser.

**Features of the UI:**
- **Live Audio Recording**: Record your voice directly from the browser using the microphone.
- **Language Selection**: Choose from 10 supported Indian languages before recording.
- **Recording Timer**: Keep track of your recording duration.
- **Download Audio**: After recording, you can download the raw audio file.
- **Download Transcript**: Save the transcribed text along with speaker diarization to a `.txt` file.

## API Endpoints

### `POST /transcribe/`

This endpoint uploads an audio file to the Gnani Batch API, polls the status until completion, and returns the diarized text segments.

#### Request Parameters (Multipart Form-Data)

- `audio_file` (File, required): The audio file you want to transcribe (e.g., `.wav`, `.aac`).
- `language_code` (String, optional): The language of the audio. Defaults to `"hi-IN"`.
- `format` (String, optional): The format of the transcription. Defaults to `"transcribe"`.
- `itn_native_numerals` (Boolean, optional): Whether to use native numerals. Defaults to `false`.

## How to Test

You can easily test the endpoint using `curl` from your terminal once the server is running.

### Basic Example (using default settings):

```bash
curl -X POST "http://127.0.0.1:8000/transcribe/" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@/path/to/your/audio_file.wav"
```
*(Make sure to replace `/path/to/your/audio_file.wav` with the actual path to a valid audio file on your system!)*

### Advanced Example (specifying all fields):

```bash
curl -X POST "http://127.0.0.1:8000/transcribe/" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@/path/to/your/audio_file.wav" \
  -F "language_code=hi-IN" \
  -F "format=transcribe" \
  -F "itn_native_numerals=false"
```

## Response Format

On success, the API returns a JSON response containing the full transcript and individual speech segments broken down by speaker:

```json
{
  "success": true,
  "job_id": "gnani_job_12345",
  "filename": "audio_file.wav",
  "full_transcript": "Hello, how are you? I am doing well, thank you.",
  "segments": [
    {
      "speaker": "Speaker 1",
      "text": "Hello, how are you?",
      "start_time": 0.5,
      "end_time": 2.1
    },
    {
      "speaker": "Speaker 2",
      "text": "I am doing well, thank you.",
      "start_time": 2.5,
      "end_time": 4.8
    }
  ],
  "total_duration": 5.0
}
```
