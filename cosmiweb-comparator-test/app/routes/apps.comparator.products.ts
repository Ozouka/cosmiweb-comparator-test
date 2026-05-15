import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.public.appProxy(request);

  if (!session || !admin) {
    return Response.json({ products: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const handlesParam = url.searchParams.get("handles");

  if (!handlesParam) {
    return Response.json({ products: [] }, { status: 400 });
  }

  const handles = handlesParam.split(",").slice(0, 4);
  const query = handles.map((h) => `handle:${h}`).join(" OR ");

  const response = await admin.graphql(
    `#graphql
      query getProductsByHandles($query: String!) {
        products(first: 4, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              vendor
              productType
              availableForSale
              featuredImage {
                url
                altText
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 30) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    weight
                    weightUnit
                  }
                }
              }
            }
          }
        }
      }
    `,
    { variables: { query } }
  );

  const data = await response.json();
  const edges = data.data?.products?.edges || [];

  const products = edges.map(({ node }: any) => {
    const price = Math.round(
      parseFloat(node.priceRange.minVariantPrice.amount) * 100
    );
    const compareAtAmount = parseFloat(
      node.compareAtPriceRange?.minVariantPrice?.amount || "0"
    );
    const compareAtPrice = compareAtAmount > 0 ? Math.round(compareAtAmount * 100) : null;

    const variants = node.variants.edges.map(({ node: v }: any) => ({
      id: v.id,
      title: v.title,
      available: v.availableForSale,
      price: Math.round(parseFloat(v.price.amount) * 100),
      compare_at_price: v.compareAtPrice
        ? Math.round(parseFloat(v.compareAtPrice.amount) * 100)
        : null,
      weight: v.weight,
      weight_unit: v.weightUnit?.toLowerCase() || "g",
    }));

    return {
      id: node.id,
      title: node.title,
      handle: node.handle,
      description: node.description || "",
      vendor: node.vendor,
      product_type: node.productType,
      available: node.availableForSale,
      featured_image: node.featuredImage?.url || "",
      price,
      compare_at_price: compareAtPrice,
      variants,
    };
  });

  return Response.json({ products });
};
