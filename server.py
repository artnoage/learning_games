from flask import Flask, send_from_directory, jsonify

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    # Set correct MIME type for audio files
    if path.endswith('.wav'):
        return send_from_directory('.', path, mimetype='audio/wav')
    return send_from_directory('.', path)

@app.route('/api/default-pairs')
def get_default_pairs():
    # This is a fallback in case the JSON file can't be loaded directly
    default_pairs = [
        ["Hello", "Hallo"],
        ["Goodbye", "Auf Wiedersehen"],
        ["Thank you", "Danke"],
        ["Please", "Bitte"],
        ["Yes", "Ja"],
        ["No", "Nein"],
        ["Water", "Wasser"],
        ["Bread", "Brot"],
        ["Friend", "Freund"],
        ["Family", "Familie"],
        ["House", "Haus"],
        ["Car", "Auto"],
        ["Book", "Buch"],
        ["Time", "Zeit"],
        ["Day", "Tag"],
        ["Night", "Nacht"],
        ["Morning", "Morgen"],
        ["Evening", "Abend"],
        ["Love", "Liebe"],
        ["Work", "Arbeit"]
    ]
    return jsonify(default_pairs)

if __name__ == '__main__':
    print("Memory Game server running at http://localhost:8001/")
    app.run(debug=True, port=8001)
