"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AiChatWidget = dynamic(() => import("@/components/AiChatWidget"), {
  ssr: false,
});

const HIDDEN_PATHS = ["/setup", "/register", "/login"];

export default function AiChatWidgetWrapper() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return <AiChatWidget />;
}
