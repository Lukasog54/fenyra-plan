"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    router.replace(session?.password && session.selectedClassName ? "/heute" : "/login");
  }, [router]);

  return null;
}
