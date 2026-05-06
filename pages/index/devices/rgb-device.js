// RGB灯设备处理模块
function setupRGBCharacteristics(characteristics, serviceId, setData, addDebugInfo) {
  const result = {
    success: false
  }
  
  addDebugInfo('setupRGBCharacteristics 开始')
  let powerChar, colorChar, modeChar, statusChar

  // 直接信任用户选择，不检查 UUID
  for (let i = 0; i < characteristics.length; i++) {
    const char = characteristics[i]
    addDebugInfo('特征 UUID: ' + char.uuid)

    if (!powerChar && char.properties.write) {
      powerChar = char
      addDebugInfo('找到总开关特征：' + char.uuid)
    } else if (!colorChar && char.properties.write) {
      colorChar = char
      addDebugInfo('找到颜色控制特征：' + char.uuid)
    } else if (!modeChar && char.properties.write) {
      modeChar = char
      addDebugInfo('找到模式控制特征：' + char.uuid)
    } else if (!statusChar && (char.properties.read || char.properties.notify)) {
      statusChar = char
      addDebugInfo('找到状态反馈特征：' + char.uuid)
    }
  }

  addDebugInfo('RGB灯检测完成，power=' + !!powerChar + ', color=' + !!colorChar)

  if (powerChar && colorChar) {
    result.success = true
    result.powerCharacteristicId = powerChar.uuid
    result.colorCharacteristicId = colorChar.uuid
    result.modeCharacteristicId = modeChar ? modeChar.uuid : ''
    result.statusCharacteristicId = statusChar ? statusChar.uuid : ''
    result.switchEnabled = true
    
    setData(result)
    addDebugInfo('扫描完成，可以使用RGB控制功能')
    return result
  } else {
    addDebugInfo('未找到RGB灯必需的特征（需要power和color特征）')
    result.switchEnabled = false
    return result
  }
}

function writePowerToBLE(app, value) {
  const that = app
  const powerCharId = that.data.powerCharacteristicId
  that.addDebugInfo('writePowerToBLE: characteristicId=' + powerCharId + ', value=' + value)

  if (!powerCharId) {
    that.addDebugInfo('错误：powerCharacteristicId 未设置')
    return false
  }

  const array = new ArrayBuffer(1)
  const dataView = new DataView(array)
  dataView.setUint8(0, value)

  wx.writeBLECharacteristicValue({
    deviceId: that.data.deviceId,
    serviceId: that.data.serviceId,
    characteristicId: powerCharId,
    value: array,
    success(res) {
      that.addDebugInfo('总开关已' + (value === 1 ? '打开' : '关闭'))
    },
    fail(err) {
      that.addDebugInfo('开关写入失败：' + err.errMsg)
    }
  })
  return true
}

function writeColorToBLE(app) {
  const that = app
  const color = that.data.color.trim()
  const colorCharId = that.data.colorCharacteristicId
  that.addDebugInfo('writeColorToBLE: characteristicId=' + colorCharId + ', color=' + color)

  if (!colorCharId) {
    that.addDebugInfo('错误：colorCharacteristicId 未设置')
    return false
  }

  const buffer = new ArrayBuffer(color.length)
  const view = new DataView(buffer)

  for (let i = 0; i < color.length; i++) {
    view.setUint8(i, color.charCodeAt(i))
  }

  wx.writeBLECharacteristicValue({
    deviceId: that.data.deviceId,
    serviceId: that.data.serviceId,
    characteristicId: colorCharId,
    value: buffer,
    success(res) {
      that.addDebugInfo('颜色已设置：' + color)
    },
    fail(err) {
      that.addDebugInfo('颜色写入失败：' + err.errMsg)
    }
  })
  return true
}

function writeModeToBLE(app, mode) {
  const that = app
  const modeCharId = that.data.modeCharacteristicId
  that.addDebugInfo('writeModeToBLE: characteristicId=' + modeCharId + ', mode=' + mode)

  if (!modeCharId) {
    that.addDebugInfo('错误：modeCharacteristicId 未设置')
    return false
  }

  const array = new ArrayBuffer(1)
  const dataView = new DataView(array)
  dataView.setUint8(0, mode)

  wx.writeBLECharacteristicValue({
    deviceId: that.data.deviceId,
    serviceId: that.data.serviceId,
    characteristicId: modeCharId,
    value: array,
    success(res) {
      that.addDebugInfo('模式已设置：' + mode)
    },
    fail(err) {
      that.addDebugInfo('模式写入失败：' + err.errMsg)
    }
  })
  return true
}

module.exports = {
  setupRGBCharacteristics,
  writePowerToBLE,
  writeColorToBLE,
  writeModeToBLE
}
