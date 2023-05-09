<template>
  <div v-if="modalShowing" class="backdrop">
    <div class="modal-wrapper">
      <div class="modal">
        <div
          v-if="currentModal === ModalName.InactivityWarning"
          class="inactivity-warning modal-content-wrapper"
        >
          <div class="modal-content">
            <h2 class="modal-title">Warning!</h2>
            <p>
              You have been idle for more than 10 minutes. We have paused the
              data sync loop.
            </p>
          </div>
          <div class="actions">
            <button @click="resumeSyncLoop()">Resume Loop</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="postcss" scoped>
.backdrop {
  @apply fixed inset-0 bg-black bg-opacity-30 w-full h-full z-30;
}

.modal-wrapper {
  @apply h-full w-full flex flex-col items-center justify-center;
}

.modal {
  @apply bg-white rounded-lg max-h-full max-w-full overflow-y-auto w-96 h-72 shadow-lg p-8;
}

.modal-title {
  @apply text-center;
}

.modal-content-wrapper {
  @apply flex flex-col h-full;
}

.modal-content {
  @apply flex-grow;
}

.actions {
  @apply flex flex-row items-center justify-center w-full;
}
</style>
<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";
import { ModalName } from "@/store/ui";

export default defineComponent({
  name: "Modal",
  data() {
    return {
      ModalName,
    };
  },
  computed: {
    ...mapState("app", []),
    ...mapState("ui", ["modalShowing", "currentModal"]),
  },
  methods: {
    resumeSyncLoop() {
      console.log("foo");
      this.$store.dispatch("ui/setCurrentModal", ModalName.None);
      this.$store.dispatch("ui/setModalShowing", false);
    },
  },
});
</script>
