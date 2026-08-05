import os
import boto3
from botocore.exceptions import ClientError
from flask import Blueprint, jsonify, request

login_bp = Blueprint('login', __name__)

# Initialize AWS DynamoDB Resource
AWS_REGION = os.getenv('AWS_REGION', 'ap-northeast-2')
DYNAMODB_TABLE = os.getenv('AWS_DYNAMODB_TABLE_USERS', 'DoIt_Users')

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(DYNAMODB_TABLE)

@login_bp.route('/api/v1/auth/login', methods=['POST'])
def login_user():
    """
    Authenticate user against AWS DynamoDB user records.
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required"}), 400

    try:
        response = table.get_item(Key={'email': email})
        user = response.get('Item')

        if user and user.get('password') == password:
            return jsonify({
                "status": "success",
                "message": "Login successful",
                "user": {
                    "email": user['email'],
                    "name": user.get('name', 'User'),
                    "role": user.get('role', 'student')
                }
            }), 200
        else:
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401

    except ClientError as e:
        return jsonify({"status": "error", "message": e.response['Error']['Message']}), 500
