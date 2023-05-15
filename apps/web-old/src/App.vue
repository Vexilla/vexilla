<template>
  <Modal />
  <header class="header">
    <a href="/" class="flex">
      <h1 class="header-heading">
        <span class="logo-wrapper">
          <img class="logo-image" src="img/logo-white.svg" />
        </span>
        <span class="app-title">
          Vexilla
        </span>
      </h1>
    </a>
    <nav class="header-nav">
      <a class="nav-link" href="/documentation">Documentation </a>
    </nav>
    <div class="publish-row">
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
        <span v-if="dataHasChanged()" class="status-message blue">
          Changes to push.
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
          v-if="hosting?.status?.route"
          :to="hosting?.status?.route"
        >
          <span class="status-message" :class="hosting?.status?.type">
            {{ hosting?.status?.message }}
          </span>
        </router-link>
      </div>

      <button class="mobile-menu-button" @click="toggleSidebarShowing">
        <Icon v-if="!sidebarShowing" :icon="icons.openMenu" />
        <Icon v-if="sidebarShowing" :icon="icons.closeMenu" />
      </button>
    </div>
  </header>
  <div class="layout">
    <Sidebar></Sidebar>
    <div class="page-wrapper">
      <router-view />
    </div>
  </div>
</template>

<style lang="postcss">

:root{
  
    --primary-color: rgb(99 102 241);
    --primary-color-light: rgb(224 231 255);


    --secondary-color: rgb(243 244 246); 
  
}
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: sans-serif
}

#app {
  @apply flex flex-col w-screen h-screen;
}

.header {
  @apply flex flex-row justify-between items-center p-2 fixed z-10 bg-white w-full mx-auto;
}

.flex {
  @apply no-underline;
}

.header-heading {
  @apply flex flex-row font-medium items-center text-gray-900 mb-4 md:mb-0 mt-0;
}

.logo-wrapper {
  @apply w-12 h-12 rounded-full p-2 bg-primary-color flex justify-center;
}

.logo-image {
  @apply w-auto max-h-full;
}

.app-title {
  @apply hidden md:inline ml-3 text-xl;
}

.header-nav {
  @apply md:mr-auto  md:border-solid md:ml-4 md:py-1 md:pl-4 md:border-l md:border-t-0 md:border-r-0 md:border-b-0 md:border-gray-400	flex flex-wrap items-center text-base justify-center;
}

.nav-link {
  @apply mr-5 text-gray-800
  hover:text-gray-900 no-underline;
}

.publish-row {
  @apply flex flex-row items-center justify-center;
}

.status-wrapper {
  @apply text-center m-2;


  @media (min-width: 768px) {
    @apply p-4;
    /* approximately font-size + padding-top and bottom */
    min-height: calc(3.25rem);
  }
}

.status-link {
  @apply no-underline;
}

.status-message {
  @apply block p-5 md:hidden  rounded-lg bg-primary-color-light m-2;

  &.error {
    @apply text-red-500 bg-red-100;
  }

  &.blue {
    @apply text-indigo-500;
  }
}

.layout {
  @apply flex flex-row relative transition-all;

  padding-top: 84px;
}

.page-wrapper {
  @apply h-auto  bg-secondary-color rounded-lg  lg:w-1/2 w-full  mr-auto ml-auto p-6;



}

.mobile-menu-button {
  @apply h-12 w-12 inline-block px-0 py-0 text-xs font-medium leading-6 text-center text-white uppercase transition bg-indigo-700 rounded shadow hover:shadow-lg hover:bg-indigo-800 focus:outline-none focus:shadow-lg focus:bg-indigo-800 md:hidden text-4xl flex ml-4;
}

textarea,
input[type="text"],
input[type="url"],
input[type="password"],
input[type="number"],
input[type="tel"] {
  @apply  px-3 py-3  text-indigo-500 relative bg-white bg-white rounded text-sm border-2 border-transparent shadow outline-none focus:outline-none focus:ring w-full; 

  &:focus {
    @apply border-2 border-indigo-500;
  }

  &:invalid {
    @apply border-2 border-red-500 outline-none;
  }
}

textarea.blurred {
  color: transparent;
  text-shadow: 0 0 6px #000;
}

button {
  @apply px-8 rounded-lg bg-primary-color text-white font-bold p-4 uppercase border-indigo-500 border-t border-b border-r text-xl flex flex-col items-center justify-center cursor-pointer;

  &:focus {
    @apply bg-primary-color outline-none border-indigo-500;
  }

  &:active {
    @apply bg-indigo-800 border-indigo-800;
  }

  &:disabled {
    @apply bg-gray-300 border-gray-300 cursor-not-allowed;
  }

  &.mini {
    @apply p-1 px-2 m-2 self-center bg-primary-color border-indigo-500 text-base;

    &:focus {
      @apply bg-indigo-700 outline-none border-indigo-700;
    }

    &:active {
      @apply bg-indigo-900 border-indigo-900;
    }
  }
}

.toggle-wrapper {
  @apply flex flex-row;
}

.text-button {
  @apply bg-transparent p-0 border-none text-gray-800 font-medium text-base m-0;

  &:focus {
    @apply bg-transparent underline;
  }
}

.seed-wrapper {
  @apply flex flex-row flex-wrap;
}

.row {
  @apply w-full flex flex-row items-center justify-start md:pr-8 md:pl-8;


}

.slider-label {
  @apply p-2;
}

.feature-slider {
  @apply flex-grow text-primary-color ;
}

.radio-options {
  @apply flex flex-row justify-evenly;


  & label {
    @apply p-2 text-center border border-solid border-2 border-gray-500 outline-none m-1 rounded;

    &.selected {
      @apply border-indigo-500;
    }
  }

  & input[type="radio"] {
    @apply block border-primary-color my-2 mx-auto   ; 

    &:checked{
      @apply bg-primary-color
    }
  }

  & :hover{
    cursor: pointer
  }
}

.form-section {
  @apply border-solid border-0 border-b-2 border-indigo-300 py-8 px-4;

  &:last-child {
    @apply border-none border-0;
  }

  &.inline-field,
  & .inline-field {
    @apply flex flex-row justify-center items-center;

    & h3 {
      @apply m-0 w-16 md:w-36 text-right pt-0;
    }

    & .field {
      @apply pl-4 flex-grow ;
      & > input {
        @apply  px-3 py-3  text-indigo-500 relative bg-white bg-white rounded text-sm border-2 border-transparent shadow outline-none focus:outline-none focus:ring w-full; 
        &:focus {
          @apply border-2 border-indigo-500;
        }
      
 
      }
    }
  }
}

/* from: https://github.com/ampproject/amphtml/ */
.sr-only {
  position: fixed !important;
  /* keep it on viewport */
  top: 0px !important;
  left: 0px !important;
  /* give it non-zero size, VoiceOver on Safari requires at least 2 pixels
     before allowing buttons to be activated. */
  width: 4px !important;
  height: 4px !important;
  /* visually hide it with overflow and opacity */
  opacity: 0 !important;
  overflow: hidden !important;
  /* remove any margin or padding */
  border: none !important;
  margin: 0 !important;
  padding: 0 !important;
  /* ensure no other style sets display to none */
  display: block !important;
  visibility: visible !important;

  & ~ .sr-only {
    left: 8px !important;

    & ~ .sr-only {
      left: 12px !important;

      & ~ .sr-only {
        left: 16px !important;
      }
    }
  }

  &.mobile-only {
    @apply md:hidden;
  }
}
</style>

<script lang="ts">
import { Icon, InlineIcon } from "@iconify/vue";
import openMenuIcon from "@iconify-icons/ant-design/menu-fold-outlined";
import closeMenuIcon from "@iconify-icons/ant-design/menu-unfold-outlined";
import flagIcon from "@iconify-icons/dashicons/flag";

import { defineComponent } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import Modal from "@/components/Modal.vue";
import { mapActions, mapGetters, mapState } from "vuex";

import { AppState } from "@/store/app";

import { HostingService, HostingStatusType } from "@/services/hosting.service";
import { ModalName } from "./store/ui";

export default defineComponent({
  name: "App",
  data: function() {
    return {
      HostingStatusType: HostingStatusType,
      showing: false,
      icons: {
        flag: flagIcon,
        openMenu: openMenuIcon,
        closeMenu: closeMenuIcon,
      },
      fetchInterval: null as null | NodeJS.Timeout,
      lastInteraction: Date.now(),
    };
  },
  created() {
    this.fetchInterval = setInterval(this.synchronize, 30000);
    this.synchronize();

    document.addEventListener("click", this.resetTimer);

    document.addEventListener("mousemove", this.resetTimer);

    document.addEventListener("scroll", this.resetTimer);

    document.addEventListener("keypress", this.resetTimer);
  },
  unmounted() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
    }
  },
  computed: {
    ...mapState("app", ["hosting"]),
    ...mapState("ui", ["sidebarShowing"]),
    ...mapGetters("app", ["configIsValid", "dataHasChanged"]),
  },
  methods: {
    ...mapActions("ui", ["toggleSidebarShowing"]),
    resetTimer() {
      this.lastInteraction = Date.now();
    },
    publishChanges() {
      const appState = (this.$store as any).state.app as AppState;
      const payload = HostingService.formatPayloadFromState(appState);
      HostingService.upload(payload, appState.hosting);
      this.$store.dispatch("app/setExistingFeatures", payload);
    },
    async synchronize() {
      const isValid = this.$store.getters["app/configIsValid"]();

      if (Date.now() > this.lastInteraction + 600_000) {
        this.$store.dispatch("ui/setCurrentModal", ModalName.InactivityWarning);
        this.$store.dispatch("ui/setModalShowing", true);
      } else if (isValid) {
        const result = await (HostingService.fetchExistingFeatures(
          (this.$store.state as any).app.hosting
        ) as any);
        console.log({ result });

        this.$store.dispatch("app/setExistingFeatures", result.data);
      }
    },
  },
  components: {
    Sidebar,
    Icon,
    Modal,
  },
});
</script>
