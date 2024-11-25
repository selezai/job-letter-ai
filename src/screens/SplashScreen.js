import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function SplashScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>JobLetterAI</Text>
      <Text style={styles.tagline}>Your job-winning letter, crafted with AI</Text>
      <Button
        title="Get Started"
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
    backgroundColor: '#00274D',
  },
  logo: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
});

export default SplashScreen; 