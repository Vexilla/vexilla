<template>
  <div class="configuration-page">
    <div class="title-wrapper">
      <h1 class="title">Configuration</h1>
      <div class="title-button-wrapper">
      <button
        class="icon-button"
        title="Import JSON"
        aria-label="Import Config From JSON"
        @click="importConfig()"
      >
        <Icon class="icon" :icon="icons.import" />
        <span class="sr-only sr-mobile-only" aria-hidden="true">
          Import config from JSON
        </span>

        <span class="non-mobile">
          Import
        </span>
      </button>

      <button
        class="icon-button"
        title="Export JSON"
        aria-label="Export Config as JSON"
        @click="exportConfig()"
      >
        <Icon class="icon" :icon="icons.export" />
        <span class="sr-only sr-mobile-only" aria-hidden="true">
          Export config as JSON
        </span>

        <span class="non-mobile">
          Export
        </span>
      </button>
    </div>
    </div>

    <div class="field-row feature">
      <label>Hosting Provider</label>
      <div class="hosting-options radio-options">
        <label :class="{ selected: hosting.provider === 's3' }">
          <input
            v-model="hosting.provider"
            type="radio"
            name="provider"
            value="s3"
            @change="updateHostingProvider($event.target.value)"
          />
          AWS S3
        </label>

        <label
          v-if="false"
          :class="{ selected: hosting.provider === 'gcloud' }"
        >
          <input
            v-model="hosting.provider"
            type="radio"
            name="provider"
            value="gcloud"
            @change="updateHostingProvider($event.target.value)"
          />
          Google Cloud
        </label>

        <label :class="{ selected: hosting.provider === 'azure' }">
          <input
            v-model="hosting.provider"
            type="radio"
            name="provider"
            value="azure"
            @change="updateHostingProvider($event.target.value)"
          />
          Azure
        </label>

        <label
          v-if="false"
          :class="{ selected: hosting.provider === 'firebase' }"
        >
          <input
            v-model="hosting.provider"
            type="radio"
            name="provider"
            value="firebase"
            @change="updateHostingProvider($event.target.value)"
          />
          Firebase Storage
        </label>
      </div>
    </div>

    <div class="config-form" v-if="hosting.provider === 's3'">
      <div class="form-section">
        <label class="inline-field">
          <h3>Public base URL</h3>
          <div class="field">
            <input
              :value="hosting.config?.remoteUrl || ''"
              type="url"
              @input="updateHostingConfig('remoteUrl', $event.target.value)"
              required
            />
          </div>
          
        </label>
     
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Region</h3>
          <div class="field">
            <input
              :value="hosting.config?.region || ''"
              type="text"
              @input="updateHostingConfig('region', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Bucket Name</h3>
          <div class="field">
            <input
              :value="hosting.config?.bucketName || ''"
              type="text"
              @input="updateHostingConfig('bucketName', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Access Key</h3>
          <div class="field">
            <input
              :value="hosting.config?.accessKeyId || ''"
              type="text"
              @input="updateHostingConfig('accessKeyId', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Secret Key</h3>
          <div class="field">
            <input
              :value="hosting.config?.secretAccessKey || ''"
              type="password"
              @input="
                updateHostingConfig('secretAccessKey', $event.target.value)
              "
              required
            />
          </div>
        </label>
      </div>
    </div>

    <div class="config-form" v-if="hosting.provider === 'azure'">
      <div class="form-section">
        <label class="inline-field">
          <h3>Public base URL</h3>
          <div class="field">
            <input
              :value="hosting.config?.remoteUrl || ''"
              type="url"
              @input="updateHostingConfig('remoteUrl', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Storage Account</h3>
          <div class="field">
            <input
              :value="hosting.config?.storageAccount || ''"
              type="text"
              @input="
                updateHostingConfig('storageAccount', $event.target.value)
              "
              required
            />
          </div>
        </label>
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Container</h3>
          <div class="field">
            <input
              :value="hosting.config?.container || ''"
              type="text"
              @input="updateHostingConfig('container', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>
      <div class="form-section">
        <label class="inline-field">
          <h3>Shared Access Signature</h3>
          <div class="field">
            <input
              :value="hosting.config?.sharedAccessSignature || ''"
              type="password"
              @input="
                updateHostingConfig(
                  'sharedAccessSignature',
                  $event.target.value
                )
              "
              required
            />
          </div>
        </label>
      </div>
    </div>

    <div class="config-form" v-if="hosting.provider === 'firebase'">
      <div class="form-section">
        <label class="inline-field">
          <h3>Public base URL</h3>
          <div class="field">
            <input
              :value="hosting.config?.remoteUrl || ''"
              type="url"
              @input="updateHostingConfig('remoteUrl', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>

      <div class="form-section">
        <label class="inline-field">
          <h3>Bucket Name</h3>
          <div class="field">
            <input
              :value="hosting.config?.bucketName || ''"
              type="url"
              @input="updateHostingConfig('bucketName', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>

      <div class="form-section">
        <label class="inline-field">
          <h3>API Key</h3>
          <div class="field">
            <input
              :value="hosting.config?.apiKey || ''"
              type="password"
              @input="updateHostingConfig('apiKey', $event.target.value)"
              required
            />
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.configuration-page {
  @apply  flex flex-col w-full bg-secondary-color rounded-lg justify-center;  
}
.title-button-wrapper{
  @apply flex 
}
.title-wrapper {
  @apply flex flex-col items-center justify-center flex-wrap;

  & .icon {
    @apply mr-2;
  }

  & button {
    @apply px-2 py-1 m-2 flex-row capitalize text-center shadow-xl;

    &.icon-button {
      @apply h-9;

      & .icon {
        @apply m-0 mr-2;
      }
    }
  }
}
.feature{
  @apply flex flex-col items-center
}

.title {
  @apply text-center
}

.hosting-options {
  @apply justify-start;

  & label {
    @apply m-3;
  }
}

.field {
  max-width: calc(100% - 9rem);
}

textarea {
  @apply min-w-full max-w-full;

  min-height: 6rem;
}

.non-mobile {
  @apply hidden md:inline;
}
</style>

<script lang="ts">
import { Icon } from "@iconify/vue";
import { defineComponent } from "vue";
import { mapActions, mapState } from "vuex";
import importIcon from "@iconify-icons/entypo/folder";
import exportIcon from "@iconify-icons/entypo/save";
import { AppState } from "@/store/app";
import { saveAs } from "file-saver";

export default defineComponent({
  name: "Configuration",
  data() {
    return {
      icons: {
        import: importIcon,
        export: exportIcon,
      },
    };
  },
  components: {
    Icon,
  },
  computed: {
    ...mapState("app", ["hosting"]),
  },
  methods: {
    ...mapActions("app", ["updateHostingProvider"]),
    updateHostingConfig(propName: string, configValue: string) {
      const payload = {
        ...this.hosting?.config,
      };
      payload[propName] = configValue;
      this.$store.dispatch("app/updateHostingConfig", payload);
    },

    selectText(event: any) {
      console.log({ event });
      event.target.select();
    },
    exportConfig() {
      const appState = (this.$store as any).state.app as AppState;
      const config = appState.hosting;
      saveAs(
        new Blob([JSON.stringify(config)], { type: "application/json" }),
        "vexilla-config.json"
      );
    },
    importConfig() {
      const inputElement = document.createElement("input");
      inputElement.type = "file";
      const listener = (changeEvent: any) => {
        const reader = new FileReader();
        reader.onload = (readerEvent: any) => {
          const config = JSON.parse(readerEvent.target.result);
          this.$store.dispatch("app/importHostingAdapter", config);
        };
        reader.readAsText(changeEvent.target.files[0]);
        inputElement.removeEventListener("change", listener);
      };

      inputElement.addEventListener("change", listener);

      inputElement.click();
    },
  },
});
</script>
