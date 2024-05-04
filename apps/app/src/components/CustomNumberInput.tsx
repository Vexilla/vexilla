import _React, { useMemo } from "react";
import { Input, NumberInput } from "@mantine/core";
import { VexillaNumberType } from "@vexilla/types";

interface CustomNumberInputProps {
  value: number;
  onChange: (newValue: number) => void;
  numberType: VexillaNumberType;
  label?: string;
}

export function CustomNumberInput({
  value,
  onChange,
  numberType,
  label = "Value",
}: CustomNumberInputProps) {
  const validationError = useMemo(() => {
    if (value !== 0 && !value) {
      return "Input must not be empty.";
    }

    if (numberType === "int" && parseInt(`${value}`) !== value) {
      return "Could not parse number to Integer.";
    }

    if (numberType === "float" && parseFloat(`${value}`) !== value) {
      return "Could not parse number to Float.";
    }

    return "";
  }, [value, numberType]);

  return (
    <>
      <Input.Label>{label}</Input.Label>
      <NumberInput
        clampBehavior="none"
        decimalScale={numberType === "int" ? 0 : 9}
        defaultValue={value}
        onChange={(newValue) => {
          if (newValue === "") {
            onChange(0);
          } else {
            const numberValue = Number(newValue);
            if (!isNaN(numberValue)) {
              onChange(numberValue);
            }
          }
        }}
      />
      {!!validationError && <Input.Error>{validationError}</Input.Error>}
    </>
  );
}
