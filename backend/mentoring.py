import os
import boto3
from flask import Blueprint, jsonify, request

mentoring_bp = Blueprint('mentoring', __name__)

AWS_REGION = os.getenv('AWS_REGION', 'ap-northeast-2')
DYNAMODB_TABLE = os.getenv('AWS_DYNAMODB_TABLE_MENTORING', 'DoIt_Mentoring')

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(DYNAMODB_TABLE)

@mentoring_bp.route('/api/v1/mentoring/match', methods=['POST'])
def match_mentor():
    """
    Match local learners with suitable mentors based on subject & geospatial proximity.
    """
    data = request.get_json()
    learner_id = data.get('learner_id')
    subject = data.get('subject')

    if not learner_id or not subject:
        return jsonify({"status": "error", "message": "Learner ID and subject are required"}), 400

    # Simulated geospatial algorithm matching logic
    matched_mentors = [
        {"mentor_id": "m101", "name": "Kim Tech", "subject": subject, "rating": 4.9, "distance_km": 1.2},
        {"mentor_id": "m102", "name": "Lee Code", "subject": subject, "rating": 4.8, "distance_km": 2.5}
    ]

    return jsonify({
        "status": "success",
        "learner_id": learner_id,
        "matched_count": len(matched_mentors),
        "mentors": matched_mentors
    }), 200
