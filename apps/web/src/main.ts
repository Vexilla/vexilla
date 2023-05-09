import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
// import Vuex from "vuex";

// import "tailwindcss/tailwind.css";

import "./polyfills.ts";

createApp(App)
  .use(store)
  .use(router)
  .mount("#app");
