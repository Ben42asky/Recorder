const noteInput = document.getElementById("note");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

let recognition;
let isRecording = false;
let isSaving = false;
let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;

// Initialize speech recognition and audio recording
function initSpeechRecognition() {
    // Check for both standard and webkit versions
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        updateStatus("❌ Speech recognition not supported in this browser", "error");
        startBtn.disabled = true;
        return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;  // Allow continuous recording
    recognition.interimResults = true;  // Show interim results
    recognition.lang = 'en-US';

    recognition.onstart = function() {
        isRecording = true;
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

// Initialize audio recording
async function initAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
        };
        
        return true;
    } catch (error) {
        console.error("Error accessing microphone:", error);
        updateStatus("❌ Could not access microphone", "error");
        return false;
    }
}

function updateStatus(message, type = "") {
    if (status) {
        status.textContent = message;
        status.className = `status ${type}`;
    }
}

function resetRecordingState() {
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Stop media recorder if active
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

async function startRecording() {
    if (!isRecording) {
        try {
            // Initialize audio recording if not already done
            if (!mediaRecorder) {
                const audioInitialized = await initAudioRecording();
                if (!audioInitialized) return;
            }
            
            // Start audio recording
            audioChunks = [];
            mediaRecorder.start();
            
            // Start speech recognition
            if (recognition) {
                recognition.start();
            }
        } catch (error) {
            updateStatus("❌ Could not start recording", "error");
            console.error("Error starting recording:", error);
        }
    }
}

function stopRecording() {
    if (isRecording) {
        // Stop speech recognition
        if (recognition) {
            recognition.stop();
        }
        
        // Stop audio recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        updateStatus("🛑 Stopping recording...");
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
    updateStatus("💾 Saving note...", "saving");

    // Prepare the data to send
    const noteData = {
        note: note
    };

    // Convert audio blob to base64 if available
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
    fetch("/save_note", {
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
            updateStatus("✅ Note saved successfully!", "success");
            // Clear the note and audio after successful save
            noteInput.value = "";
            recordedAudioBlob = null;
            
            // Reload to show updated notes list
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            throw new Error(data.message || "Save failed");
        }
    })
    .catch(error => {
        console.error("Save error:", error);
        updateStatus("❌ Failed to save note. Please try again.", "error");
        
        setTimeout(() => {
            updateStatus("Ready to record your voice note");
        }, 3000);
    })
    .finally(() => {
        isSaving = false;
        saveBtn.disabled = false;
    });
}

// Event listeners
startBtn.addEventListener("click", startRecording);
if (stopBtn) {
    stopBtn.addEventListener("click", stopRecording);
}
saveBtn.addEventListener("click", saveNote);

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