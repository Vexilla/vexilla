import _React from "react";
import { AppState } from "@vexilla/types";

interface EmptyFormProps {
  config: AppState;
}

export function EmptyForm({}: EmptyFormProps) {
  return <div>Empty Form</div>;
}
