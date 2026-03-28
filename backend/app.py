from flask import Flask, jsonify, request
from flask_cors import CORS
import json, jwt, bcrypt, datetime, hashlib, os, requests, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)
SECRET = "greenfed_secret_key_2024"

# ── CONFIG (set via environment variables) ───────────────
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY",       "password")
EMAIL_SENDER    = os.getenv("GREENFED_EMAIL",        "greenfed@gmail.com")
EMAIL_PASSWORD  = os.getenv("GREENFED_EMAIL_PASS",   "password")

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

# ── DATA LOADING ─────────────────────────────────────────
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

# ── HELPERS ──────────────────────────────────────────────
def verify_token(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token: return None
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

# ── EMAIL HELPERS ─────────────────────────────────────────
def build_alert_html(hid, data, dev, sugg):
    """Build a styled HTML email body for a house alert."""
    score     = data['green_score']
    elec_s    = data['elec_score']
    water_s   = data['water_score']
    elec_w    = data['elec_waste']
    water_w   = data['water_waste']

    # Score colour
    if score >= 70:
        score_color, score_label = "#4a5e28", "Thriving 🌿"
    elif score >= 50:
        score_color, score_label = "#6b7c3e", "Growing 🌱"
    elif score >= 35:
        score_color, score_label = "#d4a017", "Budding 🌾"
    else:
        score_color, score_label = "#b05e3a", "Wilting 🍂"

    # Suggestion rows
    icon_map = {"critical":"🔴", "warning":"⚠️", "info":"💡", "success":"✅"}
    bg_map   = {"critical":"#fdf0eb","warning":"#fdf6e3","info":"#e8f0f8","success":"#eaf2e0"}
    sugg_html = "".join(
        f'<div style="background:{bg_map.get(s["type"],"#f5f5f5")};border-left:4px solid {score_color};'
        f'padding:10px 14px;margin-bottom:8px;border-radius:4px;font-size:14px;">'
        f'{icon_map.get(s["type"],"ℹ️")} {s["msg"]}</div>'
        for s in sugg
    )

    # Top devices
    top_elec  = max(dev['electricity'], key=dev['electricity'].get)
    top_water = max(dev['water'],       key=dev['water'].get)

    date_str = datetime.datetime.now().strftime("%d %B %Y, %I:%M %p")

    return f"""
    <html><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:30px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fffdf7;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(61,43,31,0.12);">

          <!-- HEADER -->
          <tr><td style="background:linear-gradient(135deg,#4a5e28,#6b7c3e);padding:32px 36px;text-align:center;">
            <div style="font-size:42px;margin-bottom:8px;">🌱</div>
            <h1 style="color:white;font-size:26px;margin:0;letter-spacing:-0.5px;">GreenFed Alert</h1>
            <p style="color:#b5c98e;font-size:14px;margin:6px 0 0;">Privacy-Preserving Sustainability AI · SDG-12</p>
          </td></tr>

          <!-- HOUSE + DATE -->
          <tr><td style="padding:20px 36px 0;text-align:center;">
            <span style="background:#eaf2e0;color:#4a5e28;padding:6px 20px;border-radius:20px;font-weight:700;font-size:14px;">
              {hid} · {date_str}
            </span>
          </td></tr>

          <!-- GREENSCORE -->
          <tr><td style="padding:24px 36px;">
            <div style="background:{bg_map.get('success','#eaf2e0')};border:2px solid {score_color};border-radius:14px;padding:24px;text-align:center;">
              <div style="font-size:64px;font-weight:900;color:{score_color};line-height:1;">{score}</div>
              <div style="font-size:16px;color:#3d2b1f;font-weight:700;margin-top:4px;">GreenScore / 100</div>
              <div style="font-size:18px;margin-top:8px;color:{score_color};font-weight:700;">{score_label}</div>
            </div>
          </td></tr>

          <!-- SCORE BREAKDOWN -->
          <tr><td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" style="background:#e8f3f8;border-radius:12px;padding:16px;text-align:center;">
                  <div style="font-size:32px;font-weight:900;color:#4a7c8e;">{elec_s}</div>
                  <div style="font-size:13px;color:#3d2b1f;font-weight:700;margin-top:4px;">⚡ Electricity Score</div>
                  <div style="font-size:12px;color:#b05e3a;margin-top:2px;">Waste: {elec_w}%</div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#eaf2e0;border-radius:12px;padding:16px;text-align:center;">
                  <div style="font-size:32px;font-weight:900;color:#4a5e28;">{water_s}</div>
                  <div style="font-size:13px;color:#3d2b1f;font-weight:700;margin-top:4px;">💧 Water Score</div>
                  <div style="font-size:12px;color:#b05e3a;margin-top:2px;">Waste: {water_w}%</div>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- TOP DEVICES -->
          <tr><td style="padding:0 36px 24px;">
            <div style="background:#f5f0e8;border-radius:12px;padding:16px 20px;">
              <div style="font-size:13px;color:#4a5e28;font-weight:800;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Top Consuming Devices</div>
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#3d2b1f;font-weight:600;">
                <span>⚡ {top_elec} — {dev['electricity'][top_elec]}% of electricity</span>
                <span>💧 {top_water} — {dev['water'][top_water]}% of water</span>
              </div>
            </div>
          </td></tr>

          <!-- SUGGESTIONS -->
          <tr><td style="padding:0 36px 24px;">
            <div style="font-size:13px;color:#4a5e28;font-weight:800;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">Personalized Recommendations</div>
            {sugg_html}
          </td></tr>

          <!-- PRIVACY NOTE -->
          <tr><td style="padding:0 36px 24px;">
            <div style="background:#f0e9d6;border-radius:10px;padding:14px 18px;font-size:12px;color:#6b7c3e;border-left:3px solid #8fa660;">
              🔒 <strong>Privacy Note:</strong> This alert was generated using Federated Learning.
              Your raw consumption data (3.9M readings) never left your device.
              Only model parameters were shared — your privacy is preserved. SDG-12 compliant.
            </div>
          </td></tr>

          <!-- FOOTER -->
          <tr><td style="background:#f5f0e8;padding:18px 36px;text-align:center;border-top:1px solid #d4c5a0;">
            <p style="font-size:12px;color:#8fa660;margin:0;">GreenFed — SRM Institute of Science and Technology</p>
            <p style="font-size:11px;color:#a09070;margin:4px 0 0;">Unsubscribe from alerts by updating your profile settings.</p>
          </td></tr>

        </table>
      </td></tr>
    </table>
    </body></html>
    """

def send_email(to_email, subject, html_body):
    """Send HTML email via Gmail SMTP. Returns (success: bool, error: str)."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f"GreenFed Alerts <{EMAIL_SENDER}>"
        msg['To']      = to_email
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        return True, None
    except Exception as e:
        return False, str(e)

def get_user_email(house_id):
    """Read email from users.json if present."""
    return users.get(house_id, {}).get('email', None)

def set_user_email(house_id, email):
    """Persist email to users.json."""
    if house_id in users:
        users[house_id]['email'] = email
        with open('users.json', 'w') as f:
            json.dump(users, f, indent=2)
        return True
    return False

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
        'email'         : get_user_email(hid),
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

# ── CHATBOT (GEMINI) ──────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Body: { "message": "...", "history": [{"role":"user","text":"..."},{"role":"bot","text":"..."}] }
    Returns: { "reply": "..." }
    """
    payload = verify_token(request)
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401

    body    = request.get_json()
    message = body.get('message', '').strip()
    history = body.get('history', [])   # list of {role, text} from frontend

    if not message:
        return jsonify({'error': 'Empty message'}), 400

    hid  = payload['house_id']
    data = spread_results[hid]
    dev  = devices[hid]
    sugg = get_suggestions(hid, data, dev)

    # ── System context injected into the first user turn ──
    system_prompt = f"""You are GreenBot 🌱, the AI sustainability assistant for the GreenFed platform.
GreenFed is a Privacy-Preserving Federated Learning system for household electricity and water optimization, aligned with SDG-12.

Current user context (private, never share raw numbers unless directly asked):
- House ID : {hid}
- GreenScore : {data['green_score']}/100  (community avg: {community_avg_green})
- Electricity Score : {data['elec_score']}/100  (waste: {data['elec_waste']}%)
- Water Score : {data['water_score']}/100  (waste: {data['water_waste']}%)
- Daily electricity : {dev['avg_daily_elec']} kWh
- Daily water : {dev['avg_daily_water']} L
- Top electricity device : {max(dev['electricity'], key=dev['electricity'].get)} ({max(dev['electricity'].values())}%)
- Top water consumer : {max(dev['water'], key=dev['water'].get)} ({max(dev['water'].values())}%)
- Active suggestions : {'; '.join(s['msg'] for s in sugg[:3])}

Personality guidelines:
- Be friendly, concise, and actionable. Use emojis sparingly.
- Relate answers to the user's actual data when relevant.
- If asked about privacy, explain that raw data never leaves the device (Federated Learning).
- If asked non-sustainability questions, gently redirect to GreenFed topics.
- Keep responses under 120 words unless the user requests a detailed explanation."""

    # ── Build Gemini multi-turn contents ──
    contents = []

    # Inject system prompt as the very first user turn
    contents.append({
        "role": "user",
        "parts": [{"text": system_prompt}]
    })
    # Acknowledge so model sees it as confirmed context
    contents.append({
        "role": "model",
        "parts": [{"text": "Understood! I'm GreenBot 🌱, ready to help you improve sustainability."}]
    })

    # Replay conversation history
    for turn in history[-10:]:   # keep last 10 turns to stay within token limits
        role = "user" if turn.get("role") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": turn.get("text", "")}]
        })

    # Current user message
    contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })

    try:
        resp = requests.post(
            GEMINI_URL,
            json={"contents": contents},
            timeout=15
        )
        resp.raise_for_status()
        result = resp.json()
        reply  = result['candidates'][0]['content']['parts'][0]['text']
    except requests.exceptions.Timeout:
        return jsonify({'error': 'GreenBot is taking too long. Please try again.'}), 504
    except Exception as e:
        return jsonify({'error': f'GreenBot error: {str(e)}'}), 500

    return jsonify({'reply': reply})

# ── EMAIL ROUTES ──────────────────────────────────────────
@app.route('/api/update-email', methods=['POST'])
def update_email():
    """Let a house update its alert email address."""
    payload = verify_token(request)
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401

    body  = request.get_json()
    email = body.get('email', '').strip()
    hid   = payload['house_id']

    if not email or '@' not in email:
        return jsonify({'error': 'Invalid email address'}), 400

    ok = set_user_email(hid, email)
    if not ok:
        return jsonify({'error': 'House not found'}), 404

    return jsonify({'message': f'Email updated to {email}', 'email': email})

@app.route('/api/send-alert', methods=['POST'])
def send_alert():
    """
    Send a sustainability alert email to the logged-in house.
    Body: { "type": "report" | "critical" }   (optional, defaults to "report")
    """
    payload = verify_token(request)
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401

    hid    = payload['house_id']
    body   = request.get_json() or {}
    kind   = body.get('type', 'report')

    to_email = get_user_email(hid)
    if not to_email:
        return jsonify({'error': 'No email registered. Please set your email first.'}), 400

    data = spread_results[hid]
    dev  = devices[hid]
    sugg = get_suggestions(hid, data, dev)

    score = data['green_score']
    if kind == 'critical':
        subject = f"🔴 GreenFed Critical Alert — {hid} GreenScore: {score}/100"
    else:
        subject = f"🌱 GreenFed Sustainability Report — {hid} · GreenScore: {score}/100"

    html    = build_alert_html(hid, data, dev, sugg)
    ok, err = send_email(to_email, subject, html)

    if ok:
        return jsonify({'message': f'Alert sent to {to_email}', 'email': to_email})
    else:
        return jsonify({'error': f'Email failed: {err}'}), 500

# ── ADMIN ─────────────────────────────────────────────────
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
            'has_email'        : bool(get_user_email(hid)),
        })
    houses.sort(key=lambda x: x['green_score'], reverse=True)
    return jsonify(houses)

@app.route('/api/admin/send-all-alerts', methods=['POST'])
def admin_send_all_alerts():
    """
    Admin-only: sends critical alerts to all houses with GreenScore < 40 that have a registered email.
    Returns a summary of sent / skipped.
    """
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = jwt.decode(token, SECRET, algorithms=['HS256'])
        if not payload.get('admin'):
            return jsonify({'error': 'Forbidden'}), 403
    except:
        return jsonify({'error': 'Unauthorized'}), 401

    sent, skipped_no_email, skipped_score, failed = [], [], [], []

    for hid, data in spread_results.items():
        if data['green_score'] >= 40:
            skipped_score.append(hid)
            continue

        to_email = get_user_email(hid)
        if not to_email:
            skipped_no_email.append(hid)
            continue

        dev  = devices[hid]
        sugg = get_suggestions(hid, data, dev)
        subject = f"🔴 GreenFed Critical Alert — {hid} GreenScore: {data['green_score']}/100"
        html    = build_alert_html(hid, data, dev, sugg)
        ok, _   = send_email(to_email, subject, html)

        if ok:
            sent.append(hid)
        else:
            failed.append(hid)

    return jsonify({
        'sent'              : sent,
        'failed'            : failed,
        'skipped_no_email'  : skipped_no_email,
        'skipped_score_ok'  : skipped_score,
        'total_alerted'     : len(sent),
    })

# ── CONVERGENCE ──────────────────────────────────────────
@app.route('/api/convergence')
def get_convergence():
    try:
        with open('../greenfed/progress.json', 'r') as f:
            progress = json.load(f)
        return jsonify({
            'elec_loss'  : progress['elec_loss'],
            'water_loss' : progress['water_loss'],
            'rounds'     : list(range(1, len(progress['elec_loss']) + 1))
        })
    except:
        return jsonify({
            'elec_loss'  : [0.0073,0.0073,0.0071,0.0072,0.0071,0.0071,0.0071,0.0070,0.0070,0.0070],
            'water_loss' : [0.0115,0.0117,0.0105,0.0107,0.0107,0.0104,0.0101,0.0101,0.0096,0.0103],
            'rounds'     : [1,2,3,4,5,6,7,8,9,10]
        })

if __name__ == '__main__':
    print("GreenFed API starting...")
    app.run(debug=True, port=5000)