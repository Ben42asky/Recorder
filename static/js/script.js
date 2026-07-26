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
let recordingStartTime = 0;
let recordingTimer = null;
let currentNoteId = null;
let autoSaveTimeout = null;

// Achievement configuration
const ACHIEVEMENTS = {
    "first_note": { icon: "🎬", name: "Getting Started", desc: "Record your first note", color: "#3b82f6" },
    "note_collector": { icon: "📚", name: "Note Collector", desc: "Save 10 notes", color: "#8b5cf6" },
    "word_master": { icon: "📖", name: "Word Master", desc: "Record 1000 words", color: "#ec4899" },
    "streak_3": { icon: "🔥", name: "On Fire", desc: "3-day recording streak", color: "#f59e0b" },
    "verbose": { icon: "📝", name: "Verbose", desc: "500+ character note", color: "#06b6d4" },
    "productive": { icon: "⚡", name: "Productive Day", desc: "5 notes in one day", color: "#10b981" },
};

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
            
            audioChunks = [];
            mediaRecorder.start();
            
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
        if (recognition) {
            recognition.stop();
        }
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        stopTimer();
        updateStatus("🛑 Stopping recording...");
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const totalNotesEl = document.getElementById("total-notes");
    const totalWordsEl = document.getElementById("total-words");
    const dailyStreakEl = document.getElementById("daily-streak");
    const totalTimeEl = document.getElementById("total-time");
    const levelBadgeEl = document.getElementById("level-badge");
    const pointsDisplayEl = document.getElementById("points-display");
    const progressBarEl = document.getElementById("progress-fill");
    const progressTextEl = document.getElementById("progress-text");

    if (totalNotesEl) totalNotesEl.textContent = stats.total_notes;
    if (totalWordsEl) totalWordsEl.textContent = stats.total_words;
    if (dailyStreakEl) dailyStreakEl.textContent = stats.daily_streak;
    if (totalTimeEl) totalTimeEl.textContent = formatTime(stats.total_recording_time);
    if (levelBadgeEl) levelBadgeEl.textContent = `Level ${stats.level}`;
    if (pointsDisplayEl) pointsDisplayEl.textContent = `${stats.points} pts`;

    // Update progress bar
    const levelPoints = (stats.level - 1) * 100;
    const nextLevelPoints = stats.level * 100;
    const progress = ((stats.points - levelPoints) / 100) * 100;
    if (progressBarEl) progressBarEl.style.width = Math.min(progress, 100) + "%";
    if (progressTextEl) progressTextEl.textContent = `${stats.points % 100} / 100 pts`;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

// Achievement notification
function showAchievementNotification(achievement) {
    const popup = document.getElementById("achievement-popup");
    const nameEl = document.getElementById("achievement-name");
    const pointsEl = document.getElementById("achievement-points");

    if (popup && nameEl && pointsEl) {
        nameEl.textContent = achievement.name;
        pointsEl.textContent = `+${achievement.points} points`;
        
        popup.classList.add("show");
        
        setTimeout(() => {
            popup.classList.remove("show");
        }, 3000);
    }
}

// Update achievements display
function updateAchievementsDisplay(allAchievements, unlockedIds) {
    const achievementsList = document.getElementById("achievements-list");
    const achievementCount = document.getElementById("achievement-count");

    if (!achievementsList) return;

    achievementsList.innerHTML = "";
    
    Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
        const isUnlocked = unlockedIds.includes(id);
        const badge = document.createElement("div");
        badge.className = `achievement-badge ${isUnlocked ? "unlocked" : "locked"}`;
        
        badge.innerHTML = `
            <div class="achievement-icon-small">${ach.icon}</div>
            <div class="achievement-info">
                <span class="achievement-title">${ach.name}</span>
                <span class="achievement-desc">${ach.desc}</span>
            </div>
            ${isUnlocked ? '<div class="achievement-status">✓ Unlocked</div>' : ''}
        `;
        
        achievementsList.appendChild(badge);
    });

    if (achievementCount) {
        achievementCount.textContent = `${unlockedIds.length}/${Object.keys(ACHIEVEMENTS).length}`;
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
                updateStatus(`✅ Note saved! +${data.points_earned} points`, "success");
                
                // Update stats
                updateStatsDisplay(data.stats);
                
                // Show achievement notifications
                if (data.unlocked_achievements && data.unlocked_achievements.length > 0) {
                    data.unlocked_achievements.forEach(ach => {
                        setTimeout(() => showAchievementNotification(ach), 500);
                    });
                }
                
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
                updateStatsDisplay(data.stats);
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
        updateStatus("Draft discarded", "success");
        setTimeout(() => {
            updateStatus("Ready to record your voice note");
        }, 2000);
    }
}

// Event listeners
startBtn.addEventListener("click", startRecording);
if (stopBtn) {
    stopBtn.addEventListener("click", stopRecording);
}
saveBtn.addEventListener("click", saveNote);

const discardBtn = document.getElementById("discard");
if (discardBtn) {
    discardBtn.addEventListener("click", discardNote);
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
    // Load initial stats
    fetch("/stats")
        .then(res => res.json())
        .then(stats => updateStatsDisplay(stats));
    
    // Load achievements
    fetch("/achievements")
        .then(res => res.json())
        .then(data => updateAchievementsDisplay(data.all, data.unlocked));
    
    if (!initSpeechRecognition()) {
        updateStatus("❌ Speech recognition not available", "error");
    }
});
