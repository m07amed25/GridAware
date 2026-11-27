"use client";

import { useParams } from "next/navigation";
import React from "react";
import { BuildingDetailPanel } from "@/components/locations/building-detail-panel";

export default function OrganizationBuildingDetailPage() {
  const params = useParams<{ siteCode: string; buildingCode: string }>();
  return (
    <BuildingDetailPanel
      siteRef={params.siteCode}
      buildingRef={params.buildingCode}
    />
  );
}
