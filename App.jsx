import React, {useState, useEffect} from 'react';
import {
  Text,
  View,
  StatusBar,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  NativeModules,
  useColorScheme,
  TouchableOpacity,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import Peripheral from './Peripheral.jsx';
import usePermissions from './hooks/usePermissions.js';

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const hasGrantedPermissions = usePermissions();

  const [devicesMap] = useState(new Map());

  const [isScanning, setIsScanning] = useState(false);
  const [isNotificable, setIsNotificable] = useState(false);
  const [isEspConnected, setIsEspConnected] = useState(false);
  const [bluetoothNotification, setBluetoothNotification] = useState('');

  const [bluetoothDevices, setBluetoothDevices] = useState([]);

  useEffect(() => {
    const stopListener = BleManagerEmitter.addListener(
      'BleManagerStopScan',
      () => {
        setIsScanning(false);
        console.log('Scan is stopped');
        handleGetConnectedDevices();
        handledScannedDevices();
      },
    );
    return () => stopListener.remove();
  }, []);

  const handledScannedDevices = async () => {
    const devices = await BleManager.getDiscoveredPeripherals([]);
    if (devices.length == 0) {
      console.log('No discovered bluetooth devices');
      return;
    }
    console.log('Discovered bluetooth devices', devices.length);
    devices.map(peripheral => {
      if (!peripheral.name) {
        peripheral.name = 'NO NAME';
      }
      devicesMap.set(peripheral.id, peripheral);
    });
    setBluetoothDevices(Array.from(devices.values()));
  };

  const handleGetConnectedDevices = async () => {
    const devices = await BleManager.getConnectedPeripherals([]);
    if (devices.length == 0) {
      console.log('No connected bluetooth devices');
      return;
    }
    devices.map(peripheral => {
      peripheral.connected = true;
      devicesMap.set(peripheral.id, peripheral);
    });

    setBluetoothDevices(Array.from(devicesMap.values()));
  };

  const connectToPeripheral = async peripheral => {
    try {
      if (peripheral.connected) {
        console.log('Disconnecting from peripheral');
        await BleManager.disconnect(peripheral.id);
        peripheral.connected = false;
        setIsEspConnected(false);
        alert(`Disconnected from ${peripheral.name}`);
        return;
      }
      console.log('Connecting to peripheral: ', peripheral);
      await BleManager.connect(peripheral.id);

      let peripheralResponse = devicesMap.get(peripheral.id);
      console.log('Peripheral response: ', peripheralResponse);
      if (peripheralResponse) {
        peripheralResponse.connected = true;
        devicesMap.set(peripheral.id, peripheralResponse);
        setIsEspConnected(true);
        setBluetoothDevices(Array.from(devicesMap.values()));
      }
      alert('Connected to ' + peripheral.name);

      /* Read current RSSI value */
      setTimeout(() => {
        BleManager.retrieveServices(peripheral.id).then(peripheralData => {
          // console.log('Peripheral services:', peripheralData);
        });
      }, 900);
    } catch (e) {
      console.log(e);
    }
  };

  // const retrieveServices = async peripheral => {
  //   const peripheralData = await BleManager.retrieveServices(peripheral.id);

  //   // console.log('------------------');
  //   // console.log('Peripheral services:', peripheralData);
  //   // console.log('------------------');
  //   setConnectedDevices(divices => {
  //     return divices.map(device => {
  //       if (device.id === peripheral.id) {
  //         device.services = peripheralData.services;
  //       }
  //       return device;
  //     });
  //   });
  // };

  // useEffect(() => {
  //   console.log(bluetoothDevices);
  // }, [bluetoothDevices]);

  useEffect(() => {
    // start bluetooth manager if permissions are granted
    (async () => {
      try {
        if (hasGrantedPermissions) {
          await BleManager.enableBluetooth();
          console.log('Bluetooth is turned on!');
          await BleManager.start({showAlert: false});
          console.log('Module initialized');
          // startScan();
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [hasGrantedPermissions]);

  const startScan = () => {
    console.log('Scanning...');
    if (!isScanning) {
      BleManager.scan([], 2, true)
        .then(data => {
          console.log('Scanning...');
          console.log(data);
          setIsScanning(true);
        })
        .catch(error => {
          console.error(error);
        });
    }
  };
  const bytesToString = buffer => {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  };

  const getNotification = async () => {
    console.log('getNotification');
    const connected = bluetoothDevices.find(device => device.connected);
    const peripheralData = await BleManager.retrieveServices(connected.id);
    const notificableCharacteristics = peripheralData.characteristics.find(
      characteristic => characteristic.properties.Notify,
    );
    console.log('notificableCharacteristics', notificableCharacteristics);

    await BleManager.startNotification(
      connected.id,
      notificableCharacteristics.service,
      notificableCharacteristics.characteristic,
    );
    BleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      ({value, peripheral, characteristic, service}) => {
        // Function to Convert bytes array to string

        const data = bytesToString(value);
        console.log(`Received ${value} for characteristic ${characteristic}`);
        setBluetoothNotification(data);
      },
    );
  };

  const removeNotification = async () => {
    console.log('removeNotification');
    const connected = bluetoothDevices.find(device => device.connected);
    const peripheralData = await BleManager.retrieveServices(connected.id);
    const notificableCharacteristics = peripheralData.characteristics.find(
      characteristic => characteristic.properties.Notify,
    );
    console.log('notificableCharacteristics', notificableCharacteristics);

    await BleManager.stopNotification(
      connected.id,
      notificableCharacteristics.service,
      notificableCharacteristics.characteristic,
    );
    BleManagerEmitter.removeListener(
      'BleManagerDidUpdateValueForCharacteristic',
    );
  };

  return (
    <SafeAreaView style={[backgroundStyle, styles.mainBody]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        style={{flex: 2}}
        contentContainerStyle={styles.mainBody}
        contentInsetAdjustmentBehavior="automatic">
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
            marginBottom: 40,
          }}>
          <View>
            <View>
              <Text
                style={{
                  fontSize: 30,
                  textAlign: 'center',
                  color: isDarkMode ? Colors.white : Colors.black,
                }}>
                React Native BLE Manager Tutorial
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.5}
              style={styles.buttonStyle}
              onPress={startScan}>
              <Text style={styles.buttonTextStyle}>
                {isScanning ? 'Scanning...' : 'Scan Bluetooth Devices'}
              </Text>
            </TouchableOpacity>
            {isEspConnected && (
              <View>
                <TouchableOpacity
                  activeOpacity={0.5}
                  style={styles.buttonStyle}
                  onPress={getNotification}>
                  <Text style={styles.buttonTextStyle}>Notificaciones</Text>
                </TouchableOpacity>
                <Text>Mensaje: {String(bluetoothNotification)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.list}>
          <Text
            style={{
              fontSize: 18,
              textAlign: 'left',
              color: isDarkMode ? Colors.white : Colors.black,
            }}>
            Lista de dispositivos escaneados ({bluetoothDevices.length})
          </Text>
          <ScrollView
            style={{
              flex: 1,
              flexGrow: 1,
              flexDirection: 'column',
              gap: 10,
            }}>
            {bluetoothDevices.map(device => (
              <Peripheral
                key={device.id}
                peripheral={device}
                connectToPeripheral={connectToPeripheral}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const windowHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  mainBody: {
    flex: 1,
    justifyContent: 'center',
    borderColor: 'green',
    borderWidth: 1,
    height: windowHeight,
  },
  buttonStyle: {
    backgroundColor: '#307ecc',
    borderWidth: 0,
    color: '#FFFFFF',
    borderColor: '#307ecc',
    height: 40,
    alignItems: 'center',
    borderRadius: 30,
    marginLeft: 35,
    marginRight: 35,
    marginTop: 15,
  },
  buttonTextStyle: {
    color: '#FFFFFF',
    paddingVertical: 10,
    fontSize: 16,
  },
  list: {
    backgroundColor: 'transparent',
    flex: 4,
    flexGrow: 1,
    gap: 4,
    width: '100%',
  },
});
export default App;
