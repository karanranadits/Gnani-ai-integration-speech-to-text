let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let fullTranscriptText = "";
let finalAudioBlob = null;

let timerInterval;
let secondsElapsed = 0;

const recordBtn = document.getElementById('recordBtn');
const downloadAudioBtn = document.getElementById('downloadAudioBtn');
const downloadTextBtn = document.getElementById('downloadTextBtn');
const statusText = document.getElementById('statusText');
const resultBox = document.getElementById('resultBox');
const transcriptContainer = document.getElementById('transcriptContainer');
const languageSelect = document.getElementById('languageSelect');
const timerDisplay = document.getElementById('timer');
const micIcon = recordBtn.innerHTML; // Store original icon

recordBtn.addEventListener('click', toggleRecording);

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = processAudio;
        
        mediaRecorder.start();
        isRecording = true;
        
        // Timer Logic
        secondsElapsed = 0;
        timerDisplay.textContent = formatTime(secondsElapsed);
        timerDisplay.classList.add('visible');
        timerInterval = setInterval(() => {
            secondsElapsed++;
            timerDisplay.textContent = formatTime(secondsElapsed);
        }, 1000);

        // UI Updates
        recordBtn.classList.add('recording');
        // Change icon to a stop square
        recordBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><rect x="6" y="6" width="12" height="12"></rect></svg>';
        
        statusText.textContent = 'LISTENING...';
        downloadAudioBtn.disabled = true;
        downloadTextBtn.disabled = true;
        transcriptContainer.classList.remove('visible');
        
    } catch (err) {
        console.error("Microphone access denied", err);
        statusText.textContent = 'Microphone access denied.';
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    isRecording = false;
    clearInterval(timerInterval);
    
    // UI Updates
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = micIcon;
    statusText.textContent = 'PROCESSING AUDIO...';
    recordBtn.disabled = true;
}

async function processAudio() {
    finalAudioBlob = new Blob(audioChunks);
    let extension = 'webm';
    if (finalAudioBlob.type.includes('mp4')) extension = 'mp4';
    else if (finalAudioBlob.type.includes('ogg')) extension = 'ogg';
    
    // Enable audio download immediately
    downloadAudioBtn.disabled = false;

    const formData = new FormData();
    formData.append('audio_file', finalAudioBlob, `recording.${extension}`);
    formData.append('language_code', languageSelect.value);
    formData.append('format', 'transcribe');
    formData.append('itn_native_numerals', 'false');

    try {
        const response = await fetch('/transcribe/', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.full_transcript) {
            displayResult(data);
        } else if (data.success) {
            throw new Error("No speech detected.");
        } else {
            throw new Error("Transcription failed.");
        }

    } catch (error) {
        console.error(error);
        statusText.textContent = 'ERROR: ' + error.message;
    } finally {
        recordBtn.disabled = false;
        timerDisplay.classList.remove('visible');
    }
}

function displayResult(data) {
    statusText.textContent = 'TRANSCRIPTION COMPLETE';
    fullTranscriptText = data.full_transcript;
    resultBox.innerHTML = '';
    
    if (data.segments && data.segments.length > 0) {
        data.segments.forEach(seg => {
            const div = document.createElement('div');
            div.className = 'segment';
            div.innerHTML = `<span class="speaker-tag">${seg.speaker}</span> ${seg.text}`;
            resultBox.appendChild(div);
        });
    } else {
        resultBox.innerHTML = `<div class="segment">${data.full_transcript}</div>`;
    }

    transcriptContainer.classList.add('visible');
    downloadTextBtn.disabled = false;
}

downloadTextBtn.addEventListener('click', () => {
    if (!fullTranscriptText) return;
    const blob = new Blob([fullTranscriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

downloadAudioBtn.addEventListener('click', () => {
    if (!finalAudioBlob) return;
    const extension = finalAudioBlob.type.includes('mp4') ? 'mp4' : (finalAudioBlob.type.includes('ogg') ? 'ogg' : 'webm');
    const url = URL.createObjectURL(finalAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording_${new Date().getTime()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
