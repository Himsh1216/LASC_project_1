import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from tenmaDcLib import instantiate_tenma_class_from_device_response, TenmaException
from threading import Thread 

# Flask app setup
app = Flask(__name__)
CORS(app)

# Constants
SERIAL_PORT1 = '/dev/tty.usbmodem002F010F04521'  # Power supply for temperature control
SERIAL_PORT2 = '/dev/tty.usbmodem003A4D6204521'  # Power supply for light intensity control
RPI_HOST = "http://192.168.19.116:5000/temperature"  # Replace with the actual IP of the Raspberry Pi

# Initialize global variables
tenma_device1 = None
tenma_device2 = None
target_temperature = None
processing_profiles = False

# PID controller parameters
Kp = 2.0
Ki = 0.1
Kd = 0.11

previous_error = 0
integral = 0

# Profile Processing Function
def process_profiles(profiles):
    global target_temperature, processing_profiles, previous_error, integral

    try:
        processing_profiles = True
        print("Processing profiles...")

        # Turn on power supplies before processing
        if tenma_device1:
            tenma_device1.ON()
            print("Power supply 1 turned ON for temperature control.")
        if tenma_device2:
            tenma_device2.ON()
            print("Power supply 2 turned ON for light intensity control.")

        for profile in profiles:
            t2 = float(profile.get('t2'))
            stay_time = int(profile.get('stayTime', 0))
            light_intensity = float(profile.get('lightIntensity', 0))

            print(f"Target temperature: {t2}°C, Stay time: {stay_time} minutes, Light intensity: {light_intensity}%")
            target_temperature = t2
            time_at_target = 0

            while time_at_target < stay_time * 60:
                try:
                    response = requests.get(RPI_HOST, timeout=5)
                    response.raise_for_status()
                    temp_data = response.json()
                    current_temp = temp_data.get('sensor1', {}).get('temperature', None)
                    if current_temp is None:
                        raise ValueError("Temperature not found in response")
                except Exception as e:
                    print(f"Error fetching temperature: {str(e)}")
                    time.sleep(1)
                    continue

                # PID control
                error = t2 - current_temp
                integral += error
                derivative = error - previous_error
                control_current_mA = Kp * error + Ki * integral + Kd * derivative
                control_current_mA = max(0, min(int(control_current_mA), 2000))  # Clamp range
                previous_error = error

                try:
                    if tenma_device1:
                        tenma_device1.setCurrent(1, control_current_mA)
                except Exception as e:
                    print(f"Error with power supply 1: {str(e)}")

                try:
                    if tenma_device2:
                        light_current_mA = int((light_intensity / 100) * 2000)
                        tenma_device2.setCurrent(1, light_current_mA)
                except Exception as e:
                    print(f"Error with power supply 2: {str(e)}")

                if abs(current_temp - t2) <= 0.5:
                    time_at_target += 1
                time.sleep(1)

            print(f"Profile complete: {t2}°C for {stay_time} minutes")

        print("All profiles processed. Turning off power supplies.")
    except Exception as e:
        print(f"Exception in profile processing: {str(e)}")
    finally:
        if tenma_device1:
            tenma_device1.OFF()
        if tenma_device2:
            tenma_device2.OFF()
        processing_profiles = False

@app.route('/connect', methods=['POST'])
def connect():
    global tenma_device1, tenma_device2
    try:
        print(f"Connecting to power supplies on {SERIAL_PORT1} and {SERIAL_PORT2}...")
        tenma_device1 = instantiate_tenma_class_from_device_response(SERIAL_PORT1)
        tenma_device2 = instantiate_tenma_class_from_device_response(SERIAL_PORT2)
        return jsonify({"message": "Connected to power supplies"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/start_process', methods=['POST'])
def start_process():
    try:
        data = request.get_json()
        profiles = data.get('profiles', [])
        if not profiles:
            return jsonify({"error": "No profiles provided"}), 400

        Thread(target=process_profiles, args=(profiles,)).start()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_data', methods=['GET'])
def get_data():
    try:
        response = requests.get(RPI_HOST)
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch data from Raspberry Pi"}), 500

        temp_data = response.json()
        current_temp = temp_data.get('sensor1', {}).get('temperature', None)
        sensor2_data = temp_data.get('sensor2', {})

        if current_temp is None:
            return jsonify({"error": "Temperature data not received"}), 500

        current_running_current = tenma_device1.runningCurrent(1) if tenma_device1 else 0
        voltage_running_voltage = tenma_device1.runningVoltage(1) if tenma_device1 else 0

        return jsonify({
            'temperature': current_temp,
            'voltage': voltage_running_voltage,
            'current': current_running_current,
            'sensor2': sensor2_data
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get data: {str(e)}"}), 500

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5001)
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        if tenma_device1:
            tenma_device1.OFF()
        if tenma_device2:
            tenma_device2.OFF()
