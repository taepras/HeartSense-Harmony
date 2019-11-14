#include "HeartSenseWifiConfig.h"

#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <ArduinoJson.h>

#include <WebSocketsClient.h>
#include <SocketIOclient.h>

#include <Hash.h>

#define USE_ARDUINO_INTERRUPTS false
#include <PulseSensorPlayground.h>

//#include <CapacitiveSensor.h>

ESP8266WiFiMulti WiFiMulti;
SocketIOclient socketIO;

#define USE_SERIAL Serial

const int OUTPUT_TYPE = SERIAL_PLOTTER;

const int PULSE_INPUT = A0;
const int PULSE_BLINK = LED_BUILTIN;
const int PULSE_FADE = 14;
const int THRESHOLD = 800;   // Adjust this number to avoid noise when idle

const int TOUCH_THRESH = 0;

const int WIFI_ATTEMPTS = -5;

const int SAMPLE_INTERVAL_FRAMES = 10;

int wifiConnectAttempted = 0;
bool isWifiConnected = false;
int framesUntilNextRead = SAMPLE_INTERVAL_FRAMES;
int timeLastReport = 0;
int timeLastBeat = 0;

bool hasReportedReset = false;

PulseSensorPlayground pulseSensor;
//CapacitiveSensor touchSense = CapacitiveSensor(12, 14);

void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case sIOtype_DISCONNECT:
            USE_SERIAL.printf("[IOc] Disconnected!\n");
            break;
        case sIOtype_CONNECT:
            USE_SERIAL.printf("[IOc] Connected to url: %s\n", payload);
            break;
        case sIOtype_EVENT:
            USE_SERIAL.printf("[IOc] get event: %s\n", payload);
            break;
        case sIOtype_ACK:
            USE_SERIAL.printf("[IOc] get ack: %u\n", length);
            hexdump(payload, length);
            break;
        case sIOtype_ERROR:
            USE_SERIAL.printf("[IOc] get error: %u\n", length);
            hexdump(payload, length);
            break;
        case sIOtype_BINARY_EVENT:
            USE_SERIAL.printf("[IOc] get binary: %u\n", length);
            hexdump(payload, length);
            break;
        case sIOtype_BINARY_ACK:
            USE_SERIAL.printf("[IOc] get binary ack: %u\n", length);
            hexdump(payload, length);
            break;
    }
}

void setup() {
    pinMode(LED_BUILTIN, OUTPUT);
    pinMode(PULSE_FADE, OUTPUT);
    
    // USE_SERIAL.begin(921600);
    USE_SERIAL.begin(115200);

    //Serial.setDebugOutput(true);
    USE_SERIAL.setDebugOutput(true);

    USE_SERIAL.println();
    USE_SERIAL.println();
    USE_SERIAL.println();

    for(uint8_t t = 4; t > 0; t--) {
        USE_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
        USE_SERIAL.flush();
        delay(1000);
    }

    // disable AP
//    WiFi.mode(WIFI_NONE_SLEEP);
    WiFi.setSleepMode(WIFI_NONE_SLEEP);
    if(WiFi.getMode() & WIFI_AP) {
        WiFi.softAPdisconnect(true);
    }

    WiFiMulti.addAP(WIFI_SSID, WIFI_PWD);

    //WiFi.disconnect();
    while(WiFiMulti.run() != WL_CONNECTED) {
        if (WIFI_ATTEMPTS > 0 && wifiConnectAttempted > WIFI_ATTEMPTS) {
          break;
        }
        wifiConnectAttempted++;
        USE_SERIAL.printf("[SETUP] Connecting WiFi... Attempt #%d\n", wifiConnectAttempted);
        digitalWrite(PULSE_FADE, HIGH);
        delay(100);
        digitalWrite(PULSE_FADE, LOW);
        delay(100);
    }

    if (WIFI_ATTEMPTS <= 0 || wifiConnectAttempted <= WIFI_ATTEMPTS) {
        String ip = WiFi.localIP().toString();
        USE_SERIAL.printf("[SETUP] WiFi Connected %s\n", ip.c_str());
        
        // server address, port and URL
        socketIO.begin(SERVER_IP, SERVER_PORT);
    
        // event handler
        socketIO.onEvent(socketIOEvent);
        isWifiConnected = true;
        for(int i = 0; i < 5; i++) {
            // Flash the led to show things didn't work.
            USE_SERIAL.printf("blinking\n");
            digitalWrite(PULSE_FADE, HIGH);
            delay(100);
            digitalWrite(PULSE_FADE, LOW);
            delay(100);
        }
    } else {
        USE_SERIAL.printf("WIFI NOT CONNECTED\n");
        isWifiConnected = false;

        for(int i = 0; i < 3; i++) {
            // Flash the led to show things didn't work.
            digitalWrite(PULSE_FADE, HIGH);
            delay(500);
            digitalWrite(PULSE_FADE, LOW);
            delay(500);
        }
    }

    // Configure the PulseSensor manager.
    pulseSensor.analogInput(PULSE_INPUT);
//    pulseSensor.blinkOnPulse(PULSE_BLINK);
    pulseSensor.fadeOnPulse(PULSE_FADE);
  
    pulseSensor.setSerial(Serial);
    pulseSensor.setOutputType(OUTPUT_TYPE);
    pulseSensor.setThreshold(THRESHOLD);

    // Now that everything is ready, start reading the PulseSensor signal.
    if (!pulseSensor.begin()) {
        for(;;) {
            // Flash the led to show things didn't work.
            digitalWrite(PULSE_FADE, HIGH);
            delay(50);
            digitalWrite(PULSE_FADE, LOW);
            delay(50);
        }
    }

//    touchSense.set_CS_AutocaL_Millis(0xFFFFFFFF);
    digitalWrite(LED_BUILTIN, LOW);
}

unsigned long messageTimestamp = 0;
void loop() {
//    long touchVal = touchSense.capacitiveSensor(30);
    
    socketIO.loop();

    framesUntilNextRead--;
    
    if (framesUntilNextRead <= 0) {
//        if (touchVal < TOUCH_THRESH)
//            return;
        framesUntilNextRead = SAMPLE_INTERVAL_FRAMES;
        if (pulseSensor.sawNewSample()) {
            
            int sample = pulseSensor.getLatestSample();
//            USE_SERIAL.println(sample);
//            pulseSensor.outputSample();
          
            if (sample <= 10) {
                if (!hasReportedReset) {
                    if (isWifiConnected) {
                        socketIO.sendEVENT("[\"pulse_reset\"]");
                    }
                    USE_SERIAL.println("pulse_reset");  
                    hasReportedReset = true;
                }
            }
          
            if (pulseSensor.sawStartOfBeat()) {
                hasReportedReset = false;

                DynamicJsonDocument doc(1024);
                JsonArray array = doc.to<JsonArray>();
                array.add("pulse"); // event name
                
                JsonObject param1 = array.createNestedObject();
                param1["bpm"] = pulseSensor.getBeatsPerMinute();
                param1["ibi"] = pulseSensor.getInterBeatIntervalMs();
                param1["ibi_calc"] = millis() - timeLastBeat;
                
                String output;
                serializeJson(doc, output);
                
                if (isWifiConnected) {
                    socketIO.sendEVENT(output);
                }
                
                USE_SERIAL.println(output);
    
                timeLastBeat = millis();
            }
        }
    }
}
