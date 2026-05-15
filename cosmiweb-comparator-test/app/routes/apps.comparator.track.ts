import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async (_: LoaderFunctionArgs) => {
  return Response.json({ error: "Use POST method" }, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { products } = body;

  if (!Array.isArray(products) || products.length < 2) {
    return Response.json({ error: "At least 2 products required" }, { status: 400 });
  }

  const now = new Date();

  for (const product of products) {
    if (!product.id) continue;

    await prisma.comparisonStat.upsert({
      where: {
        shop_productId: {
          shop: session.shop,
          productId: String(product.id),
        },
      },
      update: {
        compareCount: { increment: 1 },
        lastComparedAt: now,
        productTitle: product.title || "",
        productImage: typeof product.image === "string" ? product.image : "",
      },
      create: {
        shop: session.shop,
        productId: String(product.id),
        productTitle: product.title || "",
        productImage: typeof product.image === "string" ? product.image : "",
        compareCount: 1,
        lastComparedAt: now,
      },
    });
  }

  return Response.json({ success: true });
};
