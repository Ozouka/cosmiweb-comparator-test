import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";

interface Field {
  key: string;
  label: string;
  enabled: boolean;
  order: number;
}

interface Config {
  fields: Field[];
  maxProducts: number;
}

const DEFAULT_CONFIG: Config = {
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
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query getComparatorConfig {
        currentAppInstallation {
          id
          metafield(namespace: "cosmiweb", key: "comparator_config") {
            value
          }
        }
      }
    `
  );

  const data = await response.json();
  const installation = data.data?.currentAppInstallation;
  const metafieldValue = installation?.metafield?.value;

  let config = DEFAULT_CONFIG;
  if (metafieldValue) {
    try {
      config = JSON.parse(metafieldValue);
    } catch {
      // Use default
    }
  }

  return { config, appInstallationId: installation?.id || "" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const configJson = formData.get("config") as string;

  if (!configJson) {
    return { error: "No config provided" };
  }

  const idResponse = await admin.graphql(
    `#graphql
      query getAppInstallationId {
        currentAppInstallation { id }
      }
    `
  );
  const idData = await idResponse.json();
  const ownerId = idData.data?.currentAppInstallation?.id;

  const response = await admin.graphql(
    `#graphql
      mutation setComparatorConfig($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: "cosmiweb",
            key: "comparator_config",
            type: "json",
            value: configJson,
          },
        ],
      },
    }
  );

  const result = await response.json();
  const errors = result.data?.metafieldsSet?.userErrors;

  if (errors && errors.length > 0) {
    return { error: errors[0].message };
  }

  return { success: true };
};

export default function ConfigPage() {
  const { config } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [fields, setFields] = useState<Field[]>(
    [...config.fields].sort((a, b) => a.order - b.order)
  );
  const [saved, setSaved] = useState(false);

  const handleToggle = useCallback((key: string) => {
    setSaved(false);
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSaved(false);
    setFields((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setFields((prev) => {
      if (index >= prev.length - 1) return prev;
      setSaved(false);
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }, []);

  const handleSave = useCallback(() => {
    const configToSave: Config = {
      fields: fields.map((f, i) => ({ ...f, order: i })),
      maxProducts: 4,
    };

    const formData = new FormData();
    formData.set("config", JSON.stringify(configToSave));
    submit(formData, { method: "post" });
    setSaved(true);
  }, [fields, submit]);

  return (
    <s-page heading="Configuration du comparateur">
      <s-section heading="Champs du comparateur">
        <s-paragraph>
          Activez ou désactivez les champs affichés dans le tableau de comparaison.
          Réordonnez-les avec les flèches.
        </s-paragraph>
        <s-box>
          <s-divider />
          {fields.map((field, index) => (
            <div key={field.key}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        background: "white",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                        opacity: index === 0 ? 0.3 : 1,
                        fontSize: "11px",
                        padding: "2px 6px",
                        lineHeight: 1,
                      }}
                      aria-label={`Monter ${field.label}`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === fields.length - 1}
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        background: "white",
                        cursor: index === fields.length - 1 ? "not-allowed" : "pointer",
                        opacity: index === fields.length - 1 ? 0.3 : 1,
                        fontSize: "11px",
                        padding: "2px 6px",
                        lineHeight: 1,
                      }}
                      aria-label={`Descendre ${field.label}`}
                    >
                      ▼
                    </button>
                  </div>
                  <span style={{ fontWeight: 500, fontSize: "14px" }}>{field.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={() => handleToggle(field.key)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  aria-label={`Activer ${field.label}`}
                />
              </div>
              <s-divider />
            </div>
          ))}
        </s-box>
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <s-button variant="primary" onClick={handleSave} disabled={isSubmitting || undefined}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </s-button>
          {saved && !isSubmitting && (
            <span style={{ color: "#008060", fontSize: "14px" }}>
              Configuration sauvegardée
            </span>
          )}
        </div>
      </s-section>
    </s-page>
  );
}
