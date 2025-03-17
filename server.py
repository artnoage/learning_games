from flask import Flask, send_from_directory

app = Flask(__name__, static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    print("Memory Game server running at http://localhost:5000/")
    app.run(debug=True)
