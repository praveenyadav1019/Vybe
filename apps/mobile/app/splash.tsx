import { Redirect } from 'expo-router';

// Legacy flat route — redirects to the new (auth) group splash
export default function SplashRedirect() {
  return <Redirect href="/(auth)/splash" />;
}
