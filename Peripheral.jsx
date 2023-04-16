import {View, Text, TouchableOpacity, useColorScheme} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';

const Peripheral = ({peripheral, connectToPeripheral}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const color = peripheral.connected ? 'green' : '#fff';
  const connected = peripheral.connected ? true : false;
  if (peripheral.services) console.log('TIENE SERVICIOS!!');

  return (
    <View>
      <TouchableOpacity onPress={() => connectToPeripheral(peripheral)}>
        <View
          style={{
            backgroundColor: color,
            borderRadius: 3,
            paddingVertical: 5,
            paddingHorizontal: 10,
          }}>
          <Text
            style={{
              fontSize: 18,
              textTransform: 'capitalize',
              color: connected ? Colors.white : Colors.black,
            }}>
            {peripheral.name}
          </Text>
          <View
            style={{
              backgroundColor: color,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: 14,
                color: connected ? Colors.white : Colors.black,
              }}>
              RSSI: {peripheral.rssi}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: connected ? Colors.white : Colors.black,
              }}>
              ID: {peripheral.id}
            </Text>
          </View>
          {peripheral.services && (
            <View>
              <Text>Servicios:</Text>
              <View>
                {peripheral.services.map((service, i) => (
                  <Text key={i}>{JSON.stringify(service)}</Text>
                ))}
                <Text>{JSON.stringify(peripheral, null, 2)}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default Peripheral;
