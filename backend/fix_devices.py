import json
import numpy as np

np.random.seed(None)  # true randomness this time

with open('results.json', 'r') as f:
    results = json.load(f)

# Define 5 realistic house profiles
profiles = {
    'heavy_ac':      {'AC': (45,60), 'Refrigerator': (10,15), 'Washing Machine': (5,10),  'Lights': (5,10),  'Other': (10,20)},
    'all_rounder':   {'AC': (20,30), 'Refrigerator': (15,25), 'Washing Machine': (10,20), 'Lights': (15,25), 'Other': (10,20)},
    'fridge_heavy':  {'AC': (10,20), 'Refrigerator': (30,45), 'Washing Machine': (10,15), 'Lights': (10,20), 'Other': (10,20)},
    'lights_heavy':  {'AC': (15,25), 'Refrigerator': (10,20), 'Washing Machine': (5,10),  'Lights': (35,50), 'Other': (5,15)},
    'washer_heavy':  {'AC': (20,30), 'Refrigerator': (10,20), 'Washing Machine': (30,45), 'Lights': (5,15),  'Other': (5,15)},
}

water_profiles = {
    'shower_heavy':  {'Water Heater': (15,25), 'Washing Machine': (10,20), 'Bathroom': (40,55), 'Kitchen': (10,20)},
    'kitchen_heavy': {'Water Heater': (20,30), 'Washing Machine': (10,15), 'Bathroom': (20,30), 'Kitchen': (35,50)},
    'heater_heavy':  {'Water Heater': (40,55), 'Washing Machine': (10,15), 'Bathroom': (20,30), 'Kitchen': (10,20)},
    'balanced':      {'Water Heater': (20,30), 'Washing Machine': (20,30), 'Bathroom': (25,35), 'Kitchen': (15,25)},
}

profile_names       = list(profiles.keys())
water_profile_names = list(water_profiles.keys())

devices = {}

for i, (hid, data) in enumerate(results.items()):
    # Pick random profile per house
    ep = profiles[profile_names[i % len(profile_names)]]
    wp = water_profiles[water_profile_names[i % len(water_profile_names)]]

    # Generate electricity percentages from ranges
    raw_e = {k: np.random.uniform(v[0], v[1]) for k, v in ep.items()}
    total_e = sum(raw_e.values())
    elec = {k: round(v / total_e * 100, 1) for k, v in raw_e.items()}

    # Generate water percentages from ranges
    raw_w = {k: np.random.uniform(v[0], v[1]) for k, v in wp.items()}
    total_w = sum(raw_w.values())
    water = {k: round(v / total_w * 100, 1) for k, v in raw_w.items()}

    # Daily usage based on waste score — higher waste = higher usage
    waste_factor = (data['elec_waste'] + 20) / 100
    daily_elec   = round(np.random.uniform(3, 15) * (1 + waste_factor), 2)
    daily_water  = round(np.random.uniform(80, 300) * (1 + waste_factor), 2)

    devices[hid] = {
        'electricity'     : elec,
        'water'           : water,
        'avg_daily_elec'  : daily_elec,
        'avg_daily_water' : daily_water,
        'profile'         : profile_names[i % len(profile_names)]
    }

with open('devices.json', 'w') as f:
    json.dump(devices, f, indent=2)

print("Done! Realistic device data generated.")
print("\nSample HOUSE001:")
print(json.dumps(devices['HOUSE001'], indent=2))