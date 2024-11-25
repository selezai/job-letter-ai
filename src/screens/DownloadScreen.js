import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function DownloadScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your letter is ready!</Text>
      <Button
        title="Download"
        onPress={() => {}}
        color="#F9A825"
      />
      <Button
        title="Create another letter"
        onPress={() => navigation.navigate('Home')}
        color="#F9A825"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default DownloadScreen; 