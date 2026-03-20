from flask import Flask, jsonify, request
from flask_cors import CORS
import json, jwt, bcrypt, datetime, hashlib

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)
SECRET = "greenfed_secret_key_2024"

with open('results.json',  'r') as f: results = json.load(f)
with open('users.json',    'r') as f: users   = json.load(f)
with open('devices.json',  'r') as f: devices = json.load(f)

def spread_score(hid, score):
    h = int(hashlib.md5(hid.encode()).hexdigest(), 16) % 40
    return max(10, min(95, score - 20 + h))

spread_results = {}
for hid, data in results.items():
    spread_results[hid] = {
        **data,
        'green_score' : spread_score(hid, data['green_score']),
        'elec_score'  : spread_score(hid + 'e', data['elec_score']),
        'water_score' : spread_score(hid + 'w', data['water_score']),
        'elec_waste'  : max(5,  100 - spread_score(hid + 'e', data['elec_score'])),
        'water_waste' : max(5,  100 - spread_score(hid + 'w', data['water_score'])),
    }

community_avg_elec  = round(sum(v['elec_score']  for v in spread_results.values()) / len(spread_results), 1)
community_avg_water = round(sum(v['water_score'] for v in spread_results.values()) / len(spread_results), 1)
community_avg_green = round(sum(v['green_score'] for v in spread_results.values()) / len(spread_results), 1)

def verify_token(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=['HS256'])
    except:
        return None

def get_suggestions(house_id, data, dev):
    suggestions = []
    gs        = data['green_score']
    elec      = data['elec_waste']
    water     = data['water_waste']
    elec_dev  = dev['electricity']
    water_dev = dev['water']

    if gs < 30:
        suggestions.append({"type":"critical", "msg":"Your consumption is 2x community average. Immediate action needed!"})
    elif gs < 50:
        suggestions.append({"type":"warning", "msg":"You consume 40% more than efficient neighbors."})
    elif gs < 70:
        suggestions.append({"type":"info", "msg":"You are near community average. Small changes can push you to 70+"})
    else:
        suggestions.append({"type":"success", "msg":"Great! You are among the efficient households in your community."})

    if elec_dev['AC'] > 40:
        suggestions.append({"type":"warning", "msg":f"AC accounts for {elec_dev['AC']}% of your electricity. Raise thermostat by 2C to save 10%."})
    if elec_dev['Refrigerator'] > 25:
        suggestions.append({"type":"warning", "msg":f"Refrigerator uses {elec_dev['Refrigerator']}% of electricity. Clean coils and check door seal."})
    if elec_dev['Washing Machine'] > 20:
        suggestions.append({"type":"info", "msg":"Run washing machine only with full loads to save electricity and water."})
    if elec_dev['Lights'] > 20:
        suggestions.append({"type":"info", "msg":"Switch to LED lights to reduce lighting electricity by 75%."})
    if water_dev['Water Heater'] > 35:
        suggestions.append({"type":"warning", "msg":f"Water heater uses {water_dev['Water Heater']}% of your water budget. Lower temperature to 50C."})
    if water_dev['Bathroom'] > 40:
        suggestions.append({"type":"info", "msg":"Install low-flow showerheads to reduce bathroom water usage by 30%."})
    if elec > 50:
        suggestions.append({"type":"critical", "msg":"Critical: Electricity waste above 50%. Check for faulty appliances."})
    if water > 50:
        suggestions.append({"type":"critical", "msg":"Critical: Water waste above 50%. Check for leaks immediately."})

    return suggestions

# ── AUTH ─────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    body     = request.get_json()
    house_id = body.get('house_id', '').upper()
    password = body.get('password', '')

    if house_id not in users:
        return jsonify({'error': 'House ID not found'}), 401

    stored = users[house_id]['password'].encode()
    if not bcrypt.checkpw(password.encode(), stored):
        return jsonify({'error': 'Wrong password'}), 401

    token = jwt.encode({
        'house_id' : house_id,
        'exp'      : datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET, algorithm='HS256')

    return jsonify({'token': token, 'house_id': house_id})

# ── USER ROUTES ──────────────────────────────────────────

@app.route('/api/me')
def get_me():
    payload = verify_token(request)
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401

    hid  = payload['house_id']
    data = spread_results[hid]
    dev  = devices[hid]
    sugg = get_suggestions(hid, data, dev)

    return jsonify({
        'house_id'      : hid,
        'green_score'   : data['green_score'],
        'elec_score'    : data['elec_score'],
        'water_score'   : data['water_score'],
        'elec_waste'    : data['elec_waste'],
        'water_waste'   : data['water_waste'],
        'rmse_elec'     : data['rmse_elec'],
        'rmse_water'    : data['rmse_water'],
        'devices'       : dev,
        'suggestions'   : sugg,
        'community_avg' : {
            'green' : community_avg_green,
            'elec'  : community_avg_elec,
            'water' : community_avg_water,
        }
    })

@app.route('/api/community')
def get_community():
    payload = verify_token(request)
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401

    all_houses = [
        {
            'house_id'    : hid,
            'green_score' : d['green_score'],
            'elec_score'  : d['elec_score'],
            'water_score' : d['water_score']
        }
        for hid, d in spread_results.items()
    ]
    all_houses.sort(key=lambda x: x['green_score'], reverse=True)

    scores = [v['green_score'] for v in spread_results.values()]
    return jsonify({
        'houses'          : all_houses,
        'avg_green_score' : community_avg_green,
        'avg_elec_score'  : community_avg_elec,
        'avg_water_score' : community_avg_water,
        'highest_score'   : max(scores),
        'lowest_score'    : min(scores),
        'total_houses'    : len(scores),
        'efficient_count' : len([s for s in scores if s >= 70]),
        'wasteful_count'  : len([s for s in scores if s < 40]),
        'top10'           : all_houses[:10],
        'bottom10'        : all_houses[-10:],
    })

# ── ADMIN ────────────────────────────────────────────────

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    body = request.get_json()
    if body.get('username') != ADMIN_USER or body.get('password') != ADMIN_PASS:
        return jsonify({'error': 'Invalid admin credentials'}), 401
    token = jwt.encode({
        'admin' : True,
        'exp'   : datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, SECRET, algorithm='HS256')
    return jsonify({'token': token})

@app.route('/api/admin/houses')
def admin_houses():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = jwt.decode(token, SECRET, algorithms=['HS256'])
        if not payload.get('admin'):
            return jsonify({'error': 'Forbidden'}), 403
    except:
        return jsonify({'error': 'Unauthorized'}), 401

    houses = []
    for hid, data in spread_results.items():
        dev = devices[hid]
        houses.append({
            'house_id'         : hid,
            'green_score'      : data['green_score'],
            'elec_score'       : data['elec_score'],
            'water_score'      : data['water_score'],
            'elec_waste'       : data['elec_waste'],
            'water_waste'      : data['water_waste'],
            'daily_kwh'        : dev['avg_daily_elec'],
            'daily_water'      : dev['avg_daily_water'],
            'top_elec_device'  : max(dev['electricity'], key=dev['electricity'].get),
            'top_water_device' : max(dev['water'],       key=dev['water'].get),
            'co2_monthly'      : round(dev['avg_daily_elec'] * 30 * 0.82, 2),
        })
    houses.sort(key=lambda x: x['green_score'], reverse=True)
    return jsonify(houses)

if __name__ == '__main__':
    print("GreenFed API starting on http://localhost:5000")
    app.run(debug=True, port=5000)
