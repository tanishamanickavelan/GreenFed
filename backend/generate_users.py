import json
import bcrypt

with open('results.json', 'r') as f:
    results = json.load(f)

users = {}
for hid in results.keys():
    password = hid.lower() + "123"
    hashed   = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    users[hid] = {
        "password" : hashed,
        "house_id" : hid
    }

with open('users.json', 'w') as f:
    json.dump(users, f, indent=2)

print(f"Generated {len(users)} users!")
print("Sample login:")
print(f"  house_id : HOUSE001")
print(f"  password : house001123")