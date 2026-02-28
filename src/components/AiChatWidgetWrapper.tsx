"use client";

import dynamic from "next/dynamic";

const AiChatWidget = dynamic(() => import("@/components/AiChatWidget"), {
  ssr: false,
});

export default function AiChatWidgetWrapper() {
  return <AiChatWidget />;
}
