const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkTable(table) {
  try {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`${table}: ERROR - ${error.message}`);
      return;
    }
    console.log(`${table}: accessible, rows sample=${data.length}`);
  } catch (err) {
    console.log(`${table}: ERROR - ${err.message || err}`);
  }
}

async function main() {
  const tables = ['settings', 'categories', 'products', 'orders', 'order_items', 'payments', 'notifications', 'users'];
  for (const t of tables) {
    await checkTable(t);
  }
  
  // Check product details
  console.log('\n--- Product List ---');
  try {
    const { data, error } = await supabase.from('products').select('name, price, category_id');
    if (error) {
      console.log('Error fetching products:', error.message);
    } else {
      console.log(`Total products: ${data?.length}`);
      data?.forEach(p => console.log(`  - ${p.name} (₱${p.price})`));
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
