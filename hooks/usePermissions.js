import {useEffect, useState} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';

const usePermissions = () => {
  const ask = Platform.OS === 'android' && Platform.Version >= 23;
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    try {
      (async () => {
        const results = [];
        if (ask) {
          results.push(
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            ),
          );
          results.push(
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ),
          );
          results.push(
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ),
          );
          results.push(
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ),
          );
        }
        const result = (await Promise.all(results)).every(
          r => r === PermissionsAndroid.RESULTS.GRANTED,
        );
        setAllowed(result);
      })();
    } catch (e) {
      console.log(e);
    }
  }, []);
  return allowed;
};

export default usePermissions;

//an async anonymus inmediately invoked function to get the bluetooth devices
