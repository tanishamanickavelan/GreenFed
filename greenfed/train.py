import pandas as pd
import numpy as np
import os, json
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error

SEQ_LEN          = 7
FL_ROUNDS        = 10
LOCAL_EPOCHS     = 5
BATCH_SIZE       = 16
LSTM_UNITS       = 64
LEARNING_RATE    = 0.001
TEST_SPLIT       = 0.2
HOUSES_PER_ROUND = 30
SAVE_PATH        = './'

print("Loading dataset...")
df = pd.read_csv('greenfed_all_houses.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values(['house_id','timestamp']).reset_index(drop=True)
df = df.drop_duplicates(subset=['house_id','timestamp'])
HOUSE_IDS = sorted(df['house_id'].unique())
print(f"Loaded! {len(df):,} rows | {len(HOUSE_IDS)} houses")
print(f"Rows per house: {len(df) // len(HOUSE_IDS)}")

def make_sequences(data, seq_len):
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i:i+seq_len])
        y.append(data[i+seq_len])
    return np.array(X), np.array(y)

def build_lstm(seq_len, units=64, lr=0.001):
    model = Sequential([
        LSTM(units, return_sequences=True,
             input_shape=(seq_len, 1)),
        Dropout(0.2),
        LSTM(units // 2),
        Dropout(0.2),
        Dense(1)
    ])
    model.compile(optimizer=Adam(lr), loss='mse', metrics=['mae'])
    return model

def fedavg(weight_list):
    avg_weights = []
    for weights_per_layer in zip(*weight_list):
        avg_weights.append(np.mean(weights_per_layer, axis=0))
    return avg_weights

print("Functions ready!")

print("Preparing house data...")
house_data = {}
for hid in HOUSE_IDS:
    hdf      = df[df['house_id'] == hid].copy()
    hdf      = hdf.sort_values('timestamp').reset_index(drop=True)
    features = hdf[['electricity_kwh','water_liters']].values
    scaler   = MinMaxScaler()
    scaled   = scaler.fit_transform(features)
    split    = int(len(scaled) * (1 - TEST_SPLIT))
    train    = scaled[:split]
    test     = scaled[split:]

    X_train_e, y_train_e = make_sequences(train[:,0], SEQ_LEN)
    X_test_e,  y_test_e  = make_sequences(test[:,0],  SEQ_LEN)
    X_train_w, y_train_w = make_sequences(train[:,1], SEQ_LEN)
    X_test_w,  y_test_w  = make_sequences(test[:,1],  SEQ_LEN)

    X_train_e = X_train_e.reshape(-1, SEQ_LEN, 1)
    X_test_e  = X_test_e.reshape(-1,  SEQ_LEN, 1)
    X_train_w = X_train_w.reshape(-1, SEQ_LEN, 1)
    X_test_w  = X_test_w.reshape(-1,  SEQ_LEN, 1)

    house_data[hid] = {
        'X_train_e': X_train_e, 'y_train_e': y_train_e,
        'X_test_e' : X_test_e,  'y_test_e' : y_test_e,
        'X_train_w': X_train_w, 'y_train_w': y_train_w,
        'X_test_w' : X_test_w,  'y_test_w' : y_test_w,
        'scaler'   : scaler,
    }
print(f"House data ready for {len(house_data)} houses!")

global_model_e = build_lstm(SEQ_LEN, LSTM_UNITS, LEARNING_RATE)
global_model_w = build_lstm(SEQ_LEN, LSTM_UNITS, LEARNING_RATE)

checkpoint_e  = SAVE_PATH + 'checkpoint_elec.weights.h5'
checkpoint_w  = SAVE_PATH + 'checkpoint_water.weights.h5'
progress_file = SAVE_PATH + 'progress.json'

if os.path.exists(checkpoint_e) and os.path.exists(checkpoint_w):
    global_model_e.load_weights(checkpoint_e)
    global_model_w.load_weights(checkpoint_w)
    with open(progress_file) as f:
        progress = json.load(f)
    start_round        = progress['last_round'] + 1
    elec_loss_history  = progress['elec_loss']
    water_loss_history = progress['water_loss']
    print(f"Resumed from Round {start_round}!")
else:
    start_round        = 1
    elec_loss_history  = []
    water_loss_history = []
    print("Starting fresh!")

print(f"GreenFed FL Training")
print(f"{HOUSES_PER_ROUND} houses/round | {FL_ROUNDS} rounds | {LOCAL_EPOCHS} epochs")

for round_num in range(start_round, FL_ROUNDS + 1):
    print(f"\nRound {round_num}/{FL_ROUNDS} starting...")
    selected        = np.random.choice(HOUSE_IDS, size=HOUSES_PER_ROUND, replace=False)
    local_weights_e = []
    local_weights_w = []
    round_loss_e    = []
    round_loss_w    = []

    for idx, hid in enumerate(selected):
        print(f"  House {idx+1}/{HOUSES_PER_ROUND} ({hid})...", end='\r')
        d = house_data[hid]

        local_model_e = build_lstm(SEQ_LEN, LSTM_UNITS, LEARNING_RATE)
        local_model_e.set_weights(global_model_e.get_weights())
        hist_e = local_model_e.fit(
            d['X_train_e'], d['y_train_e'],
            epochs=LOCAL_EPOCHS, batch_size=BATCH_SIZE, verbose=0
        )
        local_weights_e.append(local_model_e.get_weights())
        round_loss_e.append(hist_e.history['loss'][-1])

        local_model_w = build_lstm(SEQ_LEN, LSTM_UNITS, LEARNING_RATE)
        local_model_w.set_weights(global_model_w.get_weights())
        hist_w = local_model_w.fit(
            d['X_train_w'], d['y_train_w'],
            epochs=LOCAL_EPOCHS, batch_size=BATCH_SIZE, verbose=0
        )
        local_weights_w.append(local_model_w.get_weights())
        round_loss_w.append(hist_w.history['loss'][-1])

    global_model_e.set_weights(fedavg(local_weights_e))
    global_model_w.set_weights(fedavg(local_weights_w))

    avg_loss_e = np.mean(round_loss_e)
    avg_loss_w = np.mean(round_loss_w)
    elec_loss_history.append(avg_loss_e)
    water_loss_history.append(avg_loss_w)

    global_model_e.save_weights(checkpoint_e)
    global_model_w.save_weights(checkpoint_w)
    with open(progress_file, 'w') as f:
        json.dump({
            'last_round' : round_num,
            'elec_loss'  : elec_loss_history,
            'water_loss' : water_loss_history
        }, f)

    print(f"Round {round_num}/{FL_ROUNDS} done | Elec: {avg_loss_e:.4f} | Water: {avg_loss_w:.4f} | Saved!")

print("\nFL Training Complete!")

print("Computing GreenScore for all houses...")
results = {}

for hid in HOUSE_IDS:
    d        = house_data[hid]
    pred_e   = global_model_e.predict(d['X_test_e'], verbose=0).flatten()
    pred_w   = global_model_w.predict(d['X_test_w'], verbose=0).flatten()
    actual_e = d['y_test_e']
    actual_w = d['y_test_w']

    elec_waste  = np.mean(np.maximum(0, actual_e - pred_e) / (pred_e + 1e-8)) * 100
    water_waste = np.mean(np.maximum(0, actual_w - pred_w) / (pred_w + 1e-8)) * 100

    elec_score  = round(max(0, 100 - elec_waste),  1)
    water_score = round(max(0, 100 - water_waste), 1)
    green_score = round((elec_score + water_score) / 2, 1)

    results[hid] = {
        'green_score' : green_score,
        'elec_score'  : elec_score,
        'water_score' : water_score,
        'elec_waste'  : round(elec_waste,  1),
        'water_waste' : round(water_waste, 1),
        'rmse_elec'   : round(np.sqrt(mean_squared_error(actual_e, pred_e)), 4),
        'rmse_water'  : round(np.sqrt(mean_squared_error(actual_w, pred_w)), 4),
    }

df_results = pd.DataFrame(results).T.reset_index()
df_results.rename(columns={'index':'house_id'}, inplace=True)
df_results = df_results.sort_values('green_score', ascending=False).reset_index(drop=True)

print("GreenScore computed!")
print(df_results[['house_id','green_score','elec_score','water_score']].head(10))

df_results.to_csv('greenfed_results.csv', index=False)
global_model_e.save('global_model_electricity.h5')
global_model_w.save('global_model_water.h5')

with open('results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\nAll saved!")
print("greenfed_results.csv")
print("global_model_electricity.h5")
print("global_model_water.h5")
print("results.json")
print("\nDONE! Move to Phase 3 - Flask API")
