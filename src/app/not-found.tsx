import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container grid min-h-[60vh] place-items-center py-10">
      <div className="text-center">
        <p className="text-6xl font-bold text-gradient-gold">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn&apos;t exist — or the token hasn&apos;t launched yet.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
