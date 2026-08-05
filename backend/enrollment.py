from flask import Blueprint, jsonify, request

enrollment_bp = Blueprint('enrollment', __name__)

@enrollment_bp.route('/api/v1/enrollments', methods=['POST'])
def enroll_program():
    """
    Register a learner for a public educational program.
    """
    data = request.get_json()
    user_id = data.get('user_id')
    program_id = data.get('program_id')

    if not user_id or not program_id:
        return jsonify({"status": "error", "message": "user_id and program_id are required"}), 400

    return jsonify({
        "status": "success",
        "message": f"Successfully enrolled user {user_id} in program {program_id}",
        "enrollment_id": f"ENR-{user_id[:4]}-{program_id}"
    }), 201
