import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { me as companion } from "companion";
import { weather, TemperatureUnit } from "weather";

// Fetch the weather
function getWeather(unit) {
  const options = {
    temperatureUnit: unit == "C" ? TemperatureUnit.Celsius : TemperatureUnit.Fahrenheit
  }

  if (companion.permissions.granted("access_location")) {
    weather
      .getWeatherData(options)
      .then((data) => {
        if (data.locations.length) {
          const temp = Math.floor(data.locations[0].currentWeather.temperature);
          const cond = data.locations[0].currentWeather.weatherCondition;
          const calculatedWeather = {
            temperature: temp,
            conditions: cond
          }
          returnWeatherData(calculatedWeather)
        }
      })
      .catch((ex) => {
        console.error(ex);
      });
  }
}

// Send the weather data to the device
function returnWeatherData(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send a command to the device
    messaging.peerSocket.send(data);
  } else {
    console.log("Error: Connection is not open");
  }
}

// Listen for messages from the device
messaging.peerSocket.onmessage = function(evt) {
  if (evt.data && evt.data.command == "weather") {
    // The device requested weather data
    getWeather(evt.data.unit);
  }
}

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Companion Socket Open");
  restoreSettings();
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("Companion Socket Closed");
};

// A user changes settings
settingsStorage.onchange = evt => {
  let data = {
    key: evt.key,
    newValue: evt.newValue
  };
  sendVal(data);
};

// Restore any previously saved settings and send to the device
function restoreSettings() {
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    if (key) {
      let data = {
        key: key,
        newValue: settingsStorage.getItem(key)
      };
      sendVal(data);
    }
  }
}

// Send data to device using Messaging API
function sendVal(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  }
}
