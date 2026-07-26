from flask import Flask, request, render_template, jsonify
import datetime
import uuid
import json

app = Flask(__name__)

notes = []
user_stats = {
    "total_notes": 0,
    "total_words": 0,
    "total_characters": 0,
    "points": 0,
    "level": 1,
    "daily_streak": 0,
    "last_note_date": None,
    "achievements": [],
    "total_recording_time": 0
}

ACHIEVEMENT_RULES = {
    "first_note": {"name": "Getting Started", "description": "Record your first note", "points": 10, "condition": lambda s: s["total_notes"] >= 1},
    "note_collector": {"name": "Note Collector", "description": "Save 10 notes", "points": 50, "condition": lambda s: s["total_notes"] >= 10},
    "word_master": {"name": "Word Master", "description": "Record 1000 words", "points": 100, "condition": lambda s: s["total_words"] >= 1000},
    "streak_3": {"name": "On Fire 🔥", "description": "3-day recording streak", "points": 75, "condition": lambda s: s["daily_streak"] >= 3},
    "verbose": {"name": "Verbose", "description": "Record a note with 500+ characters", "points": 40, "condition": lambda s: max([len(n.get("text", "")) for n in notes], default=0) >= 500},
    "productive": {"name": "Productive Day", "description": "Save 5 notes in one day", "points": 60, "condition": lambda s: count_notes_today() >= 5},
}

def count_notes_today():
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    return sum(1 for n in notes if n.get("timestamp", "").startswith(today))

def calculate_level(points):
    return max(1, points // 100 + 1)

def check_achievements():
    unlocked = []
    for ach_id, ach_def in ACHIEVEMENT_RULES.items():
        if ach_id not in user_stats["achievements"]:
            if ach_def["condition"](user_stats):
                user_stats["achievements"].append(ach_id)
                user_stats["points"] += ach_def["points"]
                unlocked.append({"id": ach_id, "name": ach_def["name"], "points": ach_def["points"]})
    return unlocked

@app.route('/')
def index():
    return render_template('index.html', notes=notes)

@app.route("/save_note", methods=["POST"])
def save_note():
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "No data provided"})
    
    note_text = data.get("note")
    audio_data = data.get("audio")
    recording_time = data.get("recording_time", 0)
    
    if not note_text or not note_text.strip():
        return jsonify({"status": "error", "message": "No note provided"})
    
    note_text = note_text.strip()
    
    # Update stats
    user_stats["total_notes"] += 1
    user_stats["total_words"] += len(note_text.split())
    user_stats["total_characters"] += len(note_text)
    user_stats["total_recording_time"] += recording_time
    
    # Update streak
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    if user_stats["last_note_date"] == today:
        pass  # Streak continues
    elif user_stats["last_note_date"] is None:
        user_stats["daily_streak"] = 1
    else:
        last_date = datetime.datetime.strptime(user_stats["last_note_date"], "%Y-%m-%d")
        current_date = datetime.datetime.now()
        if (current_date - last_date).days == 1:
            user_stats["daily_streak"] += 1
        else:
            user_stats["daily_streak"] = 1
    
    user_stats["last_note_date"] = today
    
    # Award points for note
    points_earned = len(note_text.split()) // 5 + 10  # Base 10 + 1 per 5 words
    user_stats["points"] += points_earned
    user_stats["level"] = calculate_level(user_stats["points"])
    
    # Check achievements
    unlocked_achievements = check_achievements()
    
    # Create note object
    note = {
        "id": str(uuid.uuid4()),
        "text": note_text,
        "audio": audio_data,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "word_count": len(note_text.split()),
        "character_count": len(note_text)
    }
    
    notes.append(note)
    
    return jsonify({
        "status": "success",
        "message": "Note saved successfully",
        "note": note,
        "stats": user_stats,
        "points_earned": points_earned,
        "unlocked_achievements": unlocked_achievements
    })

@app.route("/stats", methods=["GET"])
def get_stats():
    return jsonify(user_stats)

@app.route("/achievements", methods=["GET"])
def get_achievements():
    all_achievements = {ach_id: ach_def for ach_id, ach_def in ACHIEVEMENT_RULES.items()}
    return jsonify({
        "all": all_achievements,
        "unlocked": user_stats["achievements"]
    })

@app.route("/auto_save_note", methods=["POST"])
def auto_save_note():
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "No data provided"})
    
    note_text = data.get("note")
    note_id = data.get("note_id")
    audio_data = data.get("audio")
    recording_time = data.get("recording_time", 0)
    is_final = data.get("is_final", False)
    
    if not note_text or not note_text.strip():
        return jsonify({"status": "error", "message": "No note provided"})
    
    note_text = note_text.strip()
    
    # Check if note already exists (update) or create new (create)
    existing_note = None
    if note_id:
        existing_note = next((n for n in notes if n.get("id") == note_id), None)
    
    if existing_note:
        # Update existing note
        old_word_count = len(existing_note.get("text", "").split())
        old_char_count = len(existing_note.get("text", ""))
        
        existing_note["text"] = note_text
        existing_note["word_count"] = len(note_text.split())
        existing_note["character_count"] = len(note_text)
        if audio_data:
            existing_note["audio"] = audio_data
        
        # Update stats with difference
        new_word_count = len(note_text.split())
        new_char_count = len(note_text)
        user_stats["total_words"] += (new_word_count - old_word_count)
        user_stats["total_characters"] += (new_char_count - old_char_count)
        
        points_earned = 0
        unlocked_achievements = []
        
        if is_final:
            # Only update stats and check achievements on final save
            points_earned = (new_word_count - old_word_count) // 5 + 5
            user_stats["points"] += points_earned
            user_stats["level"] = calculate_level(user_stats["points"])
            user_stats["total_recording_time"] += recording_time
            unlocked_achievements = check_achievements()
        
        return jsonify({
            "status": "success",
            "message": "Note updated",
            "note_id": existing_note["id"],
            "note": existing_note,
            "stats": user_stats,
            "points_earned": points_earned,
            "unlocked_achievements": unlocked_achievements
        })
    else:
        # Create new note (auto-save on first transcription)
        note = {
            "id": str(uuid.uuid4()),
            "text": note_text,
            "audio": audio_data,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "word_count": len(note_text.split()),
            "character_count": len(note_text),
            "is_draft": not is_final
        }
        
        if is_final:
            # This is the final save - apply full stats
            user_stats["total_notes"] += 1
            user_stats["total_words"] += len(note_text.split())
            user_stats["total_characters"] += len(note_text)
            user_stats["total_recording_time"] += recording_time
            
            # Update streak
            today = datetime.datetime.now().strftime("%Y-%m-%d")
            if user_stats["last_note_date"] == today:
                pass
            elif user_stats["last_note_date"] is None:
                user_stats["daily_streak"] = 1
            else:
                last_date = datetime.datetime.strptime(user_stats["last_note_date"], "%Y-%m-%d")
                current_date = datetime.datetime.now()
                if (current_date - last_date).days == 1:
                    user_stats["daily_streak"] += 1
                else:
                    user_stats["daily_streak"] = 1
            
            user_stats["last_note_date"] = today
            
            # Award points
            points_earned = len(note_text.split()) // 5 + 10
            user_stats["points"] += points_earned
            user_stats["level"] = calculate_level(user_stats["points"])
            
            note["is_draft"] = False
            unlocked_achievements = check_achievements()
        else:
            points_earned = 0
            unlocked_achievements = []
        
        notes.append(note)
        
        return jsonify({
            "status": "success",
            "message": "Note created" if is_final else "Note auto-saved",
            "note_id": note["id"],
            "note": note,
            "stats": user_stats,
            "points_earned": points_earned,
            "unlocked_achievements": unlocked_achievements
        })

@app.route("/update_note", methods=["POST"])
def update_note():
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "No data provided"})
    
    note_id = data.get("note_id")
    note_text = data.get("note", "").strip()
    
    if not note_id:
        return jsonify({"status": "error", "message": "Note ID required"})
    
    existing_note = next((n for n in notes if n.get("id") == note_id), None)
    
    if not existing_note:
        return jsonify({"status": "error", "message": "Note not found"})
    
    if not note_text:
        return jsonify({"status": "error", "message": "Note text cannot be empty"})
    
    # Update the note
    old_word_count = len(existing_note.get("text", "").split())
    old_char_count = len(existing_note.get("text", ""))
    
    existing_note["text"] = note_text
    existing_note["word_count"] = len(note_text.split())
    existing_note["character_count"] = len(note_text)
    existing_note["timestamp"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Update stats with difference
    new_word_count = len(note_text.split())
    new_char_count = len(note_text)
    user_stats["total_words"] += (new_word_count - old_word_count)
    user_stats["total_characters"] += (new_char_count - old_char_count)
    
    # Recalculate points for the difference
    old_points = (old_word_count // 5) if old_word_count > 0 else 0
    new_points = (new_word_count // 5) if new_word_count > 0 else 0
    points_earned = max(0, new_points - old_points)
    user_stats["points"] += points_earned
    user_stats["level"] = calculate_level(user_stats["points"])
    
    unlocked_achievements = check_achievements()
    
    return jsonify({
        "status": "success",
        "message": "Note updated",
        "note": existing_note,
        "stats": user_stats,
        "points_earned": points_earned,
        "unlocked_achievements": unlocked_achievements
    })

if __name__ == "__main__":
    app.run(debug=True)
