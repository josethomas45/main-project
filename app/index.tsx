import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to login - _layout.jsx will handle auth routing
  return <Redirect href="/login" />;
}