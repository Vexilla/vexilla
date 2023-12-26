package dev.vexilla

/*
  This file has been generated from your remote Vexilla Feature Flags file.

  You should NOT modify this file directly.

  It is encouraged to gitignore this file and generate it on-the-fly during build/compilation.
*/


data object GradualGroup {
    const val name: String = "Gradual"
    val id: String = "aKS-wxK2mMbeYxVVFSV8p"

    enum class Features(val id: String) {
        TESTING_WORKING_GRADUAL("oIVHzosp0ao3HN0fmFwwr"),
        TESTING_NON_WORKING_GRADUAL("-T2se1u9jyj1HNkbJ9Cdr"),
    }

    enum class Environments(val id: String) {
        DEV("zq-d4W97nyNo3mELbO_LT"),
    }
}


data object ScheduledGroup {
    val name: String = "Scheduled"
    val id: String = "Jz0rgEv0epyCb6z58or72"

    enum class Features(val id: String) {
        BEFORE_GLOBAL("7tmnvFX7RI3kOt5r57vyz"),
        DURING_GLOBAL("khEhXchcRuhNdDa8Il8VO"),
        AFTER_GLOBAL("dPjTTjugWI5gJfcmoDmbU"),
        BEFORE_GLOBAL_START_END("6iaSljA2uE74IPq4gNzEv"),
        DURING_GLOBAL_START_END("0cq1IesUoQ7co34ViqHY8"),
        AFTER_GLOBAL_START_END("PKjpuHwBkjmofQlj-o3q5"),
        BEFORE_GLOBAL_DAILY("hErE-2S6DeJBybg-zjo-h"),
        DURING_GLOBAL_DAILY("VOg2MtzQbaAvZJLSyYXo_"),
        AFTER_GLOBAL_DAILY("dA_c61EnCwPL0ENcAbzJF"),
    }

    enum class Environments(val id: String) {
        DEV("HRHIqkJIGYuPbZpvF74mi"),
    }
}


data object SelectiveGroup {
    val name: String = "Selective"
    val id: String = "SqR8BqpM6qgKxVtohkZE1"

    enum class Features(val id: String) {
        STRING("JWXHmkf_Sct1Jr2lqACRT"),
        NUMBER("dlvHPXpmQ94KIzt3V-y4D"),
    }

    enum class Environments(val id: String) {
        DEV("mEghvHGNfmfHwoPT82We-"),
    }
}


data object ValueGroup {
    val name: String = "Value"
    val id: String = "N-MDzoxJanbPOPg223Twf"

    enum class Features(val id: String) {
        INTEGER("Qp0lpyynA5H032t0z07Km"),
        FLOAT("zRMmnUwKylOtX0tiQnxys"),
        STRING("wkXA-cD1FHbf16yIHnPVi"),
    }

    enum class Environments(val id: String) {
        DEV("2CyvAAPow7cMHvlFFvuFj"),
    }
}

