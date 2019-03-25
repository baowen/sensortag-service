const EventEmitter = require('events');
const SensorTag = require('sensortag');
const MovingAverage = require('moving-average');
const logger = require('./logger');


const accelerometerPeriod = 200;
const accelerometerPrecision = 2;
const gyroscopePeriod = 500;
const gyroscopePrecision = 2;
const magnetometerPeriod = 200;
const magnetometerPrecision = 1;


const movingAverageTimeInterval = 2000;
const accelerometerUpdateMinInterval = 100;

var safeCallback = function(callback) {
  if (typeof callback == 'function') {
    callback()
  }
}

class Sensor extends EventEmitter {

  constructor(sensorTag){
    super();
    this.sensorTag = sensorTag; 
    this.hasAddedListeners = false;
    this.hasStarted = false;
    this.leftButtonPressed = false;
    this.rightButtonPressed = false;
    this.addListeners();
    this.accelerometerUpdateTimestamp=0;
    this.movingAverageX = MovingAverage(movingAverageTimeInterval)
    this.movingAverageY = MovingAverage(movingAverageTimeInterval)
    this.movingAverageZ = MovingAverage(movingAverageTimeInterval)

  }

  getId() {
    return this.sensorTag.uuid;
  }

  addListeners() {
    var _this = this;
    if (this.hasAddedListeners) {
      return;
    }
    this.hasAddedListeners = true;
    this.sensorTag.on('accelerometerChange', (x, y, z) => {
      var timestamp = Date.now();
      this.movingAverageX.push(timestamp, x);
      this.movingAverageY.push(timestamp, y);
      this.movingAverageZ.push(timestamp, z);
      // if (timestamp - this.accelerometerUpdateTimestamp > accelerometerUpdateMinInterval) {
        this.accelerometerUpdateTimestamp = timestamp;
        x = this.movingAverageX.movingAverage().toFixed(accelerometerPrecision);
        y = this.movingAverageY.movingAverage().toFixed(accelerometerPrecision);
        z = this.movingAverageZ.movingAverage().toFixed(accelerometerPrecision);
        logger.debug('Sensor - on accelerometerChange', x, y, z);
        _this.emit("accelerometerChange", x, y, z);
      // }
    });
    //Not sure if the moving average is the best calculation for the gyroscope - just temporarily used to to create gyro
    //listener following the same approach used for accelerometer
    this.sensorTag.on('gyroscopeChange', (x, y, z) => {
      //console.log('x: ' + x + ' y: ' + y + ' z: ' + z); 
        _this.emit("gyroscopeChange", x.toFixed(gyroscopePrecision), y.toFixed(gyroscopePrecision), z.toFixed(gyroscopePrecision));
      // }
    });
    this.sensorTag.on('magnetometerChange', (x, y, z) => {
      // console.log('\tx = %d μT', x.toFixed(1));
      // console.log('\ty = %d μT', y.toFixed(1));
      // console.log('\tz = %d μT', z.toFixed(1));
      _this.emit("magnetometerChange", x.toFixed(magnetometerPrecision), y.toFixed(magnetometerPrecision), z.toFixed(magnetometerPrecision));
    });

    this.sensorTag.on('irTemperatureChange', function(objectTemperature, ambientTemperature) {
      _this.emit("irTemperatureChange", objectTemperature.toFixed(1), ambientTemperature.toFixed(1));
    });

    this.sensorTag.on('humidityChange', function(temp, humidity) {
      //console.log('HumidityChange: temp: ' + temp.toFixed(1) + " humidity: " + humidity.toFixed(1));
      _this.emit("humidityChange", temp.toFixed(1), humidity.toFixed(1));
    });

    this.sensorTag.on('simpleKeyChange', function(left, right, reedRelay) {
      // console.log(this.id, this.uuid, left, right, reedRelay);
      logger.debug('Sensor - on simpleKeyChange');
      if (right) {
        _this.emit("buttonPress");
      }
    });
  }

  start(callback) {
    var _this = this;
    if (this.hasStarted) {
      return;
    }
    this.hasStarted = true;
    this.sensorTag.enableAccelerometer(function(error) {
      logger.debug('Sensor.start - set enableAccelerometer');
      if (error) {
        console.error(error);
      }
      _this.sensorTag.setAccelerometerPeriod(accelerometerPeriod, function(error) {
        logger.debug('Sensor.start - set accelerometerPeriod');
        if (error) {
          logger.error(error);
        }
        _this.sensorTag.notifyAccelerometer(function(error) {
          console.log('Sensor.start - set notifyAccelerometer');
          if (error) {
            logger.error(error);
          }
          safeCallback(callback);
        });
      });

      _this.sensorTag.notifySimpleKey(function(error){
        logger.debug('Sensor.start - set notifySimpleKey');
        if (error) {
          logger.error(error);
        }
      });
    });
    this.sensorTag.enableMagnetometer(function(error) {
      logger.debug('Sensor.start - set enableMagnetometer');
      if (error) {
        console.error(error);
      }
      _this.sensorTag.setMagnetometerPeriod(magnetometerPeriod, function(error) {
        logger.debug('Sensor.start - set magnetometerPeriod');
        if (error) {
          logger.error(error);
        }
        _this.sensorTag.notifyMagnetometer(function(error) {
          console.log('Sensor.start - set notifyMagnetometer');
          if (error) {
            logger.error(error);
          }
          safeCallback(callback);
        });
      });

      _this.sensorTag.notifySimpleKey(function(error){
        logger.debug('Sensor.start - set notifySimpleKey');
        if (error) {
          logger.error(error);
        }
      });
    });
    this.sensorTag.enableIrTemperature(function(error) {
      logger.debug('Sensor.start - set enableIrTemperature');
      if (error) {
        console.error(error);
      }
      console.log('setIrTemperaturePeriod');

      _this.sensorTag.setIrTemperaturePeriod(1000, function(error) {
        console.log('notifyIrTemperature');
        _this.sensorTag.notifyIrTemperature(function(error) {
          // setTimeout(function() {
          //   console.log('unnotifyIrTemperature');
          //   _this.sensorTag.unnotifyIrTemperature(callback);
          // }, 5000);
          logger.debug('Sensor.start - emitting temperature');
          if (error) {
            logger.error(error);
          }
        });
      });
    });

    this.sensorTag.enableHumidity(function(error) {
      logger.debug('Sensor.start - set enableHumidity');
      if (error) {
        console.error(error);
      }
      console.log('setHumidity');

      _this.sensorTag.setHumidityPeriod(1000, function(error) {
        console.log('notifyHumidity');
        _this.sensorTag.notifyHumidity(function(error) {
          // setTimeout(function() {
          //   console.log('unnotifyIrTemperature');
          //   _this.sensorTag.unnotifyIrTemperature(callback);
          // }, 5000);
          logger.debug('Sensor.start - emitting humidity');
          if (error) {
            logger.error(error);
          }
        });
      });
    });

    this.sensorTag.enableGyroscope(function(error) {
      logger.debug('Sensor.start - set enableGyroscope');
      if (error) {
        console.error(error);
      }
      _this.sensorTag.setGyroscopePeriod(gyroscopePeriod, function(error) {
        logger.debug('Sensor.start - set gyroscopePeriod');
        if (error) {
          logger.error(error);
        }
        _this.sensorTag.notifyGyroscope(function(error) {
          console.log('Sensor.start - set notifyGyroscope');
          if (error) {
            logger.error(error);
          }
          safeCallback(callback);
        });
      });
      _this.sensorTag.notifySimpleKey(function(error){
        logger.debug('Sensor.start - set notifySimpleKey');
        if (error) {
          logger.error(error);
        }
      });
    });
  }

  stop(callback) {
    this.sensorTag.unnotifyAccelerometer(safeCallback(callback));
  }

}


module.exports = Sensor;
