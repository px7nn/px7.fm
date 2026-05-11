import  api
from    flask       import Flask, request, jsonify, render_template

app = Flask(__name__, template_folder="templates", static_folder="static")

HOST = "127.0.0.1"
PORT = 5000

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/health', methods=['HEAD'])
def health():
    return jsonify({"status": "healthy"}), 200


@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    limit = request.args.get('limit', api.SEARCH_LIMIT)
    results = api.search(query, limit)
    return jsonify({
        'results' : results
    })


@app.route("/api/trending")
def trending_route():
    return jsonify({
        "results": api.trending()
    })


@app.route("/api/stream")
def stream():
    id = request.args.get("id")
    url = api.stream(id)

    if url is None:
        return jsonify({
            "error": "Could not extract stream"
        }), 500
    
    return jsonify({
        "stream_url": url
    })