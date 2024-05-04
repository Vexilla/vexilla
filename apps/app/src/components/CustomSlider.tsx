import _React, { useRef } from "react";
import { Slider, Flex, NumberInput, Button, Text } from "@mantine/core";

import { nanoid } from "../utils/nanoid";

import { CustomTooltip } from "./CustomTooltip";

import Icon from "@iconify/react";
import perspectiveDiceSixFacesRandom from "@iconify/icons-game-icons/perspective-dice-six-faces-random";

interface SliderProps {
  value: number;
  label: string;
  onChange: (value: number | string) => void;
  min?: number;
  max?: number;
  step?: number;
  tooltipText?: string;
  showRandomButton?: boolean;
}

export function CustomSlider({
  value = 0,
  label,
  onChange,
  tooltipText,
  min = 0,
  max = 1,
  step = 0.01,
  showRandomButton = false,
}: SliderProps) {
  const inputId = useRef(`number-input-${nanoid()}`);
  const precision = step.toString().split(".")[1]?.length || 1;

  return (
    <>
      <Flex direction="row" align="center" justify={"space-between"}>
        <Flex direction="row" align="center">
          <label htmlFor={inputId.current}>{label}</label>
          {!!tooltipText && <CustomTooltip tooltipText={tooltipText} />}
        </Flex>
        {showRandomButton && (
          <Button
            size="xs"
            p={0}
            mb={4}
            w="80px"
            onClick={() => {
              const randomValue = Number(
                (Math.random() * max - min).toFixed(precision)
              );
              onChange(randomValue);
            }}
            style={{ fontSize: "10px" }}
            variant="light"
            leftSection={
              <Icon width={"16px"} icon={perspectiveDiceSixFacesRandom} />
            }
          >
            Random
          </Button>
        )}
      </Flex>
      <Flex direction="row" align="center" gap={"1rem"}>
        <Slider
          value={value || 0}
          onChange={(event) => {
            onChange(event);
          }}
          label={(_value) => _value?.toFixed(precision) || 0}
          w={"100%"}
          min={min}
          max={max}
          step={step}
        />
        <NumberInput
          name={inputId.current}
          id={inputId.current}
          value={value || 0}
          onChange={onChange}
          w={"100px"}
          min={min}
          max={max}
          step={step}
          decimalScale={precision || 0}
        />
      </Flex>
    </>
  );
}
