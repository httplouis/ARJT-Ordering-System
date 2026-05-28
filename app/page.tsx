import { getStorefrontData } from "@/lib/data";
import { Storefront } from "@/components/storefront/storefront";

export default async function Home() {
  const data = await getStorefrontData();
  return <Storefront {...data} />;
}
