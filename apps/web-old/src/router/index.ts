import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  RouteRecordRaw,
} from "vue-router";
import Home from "../views/Home.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/environment/:name",
    name: "Environment",
    component: () =>
      import(/* webpackChunkName: "environment" */ "../views/Environment.vue"),
  },
  {
    path: "/feature/:name",
    name: "Feature",
    component: () =>
      import(/* webpackChunkName: "feature" */ "../views/Feature.vue"),
  },
  {
    path: "/configuration",
    name: "Configuration",
    component: () =>
      import(
        /* webpackChunkName: "configuration" */ "../views/Configuration.vue"
      ),
  },
];

console.log("NODE_ENV", process.env.NODE_ENV);
console.log("BASE_URL", process.env.BASE_URL);

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  // history api breaks when navigating directly or refreshing on subroutes
  // createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
