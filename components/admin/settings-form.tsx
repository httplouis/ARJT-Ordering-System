"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StoreSettings } from "@/lib/types";
import { settingsSchema } from "@/lib/validations";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await updateSettingsAction(values);
            toast.success("Settings updated");
          })}
        >
          <Input placeholder="Store name" {...form.register("store_name")} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" {...form.register("store_open")} /> Store open
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" {...form.register("opening_time")} />
            <Input type="time" {...form.register("closing_time")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Delivery fee" {...form.register("delivery_fee")} />
            <Input type="number" placeholder="Default prep time" {...form.register("default_prep_minutes")} />
          </div>
          <Input placeholder="GCash account name" {...form.register("gcash_name")} />
          <Input placeholder="GCash number" {...form.register("gcash_number")} />
          <Input placeholder="GCash QR URL" {...form.register("gcash_qr_url")} />
          <Button className="w-full">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
