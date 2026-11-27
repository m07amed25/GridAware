"use client";

import { useParams } from "next/navigation";
import React from "react";
import { SiteDetailPanel } from "@/components/locations/site-detail-panel";

export default function OrganizationSiteDetailPage() {
  const params = useParams<{ siteCode: string }>();
  return <SiteDetailPanel siteRef={params.siteCode} />;
}
