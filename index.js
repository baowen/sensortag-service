var io = require('socket.io')();
var SensorTag = require('sensortag');
var Sensor = require('./sensor');
var logger = require('./logger');

var sensors = [];
var sensorTagId = "b3a9b66814634faeae29d1c95faca152"

function updateSensors(target) {
  target.emit('UPDATE_SENSORS', sensors.map(sensor => sensor.getId()));
}
function updateButton(target, sensor) {
  target.emit('BUTTON_PRESS', sensor.getId());
}
function updateAccelerometerChange(target, sensor, x, y, z) {

  let maxacc = x + y + z;
  let car_acc = (maxacc - 1) * 9.8;

  console.log('acceleration : ' + car_acc);

  target.emit('ACCELEROMETER_CHANGE', {
    sensorId: sensor.getId(),
    car_acc
  });
}
function updateTemperatureChange(target, sensor, objectTemp, ambientTemp) {
  target.emit('TEMPERATURE_CHANGE', {
    sensorId: sensor.getId(),
    objectTemp,
    ambientTemp,
  });
}
function updateHumidityChange(target, sensor, temp, humidity) {
  target.emit('HUMIDITY_CHANGE', {
    sensorId: sensor.getId(),
    temp,
    humidity,
  });
}
function updateGyroscopeChange(target, sensor, x, y, z) {
  target.emit('GYROSCOPE_CHANGE', {
    sensorId: sensor.getId(),
    x,
    y,
    z
  });
}
function updateMagnetometerChange(target, sensor, x, y, z) {
  target.emit('MAGNETOMETER_CHANGE', {
    sensorId: sensor.getId(),
    x,
    y,
    z
  });
}

//sensorTagId = b3a9b66814634faeae29d1c95faca152
function onDiscover(sensorTag) {
  console.log('onDiscover:', sensorTag.uuid);
  sensorTag.connectAndSetUp(function() {
    logger.info('on connectAndSetUp:  ' + sensorTag.uuid);
    var sensor = new Sensor(sensorTag);
    sensors.push(sensor);
    updateSensors(io);

    sensor.start();
    sensor.on('accelerometerChange', (x, y, z) => {
  //    logger.debug('accelerometerChange', x, y, z);
      updateAccelerometerChange(io, sensor, x, y, z);
    });
    sensor.on('irTemperatureChange', (objectTemp, ambientTemp) => {
      //console.log('irTemperatureChange:' + objectTemp + " " + ambientTemp);
      updateTemperatureChange(io, sensor, objectTemp, ambientTemp);
    });
    sensor.on('humidityChange', (temperature, humidity) => {
      //console.log('irTemperatureChange:' + objectTemp + " " + ambientTemp);
      updateHumidityChange(io, sensor, temperature, humidity);
    });
    sensor.on('magnetometerChange', (x, y, z) => {
  //    logger.debug('magnetometerChange', x, y, z);
      updateMagnetometerChange(io, sensor, x, y, z);
    });
    sensor.on('gyroscopeChange', (x, y, z) => {
  //    console.log('gyroscopeChange:' + x + " " + y + " " + z)
      updateGyroscopeChange(io, sensor, x, y, z);
    });
    sensor.on('buttonPress', () => {
      logger.debug('buttonPress');
      updateButton(io, sensor);
    });
  });
}
//Accelerometer - x: 0.19, y: -0.12, z:0.78
//Gyroscope - x: -2.91, y: -6.54, z: 2.37

SensorTag.discoverById(sensorTagId, onDiscover);

io.on('connection', socket => {
  logger.info('Socket client connected');
  socket.emit('test', 'foo');
  updateSensors(socket);
  socket.on('test-send', (msg) => {
    logger.info('Socket ping', msg);
    socket.emit('ping', msg)
  });
});

io.listen(3000);
