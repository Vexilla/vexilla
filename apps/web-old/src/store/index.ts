import { createStore } from "vuex";
import app, { AppState } from "@/store/app";
import ui, { UIState } from "@/store/ui";

import createPersistedState from "vuex-persistedstate";

export interface State {
  app: AppState;
  ui: UIState;
}

export default createStore<State>({
  modules: {
    app,
    ui
  },
  plugins: [createPersistedState()]
});
