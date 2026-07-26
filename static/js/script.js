const noteInput = document.getElementById("note");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resumeBtn = document.getElementById("resume");
const stopBtn = document.getElementById("stop");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

let recognition;
let isRecording = false;
let isPaused = false;
let isSaving = false;
let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;
let recordingStartTime = 0;
let pausedTime = 0;
let recordingTimer = null;
let currentNoteId = null;
let autoSaveTimeout = null;
let audioContext = null;
let analyser = null;
let animationId = null;
let mediaStream = null;

// Timer functions
function startTimer() {
    recordingStartTime = Date.now();
    recordingTimer = setInterval(updateTimer, 100);
}

function stopTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function resetTimer() {
    stopTimer();
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        timerDisplay.textContent = "00:00";
    }
}

// Initialize speech recognition and audio recording
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        updateStatus("❌ Speech recognition not supported in this browser", "error");
        startBtn.disabled = true;
        return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = function() {
        isRecording = true;
        startTimer();
        updateStatus("🎤 Listening... Speak now!", "recording");
        startBtn.disabled = true;
        stopBtn.disabled = false;
    };

    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        noteInput.value = transcript;
        
        // Auto-save the transcription
        if (transcript.trim()) {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                autoSaveNote(transcript.trim());
            }, 1000); // Wait 1 second after speech stops before auto-saving
        }
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event);
        let errorMessage = "❌ ";
        
        switch(event.error) {
            case 'network':
                errorMessage += "Network error occurred";
                break;
            case 'not-allowed':
                errorMessage += "Microphone access denied";
                break;
            case 'no-speech':
                errorMessage += "No speech detected";
                break;
            default:
                errorMessage += `Recognition error: ${event.error}`;
        }
        
        updateStatus(errorMessage, "error");
        resetRecordingState();
    };

    recognition.onend = function() {
        if (isRecording) {
            updateStatus("✅ Recording completed", "success");
            setTimeout(() => {
                updateStatus("Ready to record your voice note");
            }, 2000);
        }
        resetRecordingState();
    };

    return true;
}

// Initialize audio recording with waveform visualization
async function initAudioRecording() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(mediaStream);
        
        // Setup audio context for waveform visualization
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            
            // Stop waveform animation
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
        
        return true;
    } catch (error) {
        console.error("Error accessing microphone:", error);
        updateStatus("❌ Could not access microphone", "error");
        return false;
    }
}

// Draw waveform visualization
function drawWaveform() {
    const canvas = document.getElementById("waveform-canvas");
    if (!canvas || !analyser) return;
    
    const canvasCtx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    
    canvasCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "#6366f1";
    canvasCtx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
            canvasCtx.moveTo(x, canvas.height - y);
        } else {
            canvasCtx.lineTo(x, canvas.height - y);
        }
        
        x += sliceWidth;
    }
    
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
    
    if (isRecording && !isPaused) {
        animationId = requestAnimationFrame(drawWaveform);
    }
}

// Show playback section
function showPlaybackSection() {
    const playbackSection = document.getElementById("playback-section");
    const playbackAudio = document.getElementById("playback-audio");
    const shareSection = document.getElementById("share-section");
    
    if (recordedAudioBlob && playbackSection && playbackAudio) {
        const audioUrl = URL.createObjectURL(recordedAudioBlob);
        playbackAudio.src = audioUrl;
        playbackSection.style.display = "block";
        if (shareSection) {
            shareSection.style.display = "block";
        }
    }
}

function updateStatus(message, type = "") {
    if (status) {
        status.textContent = message;
        status.className = `status-bar ${type}`;
    }
}

function resetRecordingState() {
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopTimer();
    resetTimer();
    clearTimeout(autoSaveTimeout);
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

async function startRecording() {
    if (!isRecording) {
        try {
            if (!mediaRecorder) {
                const audioInitialized = await initAudioRecording();
                if (!audioInitialized) return;
            }
            
            isPaused = false;
            audioChunks = [];
            mediaRecorder.start();
            
            // Show waveform and start visualization
            const waveformContainer = document.getElementById("waveform-container");
            if (waveformContainer) {
                waveformContainer.style.display = "block";
            }
            drawWaveform();
            
            // Update button states
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            pauseBtn.style.display = "flex";
            resumeBtn.style.display = "none";
            stopBtn.disabled = false;
            
            if (recognition) {
                recognition.start();
            }
        } catch (error) {
            updateStatus("❌ Could not start recording", "error");
            console.error("Error starting recording:", error);
        }
    }
}

function pauseRecording() {
    if (isRecording && !isPaused) {
        isPaused = true;
        pausedTime = Date.now();
        
        if (recognition) {
            recognition.stop();
        }
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
        }
        
        stopTimer();
        updateStatus("⏸️ Recording paused", "success");
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
        stopBtn.disabled = false;
    }
}

function resumeRecording() {
    if (isRecording && isPaused) {
        isPaused = false;
        recordingStartTime += (Date.now() - pausedTime);
        
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
        }
        
        if (recognition) {
            recognition.start();
        }
        
        startTimer();
        updateStatus("🎤 Recording resumed", "recording");
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
        stopBtn.disabled = false;
    }
}

function stopRecording() {
    if (isRecording) {
        if (recognition) {
            recognition.stop();
        }
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        stopTimer();
        updateStatus("🛑 Stopping recording...");
        showPlaybackSection();
    }
}



// Auto-save function (called while recording)
function autoSaveNote(noteText) {
    if (!noteText.trim()) return;
    
    const recordingTime = Math.floor((Date.now() - recordingStartTime) / 1000);
    
    const noteData = {
        note: noteText,
        note_id: currentNoteId,
        recording_time: recordingTime,
        is_final: false
    };
    
    fetch("/auto_save_note", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(noteData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            // Store the note ID for future updates
            if (!currentNoteId) {
                currentNoteId = data.note_id;
                showNoteStatus("Auto-saved draft");
                showDiscardButton(true);
            }
            updateStatsDisplay(data.stats);
        }
    })
    .catch(error => console.error("Auto-save error:", error));
}

function showNoteStatus(message) {
    const statusEl = document.getElementById("note-status");
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = "note-status show";
    }
}

function showDiscardButton(show) {
    const discardBtn = document.getElementById("discard");
    if (discardBtn) {
        discardBtn.style.display = show ? "flex" : "none";
    }
}

function saveNote() {
    const note = noteInput.value.trim();
    
    if (!note) {
        updateStatus("❌ Please enter or record a note first", "error");
        setTimeout(() => {
            updateStatus("Ready to record your voice note");
        }, 2000);
        return;
    }

    if (isSaving) return;

    isSaving = true;
    saveBtn.disabled = true;
    updateStatus("💾 Finalizing note...", "saving");

    const recordingTime = Math.floor((Date.now() - recordingStartTime) / 1000);

    const noteData = {
        note: note,
        note_id: currentNoteId,
        recording_time: recordingTime,
        is_final: true
    };

    if (recordedAudioBlob) {
        const reader = new FileReader();
        reader.onload = function(e) {
            noteData.audio = e.target.result;
            sendNoteToServer(noteData);
        };
        reader.readAsDataURL(recordedAudioBlob);
    } else {
        sendNoteToServer(noteData);
    }
}

function sendNoteToServer(noteData) {
    const endpoint = noteData.is_final ? "/save_note" : "/auto_save_note";
    
    fetch(endpoint, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(noteData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === "success") {
            if (noteData.is_final) {
                updateStatus("✅ Note saved successfully", "success");
                
                // Clear the note and state
                noteInput.value = "";
                currentNoteId = null;
                recordedAudioBlob = null;
                resetTimer();
                showNoteStatus("");
                showDiscardButton(false);
                
                // Reload to show updated notes list
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                // Auto-save successful
                if (!currentNoteId) {
                    currentNoteId = data.note_id;
                    showNoteStatus("Auto-saved draft");
                    showDiscardButton(true);
                }
            }
        } else {
            throw new Error(data.message || "Save failed");
        }
    })
    .catch(error => {
        console.error("Save error:", error);
        if (noteData.is_final) {
            updateStatus("❌ Failed to save note. Please try again.", "error");
            
            setTimeout(() => {
                updateStatus("Ready to record your voice note");
            }, 3000);
        }
    })
    .finally(() => {
        if (noteData.is_final) {
            isSaving = false;
            saveBtn.disabled = false;
        }
    });
}

function discardNote() {
    if (confirm("Are you sure you want to discard this draft?")) {
        noteInput.value = "";
        currentNoteId = null;
        recordedAudioBlob = null;
        resetTimer();
        showNoteStatus("");
        showDiscardButton(false);
        hidePlaybackAndShare();
        updateStatus("Draft discarded", "success");
        setTimeout(() => {
            updateStatus("Ready to record your voice note");
        }, 2000);
    }
}

function hidePlaybackAndShare() {
    const playbackSection = document.getElementById("playback-section");
    const shareSection = document.getElementById("share-section");
    const waveformContainer = document.getElementById("waveform-container");
    
    if (playbackSection) playbackSection.style.display = "none";
    if (shareSection) shareSection.style.display = "none";
    if (waveformContainer) waveformContainer.style.display = "none";
}

// Get auto-generated name with date/time
function generateNoteName() {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `Recording - ${date} ${time}`;
}

// Share handlers
function shareViaWhatsApp() {
    if (!recordedAudioBlob) return;
    
    const text = `Check out my voice recording: "${noteInput.value.substring(0, 100)}..."`;
    const encodedText = encodeURIComponent(text);
    
    // On mobile, open WhatsApp; on desktop, show instructions
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.open(`https://wa.me/?text=${encodedText}`, "_blank");
    } else {
        alert("To share via WhatsApp:\n1. Download the recording\n2. Open WhatsApp and send it directly");
        downloadRecording();
    }
}

function shareViaEmail() {
    if (!recordedAudioBlob) return;
    
    const subject = "Voice Recording";
    const body = `Check out my voice recording: ${noteInput.value.substring(0, 100)}...`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
}

function downloadRecording() {
    if (!recordedAudioBlob) return;
    
    const url = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateNoteName().replace(/\s+/g, "_") + ".webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event listeners
startBtn.addEventListener("click", startRecording);
if (pauseBtn) {
    pauseBtn.addEventListener("click", pauseRecording);
}
if (resumeBtn) {
    resumeBtn.addEventListener("click", resumeRecording);
}
if (stopBtn) {
    stopBtn.addEventListener("click", stopRecording);
}
saveBtn.addEventListener("click", saveNote);

const discardBtn = document.getElementById("discard");
if (discardBtn) {
    discardBtn.addEventListener("click", discardNote);
}

// Share button listeners
const shareWhatsAppBtn = document.getElementById("share-whatsapp");
const shareEmailBtn = document.getElementById("share-email");
const shareDownloadBtn = document.getElementById("share-download");

if (shareWhatsAppBtn) {
    shareWhatsAppBtn.addEventListener("click", shareViaWhatsApp);
}
if (shareEmailBtn) {
    shareEmailBtn.addEventListener("click", shareViaEmail);
}
if (shareDownloadBtn) {
    shareDownloadBtn.addEventListener("click", downloadRecording);
}

// Keyboard shortcuts
document.addEventListener("keydown", function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'r':
                event.preventDefault();
                if (!isRecording) startRecording();
                break;
            case 's':
                event.preventDefault();
                if (!isRecording) saveNote();
                break;
            case 'Escape':
                if (isRecording) stopRecording();
                break;
        }
    }
});

// Initialize the app
window.addEventListener('load', function() {
    if (!initSpeechRecognition()) {
        updateStatus("❌ Speech recognition not available", "error");
    }
});
