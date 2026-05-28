import { getAdminData, getStorefrontData } from "@/lib/data";
import { ProductManager } from "@/components/admin/product-manager";

export default async function ProductsPage() {
  const [{ products }, { categories }] = await Promise.all([getAdminData(), getStorefrontData()]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <div>
        <p className="text-sm font-bold text-primary">Catalog</p>
        <h1 className="text-3xl font-black">Product Management</h1>
      </div>
      <ProductManager products={products} categories={categories} />
    </div>
  );
}
