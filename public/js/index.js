const socket = io()
// const off = 1
// const on = 0

// Dash Board
const dBrdSvrTime = document.getElementById('dBrdSvrTime')
const dBrdDegF = document.getElementById('dBrdDegF')
const dBrdPctRH = document.getElementById('dBrdPctRH')
const dBrdPressure = document.getElementById('dBrdPressure')
const dBrdHeatSetPnt = document.getElementById('dBrdHeatSetPnt')
const dBrdHeatRelayTxt = document.getElementById('dBrdHeatRelayTxt')
const dBrdExhaustSetPnt = document.getElementById('dBrdExhaustSetPnt')
const dBrdExhaustRelayTxt = document.getElementById('dBrdExhaustRelayTxt')
const dBrdDoorDelayTime = document.getElementById('dBrdDoorDelayTime')
const dBrdDoorRelayTxt = document.getElementById('dBrdDoorRelayTxt')
const dBrdLightRelayTxt = document.getElementById('dBrdLightRelayTxt')
const dBrdLightDuration = document.getElementById('dBrdLightDuration')
const dBrdPhotocellTxt = document.getElementById('dBrdPhotocellTxt')

// Heat Control Card
const cardHeatRelayTxt = document.getElementById('cardHeatRelayTxt')
const cardHeatRelay = document.getElementById('cardHeatRelay')
const cardHeatSetPntSlider = document.getElementById('cardHeatSetPntSlider')
const cardHeatSetPnt = document.getElementById('cardHeatSetPnt')
const cardHeatModeAuto = document.getElementById('cardHeatModeAuto')
const cardHeatModeManual = document.getElementById('cardHeatModeManual')

// Exhaust Control
const cardExhaustRelayTxt = document.getElementById('cardExhaustRelayTxt')
const cardExhaustRelay = document.getElementById('cardExhaustRelay')
const cardExhaustSetPntSlider = document.getElementById('cardExhaustSetPntSlider')
const cardExhaustSetPnt = document.getElementById('cardExhaustSetPnt')
const cardExhaustModeAuto = document.getElementById('cardExhaustModeAuto')
const cardExhaustModeManual = document.getElementById('cardExhaustModeManual')

// Door Control
const cardDoorRelayTxt = document.getElementById('cardDoorRelayTxt')
const cardDoorDelayTime = document.getElementById('cardDoorDelayTime')
const cardDoorRelay = document.getElementById('cardDoorRelay')
const cardDoorModeAuto = document.getElementById('cardDoorModeAuto')
const cardDoorModeManual = document.getElementById('cardDoorModeManual')

// Light Control
const cardLightRelayTxt = document.getElementById('cardLightRelayTxt')
const cardLightDuration = document.getElementById('cardLightDuration')
const cardLightRelay = document.getElementById('cardLightRelay')
const cardLightModeAuto = document.getElementById('cardLightModeAuto')
const cardLightModeManual = document.getElementById('cardLightModeManual')

socket.on('refreshPageData', (data) => {
  // Dashboard
  dBrdSvrTime.innerHTML = data._svrTime
  dBrdPctRH.innerHTML = data._pctRH
  dBrdPressure.innerHTML = data._inHg
  dBrdDegF.innerHTML = data._degF
  dBrdHeatSetPnt.innerHTML = data._heatSetPnt
  dBrdHeatRelayTxt.innerHTML = data._heatRelayTxt + ' - ' + data._heatMode
  dBrdExhaustSetPnt.innerHTML = data._exhaustSetPnt
  dBrdExhaustRelayTxt.innerHTML = data._exhaustRelayTxt + ' - ' + data._exhaustMode
  dBrdDoorDelayTime.innerHTML = data._doorDelayTime
  dBrdDoorRelayTxt.innerHTML = data._doorRelayTxt + ' - ' + data._doorMode
  dBrdLightRelayTxt.innerHTML = data._lightRelayTxt + ' - ' + data._lightMode
  switch (data._lightDurationIdx) {
    case 0:
      dBrdLightDuration.innerHTML = 'DISABLED'
      break
    case 1:
      dBrdLightDuration.innerHTML = '14 hours'
      break
    case 2:
      dBrdLightDuration.innerHTML = '15 hours'
      break
    case 3:
      dBrdLightDuration.innerHTML = '16 hours'
      break
    default:
      dBrdLightDuration.innerHTML = 'DISABLED'
  }
  dBrdPhotocellTxt.innerHTML = data._photocellTxt
  // Heat Card
  cardHeatRelayTxt.innerHTML = data._heatRelayTxt
  cardHeatRelay.checked = data._heatRelayTxt === 'ON'
  cardHeatRelay.disabled = data._heatMode === 'Auto'
  cardHeatSetPntSlider.value = data._heatSetPnt
  cardHeatSetPntSlider.disabled = data._heatMode === 'Manual'
  cardHeatSetPnt.innerHTML = data._heatSetPnt
  cardHeatModeAuto.checked = data._heatMode === 'Auto'
  cardHeatModeManual.checked = data._heatMode === 'Manual'
  // Exhaust Card
  cardExhaustRelayTxt.innerHTML = data._exhaustRelayTxt
  cardExhaustRelay.checked = data._exhaustRelayTxt === 'ON'
  cardExhaustRelay.disabled = data._exhaustMode === 'Auto'
  cardExhaustSetPntSlider.value = data._exhaustSetPnt
  cardExhaustSetPntSlider.disabled = data._exhaustMode === 'Manual'
  cardExhaustSetPnt.innerHTML = data._exhaustSetPnt
  cardExhaustModeAuto.checked = data._exhaustMode === 'Auto'
  cardExhaustModeManual.checked = data._exhaustMode === 'Manual'
  // Door Card
  cardDoorRelayTxt.innerHTML = data._doorRelayTxt
  cardDoorRelay.checked = data._doorRelayTxt === 'OPEN'
  cardDoorRelay.disabled = data._doorMode === 'Auto'
  cardDoorDelayTime.value = data._doorDelayTime
  cardDoorDelayTime.disabled = data._doorMode === 'Manual'
  cardDoorModeAuto.checked = data._doorMode === 'Auto'
  cardDoorModeManual.checked = data._doorMode === 'Manual'
  // Light Card
  cardLightRelayTxt.innerHTML = data._lightRelayTxt
  cardLightRelay.checked = data._lightRelayTxt === 'ON'
  cardLightRelay.disabled = data._lightMode === 'Auto'
  cardLightDuration.selectedIndex = data._lightDurationIdx
  cardLightDuration.disabled = data._lightMode === 'Manual'
  cardLightModeAuto.checked = data._lightMode === 'Auto'
  cardLightModeManual.checked = data._lightMode === 'Manual'
})

window.addEventListener('load', () => {
  // #region Heat Control
  cardHeatSetPntSlider.oninput = () => {
    // This updates the DOM elements
    cardHeatSetPnt.innerHTML = cardHeatSetPntSlider.value
    dBrdHeatSetPnt.innerHTML = cardHeatSetPntSlider.value
  }

  cardHeatSetPntSlider.addEventListener('change', () => {
    //  This sends the set point back to the server
    socket.emit('heatSetPnt', cardHeatSetPntSlider.value)
  })

  cardHeatRelay.addEventListener('change', () => {
    let onOff = 'OFF'
    if (cardHeatRelay.checked) { onOff = 'ON' }
    socket.emit('heatRelay', onOff)
  })

  cardHeatModeAuto.addEventListener('change', () => {
    if (cardHeatModeAuto.checked) {
      // cardHeatRelay.disabled = true
      // cardHeatSetPntSlider.disabled = false
      socket.emit('heatMode', 'Auto')
    }
  })

  cardHeatModeManual.addEventListener('change', () => {
    if (cardHeatModeManual.checked) {
      // cardHeatRelay.disabled = false
      // cardHeatSetPntSlider.disabled = true
      socket.emit('heatMode', 'Manual')
    }
  })
  // #endregion

  // #region Exhaust Control
  cardExhaustSetPntSlider.oninput = () => {
    // This updates the DOM elements
    cardExhaustSetPnt.innerHTML = cardExhaustSetPntSlider.value
    dBrdExhaustSetPnt.innerHTML = cardExhaustSetPntSlider.value
  }

  cardExhaustSetPntSlider.addEventListener('change', () => {
    //  This sends the set point back to the server
    socket.emit('exhaustSetPnt', cardExhaustSetPntSlider.value)
  })

  cardExhaustRelay.addEventListener('change', () => {
    let onOff = 'OFF'
    if (cardExhaustRelay.checked) { onOff = 'ON' }
    socket.emit('exhaustRelay', onOff)
  })

  cardExhaustModeAuto.addEventListener('change', () => {
    if (cardExhaustModeAuto.checked) {
      socket.emit('exhaustMode', 'Auto')
    }
  })

  cardExhaustModeManual.addEventListener('change', () => {
    if (cardExhaustModeManual.checked) {
      socket.emit('exhaustMode', 'Manual')
    }
  })
  // #endregion

  // #region Door Control
  cardDoorDelayTime.addEventListener('change', () => {
    socket.emit('doorDelayTime', cardDoorDelayTime.value)
  })

  cardDoorRelay.addEventListener('change', () => {
    let onOff = 'CLOSED'
    if (cardDoorRelay.checked) { onOff = 'OPEN' }
    socket.emit('doorRelay', onOff)
  })

  cardDoorModeAuto.addEventListener('change', () => {
    if (cardDoorModeAuto.checked) {
      socket.emit('doorMode', 'Auto')
    }
  })

  cardDoorModeManual.addEventListener('change', () => {
    if (cardDoorModeManual.checked) {
      socket.emit('doorMode', 'Manual')
    }
  })
  // #endregion

  // #region Light Control
  cardLightDuration.addEventListener('change', () => {
    socket.emit('lightDurationIdx', cardLightDuration.selectedIndex)
  })

  cardLightRelay.addEventListener('change', () => {
    let onOff = 'OFF'
    if (cardLightRelay.checked) { onOff = 'ON' }
    socket.emit('lightRelay', onOff)
  })

  cardLightModeAuto.addEventListener('change', () => {
    if (cardLightModeAuto.checked) {
      socket.emit('lightMode', 'Auto')
    }
  })

  cardLightModeManual.addEventListener('change', () => {
    if (cardLightModeManual.checked) {
      socket.emit('lightMode', 'Manual')
    }
  })
  // #endregion
})
