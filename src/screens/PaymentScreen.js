import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

function PaymentScreen({ navigation }) {
  const handlePayment = async () => {
    try {
      const response = await fetch('http://localhost:3000/initialize-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }) // Replace with actual user email
      });
      const data = await response.json();
      window.location.href = data.url; // Redirect to Paystack
    } catch (error) {
      console.error('Payment initialization failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Download Your Letter for R4.99</Text>
      <Button
        title="Confirm Payment"
        onPress={handlePayment}
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

export default PaymentScreen; 