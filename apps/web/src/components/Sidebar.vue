<template>
  <div class="sidebar" :class="{ showing: sidebarShowing }">
    <div class="toolbar">
      <div class="status-wrapper">
        <div>
          <router-link
            class="status-link"
            v-if="!configIsValid()"
            :to="'/configuration'"
          >
            <span class="status-message error">
              Config is currently invalid
            </span>
     
          </router-link>
        </div>
        <span v-if="!dataHasChanged()" class="status-message">
          No changes to push.
        </span>
        <span
          class="status-message"
          :class="hosting?.status?.type"
          v-if="hosting?.status?.message && !hosting?.status?.route"
        >
          {{ hosting?.status?.message }}
        </span>
        <router-link
          class="status-link"
          v-if="hosting?.status?.message && hosting?.status?.route"
          :to="hosting?.status?.route"
        >
          <span class="status-message" :class="hosting?.status?.type">
            {{ hosting?.status?.message }}
          </span>
        </router-link>
      </div>

      <div class="publish-row">
        <button
          class="icon-button"
          @click="exportJson()"
          title="Download JSON"
          aria-label="Download features.json"
        >
          <Icon class="icon" :icon="icons.download" />
          <span class="sr-only" aria-hidden="true">Download features.json</span>
        </button>
        <button
          class="icon-button"
          @click="copyJson()"
          title="Copy JSON"
          aria-label="Copy features.json to clipboard"
        >
          <Icon class="icon" :icon="icons.copy" />
          <span class="sr-only" aria-hidden="true">
            Copy features.json to clipboard
          </span>
        </button>
        <button
          :disabled="
            !dataHasChanged() ||
              !configIsValid() ||
              hosting?.status?.type === HostingStatusType.ERROR
          "
          @click="publishChanges()"
        >
          <Icon class="icon" :icon="icons.upload" /> Publish
        </button>
      </div>
      <router-link
        to="/configuration"
        class="config-link"
        @click="goToConfig($event)"
      >
      
      <button class="config-button">
    
          <Icon :icon="icons.settings" class="logo" />
          <span>Configuration</span>
  
        </button>
  
    </router-link>
      
    </div>

    <h2 class="sidebar-title">Environments ({{ environments?.length }})</h2>
    <ManageList
      item-label="Environment"
      namedRoute="Environment"
      :list="environments"
      @itemAdded="addEnvironment"
      @itemRemoved="removeEnvironment"
      @navigated="toggleSidebarShowing"
    ></ManageList>
    <hr class="separator" />
    <h2 class="sidebar-title">Features ({{ features?.length }})</h2>
    <ManageList
      item-label="Feature"
      namedRoute="Feature"
      :list="features"
      @itemAdded="addFeature"
      @itemRemoved="removeFeature"
      @navigated="toggleSidebarShowing"
    ></ManageList>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ManageList from "@/components/ManageList.vue";
import store, { AppState, Environment, Feature } from "@/store/app";
import { mapActions, mapGetters, mapState } from "vuex";
import settingsIcon from "@iconify-icons/dashicons/admin-settings";
import uploadIcon from "@iconify-icons/entypo/upload-to-cloud";
import downloadIcon from "@iconify-icons/entypo/download";
import copyIcon from "@iconify-icons/entypo/copy";
import { Icon, InlineIcon } from "@iconify/vue";
import { saveAs } from "file-saver";
import * as clipboard from "clipboard-polyfill/text";

import {
  HostingService,
  HostingStatus,
  HostingStatusType
} from "@/services/hosting.service";

export default defineComponent({
  name: "Sidebar",
  data() {
    return {
      HostingStatusType: HostingStatusType,
      icons: {
        settings: settingsIcon,
        upload: uploadIcon,
        download: downloadIcon,
        copy: copyIcon
      }
    };
  },
  computed: {
    ...mapState("app", ["environments", "features", "hosting"]),
    ...mapState("ui", ["sidebarShowing"]),
    ...mapGetters("app", ["configIsValid", "dataHasChanged"])
  },
  methods: {
    ...mapActions("app", [
      "addEnvironment",
      "removeEnvironment",
      "addFeature",
      "removeFeature"
    ]),
    ...mapActions("ui", ["toggleSidebarShowing", "setSidebarShowing"]),

    goToConfig(event: any) {
      console.log("event", event);
      event.preventDefault();
      this.$router.push("/configuration");
      this.toggleSidebarShowing();
    },
    publishChanges() {
      const appState = (this.$store as any).state.app as AppState;
      const payload = HostingService.formatPayloadFromState(appState);
      HostingService.upload(payload, appState.hosting);
      this.$store.dispatch("app/setExistingFeatures", payload);
    },

    exportJson() {
      const appState = (this.$store as any).state.app as AppState;
      const payload = HostingService.formatPayloadFromState(appState);
      saveAs(
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
        "features.json"
      );
    },

    copyJson() {
      const appState = (this.$store as any).state.app as AppState;
      const payload = HostingService.formatPayloadFromState(appState);
      clipboard.writeText(JSON.stringify(payload, null, 2));

      const currentStatus = (this.$store as any).state.app.hosting.status;

      console.log("current", JSON.parse(JSON.stringify(currentStatus)));

      const message = "Config copied to clipboard.";

      this.$store.dispatch("app/setHostingStatus", {
        message,
        type: HostingStatusType.NORMAL
      } as HostingStatus);

      setTimeout(() => {
        const latestStatus = (this.$store as any).state.app.hosting.status;
        console.log("latest", JSON.parse(JSON.stringify(latestStatus)));
        if (latestStatus.message === message) {
          this.$store.dispatch("app/setHostingStatus", { ...currentStatus });
        }
      }, 3000);
    }
  },
  components: {
    ManageList,
    Icon
  }
});
</script>

<style lang="postcss" scoped>
.sidebar {

  @apply bg-secondary-color rounded-lg 
  w-screen md:w-1/3 ml-2 fixed md:relative transform md:transform-none p-4 translate-x-full transition-all p-4 z-10;

}
.scrollbar-hide::-webkit-scrollbar {
  display:none 
}
.logo{
  @apply text-2xl
}
.sidebar-title{
  @apply text-center
}
.config-button{
  @apply flex justify-evenly flex-row
}

.showing {
  @apply translate-x-0;
}

.separator {
  @apply mt-8 mb-8;
}

.toolbar {
  @apply sticky left-0 right-0  z-10;

}


.publish-row {
  @apply flex justify-center ;

  & .icon {
    @apply mr-2;
  }

  & button {
    @apply px-2 py-1 m-2 flex-row capitalize text-center;

    &.icon-button {
      & .icon {
        @apply m-0;
      }
    }
  }
}

.status-wrapper {
  @apply text-center;
}

.status-message {
  @apply hidden md:block;
}

.config-link {
  @apply no-underline text-black  text-white w-full flex-row flex justify-evenly;
}
</style>
