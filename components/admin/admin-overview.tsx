"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock, Package, PhilippinePeso, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Analytics, Order, Product, StoreSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { LiveOrders } from "@/components/admin/live-orders";

export function AdminOverview({
  analytics,
  orders
}: {
  analytics: Analytics;
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
}) {
  const cards = [
    { label: "Orders Today", value: analytics.ordersToday, icon: ReceiptText },
    { label: "Revenue Today", value: formatCurrency(analytics.revenueToday), icon: PhilippinePeso },
    { label: "Pending Orders", value: analytics.pendingOrders, icon: Clock },
    { label: "Completed", value: analytics.completedOrders, icon: CheckCircle2 },
    { label: "Most Ordered", value: analytics.mostOrderedProduct, icon: Package }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <div>
        <p className="text-sm font-bold text-primary">Realtime command center</p>
        <h1 className="text-3xl font-black">Dashboard Overview</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-black">{card.value}</p>
              </div>
              <card.icon className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.dailySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="revenue" stroke="#9f1239" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Busy Hours</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.busyHours}>
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <LiveOrders initialOrders={orders} />
    </div>
  );
}
