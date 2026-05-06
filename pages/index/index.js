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
    isRGBDevice: false,
    // 设备类型选择
    deviceType: 'LED灯',
    deviceTypeIndex: 0,
    deviceTypes: ['LED灯', 'RGB灯'],
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
      deviceType: deviceType
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
    if (!this.data.isRGBDevice) return
    this.addDebugInfo('模式已切换为：' + (mode === 0 ? '关闭' : this.data.modes[mode].name))
    this.writeModeToBLE(mode)
  },

  onWifiConfigConfirm() {
    const that = this
    const ssid = that.data.ssid.trim()
    const password = that.data.password.trim()

    if (!ssid || !password) {
      that.addDebugInfo('请填写完整的WiFi信息（SSID和密码）')
      return
    }

    if (!that.data.wifiConfigEnabled) {
      that.addDebugInfo('未找到BLE配网服务')
      return
    }

    that.addDebugInfo('开始发送WiFi配置...')
    that.addDebugInfo('SSID: ' + ssid)
    that.writeSSIDToBLE(ssid)
  },

  writeSSIDToBLE(ssid) {
    const that = this
    const ssidCharId = that.data.ssidCharacteristicId
    that.addDebugInfo('writeSSIDToBLE: characteristicId=' + ssidCharId + ', ssid=' + ssid)

    if (!ssidCharId) {
      that.addDebugInfo('错误：ssidCharacteristicId 未设置')
      return
    }

    const buffer = new ArrayBuffer(ssid.length)
    const view = new DataView(buffer)

    for (let i = 0; i < ssid.length; i++) {
      view.setUint8(i, ssid.charCodeAt(i))
    }

    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: that.data.wifiConfigServiceId,
      characteristicId: ssidCharId,
      value: buffer,
      success(res) {
        that.addDebugInfo('SSID已发送，等待输入密码...')
        // 写入SSID成功后，立即写入密码
        setTimeout(function() {
          that.writePasswordToBLE(that.data.password)
        }, 300)
      },
      fail(err) {
        that.addDebugInfo('SSID写入失败：' + err.errMsg)
      }
    })
  },

  writePasswordToBLE(password) {
    const that = this
    const passwordCharId = that.data.passwordCharacteristicId
    that.addDebugInfo('writePasswordToBLE: characteristicId=' + passwordCharId + ', password=' + password)

    if (!passwordCharId) {
      that.addDebugInfo('错误：passwordCharacteristicId 未设置')
      return
    }

    const buffer = new ArrayBuffer(password.length)
    const view = new DataView(buffer)

    for (let i = 0; i < password.length; i++) {
      view.setUint8(i, password.charCodeAt(i))
    }

    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: that.data.wifiConfigServiceId,
      characteristicId: passwordCharId,
      value: buffer,
      success(res) {
        that.addDebugInfo('WiFi配置已发送！设备将尝试连接...')
      },
      fail(err) {
        that.addDebugInfo('密码写入失败：' + err.errMsg)
      }
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
    that.addDebugInfo('获取服务列表...')
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success(res) {
        that.addDebugInfo('获取服务列表成功，共' + res.services.length + '个服务')
        for (let i = 0; i < res.services.length; i++) {
          const service = res.services[i]
          const serviceUuid = service.uuid.toLowerCase()
          that.addDebugInfo('服务 ' + i + ': ' + service.uuid + ', isPrimary=' + service.isPrimary)

          // 优先检测BLE配网服务
          if (service.isPrimary && serviceUuid.startsWith('12340000')) {
            that.setData({ serviceId: service.uuid })
            that.addDebugInfo('设置配网服务 serviceId=' + service.uuid)
            that.getCharacteristics(service.uuid)
            return
          }

          // 检测其他服务
          if (service.isPrimary && (serviceUuid === '20000000-e8f2-537e-4f6c-d104768a1214' || serviceUuid.startsWith('20000000'))) {
            that.setData({ serviceId: service.uuid })
            that.addDebugInfo('设置服务 serviceId=' + service.uuid)
            that.getCharacteristics(service.uuid)
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
        const serviceUuid = serviceId.toLowerCase()

        // 检查是否为BLE配网服务 (UUID前缀匹配)
        if (serviceUuid.startsWith('12340000')) {
          that.addDebugInfo('检测到BLE配网服务')
          that.checkWifiConfigService(res.characteristics)
        } else if (serviceUuid === '20000000-e8f2-537e-4f6c-d104768a1214') {
          that.addDebugInfo('检测到RGB灯服务')
          that.setupRGBCharacteristics(res.characteristics)
        } else {
          // 默认LED灯服务
          that.addDebugInfo('检测到LED灯服务')
          that.setupLEDCharacteristics(res.characteristics)
        }
      },
      fail(err) {
        that.addDebugInfo('获取特征值失败：' + err.errMsg)
      }
    })
  },

  setupLEDCharacteristics(characteristics) {
    const serviceId = this.data.serviceId
    this.setData({ isRGBDevice: false, deviceTypeIndex: 0, deviceType: 'LED灯' })
    this.addDebugInfo('setupLEDCharacteristics, serviceId=' + serviceId)
    for (let i = 0; i < characteristics.length; i++) {
      const char = characteristics[i]
      if (char.properties.write) {
        this.setData({
          characteristicId: char.uuid,
          switchEnabled: true
        })
        this.addDebugInfo('找到LED灯可写属性：' + char.uuid)
        this.addDebugInfo('扫描完成，可以使用开关按钮')
        this.setData({ isScanning: false })
        wx.offBluetoothDeviceFound()
        wx.stopBluetoothDevicesDiscovery()
        return
      }
    }
    this.addDebugInfo('未找到LED灯可写属性')
  },

  setupRGBCharacteristics(characteristics) {
    this.setData({ isRGBDevice: true, deviceTypeIndex: 1, deviceType: 'RGB灯' })
    this.addDebugInfo('setupRGBCharacteristics 开始')
    let powerChar, colorChar, modeChar, statusChar

    for (let i = 0; i < characteristics.length; i++) {
      const char = characteristics[i]
      const uuid = char.uuid.toLowerCase()

      this.addDebugInfo('特征 UUID: ' + uuid)

      if (uuid === '20000001-e8f2-537e-4f6c-d104768a1214') {
        powerChar = char
        this.addDebugInfo('找到总开关特征：' + char.uuid)
      } else if (uuid === '20000002-e8f2-537e-4f6c-d104768a1214') {
        colorChar = char
        this.addDebugInfo('找到颜色控制特征：' + char.uuid)
      } else if (uuid === '20000003-e8f2-537e-4f6c-d104768a1214') {
        modeChar = char
        this.addDebugInfo('找到模式控制特征：' + char.uuid)
      } else if (uuid === '20000004-e8f2-537e-4f6c-d104768a1214') {
        statusChar = char
        this.addDebugInfo('找到状态反馈特征：' + char.uuid)
      }
    }

    this.addDebugInfo('RGB灯检测完成: power=' + !!powerChar + ', color=' + !!colorChar)

    if (powerChar && colorChar) {
      const serviceId = this.data.serviceId
      this.setData({
        powerCharacteristicId: powerChar.uuid,
        colorCharacteristicId: colorChar.uuid,
        modeCharacteristicId: modeChar ? modeChar.uuid : '',
        statusCharacteristicId: statusChar ? statusChar.uuid : '',
        switchEnabled: true
      })
      this.addDebugInfo('扫描完成，可以使用RGB控制功能')
      this.setData({ isScanning: false })
      wx.offBluetoothDeviceFound()
      wx.stopBluetoothDevicesDiscovery()
    } else {
      this.addDebugInfo('未找到RGB灯必需的特征')
    }
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

    // 根据设备类型执行不同操作
    if (that.data.isRGBDevice) {
      that.addDebugInfo('执行RGB灯开关控制')
      that.writePowerToBLE(newValue)
    } else {
      that.addDebugInfo('执行LED灯开关控制')
      that.writeLEDPower(newValue)
    }
  },

  writeLEDPower(value) {
    const that = this
    const array = new ArrayBuffer(1)
    const dataView = new DataView(array)
    dataView.setUint8(0, value)

    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: array,
      success() {
        that.addDebugInfo('写入' + value + '成功')
      },
      fail(err) {
        that.addDebugInfo('写入失败：' + err.errMsg)
      }
    })
  },

  writePowerToBLE(value) {
    const that = this
    const powerCharId = that.data.powerCharacteristicId
    that.addDebugInfo('writePowerToBLE: characteristicId=' + powerCharId + ', value=' + value)

    if (!powerCharId) {
      that.addDebugInfo('错误：powerCharacteristicId 未设置')
      return
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
  },

  writeColorToBLE() {
    const that = this
    const color = that.data.color.trim()
    const colorCharId = that.data.colorCharacteristicId
    that.addDebugInfo('writeColorToBLE: characteristicId=' + colorCharId + ', color=' + color)

    if (!colorCharId) {
      that.addDebugInfo('错误：colorCharacteristicId 未设置')
      return
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
  },

  writeModeToBLE(mode) {
    const that = this
    const modeCharId = that.data.modeCharacteristicId
    that.addDebugInfo('writeModeToBLE: characteristicId=' + modeCharId + ', mode=' + mode)

    if (!modeCharId) {
      that.addDebugInfo('错误：modeCharacteristicId 未设置')
      return
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
  },

  checkWifiConfigService(characteristics) {
    const that = this
    let ssidChar, passwordChar, statusChar

    for (let i = 0; i < characteristics.length; i++) {
      const char = characteristics[i]
      const uuid = char.uuid.toLowerCase()

      this.addDebugInfo('配网特征 UUID: ' + uuid)

      if (uuid === '12340001-9a8b-4c5d-8e7f-1a2b3c4d5e6f') {
        ssidChar = char
        this.addDebugInfo('找到SSID特征：' + char.uuid)
      } else if (uuid === '12340002-9a8b-4c5d-8e7f-1a2b3c4d5e6f') {
        passwordChar = char
        this.addDebugInfo('找到密码特征：' + char.uuid)
      } else if (uuid === '12340003-9a8b-4c5d-8e7f-1a2b3c4d5e6f') {
        statusChar = char
        this.addDebugInfo('找到状态特征：' + char.uuid)
      }
    }

    if (ssidChar && passwordChar) {
      const serviceId = this.data.serviceId
      this.setData({
        wifiConfigServiceId: serviceId,
        ssidCharacteristicId: ssidChar.uuid,
        passwordCharacteristicId: passwordChar.uuid,
        wifiStatusCharacteristicId: statusChar ? statusChar.uuid : '',
        wifiConfigEnabled: true,
        switchEnabled: true,
        isRGBDevice: false,
        deviceType: 'LED灯',
        deviceTypeIndex: 0
      })
      this.addDebugInfo('BLE配网服务检测完成，可以进行WiFi配置')
      this.setData({ isScanning: false })
      wx.offBluetoothDeviceFound()
      wx.stopBluetoothDevicesDiscovery()
    } else {
      this.addDebugInfo('未找到BLE配网必需的特征')
    }
  },

  addDebugInfo(info) {
    const time = new Date().toLocaleTimeString()
    this.setData({
      debugInfo: this.data.debugInfo + '\n[' + time + '] ' + info
    })
  },

  onColorConfirm() {
    const that = this
    if (!that.data.switchEnabled) {
      that.addDebugInfo('请先扫描并连接设备')
      return
    }
    if (!that.data.isRGBDevice) {
      that.addDebugInfo('当前设备不是RGB灯')
      return
    }
    that.addDebugInfo('onColorConfirm 触发')
    that.writeColorToBLE()
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
          switchEnabled: false,
          isRGBDevice: false,
          deviceType: 'LED灯',
          deviceTypeIndex: 0
        })
      },
      fail(err) {
        that.addDebugInfo('断开连接失败：' + err.errMsg)
      }
    })
  }
})
