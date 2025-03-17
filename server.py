from flask import Flask, send_from_directory, jsonify

app = Flask(__name__, static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

@app.route('/api/default-pairs')
def get_default_pairs():
    # This is a fallback in case the JSON file can't be loaded directly
    default_pairs = [
        ["Apple", "Orange"],
        ["Dog", "Cat"],
        ["Sun", "Moon"],
        ["Book", "Page"],
        ["Car", "Road"],
        ["Coffee", "Tea"]
    ]
    return jsonify(default_pairs)

if __name__ == '__main__':
    print("Memory Game server running at http://localhost:5000/")
    app.run(debug=True)
