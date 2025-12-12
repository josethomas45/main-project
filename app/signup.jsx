import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account </Text>
      <Text style={styles.subtitle}>Join our platform</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#aaa"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.signupBtn}>
        <Text style={styles.signupText}>Sign Up</Text>
      </TouchableOpacity>

      <Text style={styles.bottomText}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: '#007bff' }}>Login</Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 35,
    color: '#666',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  signupBtn: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signupText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#444',
  },
});
