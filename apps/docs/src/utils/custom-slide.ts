import type {
  TransitionAnimationPair,
  TransitionDirectionalAnimations,
} from "astro";

const EASE_IN_OUT_QUART = "cubic-bezier(0.76, 0, 0.24, 1)";

export function customSlide(): TransitionDirectionalAnimations {
  return {
    forwards: {
      old: [
        {
          name: "astroFadeOut",
          duration: "90ms",
          easing: EASE_IN_OUT_QUART,
          fillMode: "forwards",
        },
        {
          name: "astroSlideToLeft",
          duration: "220ms",
          easing: EASE_IN_OUT_QUART,
          fillMode: "forwards",
        },
      ],
      new: [
        {
          name: "astroSlideFromRight",
          duration: "420ms",
          easing: EASE_IN_OUT_QUART,
          fillMode: "backwards",
        },
        {
          name: "astroFadeIn",
          duration: "810ms",
          easing: EASE_IN_OUT_QUART,
          delay: "0ms",
          fillMode: "backwards",
        },
      ],
    },
    backwards: {
      old: [{ name: "astroFadeOut" }, { name: "astroSlideToRight" }],
      new: [{ name: "astroFadeIn" }, { name: "astroSlideFromLeft" }],
    },
  };
}
