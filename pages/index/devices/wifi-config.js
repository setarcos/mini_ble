// BLE配网功能模块
function checkWifiConfigService(characteristics, serviceId, setData, addDebugInfo) {
  const result = {
    success: false
  }

  addDebugInfo('checkWifiConfigService 开始')
  let ssidChar, passwordChar, statusChar

  // 直接信任用户选择，不检查 UUID
  for (let i = 0; i < characteristics.length; i++) {
    const char = characteristics[i]
    addDebugInfo('配网特征 UUID: ' + char.uuid)

    if (!ssidChar && char.properties.write) {
      ssidChar = char
      addDebugInfo('找到SSID特征：' + char.uuid)
    } else if (!passwordChar && char.properties.write) {
      passwordChar = char
      addDebugInfo('找到密码特征：' + char.uuid)
    } else if (!statusChar && char.properties.read) {
      statusChar = char
      addDebugInfo('找到状态特征：' + char.uuid)
    }
  }

  if (ssidChar && passwordChar) {
    result.success = true
    result.wifiConfigServiceId = serviceId
    result.ssidCharacteristicId = ssidChar.uuid
    result.passwordCharacteristicId = passwordChar.uuid
    result.wifiStatusCharacteristicId = statusChar ? statusChar.uuid : ''
    result.wifiConfigEnabled = true
    result.switchEnabled = true
    
    setData(result)
    addDebugInfo('BLE配网服务检测完成，可以进行WiFi配置')
    return result
  } else {
    addDebugInfo('未找到BLE配网必需的特征（需要SSID和密码特征）')
    result.switchEnabled = false
    return result
  }
}

function writeSSIDToBLE(app, ssid) {
  const that = app
  that.addDebugInfo('writeSSIDToBLE: ssid=' + ssid)

  const buffer = new ArrayBuffer(ssid.length)
  const view = new DataView(buffer)

  for (let i = 0; i < ssid.length; i++) {
    view.setUint8(i, ssid.charCodeAt(i))
  }

  wx.writeBLECharacteristicValue({
    deviceId: that.data.deviceId,
    serviceId: that.data.wifiConfigServiceId,
    characteristicId: that.data.ssidCharacteristicId,
    value: buffer,
    success(res) {
      that.addDebugInfo('SSID已发送，等待输入密码...')
      // 写入SSID成功后，立即写入密码
      setTimeout(function() {
        writePasswordToBLE(that, that.data.password)
      }, 300)
    },
    fail(err) {
      that.addDebugInfo('SSID写入失败：' + err.errMsg)
    }
  })
  return true
}

function writePasswordToBLE(app, password) {
  const that = app
  that.addDebugInfo('writePasswordToBLE: password=' + password)

  const buffer = new ArrayBuffer(password.length)
  const view = new DataView(buffer)

  for (let i = 0; i < password.length; i++) {
    view.setUint8(i, password.charCodeAt(i))
  }

  wx.writeBLECharacteristicValue({
    deviceId: that.data.deviceId,
    serviceId: that.data.wifiConfigServiceId,
    characteristicId: that.data.passwordCharacteristicId,
    value: buffer,
    success(res) {
      that.addDebugInfo('WiFi配置已发送！设备将尝试连接...')
    },
    fail(err) {
      that.addDebugInfo('密码写入失败：' + err.errMsg)
    }
  })
  return true
}

module.exports = {
  checkWifiConfigService,
  writeSSIDToBLE,
  writePasswordToBLE
}
