import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function UploadScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Your Documents</Text>
      <Button
        title="Choose your CV (PDF or Image)"
        onPress={() => {}}
        color="#F9A825"
      />
      <Button
        title="Choose the job requirements (PDF or Image)"
        onPress={() => {}}
        color="#F9A825"
      />
      <Button
        title="Next"
        onPress={() => navigation.navigate('Letter')}
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

export default UploadScreen; 