from flask import Blueprint, jsonify, request

todo_bp = Blueprint('todo', __name__)

@todo_bp.route('/api/v1/todos/<user_id>', methods=['GET'])
def get_user_todos(user_id):
    """
    Fetch personal learning progress and pending tasks for a specific user.
    """
    sample_todos = [
        {"id": 1, "task": "Complete React Component Assignment", "completed": False},
        {"id": 2, "task": "Attend LBS Mentoring Session", "completed": True}
    ]
    
    return jsonify({
        "status": "success",
        "user_id": user_id,
        "todos": sample_todos
    }), 200
