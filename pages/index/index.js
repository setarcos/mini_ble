Page({
  data: {
    debugInfo: '应用已启动',
    deviceName: '',
    isScanning: false,
    deviceId: '',
    serviceId: '',
    characteristicId: '',
    switchValue: 0,
    switchEnabled: false
  },

  onLoad() {
    this.addDebugInfo('页面加载完成')
  },

  onDeviceNameInput(e) {
    this.setData({
      deviceName: e.detail.value
    })
  },

  onScanBLE() {
    const deviceName = this.data.deviceName.trim()
    if (!deviceName) {
      this.addDebugInfo('请先输入设备名称')
      return
    }

    if (this.data.isScanning) {
      this.stopScanBLE()
    } else {
      this.startScanBLE()
    }
  },

  startScanBLE() {
    const that = this
    that.setData({ isScanning: true, deviceId: '', serviceId: '', characteristicId: '', switchEnabled: false })

    wx.openBluetoothAdapter({
      success() {
        that.addDebugInfo('蓝牙适配器已打开，开始扫描...')

        wx.onBluetoothDeviceFound(function (res) {
          res.devices.forEach(function (device) {
            const name = device.name || device.localName || '未知设备'
            const targetName = that.data.deviceName.trim()

            if (name.indexOf(targetName) !== -1) {
              that.addDebugInfo('发现设备：' + name + ' [' + device.deviceId + '] RSSI: ' + device.RSSI)
              that.connectToDevice(device.deviceId, name)
            }
          })
        })

        wx.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: false,
          success() {
            that.addDebugInfo('扫描已启动')
          },
          fail(err) {
            that.addDebugInfo('扫描启动失败：' + err.errMsg)
            that.setData({ isScanning: false })
          }
        })
      },
      fail(err) {
        that.addDebugInfo('蓝牙适配器打开失败：' + err.errMsg)
        that.setData({ isScanning: false })
      }
    })
  },

  connectToDevice(deviceId, deviceName) {
    const that = this
    that.addDebugInfo('正在连接设备...')

    wx.createBLEConnection({
      deviceId: deviceId,
      success() {
        that.setData({ deviceId: deviceId })
        that.addDebugInfo('设备连接成功')
        that.getServices()
      },
      fail(err) {
        that.addDebugInfo('设备连接失败：' + err.errMsg)
      }
    })
  },

  getServices() {
    const that = this
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success(res) {
        that.addDebugInfo('获取服务列表成功')
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            that.getCharacteristics(res.services[i].uuid)
            return
          }
        }
      },
      fail(err) {
        that.addDebugInfo('获取服务列表失败：' + err.errMsg)
      }
    })
  },

  getCharacteristics(serviceId) {
    const that = this
    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId: serviceId,
      success(res) {
        that.addDebugInfo('获取特征值成功')
        for (let i = 0; i < res.characteristics.length; i++) {
          const char = res.characteristics[i]
          if (char.properties.write) {
            that.setData({
              serviceId: serviceId,
              characteristicId: char.uuid,
              switchEnabled: true
            })
            that.addDebugInfo('找到可写属性：' + char.uuid)
            that.addDebugInfo('扫描完成，可以使用开关按钮')
            that.setData({ isScanning: false })
            wx.offBluetoothDeviceFound()
            wx.stopBluetoothDevicesDiscovery()
            return
          }
        }
        that.addDebugInfo('未找到可写属性')
      },
      fail(err) {
        that.addDebugInfo('获取特征值失败：' + err.errMsg)
      }
    })
  },

  stopScanBLE() {
    const that = this
    wx.stopBluetoothDevicesDiscovery({
      success() {
        that.addDebugInfo('扫描已停止')
        that.setData({ isScanning: false })
      }
    })
  },

  onSwitchToggle() {
    const that = this
    if (!this.data.switchEnabled) {
      that.addDebugInfo('请先扫描并连接设备')
      return
    }

    const newValue = this.data.switchValue === 0 ? 1 : 0
    that.setData({ switchValue: newValue })

    const array = new ArrayBuffer(1)
    const dataView = new DataView(array)
    dataView.setUint8(0, newValue)

    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: array,
      success() {
        that.addDebugInfo('写入' + newValue + '成功')
      },
      fail(err) {
        that.addDebugInfo('写入失败：' + err.errMsg)
      }
    })
  },

  addDebugInfo(info) {
    const time = new Date().toLocaleTimeString()
    this.setData({
      debugInfo: this.data.debugInfo + '\n[' + time + '] ' + info
    })
  }
})
