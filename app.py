from flask import Flask, request, render_template, jsonify
import datetime
import uuid
import json

app = Flask(__name__)

notes = []

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
    note_id = data.get("note_id")
    
    if not note_text or not note_text.strip():
        return jsonify({"status": "error", "message": "No note provided"})
    
    note_text = note_text.strip()
    
    # Check if note already exists (update) or create new (create)
    existing_note = None
    if note_id:
        existing_note = next((n for n in notes if n.get("id") == note_id), None)
    
    if existing_note:
        # Update existing note with final save
        existing_note["text"] = note_text
        existing_note["word_count"] = len(note_text.split())
        existing_note["character_count"] = len(note_text)
        if audio_data:
            existing_note["audio"] = audio_data
        existing_note["is_draft"] = False
        
        return jsonify({
            "status": "success",
            "message": "Note saved",
            "note_id": existing_note["id"],
            "note": existing_note
        })
    else:
        # Create new note
        note = {
            "id": str(uuid.uuid4()),
            "text": note_text,
            "audio": audio_data,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "word_count": len(note_text.split()),
            "character_count": len(note_text),
            "is_draft": False
        }
        
        notes.append(note)
        
        return jsonify({
            "status": "success",
            "message": "Note saved",
            "note_id": note["id"],
            "note": note
        })

@app.route("/auto_save_note", methods=["POST"])
def auto_save_note():
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "No data provided"})
    
    note_text = data.get("note")
    note_id = data.get("note_id")
    audio_data = data.get("audio")
    
    if not note_text or not note_text.strip():
        return jsonify({"status": "error", "message": "No note provided"})
    
    note_text = note_text.strip()
    
    # Check if note already exists
    existing_note = None
    if note_id:
        existing_note = next((n for n in notes if n.get("id") == note_id), None)
    
    if existing_note:
        # Update existing draft note
        existing_note["text"] = note_text
        existing_note["word_count"] = len(note_text.split())
        existing_note["character_count"] = len(note_text)
        if audio_data:
            existing_note["audio"] = audio_data
        
        return jsonify({
            "status": "success",
            "message": "Note auto-saved",
            "note_id": existing_note["id"],
            "note": existing_note
        })
    else:
        # Create new draft note
        note = {
            "id": str(uuid.uuid4()),
            "text": note_text,
            "audio": audio_data,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "word_count": len(note_text.split()),
            "character_count": len(note_text),
            "is_draft": True
        }
        
        notes.append(note)
        
        return jsonify({
            "status": "success",
            "message": "Note auto-saved",
            "note_id": note["id"],
            "note": note
        })

if __name__ == "__main__":
    app.run(debug=True)
