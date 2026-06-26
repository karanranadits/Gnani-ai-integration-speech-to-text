# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()
from typing import Optional

app = FastAPI(title="Gnani Speaker Diarization API")

# ====================== CONFIG ======================
GNANI_API_KEY = os.getenv("GNANI_API_KEY")
BASE_URL = os.getenv("BASE_URL", "https://api.vachana.ai/stt/v3/batch")

if not GNANI_API_KEY:
    print("Warning: GNANI_API_KEY environment variable is not set!")
# ===================================================

app.mount("/static", StaticFiles(directory="ui"), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse("ui/index.html")

@app.post("/transcribe/")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language_code: str = Form("en-IN"),      # Change default as needed
    format: str = Form("transcribe"),        # "transcribe" or "verbatim"
    itn_native_numerals: bool = Form(False)
):
    if not GNANI_API_KEY:
        raise HTTPException(status_code=500, detail="Gnani API key not configured")

    # Step 1: Submit job to Gnani Batch API
    files = {
        'audio_files': (audio_file.filename, audio_file.file, audio_file.content_type)
    }
    
    data = {
        'language_code': language_code,
        'format': format,
        'is_multi_channel': 'false'   # Set True only if audio has separate channels
    }
    
    if itn_native_numerals:
        data['itn_native_numerals'] = 'true'

    headers = {
        'X-API-Key-ID': GNANI_API_KEY,
    }

    try:
        submit_response = requests.post(
            f"{BASE_URL}/submit",
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )
        submit_response.raise_for_status()
        job_data = submit_response.json()
        job_id = job_data.get("job_id")

        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to get job_id")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Submit failed: {str(e)}")

    # Step 2: Poll for result
    max_wait = 300  # 5 minutes max
    interval = 10   # Poll every 10 seconds (Gnani recommends >=60s, but 10s is fine for small files)

    for _ in range(max_wait // interval):
        try:
            status_response = requests.get(
                f"{BASE_URL}/status/{job_id}",
                headers=headers,
                timeout=20
            )
            status_response.raise_for_status()
            result = status_response.json()

            if result.get("status") == "completed":
                break
            elif result.get("status") == "failed":
                raise HTTPException(status_code=500, detail="Transcription job failed")

            time.sleep(interval)

        except Exception as e:
            time.sleep(interval)

    else:
        raise HTTPException(status_code=408, detail="Transcription timeout")

    # Step 3: Format response with Speaker 1 / Speaker 2
    if not result.get("results"):
        raise HTTPException(status_code=500, detail="No results returned")

    file_result = result["results"][0]
    segments = file_result.get("segments", [])

    formatted_transcript = []
    for seg in segments:
        speaker = f"Speaker {seg.get('speaker_id', 'Unknown')}"
        text = seg.get("text", "")
        start = round(seg.get("start_time", 0), 2)
        formatted_transcript.append({
            "speaker": speaker,
            "text": text,
            "start_time": start,
            "end_time": round(seg.get("end_time", 0), 2)
        })

    return JSONResponse({
        "success": True,
        "job_id": job_id,
        "filename": file_result.get("filename"),
        "full_transcript": file_result.get("full_transcript"),
        "segments": formatted_transcript,
        "total_duration": file_result.get("total_duration")
    })