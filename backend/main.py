import os
from flask import Flask, jsonify
from login import login_bp
from search_location import search_location_bp
from mentoring import mentoring_bp
from enrollment import enrollment_bp
from todo import todo_bp

app = Flask(__name__)

# Register Blueprints (REST API Endpoints)
app.register_blueprint(login_bp)
app.register_blueprint(search_location_bp)
app.register_blueprint(mentoring_bp)
app.register_blueprint(enrollment_bp)
app.register_blueprint(todo_bp)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Do-it Public Educational Platform API",
        "version": "1.0.0"
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
