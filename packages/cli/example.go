
/*
  This file has been generated from your remote Vexilla Feature Flags file.

  You should NOT modify this file directly.

  It is encouraged to gitignore this file and generate it on-the-fly during build/compilation.
*/

package vexillaTypes


type gradualEnvironments struct {
  Dev func () string
}

type gradualFeatures struct {
  TestingWorkingGradual func () string
  TestingNonWorkingGradual func () string
}

type gradualGroup struct {
  Name func () string
  ID func () string
  Environments func () gradualEnvironments
  Features func () gradualFeatures
}

var GradualGroup = func () gradualGroup {
  return gradualGroup {
    Name: func () string { return "Gradual" },
    ID: func () string { return "aKS-wxK2mMbeYxVVFSV8p" },
    Environments: func () gradualEnvironments {
      return gradualEnvironments {
        Dev: func () string { return "zq-d4W97nyNo3mELbO_LT" },
      }
    } ,
    Features: func () gradualFeatures {
      return gradualFeatures {
        TestingWorkingGradual: func () string { return "oIVHzosp0ao3HN0fmFwwr" },
        TestingNonWorkingGradual: func () string { return "-T2se1u9jyj1HNkbJ9Cdr" },
      }
    },
  }
}

type scheduledEnvironments struct {
  Dev func () string
}

type scheduledFeatures struct {
  BeforeGlobal func () string
  DuringGlobal func () string
  AfterGlobal func () string
  BeforeGlobalStartEnd func () string
  DuringGlobalStartEnd func () string
  AfterGlobalStartEnd func () string
  BeforeGlobalDaily func () string
  DuringGlobalDaily func () string
  AfterGlobalDaily func () string
}

type scheduledGroup struct {
  Name func () string
  ID func () string
  Environments func () scheduledEnvironments
  Features func () scheduledFeatures
}

var ScheduledGroup = func () scheduledGroup {
  return scheduledGroup {
    Name: func () string { return "Scheduled" },
    ID: func () string { return "Jz0rgEv0epyCb6z58or72" },
    Environments: func () scheduledEnvironments {
      return scheduledEnvironments {
        Dev: func () string { return "HRHIqkJIGYuPbZpvF74mi" },
      }
    } ,
    Features: func () scheduledFeatures {
      return scheduledFeatures {
        BeforeGlobal: func () string { return "7tmnvFX7RI3kOt5r57vyz" },
        DuringGlobal: func () string { return "khEhXchcRuhNdDa8Il8VO" },
        AfterGlobal: func () string { return "dPjTTjugWI5gJfcmoDmbU" },
        BeforeGlobalStartEnd: func () string { return "6iaSljA2uE74IPq4gNzEv" },
        DuringGlobalStartEnd: func () string { return "0cq1IesUoQ7co34ViqHY8" },
        AfterGlobalStartEnd: func () string { return "PKjpuHwBkjmofQlj-o3q5" },
        BeforeGlobalDaily: func () string { return "hErE-2S6DeJBybg-zjo-h" },
        DuringGlobalDaily: func () string { return "VOg2MtzQbaAvZJLSyYXo_" },
        AfterGlobalDaily: func () string { return "dA_c61EnCwPL0ENcAbzJF" },
      }
    },
  }
}

type selectiveEnvironments struct {
  Dev func () string
}

type selectiveFeatures struct {
  String func () string
  Number func () string
}

type selectiveGroup struct {
  Name func () string
  ID func () string
  Environments func () selectiveEnvironments
  Features func () selectiveFeatures
}

var SelectiveGroup = func () selectiveGroup {
  return selectiveGroup {
    Name: func () string { return "Selective" },
    ID: func () string { return "SqR8BqpM6qgKxVtohkZE1" },
    Environments: func () selectiveEnvironments {
      return selectiveEnvironments {
        Dev: func () string { return "mEghvHGNfmfHwoPT82We-" },
      }
    } ,
    Features: func () selectiveFeatures {
      return selectiveFeatures {
        String: func () string { return "JWXHmkf_Sct1Jr2lqACRT" },
        Number: func () string { return "dlvHPXpmQ94KIzt3V-y4D" },
      }
    },
  }
}

type valueEnvironments struct {
  Dev func () string
}

type valueFeatures struct {
  Integer func () string
  Float func () string
  String func () string
}

type valueGroup struct {
  Name func () string
  ID func () string
  Environments func () valueEnvironments
  Features func () valueFeatures
}

var ValueGroup = func () valueGroup {
  return valueGroup {
    Name: func () string { return "Value" },
    ID: func () string { return "N-MDzoxJanbPOPg223Twf" },
    Environments: func () valueEnvironments {
      return valueEnvironments {
        Dev: func () string { return "2CyvAAPow7cMHvlFFvuFj" },
      }
    } ,
    Features: func () valueFeatures {
      return valueFeatures {
        Integer: func () string { return "Qp0lpyynA5H032t0z07Km" },
        Float: func () string { return "zRMmnUwKylOtX0tiQnxys" },
        String: func () string { return "wkXA-cD1FHbf16yIHnPVi" },
      }
    },
  }
}
