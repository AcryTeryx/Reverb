import { Link } from "expo-router";
import { View } from "react-native";
import { Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
export default function NotFound() {
  return (
    <View className="gap-5">
      <Empty
        title="Cette page est introuvable."
        detail="Revenez à votre bibliothèque pour poursuivre votre découverte."
      />
      <Link href="/" asChild>
        <Button>
          <Text>Retour à la bibliothèque</Text>
        </Button>
      </Link>
    </View>
  );
}
