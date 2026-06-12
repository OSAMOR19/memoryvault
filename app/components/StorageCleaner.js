"use client";

import { useEffect } from "react";
import { clearOldData } from "../lib/auth";

export default function StorageCleaner() {
  useEffect(() => {
    clearOldData();
  }, []);
  return null;
}
