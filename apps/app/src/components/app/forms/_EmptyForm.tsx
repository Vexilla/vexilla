import React from "react";
import { AppState } from "@vexilla/types";

interface EmptyFormProps {
  config: AppState;
}

export function EmptyForm({ config }: EmptyFormProps) {
  return <div>Empty Form</div>;
}
