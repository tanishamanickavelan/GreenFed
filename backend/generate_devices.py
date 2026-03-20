# generate_devices.py
import json
import numpy as np

with open('results.json', 'r') as f:
    results = json.load(f)

np.random.seed(42)
devices = {}

for hid, data in results.items():
    total_elec = data['elec_waste'] + 50
    total_water = data['water_waste'] + 50

    # Device percentages vary per house
    elec_split = np.random.dirichlet([3, 2, 1.5, 1.5, 2]) * 100
    water_split = np.random.dirichlet([2, 1, 3, 4]) * 100

    devices[hid] = {
        "electricity": {
            "AC"             : round(elec_split[0], 1),
            "Refrigerator"   : round(elec_split[1], 1),
            "Washing Machine": round(elec_split[2], 1),
            "Lights"         : round(elec_split[3], 1),
            "Other"          : round(elec_split[4], 1),
        },
        "water": {
            "Water Heater"   : round(water_split[0], 1),
            "Washing Machine": round(water_split[1], 1),
            "Bathroom"       : round(water_split[2], 1),
            "Kitchen"        : round(water_split[3], 1),
        },
        "avg_daily_elec"  : round(total_elec * 0.1, 2),
        "avg_daily_water" : round(total_water * 1.5, 2),
    }

with open('devices.json', 'w') as f:
    json.dump(devices, f, indent=2)

print(f"Generated device data for {len(devices)} houses!")