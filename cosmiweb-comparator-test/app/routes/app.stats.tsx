import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stats = await prisma.comparisonStat.findMany({
    where: {
      shop: session.shop,
      lastComparedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { compareCount: "desc" },
    take: 50,
  });

  return { stats };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reset") {
    await prisma.comparisonStat.deleteMany({
      where: { shop: session.shop },
    });
    return { success: true };
  }

  return { error: "Unknown intent" };
};

interface Stat {
  id: string;
  shop: string;
  productId: string;
  productTitle: string;
  productImage: string;
  compareCount: number;
  lastComparedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function StatsPage() {
  const { stats } = useLoaderData<typeof loader>() as unknown as { stats: Stat[] };
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "reset");
    submit(formData, { method: "post" });
    setShowConfirm(false);
  }, [submit]);

  return (
    <s-page heading="Statistiques de comparaison">
      <s-section heading="Produits les plus comparés">
        <s-paragraph>Données des 30 derniers jours.</s-paragraph>

        {stats.length === 0 ? (
          <s-box>
            <div style={{ padding: "40px", textAlign: "center" }}>
              <s-paragraph>
                Aucune donnée de comparaison pour les 30 derniers jours.
              </s-paragraph>
            </div>
          </s-box>
        ) : (
          <s-box>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #e1e3e5",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "12px 8px", width: "56px" }}></th>
                    <th style={{ padding: "12px 8px" }}>Produit</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", width: "120px" }}>
                      Comparaisons
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "center", width: "80px" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr
                      key={stat.id}
                      style={{ borderBottom: "1px solid #f1f1f1" }}
                    >
                      <td style={{ padding: "8px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            background: "#f6f6f7",
                          }}
                        >
                          {stat.productImage && (
                            <img
                              src={stat.productImage}
                              alt={stat.productTitle}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          fontWeight: 500,
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stat.productTitle || stat.productId}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {stat.compareCount}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <s-link
                          href={`shopify://admin/products/${stat.productId.replace("gid://shopify/Product/", "")}`}
                        >
                          Voir
                        </s-link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </s-box>
        )}

        {stats.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <s-button
              variant="secondary"
              tone="critical"
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting || undefined}
            >
              Réinitialiser les statistiques
            </s-button>
          </div>
        )}
      </s-section>

      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <s-heading>Confirmer la réinitialisation</s-heading>
            <div style={{ margin: "16px 0" }}>
              <s-paragraph>
                Cette action supprimera toutes les données de comparaison. Elle est
                irréversible.
              </s-paragraph>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <s-button variant="secondary" onClick={() => setShowConfirm(false)}>
                Annuler
              </s-button>
              <s-button variant="primary" tone="critical" onClick={handleReset}>
                Réinitialiser
              </s-button>
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}
