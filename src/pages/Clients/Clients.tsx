import PartenairePage from "@/components/partenaire/PartenairePage";
import { clientsApi } from "@/lib/api";

export function Clients() {
  return <PartenairePage api={clientsApi} kind="client" />;
}
