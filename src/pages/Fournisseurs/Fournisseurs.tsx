import PartenairePage from "@/components/partenaire/PartenairePage";
import { fournisseursApi } from "@/lib/api";

export function Fournisseurs() {
  return <PartenairePage api={fournisseursApi} kind="fournisseur" />;
}
