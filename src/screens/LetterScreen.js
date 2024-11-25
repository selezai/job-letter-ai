import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function LetterScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generated Letter</Text>
      {/* Add Letter Preview and Edit functionality here */}
      <Button
        title="Proceed to Download"
        onPress={() => navigation.navigate('Payment')}
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

export default LetterScreen; 