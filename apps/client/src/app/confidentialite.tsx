import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { PageTitle } from "@/components/common";
export default function Privacy() {
  return (
    <View className="max-w-2xl gap-6">
      <PageTitle
        title="Vos données sur Reverb"
        description="Information pour la version de développement locale · 13 octobre 2026"
      />
      <Text>
        Reverb est un projet personnel en développement. Cette version
        fonctionne sur votre ordinateur. Elle ne constitue pas encore un service
        ouvert au public.
      </Text>
      <Text variant="h3">Ce qui est enregistré</Text>
      <Text>
        L’adresse email sert à la connexion et à la récupération du compte. Le
        profil, les notes, les critiques, le statut « déjà écouté », le journal
        et la liste « À écouter » sont conservés dans la base locale. Les mots
        de passe sont gérés par Supabase Auth. Aucun outil publicitaire ou de
        mesure d’audience n’est installé.
      </Text>
      <Text variant="h3">Ce qui est visible</Text>
      <Text>
        Un profil public, ses notes et ses critiques sont lisibles par les
        visiteurs disposant de son lien. Un profil privé est visible uniquement
        par son auteur. La liste « À écouter », le statut « déjà écouté », le
        journal et l’adresse email ne font pas partie du profil public.
      </Text>
      <Text variant="h3">Catalogue et pochettes</Text>
      <Text>
        Les recherches sont transmises à MusicBrainz par le serveur et
        conservées en cache pendant 24 heures. Les métadonnées des albums et
        morceaux consultables restent dans le catalogue pour préserver votre
        bibliothèque. Les pochettes sont chargées depuis Cover Art Archive et
        ses hébergeurs : ils reçoivent votre adresse IP lors du chargement. Leur
        disponibilité et leurs droits sont indépendants de Reverb.
      </Text>
      <Text variant="h3">Votre session</Text>
      <Text>
        Le navigateur conserve la session pour vous éviter de vous reconnecter à
        chaque visite. Le choix du thème est également enregistré localement.
        Les emails de test sont capturés dans la boîte mail locale et ne sont
        pas envoyés à l’extérieur.
      </Text>
      <Text variant="h3">Export et suppression</Text>
      <Text>
        Les réglages permettent d’exporter les données et de supprimer le
        compte. La suppression efface les données actives ; les sauvegardes
        éventuelles ont leur propre durée de conservation. Ne renseignez pas de
        données sensibles pendant les essais locaux.
      </Text>
      <Text variant="h3">Avant l’ouverture aux testeurs</Text>
      <Text>
        Cette notice sera complétée avec le responsable du traitement, le
        contact de support, les bases légales, les durées de conservation, les
        prestataires réellement retenus et les modalités d’exercice des droits.
        Ces informations et les conditions d’utilisation doivent être finalisées
        avant tout déploiement.
      </Text>
    </View>
  );
}
