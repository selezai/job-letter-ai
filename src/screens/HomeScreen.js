import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Job Letter</Text>
      <Button
        title="Upload CV"
        onPress={() => navigation.navigate('Upload')}
        color="#F9A825"
      />
      <Button
        title="Upload Job Requirements"
        onPress={() => navigation.navigate('Upload')}
        color="#F9A825"
      />
      {/* Add Recent Letters Section here */}
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

export default HomeScreen; 