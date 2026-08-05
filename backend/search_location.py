import os
import requests
from flask import Blueprint, jsonify, request

search_location_bp = Blueprint('search_location', __name__)

KAKAO_API_KEY = os.getenv('KAKAO_API_KEY', 'bd1a97e7ba1ceecaf7db59587dbdaff3')

@search_location_bp.route('/api/v1/locations/search', methods=['GET'])
def search_educational_facilities():
    """
    Search nearby lifelong educational facilities & programs using Kakao Geospatial LBS API.
    """
    query = request.args.get('query', '평생학습')
    latitude = request.args.get('lat', '36.4800')  # Sejong City default latitude
    longitude = request.args.get('lng', '127.2890') # Sejong City default longitude
    
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}
    params = {
        "query": query,
        "x": longitude,
        "y": latitude,
        "radius": 5000  # 5km radius
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                "status": "success",
                "count": len(data.get('documents', [])),
                "data": data.get('documents', [])
            }), 200
        return jsonify({"status": "error", "message": "Failed to fetch location data"}), response.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
