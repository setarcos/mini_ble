// LED灯设备处理模块
function setupLEDCharacteristics(characteristics, serviceId, setData, addDebugInfo) {
  const result = {
    success: false
  }
  
  addDebugInfo('setupLEDCharacteristics, serviceId=' + serviceId)
  
  // 直接信任用户选择，不检查 UUID
  for (let i = 0; i < characteristics.length; i++) {
    const char = characteristics[i]
    if (char.properties.write) {
      result.success = true
      result.characteristicId = char.uuid
      setData({
        characteristicId: char.uuid,
        switchEnabled: true
      })
      addDebugInfo('找到LED灯可写属性：' + char.uuid)
      addDebugInfo('扫描完成，可以使用开关按钮')
      return result
    }
  }
  
  addDebugInfo('未找到LED灯可写属性（需要写属性特征）')
  return result
}

function writeLEDPower(app, value) {
  const that = app
  const array = new ArrayBuffer(1)
  const dataView = new DataView(array)
  dataView.setUint8(0, value)

  wx.writeBLECharacteristicValue({
    deviceId: that.data.deviceId,
    serviceId: that.data.serviceId,
    characteristicId: that.data.characteristicId,
    value: array,
    success() {
      that.addDebugInfo('写入' + value + '成功')
    },
    fail(err) {
      that.addDebugInfo('写入失败：' + err.errMsg)
    }
  })
}

module.exports = {
  setupLEDCharacteristics,
  writeLEDPower
}
