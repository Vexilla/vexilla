<template>
  <div class="feature-page">
    <h1 class="title">Feature: {{ feature?.name }}</h1>

    <div class="field-row feature">
      <label>Feature Type</label>
      <div class="feature-type-options radio-options">
        <label>
          <input v-model="type" type="radio" name="type" value="toggle" />
          Toggle
        </label>

        <label>
          <input v-model="type" type="radio" name="type" value="gradual" />
          Gradual
        </label>

        <label>
          <input v-model="type" type="radio" name="type" value="selective" />
          Selective
        </label>
      </div>
    </div>
    <div class="environments">
      <h2>Environments</h2>
      <div
        class="environment form-section"
        :class="type === 'toggle' ? 'inline-field' : ''"
        v-for="environment in environments"
        :key="environment.name"
      >
        <h3>{{ environment.name }}</h3>
        <div v-if="type === 'toggle'">
          <div class="toggle-wrapper field">
            <button class="text-button" @click="setToggle(environment, false)">
              Off
            </button>
            <Toggle
              :toggled="getFeatureSettings(environment)?.value"
              @change="handleToggleChange(environment, $event)"
            />
            <button class="text-button" @click="setToggle(environment, true)">
              On
            </button>
          </div>
        </div>
        <div v-if="type === 'gradual'">
          <div class="seed-wrapper">
            <div class="row">
              <h4>Seed:</h4>
              <input
                class="feature-input"
                type="number"
                step="0.01"
                min="0.01"
                max=".099"
                :value="getFeatureSettings(environment)?.seed"
                @input="
                  handleSeedChange(environment, $event.target.value * 100)
                "
              />
            </div>
            <div class="row">
              <label class="slider-label">.01</label>
              <input
                class="feature-slider left"
                id="{{environment}}-seed"
                name="{{environment}}-seed"
                :value="getFeatureSettings(environment)?.seed * 100"
                type="range"
                min="1"
                max="99"
                step="1"
                @input="handleSeedChange(environment, $event.target.value)"
              />
              <label class="slider-label">.99</label>
              <button class="right mini" @click="randomizeSeed(environment)">
                Randomize
              </button>
            </div>
          </div>
          <hr />
          <div class="threshold-wrapper">
            <div class="row">
              <h4>Threshold:</h4>
              <input
                class="feature-input"
                type="number"
                step="1"
                min="0"
                max="100"
                :value="getFeatureSettings(environment)?.value"
                @input="handleThresholdChange(environment, $event.target.value)"
              />
            </div>
            <div class="row">
              <label class="slider-label">1</label>
              <input
                id="{{environment}}-threshold"
                class="feature-slider"
                name="{{environment}}-threshold"
                :value="getFeatureSettings(environment)?.value"
                type="range"
                min="0"
                max="100"
                step="1"
                @input="handleThresholdChange(environment, $event.target.value)"
              />
              <label class="slider-label">100</label>
            </div>
          </div>
        </div>
        <div v-if="false && type === 'selective'">selective</div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">

.feature-page {
  @apply max-w-screen-sm m-auto;
}
 
.title {
  @apply text-left;
}
.feature{
  @apply flex flex-col items-center justify-center text-center
}

.environments {
  & > h2 {
    @apply mb-0;
  }
}

.environment {
  & h3 {
    @apply mt-0 w-24;
  }
}
</style>

<script lang="ts">
import { Icon, InlineIcon } from "@iconify/vue";
import flagIcon from "@iconify-icons/dashicons/flag";
import { defineComponent } from "vue";
import Toggle from "@/components/Toggle.vue";

import isEqual from "lodash/fp/isEqual";
import {
  Environment,
  Feature,
  VexillaFeature,
  VexillaFeatureTypeString,
} from "@/store/app";
import { mapState } from "vuex";

export default defineComponent({
  name: "Feature",
  data() {
    return {
      type: "toggle",
    };
  },
  methods: {
    randomizeSeed(environment: Environment) {
      const randomValue = Math.floor(Math.random() * 100);
      this.handleSeedChange(environment, randomValue);
    },
    getFeatureSettings(environment: Environment) {
      return this.$store.getters["app/getFeatureSettings"](
        this.feature,
        environment,
        this.type
      );
    },
    handleToggleChange(environment: Environment, toggled: boolean) {
      console.log("inside handle toggle change", toggled);
      this.$store.dispatch("app/setFeatureSettings", {
        feature: this.feature,
        environment,
        type: this.type,
        settings: {
          value: toggled,
        } as VexillaFeature,
      });
    },
    setToggle(environment: Environment, toggled: boolean) {
      this.$store.dispatch("app/setFeatureSettings", {
        feature: this.feature,
        environment,
        type: this.type,
        settings: {
          value: toggled,
        } as VexillaFeature,
      });
    },
    handleSeedChange(environment: Environment, value: number) {
      this.$store.dispatch("app/setFeatureSettings", {
        feature: this.feature,
        environment,
        type: this.type,
        settings: {
          seed: +value / 100,
        } as VexillaFeature,
      });
    },
    handleThresholdChange(environment: Environment, value: number) {
      this.$store.dispatch("app/setFeatureSettings", {
        feature: this.feature,
        environment,
        type: this.type,
        settings: {
          value: +value,
        } as VexillaFeature,
      });
    },
    updateType(type: string) {
      this.$store.dispatch("app/editFeature", {
        previous: this.feature,
        current: {
          ...this.feature,
          type,
        },
      });
    },
  },
  created() {
    if (!this.feature) {
      this.$router.replace("/");
      this.type = this.feature?.type;
    } else {
      this.type = this.feature?.type;
    }
  },
  updated() {
    this.type = this.feature?.type;
  },
  activated() {
    this.type = this.feature?.type;
  },
  computed: {
    ...mapState("app", ["environments", "featureSettings"]),
    feature() {
      return this.$store.getters["app/featureByName"](this.$route.params.name);
    },
  },
  watch: {
    feature(feature: Feature, oldFeature: Feature) {
      this.type = feature?.type;
    },
    type(type, oldType) {
      this.updateType(type);
    },
  },
  components: {
    Toggle,
  },
});
</script>
