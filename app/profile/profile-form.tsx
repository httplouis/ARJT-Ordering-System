"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/app/actions";

interface ProfileFormProps {
  fullName: string;
  contactNumber?: string | null;
}

export function ProfileForm({ fullName, contactNumber }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [phone, setPhone] = useState(contactNumber ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    startTransition(async () => {
      try {
        const result = await updateProfileAction({ full_name: name, contact_number: phone });

        if (result?.success) {
          setMessage("Profile saved successfully.");
          router.refresh();
        } else {
          setIsError(true);
          setMessage("Unable to save your profile. Please try again.");
        }
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to save your name. Please try again."
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-muted/60 p-4 text-sm text-foreground">
      <div className="grid gap-2">
        <label htmlFor="full_name" className="font-medium text-foreground">Name</label>
        <Input 
          id="full_name" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-background" 
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="contact_number" className="font-medium text-foreground">Contact number</label>
        <Input
          id="contact_number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09XXXXXXXXX"
          className="bg-background"
        />
      </div>
      {message && (
        <p className={`text-sm ${isError ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Save name"}
      </Button>
    </form>
  );
}
