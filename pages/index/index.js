const LEDDevice = require('./devices/led-device.js')
const RGBDevice = require('./devices/rgb-device.js')
const WifiConfig = require('./devices/wifi-config.js')

Page({
  data: {
    debugInfo: '应用已启动',
    deviceName: '',
    isScanning: false,
    deviceId: '',
    serviceId: '',
    characteristicId: '',
    powerCharacteristicId: '',
    colorCharacteristicId: '',
    modeCharacteristicId: '',
    statusCharacteristicId: '',
    // BLE配网相关
    wifiConfigServiceId: '',
    ssidCharacteristicId: '',
    passwordCharacteristicId: '',
    wifiStatusCharacteristicId: '',
    wifiConfigEnabled: false,
    ssid: '',
    password: '',
    switchValue: 0,
    switchEnabled: false,
    // 设备类型选择
    deviceType: 'LED灯',
    deviceTypeIndex: 0,
    deviceTypes: ['LED灯', 'RGB灯', '蓝牙配网'],
    // RGB灯相关
    color: '255,255,255',
    mode: 0,
    modes: [
      { id: 0, name: '关闭模式' },
      { id: 1, name: '呼吸灯' },
      { id: 2, name: '阅读暖光' },
      { id: 3, name: '影院蓝光' },
      { id: 4, name: '晚安渐变' }
    ]
  },

  onLoad() {
    this.addDebugInfo('页面加载完成')
  },

  onDeviceNameInput(e) {
    this.setData({
      deviceName: e.detail.value
    })
  },

  onDeviceTypeChange(e) {
    const index = parseInt(e.detail.value)
    const deviceType = this.data.deviceTypes[index]
    this.setData({
      deviceTypeIndex: index,
      deviceType: deviceType,
      // 重置相关状态
      wifiConfigEnabled: false
    })
  },

  onColorInput(e) {
    this.setData({
      color: e.detail.value
    })
  },

  onSSIDInput(e) {
    this.setData({
      ssid: e.detail.value
    })
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  onModeChange(e) {
    const mode = parseInt(e.detail.value)
    this.setData({ mode: mode })
    if (this.data.deviceType !== 'RGB灯') return
    this.addDebugInfo('模式已切换为：' + (mode === 0 ? '关闭' : this.data.modes[mode].name))
    RGBDevice.writeModeToBLE(this, mode)
  },

  onWifiConfigConfirm() {
    const ssid = this.data.ssid.trim()
    const password = this.data.password.trim()

    if (!ssid || !password) {
      this.addDebugInfo('请填写完整的WiFi信息（SSID和密码）')
      return
    }

    if (this.data.deviceType !== '蓝牙配网') {
      this.addDebugInfo('请将设备类型设置为"蓝牙配网"')
      return
    }

    this.addDebugInfo('开始发送WiFi配置...')
    this.addDebugInfo('SSID: ' + ssid)
    WifiConfig.writeSSIDToBLE(this, ssid)
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

    // 先清理之前的蓝牙监听器，避免重复触发
    try {
      wx.offBluetoothDeviceFound()
    } catch (e) {
      // 忽略可能的错误
    }

    wx.closeBluetoothAdapter({
      fail: function() {
        // 关闭失败可能是 already closed，继续下一步
      }
    })

    // 等待 200ms 再重新初始化蓝牙适配器
    setTimeout(function() {
      that.initBluetooth()
    }, 200)
  },

  initBluetooth() {
    const that = this
    wx.openBluetoothAdapter({
      success() {
        that.addDebugInfo('蓝牙适配器已打开，开始扫描...')

        wx.onBluetoothDeviceFound(function (res) {
          res.devices.forEach(function (device) {
            const name = device.name || device.localName || '未知设备'
            const targetName = that.data.deviceName.trim()

            // 精确匹配设备名称
            if (name === targetName) {
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
        that.addDebugInfo('设备连接成功，延迟200ms后获取服务...')
        setTimeout(function() {
          that.getServices()
        }, 200)
      },
      fail(err) {
        that.addDebugInfo('设备连接失败：' + err.errMsg)
      }
    })
  },

  getServices() {
    const that = this
    const deviceType = that.data.deviceType
    that.addDebugInfo('获取服务列表...')
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success(res) {
        that.addDebugInfo('获取服务列表成功，共' + res.services.length + '个服务')
        // 直接使用第一个主服务，信任用户选择的设备类型
        for (let i = 0; i < res.services.length; i++) {
          const service = res.services[i]
          if (service.isPrimary) {
            const serviceId = service.uuid
            that.setData({ serviceId: serviceId })
            that.addDebugInfo('设置服务 serviceId=' + serviceId + ' (设备类型: ' + deviceType + ')')
            that.getCharacteristics(serviceId)
            return
          }
        }
        that.addDebugInfo('未找到主服务')
      },
      fail(err) {
        that.addDebugInfo('获取服务列表失败：' + err.errMsg)
      }
    })
  },

  getCharacteristics(serviceId) {
    const that = this
    const deviceType = that.data.deviceType

    that.setData({ serviceId: serviceId })

    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId: serviceId,
      success(res) {
        that.addDebugInfo('获取特征值成功，根据用户选择处理设备类型：' + deviceType)

        if (deviceType === '蓝牙配网') {
          WifiConfig.checkWifiConfigService(res.characteristics, serviceId, that.setData.bind(that), that.addDebugInfo.bind(that))
        } else if (deviceType === 'RGB灯') {
          RGBDevice.setupRGBCharacteristics(res.characteristics, serviceId, that.setData.bind(that), that.addDebugInfo.bind(that))
        } else {
          LEDDevice.setupLEDCharacteristics(res.characteristics, serviceId, that.setData.bind(that), that.addDebugInfo.bind(that))
        }
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
        // 清理蓝牙监听器
        wx.offBluetoothDeviceFound()
        that.setData({
          isScanning: false,
          deviceId: '',
          serviceId: '',
          characteristicId: '',
          powerCharacteristicId: '',
          colorCharacteristicId: '',
          modeCharacteristicId: '',
          statusCharacteristicId: '',
          wifiConfigServiceId: '',
          ssidCharacteristicId: '',
          passwordCharacteristicId: '',
          wifiStatusCharacteristicId: '',
          wifiConfigEnabled: false,
          switchEnabled: false
        })
      }
    })
  },

  onSwitchToggle() {
    const that = this
    if (!this.data.switchEnabled) {
      that.addDebugInfo('请先扫描并连接设备')
      return
    }

    that.addDebugInfo('开关切换：当前=' + that.data.switchValue)
    const newValue = that.data.switchValue === 0 ? 1 : 0
    that.setData({ switchValue: newValue })
    that.addDebugInfo('开关切换：新值=' + newValue)

    // 根据用户选择的设备类型执行不同操作
    if (that.data.deviceType === 'RGB灯') {
      that.addDebugInfo('执行RGB灯开关控制')
      RGBDevice.writePowerToBLE(that, newValue)
    } else if (that.data.deviceType === 'LED灯') {
      that.addDebugInfo('执行LED灯开关控制')
      LEDDevice.writeLEDPower(that, newValue)
    }
  },

  onColorConfirm() {
    const that = this
    if (!that.data.switchEnabled) {
      that.addDebugInfo('请先扫描并连接设备')
      return
    }
    if (that.data.deviceType !== 'RGB灯') {
      that.addDebugInfo('当前设备不是RGB灯')
      return
    }
    that.addDebugInfo('onColorConfirm 触发')
    RGBDevice.writeColorToBLE(that)
  },

  onWifiDisconnect() {
    const that = this
    that.addDebugInfo('断开设备连接...')
    wx.closeBLEConnection({
      deviceId: this.data.deviceId,
      success(res) {
        that.addDebugInfo('设备已断开连接')
        // 重置所有状态
        that.setData({
          serviceId: '',
          characteristicId: '',
          powerCharacteristicId: '',
          colorCharacteristicId: '',
          modeCharacteristicId: '',
          statusCharacteristicId: '',
          wifiConfigServiceId: '',
          ssidCharacteristicId: '',
          passwordCharacteristicId: '',
          wifiStatusCharacteristicId: '',
          wifiConfigEnabled: false,
          switchEnabled: false
        })
      },
      fail(err) {
        that.addDebugInfo('断开连接失败：' + err.errMsg)
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
