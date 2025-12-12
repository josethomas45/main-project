import { useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <>
      <Text>Welcome!</Text>
      <TouchableOpacity onPress={logout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </>
  );
}
