"use client";

import dynamic from "next/dynamic";

const MarkdownReader = dynamic(() => import("@/components/MarkdownReader"), {
  ssr: false,
});

export default function Home() {
  return <MarkdownReader />;
}
