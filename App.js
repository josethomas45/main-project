import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';


export default function App() {
return (
<View style={styles.container}>
<StatusBar style="auto" />
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
loginBtn: {
backgroundColor: '#007bff',
padding: 15,
borderRadius: 10,
alignItems: 'center',
marginTop: 10,
},
loginText: {
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