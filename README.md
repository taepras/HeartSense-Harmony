# HeartSense: Harmony

Heart Sense: Harmony is an interactive experience in the Heart Sense series that utilizes sound and musical harmony to represent a person’s heartbeats and made apparent how their physiology interacts with other people in social interactions, in addition to Heart Sense’s argument about the nature of  incomplete and inaccurate representation of a person through data.


## How to use: Web Server

### Installation

1. Install [node.js](https://nodejs.org/)

2. With this repository cloned to your computer, download all dependencies for the server by opening command prompt or terminal on this project folder, then enter commands:

    ```
    cd heartsense_server
    npm install
    ```


3. Run the server from the `heartsense_server` folder with this command (or use [nodemon](https://www.npmjs.com/package/nodemon) for auto-reloading):

    ```
    node app.js
    ```


4. Open https://localhost:3000 in your browser for the main page (Note that this will only work when there is an arduino connected)


### File Structure

These are the main files and folders you will need to look at to edit the code.

- `/app.js` Main server file
- `/static/js` Folder containing browser-based JavaScript files
    - `/pulseSound.js` JavaScript class for a connection to an Arduino Heart Sense module
    - `/sketch.js` JavaScript class for drawing the screen 
- `/views` Folder containing web pages served by the server
    - `/index.html` Main page displaying heart rate for 4 participants
    - `/simulate.html` Sends simulated signal to the server for testing purposes. This page can be accessed at https://localhost:3000/simulate


## How to use: Arduino

### Setting up

1. For each arduino module, you will need:

    - 1 Adafruit Feather with ESP 8266
    - "Heart Sense" Shield OR
    - 1 Pulse Sensor Module
    - 1 60 Ohm or higher resistor.
    - 3 of any identical resistors.
    - 1 Li-Polymer Battery Pack
    - 1 LED
    - Jumper Wires

2. Follow the schematic diagram below to connect all the components.

![Heart Sense Module Schematic](/schematic.jpg)

3. Follow [this instructions](https://learn.adafruit.com/adafruit-feather-huzzah-esp8266/using-arduino-ide) to install Adafruit Feather to your Arduino IDE.

4. Install these libraries in Arduino using Library Manager

    - PulseSensor Playground
    - ESP8266Wifi
    - WebSocket
    - ArduinoJson
    - CapacitiveSensor

5. Open the arduino file in `heartsense_arduino_client` folder and change the configuration for Wifi Connection, IP Address, and Port in `HeartSenseWifiConfig.h`
    
    - It is recommended that the computer running the server turns on WiFi hotspot, and have the Arduinos connect to them.
    - Follow this instruction to turn on your computer's WiFi hotspots - ([Mac](https://www.imore.com/how-turn-your-macs-internet-connection-wifi-hotspot-internet-sharing), [Windows](https://support.microsoft.com/en-us/help/4027762/windows-use-your-pc-as-a-mobile-hotspot))
    - Once the WiFi hotspot is set up, change `WIFI_SSID` and `WIFI_PWD` in `HeartSenseWifiConfig.h` to your WiFi's name and password.
    - Find your `SERVER_IP` by following this instructions ([Mac](http://osxdaily.com/2010/11/21/find-ip-address-mac/), [Windows](https://support.microsoft.com/en-us/help/15291/windows-find-pc-ip-address)). Note that you will need to look that the connection that is called "Local Area Connection" or "Hotspot" or something along this line.

6. Upload the code to your Arduino, if all is working and the server is running, you should be able to see the data showing in your web server's ternimal. Open the main page by opening https://localhost:3000 in your browser.

