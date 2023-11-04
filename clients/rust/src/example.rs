/*
  This file has been generated from your remote Vexilla Feature Flags file.

  You should NOT modify this file directly.

  It is encouraged to gitignore this file and generate it on-the-fly during build/compilation.
*/

pub mod GradualGroup {
    pub const NAME: &str = "Gradual";
    pub const ID: &str = "aKS-wxK2mMbeYxVVFSV8p";

    pub enum Environments {
        Dev,
    }

    impl Into<&str> for Environments {
        fn into(self) -> &'static str {
            match self {
                Environments::Dev => "zq-d4W97nyNo3mELbO_LT",
            }
        }
    }

    pub enum Features {
        TestingWorkingGradual,
        TestingNonWorkingGradual,
    }

    impl Into<&str> for Features {
        fn into(self) -> &'static str {
            match self {
                Features::TestingWorkingGradual => "oIVHzosp0ao3HN0fmFwwr",
                Features::TestingNonWorkingGradual => "-T2se1u9jyj1HNkbJ9Cdr",
            }
        }
    }
}

pub mod ScheduledGroup {
    pub const NAME: &str = "Scheduled";
    pub const ID: &str = "Jz0rgEv0epyCb6z58or72";

    pub enum Environments {
        Dev,
    }

    impl Into<&str> for Environments {
        fn into(self) -> &'static str {
            match self {
                Environments::Dev => "HRHIqkJIGYuPbZpvF74mi",
            }
        }
    }

    pub enum Features {
        BeforeGlobal,
        DuringGlobal,
        AfterGlobal,
        BeforeGlobalStartEnd,
        DuringGlobalStartEnd,
        AfterGlobalStartEnd,
        BeforeGlobalDaily,
        DuringGlobalDaily,
        AfterGlobalDaily,
    }

    impl Into<&str> for Features {
        fn into(self) -> &'static str {
            match self {
                Features::BeforeGlobal => "7tmnvFX7RI3kOt5r57vyz",
                Features::DuringGlobal => "khEhXchcRuhNdDa8Il8VO",
                Features::AfterGlobal => "dPjTTjugWI5gJfcmoDmbU",
                Features::BeforeGlobalStartEnd => "6iaSljA2uE74IPq4gNzEv",
                Features::DuringGlobalStartEnd => "0cq1IesUoQ7co34ViqHY8",
                Features::AfterGlobalStartEnd => "PKjpuHwBkjmofQlj-o3q5",
                Features::BeforeGlobalDaily => "hErE-2S6DeJBybg-zjo-h",
                Features::DuringGlobalDaily => "VOg2MtzQbaAvZJLSyYXo_",
                Features::AfterGlobalDaily => "dA_c61EnCwPL0ENcAbzJF",
            }
        }
    }
}

pub mod SelectiveGroup {
    pub const NAME: &str = "Selective";
    pub const ID: &str = "SqR8BqpM6qgKxVtohkZE1";

    pub enum Environments {
        Dev,
    }

    impl Into<&str> for Environments {
        fn into(self) -> &'static str {
            match self {
                Environments::Dev => "mEghvHGNfmfHwoPT82We-",
            }
        }
    }

    pub enum Features {
        String,
        Number,
    }

    impl Into<&str> for Features {
        fn into(self) -> &'static str {
            match self {
                Features::String => "JWXHmkf_Sct1Jr2lqACRT",
                Features::Number => "dlvHPXpmQ94KIzt3V-y4D",
            }
        }
    }
}

pub mod ValueGroup {
    pub const NAME: &str = "Value";
    pub const ID: &str = "N-MDzoxJanbPOPg223Twf";

    pub enum Environments {
        Dev,
    }

    impl Into<&str> for Environments {
        fn into(self) -> &'static str {
            match self {
                Environments::Dev => "2CyvAAPow7cMHvlFFvuFj",
            }
        }
    }

    pub enum Features {
        Integer,
        Float,
        String,
    }

    impl Into<&str> for Features {
        fn into(self) -> &'static str {
            match self {
                Features::Integer => "Qp0lpyynA5H032t0z07Km",
                Features::Float => "zRMmnUwKylOtX0tiQnxys",
                Features::String => "wkXA-cD1FHbf16yIHnPVi",
            }
        }
    }
}
