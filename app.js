const svr = require('fastify')({ logger: false })
const path = require('path')
// Set up the HTTP server
svr.register(require('@fastify/static'), { root: path.join(__dirname, 'public') })
// Bring in socket.io
svr.register(require('fastify-socket.io'))
const bme280 = require('bme280')
const { Gpio } = require('onoff') // Include onoff to interact with the GPIO
const fs = require('fs')
const configFile = './configSettings.json'
const objConfig = require('./configSettings.json')
// Enable, output, initially high so all gpio are OFF when starting this app
const gpioHeat = new Gpio(17, 'high')
const gpioExhaust = new Gpio(27, 'high')
const gpioLight = new Gpio(22, 'high')
const gpioDoor = new Gpio(23, 'high')
// set to be on when gpio input circuit is closed (i.e photocell relay is closed)
const gpioPhoto = new Gpio(25, 'in', 'both', { debounceTimeout: 10, activeLow: true })
const off = 1
const on = 0
// These variables are modified in various functions
let clientCnt = 0
let current24hTime
let countDown = false
let msPhotocellStartTime
let msPhotocellEndTime

// Functions
const currentTime = () => {
  // Get the current time and format to hh:mm
  const currentDateTime = new Date(Date.now())
  return currentDateTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
}

function updateConfigFile () {
  console.log(`Writing changes to config file: ${configFile}`)
  fs.writeFile(configFile, JSON.stringify(objConfig, null, 4), (err) => {
    if (err) console.log('Error writing config file:', err)
  })
}

// This will provide index.html when a client connects
svr.get('/', function (req, reply) {
  console.log('Sending index.html')
  reply.sendFile('index.html')
})

function gpioStatus (gpioItem, gpioType) {
  if (gpioItem.readSync() === on) {
    if (gpioType === 'OpenClose') {
      return 'OPEN'
    } else {
      return 'ON'
    }
  } else {
    if (gpioType === 'OpenClose') {
      return 'CLOSED'
    } else {
      return 'OFF'
    }
  }
}

function getPhotocellEndTime () {
  let hours = 0
  switch (objConfig._lightDurationIdx) {
    case 0:
      hours = 0
      break
    case 1:
      hours = msPhotocellStartTime + (14 * 3600000)
      break
    case 2:
      hours = msPhotocellStartTime + (14 * 3600000)
      break
    case 3:
      hours = msPhotocellStartTime + (14 * 3600000)
      break
    default:
      hours = 0
  }
  return hours
}

function refreshPageData () {
  // Send status to client only if there is a client connected.
  if (clientCnt > 0) {
    // Let's update the current time
    objConfig._svrTime = currentTime()
    // Monitor the gpio status
    objConfig._heatRelayTxt = gpioStatus(gpioHeat, 'OnOff')
    objConfig._exhaustRelayTxt = gpioStatus(gpioExhaust, 'OnOff')
    objConfig._doorRelayTxt = gpioStatus(gpioDoor, 'OpenClose')
    objConfig._lightRelayTxt = gpioStatus(gpioLight, 'OnOff')
    objConfig._photocellTxt = gpioStatus(gpioPhoto, 'OnOff')
    // push the data to the html page
    svr.io.sockets.emit('refreshPageData', objConfig)
  }
}

async function heatController () {
  // console.log(`_heatMode: ${objConfig._heatMode} -- _heatRelayTxt: ${objConfig._heatRelayTxt}  -- gpioHeat.readSync(): ${gpioHeat.readSync()}`)
  // Only run if mode = Auto
  if (objConfig._heatMode === 'Auto') {
    if (objConfig._degF < objConfig._heatSetPnt) {
      // Console.log('Turning Relay ON');
      if (gpioHeat.readSync() === off) {
        gpioHeat.writeSync(on) // Turn relay on
      }
      objConfig._heatRelayTxt = 'ON'
    }

    if (objConfig._degF > (objConfig._heatSetPnt + 1)) {
      // Console.log('Turning Relay OFF');
      if (gpioHeat.readSync() === on) {
        gpioHeat.writeSync(off) // Turn relay off
      }
      objConfig._heatRelayTxt = 'OFF'
    }
  } else {
    // Only run if mode = Manual
    if (objConfig._heatRelayTxt === 'ON') {
      if (gpioHeat.readSync() === off) {
        gpioHeat.writeSync(on) // Turn relay on
      }
    } else {
      if (gpioHeat.readSync() === on) {
        gpioHeat.writeSync(off) // Turn relay off
      }
    }
  }
  // console.log(`HEAT -- DegF: ${objConfig._degF} -- SetPnt: ${objConfig._heatSetPnt} -- Mode: ${objConfig._heatMode} -- Relay: ${objConfig._heatRelayTxt} -- Gpio: ${gpioHeat.readSync()}`)
}

async function exhaustController () {
  // Only run if mode = Auto
  if (objConfig._exhaustMode === 'Auto') {
    if (objConfig._degF > objConfig._exhaustSetPnt) {
      // Console.log('Turning Relay ON');
      if (gpioExhaust.readSync() === off) {
        gpioExhaust.writeSync(on) // Turn relay on
      }
      objConfig._exhaustRelayTxt = 'ON'
    }

    if (objConfig._degF < (objConfig._exhaustSetPnt - 1)) {
      // Console.log('Turning Relay OFF');
      if (gpioExhaust.readSync() === on) {
        gpioExhaust.writeSync(off) // Turn relay off
      }
      objConfig._exhaustRelayTxt = 'OFF'
    }
  } else {
    if (objConfig._exhaustRelayTxt === 'ON') {
      if (gpioExhaust.readSync() === off) {
        gpioExhaust.writeSync(on) // Turn relay on
      }
    } else {
      if (gpioExhaust.readSync() === on) {
        gpioExhaust.writeSync(off) // Turn relay off
      }
    }
  }
  // console.log(`EXHAUST -- DegF: ${objConfig._degF} -- SetPnt: ${objConfig._exhaustSetPnt} -- Mode: ${objConfig._exhaustMode} -- Relay: ${objConfig._exhaustRelayTxt} -- Gpio: ${gpioExhaust.readSync()}`)
}

async function doorController () {
  // Only run if mode = Auto
  if (objConfig._doorMode === 'Auto') {
    current24hTime = currentTime()

    // Check if photo relay is on
    if (gpioPhoto.readSync() === on) {
      if (current24hTime >= objConfig._doorDelayTime) {
        // Now we can open the door
        // If relay is off lets turn it on
        if (gpioDoor.readSync() === off) {
          gpioDoor.writeSync(on) // Turn relay on
          // console.log(`Open Door - ${current24hTime} is >= to ${doorDelayTime}`)
        }
        objConfig._doorRelayTxt = 'OPEN'
      } else {
        // Photocell is off. Now we can close the door
        // If relay is on lets turn it off
        if (gpioDoor.readSync() === on) {
          gpioDoor.writeSync(off) // Turn relay off
          // console.log('Close Door')
        }
        objConfig._doorRelayTxt = 'CLOSED'
      }
    } else {
      // Photocell is off. Now we can close the door
      // If relay is on lets turn it off
      if (gpioDoor.readSync() === on) {
        gpioDoor.writeSync(off) // Turn relay off
        // console.log('Close Door')
      }
      objConfig._doorRelayTxt = 'CLOSED'
    }
  } else {
    if (objConfig._doorRelayTxt === 'OPEN') {
      if (gpioDoor.readSync() === off) {
        gpioDoor.writeSync(on) // Turn relay on
      }
    } else {
      if (gpioDoor.readSync() === on) {
        gpioDoor.writeSync(off) // Turn relay off
      }
    }
  }
  // console.log(`DOOR -- Photocell: ${objConfig._PhotocellTxt} -- Del Time: ${objConfig._doorDelayTime} -- Cur Time: ${objConfig._svrTime} -- Door is: ${objConfig._doorRelayTxt} -- Gpio: ${gpioDoor.readSync()}`)
}
async function lightController () {
  // Lets start the countdown at sunrise if countDown === false
  if (gpioPhoto.readSync() === on && countDown === false) {
    countDown = true // Let's enable the flag
    // Lets store the current time
    const curDate = new Date()
    const curTime = curDate.getTime()
    msPhotocellStartTime = curTime // milliseconds
  }

  // _lightDurationIdx is 'DISABLED' we don't want any suplimental lighting.
  if (objConfig._lightDurationIdx === 0) { countDown = false }

  // Only run if mode = auto
  if (objConfig._lightMode === 'Auto' && countDown === true) {
    if (curTime < getPhotocellEndTime()) {
      if (gpioLight.readSync() === off) {
        gpioLight.writeSync(on) // Turn relay on
      }
      objConfig._lightRelayTxt = 'ON'
    } else {
      if (gpioLight.readSync() === on) {
        gpioLight.writeSync(off) // Turn relay off
      }
    }
    countDown = false
    objConfig._lightRelayTxt = 'OFF'
  } else {
    if (objConfig._lightRelayTxt === 'ON') {
      if (gpioLight.readSync() === off) {
        gpioLight.writeSync(on) // Turn relay on
      }
    } else {
      if (gpioLight.readSync() === on) {
        gpioLight.writeSync(off) // Turn relay off
      }
    }
  }
}

const runApplication = async _ => {
  const format = number => (Math.round(number * 100) / 100).toFixed(2)
  const delay = millis => new Promise(resolve => setTimeout(resolve, millis))

  while (true) {
    const sensor = await bme280.open({
      i2cBusNumber: 1,
      i2cAddress: 0x77,
      humidityOversampling: bme280.OVERSAMPLE.X1,
      pressureOversampling: bme280.OVERSAMPLE.X16,
      temperatureOversampling: bme280.OVERSAMPLE.X2,
      filterCoefficient: bme280.FILTER.F16
    })

    const reading = await sensor.read()
    objConfig._degC = format(reading.temperature)
    objConfig._degF = format((objConfig._degC * 1.8) + 32)
    objConfig._pctRH = format(reading.humidity)
    objConfig._inHg = format(reading.pressure * 0.02953)

    // console.log(objConfig._degC + ' degC ' + objConfig._degF + ' degF ' + objConfig._pctRH + '% RH ' + objConfig._inHg + ' inHg')

    await sensor.close()

    await delay(2000) // 1000 = 1 second
    await heatController()
    await exhaustController()
    await doorController()
    await lightController()
    refreshPageData()
  }
}

// we need to wait for the server to be ready, else `server.io` is undefined
svr.ready().then(() => {
  console.log('Server is ready!')

  // Whenever someone connects, this piece of code is executed
  svr.io.on('connection', (socket) => {
    clientCnt = svr.io.engine.clientsCount
    console.log(`Client count is ${clientCnt.toString()} -- Connected id: ${socket.id.toString()}`)

    // ##############################################################
    // client is connected so now we wait for socket emit from client
    // ##############################################################

    // #region Heat Control
    socket.on('heatSetPnt', (data) => {
      objConfig._heatSetPnt = data.toString()
    })

    socket.on('heatRelay', data => {
      objConfig._heatRelayTxt = data
    })

    socket.on('heatMode', data => {
      objConfig._heatMode = data
    })
    // #endregion

    // #region Exhaust Control
    socket.on('exhaustSetPnt', (data) => {
      objConfig._exhaustSetPnt = data.toString()
    })

    socket.on('exhaustRelay', data => {
      objConfig._exhaustRelayTxt = data
    })

    socket.on('exhaustMode', data => {
      objConfig._exhaustMode = data
    })
    // #endregion

    // #region Door Control
    socket.on('doorDelayTime', data => {
      objConfig._doorDelayTime = data
    })

    socket.on('doorRelay', data => {
      objConfig._doorRelayTxt = data
    })

    socket.on('doorMode', data => {
      objConfig._doorMode = data
    })
    // #endregion

    // #region Light Control
    socket.on('lightDurationIdx', data => {
      objConfig._lightDurationIdx = data
    })

    socket.on('lightRelay', data => {
      objConfig._lightRelayTxt = data
    })

    socket.on('lightMode', data => {
      objConfig._lightMode = data
    })
    // #endregion

    // Whenever someone disconnects, this piece of code is executed
    socket.on('disconnect', () => {
      clientCnt = svr.io.engine.clientsCount
      updateConfigFile()
      console.log(`Client count is ${clientCnt.toString()} -- Disconnected id: ${socket.id.toString()}`)
    })
  })
  // ################################
  // now we can run the control logic
  // ################################
  runApplication()
})

// Run the server!
svr.listen({ port: 3000, host: '10.10.1.107' }, (err, address) => {
  if (err) { console.log(err); throw err }
  console.log(`Server is now listening on ${address}`)
})
