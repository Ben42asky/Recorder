from flask import Flask, request, render_template, jsonify
import datetime
import uuid

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
    
    if not note_text or not note_text.strip():
        return jsonify({"status": "error", "message": "No note provided"})
    
    # Create note object with audio data
    note = {
        "id": str(uuid.uuid4()),
        "text": note_text.strip(),
        "audio": audio_data,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    notes.append(note)
    return jsonify({"status": "success", "message": "Note saved successfully", "note": note})

if __name__ == "__main__":
    app.run(debug=True)