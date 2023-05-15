export interface UIState {
  sidebarShowing: boolean;
  modalShowing: boolean;
  currentModal: ModalName;
}

export enum ModalName {
  None = "None",
  InactivityWarning = "InactivityWarning",
}

export default {
  namespaced: true,
  state: {
    sidebarShowing: false,
    modalShowing: true,
    currentModal: ModalName.InactivityWarning,
  } as UIState,
  mutations: {
    setSidebarShowing(state: UIState, sidebarShowing: boolean) {
      state.sidebarShowing = sidebarShowing;
    },
    toggleSidebarShowing(state: UIState, sidebarShowing: boolean) {
      state.sidebarShowing = !state.sidebarShowing;
    },
    setModalShowing(state: UIState, modalShowing: boolean) {
      state.modalShowing = modalShowing;
    },
    setCurrentModal(state: UIState, currentModal: ModalName) {
      state.currentModal = currentModal;
    },
  },
  actions: {
    setSidebarShowing(context: any, sidebarShowing: boolean) {
      context.commit("setSidebarShowing", sidebarShowing);
    },
    toggleSidebarShowing(context: any) {
      context.commit("toggleSidebarShowing");
    },
    setModalShowing(context: any, modalShowing: boolean) {
      context.commit("setModalShowing", modalShowing);
    },
    setCurrentModal(context: any, currentModal: ModalName) {
      context.commit("setCurrentModal", currentModal);
    },
  },
};
