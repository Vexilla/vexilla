import type { PropsWithChildren, ReactNode } from "react";

function ListNumber({ children }: PropsWithChildren<{}>) {
  return (
    <div className="flex-shrink-0 w-6 h-6 rounded-full mt-10 sm:mt-0 inline-flex items-center justify-center bg-indigo-500 text-white relative z-10 font-medium text-sm">
      {children}
    </div>
  );
}

interface StepContent {
  title: string;
  description: string;
  image: ReactNode;
}

const steps: StepContent[] = [
  {
    title: "Configure your settings",
    description: "Using the app create your environments and features.",
    image: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>,
  },

  {
    title: "Import a client",
    description: "Choose the client library that applies to your backend.",
    image: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>,
  },

  {
    title: "Wrap your feature",
    description:
      "Using the client library in your frontend and/or backend, write if statements that decide what to do.",
    image: (
      <>
        <circle cx="12" cy="5" r="3"></circle>
        <path d="M12 22V8M5 12H2a10 10 0 0020 0h-3"></path>
      </>
    ),
  },

  {
    title: "Profit!",
    description:
      "You now have a feature flag. Wire it up to analytics and you basically have A/B testing.",
    image: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </>
    ),
  },
];

export function HomeHowItWorks() {
  return (
    <section className="text-normal body-font" id="how-it-works">
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        {steps.map((step, index) => (
          <div className="flex relative pt-10 pb-20 sm:items-center md:w-2/3 mx-auto">
            <div className="h-full w-6 absolute inset-0 flex items-center justify-center">
              <div className="h-full w-1 bg-gray-200 pointer-events-none"></div>
            </div>
            <ListNumber>{index + 1}</ListNumber>
            <div className="flex-grow md:pl-8 pl-6 flex sm:items-center items-start flex-col sm:flex-row">
              <div className="flex-shrink-0 w-24 h-24 bg-indigo-100 text-indigo-500 rounded-full inline-flex items-center justify-center">
                <svg
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="w-12 h-12"
                  viewBox="0 0 24 24"
                >
                  {step.image}
                </svg>
              </div>
              <div className="flex-grow sm:pl-6 mt-6 sm:mt-0">
                <h2 className="font-medium title-font text-emphasis mb-1 text-xl">
                  {step.title}
                </h2>
                <p className="leading-relaxed">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
