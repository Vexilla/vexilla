declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import { ComponentCustomProperties } from "vue";
import { Store } from "vuex";

declare module "@vue/runtime-core" {

  export interface State {
    features: VexillaFeature[];
    environments: Environment[];
    storage: StorageAdapter;
  }
  interface ComponentCustomProperties {
    $store: Store<State>;
  }
}
