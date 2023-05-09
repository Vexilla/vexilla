<template>
  <div class="wrapper">
    <div class="inner-wrapper">
      <SwitchGroup
        as="div"
        class="switch-group"
        :class="{
          labelled: label,
        }"
      >
        <SwitchLabel>{{ label }}</SwitchLabel>

        <Switch
          as="button"
          v-model="innerToggled"
          class="switch"
          :class="{ toggled: innerToggled }"
          v-slot="{ checked }"
        >
          <span class="switch-dot" :class="{ checked: checked }"></span>
        </Switch>
      </SwitchGroup>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  @apply flex items-center justify-center px-4;
}

.inner-wrapper {
  @apply w-full max-w-xs mx-auto;
}

.switch-group {
  @apply flex items-center ml-0;

  &.labelled {
    @apply space-x-4;
  }
}

.switch {
  @apply relative inline-flex flex-shrink-0 p-0 h-6 items-start transition-colors duration-200 ease-in-out border-2 border-transparent rounded-full cursor-pointer w-11 focus:outline-none focus:shadow bg-gray-200;

  &.toggled {
    @apply bg-primary-color;
  }
}

.switch-dot {
  @apply inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full translate-x-0;

  &.checked {
    @apply translate-x-5;
  }
}
</style>
<script lang="ts">
import { defineComponent } from "vue";
import { SwitchGroup, Switch, SwitchLabel } from "@headlessui/vue";

export default defineComponent({
  name: "Toggle",
  props: {
    toggled: Boolean,
    label: String,
  },
  data: function() {
    return {
      innerToggled: this.toggled,
    };
  },
  components: {
    SwitchGroup,
    Switch,
    SwitchLabel,
  },
  methods: {
    changed: function(toggled: boolean) {
      console.log("changed", toggled);
      this.$emit("change", toggled);
    },
  },
  created() {
    this.innerToggled = this.toggled;
  },
  updated() {
    this.innerToggled = this.toggled;
  },
  watch: {
    innerToggled(toggled) {
      console.log("watch", toggled);
      this.$emit("change", toggled);
    },
  },
});
</script>
