Page({
  data: {
    debugInfo: '应用已启动',
    deviceName: '',
    isScanning: false
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
    if (this.data.isScanning) {
      this.stopScanBLE()
    } else {
      this.startScanBLE()
    }
  },

  startScanBLE() {
    const that = this
    wx.openBluetoothAdapter({
      success() {
        that.setData({ isScanning: true })
        that.addDebugInfo('蓝牙适配器已打开，开始扫描...')

        wx.onBluetoothDeviceFound(function (res) {
          res.devices.forEach(function (device) {
            const name = device.name || device.localName || '未知设备'
            const targetName = that.data.deviceName.trim()

            if (!targetName || name.indexOf(targetName) !== -1) {
              that.addDebugInfo('发现设备: ' + name + ' [' + device.deviceId + '] RSSI: ' + device.RSSI)
            }
          })
        })

        wx.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: false,
          success() {
            that.addDebugInfo('扫描已启动')
          },
          fail(err) {
            that.addDebugInfo('扫描启动失败: ' + err.errMsg)
            that.setData({ isScanning: false })
          }
        })
      },
      fail(err) {
        that.addDebugInfo('蓝牙适配器打开失败: ' + err.errMsg)
      }
    })
  },

  stopScanBLE() {
    const that = this
    wx.stopBluetoothDevicesDiscovery({
      success() {
        that.addDebugInfo('扫描已停止')
        that.setData({ isScanning: false })
        wx.closeBluetoothAdapter()
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