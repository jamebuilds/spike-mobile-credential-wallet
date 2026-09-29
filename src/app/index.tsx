import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";

// "/" is the launch URL; send it to whichever side of the auth guard applies
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? "/profile" : "/login"} />;
}
