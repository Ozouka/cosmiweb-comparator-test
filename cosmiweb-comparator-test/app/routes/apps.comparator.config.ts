import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

const DEFAULT_CONFIG = {
  fields: [
    { key: "price", label: "Prix", enabled: true, order: 0 },
    { key: "description", label: "Description", enabled: true, order: 1 },
    { key: "variants", label: "Variantes", enabled: true, order: 2 },
    { key: "stock", label: "Disponibilité", enabled: true, order: 3 },
    { key: "weight", label: "Poids", enabled: false, order: 4 },
    { key: "metafield", label: "Metafield personnalisé", enabled: false, order: 5 },
  ],
  maxProducts: 4,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("[Comparator Config] Request received:", request.url);
  try {
    const { admin, session } = await authenticate.public.appProxy(request);

    console.log("[Comparator Config] session:", !!session, "admin:", !!admin);

    if (!session || !admin) {
      console.log("[Comparator Config] No session/admin, returning default");
      return Response.json(DEFAULT_CONFIG, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const response = await admin.graphql(
      `#graphql
        query getComparatorConfig {
          currentAppInstallation {
            metafield(namespace: "cosmiweb", key: "comparator_config") {
              value
            }
          }
        }
      `
    );

    const data = await response.json();
    const metafield = data.data?.currentAppInstallation?.metafield;

    console.log("[Comparator Config] metafield value:", metafield?.value);

    if (metafield?.value) {
      try {
        const config = JSON.parse(metafield.value);
        return Response.json(config, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      } catch {
        console.log("[Comparator Config] Invalid JSON in metafield");
      }
    }

    console.log("[Comparator Config] No metafield found, returning default");
    return Response.json(DEFAULT_CONFIG, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    console.error("[Comparator Config] Auth error:", err?.message || err?.status || err);
    if (err instanceof Response) {
      console.error("[Comparator Config] Response status:", err.status);
      const text = await err.text().catch(() => "");
      console.error("[Comparator Config] Response body:", text);
    }
    return Response.json(DEFAULT_CONFIG, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
};
